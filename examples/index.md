# 演示文档

---

<style>
button{
  padding: 5px 8px;
  cursor:pointer;
}
</style>

<script type="text/javascript" src="../src/seer.js"></script>

* 明文手机号：13912345678, 18612345678
* 明文身份证：36048119881214202X
* 明文银行卡：6225885718336811



````javascript
seajs.use(["jquery", "monitor", "privacy"], function($, monitor, privacy){

  // 命中率：[0,1]: 实际对应采样率：[0%,100%]
  var rate = 1;

  /**
   * 随机采样命中算法。
   * @param {Nuber} rate, 采样率，[0,1] 区间的数值。
   * @return {Boolean}
   */
  function hit(rate){
    return 0 === Math.floor(Math.random() / rate);
  };

  if(!hit(1)){return;}

  // 启动监控。
  monitor.boot();

  $(function(){
    var html = (document.documentElement || document.body).innerHTML;
    privacy.scan(html);
  });

});
````

----

<script type="text/javascript" onerror="monitor.lost(this.src)" src="123.js"></script>

<button type="button" id="btn-ex1">throw new Error()</button>
<button type="button" id="btn-ex2">monitor.error(new Error())</button>
<button type="button" id="btn-ex3">try undefined var</button>

----

<button type="button" id="btn3">monitor.log(seed)</button>
<button type="button" id="btn4">monitor.log(seed, profile)</button>

<script type="text/javascript">
seajs.on("error", function(module){
  monitor.lost(module.uri);
});
seajs.use("abc");

seajs.use(["jquery", "monitor"], function($, monitor){
  $("#btn-ex1").click(function(clickEx1){
    throw new Error("throw new error message.");
  });
  $("#btn-ex2").click(function(clickEx2){
    monitor.error(new Error("log new error message."));
  });
  $("#btn-ex3").click(function(clickEx3){
    function a2(a2,a21,a22){
    try{
      notDefined();
    }catch(ex){
      monitor.error(ex);
    }
    }
    function a1(a1){
        a2(2);
    }
    a1(1);
  });
  $("#btn3").click(function(){
    monitor.log("test-seed");
  });
  $("#btn4").click(function(){
    monitor.log("test-seed", "test-profile");
  });
});
</script>
