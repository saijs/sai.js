define(function(require) {

  var IDCard = require('../src/idcard');
  var expect = require("expect");

  describe('IDCard', function() {

    it('IDCard.verify()', function() {
      expect(IDCard.verify("36048119881214202X")).to.equal(true);
      expect(IDCard.verify("360481198812142021")).to.equal(false);
    });
  });

});
