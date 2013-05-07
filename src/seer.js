(function() {
  if(window.monitor){return;}

  var M = {};
  M._DATAS = [];

  // XXX:
  M.log = function(g, p, c) {
    M._DATAS.push({
      constom: {
        type: "log",
        productLine: g,
        product: p,
        errorCode: c,
        counts: 1
      }
    });
    if ("function" == typeof M.timedSend) {
      M.timedSend();
    }
  };

  M.error = function(e) {
    if (!(e instanceof Error)) {return;}
    M._DATAS.push({
      profile: "jserror",
      msg: e.message,
      file: e.fileName || "",
      ln: e.lineNumber || e.line || 0
    });
    if ("function" == typeof M.timedSend) {
      M.timedSend();
    }
  };

  /**
   * JavaScript 异常监控。
   */
  window.onerror = function(m, f, l) {
    M._DATAS.push({
      profile: "jserror",
      msg: m,
      file: f,
      line: l
    });
    return false;
  }

  window.monitor = M;
})();
