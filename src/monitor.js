define(function(require, exports, module) {

  var win = window;
  var doc = document;
  var loc = window.location;
  var M = win.monitor;

  var detector = require("detector");

  // 数据通信规范的版本。
  var version = "2.0";
  var LOG_SERVER = "https://magentmng.alipay.com/m.gif";
  var URLLength = detector.engine.trident ? 2083 : 8190;
  var url = path(loc.href);
  // 是否启用监控。
  // 采样命中后调用 boot() 方法修改为 true 后开发发送监控数据。
  var monitoring = false;

  // UTILS -------------------------------------------------------

  function typeOf(obj){
    return Object.prototype.toString.call(o);
  }

  /**
   * XXX:
   * depth clone javascript objects.
   * @param {Object} o, string, number, boolean, array, regexp, date, object.
   * @return {Object} new object.
   */
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

  /**
   * merge object propertys to target.
   * @param {Object} t, target object.
   * @param {Object} o, source object.
   * @return {Object} copy source object propertys to target object,
   *          and return it.
   */
  function merge(t, o){
    for(var k in o){
      if(!Object.prototype.hasOwnProperty.call(o, k)){continue;}
      t[k] = o[k];
    }
    return t;
  }

  /**
   * simple random string.
   * @return {String}
   */
  function rand(){
    return (""+Math.random()).slice(-6);
  }
  /**
   * 获得资源的路径（不带参数和 hash 部分）
   * 另外新版 Arale 通过 nginx 提供的服务，支持类似：
   * > https://static.alipay.com/ar??arale.js,a.js,b.js
   * 的方式请求资源，需要特殊处理。
   *
   * @param {String} uri, 仅处理绝对路径。
   * @return {String} 返回 uri 的文件路径，不包含参数和 jsessionid。
   */
  function path(uri){
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
  }

  function innerText(elem){
    if(!elem){return "";}
    return elem.innerText || elem.textContent || "";
  }

  /**
   * @param {Object} obj
   * return {String}
   */
  function param(obj){
    if(Object.prototype.toString.call(obj) !== "[object Object]"){
      return "";
    }
    var p = [];
    for(var k in obj){
      if(!obj.hasOwnProperty(k)){continue;}
      //if(Object.prototype.toString.call(obj[k]) === "[object Array]"){
        //p.push(k+"="+encodeURIComponent(obj[k]));
        //p.push.apply(k+"="+encodeURIComponent(obj[k]));
      //}else{
        p.push(k+"="+encodeURIComponent(obj[k]));
      //}
    }
    return p.join("&");
  }

  function has(obj, key){
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  // /UTILS -------------------------------------------------------

  //function serverNumber(){
    //var servName = doc.getElementById("ServerNum");
    //servName = innerText(servName).split("-");
    //servName = servName[0] || loc.hostname;
    //return servName;
  //}

  var DEFAULT_DATA = {
    url: url,
    ref: doc.referrer || "-",
    //sys: servName,
    // XXX: 使用 detector v1.1.0 使用 full_version 属性。
    clnt: detector.device.name+"/"+String(detector.device.version)+"|"+
      detector.os.name+"/"+String(detector.os.version)+"|"+
      detector.browser.name+"/"+String(detector.browser.version)+"|"+
      detector.engine.name+"/"+String(detector.engine.version),
    v: version
  };


  /**
   * 创建图片请求发送数据。
   * @param {String} url, 日志服务器 URL 地址。
   * @param {Object} data, 附加的监控数据。
   * @param {Function} callback
   */
  function send(url, data, callback){
    if(!callback){callback = function(){};}
    if(!data){return callback();}

    var d = param(data);
    var url = url+(url.indexOf("?")<0 ?"?":"&")+d;
    if(url.length > URLLength){return callback();}

    // @see http://www.javascriptkit.com/jsref/image.shtml
    var img = new Image(1,1);
    img.onload = img.onerror = img.onabort = function(){
      callback();
      img.onload = img.onerror = img.onabort = null;
      img = null;
    };

    img.src = url;
  }

  var sending = false;
  /**
   * 分时发送队列中的数据，避免 IE(6) 的连接请求数限制。
   */
  function timedSend(){
    if(!monitoring || sending){return;}

    var e = M._DATAS.shift();
    if(!e){return;}
    sending = true;

    var data = clone(DEFAULT_DATA);
    // 理论上应该在收集异常消息时修正 file，避免连接带有参数。
    // 但是收集部分在 seer 中，不适合放置大量的脚本。
    if(e.profile === "jserror"){
      e.file = path(e.file);
    }
    data = merge(data, e);
    data.rnd = rand(); // 避免缓存。
    send(LOG_SERVER, data, function(){
      sending = false;
      timedSend();
    });
  }

  /**
   * 发送数据
   */
  function log(data){
    if(!data){return;}

    M._DATAS.push(data);
  }

  // timedSend 准备好后可以替换 push 方法，自动分时发送。
  var _push = M._DATAS.push;
  M._DATAS.push = function(){
    _push.apply(M._DATAS, arguments);
    timedSend();
  };

  /**
   * 启动监控进程，开始发送数据。
   * @param {Boolean} state, 启动状态标识。
   *    为 `false` 时停止监控。
   *    否则启动监控。
   */
  M.boot = function(state){
    monitoring = (state !== false);
  };

  window.monitor = M;
  module.exports = M;
});
