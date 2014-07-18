# Sai.on() events.

---

<style>
button{
  padding: 5px 8px;
  cursor:pointer;
}
</style>

<script type="text/javascript" src="../src/seer-sai.js"></script>
<script type="text/javascript" src="../src/seer-jsniffer.js"></script>


````javascript
(function(){

  seajs.use("sai", function(Sai){

    Sai.on("*", function(meta){
      meta.uid = "user_id";
    });

    Sai.on("jserror", function(meta){
      meta.error_id = "error_id";
    });

  });

})();
````

----


<button type="button" id="btn-ex1">throw new Error()</button>

----

<button type="button" id="btn-log">LOG(不发送 error_id)</button>


----

<script type="text/javascript">

seajs.use(["jquery", "sai"], function($, Sai){
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
  $("#btn-log").click(function(clickEx2){
    Sai.log("seed");
  });
});
</script>
