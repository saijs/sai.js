(function() {
  if(window.monitor){return;}

  var M = window.monitor = {};
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

  /**
   * 通用监控接口。
   * @param {String} seed, 监控点。
   * @param {String} profile, 监控类型，默认为 `log`。
   * @return {Object}
   */
  M.log = function(seed, profile){
    if(!seed){return;}
    var profile = profile || "log";

    // 兼容老版对产品监控的支持。
    if(arguments.length === 3){
      profile = "product";
      seed = Array.prototype.join.call(arguments,"|");
    }
    var data = {
      profile: profile,
      seed: String(seed)
    };
    M._DATAS.push(data);
    return data;
  };

  // TODO: `time` 统计数值计算的接口。

  /**
   * JavaScript 异常统一处理函数。
   * @param {String} message, 异常消息。
   * @param {String} file, 异常所在文件。
   * @param {Number} line, 异常所在行。
   * @return {Object} 主要用于单元测试，本身可以不返回。
   */
  function error(message, file, line){
    var data = {
      profile: "jserror",
      msg: message || "",
      file: file || "",
      line: line || 0,
      lost: lost_resources.join(",")
    };
    M._DATAS.push(data);
    return data;
  }

  /**
   * JavaScript 异常接口，用于监控 `try/catch` 中被捕获的异常。
   * @param {Error} err, JavaScript 异常对象。
   * @return {Object} 主要用于单元测试。
   */
  M.error = function(e) {
    if (!(e instanceof Error)) {return;}
    return error(e.message, e.fileName, e.lineNumber || e.line);
  };

  /**
   * 全局 JavaScript 异常监控。
   * @return {Boolean} 返回 `true` 则控制台捕获异常。
   *                   返回 `false` 则控制台不捕获异常。
   *                   建议返回 `false`。
   */
  window.onerror = function(message, file, line) {
    error(message, file, line);
    return false;
  }
})();
