/**
 * @overview
 *
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version 2013/05/13
 */

define(function(require, exports){
  var idcard = require("./idcard");
  var bankcard = require("./bankcard");
  var mobile = require("./mobilephone");
  var monitor = require("./monitor");

  var re_privacy = /^(.{4}).*(.{4})$/;

  /**
   * 对银行卡号码进行隐私包含。
   * @param {String} card, 需要进行隐私保密的银行卡号码。
   * @return {String} 隐私保密处理后的银行卡号码。
   */
  function privacy(card){
    return String(card).replace(re_privacy, "$1...$2");
  }

  exports.scan = function(html){
    var re_cards = /\b\d{11,19}X?\b/g;
    var m = html.match(re_cards);
    if(!m){return;}
    for(var i=0,card,l=m.length; i<l; i++){
      card = m[i];
      if(mobile.verify(card)){
        monitor.log("mobile="+privacy(card), "sens");
      }else if(idcard.verify(card)){
        monitor.log("idcard="+privacy(card), "sens");
      }else if(bankcard.verify(card)){
        monitor.log("bankcard="+privacy(card), "sens");
      }
    }
  };
});
