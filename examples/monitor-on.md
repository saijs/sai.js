# monitor.on() events.

---

<style>
button{
  padding: 5px 8px;
  cursor:pointer;
}
</style>

<script type="text/javascript" src="../src/seer-monitor.js"></script>
<script type="text/javascript" src="../src/seer-jsniffer.js"></script>


````javascript
(function(){

  seajs.use("monitor", function(monitor){

    monitor.on("*", function(meta){
      meta.uid = "user_id";
    });

    monitor.on("jserror", function(meta){
      meta.error_id = "error_id";
    });

    monitor.boot(); // 启动监控。

  });

})();
````

----


<button type="button" id="btn-ex1">throw new Error()</button>

----

<button type="button" id="btn-log">LOG(不发送 error_id)</button>


----

<script type="text/javascript">

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
  $("#btn-log").click(function(clickEx2){
    monitor.log("seed");
  });
});
</script>
