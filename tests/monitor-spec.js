define(function(require) {

  require("../src/seer.js");
  var monitor = require("../src/monitor");
  var expect = require("expect");
  var util = require("./unitutil");

  describe("monitor", function() {

    it("monitor.log()", function() {
      expect(util.equals(monitor.log("test"), {
        profile: "log",
        seed: "test"
      })).to.equal(true);
      expect(util.equals(monitor.log("test", "test"), {
        profile: "test",
        seed: "test"
      })).to.equal(true);
    });
    it("monitor.error()", function() {
      //expect(util.equals(monitor.error(new Error("error message.")), {
        //profile: "jserror",
        //msg: "error message.",
        //file: "",
        //line: 0,
        //num: "",
        //stack: "",
        //lost: ""
      //})).to.equal(true);

      try{
        throw new Error("message");
      }catch(ex){
        //expect(util.equals(monitor.error(ex), {
          //profile: "jserror",
          //msg: "message",
          //file: "",
          //line: 0,
          //num: "",
          //stack: "",
          //lost: ""
        //})).to.equal(true);
      }
    });
  });

});
