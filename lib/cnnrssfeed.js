var FeedParser = require('feedparser'),
    http       = require('http');
var res = function(cb){
  return function(response){
    var feedMeta,
        articles = [];

    response.pipe(new FeedParser({})).on('error', function(error){
      return cb(error, null);
    }).on('meta', function(meta){
      feedMeta = meta;
    }).on('readable', function(){
      var stream = this, item;
      while(item = stream.read()){
        articles.push(item);
      }
    }).on('end', function(){
      return cb(null, feedMeta, articles);
    });
  };
};

var rssurl = require('./../credentials.json').cnn.rssurl;

var get = function(module, cb){ http.get(rssurl + module + '.rss', res(cb)); };

var funct = function(url){ return function(cb){ get(url, cb); }; };
module.exports = {
  top: funct('cnn_topstories'),
  world: funct('cnn_world'),
  us: funct('cnn_us'),
  politics: funct('cnn_allpolitics'),
  latest: funct('cnn_latest')
};
