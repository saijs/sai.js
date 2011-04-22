/**
 * @overview
 * monitor for pages.
 *
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version 2011/04/02
 */

var Monitor = (function(){
    // Client info.
    var Ev = {
        os:"",
        ua:navigator.userAgent,
        la:navigator.userLanguage
    };
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
    // Error: {name, mesage}
    // [EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError]

    // Event.
    var E = {
        add: function(elem, evt, handler){
            if(window.attachEvent){
                elem.attachEvent("on"+evt, handler);
            }else{
                elem.addEventListener(evt, handler, false);
            }
        }
    };
    // Function.
    var F = {
        name : function(fn){
            if(typeof fn!="function" || !(fn instanceof Function)){throw new TypeError("fn is not type of function.");}
            if(fn.name){return fn.name;}
            var s = fn.toString().match(/function(?:\s+(\w+))\s*\(/);
            return s?s[1]:"[anonymous]";
        },
        // stacktrace.
        // @param {Function} a, target function referrer.
        // @param {Boolean} b, return function stacktrace list if true; else return string.
        // @param {Boolean} ctx, with function context in the last function if true.
        stack : function(a,b){
            var s=[], t="", e="", i=0;
            a=a&&a.callee?a:arguments.caller;
            if(!a){return b?s:"[global]";}
            for(var c=a.callee,n; c!=null; c=c.caller,i++){
                s.splice(0,0,F.name(c));
                // Because of a bug in Navigator 4.0, we need this line to break.
                // c.caller will equal a rather than null when we reach the end
                // of the stack. The following line works around this.
                if (c.caller == c) break;
            }
            if(b){return s;}
            for (i=0,l=s.length,p=""; i<l; i++){
                p=S.repeat("    ", i);
                t = t+p+"`- "+s[i]+"\n";
            }
            //for (i=0,l=s.length,p=""; i<l; i++){
                //p=S.repeat("  ", i);
                //t = t+p+"function "+s[i]+"(){"+(i==l-1?"":"\n");
                //e = (i==l-1?"":"\n"+p)+"}"+e;
            //}
            return t;
        }
    };
    // String.
    var S = {
        repeat : function(str, times){
            return new Array((times||0)+1).join(str);
        }
    };

    //if(window.attachEvent){
        //window.attachEvent("onerror", function(){
            //alert(Array.prototype.join.call(arguments)); // 4, null
        //});
    //}else{
        //window.addEventListener("error", function(evt){
            //alert(evt); // 1, ErrorEvent.target: Window/DOMWindow
        //}, false);
    //}
    window.onerror = function(msg, file, line){
        D.error(file, line, msg, F.stack(arguments.callee.caller), arguments.callee.caller);
        return !D.debug;
    };

    return {
        show:D.show,
        hide:D.hide
    };
})();
