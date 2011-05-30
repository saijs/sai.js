/**
 * @overview
 * TODO: Logger.
 *
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version 2011/05/17
 */

window.monitor.Monitor = (function(){

    /**
     * 封装的兼容多浏览器的XMLHttpRequest（注意大小写）对象。
     * 隐藏了各浏览器间异步&同步方式的差异性。
     * @usage
     *          AJAX.send("data.json","post","",function(st,re){
     *              // st: "ok"/"ing"/"err"
     *              // re: response, re.responseText
     *          });
     * @namespace org.xianyun.net;
     * @constructor XmlHttpRequest(a)
     * @param {Boolean} a 是否使用异步方式。false则为同步，否则异步。
     * @see 参考Robin Pan (htmlor@gmail.com)的同名类。
     * @since IE6.0, Firefox2.0, Opera9.0, Safari3.0, Netscape8.0
     * @version 2006/4/16, 2008/2/29
     * @author 闲耘 (mail@xianyun.org)
     */
    var Ajax = function(a){
        /**
         * @type {Boolean} 请求方式，true:异步/false:同步。
         */
        this.async = (a!=undefined?a:true);

        var d = true; // done?
        var r = null;
        if(window.XMLHttpRequest){
            r = new XMLHttpRequest();
            //如果服务器的响应没有XML mime-type header，
            //某些Mozilla浏览器可能无法正常工作。
            //所以需要XmlHttp.overrideMimeType('text/xml'); 来修改该header.
            if (r.overrideMimeType){
                r.overrideMimeType("text/xml");
            }
        } else if(window.ActiveXObject){ // 支持ActiveX的（ie）
            for (var i=Ajax.AXOI, l=Ajax.AXO.length; i<l; i++){
                try {
                    r = new ActiveXObject(Ajax.AXO[i]);
                    Ajax.AXOI = i; // 兼容性记忆体。
                    break;
                } catch(e){
                    r = null;
                }
            }
        }
        if (r===null) throw new NotSupportException("浏览器不支持XMLHttpRequest或类似对象。");

        /**
         * 发送请求。
         * @param {String} url 目标请求地址，可以是绝对/相对路径。
         * @param {String} method 发送请求的方式，"post"/"get"。默认为"get"方式。
         * @param {String} param 发送请求中带的参数。
         * @param {Function} callback 发送请求过程中的回调函数。
         */
        this.send = function(u, m, p, c){
            d = false;
            var isPost = /^post$/i.test(m);
            if(!isPost){
                u = u+"?"+p;
            }
            r.open(m, u, this.async); // 发送数据（异步）
            if(isPost){ // 提交方法为post时，发送信息头
                //r.setrequestheader("content-length",(new String(u)).length);
                //r.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                r.setRequestHeader("Content-Type", "text/plain;charset=GBK");
            }
            r.send(isPost?p:null);
            if (this.async) { // 同步方式不要设置回调。
                r.onreadystatechange = function(){ // 处理request的响应
                    if (r.readyState == 4) {// 响应完成后（状态4）
                        if (r.status == 200) { // 良好
                            c("ok", r);
                        } else { // 异常
                            c("ex", r);
                        }
                        d = true;
                    } else { // 响应未完成时（状态0/1/2/3）
                        c("ing", r);
                    }
                }
            }
            if ((!this.async)&& c instanceof Function){
                if (r.status===200) c("ok", r);
                else c("ex", r);
            }
        };

        /**
         * 取消未完成的异步请求。
         */
        this.abort = function(){
            if (!d){r.abort();}
            d=true;
        };

        /**
         * 判断当前XmlHttpRequest对象是否完成请求。
         * @return {Boolean} true，如果完成，否则返回false。
         */
        this.isDone=function(){
            return d;
        };
    }
    Ajax.AXO = [
    'MSXML3.XMLHTTP.5.0',
    'MSXML3.XMLHTTP.4.0',
    'MSXML3.XMLHTTP.3.0',
    'MSXML3.XMLHTTP.2.0',
    "Msxml3.XMLHTTP",
    "Msxml2.XMLHTTP.5.0",
    "Msxml2.XMLHTTP.4.0",
    "Msxml2.XMLHTTP.3.0",
    "Msxml2.XMLHTTP",
    "Microsoft.XMLHTTP"];
    Ajax.AXOI=0; // 兼容性记忆体。

    /**
     * XmlHttpRequest对象池，避免每次创建新的XmlHttpRequest对象。
     */
    var AJAX={
        pool:[],
        /**
         * @param {Boolean} a true则使用异步方式，false使用同步方式。默认为true。
         * @ignore
         */
        _instance:function(a){
            var p=AJAX.pool;
            if(a===undefined){a=true;}
            for(var i=0,l=p.length; i<l; i++){
                if(p[i].isDone()&&p[i].async===a){return p[i];}
            }
            return (p[p.length]=new Ajax(a));
        },
        send:function(u,m,p,c,a){
            AJAX._instance(a).send(u,m,p,c);
        }
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
    // 1. merge(DOMLint, HTMLint);
    // 2. sit ? HTMLint : DOMLint;
    // 3. HTMLint || DOMLint
    DOM.ready(function(){
        var dbg = window.monitor.debug;
        window.setTimeout(function(){
            if("undefined" != typeof(window.monitor.DOMLint)){
                var htmlErr = window.monitor.DOMLint.parse();
                window.monitor.report(htmlErr);
            }
            if(dbg && "undefined"!=typeof(window.monitor.HTMLint)){
                var url = location.href;
                if(window.monitor.nocache){
                    // TODO: 增加避免缓存的设置。
                    url = url + (location.search.indexOf("?")==0 ? "&" : "?")+window.monitor.S.rand();
                }
                AJAX.send(url, "get", "", function(st, re){
                    if(st=="ok"){
                        var html = re.responseText;
                        var htmlErr = window.monitor.HTMLint(html);
                        window.monitor.report(htmlErr);
                    }
                });
            }
        }, 800);
    });
    // Debug.
    var D = {
        // debug status on/off.
        //  true: state on, re-throw error on browser.
        //  false: state off, do not re-throw error.
        debug : true,
        maxLenth:100,
        _datas:[],
        smartScroll: true,
        log : function(type, file, line, msg){
            if(!D._box){D.init();}
            var atBottom = D._content.scrollTop+D._content.offsetHeight>=D._content.scrollHeight;
            var d = {
                file:file,
                line:line,
                type:type,
                message:msg
            }
            D._datas.push(d);
            if(D._datas.length>D.maxLenth){return;}
            var ex = document.createElement("li");
            ex.innerHTML = "File: "+file+"<br/>Line: "+line+"<br/>Type: "+type+"<br/><br/>"+msg;
            D._content.appendChild(ex);
            if(D.smartScroll && atBottom){
                D._content.scrollTop = D._content.scrollHeight;
            }
        },
        warn : function(){D.log("warn", file, line, msg);},
        info : function(){D.log("info", file, line, msg);},
        error : function(file, line, msg, stack, src){
            D.log("error", file, line,
                msg+"\n\n"+stack.replace(/ /g,"&nbsp;").replace(/\r\n|\r|\n/g, "<br />")+"<xmp>"+src+"</xmp>");
        },
        _box:null,
        _content:null,
        _close:null,
        init : function(){
            var box = document.createElement("div");
            box.className = "monitor";
            document.body.appendChild(box);
            D._box = box;

            var cnt = document.createElement("ol");
            box.appendChild(cnt);
            D._content = cnt;

            var cls = document.createElement("a");
            cls.href="javascript:void(0);";
            cls.appendChild(document.createTextNode("Close"));
            cls.onclick = D.hide;
            D._close = cls;
            box.appendChild(cls);

            return box;
        },
        show : function(){
            if(!D._box){D.init();}
            D._box.style.display="block";
        },
        hide : function(){
            if(!D._box){D.init();}
            D._box.style.display="none";
        }
    };

    return {
        show: D.show,
        hide: D.hide
    };
})();
