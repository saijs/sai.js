// Quality Monitoring System.
// DOMLint
// TODO: CSSniffer.

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
            if(!elem || 8==elem.nodeType || 9==elem.nodeType){
                return false;
            }
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
    function log(type, line, source, msg, code){
        htmlErrors.push({ln:line, err:code, code:source});
        if(M.debug && window.console && window.console.log){
            window.console.log("DOMLint: line:"+line+", "+"code:"+code+
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
        re_empty_uri =  /^javascript:(['"])\1;?$/,
        re_css_rel =    /^stylesheet$/i,
        re_css =        /\.css$/i,
        re_empty =      /^\s*$/,
        re_number =     /^\d+$/,
        re_css_bg_img = /^url\((["'])?(.*)\1\)$/i,
        css_bg_img_cache = {};
    // validate <iframe>, <frame>.
    function validateFrames(node){
        var src = node.getAttribute("src"),
            uri = URI.parse(src);
        if(checkProtocol && ("https:" != uri.protocol &&
          !re_empty_uri.test(src))){
            log("html", 0, D.wrapHTML(node), "protocol illegal.",
                errorCodes.protocolIllegal);
        }
        // TODO: check when sub-frames without DOMLint.
        // if(node.contentWindow.monitor){return;}
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
        if("noform"==fn){
            if(M.debug && window.console && window.console.log){
                window.console.log("noform: "+D.wrapHTML(node));
            }
        }
        if(D.hasAttr(node, "id")){
            var id = node.getAttribute("id");
            if("id"==id || "submit"==id){
                log("html", 0, html, "id不合法。",
                    errorCodes.formElementNameIllegal);
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
                log("html", 0, html,
                    "missing attribute: [name].", errorCodes.attrIllegal);
            }
            return;
        }
        var name = node.getAttribute("name");
        if("submit"==name || "id"==name){
            log("html", 0, html,
                "[name] attribute illegal.", errorCodes.attrIllegal);
        }
    }
    // validate <input>, <button>.
    function validateButtons(node){
        var html = getFormName()+": "+node.startTag;

        if(D.hasAttr(node, "type")){
            // XXX: 表单不允许有多个 submit?
            //type = node.getAttribute("type").toLowerCase();
            //if(type=="submit" && (++counter.submits > 1)){
                //log("html", 0, html,
                    //"too much more submit buttons.",
                    //errorCodes.tagsIllegal);
            //}
        }else{
            log("html", 0, html,
                "missing attribute: [type].", errorCodes.attrIllegal);
        }
        validateFormElements(node);
    }
    // validate <ol>, <ul>.
    function validateList(node){
        for(var i=0,l=node.childNodes.length; i<l; i++){
            if(node.childNodes[i].nodeType != 1){continue;}
            if("LI" != node.childNodes[i].tagName){
                log("html", 0,
                    node.tagName+">"+D.wrapHTML(node.childNodes[i]),
                    "ul,ol 中嵌套 li", errorCodes.tagsIllegal,
                    errorCodes.tagsNestedIllegal);
            }
        }
    }
    // validate <dt>, <dd>.
    function validateDefinedItem(node){
        if("DL" != node.parentNode.tagName){
            log("html", 0,
                node.parentNode.tagName+">"+D.wrapHTML(node),
                "dl 中嵌套 dt", errorCodes.tagsIllegal,
                errorCodes.tagsNestedIllegal);
        }
    }
    // validate <thead>, <tbody>, <tfoot>, <caption>, <colgroup>, <col>.
    function validateTables(node){
        var ptag = node.parentNode.tagName,
            tag = node.tagName;
        if("TABLE"!=ptag){
            log("html", 0, D.wrapHTML(node),
                ptag+">"+node.tagName, errorCodes.tagsNestedIllegal);
        }
        // validate childNodes for thead, tbody, tfoot.
        if("THEAD"==tag || "TBODY"==tag || "TFOOT"==tag){
            for(var i=0,l=node.childNodes.length; i<l; i++){
                if(node.childNodes[i].nodeType != 1){continue;}
                if("TR" != node.childNodes[i].tagName){
                    log("html", 0, D.wrapHTML(node),
                        tag+">"+node.childNodes[i].tagName);
                }
            }
        }
    }
    // vali  <th>, <td>.
    function validateTableCell(node){
        var tag = node.parentNode.tagName;
        if("TR" != tag){
            log("html", 0, tag+">"+D.wrapHTML(node),
                tag+">"+node.tagName, errorCodes.tagsIllegal,
                errorCodes.tagsNestedIllegal);
        }
    }

    var duplicateIDs=[], duplicateIDsCache={};
    var preProcessing = {
        "*": function(node){
            counter.nodes++;
            if(1 != node.nodeType){return;}
            // cache elements ids for label test.
            if(D.hasAttr(node, "id")){
                var id = node.getAttribute("id");
                if(re_empty.test(id)){
                    log("html", 0, D.wrapHTML(node),
                        node.tagName+"[id=]", errorCodes.attrIllegal);
                    return;
                }
                if(duplicateIDsCache.hasOwnProperty("ID_"+id)){
                    if(1 == duplicateIDsCache["ID_"+id]){
                        duplicateIDs.push(id);
                    }
                    duplicateIDsCache["ID_"+id]++;
                }else{
                    duplicateIDsCache["ID_"+id] = 1;
                }
            }
        }
    };
    var rules_tags_enter = {
        "*": function(node){
            if(1 != node.nodeType){return;}
            // XXX: 性能？
            for(var j=0,m=inlinejs.length; j<m; j++){
                if(D.hasAttr(node, inlinejs[j])){
                    log("html", 0, D.wrapHTML(node),
                        "inline js.", errorCodes.inlineJS);
                    break;
                }
            }
            if(D.hasAttr(node, "style")){
                log("html", 0, D.wrapHTML(node), "inline css.",
                    errorCodes.inlineCSS);
            }
            // <p>, <pre>
            if(!context.ps.empty() || !context.pres.empty()){
                if(!inline[node.tagName]){
                    log("html", 0, "p>"+D.wrapHTML(node),
                        "p > inline element.", errorCodes.tagsIllegal,
                        errorCodes.tagsNestedIllegal);
                }
            }
            // inline > block
            var tag = node.tagName,
                ptag = node.parentNode.tagName;
            // Note: !inline, do not use block.
            if(inline[ptag] && !block[ptag] && block[tag] && !inline[tag]){
                log("html", 0, ptag+">"+tag+D.wrapHTML(node), "inline>block.",
                    errorCodes.tagsNestedIllegal);
            }
            // css background-image.
            var bg = getStyle(node, "background-image");
            if(!!bg && "none"!=bg){
                bg = bg.replace(re_css_bg_img, "$2");
                if(!css_bg_img_cache.hasOwnProperty(bg)){
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
                //log("html", 0,
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
            if(M.Browser.ie){return;}
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
                log("html", 0, "document charset illegal.",
                    "document charset illegal.", errorCodes.charsetIllegal);
            }
        },
        "TITLE": function(node){
            counter.titles++;
            if(re_empty.test(node.innerHTML)){
                log("html", 0, D.outerHTML(node), "title value is empty.",
                    errorCodes.tagsIllegal);
            }
        },
        "META": function(node){
            counter.metas++;
        },
        "FORM": function(node){
            if(!context.forms.empty()){
                log("html", 0, "form "+D.wrapHTML(node),
                    "form nested illegal.", errorCodes.tagsIllegal,
                    errorCodes.tagsNestedIllegal);
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
                log("html", 0, html,
                    "missing attribute: [for]", errorCodes.attrIllegal);
                return;
            }
            var id = node.getAttribute("for");
            if(re_empty.test(id)){
                log("html", 0, html,
                    "attribute [for] missing a value.", errorCodes.attrIllegal);
                return;
            }
            if(!duplicateIDsCache.hasOwnProperty("ID_"+id)){
                log("html", 0, html,
                    "#"+id+" element not exist.", errorCodes.attrIllegal);
                return;
            }
        },
        "SCRIPT": function(node){
            // validate [type] attribute.
            //if(!D.hasAttr(node, "type")){
                //log("html", 0, D.wrapHTML(node),
                    //"missing [type] attribute.", errorCodes.attrIllegal);
            //}
            if(!D.hasAttr(node, "src")){return;}
            var src = node.getAttribute("src");

            if(!D.hasAttr(node, "charset")){
                log("html", 0, D.wrapHTML(node), "missing charset.",
                    errorCodes.charsetIllegal);
            }
            var uri = URI.parse(src);
            if(checkProtocol && "https:" != uri.protocol){
                log("html", 0, D.wrapHTML(node), "protocol illegal.",
                    errorCodes.protocolIllegal);
            }
            // resources.
            uri = URI.path(src);
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
                uri = URI.parse(node.getAttribute("href"));
            // link 标签的嵌套。
            //tag = node.parentNode.tagName;
            //if("HEAD" != tag){
                //log("html", 0, tag+">"+D.wrapHTML(node),
                    //"tags nested error.", errorCodes.tagsIllegal,
                    //errorCodes.tagsNestedIllegal);
            //}
            // All links need rel attr.
            if(!D.hasAttr(node, "rel")){
                log("html", 0, D.wrapHTML(node), "missing [rel]",
                    errorCodes.attrIllegal);
                return;
            }
            // favicon, stylesheet, ...
            if(checkProtocol && "https:" != uri.protocol){
                log("html", 0, D.wrapHTML(node), "protocol illegal.",
                    errorCodes.protocolIllegal);
            }
            // link[rel=stylesheet]
            if("stylesheet" != node.getAttribute("rel")){return;}
            //if("text/css" != type){
                //log("html", 0, D.wrapHTML(0),
                    //"link[rel=stylesheet] missing [type].",
                    //errorCodes.attrIllegal);
            //}
            if(!D.hasAttr(node, "charset")){
                log("html", 0, D.wrapHTML(node), "missing charset.",
                    errorCodes.charsetIllegal);
            }
            // resources.
            uri = URI.path(href);
            res.css.push(uri);
            if(res_cache.css.hasOwnProperty(uri)){
                res_cache.css[uri]++;
            }else{
                res_cache.css[uri] = 1;
            }
        },
        "STYLE": function(node){
            // @see http://www.yesky.com/imagesnew/software/css/css2/a_import.html
            var re = /@import\s+[^;]+;/g,
                mat = node.innerHTML.match(re);
                if(mat){
                    log("css", 0, mat.join(""), "using @import.",
                        errorCodes.cssIllegal, errorCodes.cssByImport);
                }
        },
        "IFRAME": validateFrames,
        "FRAME": validateFrames,
        "IMG": function(node){
            var attrs = [],
                src = node.getAttribute("src"),
                uri = URI.parse(src);
            if(checkProtocol && "https:" != uri.protocol){
                log("html", 0, D.wrapHTML(node), "protocol illegal.",
                    errorCodes.protocolIllegal);
            }
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
                log("html", 0, D.wrapHTML(node),
                    "missing "+attrs.join(), errorCodes.attrIllegal);
            }
            uri = URI.path(src);
            res.img.push(uri);
            if(res_cache.img.hasOwnProperty(uri)){
                res_cache.img[uri]++;
            }else{
                res_cache.img[uri] = 1;
            }
        },
        "OBJECT": function(node){
            context.objects.push(node);
            counter.objects++;
            if(D.hasAttr(node, "codebase")){
                var src = node.getAttribute("codebase"),
                    uri = URI.parse(src);
                if(checkProtocol && "https:"!=uri.protocol){
                    log("html", 0,
                        '<object codebase="'+src+'"',
                        "protocol illegal.", errorCodes.protocolIllegal);
                }
            }
        },
        "PARAM": function(node){
            //if("wmode"==node.getAttribute("name")){
                //var wmode = node.getAttribute("name").toLowerCase();
                //if("transparent"!=wmode || "opaque"!=wmode){
                    //log("html", 0, D.wrapHTML(node),
                        //"WARNING: param[name=wmode][value="+wmode+"].",
                        //errorCodes.attrIllegal);
                //}
            //}
            if("movie"==node.getAttribute("name") ||
              "src"==node.getAttribute("src")){
                var src = node.getAttribute("value"),
                    uri = URI.parse(src);
                if(checkProtocol && "https:" != uri.protocol){
                    log("html", 0, D.wrapHTML(node),
                        "protocol illegal.", errorCodes.protocolIllegal);
                }
                uri = URI.path(src);
                res.fla.push(uri);
                if(res_cache.fla.hasOwnProperty(uri)){
                    res_cache.fla[uri]++;
                }else{
                    res_cache.fla[uri] = 1;
                }
            }
        },
        "EMBED": function(node){
            //if(D.hasAttr(node, "wmode")){
                //var wmode = node.getAttribute("wmode").toLowerCase();
                //if("transparent"!=wmode || "opaque"!=wmode){
                    //log("html", 0, D.wrapHTML(node),
                        //"WARNING: embed[wmode="+wmode+"].", errorCodes.attrIllegal);
                //}
            //}else{
                //log("html", 0, D.wrapHTML(node),
                    //"missing embed[wmode].", errorCodes.attrIllegal);
            //}
            if(!D.hasAttr(node, "src")){return;}
            var src = node.getAttribute("src"),
                uri=URI.parse(src);
            if(checkProtocol && "https:"!=uri.protocol){
                log("html", 0, D.wrapHTML(node), "protocol illegal.",
                    errorCodes.protocolIllegal);
            }
            uri = URI.path(src);
            res.fla.push(uri);
            if(res_cache.fla.hasOwnProperty(uri)){
                res_cache.fla[uri]++;
            }else{
                res_cache.fla[uri] = 1;
            }
        },
        "FONT": function(node){
            log("html", 0, D.wrapHTML(node), "tagName deprecated.",
                errorCodes.tagsIllegal, errorCodes.tagsDeprecated);
        },
        "S": function(node){
            log("html", 0, D.wrapHTML(node), "tagName deprecated.",
                errorCodes.tagsIllegal, errorCodes.tagsDeprecated);
        },
        "U": function(node){
            log("html", 0, D.wrapHTML(node), "tagName deprecated.",
                errorCodes.tagsIllegal, errorCodes.tagsDeprecated);
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
                log("html", 0, tag+">"+D.wrapHTML(node),
                    "ul,ol 中嵌套 li", errorCodes.tagsIllegal,
                    errorCodes.tagsNestedIllegal);
            }
        },
        "DL": function(node){
            for(var i=0,tag,l=node.childNodes.length; i<l; i++){
                if(node.childNodes[i].nodeType != 1){continue;}
                tag = node.childNodes[i].tagName;
                if("DT" != tag && "DD" != tag){
                  log("html", 0, "dl>"+D.wrapHTML(node.childNodes[i]),
                      "dl 中嵌套 dt", errorCodes.tagsIllegal,
                      errorCodes.tagsNestedIllegal);
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
                    log("html", 0, D.wrapHTML(node),
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
            var tag = node.parentNode.tagName;
            if("TABLE"!=tag && "THEAD"!=tag && "TBODY"!=tag && "TFOOT"!=tag){
                log("html", 0, D.wrapHTML(node),
                    tag+">"+node.tagName, errorCodes.tagsNestedIllegal);
            }
            for(var i=0,l=node.childNodes.length; i<l; i++){
                if(node.childNodes[i].nodeType != 1){continue;}
                if("TD" != node.childNodes[i].tagName){
                    log("html", 0, D.wrapHTML(node),
                        node.tagName+">"+node.childNodes[i].tagName,
                        errorCodes.tagsNestedIllegal);
                }
            }
        },
        "TH": validateTableCell,
        "TD": validateTableCell,
        "A": function(node){
            // XXX: 统一状态判断。
            var debug = !(location.protocol=="https:" &&
                location.hostname.indexOf(".alipay.com")>0);
            if(!D.hasAttr(node, "href")){
                log("html", 0, D.wrapHTML(node),
                    "missing [href]", errorCodes.attrIllegal);
                return;
            }
            var href = node.getAttribute("href");
            if(href.indexOf("#")==0){return;}
            if(/javascript:void(0);?/.test(href)){return;}
            var uri = URI.parse(node.getAttribute("href"));
            if((!debug && uri.hostname.indexOf(".alipay.net")>0) ||
                0==uri.hostname.indexOf("localhost") ||
                0==href.indexOf("$")){ // href="$xxServer.getURI('...')"
                log("html", 0, D.wrapHTML(node),
                    "a[href] illegal.", errorCodes.attrIllegal);
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
            log("html", 0, doc.doctype||doc.compatMode, "document.compatMode: "+doc.compatMode, errorCodes.doctypeIllegal);
        }
        if(duplicateIDs.length > 0){
            log("html", 0, "duplicate id:"+duplicateIDs.join(","),
                "duplicate id.", errorCodes.attrIllegal,
                errorCodes.idDuplicated);
        }
        if(M.Browser.ie){return;}
        if(counter.titles < 1){
            log("html", 0, "missing title.", "missing title.", errorCodes.tagsIllegal);
        }else if(counter.titles > 1){
            log("html", 0, "too much titles.", "too much titles.", errorCodes.tagsIllegal);
        }
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

        node = node.firstChild;
        while (node) {
            walk(node, enter, leave);
            node = node.nextSibling;
        }

        if(leave){
            if(leave.hasOwnProperty(tagName) && "function"==typeof(leave[tagName])){
                leave[tagName](node);
            }
            if(leave.hasOwnProperty("*") && "function"==typeof(leave["*"])){
                leave["*"](node);
            }
        }
    }

    M.DOMLint = function(doc){

        var t1 = new Date();
        walk(doc, preProcessing, {});
        walk(doc, rules_tags_enter, rules_tags_leave);
        rule_global(doc);
        t1 = new Date() - t1;

        if(M.debug && window.console && window.console.log){
            window.console.log("New Time: ", t1);
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
