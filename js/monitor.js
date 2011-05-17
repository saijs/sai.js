/**
 * @overview
 * TODO: Logger.
 *
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version 2011/05/17
 */

window.Monitor = (function(){
    // Client info.
    var Ev = {
        os:navigator.appVersion,
        ua:navigator.userAgent,
        url:location.href
    };
    var REPORT_SERVER = "m.gif";

    var send = function(url, data){
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
    };
    var report = function(data){
        if(!data){return;}
        var d = {
            url:Ev.url,
            ua: Ev.ua
        };
        for(var k in data){
            if(Object.prototype.hasOwnProperty.call(data, k)){
                d[k] = data[k];
            }
        }
        //send(REPORT_SERVER, "d="+JSON.toString(d));
        send(REPORT_SERVER, compress(JSON.toString(d)));
    };

     var JSON = {
        escape: function(str){
            return str.replace(/\\/g, '\\\\').replace(/\"/g, '\\"');
        },
        toString: function(obj){
            switch(typeof obj){
            case 'string':
                return '"' + JSON.escape(obj) + '"';
			case 'number':
				return isFinite(obj)?String(obj):'null';
			case 'boolean':
			case 'null':
				return String(obj);
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
    DOM.ready(function(){
        window.setTimeout(function(){
            var htmlErr = DOMLint.parse();
            report(htmlErr);
            //var sit = location.hostname.indexOf("alipay.net")>=0;
            //if(sit){
                //htmlErr.concat(HTMLint.parse());
            //}
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
        report: report,
        show: D.show,
        hide: D.hide
    };
})();
