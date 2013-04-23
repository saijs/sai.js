// Quality Monitoring System.
// DOMLint
//
//chrome://
//chrome-extension://
//data:text/css,
//file://///
//http://
//https://
//javascript:''
//javascript:""
//javascript:

!window.monitor || (function(){
    var M = window.monitor,
        URI = M.URI,
        // @see http://doc.alipay.net/pages/viewpage.action?pageId=24783626
        errorCodes = {
            syntaxError: 0,

            tagsIllegal: 1, // 标签未结束等语法错误。。。
                tagUnclosed: 100, // 标签未闭合，例如自闭合，或者非法闭合的标签。
                tagsDeprecated: 101, // 过时的标签。
                tagNameUpperCase: 102,
                tagsNestedIllegal: 103, // 标签嵌套不合法。
                titleIllegal: 104, // 文档标题不合法。

            attrIllegal: 2, // 属性不合法。
                protocolIllegal: 200, // HTTPS 资源中包含不安全资源。
                inlineJS: 201, // 内联 JavaScript 脚本。
                inlineCSS: 202, // 内联 CSS 脚本。
                attrCharsetIllegal: 203, // 编码未设置，或编码设置不合法。
                attrNameIllegal: 204, // 属性名不合法（大写）
                attrValueIllegal: 205, // 属性值不合法（为空...）
                attrNameDuplicated: 206, // 多个同名属性。
                idDuplicated: 207, // 存在重复 ID。
                attrMissQuote: 208, // 属性值缺少引号。
                relIllegal: 209, // 缺少 rel 属性，或 rel 属性不合法
                altIllegal: 210, // IMG 元素缺少 rel 属性。
                typeIllegal: 211, // input,button 元素缺少 type 属性。
                nameIllegal: 212, // input[type!=submit|button|image], textarea, select 缺少 name 属性。
                labelForIllegal: 213, // label 标签的 for 属性不合法。
                hrefIllegal: 214, // 链接缺少 href 属性，或 href 指向不合法。
                flashOpacity: 215, // Flash 的不透明设置。

            documentIllegal: 3,
                doctypeIllegal: 300, // 缺少DOCTYPE，或DOCTYPE不合法。
                documentCharsetIllegal: 301, // 编码未设置，或编码设置不合法。
                resDuplicated: 302, // 重复的资源引用。
                cssByImport: 303,
                commentIllegal: 304
        },
        checkProtocol = M.checkProtocol,
        htmlErrors = [],
        res={
            img:[],
            css:[],
            js:[],
            fla:[]
        },
        res_cache = {
            img: {},
            css: {},
            js:  {},
            fla: {}
        };

    var inlinejs = ("onclick,onblur,onchange,oncontextmenu,ondblclick,onfocus,"+
        "onkeydown,onkeypress,onkeyup,onmousedown,onmousemove,onmouseout,"+
        "onmouseover,onmouseup,onresize,onscroll,onload,onunload,onselect,"+
        "onsubmit,onbeforecopy,oncopy,onbeforecut,oncut,onbeforepaste,onpaste,"+
        "onbeforeprint,onpaint,onbeforeunload").split(",");

    // Block Elements - HTML 4.01
    var block = makeMap("ADDRESS,APPLET,BLOCKQUOTE,BUTTON,CENTER,DD,DEL,DIR,"+
        "DIV,DL,DT,FIELDSET,FORM,FRAMESET,HR,IFRAME,INS,ISINDEX,LI,MAP,MENU,"+
        "NOFRAMES,NOSCRIPT,OBJECT,OL,P,PRE,SCRIPT,TABLE,TBODY,TD,TFOOT,TH,THEAD,TR,UL");

    // Inline Elements - HTML 4.01
    var inline = makeMap("A,ABBR,ACRONYM,APPLET,B,BASEFONT,BDO,BIG,BR,BUTTON,"+
        "CITE,CODE,DEL,DFN,EM,FONT,I,IFRAME,IMG,INPUT,INS,KBD,LABEL,MAP,OBJECT,"+
        "Q,S,SAMP,SCRIPT,SELECT,SMALL,SPAN,STRIKE,STRONG,SUB,SUP,TEXTAREA,TT,U,VAR");

    // DOM
    var D = {
        hasAttr: function(elem, attr){
            if(!elem || 1!=elem.nodeType){return false;}
            if(elem.hasAttribute){return elem.hasAttribute(attr);}
            // for IE, not perfect.
            // @see http://www.patmullin.com/weblog/2006/04/06/getattributestyle-setattributestyle-ie-dont-mix/
            if("style" == attr){return "" !== elem.style.cssText;}
            var val = elem.getAttribute(attr);
            if(null == val){return false;}
            else if("function" == typeof(val)){
                // for IE:
                // <div onclick="alert(0);">.getAttribute("onclick")
                // <==>
                // function onclick()
                // {
                // alert(0);
                // }
                return val.toString().indexOf("function "+attr+"()") == 0;
            }else{return true;}
        },
        outerHTML:function(node){
            return node.outerHTML || (function(n){
                var parent = n.parentNode,
                    el = document.createElement(parent.tagName);
                el.appendChild(n.cloneNode(true));
                return el.innerHTML;
            })(node);
            //return node.outerHTML || new XMLSerializer().serializeToString(node);
        },
        wrapHTML: function(node){
            var html = D.outerHTML(node),
                idx = html.indexOf(">");
            return idx<0 ? html : html.substr(0, idx+1);
            //return D.outerHTML(node).replace(/^(<[^>]+>)(?:.|\s)*/, '$1');
        },
        firstChild: function(node){
            if(node.nodeType != 1){return null;}
            for(var i=0,l=node.childNodes.length; i<l; i++){
                if(node.childNodes[i].nodeType == 1){
                    return node.childNodes[i];
                }
            }
        }
    };
    /**
     * @param {Integer} line, line number for html error.
     * @param {String} source, html error source code.
     * @param {String} msg, html error description.
     * @param {Enum} mcode, min error code.
     */
    function log(line, source, msg, code){
        htmlErrors.push({ln:line, err:code, code:source});
        if(M.debug && window.console && console.log){
            window.console.log("DOMLint: line:"+line+", "+"code: "+code+
                ", message:"+msg+", source:"+source+"");
        }
    }

    var counter = {
            doctypes: 0,
            heads: 0,
            titles: 0,
            scripts: 0,
            cssLinks: 0,
            styles: 0,
            objects: 0,
            params: 0,
            embeds: 0,
            nodes: 0
        },
        re_protocol = /^([a-zA-Z][a-zA-Z0-9_-]*:)/;
        //XXX: re_empty_uri.
        re_empty_uri =  /^javascript:(['"])\1;?$/,
        //re_empty_uri =  /^(['"])\1;?$/,
        re_css_rel =    /^stylesheet$/i,
        re_css =        /\.css$/i,
        re_empty =      /^\s*$/,
        re_number =     /^\d+$/,
        re_css_bg_img = /^url\((["'])?(.*)\1\)$/i,
        css_bg_img_cache = {};
    // XXX: URI.method()
    function getProtocol(uri){
        var m = uri.match(re_protocol);
        if(null!=m && 2==m.length){return m[1];}
        return M._loc.protocol;
    }
    // validate <iframe>, <frame>.
    function validateFrames(node){
        if(!checkProtocol){return;}
        var src = node.getAttribute("src"),
            html = D.wrapHTML(node);
        if(!src || re_empty.test(src)){
            log(0, html, "protocol illegal.", errorCodes.protocolIllegal);
            return;
        }
        var uri = getProtocol(src);
        switch(getProtocol(src)){
        case "javascript:":
            if(re_empty_uri.test(src)){break;}
        case "http:":
        case "file:":
        case "about:":
            log(0, html, "protocol illegal.", errorCodes.protocolIllegal);
            break;
        //case "https:":
        //case "data:":
        //case "chrome:":
        //case "chrome-plugin:":
        //case "chrome-extension:":
        //case "mailto:"
        //case "ftp:"
        //case "ftps:"
        //...
        default:
            break;
        }
        // TODO: check when sub-frames without DOMLint.
        // if(node.contentWindow.monitor){return;}
        // http:
        // +- https:
        //    +- http:
        //       +- https:
        // XXX: diff protocol, diff domain.
    }
    function getFormName(elem){
        if(!elem || !elem.form){return ""}
        var f = elem.form;
        if(elem.form.id){return "form#"+f.id;}
        else if(elem.form.name){return "form[name="+f.name+"]";}
        else{
            for(var i=0,l=document.forms.length; i<l; i++){
                if(document.forms[i] == f){
                    return "document.forms["+i+"]";
                }
            }
        }
        return "unknow-form";
    }
    // validate <input>, <button>, <select>, <textarea>.
    function validateFormElements(node){
        var fn = getFormName(node),
            html = fn + " " + D.wrapHTML(node);
        //if("noform"==fn){
            //if(M.debug && window.console && window.console.log){
                //window.console.log(html);
            //}
        //}
        if(D.hasAttr(node, "id")){
            var id = node.getAttribute("id");
            if("id"==id || "submit"==id){
                log(0, html, "id不合法。", errorCodes.attrValueIllegal);
            }
        }
        if(!D.hasAttr(node, "name")){
            var type;
            if(D.hasAttr(node, "type")){
                type = node.getAttribute("type").toUpperCase();
            }else if("BUTTON" == node.tagName){
                type = "BUTTON";
            }
            if("BUTTON"!=type && "SUBMIT"!=type && "IMAGE"!=type){
                log(0, html, "missing attr:[name]", errorCodes.nameIllegal);
            }
            return;
        }
        var name = node.getAttribute("name");
        if("submit"==name){ // || "id"==name
            log(0, html, "[name] attr illegal", errorCodes.nameIllegal);
        }
    }
    // validate <input>, <button>.
    function validateButtons(node){
        var html = getFormName(node)+": "+D.wrapHTML(node);

        if(!D.hasAttr(node, "type")){
            log(0, html, "missing attr:[type]", errorCodes.typeIllegal);
        }
        validateFormElements(node);
    }

    var duplicateIDs=[], duplicateIDsCache={};
    var preProcessing2 = function(doc){
        var nodes = doc.getElementsByTagName("*");
        for(var i=0,id,key,node,l=nodes.length; i<l,node=nodes[i]; i++){
            if(node.nodeType != 1){break;}
            if(!D.hasAttr(node, "id")){break;}
            id = node.getAttribute("id");
            if(re_empty.test(id)){
                log(0, D.wrapHTML(node),
                    node.tagName+"[id=]", errorCodes.attrNameIllegal);
                break;
            }
            key = "ID_"+id;
            if(duplicateIDsCache.hasOwnProperty(key)){
                if(1 == duplicateIDsCache[key]){
                    duplicateIDs.push(id);
                }
                duplicateIDsCache[key]++;
            }else{
                duplicateIDsCache[key] = 1;
            }
        }
        counter.nodes = nodes.length;
    };
    var rules_tags_enter = {
        "*": function(node){
            if(1 != node.nodeType){return;}
            var html = D.wrapHTML(node);
            for(var j=0,m=inlinejs.length; j<m; j++){
                if(D.hasAttr(node, inlinejs[j])){
                    log(0, html, "inline js.", errorCodes.inlineJS);
                    break;
                }
            }
            //if(D.hasAttr(node, "style")){
            //    log(0, html, "inline css.", errorCodes.inlineCSS);
            //}
            // inline > block
            var tag = node.tagName,
                ptag = node.parentNode.tagName;
            // css background-image.
            var bg = getStyle(node, "background-image");
            if(!!bg && "none"!=bg){
                bg = bg.replace(re_css_bg_img, "$2");
                if(M.URI.isExternalRes(bg) && !css_bg_img_cache.hasOwnProperty(bg)){
                    res.img.push(bg);
                    css_bg_img_cache[bg] = true;
                }
            }
        },
        "!DOCTYPE": function(node){
            counter.doctypes++;
        },
        //"!--": function(node){
            //var reSpaceLeft = /^\s+/, reSpaceRight = /\s+$/;
            //if(!reSpaceLeft.test(node.innerHTML) ||
                // !reSpaceRight.test(node.innerHTML)){
                //var cmt = node.innerHTML;
                //log(0,
                    //node.startTag+(cmt.length<20?cmt:cmt.substr(0,20)+"...")+
                    //node.endTag, "comment required space at start and end.",
                    //errorCodes.commentIllegal);
            //}
        //},
        "HEAD": function(node){
            counter.heads++;
            // check the document.charset
            // 在DOMReady时，任何浏览器都会有且仅有一个html,head,body标签，不多不少。
            // 对于IE，浏览器无论如何都会设置一个title，并将title放置是head的第一位。
            // 所以针对IE的charset检测是不准确的。
            // document.charset
            if(M.client.browser.name == "ie"){return;}
            var meta = D.firstChild(node),
                illegal = true;
            if(meta && "META"==meta.tagName){
                if(D.hasAttr(meta, "charset")){
                    illegal = false;
                }else if(D.hasAttr(meta, "http-equiv") &&
                    meta.getAttribute("http-equiv").toLowerCase()=="content-type" &&
                    D.hasAttr(meta, "content") &&
                    meta.getAttribute("content").indexOf("charset")>=0){
                        illegal = false;
                }
            }
            if(illegal){
                log(0, "document charset illegal.",
                    "document charset illegal.", errorCodes.documentCharsetIllegal);
            }
        },
        "TITLE": function(node){
            counter.titles++;
            if(re_empty.test(node.innerHTML)){
                log(0, D.outerHTML(node), "title is empty.",
                    errorCodes.titleIllegal);
            }
        },
        "INPUT":  validateButtons,
        "BUTTON": validateButtons,
        "SELECT":   validateFormElements,
        "TEXTAREA": validateFormElements,
        "LABEL": function(node){
            var html = D.wrapHTML(node);
            if(!D.hasAttr(node, "for")){
                log(0, html, "missing attr:[for]", errorCodes.labelForIllegal);
                return;
            }
            var id = node.getAttribute("for");
            if(re_empty.test(id)){
                log(0, html, "attr [for] missing value.", errorCodes.labelForIllegal);
                return;
            }
            if(!duplicateIDsCache.hasOwnProperty("ID_"+id)){
                log(0, html, "#"+id+" not exist.", errorCodes.labelForIllegal);
                return;
            }
        },
        "SCRIPT": function(node){
            var html = D.wrapHTML(node);
            // validate [type] attribute.
            //if(!D.hasAttr(node, "type")){
                //log(0, html, "missing attr [type].", errorCodes.typeIllegal);
            //}
            if(!D.hasAttr(node, "src")){return;}
            var src = node.getAttribute("src");

            if(!D.hasAttr(node, "charset")){
                log(0, html, "missing charset.", errorCodes.attrCharsetIllegal);
            }
            // protocol.
            if(!src || re_empty.test(src)){
                log(0, html, "protocol illegal.", errorCodes.protocolIllegal);
                return;
            }
            switch(getProtocol(src)){
            case "http:":
            case "file:":
                if(checkProtocol){
                log(0, html, "protocol illegal.", errorCodes.protocolIllegal);
                }
                break;
            case "https:":
                break;
            //case "javascript:":
            //case "about:":
            //case "data:":
            //case "chrome:":
            //case "chrome-plugin:":
            //case "chrome-extension:":
            //case "mailto:"
            //case "ftp:"
            //case "ftps:"
            //...
            default:
                return;
            }
            // resources.
            uri = URI.path(URI.abs(src));
            res.js.push(uri);
            if(res_cache.js.hasOwnProperty(uri)){
                res_cache.js[uri]++;
            }else{
                res_cache.js[uri] = 1;
            }
        },
        "LINK": function(node){
            var type = node.getAttribute("type"),
                rel = node.getAttribute("rel"),
                href = node.getAttribute("href"),
                html = D.wrapHTML(node);
            // link 标签的嵌套。
            //var tag = node.parentNode.tagName;
            //if("HEAD" != tag){
                //log(0, tag+">"+html,
                    //"tags nested error.", errorCodes.tagsNestedIllegal);
            //}
            // All links need rel attr.
            if(!D.hasAttr(node, "rel")){
                log(0, html, "missing [rel]", errorCodes.relIllegal);
                return;
            }
            // link[rel=stylesheet]
            if("stylesheet" != node.getAttribute("rel")){return;}
            //if("text/css" != type){
                //log(0, html, "link[rel=stylesheet] missing [type].",
                    //errorCodes.typeIllegal);
            //}
            // protocol.
            if(!href || re_empty.test(href)){
                log(0, html, "protocol illegal.", errorCodes.protocolIllegal);
                return;
            }
            switch(getProtocol(href)){
            case "http:":
            case "file:":
                if(!checkProtocol){break;}
                log(0, html, "protocol illegal.", errorCodes.protocolIllegal);
                break;
            case "https:":
                break;
            //case "javascript:":
            //case "about:":
            //case "data:":
            //case "chrome:":
            //case "chrome-plugin:":
            //case "chrome-extension:":
            //case "mailto:"
            //case "ftp:"
            //case "ftps:"
            //...
            default:
                return;
            }
            if(!D.hasAttr(node, "charset")){
                log(0, html, "missing charset.", errorCodes.attrCharsetIllegal);
            }
            // resources.
            href = URI.path(URI.abs(href));
            res.css.push(href);
            if(res_cache.css.hasOwnProperty(href)){
                res_cache.css[href]++;
            }else{
                res_cache.css[href] = 1;
            }
        },
        "STYLE": function(node){
            // @see http://www.yesky.com/imagesnew/software/css/css2/a_import.html
            var re = /@import\s+[^;]+;/g,
                mat = node.innerHTML.match(re);
                if(mat){
                    log(0, mat.join(""), "using @import.", errorCodes.cssByImport);
                }
        },
        "IFRAME": validateFrames,
        "FRAME": validateFrames,
        "IMG": function(node){
            var attrs = [],
                src = node.getAttribute("src"),
                html = D.wrapHTML(node);
            if(!D.hasAttr(node, "alt") ||
              re_empty.test(node.getAttribute("alt"))){
                attrs.push("alt");
            }
            //if(!D.hasAttr(node, "width") ||
              // !re_number.test(node.getAttribute("width"))){
                //attrs.push("width");
            //}
            //if(!D.hasAttr(node, "height") ||
              // !re_number.test(node.getAttribute("height"))){
                //attrs.push("height");
            //}
            if(attrs.length>0){
                log(0, html, "missing "+attrs.join(), errorCodes.altIllegal);
            }
            // protocol.
            if(!src || re_empty.test(src)){
                log(0, html, "protocol illegal.",
                    errorCodes.protocolIllegal);
                return;
            }
            switch(getProtocol(src)){
            case "http:":
            case "file:":
                if(checkProtocol){
                log(0, html, "protocol illegal.", errorCodes.protocolIllegal);
                }
                break;
            case "https:":
                break;
            //case "javascript:":
            //case "about:":
            //case "data:":
            //case "chrome:":
            //case "chrome-plugin:":
            //case "chrome-extension:":
            //case "mailto:"
            //case "ftp:"
            //case "ftps:"
            //...
            default:
                return;
            }
            uri = URI.path(URI.abs(src));
            // TODO: detect duplicate resources.
            res.img.push(uri);
            if(res_cache.img.hasOwnProperty(uri)){
                res_cache.img[uri]++;
            }else{
                res_cache.img[uri] = 1;
            }
        },
        "OBJECT": function(node){
            counter.objects++;
            if(D.hasAttr(node, "codebase")){
                var src = node.getAttribute("codebase");
                // object[codebase=""]
                if(!src || re_empty.test(src)){
                    log(0, '<object codebase="'+src+'"',
                        "protocol illegal.", errorCodes.protocolIllegal);
                    return;
                }
                if(!checkProtocol){return;}
                switch(getProtocol(src)){
                case "http:":
                case "file:":
                    log(0, '<object codebase="'+src+'"',
                        "protocol illegal.", errorCodes.protocolIllegal);
                    break;
                //case "https:":
                //case "about:":
                //case "javascript:":
                //case "data:":
                //case "chrome:":
                //case "chrome-plugin:":
                //case "chrome-extension:":
                //case "mailto:"
                //case "ftp:"
                //case "ftps:"
                //...
                default:
                    return;
                }
            }
        },
        "PARAM": function(node){
            var html = D.wrapHTML(node);
            //if("wmode"==node.getAttribute("name")){
                //var wmode = node.getAttribute("name").toLowerCase();
                //if("transparent"!=wmode || "opaque"!=wmode){
                    //log(0, html,
                        //"WARNING: param[name=wmode][value="+wmode+"].",
                        //errorCodes.flashOpacity);
                //}
            //}
            if("movie"==node.getAttribute("name") ||
              "src"==node.getAttribute("src")){
                var src = node.getAttribute("value");
                // protocol.
                if(!src || re_empty.test(src)){
                    log(0, html, "protocol illegal.", errorCodes.protocolIllegal);
                    return;
                }
                switch(getProtocol(src)){
                case "http:":
                case "file:":
                    if(checkProtocol){
                    log(0, html, "protocol illegal.", errorCodes.protocolIllegal);
                    }
                    break;
                case "https:":
                    break;
                //case "about:":
                //case "javascript:":
                //case "data:":
                //case "chrome:":
                //case "chrome-plugin:":
                //case "chrome-extension:":
                //case "mailto:"
                //case "ftp:"
                //case "ftps:"
                //...
                default:
                    return;
                }
                uri = URI.path(URI.abs(src));
                res.fla.push(uri);
                if(res_cache.fla.hasOwnProperty(uri)){
                    res_cache.fla[uri]++;
                }else{
                    res_cache.fla[uri] = 1;
                }
            }
        },
        "EMBED": function(node){
            var html = D.wrapHTML(node);
            //if(D.hasAttr(node, "wmode")){
                //var wmode = node.getAttribute("wmode").toLowerCase();
                //if("transparent"!=wmode || "opaque"!=wmode){
                    //log(0, html, "WARNING: embed[wmode="+wmode+"].",
                        //errorCodes.flashOpacity);
                //}
            //}else{
                //log(0, html, "missing embed[wmode].", errorCodes.flashOpacity);
            //}
            if(!D.hasAttr(node, "src")){return;}
            var src = node.getAttribute("src");
            // protocol.
            if(!src || re_empty.test(src)){
                log(0, html, "protocol illegal.", errorCodes.protocolIllegal);
                return;
            }
            switch(getProtocol(src)){
            case "http:":
            case "file:":
                if(checkProtocol){
                log(0, html, "protocol illegal.", errorCodes.protocolIllegal);
                }
                break;
            case "https:":
                break;
            //case "about:":
            //case "javascript:":
            //case "data:":
            //case "chrome:":
            //case "chrome-plugin:":
            //case "chrome-extension:":
            //case "mailto:"
            //case "ftp:"
            //case "ftps:"
            //...
            default:
                return;
            }
            uri = URI.path(URI.abs(src));
            res.fla.push(uri);
            if(res_cache.fla.hasOwnProperty(uri)){
                res_cache.fla[uri]++;
            }else{
                res_cache.fla[uri] = 1;
            }
        },
        "FONT": function(node){
            log(0, D.wrapHTML(node), "tagName deprecated.",
                errorCodes.tagsDeprecated);
        },
        "S": function(node){
            log(0, D.wrapHTML(node), "tagName deprecated.",
                errorCodes.tagsDeprecated);
        },
        "U": function(node){
            log(0, D.wrapHTML(node), "tagName deprecated.",
                errorCodes.tagsDeprecated);
        },
        // @see http://www.w3schools.com/html/html_tables.asp
        "A": function(node){
            // XXX: 统一状态判断。
            var debug = !(M._loc.protocol=="https:" &&
                    M._loc.hostname.indexOf(".alipay.com")>0),
                html = D.wrapHTML(node);
            if(!D.hasAttr(node, "href")){
                log(0, html, "missing [href]", errorCodes.hrefIllegal);
                return;
            }
            var href = node.getAttribute("href");
            // #, #hash.
            if(href.indexOf("#")==0){return;}
            if(/javascript:void(0);?/.test(href)){return;}
            var uri = URI.parse(href);
            if((!debug && uri.hostname.indexOf(".alipay.net")>0) ||
                "localhost"==uri.hostname ||
                // href="$xxServer.getURI('...')"
                0==href.indexOf("$")){

                log(0, html, "a[href] illegal.", errorCodes.hrefIllegal);
            }
            // XXX: 站内地址检测是否有效(404)，仅限于SIT环境。
        }
    };
    // 仅执行一次的全局规则。
    // global rules.
    function rule_global(doc){
        if("BackCompat" == doc.compatMode){
            log(0, doc.doctype||doc.compatMode,
                "document.compatMode: "+doc.compatMode,
                errorCodes.doctypeIllegal);
        }
        if(duplicateIDs.length > 0){
            log(0, "duplicate id:"+duplicateIDs.join(","),
                "duplicate id.", errorCodes.idDuplicated);
        }
        if(M.client.browser.name == "ie"){return;}
        if(counter.titles < 1){
            log(0, "missing title.", "missing title.", errorCodes.titleIllegal);
        }else if(counter.titles > 1){
            log(0, "too much titles.", "too much titles.", errorCodes.titleIllegal);
        }
    }

    // @see http://zhangsichu.com/blogview.asp?Content_Id=69
    //
    // NodeIterator (Firefox3.5+)
    //    http://blog.sina.com.cn/s/blog_6145ed810100ex03.html
    //    http://www.w3.org/TR/DOM-Level-2-Traversal-Range/traversal.html#Iterator-overview
    //    http://www.w3.org/2003/01/dom2-javadoc/org/w3c/dom/traversal/NodeIterator.html
    //    https://developer.mozilla.org/En/DOM/NodeIterator
    //    http://ejohn.org/blog/unimpressed-by-nodeiterator/
    // TreeWalker
    //    https://developer.mozilla.org/en/DOM/treeWalker
    //    http://msdn.microsoft.com/en-us/library/system.windows.automation.treewalker.aspx
    //    http://xerces.apache.org/xerces2-j/javadocs/api/org/w3c/dom/traversal/TreeWalker.html
    //    http://www.w3.org/TR/DOM-Level-2-Traversal-Range/traversal.html#Traversal-TreeWalker
    //    http://www.javascriptkit.com/dhtmltutors/treewalker.shtml
    // 平板式遍历 DOM 节点方法。
    function walk(root, rules){
        if(!root){root = document;}
        var elems = root.getElementsByTagName("*");
        for(var i=0,tagName,node,l=elems.length; i<l,node=elems[i]; i++){
            switch(node.nodeType){
            case 1: // element.
                tagName = node.tagName.toUpperCase();
                break;
            case 8: // comment.
                tagName = "!--";
                break;
            case 9: // document.
                // FIXME: not !DOCTYPE.
                tagName = "!DOCTYPE";
                break;
            default:
                return;
            }
            if(rules.hasOwnProperty("*")){rules["*"](node);}
            if(rules.hasOwnProperty(tagName)){rules[tagName](node);}
        }
    }

    M.DOMLint = function(doc){
        var t0 = new Date();
        preProcessing2(doc);
        t0 = new Date() - t0;
        var t1 = new Date();
        walk(doc, rules_tags_enter);
        rule_global(doc);
        t1 = new Date() - t1;

        if(M.debug && window.console && console.log){
            console.log("New Time2: ", t0, " ", t1);
        }

        return {
            res: {
                css: res.css,
                js : res.js,
                img: res.img,
                fla: res.fla
            },
            htmlSize: M.S.byteLength(D.outerHTML(doc.documentElement)),
            htmlErr: htmlErrors
        }
    };

    function getStyle(element, style) {
        var s = M.S.camelize(style),
            value = element.style[s];
        if (!value) {
            if (document.defaultView && document.defaultView.getComputedStyle) {
                var css = document.defaultView.getComputedStyle(element, null);
                value = css ? css.getPropertyValue(style) : null;
            } else if (element.currentStyle) {
                value = element.currentStyle[s];
            }
        }

        if (window.opera && ',left,top,right,bottom,'.indexOf(','+style+',')>=0){
            if (getStyle(element, 'position') == 'static'){
                value = 'auto';
            }
        }

        return value == 'auto' ? null : value;
    }
	function makeMap(str){
		var obj = {}, items = str.split(",");
		for ( var i = 0; i < items.length; i++ )
			obj[ items[i] ] = true;
		return obj;
	}
})();
