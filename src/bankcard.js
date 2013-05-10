/**
 * @overview
 *
 * @see http://en.wikipedia.org/wiki/Luhn_algorithm
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version 2013/05/02
 */

define(function(require, exports, module){

  function luhn(card){
    var sum = 0;
    for(var i=card.length-1,c,even; i>=0; i--){
      c = parseInt(card.charAt(i), 10);
      even = (i % 2) === (card.length % 2);
      if(even){
        c = c * 2;
        if(c > 9){
          c = c - 9;
        }
      }
      sum += c;
    }
    return sum % 10 === 0;
  }

  var re_card = /^[0-9]{13,19}$/;

  // TODO: 中国农业银行卡号不符合 luhn 算法。
  function verify(card){
    card = String(card);
    return re_card.test(card) && luhn(card);
  }

  exports.verify = verify;
});
