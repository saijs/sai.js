/**
 * 前端监控脚本的公共库。
 *
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version v1.3, 2011/10/19
 */

// namespace.
!window.monitor || (function(){

    if(0 != Math.floor(Math.random()/window.monitor._rate)){return;}

    var win = window,
        loc = location,
        doc = document,
        M = win.monitor,
        MODE = {
            ONLINE: 0,
            SIT: 1,
            DEBUG: 2,
            DEV: 3,
            LOCAL: 4
        },
        // runtime mode, from enum MODE.
        mode,
        scriptBase,
        scriptB,
        LOG_SERVER,
        // static data struct for send.
        SEND_STATUS = {
            COMPLETE: 0,
            SENDING: 1
        },
        sendState = SEND_STATUS.COMPLETE,
        readyTime = new Date() - M._startTime,  // DOMReady time.
        loadTime = readyTime * 1.7;             // Page Load time.

    M.version = "1.3.1";
    M._loc = {
        protocol: loc.protocol,
        hostname: loc.hostname,
        pathname: loc.pathname,
        href: loc.href,
        hash: loc.hash
    };

    function addEvent(target, evt, handler){
        if(target.addEventListener){
            target.addEventListener(evt, handler, false);
        }else if(target.attachEvent) {
            target.attachEvent("on" + evt, handler);
        }
    };
    // window.onload handler.
    function loadHandler(){
        if(loadHandler.invoked){return;}
        loadHandler.invoked = true;
        loadTime = M._now() - M._startTime;
    }
    // DOMReady handler.
    function readyHandler(){
        if(readyHandler.invoked){return;}
        readyHandler.invoked = true;
        loadTime = M._now() - M._startTime;
    }

    if(window.addEventListener){ // Arale DOMReady has bugs.
        window.addEventListener("DOMContentLoaded", readyHandler, false);
    }else if(window.$E && $E.domReady){ // Arale.
        $E.domReady(readyHandler);
    }else if(win.YAHOO && YAHOO.util && YAHOO.util.Event) { // YUI 2.x
        YAHOO.util.Event.onDOMReady(readyHandler);
    }else if(win.jQuery){ // jQuery
        jQuery(readyHandler);
    }else if(win.Y && Y.on){ // YUI 3.x
        Y.on('domready', readyHandler);
    }

    addEvent(window, "load", loadHandler);
    addEvent(window, "unload", loadHandler);

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

    // init mode.
    if(M.S.endsWith(M._loc.hostname, ".alipay.com")){
        mode = MODE.ONLINE;
        // 日志收集服务器地址。
        LOG_SERVER = "https://magentmng.alipay.com/m.gif";
        //M._rate = 0.01;
        scriptBase = "https://assets.alipay.com/ar/??";
        scriptB = ["alipay.fmsmng.monitor-1.1-b.js"];

        // XXX: 添加随机数避免缓存，发布时建议设置为 false。
        M.nocache = false;
    }else if(M.S.endsWith(M._loc.hostname, ".sit.alipay.net") ||
        // 移动前端监控：@颂赞。
        // 移动设备不便于修改 hosts 等原因，同时开启开发环境的监控。
        // 开发环境：
        //  http://wapappweb.xxx.alipay.net/
        // SIT:
        //  https://wapappweb.sit.alipay.net/
        //  https://wapappweb.test.alipay.net/
        // 生产环境：
        //  https://mapp.alipay.com/
        /^wapappweb\.[a-zA-Z0-9_-]+\.alipay\.net$/.test(M._loc.hostname)){
        mode = MODE.SIT;
        LOG_SERVER = "https://magentmng.sit.alipay.net/m.gif";
        //M._rate = 0.8;
        scriptBase = "https://assets.sit.alipay.net/ar/??";
        scriptB = ["alipay.fmsmng.monitor-1.1-b.js"];

        // XXX: 添加随机数避免缓存，发布时建议设置为 false。
        M.nocache = false;
    }else if(M._loc.hostname=="m.loc.alipay.net"){
        if(mode == MODE.LOCAL){
            // LOCAL DEV.
            scriptBase = "http://m.loc.alipay.net/js/";
            scriptB = ["domlint2.js", "monitor-b.src.js"];
        }else{
            // DEV
            mode = MODE.DEV;
            scriptBase = "http://dev.assets.alipay.net/ar/??";
            scriptB = ["alipay.fmsmng.monitor-1.1-b.js"];
        }
        LOG_SERVER = "https://magentmng.sit.alipay.net/m.gif";
        //M._rate = 0.8;
        // XXX: 添加随机数避免缓存，发布时建议设置为 false。
        M.nocache = true;
    }else{
        return;
    }

    // XXX: 发布时建议设置为 false。
    // 发布环境：URL 中带上 "debug" 这个 hash，可以开启调试模式。
    //
    // 非调试模式：
    // 1. 避免 AJAX 缓存(HTML源码，JavaScript、CSS、IMAGE 资源)
    // 2. 启用 HTMLint.
    // 3. 启用 CSSLint.
    M.debug = mode==MODE.DEV || "#debug"==M._loc.hash || false;

    M.checkProtocol = "https:" == M._loc.protocol;

    // 捕获 JavaScript 异常时重新抛出，避免浏览器控制台无法捕获异常。
    // 这个一般设置为 true 就好了。
    M.rethrow = true;
    // DOMReady 并延迟毫秒数之后开始运行(HTML,CSS,JAVASCRIPT)规则验证。
    M.delay = 1800;
    // report request timeout.
    M.timeout = 2000;

    // page url, without search & hash.
    var idx = M._loc.pathname.indexOf(";jsessionid=");
    M.url = M._loc.protocol + "\/\/" + M._loc.hostname +
        (idx<0 ? M._loc.pathname : M._loc.pathname.substr(0, idx));

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
        // 将相对路径解析为绝对路径（绝对路径保持不变）。
        abs: function(uri){
            if(!M.URI.reProtocol.test(uri)){
                if(uri.indexOf("/")==0){
                    uri = M._loc.protocol + "\/\/" + M._loc.hostname + uri;
                    //uri = host + uri;
                }else if(uri.indexOf(".")==0){
                    uri = M._loc.protocol + "\/\/" + M._loc.hostname +
                        M._loc.pathname.replace(M.URI.reProtocol, uri);
                }else{
                    uri = M.URI.folder(M._loc.href)+uri;
                }
            }
            return uri;
        },
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
            var host = M._loc.protocol + "\/\/" + M._loc.hostname,
                base = host + M._loc.pathname.replace(M.URI.reFolderExt, uri);
            var a = doc.createElement("a");
            a.setAttribute("href", M.URI.abs(uri));
            return a;
        },
        // 判断是否外部引用类型的资源。
        // @param {String} uri, 绝对URL地址。
        // TODO: replace & remove this function.
        isExternalRes: function(uri){
            if(undefined === uri || typeof(uri)!="string"){return false;}
            return 0==uri.indexOf("https:") || 0==uri.indexOf("http:") ||
                0==uri.indexOf("file:");
        },
        // 获得资源的路径（不带参数和 hash 部分）
        // 另外新版 Arale 通过 nginx 提供的服务，支持类似：
        // > https://static.alipay.com/ar??arale.js,a.js,b.js
        // 的方式请求资源，需要特殊处理。
        //
        // @param {String} uri, 仅处理绝对路径。
        // @return {String} 返回 uri 的文件路径，不包含参数和 jsessionid。
        path: function(uri){
            if(undefined === uri || typeof(uri)!="string"){return "";}
            var idx = uri.indexOf(";jsessionid=");
            if(idx >= 0){return uri.substr(0, idx);}

            // white-list for min services.
            if(uri.indexOf("/min/?")>=0){
                return uri;
            }

            do{
                idx = uri.indexOf("?", idx);
                if(idx < 0){break;}
                if("?" == uri.charAt(idx+1)){
                    idx += 2;
                }else{
                    break;
                }
            }while(idx >= 0);

            return idx < 0 ? uri : uri.substr(0, idx);
        },
        // 获取指定 uri 指向文件所在的目录(最后带斜线 /)。
        // @param {String} uri
        // @retunr  {String}
        folder: function(uri){
            if(!uri){return "";}
            var idx = uri.lastIndexOf("/");
            return idx<0 ? "" : uri.substr(0, idx+1);
        }
    };
    // @return {String} 用于标识一次请求，用于分段发送数据。
    // 分成 N 段的每次发送，identify 标识相同。
    function identify(){
        var b = doc.cookie + navigator.userAgent + navigator.plugins.length + Math.random(),
            n=0,
            rand = ""+Math.random();
        for(var i=0,l=b.length; i<l; i++){
            n += i * b.charCodeAt(i);
        }
        return n.toString(parseInt(Math.random()*10 + 16));
    }

    // userAgent.
    var UNKNOW_INFO = {name: '', version: []};
    M.client= !!window.light ? light.client.info : {
        os:      UNKNOW_INFO,
        browser: UNKNOW_INFO,
        device:  UNKNOW_INFO,
        engine:  UNKNOW_INFO
    };
    // client data for send.
    var clientInfo = {
        // device name & version.
        dev: M.client.device.name + '/' + M.client.device.version.join('.'),
        // operating system name & version.
        os: M.client.os.name + '/' + M.client.os.version.join('.'),
        // screen size & color depth.
        scr: screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
        // browser name & version.
        bro: M.client.browser.name+'/' + M.client.browser.version.join('.'),
        // engine name & version.
        eng: M.client.engine.name + '/' + M.client.engine.version.join('.')
    };

    var URLLength = !!M.client.engine.trident ? 2083 : 8190;


    var servName = doc.getElementById("ServerNum");
    servName = (servName ? servName.innerHTML : "").split("-");
    servName = servName[0] || M._loc.hostname;

    var DATA = {
        url: M.url,
        ref: doc.referrer,
        sys: servName,
        client: clientInfo
    };

    // 创建图片请求发送数据。
    function send(url, data, callback){
        if(!callback){callback = function(){};}
        if(!data){
            callback();
            return;
        }
        var d = encodeURIComponent(data);
        var url = url+(url.indexOf("?")<0 ?"?":"&")+d;

        try{
        // @see http://www.javascriptkit.com/jsref/image.shtml
        var img = new Image(1,1);

        // 原生 img.complete [只读]，在 onerror 时(IE 中甚至之后一直)，
        // IE: false.
        // Others: true.
        function clearImage(){
            clearTimeout(timer);
            timer = null;

            if(!img.aborted){
                callback();
                img.aborted = true;
            }

            img.onload = img.onerror = img.onabort = null;
            img = null;
        }

        //img.onload = img.onerror = img.onabort = clearImage;
        img.onload = clearImage;
        img.onerror = clearImage;
        img.onabort = clearImage;

        img.src = url;

        var timer = window.setTimeout(function(){
            try{
                img.src = null;
                img.aborted = true;
                clearImage();
            }catch(ex){}
        }, M.timeout);

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
            if(encodeURIComponent(
                $JSON.toString(list[idx].concat(datas[0]))).length < len){

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

        if(data.hasOwnProperty("htmlError")){
            var list = part(data.htmlError, URLLength -
                encodeURIComponent($JSON.toString(DATA)).length - 150);
            for(var i=0,l=list.length; i<l; i++){
                M._errors.push({htmlError: list[i]});
            }
        }else{
            M._errors.push(data);
        }
        M.timedSend();
    }

    // JavaScript 装载器，用于懒装载其他脚本。
    // @param {String} src, 装载的脚本地址。
    function jsLoader(src){
        if(M.nocache){
            src += (src.indexOf("?")>=0 ? "&" : "?") + M.S.rand();
        }
        var script = doc.createElement("script");
        script.setAttribute("type", "text/javascript");
        script.setAttribute("charset", "utf-8");
        script.setAttribute("src", src);
        var hd = doc.getElementsByTagName("head");
        if(hd && hd.length>0){hd = hd[0];}
        hd = hd && hd.length>0 ? hd[0] : doc.documentElement;
        hd.appendChild(script);
    };

    // depth clone javascript objects.
    // @param {Object} o, string, number, boolean, array, regexp, date, object.
    // @return {Object} new object.
    function clone(o){
        var r;
        if(null==o){return null;}
        switch(typeof o){
        case 'string':
        case 'number':
        case 'boolean':
            r = o;
            break;
        case 'object':
            if(o instanceof Array){
                r = [];
                //r = Array.prototype.slice.call(o, 0);
                for(var i=o.length-1; i>=0; i--){
                    r[i] = clone(o[i]);
                }
            }else if(o instanceof RegExp){
                r = new RegExp(o.source, (o.ignoreCase?'i':'')+
                    (o.global?'g':'')+(o.multiline?'m':''));
            }else if(o instanceof Date){
                r = new Date(o.valueOf());
            }else if(o instanceof Error){
                o = r;
            }else if(o instanceof Object){
                r = {};
                for(var k in o){
                    if(o.hasOwnProperty(k)){
                        r[k] = clone(o[k]);
                    }
                }
            }
            break;
        default:
            throw new Error("Not support the type.");
        }
        return r;
    }
    // merge object propertys to target.
    // @param {Object} t, target object.
    // @param {Object} o, source object.
    // @return {Object} copy source object propertys to target object,
    //          and return it.
    function merge(t, o){
        for(var k in o){
            if(Object.prototype.hasOwnProperty.call(o, k)){
                t[k] = o[k];
            }
        }
        return t;
    }

    // errors queue-list timed send.
    M.timedSend = function(){
        if(sendState == SEND_STATUS.SENDING){return;}
        var e = M._errors.shift();
        if(!e){sendState=SEND_STATUS.COMPLETE; return;}
        sendState = SEND_STATUS.SENDING;

        var data = clone(DATA);
        if(Object.prototype.hasOwnProperty.call(e, "jsError")){
            e.jsError.file = M.URI.path(e.jsError.file);
        }
        data = merge(data, e);
        data.rnd = M.S.rand(); // 避免缓存。
        //for(var k in e){
            //if(Object.prototype.hasOwnProperty.call(e, k)){
                //data[k] = e[k];
            //}
        //}
        try{
        send(LOG_SERVER, $JSON.toString(data), function(){
            sendState = SEND_STATUS.COMPLETE;
            M.timedSend();
            //window.setTimeout(M.timedSend, 0);
        });
        }catch(ex){}
    };

    window.setTimeout(function(){
    try{
        M._errors.push({
            pv: 1,
            domready: readyTime,
            load: loadTime
        });
        // send all occurred errors.
        M.timedSend();

        if(M.client.engine.name=="trident" && M.client.engine.version[0]<=7)return;
        // load domlint script.
        if(mode == MODE.LOCAL){
            for(var i=0,l=scriptB.length; i<l; i++){
                jsLoader(scriptBase + scriptB[i]);
            }
        }else{
            jsLoader(scriptBase + scriptB.join(","));
        }
    }catch(ex){}
    }, M.delay);
})();
