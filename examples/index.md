# 演示文档

---

<script type="text/javascript" src="../src/seer.js"></script>

```html
<html>
  <head>
    <meta charset="utf-8" />
    <script type="text/javascript" src="monitor-seer.js"></script>
  </head>
</html>
```


````javascript
seajs.use(["jquery", "monitor", "idcard", "bankcard"], function($, monitor){
  /**
   * 随机采样命中算法。
   * @param {Nuber} rate, 采样率，[0,1] 区间的数值。
   * @return {Boolean}
   */
  function hit(rate){
    return 0 === Math.floor(Math.random() / rate);
  };

  if(!hit(0.8)){return;}

  window.monitor.boot();

  $(function(){
    var html = (document.documentElement || document.body).innerHTML;
    var re_cards = /\b\d{11,19}\b/g;
    var m = html.match(re_cards);
    if(m){
      for(var i=0,l=m.length; i<l; i++){
        if(IDCard.verify(m[i])){
          monitor.log("sens", "idcard");
        }else if(BankCard.verify(m[i])){
          monitor.log("sens", "bankcard");
        }else if(MobileNumber.verify(m[i])){
          monitor.log("sens", "mobile");
        }
      }
    }
  })

});
````

<button type="button" id="btn1">throw new Error()</button>
<button type="button" id="btn2">throw new Error()</button>

<script type="text/javascript">
seajs.use(["jquery", "monitor"], function($, monitor){
  $("#btn1").click(function(){
    throw new Error("throw new error message.");
  });
  $("#btn2").click(function(){
    monitor.error(new Error("log new error message."));
  });
});
</script>
