/**
 * monitor seer.
 * 监控脚本的先行者，写入在文档头部，准备好发现（包括早期的）脚本异常情况。
 *
 * @see http://www.errorstack.com/
 * @see http://damnit.jupiterit.com/
 *
 * @author 冒顿(闲耘™, @hotoo, hotoo.cn[AT]gmail.com)
 * @version 1.3, 2011/06/21
 */
window.monitor || (function(){
    var M = window.monitor = {};
    M._rate = 0.8;

    // 所有异常/错误信息都将 push 到这个队列中，待发送到服务端。
    M._errors = [];

    M._now = function(){
        return ("function"==typeof Date.now) ? Date.now() : new Date().valueOf();
    };

	// use IE 9 performance instead if applicable
    M._startTime = window.performance && performance.timing ?
        performance.timing.navigationStart : M._now();

    // ------------------------- monitor API ---------------------------
    // API.{{{
    var _TIMER = {};
    // M._page_load_time = "monitor.page.load";
    // M.time(M._page_load_time);
    // ...
    // M.timeEnd(M._page_load_time);
    M.time = function(name){
        _TIMER[name] = M._now();
    };
    M.timeEnd = function(name){
        var s = _TIMER[name];
        if(!s){return NaN;}
        var e = M._now();
        return e - s;
    };
    // @param {String} t, type of constom error.
    // @param {String} m, message of constom error.
    function api_log(t, m){
        M._errors.push({constom:{type:t, msg:Array.prototype.join.call(m, '|')}});
        M.timedSend();
    }
    M.log = function(m){api_log("log", arguments);};
    M.info = function(m){api_log("info", arguments);};
    M.warn = function(m){api_log("warn", arguments);};
    M.error = function(e){
        if(msg instanceof Error){
            M._errors.push({constom:{
                msg: e.message, // +"::"+(e.stack||"")
                file: e.fileName || "",
                ln: e.lineNumber || e.line || 0
            }});
            M.timedSend();
        }else{
            api_log("error", arguments);
        }
    };
    //}}}
    // ------------------------ /monitor API ---------------------------

    // JSniffer.
    // @see
    // http://msdn.microsoft.com/en-us/library/cc197053%28v=vs.85%29.aspx
    // http://stackoverflow.com/questions/2663701/firefox-window-onerror-event-problem-alerts-script-error-only
    // http://stackoverflow.com/questions/3092761/window-onerror-in-safari-javascript
    // http://www.quirksmode.org/dom/events/error.html
    //
    // https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error
    // https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error/Stack
    // https://developer.mozilla.org/en/JavaScript/Reference/Statements/throw
    // https://developer.mozilla.org/en/JavaScript/Reference/Statements/try...catch
    //
    // http://stackoverflow.com/questions/1008692/window-onerror-not-firing-in-firefox
    // http://www.javascriptkit.com/javatutors/error3.shtml
    // http://www.javascriptkit.com/javatutors/error.shtml
    // https://developer.mozilla.org/en/DOM/window.onerror
    // http://stackoverflow.com/questions/3092761/window-onerror-in-safari-javascript
    // http://blog.csdn.net/WebAdvocate/article/details/5821803
    window.onerror = function(m,f,l){
        // TODO: new Error().stack;
        M._errors.push({jsError:{msg:m, file:f, ln:l}});
        if("function" == typeof M.timedSend){M.timedSend();}
        // false: re-throw error, true: capture error.
        return false;
    }
})();
