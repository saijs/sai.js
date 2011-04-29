/**
 * @overview 检查文档中是否有不安全的内容，用于检查当主文档使用 https 协议
 * 访问安全内容，其中是否嵌套包含了使用 http 或其他非安全协议的内容。
 *
 * 这是个示例，未完成。
 *
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version 1.1, 2011/04/24
 */

(function(){
    var check = function(win){
        var js      = win.document.getElementsByTagName("script"),
            css     = win.document.getElementsByTagName("link"),
            img     = win.document.getElementsByTagName("img"),
            iframe  = win.document.getElementsByTagName("iframe"),
            frame   = win.document.getElementsByTagName("frame"),
            object  = win.document.getElementsByTagName("object"),
            embed   = win.document.getElementsByTagName("embed");
            re=/https:\/\//i;
        for(var i=0,l=js.length; i<l; i++){
            if(js[i].hasAttribute("src")){
                uri=js[i].getAttribute("src");
                //if(!re.test(url)){
                    //if(window.console && window.console.log){window.console.log(ls[i], url);}
                //}
            }
        }
        for(var i=0,l=css.length; i<l; i++){
            type=css[i].getAttribute("type");
            rel=css[i].getAttribute("rel");
            uri=css[i].href;
        }
        for(var i=0,l=img.length; i<l; i++){
            uri=img[i].getAttribute("src");
        }
        for(var i=0,l=iframe.length; i<l; i++){
            uri=iframe[i].getAttribute("src");
            try{
                check(iframe[i].contentWindow);
            }catch(ex){}
        }
        for(var i=0,l=frame.length; i<l; i++){
            uri=frame[i].getAttribute("src");
            try{
                check(frame[i].contentWindow);
            }catch(ex){}
        }
        for(var i=0,l=object.length; i<l; i++){
            uri=object[i].getAttribute("codebase");
            var params=object[i].getElementsByTagName("param");
            for(var i=0,l=params.length; i<l; i++){
                if("movie"==params[i].getAttribute("name")){
                    uri=params[i].getAttribute("value");
                }
            }
        }
        for(var i=0,l=embed.length; i<l; i++){
            uri=embed[i].getAttribute("src");
        }
    };
    check(window);
})();
