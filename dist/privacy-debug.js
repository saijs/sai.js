/**
 * @overview
 *
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version 2013/05/13
 */
define("alipay/monitor/2.0.0/privacy-debug", [ "jquery/jquery/1.7.2/jquery-debug.js", "./idcard-debug", "./bankcard-debug", "./mobilephone-debug" ], function(require, exports, module) {
    var $ = require("jquery/jquery/1.7.2/jquery-debug.js");
    var idcard = require("./idcard-debug");
    var bankcard = require("./bankcard-debug");
    var mobile = require("./mobilephone-debug");
    var re_privacy = /^(.{4}).*(.{4})$/;
    /**
   * 对银行卡号码进行隐私包含。
   * @param {String} card, 需要进行隐私保密的银行卡号码。
   * @return {String} 隐私保密处理后的银行卡号码。
   */
    function privacy(card) {
        return String(card).replace(re_privacy, "$1...$2");
    }
    exports.scan = function(html) {
        var re_cards = /\b\d{11,19}X?\b/g;
        var m = html.match(re_cards);
        if (!m) {
            return;
        }
        for (var i = 0, card, l = m.length; i < l; i++) {
            card = m[i];
            if (mobile.verify(card)) {
                monitor.log("mobile=" + privacy(card), "sens");
            } else if (idcard.verify(card)) {
                monitor.log("idcard=" + privacy(card), "sens");
            } else if (bankcard.verify(card)) {
                monitor.log("bankcard=" + privacy(card), "sens");
            }
        }
    };
});

/**
 * 身份证号码校验模块
 *
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version 2013/05/02
 */
define("alipay/monitor/2.0.0/idcard-debug", [], function(require, exports, module) {
    var DATES = [ 0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];
    function isLeap(year) {
        return year % 4 === 0 && year % 400 !== 0 || year % 400 === 0;
    }
    function verifyDate(year, month, date) {
        if (month < 1 || month > 12) {
            return false;
        }
        var days = DATES[month];
        if (month === 2 && isLeap(year)) {
            days = 29;
        }
        return date > 0 && date <= days;
    }
    /**
   * 15位身份证号码组成：
   * `ddddddyymmddxxs` 共 15 位，其中：
   * `dddddd` 为 6 位的地方代码，根据这 6 位可以获得该身份证号所在地。
   * `yy` 为 2 位的年份代码，是身份证持有人的出身年份。
   * `mm` 为 2 位的月份代码，是身份证持有人的出身月份。
   * `dd` 为 2 位的日期代码，是身份证持有人的出身日。
   *    这 6 位在一起组成了身份证持有人的出生日期。
   * `xx` 为 2 位的顺序码，这个是随机数。
   * `s` 为 1 位的性别代码，奇数代表男性，偶数代表女性。
   */
    function verify15(id) {
        if (!/^[0-9]{15}$/.test(id)) {
            return false;
        }
        //var region = id.substr(0,6);
        // 1999/10/01 之后颁发 18 位第二代居民身份证。
        var year = parseInt("19" + id.substr(6, 2), 10);
        var month = parseInt(id.substr(8, 2), 10);
        var date = parseInt(id.substr(10, 2), 10);
        //var rand = id.substr(12,2);
        //var sex = id.substr(14,1);
        if (!verifyDate(year, month, date)) {
            return false;
        }
        return true;
    }
    /**
   * 18位身份证号码组成：
   * `ddddddyyyymmddxxsp` 共18位，其中：
   * 其他部分都和15位的相同。年份代码由原来的2位升级到4位。最后一位为校验位。
   * 校验规则是：
   * （1）十七位数字本体码加权求和公式
   * S = Sum(Ai * Wi), i = 0, ... , 16 ，先对前17位数字的权求和
   * Ai:表示第i位置上的身份证号码数字值
   * Wi:表示第i位置上的加权因子
   * Wi: 7 9 10 5 8 4 2 1 6 3 7 9 10 5 8 4 2
   * （2）计算模
   * Y = mod(S, 11)
   * （3）通过模得到对应的校验码
   * Y:      0 1 2 3 4 5 6 7 8 9 10
   * 校验码: 1 0 X 9 8 7 6 5 4 3 2
   *
   * 如果得到余数为 1 则最后的校验位 p 应该为对应的 0。
   * 如果校验位不是，则该身份证号码不正确。
   */
    var WI = [ 7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2 ];
    var VERIFY_CODE = "10X98765432";
    function verify18(id) {
        if (!/^[0-9]{17}[0-9xX]$/.test(id)) {
            return false;
        }
        var region = id.substr(0, 6);
        var year = parseInt(id.substr(6, 4), 10);
        var month = parseInt(id.substr(10, 2), 10);
        var date = parseInt(id.substr(12, 2), 10);
        var rand = id.substr(14, 2);
        var sex = id.substr(16, 1);
        var vcode = id.substr(17, 1);
        if (!verifyDate(year, month, date)) {
            return false;
        }
        var sum = 0;
        for (var i = 0; i < 17; i++) {
            sum += parseInt(id.charAt(i), 10) * WI[i];
        }
        var mod = sum % 11;
        return VERIFY_CODE.charAt(mod) === vcode;
    }
    function verify(id) {
        if (!id) {
            return false;
        }
        id = String(id);
        if (id.length === 18) {
            return verify18(id);
        }
        if (id.length === 15) {
            return verify15(id);
        }
        return false;
    }
    exports.verify = verify;
});

/**
 * @overview
 *
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version 2013/05/02
 */
define("alipay/monitor/2.0.0/bankcard-debug", [], function(require, exports, module) {
    /**
   * Luhn 算法
   * @see http://en.wikipedia.org/wiki/Luhn_algorithm
   * @param {String} card, 被校验的号码。
   * @return {Boolean} `true` 如果通过校验，否则返回 `false`。
   */
    function luhn(card) {
        var sum = 0;
        for (var i = card.length - 1, c, even; i >= 0; i--) {
            c = parseInt(card.charAt(i), 10);
            even = i % 2 === card.length % 2;
            if (even) {
                c = c * 2;
                if (c > 9) {
                    c = c - 9;
                }
            }
            sum += c;
        }
        return sum % 10 === 0;
    }
    var re_card = /^[0-9]{13,19}$/;
    /**
   * 校验银行卡号码是否合法。
   * @param {String} card, 校验的银行卡号码。
   * @return {Boolean} `true` 如果通过校验，否则返回 `false`。
   */
    exports.verify = function(card) {
        card = String(card);
        return re_card.test(card) && luhn(card);
    };
});

/**
 * @overview
 *
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version 2013/05/02
 */
define("alipay/monitor/2.0.0/mobilephone-debug", [], function(require, exports, module) {
    // [电话号码规则](http://blog.csdn.net/sameplace/article/details/5054278)
    // @see [手机号码](http://baike.baidu.com/view/781667.htm)
    var re_mobile = /^(?:13[0-9]|14[57]|15[0-35-9]|18[0-9])\d{8}$/;
    exports.verify = function(phone) {
        return re_mobile.test(phone);
    };
});
