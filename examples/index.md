# 演示文档

---

<style>
button{
  padding: 5px 8px;
  cursor:pointer;
}
</style>

<script type="text/javascript" src="../seer-sai.js?nowrap"></script>
<script type="text/javascript" src="../seer-jsniffer.js?nowrap"></script>


````javascript
(function(window){

  if (window.Sai) {
    Sai.server = "//log.example.com/sai.gif";
  }

  // 随机采样命中算法。
  // @param {Nuber} rate, 采样率，[0,1] 区间的数值。
  // @return {Boolean}
  function hit(rate){
    return 0 === Math.floor(Math.random() / rate);
  };

  // 命中率：[0,1]: 实际对应采样率：[0%,100%]
  var rate = 1;
  if(!hit(rate)){return;}
  seajs.use("sai", function(Sai){
  });
})(this);
````

----

<script type="text/javascript" onerror="window.Sai && Sai.lost && Sai.lost(this.src)" src="http://example.com/404.js"></script>

<button type="button" id="btn-ex1">throw new Error()</button>
<button type="button" id="btn-ex2">Sai.error(new Error())</button>
<button type="button" id="btn-ex3">try undefined var</button>

----

<button type="button" id="btn3">Sai.log(seed)</button>
<button type="button" id="btn4">Sai.log(seed, profile)</button>
<button type="button" id="btn5">Sai.log(productLine, product, code)</button>
<button type="button" id="btn6">Sai.log(Object)</button>
<button type="button" id="btn7">Sai.log({profile})</button>

<script type="text/javascript">
seajs.on("error", function(module){
  window.Sai && Sai.lost && Sai.lost(module.uri);
});
seajs.use("http://www.example.com/404");

seajs.use(["jquery", "../sai"], function($, Sai){
  $("#btn-ex1").click(function(clickEx1){
    throw new Error("throw new error message.");
  });
  $("#btn-ex2").click(function(clickEx2){
    Sai.error(new Error("log new error message."));
  });
  $("#btn-ex3").click(function(clickEx3){
    function a2(a2,a21,a22){
    try{
      notDefined();
    }catch(ex){
      Sai.error(ex);
    }
    }
    function a1(a1){
        a2(2);
    }
    a1(1);
  });
  $("#btn3").click(function(){
    Sai.log("test-seed");
  });
  $("#btn4").click(function(){
    Sai.log("test-seed", "test-profile");
  });
  $("#btn5").click(function(){
    Sai.log("productLine", "product", "code");
  });
  $("#btn6").click(function(){
    Sai.log({
      "userKey": 0,
      "key2": "2"
    });
  });
  $("#btn7").click(function(){
    Sai.log({
      "userKey": 0,
      "key2": "2",
      "profile": "user-profile"
    });
  });
});
</script>
