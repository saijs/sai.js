define(function(require) {

  var BankCard = require('../src/bankcard');
  var expect = require("expect");

  describe('BankCard', function() {

    it('BankCard.verify()', function() {
      // 农行
      expect(BankCard.verify("6228480323012001315")).to.equal(true);
      // 招行
      expect(BankCard.verify("6226095711688726")).to.equal(true);
      expect(BankCard.verify("6225885860600709")).to.equal(true);

      // 杭州银行
      expect(BankCard.verify("603367100131942126")).to.equal(true);
      // 广发
      expect(BankCard.verify("6225683428000243950")).to.equal(true);

      expect(BankCard.verify("5187100010223842")).to.equal(true);
      expect(BankCard.verify("603367100131942126")).to.equal(true);
      expect(BankCard.verify("6225683428000243950")).to.equal(true);
    });
  });

});
