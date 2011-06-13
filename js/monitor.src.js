/**
 * 前端监控脚本的公共库。
 *
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version 2011/05/29
 */


// Quality Monitoring System.

// namespace.
window.monitor || (function(){

    var startTime = new Date();

    var M = window.monitor = {
        // XXX: 发布时建议设置为 false。
        // 发布环境：URL 中带上 "debug" 这个 hash，可以开启调试模式。
        //
        // 非调试模式：
        // 1. 避免 AJAX 缓存(HTML源码，JavaScript、CSS、IMAGE 资源)
        // 2. 启用 HTMLint.
        // 3. 启用 CSSLint.
        debug: !(location.protocol=="https:" &&
            location.hostname.indexOf(".alipay.com")>0) ||
            "#debug"==location.hash || true,

        // XXX: 添加随机数避免缓存，发布时建议设置为 false。
        nocache: true,

        // XXX: 发布时需修改服务器地址。
        server: "http:\/\/fmsmng.sit.alipay.net:7788\/m.gif",

        // XXX: 设置监控的对象，域名在此之外的，会做客户端监控报告，但不发往服务器。
        //          .alipay.com
        //      .sit.alipay.net
        domain: ".sit.alipay.net",

        checkProtocol: "https:" == location.protocol,

        // 捕获 JavaScript 异常时重新抛出，避免浏览器控制台无法捕获异常。
        // 这个一般设置为 true 就好了。
        rethrow: true,
        // DOMReady 并延迟毫秒数之后开始运行(HTML,CSS,JAVASCRIPT)规则验证。
        delay: 1800,
        // userAgent.
        ua: navigator.userAgent
    };

    // page url, without search & hash.
    var idx = location.pathname.indexOf(";jsessionid=");
    M.url = location.protocol + "\/\/" + location.hostname +
        (idx<0 ? location.pathname : location.pathname.substr(0, idx));

    M.htmlErrorCodes = {
        syntaxError: 0,

        // 缺少DOCTYPE，或DOCTYPE不合法。
        doctypeIllegal: 1,

        // 编码未设置，或编码设置不合法。
        charsetIllegal: 2,

        // HTTPS 资源中包含不安全资源。
        protocolIllegal: 3,

        // 属性不合法。
        attrIllegal: 4,
            // 存在重复 ID。
            idDuplicated: 40,
            // 缺少 rel 属性，或 rel 属性不合法
            relIllegal: 41,
            // 链接缺少 href 属性，或 href 指向不合法。
            hrefIllegal: 42,

        // 内联 JavaScript 脚本。
        inlineJS: 5,

        // 内联 CSS 脚本。
        inlineCSS: 6,

        // 标签未结束等语法错误。。。
        tagsIllegal: 7,
            // 标签嵌套不合法。
            tagsNestedIllegal: 70,
            // 过时的标签。
            tagsDeprecated: 71,
            // 标签未闭合，例如自闭合，或者非法闭合的标签。
            tagUnclosed: 72,

        commentIllegal: 8,

        cssIllegal: 9,
            cssByImport: 90
    };
    M.res = {
        img:[],
        css:[],
        js:[],
        fla:[]
    };
    var JSON = {
        escape: function(str){
            return str.replace(/\\/g, '\\\\').replace(/\"/g, '\\"');
        },
        toString: function(obj){
            if(window.JSON && "function"==typeof(window.JSON.stringify)){
                return window.JSON.stringify(obj);
            }

            switch(typeof obj){
            case 'string':
                return '"' + JSON.escape(obj) + '"';
            case 'number':
                return isFinite(obj)?String(obj):'null';
            case 'boolean':
            case 'null':
                return String(obj);
            case 'undefined':
                return 'null';
            case 'object':
                if(null == obj){
                    return 'null';
                }
                var type = Object.prototype.toString.call(obj);
                if("[object Array]" == type){
                    var a = [];
                    for(var i=0,l=obj.length; i<l; i++){
                        a[i] = JSON.toString(obj[i]);
                    }
                    return '[' + a.join(',') + ']';
                }else if("[object RegExp]" == type){
                    return '/' + obj.source + '/' + (obj.ignoreCase?'i':'')+(obj.multiline?'m':'')+(obj.global?'g':'');
                }else{ // [object Object]
                    var o = [];
                    for(var k in obj){
                        if(Object.prototype.hasOwnProperty.call(obj, k)){
                            o.push('"' + JSON.escape(k) + '"' + ':' + JSON.toString(obj[k]));
                        }
                    }
                    return '{' + o.join(',') + '}';
                }
            default:
            }
        }
    };
    // URI, URL, Links, Location...
    M.URI = {
        // 获得Archor对象，便于获取其protocol,host...属性。
        // 可惜IE直接复制相对地址无法获得正确的属性，需要设置绝对地址。
        // @param {String"} uri 绝对/相对地址。
        // @usage URI.parse(img.src); || img.getAttribute("src");
        //        img.src - 自动转成绝对地址。
        //        img.getAttribute("src") - 原样取出属性值。
        reFolderExt:/[^\/]*$/,
        reProtocol:/^\w+:/,
        parse: function(uri){
            if(undefined === uri || typeof(uri)!="string"){
                throw new TypeError("required string argument.");
            }
            var host = location.protocol + "\/\/" + location.hostname,
                base = host + location.pathname.replace(M.URI.reFolderExt, uri);
            var a = document.createElement("a");
            if(!M.URI.reProtocol.test(uri)){
                if(uri.indexOf("/")==0){
                    uri = location.protocol + "\/\/" + location.hostname + uri;
                    //uri = host + uri;
                }else{
                    uri = location.protocol + "\/\/" + location.hostname +
                        location.pathname.replace(M.URI.reProtocol, uri);
                }
            }
            a.setAttribute("href", uri);
            return a;
        },
        path: function(uri){
			var idx = uri.indexOf("?");
			if(idx < 0){return uri;}
            return uri.substring(0, idx);
        },
        folder: function(uri){
            if(!uri){return "";}
            var idx = uri.lastIndexOf("/");
            return idx<0 ? "" : uri.substring(0, idx+1);
        }
    };
    // String.
    M.S = {
        startsWith: function(str, ch){
            if(typeof(str)=="undefined" || typeof(ch)=="undefined"){return false;}
            return str.indexOf(ch) == 0;
        },
        endsWith: function(str, ch){
            if(typeof(str)=="undefined" || typeof(ch)=="undefined"){return false;}
            return str.lastIndexOf(ch) == (str.length-ch.length);
        },
        byteLength: function(str){
            if(!str){return 0;}
            return str.replace(/[^\x00-\xff]/g, "xx").length;
        },
        isLower: function(str){
            if(typeof(str)=="undefined"){return false;}
            return str == str.toLowerCase();
        },
        repeat : function(str, times){
            return new Array((times||0)+1).join(str);
        },
        trim: function(str){
            return str.replace(/^\s+/, '').replace(/\s+$/, '');
        },
        camelize: function (str){
            return str.replace(/\-+([a-z])/g, function($0, $1){
                return $1.toUpperCase();
            });
        },
        rand: function(){
            var s = ""+Math.random(), l=s.length;
            return s.substr(2,2) + s.substr(l-2);
        }
    };
    function identify(){
        var b = document.cookie + navigator.userAgent + navigator.plugins.length + Math.random(),
            n=0,
            rand = ""+Math.random();
        for(var i=0,l=b.length; i<l; i++){
            n += i * b.charCodeAt(i);
        }
        return n.toString(parseInt(Math.random()*10 + 16));
    }

    var Browser = {
        ie: navigator.userAgent.indexOf("MSIE") > 0 && !window.opera
    };
    var URLLength = Browser.ie ? 2083 : 8190;

    function send(url, data){
        if(!data){return;}
        if(M.debug && window.console && window.console.log){
            window.console.log("SEND: ", data.length, data);
        }
        if(location.hostname.indexOf(M.domain)<0){return;}
        data = encodeURIComponent(data);
        var url = url+(url.indexOf("?")<0 ?"?":"&")+data;
        var times=0; // re-try times, eg: 3.

        // @see http://www.javascriptkit.com/jsref/image.shtml
        var img = new Image(1,1);
        img.onload = function(){img = null;};
        img.onerror = function(evt){
            // for RE-TRY.
            if((--times)<0){
                img = null;
            }else{
                img.src = url;
            }
        };

        img.src = url;
    };
    M.report = function(data){
        if(!data){return;}
        var d = {
                url: M.url,
                ua: M.ua,
                // 分批发送数据的批次标识。
                id: identify(),
                // 避免缓存。
                rand: M.S.rand()
            };

        // TODO: 如果初始数据本身就超了，呃，算了。

        if(data.hasOwnProperty("htmlError")){
            var list = [],
                s = "",
                len = URLLength - JSON.toString(d).length - 10,
                arr = [];
            while(data.htmlError.length>0){
                if(encodeURIComponent(JSON.toString(arr.concat(data.htmlError[0]))).length < len){
                    arr.push(data.htmlError.shift());
                }else{
                    if(arr.length > 0){
                        d.htmlError = arr;
                    }else{
                        // overflow url-length in single data.
                        d.htmlError = data.htmlError.shift();
                        d.htmlError.msg = d.htmlError.msg.substring(0,100);
                    }
                    send(M.server, JSON.toString(d));
                    arr.length = 0;
                }
            }
            if(arr.length){
                d.htmlError = arr;
                send(M.server, JSON.toString(d));
            }
        }else{
            for(var k in data){
                if(Object.prototype.hasOwnProperty.call(data, k)){
                    d[k] = data[k];
                }
            }
            var s = JSON.toString(d);
            send(M.server, s);
        }
    }

    // JSniffer.
    window.onerror = function(msg, file, line){
        var d = {
            jsError: {
                file: window.monitor.URI.path(file),
                ln: line,
                msg: msg//+" | "+F.stack(arguments.callee.caller)+", "+arguments.callee.caller
            }
        };
        M.report(d);
        // false: re-throw error, true: capture error.
        return !M.rethrow;
    };

    var DOM = {
        ready: function(callback){
            /* Internet Explorer */
            /*@cc_on
            @if (@_win32 || @_win64)
                document.write('<script id="ieScriptLoad" defer="defer" src="//:"><\/script>');
                document.getElementById("ieScriptLoad").onreadystatechange = function(){
                    if(this.readyState == 'complete'){
                        callback();
                    }
                };
                return;
            @end @*/
            /* Mozilla, Chrome, Opera */
            if(document.addEventListener){
                document.addEventListener("DOMContentLoaded", callback, false);
                return;
            }
            /* Safari, iCab, Konqueror */
            if(/KHTML|WebKit|iCab/i.test(navigator.userAgent)){
                var timer = window.setInterval(function(){
                    if(/loaded|complete/i.test(document.readyState)){
                        callback();
                        clearInterval(timer);
                    }
                }, 10);
                return;
            }
            /* Other web browser */
            window.onload = callback;
        }
    };
    function jsLoader(src){
        if(M.nocache){
            src += (location.search.indexOf("?")==0 ? "&" : "?") + M.S.rand();
        }
        var script = document.createElement("script");
        script.setAttribute("type", "text/javascript");
        script.setAttribute("charset", "utf-8");
        script.setAttribute("src", src);
        document.documentElement.appendChild(script);
    };

    var src = "" || (function(){
        var ss = document.getElementsByTagName("script"),
            src = ss[ss.length - 1].src;
        return src;
    })();
    DOM.ready(function(){
        M.readyTime = new Date() - startTime;
        window.setTimeout(function(){
            try{
            if(M.debug){
                jsLoader(M.URI.folder(src)+"domlint.src.js");
                jsLoader(M.URI.folder(src)+"htmlint.src.js");
                jsLoader(M.URI.folder(src)+"monitor-b.src.js");
            }else{
                jsLoader(M.URI.folder(src)+"monitor-b.js");
            }
            }catch(ex){}
        }, M.delay);
    });
})();
