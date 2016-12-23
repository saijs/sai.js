
var DEFAULT_PROFILE = "log";

var Sai = {
  _DATAS: [],
  _EVENTS: [],
};

Sai.on = function(evt, handler){
  Sai._EVENTS.push([evt, handler]);
};

// TODO: To implemention.
Sai.off = function(){};

// 通用监控接口。
// @param {Object,String} seed, 监控信息详情。
// @param {String} profile, 监控类型，默认为 `log`。
// @return {Object}
Sai.log = function(seed, profile){
  if(!seed){return;}

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
  Sai._DATAS.push(data);
  return data;
};

/* global module */
module.exports = Sai;
