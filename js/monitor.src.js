/**
 * 前端监控脚本的公共库。
 *
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version v1.2.5, 2011/06/20
 */


// Quality Monitoring System.

// namespace.
window.monitor || (function(){

    // XXX: 发布时改成 /monitor.js
    // monitor script seed name.
    var monitorSeedName = "/monitor.js";
    //var monitorSeedName = "/monitor.js";
    // 监控脚本的主体部分。
    var monitorFileName = "monitor_b.js";

    var monitorSeedScript = (function(){
        var ss = document.getElementsByTagName("script"),
            script = ss[ss.length - 1];
        for(var i=0,src,l=ss.length; i<l; i++){
            src = ss[i].getAttribute("src");
            if(src && src.indexOf(monitorSeedName) > 0){
                return ss[i];
            }
        }
        return script;
    })();

    // 以指定的概率执行监控脚本。
    // 1:100
    var rate = parseFloat(monitorSeedScript.getAttribute("data-rate")) || 1;
    if(0 != Math.floor(Math.random()/rate)){
        return;
    }

    var startTime = new Date();

    var M = window.monitor = {
        // XXX: 发布时建议设置为 false。
        // 发布环境：URL 中带上 "debug" 这个 hash，可以开启调试模式。
        //
        // 非调试模式：
        // 1. 避免 AJAX 缓存(HTML源码，JavaScript、CSS、IMAGE 资源)
        // 2. 启用 HTMLint.
        // 3. 启用 CSSLint.
        debug: location.hostname.indexOf(".alipay.com")<0 ||
            "#debug"==location.hash || false,

        // XXX: 添加随机数避免缓存，发布时建议设置为 false。
        nocache: false,

        // XXX: 发布时需修改服务器地址。
        server: "http:\/\/fmsmng.sit.alipay.net:7788\/m.gif",
        //server: "http:\/\/free-92-208.alipay.net:7788\/m.gif",

        // XXX: 设置监控的对象，域名在此之外的，会做客户端监控报告，但不发往服务器。
        //           .alipay.com
        //       .sit.alipay.net
        domain: ".sit.alipay.net",

        checkProtocol: "https:" == location.protocol,

        // 捕获 JavaScript 异常时重新抛出，避免浏览器控制台无法捕获异常。
        // 这个一般设置为 true 就好了。
        rethrow: true,
        // DOMReady 并延迟毫秒数之后开始运行(HTML,CSS,JAVASCRIPT)规则验证。
        delay: 1800,
        // report request timeout.
        timeout: 2000,
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
    var $JSON = {
        escape: function(str){
            return str.replace(/\r|\n/g, '').replace(/\\/g, '\\\\').replace(/\"/g, '\\"');
        },
        toString: function(obj){
            // XXX: 受 https://img.alipay.com/assets/j/sys/ad_customize.js 影响。
            // 无法使用原生 JSON 对象。
            //if(window.JSON && "function"==typeof(window.JSON.stringify)){
                //return window.JSON.stringify(obj);
            //}

            switch(typeof obj){
            case 'string':
                return '"' + $JSON.escape(obj) + '"';
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
                        a[i] = $JSON.toString(obj[i]);
                    }
                    return '[' + a.join(',') + ']';
                }else if("[object RegExp]" == type){
                    return '/' + obj.source + '/' + (obj.ignoreCase?'i':'')+(obj.multiline?'m':'')+(obj.global?'g':'');
                }else{ // [object Object]
                    var o = [];
                    for(var k in obj){
                        if(Object.prototype.hasOwnProperty.call(obj, k)){
                            o.push('"' + $JSON.escape(k) + '"' + ':' + $JSON.toString(obj[k]));
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
        reFolderExt:/[^\/]*$/,
        reProtocol:/^\w+:/,
        // Data-URI.
        // http://dancewithnet.com/2009/08/15/data-uri-mhtml/
        // http://en.wikipedia.org/wiki/Data_URI_scheme#Web_browser_support
        // http://msdn.microsoft.com/en-us/library/cc848897%28VS.85%29.aspx
        reDataURI: /^data:/,
        // 获得Archor对象，便于获取其protocol,host...属性。
        // 可惜IE直接复制相对地址无法获得正确的属性，需要设置绝对地址。
        // @param {String"} uri 绝对/相对地址。
        // @usage URI.parse(img.src); || img.getAttribute("src");
        //        img.src - 自动转成绝对地址。
        //        img.getAttribute("src") - 原样取出属性值。
        parse: function(uri){
            if(undefined === uri || typeof(uri)!="string"){
                return "";
                //throw new TypeError("required string argument.");
            }
            var host = location.protocol + "\/\/" + location.hostname,
                base = host + location.pathname.replace(M.URI.reFolderExt, uri);
            var a = document.createElement("a");
            if(!M.URI.reProtocol.test(uri)){
                if(uri.indexOf("/")==0){
                    uri = location.protocol + "\/\/" + location.hostname + uri;
                    //uri = host + uri;
                }else if(M.URI.reDataURI.test(uri)){
                    // Data-URI.
                    //uri = uri;
                }else{
                    uri = location.protocol + "\/\/" + location.hostname +
                        location.pathname.replace(M.URI.reProtocol, uri);
                }
            }
            a.setAttribute("href", uri);
            return a;
        },
        // 判断是否外部引用类型的资源。
        // @param {String} uri, 绝对URL地址。
        isExternalRes: function(uri){
            return 0==uri.indexOf("http:\/\/") || 0==uri.indexOf("https:\/\/");
        },
        // @param {String} uri, 仅处理绝对路径。
        // @return {String} 返回 uri 的文件路径，不包含参数和 jsessionid。
        path: function(uri){
			var idx = uri.indexOf(";jsessionid=");
            if(idx >= 0){return uri.substr(0, idx);}

			idx = uri.indexOf("?");
            if(idx >= 0){return uri.substr(0, idx);}

			return uri;
        },
        // 获取指定 uri 指向文件所在的目录。
        // @param {String} uri
        // @retunr  {String}
        folder: function(uri){
            if(!uri){return "";}
            var idx = uri.lastIndexOf("/");
            return idx<0 ? "" : uri.substr(0, idx+1);
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
    // @return {String} 用于标识一次请求，用于分段发送数据。
    // 分成 N 段的每次发送，identify 标识相同。
    function identify(){
        var b = document.cookie + navigator.userAgent + navigator.plugins.length + Math.random(),
            n=0,
            rand = ""+Math.random();
        for(var i=0,l=b.length; i<l; i++){
            n += i * b.charCodeAt(i);
        }
        return n.toString(parseInt(Math.random()*10 + 16));
    }

    M.Browser = {
        ie: navigator.userAgent.indexOf("MSIE") > 0 && !window.opera,
        IE6: navigator.userAgent.indexOf("MSIE 6") > 0 && !window.opera
    };
    var URLLength = M.Browser.ie ? 2083 : 8190;

    // 取消数据请求发送，基于浏览器兼容性及当前解决方案停止整个页面资源请求
    // 的危险性，决定取消使用这个方案。
    /*
    function abort(img){
        try{
            // @see http://stackoverflow.com/questions/930237/javascript-cancel-stop-image-requests
            // @see http://stackoverflow.com/questions/3146200/stop-loading-of-images-on-a-hashchange-event-via-javascript-or-jquery
            //
            // @see https://developer.mozilla.org/en/DOM/window.stop
            if(typeof(window.stop) !== "undefined"){
                window.stop();
            }else if(typeof(document.execCommand) !== "undefined"){
                // @see http://msdn.microsoft.com/en-us/library/ms536419%28v=vs.85%29.aspx
                // @see http://msdn.microsoft.com/en-us/library/ms533049%28v=vs.85%29.aspx
                // @see https://developer.mozilla.org/En/Document.execCommand
                document.execCommand("StopImage", false);
                document.execCommand("Stop", false);
            }
        }catch(ex){}
        img.src = null;
        img.completed = true;
        img = null;
    };*/
    // 创建图片请求发送数据。
    function send(url, data, callback){
        if(!callback){callback = function(){};}
        if(!data){
            callback();
            return;
        }
        var d = encodeURIComponent(data);
        if(M.debug && window.console && window.console.log){
            window.console.log("SEND: ", d.length, data);
        }
        if(location.hostname.indexOf(M.domain)<0){return;}
        var url = url+(url.indexOf("?")<0 ?"?":"&")+d;

        try{
        // @see http://www.javascriptkit.com/jsref/image.shtml
        var img = new Image(1,1);

        //function clearImage(){
            //window.clearTimeout(timer);
            //timer = null;
            // // 原生 img.complete 在 onerror 时，各浏览器不一致【只读】。
            //img.completed = true;
            //img = null;
        //}
        img.onload = callback;
        img.onerror = callback;
        img.onabort = callback;
        //abort loading image.
        //var timer = window.setTimeout(function(){
            //if(!img || img.completed){return;}
            //abort(img);
        //}, M.timeout);

        img.src = url;
        }catch(ex){
            // TODO: 资源类分段发送。
            // TODO: 自我异常检测。
        }
    };

    // 将数据分成多段。
    // @param datas {Array} 原始数组数据。
    // @param len {Number} 每段JSON.stringify并编码之后的最大长度。
    // @return {Array<Array>}
    //
    // eg. part([0,1,2,3,4,5,6], 2);
    // [[0,1],[2,3],[4,5],[6]]
    function part(datas, len){
        var datas=datas.slice(0), list=[[]], idx=0;
        while(datas.length>0){
            if(encodeURIComponent($JSON.toString(list[idx].concat(datas[0]))).length < len){
                list[idx].push(datas.shift());
            }else{
                list[++idx] = [];
                list[idx].push(datas.shift());
            }
        }
        return list;
    }
    // 统一数据发送接口。
    // @param {Object} data, 参考与后端沟通的数据发送格式规格。
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
            var list = part(data.htmlError, URLLength - $JSON.toString(d).length - 100);
            (function timedSend(arr){
                d.htmlError = arr;
                send(M.server, $JSON.toString(d), function(){
                    if(list.length < 1){return;}
                    timedSend(list.shift());
                })
            })(list.shift());
        }else{
            for(var k in data){
                if(Object.prototype.hasOwnProperty.call(data, k)){
                    d[k] = data[k];
                }
            }
            var s = $JSON.toString(d);
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
        // @see http://www.never-online.net/blog/article.asp?id=230
        // http://ie.microsoft.com/testdrive/HTML5/DOMContentLoaded/Default.html
        // http://www.cnblogs.com/rubylouvre/archive/2009/12/30/1635645.html
        // http://www.css88.com/archives/2112
        // http://www.planabc.net/2011/05/26/domready_function/
        // http://code.google.com/p/domready/
        // @param {Function} DOM Ready 时的回调函数。
        ready: function(callback){
            // @see https://developer.mozilla.org/en/DOM/document.readyState
            // http://stackoverflow.com/questions/1526544/document-readystate-analog-for-gecko-based-browsers
            // http://www.w3schools.com/jsref/prop_doc_readystate.asp
            // http://www.cnblogs.com/ryb/archive/2006/03/29/361510.aspx
            // http://msdn.microsoft.com/en-us/library/ms534359(v=vs.85).aspx
            //
            // http://permalink.gmane.org/gmane.comp.web.dojo.devel/15028
            // Google Chrome 的 DOMContentLoaded 会在 DOMReady 之前发生。
            //
            // document.createElement("script") 的方式 load 脚本，
            // 在 Google Chrome 中，被 load 的脚本内部
            // document.readyState=="interactive"
            // 此时绑定 DOMContentLoaded 事件不会被触发。
            switch(document.readyState){
            case 'complete':
            case 'loaded':
                callback();
                return;
            case 'interactive':
                window.setTimeout(callback, 0);
                return;
            default:
            }
            /* Internet Explorer */
            // @see http://www.zachleat.com/web/domcontentloaded-inconsistencies/
            if(!!window.ActiveXObject){
                var timer = setInterval(function(){
                    try{
                        document.body.doScroll('left');
                        clearInterval(timer); timer = null;
                        callback();
                    }catch(ex){};
                }, 10);
                return;
            }
            /* Mozilla, Chrome, Opera */
            // @see https://developer.mozilla.org/en/Gecko-Specific_DOM_Events
            if(document.addEventListener){
                document.addEventListener("DOMContentLoaded", callback, false);
                return;
            }
            /* Safari, iCab, Konqueror */
            if(/KHTML|WebKit|iCab/i.test(navigator.userAgent)){
                var timer = window.setInterval(function(){
                    if(/loaded|complete/i.test(document.readyState)){
                        callback();
                        clearInterval(timer); timer = null;
                    }
                }, 10);
                return;
            }
            /* Other web browser */
            window.onload = callback;
        }
    };
    // JavaScript 装载器，用于懒装载其他脚本。
    // @param {String} src, 装载的脚本地址。
    function jsLoader(src){
        if(M.nocache){
            src += (src.indexOf("?")>=0 ? "&" : "?") + M.S.rand();
        }
        var script = document.createElement("script");
        script.setAttribute("type", "text/javascript");
        script.setAttribute("charset", "utf-8");
        script.setAttribute("src", src);
        var hd = document.getElementsByTagName("head");
        if(hd && head.length>0){hd = hd[0];}
        hd = hd && hd.length>0 ? hd[0] : document.documentElement;
        hd.appendChild(script);
    };

    (function(script){
        M.base = M.URI.folder(script.src);

        var src = script.getAttribute("src"),
            idx = src.indexOf("?");
        M.version = idx<0?"":src.substr(idx);
    })(monitorSeedScript);

    M.Browser.IE6 || DOM.ready(function(){
        M.readyTime = new Date() - startTime;
        window.setTimeout(function(){
            try{
            // XXX: 开发环境避免每次打包，可以取消这里的注释。
            //if(M.debug){
                //jsLoader(M.base+"domlint.src.js"+M.version);
                //jsLoader(M.base+"monitor-b.src.js"+M.version);
            //}else{
                jsLoader(M.base+monitorFileName+M.version);
            //}
            }catch(ex){}
        }, M.delay);
    });
})();
