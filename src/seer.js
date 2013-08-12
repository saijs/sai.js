(function(global) {
  if(global.monitor){return;}

  var M = global.monitor = {};
  M._DATAS = [];

  var lost_resources = [];
  var _lost_resources = {};
  /**
   * 客户端资源加载失败时调用这个接口。
   */
  M.lost = function(uri){
    if(_lost_resources.hasOwnProperty(uri)){return;}
    _lost_resources[uri] = true;
    lost_resources.push(uri);
  };

  var EVENTS = M._EVENTS = [];
  M.on = function(evt, handler){
    EVENTS.push([evt, handler]);
  };
  M.off = function(){};

  var DEFAULT_PROFILE = "log";
  /**
   * 通用监控接口。
   * @param {String} seed, 监控点。
   * @param {String} profile, 监控类型，默认为 `log`。
   * @return {Object}
   */
  M.log = function(seed, profile){
    if(!seed){return;}
    // 老版产品监控。
    if(arguments.length >= 3){return;}
    var data;
    if(Object.prototype.toString.call(seed) === "[object Object]"){
      data = seed;
      data.profile = seed.profile || DEFAULT_PROFILE;
    }else{
      data = {
        profile: profile || DEFAULT_PROFILE,
        seed: seed
      };
    }
    M._DATAS.push(data);
    return data;
  };

  var RE_FUNCTION = /^function\b[^\)]+\)/;
  /**
   * 获得函数名。
   * @param {Function} func, 函数对象。
   * @return {String} 函数名。
   */
  function function_name(func){
    var match = String(func).match(RE_FUNCTION);
    return match ? match[0] : "";
  }

  /**
   * 函数调用堆栈。
   * XXX: 匿名函数的支持。
   * @param {Function} call, function's caller.
   * @return {String} stack trace.
   */
  function stacktrace(call){
    var stack = [];

    while(call.arguments && call.arguments.callee && call.arguments.callee.caller){
      call = call.arguments.callee.caller;
      stack.push("at " + function_name(call));

      // Because of a bug in Navigator 4.0, we need this line to break.
      // c.caller will equal a rather than null when we reach the end
      // of the stack. The following line works around this.
      if (call.caller === call){break;}
    }
    return stack.join("\n");
  }

  var ERROR_CACHE = {};
  /**
   * JavaScript 异常统一处理函数。
   * @param {String} message, 异常消息。
   * @param {String} file, 异常所在文件。
   * @param {Number} line, 异常所在行。
   * @param {Number,String} number, 异常编码，IE 支持。
   * @return {Object} 主要用于单元测试，本身可以不返回。
   */
  function error(message, file, line, number, stack){
    if(!stack && arguments.callee.caller){
      stack = stacktrace(arguments.callee.caller);
    }
    var data = {
      profile: "jserror",
      msg: message || "",
      file: file || "",
      line: line || 0,
      num: number || "",
      stack: stack || "",
      lost: lost_resources.join(",")
    };
    var key = file+":"+line+":"+message;
    if(!ERROR_CACHE.hasOwnProperty(key)){
      data.uv = 1;
      ERROR_CACHE[key] = true;
    }
    M._DATAS.push(data);
    return data;
  }

  /**
   * JavaScript 异常接口，用于监控 `try/catch` 中被捕获的异常。
   * @param {Error} err, JavaScript 异常对象。
   * @return {Object} 主要用于单元测试。
   */
  M.error = function(ex){
    if (!(ex instanceof Error)) {return;}
    var stack = ex.stack || ex.stacktrace;
    return error(
      ex.message || ex.description,
      ex.fileName,
      ex.lineNumber || ex.line,
      ex.number,
      stack
    );
  };

  /**
   * 全局 JavaScript 异常监控。
   * @return {Boolean} 返回 `true` 则控制台捕获异常。
   *                   返回 `false` 则控制台不捕获异常。
   *                   建议返回 `false`。
   */
  global.onerror = function(message, file, line) {
    error(message, file, line);
    return false;
  };

})(this);
