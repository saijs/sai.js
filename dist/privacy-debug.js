/**
 * @overview
 *
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version 2013/05/13
 */
define("alipay/monitor/2.0.0/privacy-debug", [ "./idcard-debug", "./bankcard-debug", "./mobilephone-debug", "./monitor-debug", "arale/detector/1.1.1/detector-debug" ], function(require, exports) {
    var idcard = require("./idcard-debug");
    var bankcard = require("./bankcard-debug");
    var mobile = require("./mobilephone-debug");
    var monitor = require("./monitor-debug");
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
define("alipay/monitor/2.0.0/idcard-debug", [], function(require, exports) {
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
        //var region = id.substr(0,6);
        var year = parseInt(id.substr(6, 4), 10);
        var month = parseInt(id.substr(10, 2), 10);
        var date = parseInt(id.substr(12, 2), 10);
        //var rand = id.substr(14,2);
        //var sex = id.substr(16,1);
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
define("alipay/monitor/2.0.0/bankcard-debug", [], function(require, exports) {
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
define("alipay/monitor/2.0.0/mobilephone-debug", [], function(require, exports) {
    // [电话号码规则](http://blog.csdn.net/sameplace/article/details/5054278)
    // @see [手机号码](http://baike.baidu.com/view/781667.htm)
    var re_mobile = /^(?:13[0-9]|14[57]|15[0-35-9]|18[0-9])\d{8}$/;
    exports.verify = function(phone) {
        return re_mobile.test(phone);
    };
});

define("alipay/monitor/2.0.0/monitor-debug", [ "arale/detector/1.1.1/detector-debug" ], function(require, exports, module) {
    var win = window;
    var doc = document;
    var loc = window.location;
    var M = win.monitor;
    // 避免未引用先行脚本抛出异常。
    if (!win.monitor) {
        M = window.monitor = {};
        M._DATAS = [];
    }
    var detector = require("arale/detector/1.1.1/detector-debug");
    // 数据通信规范的版本。
    var version = "2.0";
    var LOG_SERVER = "https://magentmng.alipay.com/m.gif";
    var URLLength = detector.engine.trident ? 2083 : 8190;
    var url = path(loc.href);
    // 是否启用监控。
    // 采样命中后调用 boot() 方法修改为 true 后开发发送监控数据。
    var monitoring = false;
    // UTILS -------------------------------------------------------
    function typeOf(obj) {
        return Object.prototype.toString.call(obj);
    }
    /**
   * 深度复制 JavaScript 对象。
   *
   * @param {Object} obj, 被复制的对象。
   * @return {Object} obj 副本。
   */
    function clone(obj) {
        var ret;
        if (null === obj) {
            return null;
        }
        switch (typeOf(obj)) {
          case "[object String]":
          case "object Number":
          case "[object Boolean]":
            ret = obj;
            break;

          case "[object Array]":
            ret = [];
            //ret = Array.prototype.slice.call(obj, 0);
            for (var i = obj.length - 1; i >= 0; i--) {
                ret[i] = clone(obj[i]);
            }
            break;

          case "[object RegExp]":
            ret = new RegExp(obj.source, (obj.ignoreCase ? "i" : "") + (obj.global ? "g" : "") + (obj.multiline ? "m" : ""));
            break;

          case "[object Date]":
            ret = new Date(obj.valueOf());
            break;

          case "[object Error]":
            obj = ret;
            break;

          case "[object Object]":
            ret = {};
            for (var k in obj) {
                if (has(obj, k)) {
                    ret[k] = clone(obj[k]);
                }
            }
            break;

          default:
            throw new Error("Not support the type.");
        }
        return ret;
    }
    /**
   * 合并 object 对象的属性到 target 对象。
   *
   * @param {Object} target, 目标对象。
   * @param {Object} object, 来源对象。
   * @return {Object} 返回目标对象，目标对象附带有来源对象的属性。
   */
    function merge(target, object) {
        if (!object) {
            return target;
        }
        for (var k in object) {
            if (has(object, k)) {
                target[k] = object[k];
            }
        }
        return target;
    }
    /**
   * simple random string.
   * @return {String}
   */
    function rand() {
        return ("" + Math.random()).slice(-6);
    }
    /**
   * 获得资源的路径（不带参数和 hash 部分）
   * 另外新版 Arale 通过 nginx 提供的服务，支持类似：
   * > https://static.alipay.com/ar??arale.js,a.js,b.js
   * 的方式请求资源，需要特殊处理。
   *
   * @param {String} uri, 仅处理绝对路径。
   * @return {String} 返回 uri 的文件路径，不包含参数和 jsessionid。
   */
    function path(uri) {
        if (undefined === uri || typeof uri !== "string") {
            return "";
        }
        var idx = uri.indexOf(";jsessionid=");
        if (idx >= 0) {
            return uri.substr(0, idx);
        }
        // white-list for min services.
        if (uri.indexOf("/min/?") >= 0) {
            return uri;
        }
        do {
            idx = uri.indexOf("?", idx);
            if (idx < 0) {
                break;
            }
            if ("?" === uri.charAt(idx + 1)) {
                idx += 2;
            } else {
                break;
            }
        } while (idx >= 0);
        return idx < 0 ? uri : uri.substr(0, idx);
    }
    //function innerText(elem){
    //if(!elem){return "";}
    //return elem.innerText || elem.textContent || "";
    //}
    // 将对象转为键值对参数字符串。
    function param(obj) {
        if (Object.prototype.toString.call(obj) !== "[object Object]") {
            return "";
        }
        var p = [];
        for (var k in obj) {
            if (!has(obj, k)) {
                continue;
            }
            if (typeOf(obj[k]) === "[object Array]") {
                for (var i = 0, l = obj[k].length; i < l; i++) {
                    // TODO: var encode = encodeURIComponent;
                    p.push(k + "=" + encodeURIComponent(obj[k][i]));
                }
            } else {
                p.push(k + "=" + encodeURIComponent(obj[k]));
            }
        }
        return p.join("&");
    }
    function has(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }
    // /UTILS -------------------------------------------------------
    //function serverNumber(){
    //var servName = doc.getElementById("ServerNum");
    //servName = innerText(servName).split("-");
    //servName = servName[0] || loc.hostname;
    //return servName;
    //}
    var DEFAULT_DATA = {
        url: url,
        ref: doc.referrer || "-",
        //sys: servName,
        clnt: detector.device.name + "/" + detector.device.fullVersion + "|" + detector.os.name + "/" + detector.os.fullVersion + "|" + detector.browser.name + "/" + detector.browser.fullVersion + "|" + detector.engine.name + "/" + detector.engine.fullVersion,
        v: version
    };
    /**
   * 创建图片请求发送数据。
   *
   * @param {String} url, 日志服务器 URL 地址。
   * @param {Object} data, 附加的监控数据。
   * @param {Function} callback
   */
    function send(host, data, callback) {
        if (!callback) {
            callback = function() {};
        }
        if (!data) {
            return callback();
        }
        var d = param(data);
        var url = host + (host.indexOf("?") < 0 ? "?" : "&") + d;
        // 忽略超长 url 请求，避免资源异常。
        if (url.length > URLLength) {
            return callback();
        }
        // @see http://www.javascriptkit.com/jsref/image.shtml
        var img = new Image(1, 1);
        img.onload = img.onerror = img.onabort = function() {
            callback();
            img.onload = img.onerror = img.onabort = null;
            img = null;
        };
        img.src = url;
    }
    var sending = false;
    /**
   * 分时发送队列中的数据，避免 IE(6) 的连接请求数限制。
   */
    function timedSend() {
        if (!monitoring || sending) {
            return;
        }
        var e = M._DATAS.shift();
        if (!e) {
            return;
        }
        sending = true;
        var data = clone(DEFAULT_DATA);
        // 理论上应该在收集异常消息时修正 file，避免连接带有参数。
        // 但是收集部分在 seer 中，不适合放置大量的脚本。
        if (e.profile === "jserror") {
            e.file = path(e.file);
        }
        data = merge(data, e);
        data.rnd = rand();
        // 避免缓存。
        send(LOG_SERVER, data, function() {
            sending = false;
            timedSend();
        });
    }
    // timedSend 准备好后可以替换 push 方法，自动分时发送。
    var _push = M._DATAS.push;
    M._DATAS.push = function() {
        _push.apply(M._DATAS, arguments);
        timedSend();
    };
    /**
   * 启动监控进程，开始发送数据。
   * @param {Boolean} state, 启动状态标识。
   *    为 `false` 时停止监控。
   *    否则启动监控。
   */
    M.boot = function(state) {
        monitoring = state !== false;
    };
    window.monitor = M;
    module.exports = M;
});
