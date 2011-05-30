/**
 * JavaScript Sniffer.
 *
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version 2011/04/02
 */
window.monitor.JSniffer = (function(){
    // Error: {name, mesage}
    // [EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError]

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
        var d = {
            jsError: {
                file: file,
                ln: line,
                msg: msg//+" | "+F.stack(arguments.callee.caller)+", "+arguments.callee.caller
            }
        };
        window.monitor.report(d);
        // false: re-throw error, true: capture error.
        return !window.monitor.rethrow;
    };

})();
