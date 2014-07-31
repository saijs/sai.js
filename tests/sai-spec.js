
require("../seer-sai");

var Image = require("imagic");
var expect = require("expect.js");
var util = require("./unitutil");

describe("Sai", function() {

    it("Sai.log(seed)", function(done) {

      require.async("../sai", function(Sai){
        window.Sai = Sai;
        Sai.server = "http://log.example.com/sai.gif"

        expect(util.equals(Sai.log("seed"), {
          profile: "log",
          seed: "seed"
        })).to.equal(true);

        done();
      });
    });

    it("Sai.log(seed, profile)", function(done) {
      expect(util.equals(Sai.log("seed", "profile-0"), {
        profile: "profile-0",
        seed: "seed"
      })).to.equal(true);
      done();
    });

    it("Sai.log(object)", function(done) {
      expect(util.equals(Sai.log({a:1, b:true}), {
        profile: "log",
        a: 1,
        b: true
      })).to.equal(true);
      done();
    });

    it("Sai.log(object, profile)", function() {
      expect(util.equals(Sai.log({a:1, b:true}, "profile-1"), {
        profile: "profile-1",
        a: 1,
        b: true
      })).to.equal(true);
    });

    after(test_monitor_error)

});


  function test_monitor_error(){

    require("../seer-jsniffer");

    describe("Sai: jsniffer", function() {

      it("Sai.error()", function(done) {
        var ex = Sai.error(new Error("error message."));

        expect(ex.msg).to.equal("error message.");
        expect(ex.profile).to.equal("jserror");
        expect(ex.hasOwnProperty("file")).to.equal(true);
        expect(ex.hasOwnProperty("line")).to.equal(true);
        expect(ex.hasOwnProperty("col")).to.equal(true);
        expect(ex.hasOwnProperty("num")).to.equal(true);
        expect(ex.hasOwnProperty("type")).to.equal(true);
        expect(ex.hasOwnProperty("stack")).to.equal(true);
        expect(ex.hasOwnProperty("lost")).to.equal(true);
        expect(ex.hasOwnProperty("lang")).to.equal(true);
        expect(ex.hasOwnProperty("uv")).to.equal(true);
        expect(ex.uv).to.equal(1);
        done();
      });

      it("Sai.error() repeat, without uv.", function(done) {
        // 异常消息必须已抛出过。
        var ex1 = Sai.error(new Error("error message."));

        expect(ex1.msg).to.equal("error message.");
        expect(ex1.profile).to.equal("jserror");
        expect(ex1.hasOwnProperty("file")).to.equal(true);
        expect(ex1.hasOwnProperty("line")).to.equal(true);
        expect(ex1.hasOwnProperty("col")).to.equal(true);
        expect(ex1.hasOwnProperty("num")).to.equal(true);
        expect(ex1.hasOwnProperty("type")).to.equal(true);
        expect(ex1.hasOwnProperty("stack")).to.equal(true);
        expect(ex1.hasOwnProperty("lost")).to.equal(true);
        expect(ex1.hasOwnProperty("lang")).to.equal(true);
        expect(ex1.hasOwnProperty("uv")).to.equal(false);
        done();
      });

      it("try/catch: Sai.error()", function(done) {
        try{
          throw new Error("error message ii.");
        }catch(ex){
          var ex2 = Sai.error(ex);

          expect(ex2.msg).to.equal("error message ii.");
          expect(ex2.profile).to.equal("jserror");
          expect(ex2.hasOwnProperty("file")).to.equal(true);
          expect(ex2.hasOwnProperty("line")).to.equal(true);
          expect(ex2.hasOwnProperty("col")).to.equal(true);
          expect(ex2.hasOwnProperty("num")).to.equal(true);
          expect(ex2.hasOwnProperty("type")).to.equal(true);
          expect(ex2.hasOwnProperty("stack")).to.equal(true);
          expect(ex2.hasOwnProperty("lost")).to.equal(true);
          expect(ex2.hasOwnProperty("lang")).to.equal(true);
          expect(ex2.hasOwnProperty("uv")).to.equal(true);
          expect(ex2.uv).to.equal(1);
        }
        done();
      });

      it("try/catch: Sai.error() repeat, without uv.", function(done) {
        try{
          throw new Error("error message ii.");
        }catch(ex){
          var ex3 = Sai.error(ex);

          expect(ex3.msg).to.equal("error message ii.");
          expect(ex3.profile).to.equal("jserror");
          expect(ex3.hasOwnProperty("file")).to.equal(true);
          expect(ex3.hasOwnProperty("line")).to.equal(true);
          expect(ex3.hasOwnProperty("col")).to.equal(true);
          expect(ex3.hasOwnProperty("num")).to.equal(true);
          expect(ex3.hasOwnProperty("type")).to.equal(true);
          expect(ex3.hasOwnProperty("stack")).to.equal(true);
          expect(ex3.hasOwnProperty("lost")).to.equal(true);
          expect(ex3.hasOwnProperty("lang")).to.equal(true);
          // Different error line in phantomjs.
          //expect(ex3.hasOwnProperty("uv")).to.equal(false);
        }
        done();
      });


      after(test_monitor_on);

    });
  }


  function test_monitor_on(){
    describe("Sai.on", function(){

      it("Sai.on('log')", function(done) {

        // NOTE: after for timedSend finished.
        window.setTimeout(function(){
          Sai.on("log", function(meta){
            expect("test").to.equal(meta.seed);
            done();
          });
          Sai.log("test");
        }, 500);
      });

      it("Sai.on('jserror')", function(done) {
        Sai.on("jserror", function(meta){
          expect(meta.profile).to.equal("jserror");
          expect("test error message.").to.equal(meta.msg);
          done();
        });

        try{
          throw new Error("test error message.");
        }catch(ex){
          Sai.error(ex);
        }
      });
    });
  }
