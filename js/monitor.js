/**
 * @overview
 *
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version 2011/05/29
 */


// Quality Monitoring System.

// namespace.
window.monitor = {
    // XXX: 发布时需设置为 false。
    // 避免 AJAX 缓存(HTML源码，JavaScript、CSS、IMAGE 资源)
    // 启用 HTMLint
    debug: true,
    // 捕获 JavaScript 异常时重新抛出，避免浏览器控制台无法捕获异常。
    // 这个一般设置为 true 就好了。
    rethrow: true,
    // XXX: 发布时需修改服务器地址。
    MONITOR_SERVER: "http://ecmng.sit.alipay.net:7788/m.gif",
    // Client info.
    Ev: {
        ua:navigator.userAgent,
        url:location.href
    },
    JSON: {
        escape: function(str){
            return str.replace(/\\/g, '\\\\').replace(/\"/g, '\\"');
        },
        toString: function(obj){
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
    send: function(url, data){
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
    report: function(data){
        if(!data){return;}
        var d = {
            url: window.monitor.Ev.url,
            ua: window.monitor.Ev.ua
        };
        for(var k in data){
            if(Object.prototype.hasOwnProperty.call(data, k)){
                d[k] = data[k];
            }
        }
        var s = window.monitor.JSON.toString(d);
        if(window.monitor.debug && typeof(compress)!="undefined"){s = compress(s);}
        window.monitor.send(window.monitor.MONITOR_SERVER, s);
        if(window.monitor.debug && window.console && window.console.log){window.console.log("SEND: ", s.length, s);}
    },
};
