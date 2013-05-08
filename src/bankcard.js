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
    for(var i=card.length-1,c,odd; i>=0; i--){
      c = parseInt(card.charAt(i), 10);
      odd = (i % 2) === 0;
      sum += odd ? c * 2 : c;
    }
    return sum % 10 === 0;
  }

  var re_card = /^[0-9]{13,19}$/;

  function verify(card){
    card = String(card);
    return re_card.test(card) && luhn(card);
  }

  exports.verify = verify;
});
