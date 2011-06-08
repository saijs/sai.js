/**
 * 前端监控脚本的公共库。
 *
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version 2011/05/29
 */


// Quality Monitoring System.

// namespace.
window.monitor = {
    startTime: new Date(),
    // XXX: 发布时建议设置为 false。
    // 发布环境：URL 中带上 "debug" 这个 hash，可以开启调试模式。
    //
    // 非调试模式：
    // 1. 避免 AJAX 缓存(HTML源码，JavaScript、CSS、IMAGE 资源)
    // 2. 启用 HTMLint.
    // 3. 启用 CSSLint.
    debug: !(location.protocol=="https:" && location.hostname.indexOf(".alipay.com")>0) ||
        "#debug"==location.hash || false,

    // XXX: 添加随机数避免缓存，发布时建议设置为 false。
    nocache: false,

    // XXX: 发布时需修改服务器地址。
    server: "http:\/\/fmsmng.sit.alipay.net:7788\/m.gif",

    // 捕获 JavaScript 异常时重新抛出，避免浏览器控制台无法捕获异常。
    // 这个一般设置为 true 就好了。
    rethrow: true,
    // DOMReady 并延迟毫秒数之后开始运行(HTML,CSS,JAVASCRIPT)规则验证。
    delay: 1800,
    // userAgent.
    ua: navigator.userAgent,
    // page url, without search & hash.
    url: location.protocol+"\/\/"+location.hostname+location.pathname,
    htmlErrorCodes: {
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
            // 链接缺少 href 属性，或 href 指向不合法。

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
    },
    res: {
        img:[],
        css:[],
        js:[],
        fla:[]
    },
    B: {
        ie: navigator.userAgent.indexOf("MSIE") > 0 && !window.opera
    },
    JSON: {
        escape: function(str){
            return str.replace(/\\/g, '\\\\').replace(/\"/g, '\\"');
        },
        toString: function(obj){
            if(window.JSON && "function"==typeof(window.JSON.stringify)){
                return window.JSON.stringify(obj);
            }

            switch(typeof obj){
            case 'string':
                return '"' + window.monitor.JSON.escape(obj) + '"';
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
                        a[i] = window.monitor.JSON.toString(obj[i]);
                    }
                    return '[' + a.join(',') + ']';
                }else if("[object RegExp]" == type){
                    return '/' + obj.source + '/' + (obj.ignoreCase?'i':'')+(obj.multiline?'m':'')+(obj.global?'g':'');
                }else{ // [object Object]
                    var o = [];
                    for(var k in obj){
                        if(Object.prototype.hasOwnProperty.call(obj, k)){
                            o.push('"' + window.monitor.JSON.escape(k) + '"' + ':' + window.monitor.JSON.toString(obj[k]));
                        }
                    }
                    return '{' + o.join(',') + '}';
                }
            default:
            }
        }
    },
    // URI, URL, Links, Location...
    URI: {
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
                base = host + location.pathname.replace(window.monitor.URI.reFolderExt, uri);
            var a = document.createElement("a");
            if(!window.monitor.URI.reProtocol.test(uri)){
                if(uri.indexOf("/")==0){
                    uri = location.protocol + "\/\/" + location.hostname + uri;
                    //uri = host + uri;
                }else{
                    uri = location.protocol + "\/\/" + location.hostname +
                        location.pathname.replace(window.monitor.URI.reProtocol, uri);
                }
            }
            a.setAttribute("href", uri);
            return a;
        },
        path: function(uri){
			var idx = uri.indexOf("?");
			if(idx < 0){return uri;}
            return uri.substring(0, idx);
        }
    },
    // String.
    S: {
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
    },
    identify: function(){
        var b = document.cookie + navigator.userAgent + navigator.plugins.length + Math.random(),
            n=0,
            rand = ""+Math.random();
        for(var i=0,l=b.length; i<l; i++){
            n += i * b.charCodeAt(i);
        }
        return n.toString(parseInt(Math.random()*10 + 16));
    },
    send: function(url, data){
        if(!data){return;}
        if(window.monitor.debug && window.console && window.console.log){
            window.console.log("SEND: ", data.length, data);
        }
        if(window.monitor.debug && typeof(compress)!="undefined"){
            data = compress(data);
        }
        if(data){
            var url = url+(url.indexOf("?")<0 ?"?":"&")+data;
        }
        var times=0; // re-try times, eg: 3.
        var img = new Image();
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
    },
    url_len: navigator.userAgent.indexOf("MSIE")>0 ? 2083 : 8190,
    report: function(data){
        if(!data){return;}
        var d = {
                url: window.monitor.url,
                ua: window.monitor.ua,
                id: window.monitor.identify(),
                // 避免缓存。
                rand: window.monitor.S.rand()
            },
            JSON = window.monitor.JSON,
            send = window.monitor.send,
            server = window.monitor.server;
        if("htmlError" in data){
            var list = [], s="", len=window.monitor.url_len - JSON.toString(d).length - 10;
            var arr = [];
            for(var i=0,l=data.htmlError.length; i<l; i++){
                if(JSON.toString(arr.concat(data.htmlError[i])).length < len){
                    arr.push(data.htmlError[i]);
                }else{
                    d.htmlError = arr;
                    send(server, JSON.toString(d));
                    arr.length = 0;
                    arr.push(data.htmlError[i]);
                }
            }
            if(arr.length > 0){
                d.htmlError = arr;
                send(server, JSON.toString(d));
                arr.length = 0;
            }
        }else{
            for(var k in data){
                if(Object.prototype.hasOwnProperty.call(data, k)){
                    d[k] = data[k];
                }
            }
            var s = JSON.toString(d);
            send(server, s);
        }
    }
};
