var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var app = require('./../node.js');
var searchStrings = ["Donald Trump", "Donald", "Trump"]
describe('NodeJS API Tests - String Compare', function() {
  it('Check if priority is 10', function() {
    var title = "Donald Trump is great";
    var summary = "This mentions about Donald Trump more";
    expect(app.checkIfTextMentioned(title, summary, searchStrings)).to.equal(10);
  });
  it('Check if priority is 7', function() {
    var title = "Donald Trump is great";
    var summary = "This mentions about Donald more";
    expect(app.checkIfTextMentioned(title, summary, searchStrings)).to.equal(7);
  });
  it('Check if priority is 0', function() {
    var title = "is great";
    var summary = "This mentions about more";
    expect(app.checkIfTextMentioned(title, summary, searchStrings)).to.equal(0);
  });
});
