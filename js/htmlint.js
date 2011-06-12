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
 *
 */

window.monitor.HTMLint = (function(){
    var URI         = window.monitor.URI,
        S           = window.monitor.S,
        debug       = window.monitor.debug,
        errorCodes  = window.monitor.htmlErrorCodes,
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
        htmlErrors.push({ln:line, err:code, code:source});
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
            if((this.childNodes[i].tagName && this.childNodes[i].tagName.toLowerCase() == tagName) ||
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
            var node = new Node();
            node.startTag = tag;
            node.startLine = line;
            node.tagName = tagName;
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
                if(stack.last().tagName == tagName){
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
    var rules = [
        // parse head.
        function(html, dom){
            //if(!reDoctype.test(html)){
                //log("html", 0, "DOCTYPE 没有顶格", "DOCTYPE 没有顶格。", errorCodes.doctypeIllegal);
            //}
            var docLen = dom.getElementsByTagName("!DOCTYPE").length;
            if(docLen == 0){
                log("html", 0, "missing DOCTYPE.", "missing DOCTYPE.", errorCodes.doctypeIllegal);
            }else if(docLen > 1){
                log("html", docLen[1].startLine, "DOCTYPE too much.", "设置了超过 1 个 DOCTYPE。", errorCodes.doctypeIllegal);
            }

            var head = dom.getElementsByTagName("head");
            if(1 == head.length){
                if(head[0].childNodes.length == 0){
                    log("html", head[0].startLine, "missing document charset.", "missing document charset.", errorCodes.charseIllegal);
                }else{
                    var elem = head[0].childNodes[0];
                    if(elem.tagName && elem.tagName.toLowerCase()=="meta"){
                        if(!elem.hasAttribute("charset") &&
                          !(elem.hasAttribute("http-equiv") &&
                            elem.getAttribute("http-equiv").toLowerCase()=="content-type" &&
                            elem.hasAttribute("content") &&
                            elem.getAttribute("content").indexOf("charset")>=0)){
                                log("html", elem.startLine, "missing document charset", "missing document charset");
                        }
                    }
                }
                var title = head[0].getElementsByTagName("title");
                if(1 == title.length){
                    // TODO: check title not empty.
                }else if(0 == title.length){
                    log("html", head[0].startLine, "missing title", "missing title.", errorCodes.tagsIllegal);
                }else{
                    log("html", head[0].startLine, "too much titles", "too much titles.", errorCodes.tagsIllegal);
                }
            }else if(0 == head.length){
                log("html", 0, "missing head", "missing head.", errorCodes.tagsIllegal);
            }else{
                log("html", head[1].line, "too much heads", "too much heads.", errorCodes.tagsIllegal);
            }
        },
        // checkStyle@import, 检测页内样式中是否有使用 @import
        function(html,dom){
            var styles = dom.getElementsByTagName("style");
            // @see http://www.yesky.com/imagesnew/software/css/css2/a_import.html
            var re = /@import\s+[^;]+;/g;
            for(var i=0,mat,tag,l=styles.length; i<l; i++){
                // style 标签的嵌套。
                //tag = styles[i].parentNode.tagName;
                //if(tag && tag.toLowerCase() != "head"){
                    //log("html", styles[i].startLine, tag+">style", "style must be in the head.", errorCodes.tagsIllegal, errorCodes.tagsNestedIllegal);
                //}
                mat = styles[i].innerHTML.match(re);
                if(mat){
                    log("css", styles[i].startLine, mat.join(""), "using @import.", errorCodes.cssIllegal, errorCodes.cssByImport);
                }
            }
        },
        // check elements(inline js, inlile css, duplicate id, ...)
        function(html, dom){
            var elems = dom.getElementsByTagName("*");
            var duplicateIDs=[], duplicateIDsCache={};
            var inlinejs = "onclick,onblur,onchange,oncontextmenu,ondblclick,onfocus,onkeydown,onkeypress,onkeyup,onmousedown,onmousemove,onmouseout,onmouseover,onmouseup,onresize,onscroll,onload,onunload,onselect,onsubmit,onbeforecopy,oncopy,onbeforecut,oncut,onbeforepaste,onpaste,onbeforeprint,onpaint,onbeforeunload".split(",");
            //var reSpaceLeft = /^\s+/, reSpaceRight = /\s+$/;
            for(var i=0,tn,id,l=elems.length; i<l; i++){
                if(elems[i].tagName=="!DOCTYPE"){continue;}
                if(elems[i].tagName=="!--"){
                    //if(!reSpaceLeft.test(elems[i].innerHTML) || !reSpaceRight.test(elems[i].innerHTML)){
                        //var cmt = elems[i].innerHTML;
                        //log("html", elems[i].startLine, elems[i].startTag+(cmt.length < 20 ? cmt : cmt.substr(0, 20)+"...")+elems[i].endTag, "comment required space at start and end.", errorCodes.commentIllegal);
                    //}
                    continue;
                }
                // tagName.
                if(!window.monitor.S.isLower(elems[i].tagName)){
                    log("html", elems[i].startLine, elems[i].startTag, "tagName must bu lowerCase.", errorCodes.tagsIllegal);
                }
                tn = elems[i].tagName.toLowerCase();
                if("font"==tn || "s"==tn || "u"==tn){
                    log("html", elems[i].startLine, elems[i].startTag, "tagName deprecated.", errorCodes.tagsIllegal, errorCodes.tagsDeprecated);
                }
                // duplicate id.
                if(elems[i].hasAttribute("id")){
                    id = elems[i].getAttribute("id");
                    if(duplicateIDsCache.hasOwnProperty("ID_"+id)){
                        duplicateIDs.push(id);
                    }
                    duplicateIDsCache["ID_"+id] = true;
                }
                for(var j=0,m=inlinejs.length; j<m; j++){
                    if(elems[i].hasAttribute(inlinejs[j])){
                        log("html", elems[i].startLine, elems[i].startTag, "inline js.", errorCodes.inlineJS);
                        break;
                    }
                }
                if(elems[i].hasAttribute("style")){
                    log("html", elems[i].startLine, elems[i].startTag, "inline css.", errorCodes.inlineCSS);
                }
            }
            if(duplicateIDs.length > 0){
                log("html", 0, "duplicate id:"+duplicateIDs.join(","), "duplicate id.", errorCodes.attrIllegal, errorCodes.idDuplicated);
            }

            // We can't check tag p in p on the DOM.
            var ps = dom.getElementsByTagName("p");
            for(var i=0,p,pc,l=ps.length; i<l; i++){
                p = ps[i];
                pc = ps[i].getElementsByTagName("*");
                for(var j=0,m=pc.length; j<m; j++){
                    switch(pc[j].tagName.toLowerCase()){
                        case "a":
                        case "em":
                        case "span":
                        case "strong":
                            break;
                        default:
                            log("html", pc[j].startLine, "p>"+pc[j].startTag, "tags in p just a,em,span,strong.", errorCodes.tagsIllegal, errorCodes.tagsNestedIllegal);
                    }
                }
            }
            // document.getElementsByTagName("p")[i].getElementsByTagName("p").length;
            // ul>li, ol>li
            // TODO: 正向匹配。
            var li = dom.getElementsByTagName("li");
            for(var i=0,tag,l=li.length; i<l; i++){
                tag = li[i].parentNode.tagName.toLowerCase();
                if("ul"!=tag && "ol"!=tag){
                    log("html", li[i].startLine, tag+">"+li[i].startTag, "ul,ol 中嵌套 li", errorCodes.tagsIllegal, errorCodes.tagsNestedIllegal);
                }
            }
            // dl>dt
            // TODO: 正向匹配。
            var dt = document.getElementsByTagName("dt");
            for(var i=0,tag,l=dt.length; i<l; i++){
                tag = dt[i].parentNode.tagName.toLowerCase();
                if("dl" != tag){
                    log("html", dt[i].startLine, tag+">"+dt[i].startTag, "dl 中嵌套 dt", errorCodes.tagsIllegal, errorCodes.tagsNestedIllegal);
                }
            }
            // dl>dd
            // TODO: 正向匹配。
            var dd = document.getElementsByTagName("dd");
            for(var i=0,tag,l=dd.length; i<l; i++){
                tag = dd[i].parentNode.tagName.toLowerCase();
                if("dl" != tag){
                    log("html", dd[i].startLine, tag+">"+dd[i].startTag, "dl 中嵌套 dd", errorCodes.tagsIllegal, errorCodes.tagsNestedIllegal);
                }
            }
            // tr>td
            // TODO: 正向匹配。
            var td = document.getElementsByTagName("td");
            for(var i=0,tag,l=td.length; i<l; i++){
                tag = td[i].parentNode.tagName.toLowerCase();
                if("tr" != tag){
                    log("html", td[i].startLine, tag+">"+td[i].startTag, "tr 中嵌套 td", errorCodes.tagsIllegal, errorCodes.tagsNestedIllegal);
                }
            }
        },
        // checkResources, 检测文档中的资源引用情况
        function(html, dom){
            var re=/https:\/\//i,
                re_css_rel=/^stylesheet$/i,
                re_css=/\.css$/i,
                re_empty=/^\s*$/,
                re_number=/^\d+$/;
            var checkProtocol = "https:" == location.protocol;
            var script  = dom.getElementsByTagName("script"),
                link    = dom.getElementsByTagName("link"),
                img     = dom.getElementsByTagName("img"),
                iframe  = dom.getElementsByTagName("iframe"),
                frame   = dom.getElementsByTagName("frame"),
                object  = dom.getElementsByTagName("object"),
                embed   = dom.getElementsByTagName("embed");
            for(var i=0,uri,tag,l=script.length; i<l; i++){
                //tag = script[i].parentNode.tagName.toLowerCase();
                //if("body" != tag){
                    //log("html", script[i].startLine, tag+">"+script[i].startTag, "script 建议放在 body 中。", errorCodes.tagsIllegal, errorCodes.tagsNestedIllegal);
                //}
                if(!script[i].hasAttribute("src")){continue;}
                if(!script[i].hasAttribute("charset")){
                    log("html", script[i].startLine, script[i].startTag, "missing charset.", errorCodes.charsetIllegal);
                }
                uri = URI.parse(script[i].getAttribute("src"));
                if(checkProtocol && "https:" != uri.protocol){
                    log("html", script[i].startLine, script[i].startTag, "protocol illegal.", errorCodes.protocolIllegal);
                }
                res.js.push(URI.path(script[i].getAttribute("src")));
            }
            for(var i=0,tag,l=link.length; i<l; i++){
                type = link[i].getAttribute("type");
                rel = link[i].getAttribute("rel");
                uri = URI.parse(link[i].getAttribute("href"));
                // link 标签的嵌套。
                //tag = link[i].parentNode.tagName.toLowerCase();
                //if("head" != tag){
                    //log("html", link[i].startLine, tag+">"+link[i].startTag, "tags nested error.", errorCodes.tagsIllegal, errorCodes.tagsNestedIllegal);
                //}
                // All links need rel attr.
                if(!link[i].hasAttribute("rel")){
                    log("html", link[i].startLine, link[i].startTag, "missing [rel]", errorCodes.attrIllegal);
                    continue;
                }
                // favicon, stylesheet, ...
                if(checkProtocol && "https:" != uri.protocol){
                    log("html", link[i].startLine, link[i].startTag, "protocol illegal.", errorCodes.protocolIllegal);
                }
                // link[rel=stylesheet]
                if("stylesheet" != link[i].getAttribute("rel")){continue;}
                //if("text/css" != type){
                    //log("html", link[i].startLine, link[i].startTag, "link[rel=stylesheet] missing [type].", errorCodes.attrIllegal);
                //}
                if(!link[i].hasAttribute("charset")){
                    log("html", link[i].startLine, link[i].startTag, "missing charset.", errorCodes.charsetIllegal);
                }
                res.css.push(URI.path(link[i].getAttribute("href")));
            }
            for(var i=0,l=img.length; i<l; i++){
                var attrs = [];
                uri=URI.parse(img[i].getAttribute("src"));
                if(checkProtocol && "https:" != uri.protocol){
                    log("html", img[i].startLine, img[i].startTag, "protocol illegal.", errorCodes.protocolIllegal);
                }
                if(!img[i].hasAttribute("alt") || re_empty.test(img[i].getAttribute("alt"))){
                    attrs.push("alt");
                }
                //if(!img[i].hasAttribute("width") || !re_number.test(img[i].getAttribute("width"))){
                    //attrs.push("width");
                //}
                //if(!img[i].hasAttribute("height") || !re_number.test(img[i].getAttribute("height"))){
                    //attrs.push("height");
                //}
                if(attrs.length>0){
                    log("html", img[i].startLine, img[i].startTag, "missing "+attrs.join(), errorCodes.attrIllegal);
                }
                res.img.push(URI.path(img[i].getAttribute("src")));
            }
            var frames = iframe.concat(frame), re_empty_uri=/^javascript:(['"])\1;?$/;
            for(var i=0,uri,src,l=frames.length; i<l; i++){
                src = frames[i].getAttribute("src");
                uri=URI.parse(src);
                if(checkProtocol && ("https:" != uri.protocol || re_empty_uri.test(src))){
                    log("html", frames[i].startLine, frames[i].startTag, "protocol illegal.", errorCodes.protocolIllegal);
                }
            }
            for(var i=0,l=object.length; i<l; i++){
                if(object[i].getAttribute("codebase")){
                    uri = URI.parse(object[i].getAttribute("codebase"));
                    if(checkProtocol && "https:"!=uri.protocol){
                        log("html", object[i].startLine, '<object codebase="'+object[i].getAttribute("codebase")+'"', "protocol illegal.", errorCodes.protocolIllegal);
                    }
                }
                var params=object[i].getElementsByTagName("param");
                for(var j=0,m=params.length; j<m; j++){
                    if("movie"==params[j].getAttribute("name") ||
                      "src"==params[j].getAttribute("src")){
                        uri=URI.parse(params[j].getAttribute("value"));
                        if(checkProtocol && "https:" != uri.protocol){
                            log("html", params[i].startLine, params[j].startTag, "protocol illegal.", errorCodes.protocolIllegal);
                        }
                        res.fla.push(URI.path(params[j].getAttribute("value")));
                        break;
                    }
                }
            }
            for(var i=0,l=embed.length; i<l; i++){
                if(!embed[i].hasAttribute("src")){continue;}
                uri=URI.parse(embed[i].getAttribute("src"));
                if(checkProtocol && "https:"!=uri.protocol){
                    log("html", embed[i].startLine, embed[i].startTag, "protocol illegal.", errorCodes.protocolIllegal);
                }
                res.fla.push(URI.path(embed[i].getAttribute("src")));
            }
        },
        // checkForms, 检测文档中的表单元素是否符合规范
        function(html,dom){
            var fs = dom.getElementsByTagName("form");
            var fs_elems_ids = {};
            for(var i=0,fn,l=fs.length; i<l; i++){
                if(fs[i].hasAttribute("id")){
                    fn = "#"+fs[i].getAttribute("id");
                }else if(fs[i].hasAttribute("name")){
                    fn = "form[name="+fs[i].getAttribute("id")+"]";
                }else{
                    fn = "document.forms["+i+"]";
                }
                var elems = fs[i].getElementsByTagName("*");
                for(var j=0,id,type,name,submitCount=0,html,m=elems.length; j<m; j++){
                    switch(elems[j].tagName.toLowerCase()){
                    case "input":
                    case "button":
                        if(elems[j].hasAttribute("type")){
                            type = elems[j].getAttribute("type").toLowerCase();
                            // XXX: 表单不允许有多个 submit?
                            //if(type=="submit" && (++submitCount > 1)){
                                //log("html", elems[j].startLine, elems[j].startTag, "too much more submit buttons.", errorCodes.tagsIllegal);
                            //}
                        }else{
                            log("html", elems[j].startLine, elems[j].startTag, "missing attribute: [type].", errorCodes.attrIllegal);
                        }
                        //!break;
                    case "select":
                    case "textarea":
                        html = fn+": "+elems[j].startTag;
                        // cache elements ids for label test.
                        if(elems[j].hasAttribute("id")){
                            id = elems[j].getAttribute("id");
                            if("id"==id || "submit"==id){
                                log("html", elems[j].startLine, html, "id不合法。", errorCodes.formElementNameIllegal);
                            }
                            fs_elems_ids["ID_"+id] = true;
                        }
                        if(!elems[j].hasAttribute("name")){
                            log("html", elems[j].startLine, html, "missing attribute: [name].", errorCodes.attrIllegal);
                        }
                        name = elems[j].getAttribute("name");
                        if("submit"==name || "id"==name){
                            log("html", elems[j].startLine, html, "[name] attribute illegal.", errorCodes.attrIllegal);
                        }
                        break;
                    case "form":
                        log("html", elems[j].startLine, "form "+elems[j].startTag, "form nested illegal.", errorCodes.tagsIllegal, errorCodes.tagsNestedIllegal);
                        break;
                    //case "fieldset":
                    default:
                        continue;
                    }
                }
            }
            // 检测文档中的label标签是否有添加for属性
            var labs = dom.getElementsByTagName("label");
            for(var i=0,id,html,l=labs.length; i<l; i++){
                html = labs[i].startTag;
                if(!labs[i].hasAttribute("for")){
                    log("html", labs[i].startLine, html, "missing attribute: [for]", errorCodes.attrIllegal);
                    continue;
                }
                id = labs[i].getAttribute("for");
                if(!id){
                    log("html", labs[i].startLine, html, "attribute [for] missing a value.", errorCodes.attrIllegal);
                    continue;
                }
                if(!fs_elems_ids["ID_"+id]){
                    log("html", labs[i].startLine, html, "#"+id+" not exist.", errorCodes.attrIllegal);
                    continue;
                }
            }
        },
        // checkLinksUsage, 检测页面链接可用性，硬编码等
        function(html, dom){
            var links = dom.getElementsByTagName("a");
            // XXX: 统一状态判断。
            var debug = !(location.protocol=="https:" && location.hostname.indexOf(".alipay.com")>0);
            for(var i=0,href,uri,l=links.length; i<l; i++){
                if(!links[i].hasAttribute("href")){
                    log("html", links[i].startLine, links[i].startTag, "missing [href]", errorCodes.attrIllegal);
                    continue;
                }
                href = links[i].getAttribute("href");
                if(href.indexOf("#")==0){continue;}
                if(/javascript:void(0);?/.test(href)){continue;}
                uri = URI.parse(links[i].getAttribute("href"));
                if((!debug && uri.hostname.indexOf(".alipay.net")>0) ||
                    uri.hostname.indexOf("localhost")==0 ||
                    0==href.indexOf("$")){ // href="$xxServer.getURI('...')"
                    log("html", links[i].startLine, links[i].startTag, "a[href] illegal.", errorCodes.attrIllegal);
                }
                // XXX: 站内地址检测是否有效(404)，仅限于SIT环境。
            }
        }
    ];
    var HTMLint = function(html){
        var t0 = new Date();
        var dom = HTMLParser(html, {});
        if(window.monitor.debug && window.console && window.console.log){
            window.console.log("HTMLParse time: "+(new Date()-t0)+"ms.");
        }

        var t1 = new Date();
        for(var i=0,l=rules.length; i<l; i++){
            rules[i].call(this, html, dom);
        }
        if(window.monitor.debug && window.console && window.console.log){
            window.console.log("HTMLint time: "+(new Date()-t1)+"ms.");
        }

        return {
            res: res,
            htmlError: htmlErrors
        };
    };

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
