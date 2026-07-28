
var expect = require('chai').expect;

var unserializeAt = require('..').unserializeAt;


describe('unserializeAt()', function () {
  it('should parse a single value and report exactly how many characters it consumed, ignoring trailing bytes', function () {
    var result = unserializeAt('i:5;TRAILING', 0);
    expect(result.value).to.equal(5);
    expect(result.length).to.equal(4);
  });

  it('should parse a value that itself contains a literal "|" without over- or under-counting length', function () {
    var result = unserializeAt('s:1:"|";TRAILING', 0);
    expect(result.value).to.equal('|');
    expect(result.length).to.equal(8);
  });

  it('should parse starting at a non-zero offset within a larger buffer', function () {
    var result = unserializeAt('PREFIX|i:42;TRAILING', 7);
    expect(result.value).to.equal(42);
    expect(result.length).to.equal(5);
  });
});
