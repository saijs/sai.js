define(function(require) {

  require("../src/seer.js");
  var monitor = require("../src/monitor");
  var expect = require("expect");
  var util = require("./unitutil");

  monitor.boot();

  describe("monitor.on", function(){

    function funcError(meta){
      expect(meta.profile).to.equals("jserror");
      expect(meta.msg).to.equals("test error message.");
    }

    monitor.on("log", function(meta){
      it("monitor.on('log')", function() {
        expect("test").to.equal(meta.seed);
      });
    });
    monitor.log("test");

    monitor.on("jserror", function(meta){
      it("monitor.on('jserror')", function() {
        expect(meta.profile).to.equal("jserror");
        expect("test error message.").to.equal(meta.msg);
      });
    });
    try{
      throw new Error("test error message.");
    }catch(ex){
      monitor.error(ex);
    }
  });

});
