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
seajs.use(["jquery", "monitor", "idcard", "bankcard", "mobilephone"],
    function($, monitor, IDCard, BankCard, Mobile){

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
    var re_cards = /\b\d{11,19}X?\b/g;
    var m = html.match(re_cards);
    if(m){
      for(var i=0,l=m.length; i<l; i++){
        if(Mobile.verify(m[i])){
          monitor.log("mobile", "sens");
        }else if(IDCard.verify(m[i])){
          monitor.log("idcard", "sens");
        }else if(BankCard.verify(m[i])){
          monitor.log("bankcard", "sens");
        }
      }
    }
  });

});
````

----

<script type="text/javascript" onerror="monitor.lost(this.src)" src="123.js"></script>

<button type="button" id="btn1">throw new Error()</button>
<button type="button" id="btn2">throw new Error()</button>

----

<button type="button" id="btn3">monitor.log(seed)</button>
<button type="button" id="btn4">monitor.log(seed, profile)</button>

<script type="text/javascript">
seajs.on("error", function(module){
  monitor.lost(module.uri);
});
seajs.use("abc");

seajs.use(["jquery", "monitor"], function($, monitor){
  $("#btn1").click(function(){
    throw new Error("throw new error message.");
  });
  $("#btn2").click(function(){
    monitor.error(new Error("log new error message."));
  });
  $("#btn3").click(function(){
    monitor.log("test-seed");
  });
  $("#btn4").click(function(){
    monitor.log("test-seed", "test-profile");
  });
});
</script>
