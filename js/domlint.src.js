// Quality Monitoring System.
// DOMLint
// TODO: 补全子分类
// FIXME: DOM 属性不合法的检测正确性。
// TODO: input[tabindex]
// TODO: 标签不合法，增加上下文。
// TODO: 属性不合法，增加关键上下文。
//
// TODO:
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
        errorCodes = M.htmlErrorCodes,
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
            if(!elem || 1!=elem.nodeType){
                return false;
            }
            if(elem.hasAttribute){
                return elem.hasAttribute(attr);
            }
            // for IE, not perfect.
            // @see http://www.patmullin.com/weblog/2006/04/06/getattributestyle-setattributestyle-ie-dont-mix/
            if("style" == attr){
                return "" !== elem.style.cssText;
            }
            return null!=elem.getAttribute(attr);
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
        if(M.debug && window.console && window.console.log){
            window.console.log("DOMLint: line:"+line+", "+"code: "+code+
                ", message:"+msg+", source:"+source+"");
        }
    }

    var Stack = function(){
        this._data = [];
    };
    Stack.prototype = {
        push: function(obj){
            return this._data.push(obj);
        },
        pop: function(){
            return this._data.pop();
        },
        last: function(){
            return this._data[this._data.length-1];
        },
        empty: function(){
            return this._data.length == 0;
        },
        clear: function(){
            this._data.length = 0;
        }
    };
    var counter = {
            doctypes: 0,
            heads: 0,
            metas: 0,
            titles: 0,
            forms: 0,
            scripts: 0,
            cssLinks: 0,
            styles: 0,
            objects: 0,
            params: 0,
            embeds: 0,
            submits: 0,
            nodes: 0
        },
        // XXX: to [].
        context = {
            heads: new Stack(),
            forms: new Stack(),
            objects: new Stack(),
            iframes: new Stack(),
            frames: new Stack(),
            images: new Stack(),
            ps: new Stack(),
            pres: new Stack()
        },
        //re_protocol = /^([a-zA-Z][a-zA-Z0-9_-]:).*$/,
        //XXX: re_empty_uri.
        //re_empty_uri =  /^javascript:(['"])\1;?$/,
        re_empty_uri =  /^(['"])\1;?$/,
        re_css_rel =    /^stylesheet$/i,
        re_css =        /\.css$/i,
        re_empty =      /^\s*$/,
        re_number =     /^\d+$/,
        re_css_bg_img = /^url\((["'])?(.*)\1\)$/i,
        css_bg_img_cache = {};
    // XXX: URI.method()
    var re_protocol = /^([a-zA-Z][a-zA-Z0-9_-]*:)/;
    function getProtocol(uri){
        var m = uri.match(re_protocol);
        if(null!=m && 2==m.length){return m[1];}
        return location.protocol;
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
        switch(getProtocol(src)){
        case "javascript:":
            if(re_empty_uri.test(uri.pathname)){break;}
        case "http:":
        case "file:":
        case "about:":
            log(0, html, "protocol illegal.", errorCodes.protocolIllegal);
            break;
        //case "https:":
        //case "data:":
        //case "chrome:":
        //case "chrome-plugin:":
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
    function getFormName(){
        var fm = context.forms.last(),
            fn = "document.forms["+counter.forms+"]";
        if(!fm){
            fn = "noform";
        }else if(D.hasAttr(fm, "id")){
            fn = "form#"+fm.getAttribute("id");
        }else if(D.hasAttr(fm, "name")){
            fn = "form[name="+fm.getAttribute("id")+"]";
        }
        return fn;
    }
    // validate <input>, <button>, <select>, <textarea>.
    function validateFormElements(node){
        var fn = getFormName(),
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
        var html = getFormName()+": "+node.startTag;

        if(D.hasAttr(node, "type")){
            // XXX: 表单不允许有多个 submit?
            //var type = node.getAttribute("type").toLowerCase();
            //if(type=="submit" && (++counter.submits > 1)){
                //log(0, html, "too much more submit buttons.",
                    //errorCodes.tagsIllegal);
            //}
        }else{
            log(0, html, "missing attr:[type]", errorCodes.typeIllegal);
        }
        validateFormElements(node);
    }
    // validate <ol>, <ul>.
    function validateList(node){
        for(var i=0,l=node.childNodes.length; i<l; i++){
            if(node.childNodes[i].nodeType != 1){continue;}
            if("LI" != node.childNodes[i].tagName){
                log(0, node.tagName+">"+D.wrapHTML(node.childNodes[i]),
                    "ul,ol 中嵌套 li", errorCodes.tagsNestedIllegal);
            }
        }
    }
    // validate <dt>, <dd>.
    function validateDefinedItem(node){
        var ptag = node.parentNode.tagName;
        if("DL" != ptag){
            log(0, ptag+">"+D.wrapHTML(node),
                "dl 中嵌套 dt", errorCodes.tagsNestedIllegal);
        }
    }
    // validate <thead>, <tbody>, <tfoot>, <caption>, <colgroup>, <col>.
    function validateTables(node){
        var ptag = node.parentNode.tagName,
            tag = node.tagName,
            html = D.wrapHTML(node);
        if("TABLE"!=ptag){
            log(0, ptag+">"+html,
                ptag+">"+node.tagName, errorCodes.tagsNestedIllegal);
        }
        // validate childNodes for thead, tbody, tfoot.
        if("THEAD"==tag || "TBODY"==tag || "TFOOT"==tag){
            for(var i=0,l=node.childNodes.length; i<l; i++){
                if(node.childNodes[i].nodeType != 1){continue;}
                if("TR" != node.childNodes[i].tagName){
                    log("html", 0, html+">"+D.wrapHTML(node.childNodes[i]),
                        tag+">"+node.childNodes[i].tagName);
                }
            }
        }
    }
    // vali  <th>, <td>.
    function validateTableCell(node){
        var tag = node.parentNode.tagName;
        if("TR" != tag){
            log(0, tag+">"+D.wrapHTML(node),
                tag+">"+node.tagName, errorCodes.tagsNestedIllegal);
        }
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
            if(D.hasAttr(node, "style")){
                log(0, html, "inline css.", errorCodes.inlineCSS);
            }
            // <p>
            if(!context.ps.empty()){
                if(!inline[node.tagName]){
                    log(0, "p>"+html, "p>"+D.wrapHTML(context.ps.last()),
                        errorCodes.tagsNestedIllegal);
                }
            }
            // <pre>
            if(!context.pres.empty()){
                if(!inline[node.tagName]){
                    log(0, "pre>"+html, "pre>"+html, errorCodes.tagsNestedIllegal);
                }
            }
            // inline > block
            var tag = node.tagName,
                ptag = node.parentNode.tagName;
            // Note: !inline, do not use block.
            if(inline[ptag] && !block[ptag] && block[tag] && !inline[tag]){
                log(0, ptag+">"+html, ptag+">"+tag, errorCodes.tagsNestedIllegal);
            }
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
            context.heads.push(node);
            // check the document.charset
            // 在DOMReady时，任何浏览器都会有且仅有一个html,head,body标签，不多不少。
            // 对于IE，浏览器无论如何都会设置一个title，并将title放置是head的第一位。
            // 所以针对IE的charset检测是不准确的。
            // document.charset
            if(M.Env.browser == "IE"){return;}
            var meta = D.firstChild(node),
                illegal = true;
            if(meta || "META"==meta.tagName){
                if(D.hasAttr(meta, "charset")){
                    illegal = false;
                }else if(D.hasAttr(meta, "http-equiv") &&
                    meta.getAttribute("http-equiv").toLowerCase()=="content-type" &&
                    D.hasAttr(meta, "content") &&
                    meta.getAttribute("content").indexOf("charset")>=0){
                        illegal = false;
                }
            }else{
                illegal = true;
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
        "META": function(node){
            counter.metas++;
        },
        "FORM": function(node){
            if(!context.forms.empty()){
                log(0, "form "+D.wrapHTML(node),
                    "form nested illegal.", errorCodes.tagsNestedIllegal);
            }
            context.forms.push(node);
            counter.forms++;
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
                log(0, html, "attr [for] missing value.", errorCodes.attrValueIllegal);
                return;
            }
            if(!duplicateIDsCache.hasOwnProperty("ID_"+id)){
                log(0, html, "#"+id+" not exist.", errorCodes.attrValueIllegal);
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
            if(!D.hasAttr(node, "charset")){
                log(0, html, "missing charset.", errorCodes.attrCharsetIllegal);
            }
            // resources.
            var src = node.getAttribute("src");
            uri = URI.path(src);
            if(!M.URI.isExternalRes(uri)){
                res.js.push(uri);
                if(res_cache.js.hasOwnProperty(uri)){
                    res_cache.js[uri]++;
                }else{
                    res_cache.js[uri] = 1;
                }
            }
            // protocol.
            if(!checkProtocol){return;}
            if(!src || re_empty.test(src)){
                log(0, html, "protocol illegal.", errorCodes.protocolIllegal);
                return;
            }
            switch(getProtocol(src)){
            case "http:":
            case "file:":
                log(0, html, "protocol illegal.", errorCodes.protocolIllegal);
                break;
            //case "https:":
            //case "javascript:":
            //case "about:":
            //case "data:":
            //case "chrome:":
            //case "chrome-plugin:":
            //case "mailto:"
            //case "ftp:"
            //case "ftps:"
            //...
            default:
                return;
            }
        },
        "LINK": function(node){
            var type = node.getAttribute("type"),
                rel = node.getAttribute("rel"),
                href = node.getAttribute("href"),
                uri = URI.parse(href),
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
            if(!D.hasAttr(node, "charset")){
                log(0, html, "missing charset.", errorCodes.attrCharsetIllegal);
            }
            // resources.
            uri = URI.path(href);
            if(!M.URI.isExternalRes(uri)){
                res.css.push(uri);
                if(res_cache.css.hasOwnProperty(uri)){
                    res_cache.css[uri]++;
                }else{
                    res_cache.css[uri] = 1;
                }
            }
            // protocol.
            if(!checkProtocol){return;}
            if(!href || re_empty.test(href)){
                log(0, html, "protocol illegal.", errorCodes.protocolIllegal);
                return;
            }
            switch(getProtocol(href)){
            case "http:":
            case "file:":
                log(0, html, "protocol illegal.", errorCodes.protocolIllegal);
                break;
            //case "https:":
            //case "javascript:":
            //case "about:":
            //case "data:":
            //case "chrome:":
            //case "chrome-plugin:":
            //case "mailto:"
            //case "ftp:"
            //case "ftps:"
            //...
            default:
                return;
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
                uri = URI.parse(src),
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
            uri = URI.path(src);
            if(!M.URI.isExternalRes(uri)){
                // TODO: detect duplicate resources.
                res.img.push(uri);
                if(res_cache.img.hasOwnProperty(uri)){
                    res_cache.img[uri]++;
                }else{
                    res_cache.img[uri] = 1;
                }
            }
            // protocol.
            if(!checkProtocol){return;}
            if(!src || re_empty.test(src)){
                log(0, html, "protocol illegal.",
                    errorCodes.protocolIllegal);
                return;
            }
            switch(getProtocol(src)){
            case "http:":
            case "file:":
                log(0, html, "protocol illegal.", errorCodes.protocolIllegal);
                break;
            //case "https:":
            //case "javascript:":
            //case "about:":
            //case "data:":
            //case "chrome:":
            //case "chrome-plugin:":
            //case "mailto:"
            //case "ftp:"
            //case "ftps:"
            //...
            default:
                return;
            }
        },
        "OBJECT": function(node){
            context.objects.push(node);
            counter.objects++;
            if(D.hasAttr(node, "codebase")){
                // protocol.
                if(!checkProtocol){return;}
                if(!src || re_empty.test(src)){
                    log(0, '<object codebase="'+src+'"',
                        "protocol illegal.", errorCodes.protocolIllegal);
                    return;
                }
                var src = node.getAttribute("codebase");
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
                var src = node.getAttribute("value"),
                    uri = URI.path(src);
                if(!M.URI.isExternalRes(uri)){
                    res.fla.push(uri);
                    if(res_cache.fla.hasOwnProperty(uri)){
                        res_cache.fla[uri]++;
                    }else{
                        res_cache.fla[uri] = 1;
                    }
                }
                // protocol.
                if(!checkProtocol){return;}
                if(!src || re_empty.test(src)){
                    log(0, html, "protocol illegal.", errorCodes.protocolIllegal);
                    return;
                }
                switch(getProtocol(src)){
                case "http:":
                case "file:":
                    log(0, html, "protocol illegal.", errorCodes.protocolIllegal);
                    break;
                //case "https:":
                //case "about:":
                //case "javascript:":
                //case "data:":
                //case "chrome:":
                //case "chrome-plugin:":
                //case "mailto:"
                //case "ftp:"
                //case "ftps:"
                //...
                default:
                    return;
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
            var src = node.getAttribute("src"),
                uri = URI.path(src);
            if(!M.URI.isExternalRes(uri)){
                res.fla.push(uri);
                if(res_cache.fla.hasOwnProperty(uri)){
                    res_cache.fla[uri]++;
                }else{
                    res_cache.fla[uri] = 1;
                }
            }
            // protocol.
            if(!checkProtocol){return;}
            if(!src || re_empty.test(src)){
                log(0, html, "protocol illegal.", errorCodes.protocolIllegal);
                return;
            }
            switch(getProtocol(src)){
            case "http:":
            case "file:":
                log(0, html, "protocol illegal.", errorCodes.protocolIllegal);
                break;
            //case "https:":
            //case "about:":
            //case "javascript:":
            //case "data:":
            //case "chrome:":
            //case "chrome-plugin:":
            //case "mailto:"
            //case "ftp:"
            //case "ftps:"
            //...
            default:
                return;
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
        "P": function(node){
            context.ps.push(node);
        },
        "PRE": function(node){
            context.pres.push(node);
        },
        "UL": validateList,
        "OL": validateList,
        "LI": function(node){
            var tag = node.parentNode.tagName;
            if("UL"!=tag && "OL"!=tag){
                log(0, tag+">"+D.wrapHTML(node),
                    "ul,ol 中嵌套 li", errorCodes.tagsNestedIllegal);
            }
        },
        "DL": function(node){
            for(var i=0,tag,l=node.childNodes.length; i<l; i++){
                if(node.childNodes[i].nodeType != 1){continue;}
                tag = node.childNodes[i].tagName;
                if("DT" != tag && "DD" != tag){
                  log(0, "dl>"+D.wrapHTML(node.childNodes[i]),
                      "dl 中嵌套 dt", errorCodes.tagsNestedIllegal);
                }
            }
        },
        "DT": validateDefinedItem,
        "DD": validateDefinedItem,
        // @see http://www.w3schools.com/html/html_tables.asp
        "TABLE": function(node){
            for(var i=0,tag,l=node.childNodes.length; i<l; i++){
                if(node.childNodes[i].nodeType != 1){continue;}
                tag = node.childNodes[i].tagName;
                if("THEAD"!=tag && "TBODY"!=tag && "TFOOT"!=tag && "TR"!=tag ||
                  "CAPTION"!=tag || "COLGROUP"!=tag || "COL"!=tag){
                    log(0, D.wrapHTML(node),
                        "table>"+tag, errorCodes.tagsNestedIllegal);
                }
            }
        },
        "CAPTION": validateTables,
        "COLGROUP": validateTables,
        "COL": validateTables,
        "THEAD": validateTables,
        "TBODY": validateTables,
        "TFOOT": validateTables,
        "TR": function(node){
            var tag = node.parentNode.tagName,
                html = D.wrapHTML(node);
            if("TABLE"!=tag && "THEAD"!=tag && "TBODY"!=tag && "TFOOT"!=tag){
                log(0, html, tag+">"+node.tagName, errorCodes.tagsNestedIllegal);
            }
            for(var i=0,l=node.childNodes.length; i<l; i++){
                if(node.childNodes[i].nodeType != 1){continue;}
                if("TD" != node.childNodes[i].tagName){
                    log(0, html, node.tagName+">"+node.childNodes[i].tagName,
                        errorCodes.tagsNestedIllegal);
                }
            }
        },
        "TH": validateTableCell,
        "TD": validateTableCell,
        "A": function(node){
            // XXX: 统一状态判断。
            var debug = !(location.protocol=="https:" &&
                    location.hostname.indexOf(".alipay.com")>0),
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
    var rules_tags_leave = {
        "!DOCTYPE": function(node){},
        "FORM": function(node){
            context.forms.pop();
            counter.submits = 0;
        },
        "object": function(node){
            context.objects.pop();
        },
        "PARAM": function(node){
        },
        "P": function(node){
            context.ps.pop();
        },
        "PRE": function(node){
            context.pres.pop();
        }
    };
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
        if(M.Env.browser == "IE"){return;}
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
    function walkFF(doc, enter, leave){
        // walk firefox.
        var root = doc.createTreeWalker(document, NodeFilter.SHOW_ELEMENT,
            null, false), node=root;
        while(node = node.nextNode()){
            //node.tagName, node.value, node.href
        }
    }
    // FIXME: 通用非递归遍历 DOM。
    // TODO: do{
    //      enter[tagName]();
    //
    //      node = node.firstChild;
    // }while(node && node!=root);
    function isNode(n){
        if(!n){return false;}
        var t=n.nodeType;
        //return t==1 || t==8;
        return t==1 || t==8 || t==9;
    }
    function nextNode(n){
        do{
            n = n.nextSibling;
        }while(n && !isNode(n));
        return isNode(n) ? n : null;
    }
    function firstNode(n){
        n = n.firstChild;
        if(!n){return null;}
        return isNode(n) ? n : nextNode(n);
    }
    // XXX: 处理 P 标签时貌似有问题。
    function walk2(root, enter, leave){
        var node=root, tag, tmp,
            enterAll = enter && enter.hasOwnProperty("*") &&
                "function"==typeof(enter["*"]),
            leaveAll = leave && leave.hasOwnProperty("*") &&
                "function"==typeof(leave["*"]);
        Lwalk: do{
            // @see http://reference.sitepoint.com/javascript/DocumentType
            // http://stackoverflow.com/questions/3043820/jquery-check-doctype
            if(1 == node.nodeType){ // HTMLElement.
                tag = node.tagName;
            }else if(8 == node.nodeType){ // comment.
                // TODO: re_doctype
                var re_doctype = /^DOCTYPE\s/i;
                if(re_doctype.test(node.nodeValue)){
                    tag = "!DOCTYPE";
                }else{
                    tag = "!--";
                }
            }else if(9 == node.nodeType){ // document.
                tag = null;
            }else if(10 == node.nodeType){ // document type.
                tag = "!DOCTYPE";
            }else{continue Lwalk;}
            if(tag){
                if(enterAll){enter["*"](node);}
                if(enter && enter.hasOwnProperty(tag) &&
                  "function"==typeof(enter[tag])){
                    enter[tag](node);
                }
            }

            if(tmp = firstNode(node)){ // firstChild(HTMLElement)
                node = tmp;
            }else if(tmp = nextNode(node)){ // nextSibling(HTMLElement)
                node = tmp;
            }else if(node.parentNode){
                do{
                    if(tag){
                        if(leave && leave.hasOwnProperty(tag) &&
                          "function"==typeof(leave[tag])){
                            leave[tag](node);
                        }
                        if(leaveAll){leave["*"](node);}
                    }

                    if(node == root){break Lwalk;}
                    node = node.parentNode;
                    tag = node.tagName;
                    if(tmp = nextNode(node)){ // node.nextSibling(HTMLElement)
                        node = tmp;
                        continue Lwalk;
                    }
                }while(node);
                break Lwalk;
            }else{
                break Lwalk;
            }
        }while(node && node!=root);
    }
    function walk(node, enter, leave){
        if(!node){return;}
        var tagName;
        switch(node.nodeType){
        case 1: // element.
            tagName = node.tagName;
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

        if(enter){
            if(enter.hasOwnProperty("*") && "function"==typeof(enter["*"])){
                enter["*"](node);
            }
            if(enter.hasOwnProperty(tagName) && "function"==typeof(enter[tagName])){
                enter[tagName](node);
            }
        }

        var nodeSelf = node;
        node = node.firstChild;
        while (node) {
            walk(node, enter, leave);
            node = node.nextSibling;
        }

        if(leave){
            if(leave.hasOwnProperty(tagName) && "function"==typeof(leave[tagName])){
                leave[tagName](nodeSelf);
            }
            if(leave.hasOwnProperty("*") && "function"==typeof(leave["*"])){
                leave["*"](nodeSelf);
            }
        }
    }

    M.DOMLint = function(doc){
        var t0 = new Date();
        preProcessing2(doc);
        t0 = new Date() - t0;
        var t1 = new Date();
        //walk(doc, rules_tags_enter, rules_tags_leave);
        walk2(doc, rules_tags_enter, rules_tags_leave);
        rule_global(doc);
        t1 = new Date() - t1;

        if(M.debug && window.console && window.console.log){
            window.console.log("New Time2: ", t0, t1);
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
