// Quality Monitoring System.

window.DOMLint = (function(){
    // DOM
    var D = {
        hasAttr: function(elem, attr){
            if(elem.hasAttribute){
                return elem.hasAttribute(attr);
            }
            return null!=elem.getAttribute(attr);
        },
        outerHTML:function(node){
            return node.outerHTML || (function(n){
                var parent = n.parentNode;
                var el = document.createElement(parent.tagName);
                el.appendChild(n.cloneNode(true));
                var shtml = el.innerHTML;
                return shtml;
            })(node);
            //return node.outerHTML || new XMLSerializer().serializeToString(node);
        },
        wrapHTML: function(node){
            return D.outerHTML(node).replace(/^(<\w+[^>]*>).*/, '$1...');
        }
    };
    var htmlErrors = [];
    function log(type, msg, err){
        htmlErrors.push({ln:0, err:err, code:msg});
        //var msg=Array.prototype.join.call(arguments);
        //if(window.console && window.console.log){window.console.log(msg);}
        //else{throw new Error(msg);}
    }
    // String.
    var S = {
        byteLength: function(str){
            return str.replace(/[^\x00-\xff]/g, "xx").length;
        }
    };
    // URI, URL, Links, Location...
    var URI = {
        // 获得Archor对象，便于获取其protocol,host...属性。
        // 可惜IE直接复制相对地址无法获得正确的属性，需要设置绝对地址。
        // @param {String"} uri 绝对/相对地址。
        // @usage URI.parse(img.src); //! img.getAttribute("src");
        //        URI.parse(cssLink.href);
        //        URI.parse(script.src);
        reFolderExt:/[^\/]*$/,
        reProtocol:/^\w+:/,
        parse: function(uri){
            if(undefined === uri || typeof(uri)!="string"){
                throw new TypeError("required string argument.");
            }
            var host = location.protocol + "\/\/" + location.hostname,
                base = host + location.pathname.replace(URI.reFolderExt, uri);
            var a = document.createElement("a");
            if(!URI.reProtocol.test(uri)){
                if(uri.indexOf("/")==0){
                    uri = location.protocol + "\/\/" + location.hostname + uri;
                    //uri = host + uri;
                }else{
                    uri = location.protocol + "\/\/" + location.hostname +
                        location.pathname.replace(URI.reProtocol, uri);
                }
            }
            a.setAttribute("href", uri);
            return a;
        }
    };
    var errorCodes = {
        charsetIllegal: 1,
        protocolIllegal: 2,
        attrIllegal: 3,
        relIllegal: 4,
        tagsNestedIllegal: 5,
        inlineJS: 6,
        inlineCSS: 7,
        linksHrefIllegal: 8
    };
    var res={
        img:[],
        css:[],
        js:[],
        fla:[]
    };
    var rules = [
        // checkHead, 检测头部信息
        function(){
            if("BackCompat" == document.compatMode){
                log("html", document.doctype, errorCodes.doctypeIllegal);
            }
            // 在DOMReady时，任何浏览器都会有且仅有一个html,head,body标签，不多不少。
            // 对于IE，浏览器无论如何都会设置一个title，并将title放置是head的第一位。
            // 所以针对IE的charset检测是不准确的。
            var hd = document.getElementsByTagName("head")[0];
            var charsetIllegal=true;
            var cs = hd.getElementsByTagName("*");
            if(navigator.userAgent.indexOf("MSIE")<0){
                if(cs.length){
                    c=cs[0];
                    if("meta" == c.tagName.toLowerCase()){
                        var re_content_type = /^content-type$/i
                        if(D.hasAttr(c, "charset")){
                            charsetIllegal = false;
                        }else if(D.hasAttr(c, "http-equiv") &&
                            c.getAttribute("http-equiv").test(re_content_type) &&
                            c.getAttribute("content").indexOf("charset")>=0){
                                charsetIllegal = false;
                        }
                    }
                }
                if(charsetIllegal){
                    log("html", "文档头部需先设置编码");
                }
            }
            // 检测文档中的title设置。
            var tt = document.getElementsByTagName("title");
            var reEmpty=/^(?:\s|\r|\n)*$/;
            // 针对非IE有效。
            if(1 != tt.length){
                log("html", "文档未设置，或设置了多个title");
            }
            if(reEmpty.test(tt[0].innerHTML)){
                log("html", "文档title未设置名称");
            }
        },
        // checkStyle@import, 检测页内样式中是否有使用 @import
        function(){
            var styles = document.getElementsByTagName("style");
            // @see http://www.yesky.com/imagesnew/software/css/css2/a_import.html
            var re = /@import\s+[^;]+;/g;
            for(var i=0,mat,tag,l=styles.length; i<l; i++){
                tag = styles[i].parentNode.tagName.toLowerCase();
                if(tag != "head"){
                    log("html", tag+">style", errorCodes.tagsNestedIllegal);
                }
                mat = styles[i].innerHTML.match(re);
                if(mat){
                    log("css", mat.join(""), errorCodes.styleWithImport);
                }
            }
        },
        // checkRepeatID, 检查整个文档中是否有重复出现同名ID
        function(doc){
            var doc = doc || document;
            var elems = doc.getElementsByTagName("*");
            var repeatIDs=[], cache={};
            for(var i=0,id,l=elems.length; i<l; i++){
                if(D.hasAttr(elems[i], "id")){
                    id = elems[i].getAttribute("id");
                    if(cache.hasOwnProperty("ID_"+id)){
                        repeatIDs.push(id);
                        continue;
                    }
                    cache["ID_"+id] = true;
                }
            }
            if(repeatIDs.length){
                log("html", repeatIDs.join(","), errorCodes.idRepeated);
            }
        },
        // checkResources, 检测文档中的资源引用情况
        function(){
            var re=/https:\/\//i,
                re_css_rel=/^stylesheet$/i,
                re_css=/\.css$/i,
                re_empty=/^\s*$/,
                re_number=/^\d+$/;
            var checkProtocol = "https:" == location.protocol;
            var check = function(win){
                var script  = win.document.getElementsByTagName("script"),
                    link    = win.document.getElementsByTagName("link"),
                    img     = win.document.getElementsByTagName("img"),
                    iframe  = win.document.getElementsByTagName("iframe"),
                    frame   = win.document.getElementsByTagName("frame"),
                    object  = win.document.getElementsByTagName("object"),
                    embed   = win.document.getElementsByTagName("embed");
                for(var i=0,l=script.length; i<l; i++){
                    if(!D.hasAttr(script[i], "src")){continue;}
                }
                for(var i=0,uri,tag,l=script.length; i<l; i++){
                    tag = script[i].parentNode.tagName.toLowerCase();
                    if("body" != tag){
                        log("html", tag+">script", errorCodes.tagsNestedIllegal);
                    }
                    if(!D.hasAttr(script[i], "src")){continue;}
                    if(!D.hasAttr(script[i], "charset")){
                        log("html", D.wrapHTML(script[i]), errorCodes.charsetIllegal);
                    }
                    uri = URI.parse(script[i].getAttribute("src"));
                    if(checkProtocol && "https:" != uri.protocol){
                        log("html", D.wrapHTML(script[i]), errorCodes.protocolIllegal);
                    }
                    res.js.push(script[i].getAttribute("src"));
                }
                for(var i=0,tag,l=link.length; i<l; i++){
                    type = link[i].getAttribute("type");
                    rel = link[i].getAttribute("rel");
                    uri = URI.parse(link[i].getAttribute("href"));
                    tag = link[i].parentNode.tagName.toLowerCase();
                    if("head" != tag){
                        log("html", tag+">link", errorCodes.tagsNestedIllegal);
                    }
                    // All links need rel attr.
                    if(!D.hasAttr(link[i], "rel")){
                        log("html", D.outerHTML(link[i]), errorCodes.relIllegal);
                        continue;
                    }
                    // favicon, stylesheet, ...
                    if(checkProtocol && "https:" != uri.protocol){
                        log("html", D.outerHTML(link[i]), errorCodes.protocolIllegal);
                    }
                    // link[rel=stylesheet]
                    if("stylesheet" != link[i].getAttribute("rel")){continue;}
                    //if("text/css" != type){
                        //log("html", "外部CSS没有设置type属性。");
                    //}
                    if(!D.hasAttr(link[i], "charset")){
                        log("html", D.outerHTML(link[i]), errorCodes.charsetIllegal);
                    }
                    res.css.push(link[i].getAttribute("href"));
                }
                for(var i=0,l=img.length; i<l; i++){
                    var attrs = [];
                    uri=URI.parse(img[i].src);
                    if(checkProtocol && "https:" != uri.protocol){
                        log("html", D.outerHTML(img[i]), errorCodes.protocolIllegal);
                    }
                    if(!D.hasAttr(img[i], "alt") || re_empty.test(img[i].getAttribute("alt"))){
                        attrs.push("alt");
                    }
                    if(!D.hasAttr(img[i], "width") || !re_number.test(img[i].getAttribute("width"))){
                        attrs.push("width");
                    }
                    if(!D.hasAttr(img[i], "height") || !re_number.test(img[i].getAttribute("height"))){
                        attrs.push("height");
                    }
                    log("html", "图片缺少"+attrs.join()+"属性。"+D.outerHTML(img[i]), errorCodes.attrIllegal);
                    res.img.push(img[i].getAttribute("src"));
                }
                //!var frames  = Array.prototype.concat.call(iframe, frame);
                //!var frames  = Array.prototype.push.apply(iframe, frame);
                var frames = [];
                for(var i=0,l=iframe.length; i<l; i++){frames.push(iframe[i]);}
                for(var i=0,l=frame.length; i<l; i++){frames.push(frame[i]);}
                for(var i=0,l=frames.length; i<l; i++){
                    uri=URI.parse(frames[i].getAttribute("src"));
                    if(checkProtocol && "https:" != uri.protocol){
                        log("html", D.outerHTML(frames[i]), errorCodes.protocolIllegal);
                    }
                    try{
                        // TRY: 避免跨域异常。
                        //
                        // 对于每个内部页面都有引入检测脚本的情况下，
                        // 递归进嵌套的页面是没有必要的。
                        // 但作为测试，没有在每个内嵌页面引入检测脚本。
                        // 可以先判断内嵌页面中是否有存在DOMLint对象，有则不递归。
                        if(frames[i].contentWindow.DOMLint){continue;}
                        check(frames[i].contentWindow);
                    }catch(ex){}
                }
                for(var i=0,l=object.length; i<l; i++){
                    if(D.hasAttr(object[i], "codebase")){
                        uri = URI.parse(object[i].getAttribute("codebase"));
                        if(checkProtocol && "https:"!=uri.protocol){
                            log("html", '<object codebase="'+object[i].getAttribute("codebase")+'"', errorCodes.protocolIllegal);
                        }
                    }
                    var params=object[i].getElementsByTagName("param");
                    for(var j=0,m=params.length; j<m; j++){
                        if("movie"==params[j].getAttribute("name") ||
                          "src"==params[j].getAttribute("src")){
                            uri=URI.parse(params[j].getAttribute("value"));
                            if(checkProtocol && "https:" != uri.protocol){
                                log("html", D.outerHTML(params[j]), errorCodes.protocolIllegal);
                            }
                            res.fla.push(params[j].getAttribute("value"));
                            break;
                        }
                    }
                }
                for(var i=0,l=embed.length; i<l; i++){
                    if(!D.hasAttr(embed[i], "src")){continue;}
                    uri=URI.parse(embed[i].getAttribute("src"));
                    if(checkProtocol && "https:"!=uri.protocol){
                        log("html", D.outerHTML(embed[i]), errorCodes.protocolIllegal);
                    }
                    res.fla.push(embed[i].getAttribute("src"));
                }
            };
            check(window);
        },
        // checkForms, 检测文档中的表单元素是否符合规范
        function(){
            //var fs = document.forms;
            var fs = document.getElementsByTagName("form");
            var fs_elems_ids = {};
            for(var i=0,fn,l=fs.length; i<l; i++){
                var elems = fs[i].elements;
                if(D.hasAttr(fs[i], "id")){
                    fn = "#"+fs[i].getAttribute("id");
                }else if(D.hasAttr(fs[i], "name")){
                    fn = "form[name="+fs[i].getAttribute("id")+"]";
                }else{
                    fn = "document.forms["+i+"]";
                }
                for(var j=0,id,name,submitCount=0,html,m=elems.length; j<m; j++){
                    if("fieldset"==elems[j].tagName.toLowerCase()){continue;}
                    html = fn+": "+D.outerHTML(elems[j]);
                    // cache elements ids for label test.
                    if(D.hasAttr(elems[j], "id")){
                        id = elems[j].getAttribute("id");
                        if("id"==id || "submit"==id){
                            log("html", "id不合法。"+html, errorCodes.formElementNameIllegal);
                        }
                        fs_elems_ids["ID_"+id] = true;
                    }
                    if(elems[j].type=="submit"){
                        if(++submitCount == 1){continue;}
                    }
                    if(!D.hasAttr(elems[j], "name")){
                        log("html", "缺少name属性。"+html, errorCodes.formElementWithoutName);
                    }
                    name = elems[j].getAttribute("name");
                    if("submit"==name || "id"==name){
                        log("html", "name不合法。"+html, errorCodes.formElementNameIllegal);
                    }
                    // XXX: 表单不允许有多个 submit?
                }
            }
            // 检测文档中的label标签是否有添加for属性
            var labs = document.getElementsByTagName("label");
            for(var i=0,id,html,l=labs.length; i<l; i++){
                html = D.outerHTML(labs[i]);
                if(!D.hasAttr(labs[i], "for")){
                    log("html", "缺少for属性。"+html, errorCodes.labelWithoutForAttr);
                    continue;
                }
                id = labs[i].getAttribute("for");
                if(!id){
                    log("html", "for缺少属性值。"+html, errorCodes.labelWithoutForName);
                    continue;
                }
                if(!fs_elems_ids["ID_"+id]){
                    log("html", "for指向的id不存在。"+html, errorCodes.labelForNameNotExist);
                    continue;
                }
            }
        },
        // checkTagsNested, 检测标签嵌套情况
        function(){
            function makeMap(str){
                var obj = {}, items = str.split(",");
                for ( var i = 0; i < items.length; i++ )
                    obj[ items[i] ] = true;
                return obj;
            }
            var inlinejs = "onclick,onblur,onchange,oncontextmenu,ondblclick,onfocus,onkeydown,onkeypress,onkeyup,onmousedown,onmousemove,onmouseout,onmouseover,onmouseup,onresize,onscroll,onload,onunload,onselect,onsubmit,onbeforecopy,onbeforecut,onbeforepaste,onbeforeprint,onbeforeunload".split(",");

            // Block Elements - HTML 4.01
            var block = makeMap("address,applet,blockquote,button,center,dd,del,dir,div,dl,dt,fieldset,form,frameset,hr,iframe,ins,isindex,li,map,menu,noframes,noscript,object,ol,p,pre,script,table,tbody,td,tfoot,th,thead,tr,ul");

            // Inline Elements - HTML 4.01
            var inline = makeMap("a,abbr,acronym,applet,b,basefont,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var");

            var elems = document.getElementsByTagName("*");
            for(var i=0,l=elems.length; i<l; i++){
                if(block[elems[i]] && inline[elems[i].parentNode.tagName]){
                    log("html", elems[i].parentNode.tagName+">"+elems[i].tagName+": "+D.wrapHTML(elems[i]), errorCodes.tagsNestedIllegal)
                }
                for(var j=0,m=inlinejs.length; j<m; j++){
                    if(D.hasAttr(elems[i], inlinejs[j])){
                        log("html", D.wrapHTML(elems[i]), errorCodes.inlineJS);
                    }
                }
                if(D.hasAttr(elems[i], "style")){
                    log("html", D.wrapHTML(elems[i]), errorCodes.inlineCSS);
                }
            }
            // We can't check tag p in p on the DOM.
            // document.getElementsByTagName("p")[i].getElementsByTagName("p").length;
            // ul>li, ol>li
            var li = document.getElementsByTagName("li");
            for(var i=0,tag,l=li.length; i<l; i++){
                tag = li[i].parentNode.tagName.toLowerCase();
                if("ul"!=tag || "ol"!=tag){
                    log("html", tag+">"+D.wrapHTML(li[i]), errorCodes.tagsNestedIllegal);
                }
            }
            // dl>dt
            var dt = document.getElementsByTagName("dt");
            for(var i=0,tag,l=dt.length; i<l; i++){
                if("dl" != dt[i].parentNode.tagName.toLowerCase()){
                    log("html", D.wrapHTML(dt[i]), errorCodes.tagsNestedIllegal);
                }
            }
            // dl>dd
            var dd = document.getElementsByTagName("dd");
            for(var i=0,tag,l=dd.length; i<l; i++){
                if("dl" != dd[i].parentNode.tagName.toLowerCase()){
                    log("html", D.wrapHTML(dd[i]), errorCodes.tagsNestedIllegal);
                }
            }
            // tr>td
            var td = document.getElementsByTagName("td");
            for(var i=0,tag,l=td.length; i<l; i++){
                if("tr" != td[i].parentNode.tagName.toLowerCase()){
                    log("html", D.wrapHTML(td[i]), errorCodes.tagsNestedIllegal);
                }
            }
        },
        // checkLinksUsage, 检测页面链接可用性，硬编码等
        function(){
            var links = document.getElementsByTagName("a");
            for(var i=0,href,l=links.length; i<l; i++){
                if(!D.hasAttr(links[i], "href")){continue;}
                href = links[i].getAttribute("href");
                if(href.indexOf("#")==0){continue;}
                if(/javascript:void(0);?/.test(href)){continue;}
                if(links[i].hostname.indexOf("alipay.net")>=0 ||
                    links[i].hostname.indexOf("localhost")==0 ||
                    0==href.indexOf("$")){ // href="$xxServer.getURI('...')"
                    log("html", href, errorCodes.linksHrefIllegal);
                }
                // XXX: 站内地址检测是否有效(404)，仅限于SIT环境。
            }
        }
    ];
    function parse(doc){
        for(var i=0,l=rules.length; i<l; i++){
            rules[i].call(this);
        }

        return {
            res: {
                css: res.css,
                js : res.js,
                img: res.img,
                fla: res.fla
            },
            htmlSize: S.byteLength(D.outerHTML(document.documentElement)),
            htmlErr: htmlErrors
        }
    }

    return {
        parse: parse
    };
})();
