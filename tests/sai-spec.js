
require("../seer-sai");

var Image = require("imagic");
var Url = require("url");
var expect = require("expect.js");
var Sai;

describe("Sai", function() {

    it("Sai.log(seed)", function(done) {

      require.async("../sai", function(sai){
        Sai = sai;
        Sai.server = "http://log.example.com/sai.gif"

        Image.on("fetch", function(src){
          var url = new Url(src);
          expect(url.getParam("seed")).to.equal("seed");
          expect(url.getParam("profile")).to.equal("log");

          Image.off("fetch");
          done();
        });

        Sai.log("seed");
      });
    });

    it("Sai.log(seed, profile)", function(done) {
      Image.on("fetch", function(src){
        var url = new Url(src);
        expect(url.getParam("seed")).to.equal("seed-0");
        expect(url.getParam("profile")).to.equal("profile-0");

        Image.off("fetch");
        done();
      });

      Sai.log("seed-0", "profile-0");
    });

    it("Sai.log(object)", function(done) {
      Image.on("fetch", function(src){
        var url = new Url(src);
        expect(url.getParam("a")).to.equal("1");
        expect(url.getParam("b")).to.equal("true");
        expect(url.getParam("profile")).to.equal("log");

        Image.off("fetch");
        done();
      });

      Sai.log({a:1, b:true});
    });

    it("Sai.log(object, profile)", function(done) {
      Image.on("fetch", function(src){
        var url = new Url(src);
        expect(url.getParam("a")).to.equal("2");
        expect(url.getParam("b")).to.equal("false");
        expect(url.getParam("profile")).to.equal("profile-1");

        Image.off("fetch");
        done();
      });
      Sai.log({a:2, b:false}, "profile-1");
    });

    after(test_monitor_error)

});


function test_monitor_error(){

  require("../seer-jsniffer");

  describe("Sai: jsniffer", function() {

    it("Sai.error()", function(done) {
      Image.on("fetch", function(src){
        var url = new Url(src);
        expect(url.getParam("msg")).to.equal("error message.");
        expect(url.getParam("profile")).to.equal("jserror");
        expect(url.getParam("file")).not.to.be(null);
        expect(url.getParam("line")).not.to.be(null);
        expect(url.getParam("col")).not.to.be(null);
        expect(url.getParam("num")).not.to.be(null);
        expect(url.getParam("type")).not.to.be(null);
        expect(url.getParam("stack")).not.to.be(null);
        expect(url.getParam("lost")).not.to.be(null);
        expect(url.getParam("lang")).not.to.be(null);
        expect(url.getParam("uv")).to.equal("1");

        Image.off("fetch");

        done();
      })

      Sai.error(new Error("error message."));
    });

    it("Sai.error() repeat i, without uv.", function(done) {
      Image.on("fetch", function(src){
        var url = new Url(src);
        expect(url.getParam("msg")).to.equal("error message.");
        expect(url.getParam("profile")).to.equal("jserror");
        expect(url.getParam("file")).not.to.be(null);
        expect(url.getParam("line")).not.to.be(null);
        expect(url.getParam("col")).not.to.be(null);
        expect(url.getParam("num")).not.to.be(null);
        expect(url.getParam("type")).not.to.be(null);
        expect(url.getParam("stack")).not.to.be(null);
        expect(url.getParam("lost")).not.to.be(null);
        expect(url.getParam("lang")).not.to.be(null);
        expect(url.getParam("uv")).to.be(null);

        Image.off("fetch");

        done();
      });

      // 异常消息必须已抛出过。
      Sai.error(new Error("error message."));
    });

    it("try/catch: Sai.error()", function(done) {
      Image.on("fetch", function(src){
        var url = new Url(src);
        expect(url.getParam("msg")).to.equal("error message ii.");
        expect(url.getParam("profile")).to.equal("jserror");
        expect(url.getParam("file")).not.to.be(null);
        expect(url.getParam("line")).not.to.be(null);
        expect(url.getParam("col")).not.to.be(null);
        expect(url.getParam("num")).not.to.be(null);
        expect(url.getParam("type")).not.to.be(null);
        expect(url.getParam("stack")).not.to.be(null);
        expect(url.getParam("lost")).not.to.be(null);
        expect(url.getParam("lang")).not.to.be(null);
        expect(url.getParam("uv")).to.equal("1");

        Image.off("fetch");

        done();
      });

      try{
        throw new Error("error message ii.");
      }catch(ex){
        Sai.error(ex);
      }
    });

    it("try/catch: Sai.error() repeat ii, without uv.", function(done) {
      Image.on("fetch", function(src){
        var url = new Url(src);
        expect(url.getParam("msg")).to.equal("error message ii.");
        expect(url.getParam("profile")).to.equal("jserror");
        expect(url.getParam("file")).not.to.be(null);
        expect(url.getParam("line")).not.to.be(null);
        expect(url.getParam("col")).not.to.be(null);
        expect(url.getParam("num")).not.to.be(null);
        expect(url.getParam("type")).not.to.be(null);
        expect(url.getParam("stack")).not.to.be(null);
        expect(url.getParam("lost")).not.to.be(null);
        expect(url.getParam("lang")).not.to.be(null);
        // Different error line in phantomjs.
        //expect(url.getParam("uv")).to.be(null);

        Image.off("fetch");

        done();
      });

      try{
        throw new Error("error message ii.");
      }catch(ex){
        Sai.error(ex);
      }
    });


    after(test_monitor_on);

  });
}


function test_monitor_on(){
  describe("Sai.on", function(){

    it("Sai.on('log')", function(done) {

      // NOTE: after for timedSend finished.
      window.setTimeout(function(){

        Image.on("fetch", function(src){
          var url = new Url(src);
          expect(url.getParam("seed")).to.equal("test");
          expect(url.getParam("uid")).to.equal("UID");

          Image.off("fetch");
          done();
        });

        Sai.on("log", function(meta){
          expect("test").to.equal(meta.seed);
          meta.uid = "UID";
        });

        Sai.log("test");

      }, 500);
    });

    it("Sai.on('jserror')", function(done) {
      Image.on("fetch", function(src){
        var url = new Url(src);
        expect(url.getParam("profile")).to.equal("jserror");
        expect(url.getParam("msg")).to.equal("test error message.");
        expect(url.getParam("PID")).to.equal("PAGE_ID");

        Image.off("fetch");
        done();
      });
      Sai.on("jserror", function(meta){
        expect(meta.profile).to.equal("jserror");
        expect("test error message.").to.equal(meta.msg);
        meta.PID = "PAGE_ID";
      });

      try{
        throw new Error("test error message.");
      }catch(ex){
        Sai.error(ex);
      }
    });
  });
}
