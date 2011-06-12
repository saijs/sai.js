/*
 * HTML Parser By John Resig (ejohn.org)
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 *
 * // Use like so:
 * HTMLParser(htmlString, {
 *     doctype: function(tag, xml, version, type){},
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     chars: function(text) {},
 *     comment: function(text) {}
 * });
 *
 * // or to get an XML string:
 * HTMLtoXML(htmlString);
 *
 * // or to get an XML DOM Document
 * HTMLtoDOM(htmlString);
 *
 * // or to inject into an existing document/DOM node
 * HTMLtoDOM(htmlString, document);
 * HTMLtoDOM(htmlString, document.body);
 *
 * TODO: innerHTML
 * TODO: flash, wmode=transparent|...
 * XXX: rules = {
 *          "!DOCTYPE":function(elem, html, dom){},
 *          "!--":function(elem, html, dom){},
 *          "html":function(elem, html, dom){},
 *          "form":function(elem, html, dom){}
 *      }
 * TODO: isLower tagName? in parser.
 *
 */

window.monitor.HTMLint = (function(){
    var URI         = window.monitor.URI,
        S           = window.monitor.S,
        debug       = window.monitor.debug,
        errorCodes  = window.monitor.htmlErrorCodes,
        checkProtocol = window.monitor.checkProtocol,
        htmlErrors  = [],
        res         = {
            img: [],
            css: [],
            js : [],
            fla: []
        };

    function log(type, line, source, msg, code){
        source = window.monitor.S.trim(source);
        if(debug && window.console && window.console.log){window.console.log("HTMLint: line:"+line+", "+"code:"+code+", message:"+msg+", source:"+source+"");}
        htmlErrors.push({ln:line, err:code, code:encodeURIComponent(source)});
    }

    // HTML Node Object.
    var Node = function(){
        this.tagName = null;
        this.startTag = null;
        this.endTag = null;
        this.attrs = {};
        this.selfClose = false;
        this.startLine = 0;
        this.endLine = 0;
        this.childNodes = [];
        this.parentNode = null;
    };
    Node.prototype.hasAttribute = function(name){
        return this.attrs.hasOwnProperty(name);
    };
    Node.prototype.setAttribute = function(name, value){
        this.attrs[name] = value;
    };
    Node.prototype.getAttribute = function(name){
        return this.hasAttribute(name) ? this.attrs[name] : null;
    };
    Node.prototype.removeAttribute = function(name){
        this.attrs[name] = null;
        delete this.attrs[name];
    };
    Node.prototype.attributes = function(){
        var a = [];
        for(var k in this.attrs){
            if(this.attrs.hasOwnProperty(k)){
                a.push(k);
            }
        }
        return a;
    };
    Node.prototype.appendChild = function(node){
        if(!(node instanceof Node)){throw new TypeError("required Node object.");}
        node.parentNode = this;
        this.childNodes.push(node);
    };
    // TODO: innerHTML
    Node.prototype.innerHTML = function(){};
    Node.prototype.getElementsByTagName = function(tagName){
        tagName = tagName.toLowerCase();
        var a = [];
        for(var i=0,l=this.childNodes.length; i<l; i++){
            if((this.childNodes[i].tagName && this.childNodes[i].tagName == tagName) ||
              tagName == "*"){
                a.push(this.childNodes[i]);
            }
            // a = a.concat(this.childNodes[i].getElementsByTagName(tagName));
            Array.prototype.push.apply(a, this.childNodes[i].getElementsByTagName(tagName));
        }
        return a;
    };

	// Regular Expressions for parsing tags and attributes
	var startTag = /^<(\w+)((?:\s+[\w:-]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/,
		endTag = /^<\/(\w+)[^>]*>/,
		attr = /([\w:-]+)(?:\s*=\s*((?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g,
        reDoctype = /^<!doctype\s[^>]+>/i,
        reDoctypeSniffing = /^<!DOCTYPE\s+HTML\sPUBLIC\s+"\-\/\/W3C\/\/DTD\s+(X?HTML)\s+([\d.])+(?:\s+(\w+))?\/\/EN"\s+"[^"]+">/i,
        reDoctypeHTML5 = /^<!DOCTYPE\s+HTML>/i,
        newLine = /\r\n|\r|\n/;

	// Empty Elements - HTML 4.01
	var empty = makeMap("area,base,basefont,br,col,frame,hr,img,input,isindex,link,meta,param,embed");

	// Block Elements - HTML 4.01
	var block = makeMap("address,applet,blockquote,button,center,dd,del,dir,div,dl,dt,fieldset,form,frameset,hr,iframe,ins,isindex,li,map,menu,noframes,noscript,object,ol,p,pre,script,table,tbody,td,tfoot,th,thead,tr,ul");

	// Inline Elements - HTML 4.01
	var inline = makeMap("a,abbr,acronym,applet,b,basefont,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var");

	// Elements that you can, intentionally, leave open
	// (and which close themselves)
	var closeSelf = makeMap("colgroup,dd,dt,li,option,p,td,tfoot,th,thead,tr");

	// Attributes that have their values filled in disabled="disabled"
	var fillAttrs = makeMap("checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected");

	// Special Elements (can contain anything)
    var sp = "script,style,textarea,xmp";
	var special = makeMap(sp);
    var regexp_special = makeRegExp(sp);
    function makeRegExp(tags){
        var re = {};
        tags = tags.split(",");
        for(var i=0,l=tags.length; i<l; i++){
            re[tags[i]] = new RegExp("(.*)?<\/" + tags[i] + "[^>]*>", "i");
        }
        return re;
    }

	var HTMLParser = function( html, handler ) {
        // stack = [{line:1, tag:"<div id=\"demo\">", tagName:"div"}]
		var index, match, stack = [], last = html;
		stack.last = function(){
			return this[ this.length - 1 ];
		};
        var line=1;
        var lines = [""].concat(html.replace(/\r\n|\r|\n/g, "\n").split("\n"));
        var dom = new Node();
        var currNode = dom;

		while ( html ) {

			// Make sure we're not in a script or style element
			if ( !stack.last() || !special[ stack.last().tagName ] ) {

                if(reDoctype.test(html)){
                    match = html.match(reDoctype);
                    html = html.substring(match[0].length);
                    if(reDoctypeHTML5.test(match[0])){
                        parseDoctype(match[0], "HTML", 5, "");
                    }else if(reDoctypeSniffing.test(match[0])){
                        match[0].replace(reDoctypeSniffing, parseDoctype);
                    }

                    node = new Node();
                    node.startTag = match[0];
                    node.tagName = "!DOCTYPE";
                    node.startLine = line;
                    node.endTag = ">";
                    currNode.appendChild(node);

                    line += getLine(match[0]);
                    node.endLine = line;
				// Comment
				}else if ( html.indexOf("<!--") == 0 ) {
					index = html.indexOf("-->");

					if ( index >= 4 ) {
						if ( handler.comment )
							handler.comment( html.substring( 4, index ) );

                        node = new Node();
                        node.startTag = "<!--";
                        node.innerHTML = html.substring(4, index);
                        node.tagName = "!--";
                        node.startLine = line;
                        node.endTag = "-->";
                        currNode.appendChild(node);

                        line += getLine(html.substring(0, index));
                        node.endLine = line;
						html = html.substring( index + 3 );
                    }else{
                        log("html", line, lines[line], "comment unclosed.", errorCodes.syntaxError);
                        index = html.indexOf("\n");
                        html = html.substring(index);
                    }

				// end tag
				} else if ( html.indexOf("</") == 0 ) {
					match = html.match( endTag );

					if ( match ) {
						html = html.substring( match[0].length );
						match[0].replace( endTag, parseEndTag );
                        line += getLine(match[0]);
                    }else{
                        log("html", line, lines[line], "tag "+stack.last().tagName+" unclosed.", errorCodes.syntaxError);
                        index = html.indexOf("<");
                        line += getLine(html.substring(0, index));
                        html = html.substring(index);
                    }

				// start tag
				} else if ( html.indexOf("<") == 0 ) {
					match = html.match( startTag );

					if ( match ) {
						html = html.substring( match[0].length );
						match[0].replace( startTag, parseStartTag );
                        line += getLine(match[0]);
                    }else{
                        log("html", line, lines[line], "tag unclosed.", errorCodes.syntaxError);
                        index = html.indexOf("<", 1);
                        if(index > -1){
                            line += getLine(html.substring(0, index));
                            html = html.substring(index);
                        }else{
                            // Clean up any remaining tags
                            parseEndTag();
                            return dom;
                        }
                    }
				}else{
					index = html.indexOf("<");

					var text = index < 0 ? html : html.substring( 0, index );
					html = index < 0 ? "" : html.substring( index );

					if ( handler.chars )
						handler.chars( text );

                    if(index < 0){
                        // Clean up any remaining tags
                        parseEndTag();
                        return dom;
                    }
                    line += getLine(text);
				}

			} else {
                var t = "</"+stack.last().tagName+">";
                // toLowerCase() 用于避免标签大小写不同，空格等会造成问题。
                // 正则表达式非贪婪匹配 `(?:.|\s)*?</tagName>` 对于大脚本段的回溯会有性能问题。
                index = html.toLowerCase().indexOf(t);
                if(index >= 0){
                    var text = html.substring(0, index);
                    if(handler.chars){
                        handler.chars(text);
                    }
                    currNode.innerHTML = text;
                    line += getLine(text);
                    html = html.substring(index);
                }else{
                    log("html", line, lines[line], "tag "+stack.last().tagName+" unclosed.", errorCodes.tagsIllegal, errorCodes.tagUnclosed);
                }
				//html = html.replace(regexp_special[stack.last().tagName], function(all, text){
					//text = text.replace(/<!--(.*?)-->/g, "$1")
						//.replace(/<!\[CDATA\[(.*?)]]>/g, "$1");

					//if ( handler.chars )
						//handler.chars( text );

                    //currNode.innerHTML = text;
					//return "";
				//});

				parseEndTag( "", stack.last().tagName );
                html = html.substring(t.length);
			}

            if ( html == last ){
                log("html", line, lines[line], "Parse Error.", errorCodes.tagsIllegal, errorCodes.tagUnclosed);

                return dom;
            }
			last = html;
		}

		// Clean up any remaining tags
		parseEndTag();

        return dom;

        function getLine(str){
            var m = str.match(/\r\n|\r|\n/g);
            return m ? m.length : 0;
        }
        // doctype sniffing.
        function parseDoctype(tag, xml, ver, type){
            if(handler.doctype){
                handler.doctype(tag, xml+" "+ver+" "+type);
            }
        }


        /**
         * @param tag, like <div id="demo" onclick="alert(0);">
         * @param tagName, like div.
         * @param rest, attrs like id="demo" onclick="alert(0);"
         * @param unary, / if self close tags like <p />
         */
		function parseStartTag( tag, tagName, rest, unary ) {
            if(!window.monitor.S.isLower(tagName)){
                log("html", line, tag, "tagName must be lowerCase.",
                    errorCodes.tagsIllegal);
            }
            var node = new Node();
            node.startTag = tag;
            node.startLine = line;
            node.tagName = tagName.toLowerCase();
            currNode.appendChild(node);

            //! Err...
			//if ( block[ tagName ] ) {
				//while ( stack.last() && inline[ stack.last().tagName ] ) {
					//parseEndTag( "", stack.last().tagName );
				//}
			//}

			if ( closeSelf[ tagName ] && stack.last().tagName == tagName ) {
                log("html", line, stack.last().tag+"..."+lines[line], stack.last().tagName+" unclosed.", errorCodes.tagsIllegal, errorCodes.tagUnclosed);
				parseEndTag( "", tagName );
			}

            if(empty[tagName] && !unary){
                log("html", line, lines[line], tagName+" unclosed.", errorCodes.tagsIllegal, errorCodes.tagUnclosed);
            }
			unary = empty[tagName] || !!unary;

            if ( !unary ){
				stack.push({"line": line, "tagName": tagName, "tag": tag});
                currNode = node;
            }

            var attrs = [], attrCache={};

            rest.replace(attr, function(match, name) {
                if(attrCache.hasOwnProperty(name)){
                    log("html", line, lines[line], tagName+"["+name+"] duplicated.", errorCodes.attrIllegal);
                }
                attrCache[name] = true;

                if(!arguments[2]){
                    // Attribute without value.
                    if(!fillAttrs[name]){
                    log("html", line, lines[line], tagName+"["+name+"] missing value.", errorCodes.attrIllegal);
                    }
                }else if(!(window.monitor.S.startsWith(arguments[2], '"') && window.monitor.S.endsWith(arguments[2], '"')) &&
                  !(window.monitor.S.startsWith(arguments[2], "'") && window.monitor.S.endsWith(arguments[2], "'"))){
                    log("html", line, lines[line], tagName+"["+name+"] missing quotes.", errorCodes.attrIllegal);
                }
                var value = arguments[3] ? arguments[3] :
                    arguments[4] ? arguments[4] :
                    arguments[5] ? arguments[5] :
                    fillAttrs[name] ? name : "";

                attrs.push({
                    name: name,
                    value: value,
                    escaped: value.replace(/(^|[^\\])"/g, '$1\\\"') //"
                });
                node.setAttribute(name, value);
            });

            if ( handler.start )
                handler.start( tagName, attrs, unary );
		}

        /**
         * @param {String} tag, like </p>, optional.
         * @param {String} tagName, like p.
         */
		function parseEndTag( tag, tagName ) {
			// If no tag name is provided, clean shop
            if(!tagName){
                for ( var pos = stack.length - 1; pos >= 0; pos-- ){
                    log("html", stack[pos].line, lines[line], "tag "+stack[pos].tagName+" unclosed.", errorCodes.tagsIllegal, errorCodes.tagUnclosed);

                    //!stack.pop();
                    currNode.endTag = tag;
                    currNode.endLine = line;
                    currNode = currNode.parentNode;
                }
            }else{
                if(!window.monitor.S.isLower(tagName)){
                    log("html", line, tag, "tagName must be lowerCase.",
                        errorCodes.tagsIllegal);
                }
                if(stack.last().tagName.toLowerCase() == tagName.toLowerCase()){
                    if(handler.end){
                        handler.end(stack.last().tagName);
                    }
                    stack.pop();

                    currNode.endTag = tag;
                    currNode.endLine = line;
                    currNode  = currNode.parentNode;
                }else{
                    log("html", line, lines[stack.last().line], "tag "+stack.last().tagName+" unclosed."+tagName, errorCodes.tagsIllegal, errorCodes.tagUnclosed);
                }
            }
		}
	};

    var HTMLint = function(html){
        var t0 = new Date();
        var dom = HTMLParser(html, {});
        if(window.monitor.debug && window.console && window.console.log){
            window.console.log("HTMLParse time: "+(new Date()-t0)+"ms.");
        }

        var t1 = new Date();
        lint(dom);
        if(window.monitor.debug && window.console && window.console.log){
            window.console.log("HTMLint time: "+(new Date()-t1)+"ms.");
        }

        return {
            res: res,
            htmlError: htmlErrors
        };
    };
    //! linter v2.
    // XXX: getElementsByTagName(*, callback) to walk.
    function walk(node, enter, leave){
        if(!node){return;}

        var tagName = node.tagName;
        // root node is virtual node, without tagName...
        if(enter && tagName){
            if("function"==typeof(enter["*"])){
                enter["*"](node);
            }
            if(tagName in enter && "function"==typeof(enter[tagName])){
                enter[tagName](node);
            }
        }

        if(node.childNodes && node.childNodes.length){
            for(var i=0,l=node.childNodes.length; i<l; i++){
                walk(node.childNodes[i], enter, leave);
            }
        }

        if(leave && tagName){
            if(tagName in leave && "function"==typeof(leave[tagName])){
                leave[tagName](node);
            }
            if("function"==typeof(leave["*"])){
                leave["*"](node);
            }
        }
    }
    Node.prototype.walk = function(enter, leave){
        var tagName = this.tagName;
        if(enter && tagName){
            if(enter.hasOwnProperty("*") && "function"==typeof(enter["*"])){
                enter["*"](this);
            }
            if(enter.hasOwnProperty(tagName) && "function"==typeof(enter[tagName])){
                enter[tagName](this);
            }
        }

        for(var i=0,l=this.childNodes.length; i<l; i++){
            this.childNodes[i].walk(enter, leave);
        }

        if(leave && tagName){
            if(leave.hasOwnProperty(tagName) && "function"==typeof(leave[tagName])){
                leave[tagName](this);
            }
            if(leave.hasOwnProperty("*") && "function"==typeof(leave["*"])){
                leave["*"](this);
            }
        }
    };

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
            submits: 0
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
            log("html", node.startLine, node.startTag, "protocol illegal.",
                errorCodes.protocolIllegal);
        }
    }
    // validate <input>, <button>, <select>, <textarea>.
    function validateFormElements(node){
        // TODO: donot validate button's name missed.
        if("noform"==getFormName()){
            console.log("noform: "+node.startTag)
        }
        var html = getFormName() + " " + node.startTag;
        if(node.hasAttribute("id")){
            id = node.getAttribute("id");
            if("id"==id || "submit"==id){
                log("html", node.startLine, html, "id不合法。",
                    errorCodes.formElementNameIllegal);
            }
        }
        if(!node.hasAttribute("name")){
            var type;
            if(node.hasAttribute("type")){
                type = node.getAttribute("type");
            }else if("button" == node.tagName){
                type = "button";
            }
            if("button"==type || "submit"==type || "image"==type){
                log("html", node.startLine, html,
                    "missing attribute: [name].", errorCodes.attrIllegal);
            }
            return;
        }
        var name = node.getAttribute("name");
        if("submit"==name || "id"==name){
            log("html", node.startLine, html,
                "[name] attribute illegal.", errorCodes.attrIllegal);
        }
    }
    function getFormName(){
        var fm = context.forms.last(),
            fn = "document.forms["+counter.forms+"]";
        if(!fm){
            fn = "noform";
        }else if(fm.hasAttribute("id")){
            fn = "form#"+fm.getAttribute("id");
        }else if(fm.hasAttribute("name")){
            fn = "form[name="+fm.getAttribute("id")+"]";
        }
        return fn;
    }
    // validate <input>, <button>.
    function validateButtons(node){
        var html = getFormName()+": "+node.startTag;

        if(node.hasAttribute("type")){
            // XXX: 表单不允许有多个 submit?
            //type = node.getAttribute("type").toLowerCase();
            //if(type=="submit" && (++counter.submits > 1)){
                //log("html", html, node.startTag,
                    //"too much more submit buttons.",
                    //errorCodes.tagsIllegal);
            //}
        }else{
            log("html", html, node.startTag,
                "missing attribute: [type].", errorCodes.attrIllegal);
        }
        validateFormElements(node);
    }
    // validate <ol>, <ul>.
    function validateList(node){
        for(var i=0,l=node.childNodes.length; i<l; i++){
            if("li" != node.childNodes[i].tagName){
                log("html", node.startLine,
                    node.tagName+">"+node.childNodes[i].startTag,
                    "ul,ol 中嵌套 li", errorCodes.tagsIllegal,
                    errorCodes.tagsNestedIllegal);
            }
        }
    }
    // validate <dt>, <dd>.
    function validateDefinedItem(node){
        if("dl" != node.parentNode.tagName){
            log("html", node.startLine,
                node.parentNode.tagName+">"+node.startTag,
                "dl 中嵌套 dt", errorCodes.tagsIllegal,
                errorCodes.tagsNestedIllegal);
        }
    }
    // validate <thead>, <tbody>, <tfoot>, <caption>, <colgroup>, <col>.
    function validateTables(node){
        var tag = node.parentNode.tagName;
        if("table"!=tag){
            log("html", node.startLine, node.startTag,
                tag+">"+node.tagName, errorCodes.tagsNestedIllegal);
        }
        // TODO: validate childNodes for thead, tbody, tfoot.
    }
    // vali  <th>, <td>.
    function validateTableCell(node){
        var tag = node.parentNode.tagName;
        if("tr" != tag){
            log("html", node.startLine, tag+">"+node.startTag,
                tag+">"+node.tagName, errorCodes.tagsIllegal,
                errorCodes.tagsNestedIllegal);
        }
    }

    var duplicateIDs=[], duplicateIDsCache={};
    var inlinejs = ("onclick,onblur,onchange,oncontextmenu,ondblclick,onfocus,"+
        "onkeydown,onkeypress,onkeyup,onmousedown,onmousemove,onmouseout,"+
        "onmouseover,onmouseup,onresize,onscroll,onload,onunload,onselect,"+
        "onsubmit,onbeforecopy,oncopy,onbeforecut,oncut,onbeforepaste,onpaste,"+
        "onbeforeprint,onpaint,onbeforeunload").split(",");
    var preProcessing = {
        "*": function(node){
            // cache elements ids for label test.
            if(node.hasAttribute("id")){
                id = window.monitor.S.trim(node.getAttribute("id"));
                if(""==id){
                    log("html", node.startLine, node.startTag,
                        node.tagName+"[id="+id+"]", errorCodes.attrIllegal);
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
                if(node.hasAttribute(inlinejs[j])){
                    log("html", node.startLine,
                        node.startTag, "inline js.", errorCodes.inlineJS);
                    break;
                }
            }
            if(node.hasAttribute("style")){
                log("html", node.startLine, node.startTag, "inline css.",
                    errorCodes.inlineCSS);
            }
            // <p>
            if(context.ps.length || context.pres.length){
                switch(node.tagName){
                case "a":
                case "br":
                case "code":
                case "em":
                case "span":
                case "strong":
                    break;
                default:
                    log("html", node.startLine, "p>"+node.startTag,
                        "tags in p just a,em,span,strong.",
                        errorCodes.tagsIllegal,
                        errorCodes.tagsNestedIllegal);
                }
            }
        },
        "!DOCTYPE": function(node){
            counter.doctypes++;
        },
        //"!--": function(node){
            //var reSpaceLeft = /^\s+/, reSpaceRight = /\s+$/;
            //if(!reSpaceLeft.test(elems[i].innerHTML) ||
                // !reSpaceRight.test(elems[i].innerHTML)){
                //var cmt = elems[i].innerHTML;
                //log("html", elems[i].startLine,
                    //elems[i].startTag+(cmt.length<20?cmt:cmt.substr(0,20)+"...")+
                    //elems[i].endTag, "comment required space at start and end.",
                    //errorCodes.commentIllegal);
            //}
        //},
        "head": function(){
            counter.heads++;
            context.heads.push(node);
            // check the document.charset
            var charsetIllegal = true,
                meta = node.childNodes[0];
            if(node.childNodes.length > 0 &&
              "meta"!=node.childNodes[0].tagName &&
              (meta.hasAttribute("charset") ||
                (meta.hasAttribute("http-equiv") &&
                meta.getAttribute("http-equiv").toLowerCase()=="content-type" &&
                meta.hasAttribute("content") &&
                meta.getAttribute("content").indexOf("charset")>=0)
              )
            ){
                log("html", meta.startLine, "document charset illegal.",
                    "missing document charset");
            }
        },
        "title": function(node){
            counter.titles++;
            // TODO: check title not empty.
            //if(re_empty.test(node.innerHTML)){}
        },
        "meta": function(node){
            counter.metas++;
        },
        "form": function(node){
            if(!context.forms.empty()){
                log("html", node.startLine, "form "+node.startTag,
                    "form nested illegal.", errorCodes.tagsIllegal,
                    errorCodes.tagsNestedIllegal);
            }
            context.forms.push(node);
            counter.forms++;
        },
        "input":  validateButtons,
        "button": validateButtons,
        "select":   validateFormElements,
        "textarea": validateFormElements,
        "label": function(node){
            var html = node.startTag;
            if(!node.hasAttribute("for")){
                log("html", node.startLine, html,
                    "missing attribute: [for]", errorCodes.attrIllegal);
                return;
            }
            var id = node.getAttribute("for");
            if(re_empty.test(id)){
                log("html", node.startLine, html,
                    "attribute [for] missing a value.", errorCodes.attrIllegal);
                return;
            }
            if(!duplicateIDsCache.hasOwnProperty("ID_"+id)){
                log("html", node.startLine, html,
                    "#"+id+" element not exist.", errorCodes.attrIllegal);
                return;
            }
        },
        "script": function(node){
            // validate [type] attribute.
            //if(!node.hasAttribute("type")){
                //log("html", node.startLine, node.startTag,
                    //"missing [type] attribute.", errorCodes.attrIllegal);
            //}
            if(!node.hasAttribute("src")){return;}
            var src = node.getAttribute("src");

            if(!node.hasAttribute("charset")){
                log("html", node.startLine, node.startTag, "missing charset.",
                    errorCodes.charsetIllegal);
            }
            uri = URI.parse(src);
            if(checkProtocol && "https:" != uri.protocol){
                log("html", node.startLine, node.startTag, "protocol illegal.",
                    errorCodes.protocolIllegal);
            }
            res.js.push(URI.path(src));
        },
        "link": function(node){
            type = node.getAttribute("type");
            rel = node.getAttribute("rel");
            uri = URI.parse(node.getAttribute("href"));
            // link 标签的嵌套。
            //tag = node.parentNode.tagName.toLowerCase();
            //if("head" != tag){
                //log("html", node.startLine, tag+">"+node.startTag,
                    //"tags nested error.", errorCodes.tagsIllegal,
                    //errorCodes.tagsNestedIllegal);
            //}
            // All links need rel attr.
            if(!node.hasAttribute("rel")){
                log("html", node.startLine, node.startTag, "missing [rel]",
                    errorCodes.attrIllegal);
                return;
            }
            // favicon, stylesheet, ...
            if(checkProtocol && "https:" != uri.protocol){
                log("html", node.startLine, node.startTag, "protocol illegal.",
                    errorCodes.protocolIllegal);
            }
            // link[rel=stylesheet]
            if("stylesheet" != node.getAttribute("rel")){return;}
            //if("text/css" != type){
                //log("html", node.startLine, node.startTag,
                    //"link[rel=stylesheet] missing [type].",
                    //errorCodes.attrIllegal);
            //}
            if(!node.hasAttribute("charset")){
                log("html", node.startLine, node.startTag, "missing charset.",
                    errorCodes.charsetIllegal);
            }
            res.css.push(URI.path(node.getAttribute("href")));
        },
        "style": function(node){
            // @see http://www.yesky.com/imagesnew/software/css/css2/a_import.html
            var re = /@import\s+[^;]+;/g,
                mat = node.innerHTML.match(re);
                // style 标签的嵌套。
                //tag = node.parentNode.tagName;
                //tag = node.parentNode.tagName;
                //if(tag && tag.toLowerCase() != "head"){
                    //log("html", node.startLine, tag+">style",
                        //"style must be in the head.", errorCodes.tagsIllegal,
                        //errorCodes.tagsNestedIllegal);
                //}
                if(mat){
                    log("css", node.startLine, mat.join(""), "using @import.",
                        errorCodes.cssIllegal, errorCodes.cssByImport);
                }
        },
        "iframe": validateFrames,
        "frame": validateFrames,
        "img": function(node){
            var attrs = [],
                uri = URI.parse(node.getAttribute("src"));
            if(checkProtocol && "https:" != uri.protocol){
                log("html", node.startLine, node.startTag, "protocol illegal.",
                    errorCodes.protocolIllegal);
            }
            if(!node.hasAttribute("alt") ||
              re_empty.test(node.getAttribute("alt"))){
                attrs.push("alt");
            }
            //if(!node.hasAttribute("width") ||
              // !re_number.test(node.getAttribute("width"))){
                //attrs.push("width");
            //}
            //if(!node.hasAttribute("height") ||
              // !re_number.test(node.getAttribute("height"))){
                //attrs.push("height");
            //}
            if(attrs.length>0){
                log("html", node.startLine, node.startTag,
                    "missing "+attrs.join(), errorCodes.attrIllegal);
            }
            res.img.push(URI.path(node.getAttribute("src")));
        },
        "object": function(node){
            context.objects.push(node);
            counter.objects++;
            if(node.getAttribute("codebase")){
                uri = URI.parse(node.getAttribute("codebase"));
                if(checkProtocol && "https:"!=uri.protocol){
                    log("html", node.startLine,
                        '<object codebase="'+node.getAttribute("codebase")+'"',
                        "protocol illegal.", errorCodes.protocolIllegal);
                }
            }
        },
        "param": function(node){
            //if("wmode"==node.getAttribute("name")){
                //var wmode = node.getAttribute("name").toLowerCase();
                //if("transparent"!=wmode || "opaque"!=wmode){
                //log("html", node.startLine, node.startTag,
                    //"WARNING: param[name=wmode][value="+wmode+"].",
                    //errorCodes.attrIllegal);
                //}
            //}
            if("movie"==node.getAttribute("name") ||
              "src"==node.getAttribute("src")){
                var uri = URI.parse(node.getAttribute("value"));
                if(checkProtocol && "https:" != uri.protocol){
                    log("html", node.startLine, node.startTag,
                        "protocol illegal.", errorCodes.protocolIllegal);
                }
                res.fla.push(URI.path(node.getAttribute("value")));
            }
        },
        "embed": function(node){
            //if(node.hasAttribute("wmode")){
                //var wmode = node.getAttribute("wmode").toLowerCase();
                //if("transparent"!=wmode || "opaque"!=wmode){
                //log("html", node.startLine, node.startTag,
                    //"WARNING: embed[wmode="+wmode+"].", errorCodes.attrIllegal);
                //}
            //}else{
                //log("html", node.startLine, node.startTag,
                    //"missing embed[wmode].", errorCodes.attrIllegal);
            //}
            if(!node.hasAttribute("src")){return;}
            var uri=URI.parse(node.getAttribute("src"));
            if(checkProtocol && "https:"!=uri.protocol){
                log("html", node.startLine, node.startTag, "protocol illegal.",
                    errorCodes.protocolIllegal);
            }
            res.fla.push(URI.path(node.getAttribute("src")));
        },
        "font": function(node){
            log("html", node.startLine, node.startTag, "tagName deprecated.",
                errorCodes.tagsIllegal, errorCodes.tagsDeprecated);
        },
        "s": function(node){
            log("html", node.startLine, node.startTag, "tagName deprecated.",
                errorCodes.tagsIllegal, errorCodes.tagsDeprecated);
        },
        "u": function(node){
            log("html", node.startLine, node.startTag, "tagName deprecated.",
                errorCodes.tagsIllegal, errorCodes.tagsDeprecated);
        },
        "p": function(node){
            context.ps.push(node);
        },
        "pre": function(node){
            context.pres.push(node);
        },
        "ul": validateList,
        "ol": validateList,
        "li": function(node){
            var tag = node.parentNode.tagName;
            if("ul"!=tag && "ol"!=tag){
                log("html", node.startLine, tag+">"+node.startTag,
                    "ul,ol 中嵌套 li", errorCodes.tagsIllegal,
                    errorCodes.tagsNestedIllegal);
            }
        },
        "dl": function(node){
            for(var i=0,tag,l=node.childNodes.length; i<l; i++){
                tag = node.childNodes[i].tagName;
                if("dt" != tag && "dd" != tag){
                  log("html", node.startLine, "dl>"+node.childNodes[i].startTag,
                      "dl 中嵌套 dt", errorCodes.tagsIllegal,
                      errorCodes.tagsNestedIllegal);
                }
            }
        },
        "dt": validateDefinedItem,
        "dd": validateDefinedItem,
        // @see http://www.w3schools.com/html/html_tables.asp
        "table": function(node){
            for(var i=0,tag,l=node.childNodes.length; i<l; i++){
                tag = node.childNodes[i].tagName;
                if("thead"!=tag && "tbody"!=tag && "tfoot"!=tag && "tr"!=tag ||
                  "caption"!=tag || "colgroup"!=tag || "col"!=tag){
                    log("html", node.startLine, node.startTag,
                        "table>"+tag, errorCodes.tagsNestedIllegal);
                }
            }
        },
        "caption": validateTables,
        "colgroup": validateTables,
        "col": validateTables,
        "thead": validateTables,
        "tbody": validateTables,
        "tfoot": validateTables,
        "tr": function(node){
            var tag = node.parentNode.tagName;
            if("table"!=tag && "thead"!=tag && "tbody"!=tag && "tfoot"!=tag){
                log("html", node.startLine, node.startTag,
                    tag+">"+node.tagName, errorCodes.tagsNestedIllegal);
            }
            for(var i=0,l=node.childNodes.length; i<l; i++){
                if("td" != node.childNodes[i].tagName){
                    log("html", node.startLine, node.startTag,
                        node.tagName+">"+node.childNodes[i].tagName,
                        errorCodes.tagsNestedIllegal);
                }
            }
        },
        "th": validateTableCell,
        "td": validateTableCell,
        "a": function(node){
            // XXX: 统一状态判断。
            var debug = !(location.protocol=="https:" &&
                location.hostname.indexOf(".alipay.com")>0);
            if(!node.hasAttribute("href")){
                log("html", node.startLine, node.startTag,
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
                log("html", node.startLine, node.startTag,
                    "a[href] illegal.", errorCodes.attrIllegal);
            }
            // XXX: 站内地址检测是否有效(404)，仅限于SIT环境。
        }
    };
    var rules_tags_leave = {
        "!DOCTYPE": function(node){},
        "form": function(node){
            context.forms.pop();
            counter.submits = 0;
        },
        "object": function(node){
            context.objects.pop();
        },
        "param": function(node){
        },
        "p": function(node){
            context.ps.pop();
        },
        "pre": function(node){
            context.pres.pop();
        }
    };
    function lint(dom){
        //walk(dom, preProcessing, {});
        //walk(dom, rules_tags_enter, rules_tags_leave);
        dom.walk(preProcessing, {});
        dom.walk(rules_tags_enter, rules_tags_leave)
        if(duplicateIDs.length > 0){
            log("html", 0, "duplicate id:"+duplicateIDs.join(","),
                "duplicate id.", errorCodes.attrIllegal,
                errorCodes.idDuplicated);
        }
    }


    return HTMLint;

    //return {
        //parse: HTMLParser,
        //lint: HTMLint,
        //getRes: function(){
            //return res;
        //},
        //getErrors: function(){
            //return htmlErrors;
        //},
        //clear: function(){
            //res.img.length = 0;
            //res.js.length = 0;
            //res.css.length = 0;
            //res.fla.length = 0;

            //htmlErrors.length = 0;
        //}
    //};

	function makeMap(str){
		var obj = {}, items = str.split(",");
		for ( var i = 0; i < items.length; i++ )
			obj[ items[i] ] = true;
		return obj;
	}
})();
