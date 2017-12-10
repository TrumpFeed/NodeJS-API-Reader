var http = require("http")
var express = require("express")
var app = express()
var port = process.env.PORT || 5000
var pg = require('pg');
var Twitter = require('twitter');
var credentials = require('./credentials.json')
var ignoreCase = require('ignore-case');
var async = require('async');

var bodyParser = require('body-parser');
var app = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use(express.static(__dirname + "/"))

app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Authorization, Content-Type');
  next();
});

var server = http.createServer(app)
server.listen(port)

console.log("Listening on %d", port)

var baseClient;
pg.defaults.ssl = true;
pg.connect(process.env.DATABASE_URL || credentials.database, function(err, client) {
    if(err){
      console.log(err);
    }
    baseClient = client;

    // setInterval(function(){
    //   twitterFeed();
    //   cnnFeed();
    // }, credentials.crawlTime);
    //
    // twitterFeed();
    // cnnFeed();
  
    setInterval(function(){
      //call server
      http.get(credentials.herokuServer, function () {});
    }, credentials.pingServerHeroku);

});
var that = this;

function postTweetToDatabase(tweets){
    if(baseClient != null)
    {
      async.mapSeries(tweets, function (tweet, done) {
        baseClient.query('INSERT INTO twitter(id, full_text, created_at) values($1,$2,$3)',
            [tweet.id, tweet.full_text, tweet.created_at], function(err, result) {
          if(err) {
                // console.log(err.name);
          } else {
                // console.log(result);
          }
          done();
        });
      }, function(err, results) {
          console.log('Tweet Inserted:', results.length);
      });
    }
}

function postCNNToDatabase(articles){
  if(baseClient != null)
  {
    async.mapSeries(articles, function (article, done) {
      baseClient.query('INSERT INTO cnn(id, full_text, created_at, origlink, summary) values($1,$2,$3,$4,$5)',
          [article.id, article.full_text, article.created_at, article.origlink, article.summary], function(err, result) {
        if(err) {
              // console.log(err.name);
        } else {
              // console.log(result);
        }
        done();
      });
    }, function(err, results) {
        console.log('CNN Inserted:', results.length);
    });
  }
}

app.post('/twitterfeed', function (req, res) {
  return new Promise(function(resolve, reject){
    return getDataFromDatabase('twitter', resolve);
  }).then(function(rows) {
    res.json(rows);
  });
});

app.post('/cnnfeed', function (req, res) {
  return new Promise(function(resolve, reject){
    return getDataFromDatabase('cnn', resolve);
  }).then(function(rows) {
    res.json(rows);
  });
});

app.post('/feed', function (req, res) {
  var combinedRows = [];


  var p1 = new Promise((resolve, reject) => {
    return getDataFromDatabase('twitter', resolve);
  });
  var p2 = new Promise((resolve, reject) => {
    return getDataFromDatabase('cnn', resolve);
  });
    // combinedRows.push(rows);

  Promise.all([p1, p2]).then(values => {
      var merged = [].concat.apply([], values);
      var mergedSorted = merged.sort(function(a, b) {
          return new Date(a.created_at) - new Date(b.created_at);
      });
      console.log(mergedSorted.length);
      res.json(mergedSorted);
  });


});

app.post('/cleardatabase', function (req, res) {
  clearDataFromDatabase();
  res.json({"result": "erased"});
});

function clearDataFromDatabase(){
  var queryStringT = "DELETE FROM twitter";
  baseClient.query(queryStringT);
  var queryStringC = "DELETE FROM cnn";
  baseClient.query(queryStringC);
}

function getDataFromDatabase(tableName, resolve){
  var rows = [];
  var queryString = "SELECT * FROM " + tableName + " order by created_at desc limit 25";
  var query = baseClient.query(queryString);
  query.on('row', function(row) {
      row.type = tableName;
      rows.push(row);
  });
  query.on('end', function(result) {
      resolve(rows);
  });
}

var client = new Twitter(credentials.twitter);
function twitterFeed(){
  client.get('statuses/user_timeline', {
    screen_name: 'realDonaldTrump',
    count: 25,
    trim_user: true,
    tweet_mode: 'extended'
  }, function(error, tweets, response) {
    if (!error) {
      var tweetsFormatted = tweets.map(function (tweet, index, array) {
        return {
          id: tweet.id_str,
          full_text: tweet.full_text,
          created_at: new Date(tweet.created_at),
        }
    });
    console.log("Tweet", tweetsFormatted.length);
    postTweetToDatabase(tweetsFormatted);
    }
    else {
      console.log(error)
    }
  });
}
var searchStrings = credentials.searchStrings;
var points = credentials.points;

function individualPointCount(data, searchStrings){
  var count = 0;
  if(data == undefined){
    return count;
  }
  //Check if data contains the Donald Trump
  if(data.includes(searchStrings[0])){
    count += points[3];
    //Check if data contains the Trump
  } else if (data.includes(searchStrings[2])) {
    count += points[2];
    //Check if data contains the Donald
  } else if (data.includes(searchStrings[1])) {
    count += points[1];
    //Check if data contains the donald trump
  } else if (ignoreCase.includes(data, searchStrings[0])) {
    count += points[0];
  }
  return count;
}
function checkIfTextMentioned(title, summary, searchStrings) {
  var count = 0;
  count += individualPointCount(title, searchStrings);
  count += individualPointCount(summary, searchStrings);
  return count;
}

function cb(error, feedMeta, articles){

  var articlesFormatted = articles.filter(function (article) {
    if(article.title == 'Trump recorded robocall for Roy Moore')
  {
    // console.log(article)
  }

      return (checkIfTextMentioned(article.title, article.summary, credentials.searchStrings) > credentials.pointsMinThreshold);
  })
  .map(function (article, index, array) {
      return {
        id: article.guid,
        full_text: article.title,
        created_at: new Date(article.date),
        origlink: article.origlink,
        summary: article.summary
      }
  });

  console.log("CNN", articlesFormatted.length);
  postCNNToDatabase(articlesFormatted);
}

function cnnFeed(){
  var cnn = require('./lib/cnnrssfeed');
  return new Promise(function(resolve, reject){
    cnn.top(cb);
    cnn.world(cb);
    cnn.us(cb);
    cnn.politics(cb);
    cnn.latest(cb);
    resolve();
  });

}

module.exports.checkIfTextMentioned = checkIfTextMentioned;
