define(function(require) {

  require("../src/seer.js");
  var monitor = require('../src/monitor');
  var detector = require("detector");
  var expect = require("expect");
  var util = require("./unitutil");

  var url = location.href;
  var client = detector.device.name+"/"+String(detector.device.version)+"|"+
      detector.os.name+"/"+String(detector.os.version)+"|"+
      detector.browser.name+"/"+String(detector.browser.version)+"|"+
      detector.engine.name+"/"+String(detector.engine.version);

  describe('monitor', function() {

    it('monitor.log()', function() {
      expect(util.equals(monitor.log("test"), {
        profile: "log",
        seed: "test"
      })).to.equal(true);
      expect(util.equals(monitor.log("test", "test"), {
        profile: "test",
        seed: "test"
      })).to.equal(true);
    });
    it('monitor.error()', function() {
      expect(util.equals(monitor.error(new Error("error message.")), {
        profile: "jserror",
        msg: "error message.",
        file: "",
        line: 0
      })).to.equal(true);
      try{
        throw new Error("message");
      }catch(ex){
        expect(util.equals(monitor.error(ex), {
          profile: "jserror",
          msg: "message",
          file: "",
          line: 0
        })).to.equal(true);
      }
    });
  });

});
