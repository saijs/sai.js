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
            return D.outerHTML(node).replace(/^(<[^>]+>)(?:.|\s)*/, '$1...');
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
    function log0(type, msg, err){
        htmlErrors.push({ln:0, err:err, code:msg});
        if(M.debug && window.console && window.console.log){window.console.log("DOMLint: ", msg, err);}
    }
    function log(type, line, source, msg, code){
        htmlErrors.push({ln:line, err:code, code:source});
        if(M.debug && window.console && window.console.log){window.console.log("HTMLint: line:"+line+", "+"code:"+code+", message:"+msg+", source:"+source+"");}
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
        re_empty_uri=/^javascript:(['"])\1;?$/,
        re_css_rel=/^stylesheet$/i,
        re_css=/\.css$/i,
        re_empty=/^\s*$/,
        re_number=/^\d+$/;
    // validate <iframe>, <frame>.
    function validateFrames(node){
        var src = node.getAttribute("src"),
            uri = URI.parse(src);
        if(checkProtocol && ("https:" != uri.protocol ||
          re_empty_uri.test(src))){
            log("html", 0, D.wrapHTML(node), "protocol illegal.",
                errorCodes.protocolIllegal);
        }
    }
    // validate <input>, <button>, <select>, <textarea>.
    function validateFormElements(node){
        if("noform"==getFormName()){
            if(M.debug && window.console && window.console.log){
                window.console.log("noform: "+node.startTag);
            }
        }
        var html = getFormName() + " " + D.wrapHTML(node);
        if(D.hasAttr(node, "id")){
            id = node.getAttribute("id");
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
        var ptag = node.parentNode.tagName;
        if("TABLE"!=ptag){
            log("html", 0, D.wrapHTML(node),
                ptag+">"+node.tagName, errorCodes.tagsNestedIllegal);
        }
        // validate childNodes for thead, tbody, tfoot.
        var tag = node.tagName;
        if("THEAD"==tag || "TBODY"==tag || "TFOOT"==tag){
            for(var i=0,l=node.childNodes.length; i<l; i++){
                if(node.childNodes[i].nodeType != 1){continue;}
                if("TR"!=node.childNodes[i].tagName){
                    log("html", 0, D.wrapHTML(node),
                        tag+">"+childNodes[i].tagName);
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
            // cache elements ids for label test.
            if(D.hasAttr(node, "id")){
                id = M.S.trim(node.getAttribute("id"));
                if(""==id){
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
            // <p>
            if(!context.ps.empty() || !context.pres.empty()){
                if(!inline[node.tagName]){
                    log("html", 0, "p>"+D.wrapHTML(node),
                        "p > inline element.", errorCodes.tagsIllegal,
                        errorCodes.tagsNestedIllegal);
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
            var charsetIllegal = true,
                meta = D.firstChild(node);
            // 在DOMReady时，任何浏览器都会有且仅有一个html,head,body标签，不多不少。
            // 对于IE，浏览器无论如何都会设置一个title，并将title放置是head的第一位。
            // 所以针对IE的charset检测是不准确的。
            if(M.Browser.ie){return;}
            if(meta && "META"!=meta.tagName &&
              (D.hasAttr(meta, "charset") ||
                (D.hasAttr(meta, "http-equiv") &&
                meta.getAttribute("http-equiv").toLowerCase()=="content-type" &&
                D.hasAttr(meta, "content") &&
                meta.getAttribute("content").indexOf("charset")>=0)
              )
            ){
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
            uri = URI.parse(src);
            if(checkProtocol && "https:" != uri.protocol){
                log("html", 0, D.wrapHTML(node), "protocol illegal.",
                    errorCodes.protocolIllegal);
            }
            res.js.push(URI.path(src));
        },
        "LINK": function(node){
            type = node.getAttribute("type");
            rel = node.getAttribute("rel");
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
            res.css.push(URI.path(node.getAttribute("href")));
        },
        "STYLE": function(node){
            // @see http://www.yesky.com/imagesnew/software/css/css2/a_import.html
            var re = /@import\s+[^;]+;/g,
                mat = node.innerHTML.match(re);
                // style 标签的嵌套。
                //tag = node.parentNode.tagName;
                //if(tag && tag != "HEAD"){
                    //log("html", 0, tag+">style",
                        //"style must be in the head.", errorCodes.tagsIllegal,
                        //errorCodes.tagsNestedIllegal);
                //}
                if(mat){
                    log("css", 0, mat.join(""), "using @import.",
                        errorCodes.cssIllegal, errorCodes.cssByImport);
                }
        },
        "IFRAME": validateFrames,
        "FRAME": validateFrames,
        "IMG": function(node){
            var attrs = [],
                uri = URI.parse(node.getAttribute("src"));
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
            res.img.push(URI.path(node.getAttribute("src")));
        },
        "OBJECT": function(node){
            context.objects.push(node);
            counter.objects++;
            if(D.hasAttr(node, "codebase")){
                uri = URI.parse(node.getAttribute("codebase"));
                if(checkProtocol && "https:"!=uri.protocol){
                    log("html", 0,
                        '<object codebase="'+node.getAttribute("codebase")+'"',
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
                var uri = URI.parse(node.getAttribute("value"));
                if(checkProtocol && "https:" != uri.protocol){
                    log("html", 0, D.wrapHTML(node),
                        "protocol illegal.", errorCodes.protocolIllegal);
                }
                res.fla.push(URI.path(node.getAttribute("value")));
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
            var uri=URI.parse(node.getAttribute("src"));
            if(checkProtocol && "https:"!=uri.protocol){
                log("html", 0, D.wrapHTML(node), "protocol illegal.",
                    errorCodes.protocolIllegal);
            }
            res.fla.push(URI.path(node.getAttribute("src")));
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

    var rules = [
        // checkHead, 检测头部信息
        function(){
            if("BackCompat" == document.compatMode){
                log0("html", document.doctype, errorCodes.doctypeIllegal);
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
                    log0("html", "文档头部需先设置编码");
                }
            }else{
                // document.charset
            }
            // 检测文档中的title设置。
            var tt = document.getElementsByTagName("title");
            var reEmpty=/^(?:\s|\r|\n)*$/;
            // 针对非IE有效。
            if(1 != tt.length){
                log0("html", "文档未设置，或设置了多个title");
            }
            if(reEmpty.test(tt[0].innerHTML)){
                log0("html", "文档title未设置名称");
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
                    log0("html", tag+">style", errorCodes.tagsNestedIllegal);
                }
                mat = styles[i].innerHTML.match(re);
                if(mat){
                    log0("css", mat.join(""), errorCodes.styleWithImport);
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
                log0("html", repeatIDs.join(","), errorCodes.idRepeated);
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
                for(var i=0,uri,tag,l=script.length; i<l; i++){
                    tag = script[i].parentNode.tagName.toLowerCase();
                    if("body" != tag){
                        log0("html", tag+">script", errorCodes.tagsNestedIllegal);
                    }
                    if(!D.hasAttr(script[i], "src")){continue;}
                    if(!D.hasAttr(script[i], "charset")){
                        log0("html", D.wrapHTML(script[i]), errorCodes.charsetIllegal);
                    }
                    uri = URI.parse(script[i].getAttribute("src"));
                    if(checkProtocol && "https:" != uri.protocol){
                        log0("html", D.wrapHTML(script[i]), errorCodes.protocolIllegal);
                    }
                    res.js.push(script[i].getAttribute("src"));
                }
                for(var i=0,tag,l=link.length; i<l; i++){
                    type = link[i].getAttribute("type");
                    rel = link[i].getAttribute("rel");
                    uri = URI.parse(link[i].getAttribute("href"));
                    tag = link[i].parentNode.tagName.toLowerCase();
                    if("head" != tag){
                        log0("html", tag+">link", errorCodes.tagsNestedIllegal);
                    }
                    // All links need rel attr.
                    if(!D.hasAttr(link[i], "rel")){
                        log0("html", D.outerHTML(link[i]), errorCodes.relIllegal);
                        continue;
                    }
                    // favicon, stylesheet, ...
                    if(checkProtocol && "https:" != uri.protocol){
                        log0("html", D.outerHTML(link[i]), errorCodes.protocolIllegal);
                    }
                    // link[rel=stylesheet]
                    if("stylesheet" != link[i].getAttribute("rel")){continue;}
                    //if("text/css" != type){
                        //log0("html", "外部CSS没有设置type属性。");
                    //}
                    if(!D.hasAttr(link[i], "charset")){
                        log0("html", D.outerHTML(link[i]), errorCodes.charsetIllegal);
                    }
                    res.css.push(link[i].getAttribute("href"));
                }
                for(var i=0,l=img.length; i<l; i++){
                    var attrs = [];
                    uri=URI.parse(img[i].src);
                    if(checkProtocol && "https:" != uri.protocol){
                        log0("html", D.outerHTML(img[i]), errorCodes.protocolIllegal);
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
                    if(attrs.length>0){
                        log0("html", "图片缺少"+attrs.join()+"属性。"+D.outerHTML(img[i]), errorCodes.attrIllegal);
                    }
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
                        log0("html", D.outerHTML(frames[i]), errorCodes.protocolIllegal);
                    }
                    try{
                        // TRY: 避免跨域异常。
                        //
                        // 对于每个内部页面都有引入检测脚本的情况下，
                        // 递归进嵌套的页面是没有必要的。
                        // 但作为测试，没有在每个内嵌页面引入检测脚本。
                        // 可以先判断内嵌页面中是否有存在DOMLint对象，有则不递归。
                        if(frames[i].contentWindow.monitor.DOMLint){continue;}
                        check(frames[i].contentWindow);
                    }catch(ex){}
                }
                for(var i=0,l=object.length; i<l; i++){
                    if(D.hasAttr(object[i], "codebase")){
                        uri = URI.parse(object[i].getAttribute("codebase"));
                        if(checkProtocol && "https:"!=uri.protocol){
                            log0("html", '<object codebase="'+object[i].getAttribute("codebase")+'"', errorCodes.protocolIllegal);
                        }
                    }
                    var params=object[i].getElementsByTagName("param");
                    for(var j=0,m=params.length; j<m; j++){
                        if("movie"==params[j].getAttribute("name") ||
                          "src"==params[j].getAttribute("src")){
                            uri=URI.parse(params[j].getAttribute("value"));
                            if(checkProtocol && "https:" != uri.protocol){
                                log0("html", D.outerHTML(params[j]), errorCodes.protocolIllegal);
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
                        log0("html", D.outerHTML(embed[i]), errorCodes.protocolIllegal);
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
                            log0("html", "id不合法。"+html, errorCodes.formElementNameIllegal);
                        }
                        fs_elems_ids["ID_"+id] = true;
                    }
                    if(elems[j].type=="submit"){
                        if(++submitCount == 1){continue;}
                    }
                    if(!D.hasAttr(elems[j], "name")){
                        log0("html", "缺少name属性。"+html, errorCodes.formElementWithoutName);
                    }
                    name = elems[j].getAttribute("name");
                    if("submit"==name || "id"==name){
                        log0("html", "name不合法。"+html, errorCodes.formElementNameIllegal);
                    }
                    // XXX: 表单不允许有多个 submit?
                }
            }
            // 检测文档中的label标签是否有添加for属性
            var labs = document.getElementsByTagName("label");
            for(var i=0,id,html,l=labs.length; i<l; i++){
                html = D.outerHTML(labs[i]);
                if(!D.hasAttr(labs[i], "for")){
                    log0("html", "缺少for属性。"+html, errorCodes.labelWithoutForAttr);
                    continue;
                }
                id = labs[i].getAttribute("for");
                if(!id){
                    log0("html", "for缺少属性值。"+html, errorCodes.labelWithoutForName);
                    continue;
                }
                if(!fs_elems_ids["ID_"+id]){
                    log0("html", "for指向的id不存在。"+html, errorCodes.labelForNameNotExist);
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
                    log0("html", elems[i].parentNode.tagName+">"+elems[i].tagName+": "+D.wrapHTML(elems[i]), errorCodes.tagsNestedIllegal)
                }
                for(var j=0,m=inlinejs.length; j<m; j++){
                    if(D.hasAttr(elems[i], inlinejs[j])){
                        log0("html", D.wrapHTML(elems[i]), errorCodes.inlineJS);
                    }
                }
                if(D.hasAttr(elems[i], "style")){
                    log0("html", D.wrapHTML(elems[i]), errorCodes.inlineCSS);
                }
            }
            // We can't check tag p in p on the DOM.
            // document.getElementsByTagName("p")[i].getElementsByTagName("p").length;
            // ul>li, ol>li
            var li = document.getElementsByTagName("li");
            for(var i=0,tag,l=li.length; i<l; i++){
                tag = li[i].parentNode.tagName.toLowerCase();
                if("ul"!=tag && "ol"!=tag){
                    log0("html", tag+">"+D.wrapHTML(li[i]), errorCodes.tagsNestedIllegal);
                }
            }
            // dl>dt
            var dt = document.getElementsByTagName("dt");
            for(var i=0,tag,l=dt.length; i<l; i++){
                if("dl" != dt[i].parentNode.tagName.toLowerCase()){
                    log0("html", D.wrapHTML(dt[i]), errorCodes.tagsNestedIllegal);
                }
            }
            // dl>dd
            var dd = document.getElementsByTagName("dd");
            for(var i=0,tag,l=dd.length; i<l; i++){
                if("dl" != dd[i].parentNode.tagName.toLowerCase()){
                    log0("html", D.wrapHTML(dd[i]), errorCodes.tagsNestedIllegal);
                }
            }
            // tr>td
            var td = document.getElementsByTagName("td");
            for(var i=0,tag,l=td.length; i<l; i++){
                if("tr" != td[i].parentNode.tagName.toLowerCase()){
                    log0("html", D.wrapHTML(td[i]), errorCodes.tagsNestedIllegal);
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
                    log0("html", href, errorCodes.linksHrefIllegal);
                }
                // XXX: 站内地址检测是否有效(404)，仅限于SIT环境。
            }
        }
    ];
    window.monitor.DOMLint = {
        parse: function(doc){
            if(!doc){doc = document;}

            var t0 = new Date();
            for(var i=0,l=rules.length; i<l; i++){
                rules[i].call(this);
            }
            t0 = new Date() - t0;

            var t1 = new Date();
            walk(doc, preProcessing, {});
            walk(doc, rules_tags_enter, rules_tags_leave);
            t1 = new Date() - t1;

            if(M.debug && window.console && window.console.log){
                window.console.log("Old Time: ", t0);
                window.console.log("New Time: ", t1);
            }

            return {
                res: {
                    css: res.css,
                    js : res.js,
                    img: res.img,
                    fla: res.fla
                },
                htmlSize: window.monitor.S.byteLength(D.outerHTML(document.documentElement)),
                htmlErr: htmlErrors
            }
        }
    };
	function makeMap(str){
		var obj = {}, items = str.split(",");
		for ( var i = 0; i < items.length; i++ )
			obj[ items[i] ] = true;
		return obj;
	}
})();
