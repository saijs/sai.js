
(function(global){

  if(global.monitor){return;}

  var M = global.monitor = {};
  M._DATAS = [];


  var EVENTS = M._EVENTS = [];
  M.on = function(evt, handler){
    EVENTS.push([evt, handler]);
  };
  M.off = function(){};


  var DEFAULT_PROFILE = "log";

  // 通用监控接口。
  // @param {Object,String} seed, 监控信息详情。
  // @param {String} profile, 监控类型，默认为 `log`。
  // @return {Object}
  M.log = function(seed, profile){
    if(!seed){return;}

    // 取消老版产品监控。
    if(arguments.length >= 3){return;}

    var data;
    if(Object.prototype.toString.call(seed) === "[object Object]"){
      data = seed;
      data.profile = profile || data.profile || DEFAULT_PROFILE;
    }else{
      data = {
        profile: profile || DEFAULT_PROFILE,
        seed: seed
      };
    }
    M._DATAS.push(data);
    return data;
  };

})(this);
