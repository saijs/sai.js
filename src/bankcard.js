/**
 * @overview
 *
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version 2013/05/02
 */

define(function(require, exports){

  /**
   * Luhn 算法
   * @see http://en.wikipedia.org/wiki/Luhn_algorithm
   * @param {String} card, 被校验的号码。
   * @return {Boolean} `true` 如果通过校验，否则返回 `false`。
   */
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

  var re_card = /^[34569][0-9]{12,18}$/;


  /**
   * 校验银行卡号码是否合法。
   * @param {String} card, 校验的银行卡号码。
   * @return {Boolean} `true` 如果通过校验，否则返回 `false`。
   */
  exports.verify = function(card){
    card = String(card);
    return re_card.test(card) && luhn(card);
  };

});
