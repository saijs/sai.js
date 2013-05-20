/**
 * @overview
 *
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version 2013/05/02
 */

define(function(require, exports){

  // [电话号码规则](http://blog.csdn.net/sameplace/article/details/5054278)
  // @see [手机号码](http://baike.baidu.com/view/781667.htm)
  var re_mobile = /^(?:13[0-9]|14[57]|15[0-35-9]|18[0-9])\d{8}$/;

  exports.verify = function(phone){
    return re_mobile.test(phone);
  };

});
