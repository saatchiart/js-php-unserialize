
var expect = require('chai').expect;
var readFile = require('fs').readFile;
var path = require('path');

var unserialize = require('..').unserializeSession;


describe('unserializeSession()', function () {
  it('should unserialize data sample', function (done) {
    var expected = require('./fixtures/unserialized-session.json');
    readFile(path.join(__dirname, 'fixtures', 'serialized-session.txt'), function (err, buffer) {
      if (err) return done(err);
      var unserialized = unserialize(buffer.toString());
      expect(unserialized).to.eql(expected);
      done();
    });
  });
  // NOTE: left disabled (as found). This fixture's own declared string
  // lengths are internally inconsistent (e.g. a nested `s:457:"..."` value
  // whose real byte length is 455, and an outer `s:585:"..."` whose real
  // length is 588) -- pre-existing corruption in the sample data itself,
  // unrelated to the pipe-splitting bug fixed below. See SA-7097 PR
  // description for details; not touched here to avoid asserting against
  // hand-patched/unverifiable legacy data.
  /*it('should unserialize data sample 2', function (done) {
    var expected = require('./fixtures/unserialized-session-2.json');
    readFile(path.join(__dirname, 'fixtures', 'serialized-session-2.txt'), function (err, buffer) {
      if (err) return done(err);
      var unserialized = unserialize(buffer.toString());
      expect(unserialized).to.eql(expected);
      done();
    });
  });*/
  it('should unserialize a session containing a literal "|" inside a string value (SA-7097)', function (done) {
    var expected = require('./fixtures/unserialized-session-3.json');
    readFile(path.join(__dirname, 'fixtures', 'serialized-session-3.txt'), function (err, buffer) {
      if (err) return done(err);
      var unserialized = unserialize(buffer.toString());
      expect(unserialized).to.eql(expected);
      done();
    });
  });
});
