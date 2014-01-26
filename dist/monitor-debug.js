define("alipay/monitor/2.3.1/monitor-debug", [ "arale/detector/1.2.1/detector-debug", "arale/events/1.1.0/events-debug" ], function(require, exports, module) {
    var win = window;
    var doc = win.document;
    var loc = win.location;
    var M = win.monitor;
    var detector = require("arale/detector/1.2.1/detector-debug");
    var Events = require("arale/events/1.1.0/events-debug");
    // 避免未引用先行脚本抛出异常。
    if (!M) {
        M = {};
    }
    if (!M._DATAS) {
        M._DATAS = [];
    }
    if (!M._EVENTS) {
        M._EVENTS = [];
    }
    var _events = M._EVENTS;
    var _evt = new Events();
    M.on = function(evt, handler) {
        _evt.on(evt, handler);
    };
    for (var i = 0, l = _events.length; i < l; i++) {
        M.on(_events[i][0], _events[i][1]);
    }
    // 数据通信规范的版本。
    var version = "2.0";
    var protocol = String(loc.protocol).toLowerCase();
    // 不直接使用 `//magentmng.alipay.com`，是有 file 协议的场景。
    if (protocol !== "https:") {
        protocol = "http:";
    }
    var LOG_SERVER = protocol + "//magentmng.alipay.com/m.gif";
    var URLLength = detector.engine.trident ? 2083 : 8190;
    var url = path(loc.href);
    // UTILS -------------------------------------------------------
    function typeOf(obj) {
        return Object.prototype.toString.call(obj);
    }
    // 合并 oa, ob 两个对象的属性到新对象，不修改原有对象。
    // @param {Object} target, 目标对象。
    // @param {Object} object, 来源对象。
    // @return {Object} 返回目标对象，目标对象附带有来源对象的属性。
    function merge(oa, ob) {
        var result = {};
        for (var i = 0, o, l = arguments.length; i < l; i++) {
            o = arguments[i];
            for (var k in o) {
                if (has(o, k)) {
                    result[k] = o[k];
                }
            }
        }
        return result;
    }
    // simple random string.
    // @return {String}
    function rand() {
        return ("" + Math.random()).slice(-6);
    }
    // 获得资源的路径（不带参数和 hash 部分）
    // 另外新版 Arale 通过 nginx 提供的服务，支持类似：
    // > https://static.alipay.com/ar??arale.js,a.js,b.js
    // 的方式请求资源，需要特殊处理。
    //
    // @param {String} uri, 仅处理绝对路径。
    // @return {String} 返回 uri 的文件路径，不包含参数和 jsessionid。
    function path(uri) {
        if (undefined === uri || typeof uri !== "string") {
            return "";
        }
        var len = uri.length;
        var idxSessionID = uri.indexOf(";jsessionid=");
        if (idxSessionID < 0) {
            idxSessionID = len;
        }
        // 旧版的合并 HTTP 服务。
        var idxMin = uri.indexOf("/min/?");
        if (idxMin >= 0) {
            idxMin = uri.indexOf("?", idxMin);
        }
        if (idxMin < 0) {
            idxMin = len;
        }
        var idxHash = uri.indexOf("#");
        if (idxHash < 0) {
            idxHash = len;
        }
        var idxQ = uri.indexOf("??");
        idxQ = uri.indexOf("?", idxQ < 0 ? 0 : idxQ + 2);
        if (idxQ < 0) {
            idxQ = len;
        }
        var idx = Math.min(idxSessionID, idxMin, idxHash, idxQ);
        return idx < 0 ? uri : uri.substr(0, idx);
    }
    // 必要的字符串转义，保证发送的数据是安全的。
    // @param {String} str.
    // @return {String}
    function escapeString(str) {
        return String(str).replace(/(?:\r\n|\r|\n)/g, "<CR>");
    }
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
                    p.push(k + "=" + encodeURIComponent(escapeString(obj[k][i])));
                }
            } else {
                p.push(k + "=" + encodeURIComponent(escapeString(obj[k])));
            }
        }
        return p.join("&");
    }
    function has(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }
    // /UTILS -------------------------------------------------------
    var DEFAULT_DATA = {
        url: url,
        ref: path(doc.referrer) || "-",
        clnt: detector.device.name + "/" + detector.device.fullVersion + "|" + detector.os.name + "/" + detector.os.fullVersion + "|" + detector.browser.name + "/" + detector.browser.fullVersion + "|" + detector.engine.name + "/" + detector.engine.fullVersion + (detector.browser.compatible ? "|c" : ""),
        v: version
    };
    // 创建 HTTP GET 请求发送数据。
    // @param {String} url, 日志服务器 URL 地址。
    // @param {Object} data, 附加的监控数据。
    // @param {Function} callback
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
        if (sending) {
            return;
        }
        var e = M._DATAS.shift();
        if (!e) {
            return;
        }
        sending = true;
        // 理论上应该在收集异常消息时修正 file，避免连接带有参数。
        // 但是收集部分在 seer 中，不适合放置大量的脚本。
        if (e.profile === "jserror") {
            e.file = path(e.file);
        }
        var data = merge(DEFAULT_DATA, e);
        data.rnd = rand();
        // 避免缓存。
        // 触发事件返回 false 时，取消后续执行。
        // 要求特定 profile 的事件，和全局事件都被触发。
        var eventResult = _evt.trigger(e.profile, data);
        eventResult = _evt.trigger("*", data) && eventResult;
        if (!eventResult) {
            sending = false;
            return timedSend();
        }
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
    // 主动发送已捕获的异常。
    timedSend();
    win.monitor = M;
    module.exports = M;
});
