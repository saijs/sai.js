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
 */

(function(){

	// Regular Expressions for parsing tags and attributes
	var startTag = /^<(\w+)((?:\s+[\w:-]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/,
		endTag = /^<\/(\w+)[^>]*>/,
		attr = /([\w:-]+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g,
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

	var HTMLParser = this.HTMLParser = function( html, handler ) {
        // stack = [{line:1, tag:"<div id=\"demo\">", tagName:"div"}]
		var index, match, stack = [], last = html;
		stack.last = function(){
			return this[ this.length - 1 ];
		};
        var error=[], line=1;
        var errorCode = {
            tagsNestedIllegal: 0,
            attrMissingQuote: 1
        };
        var lines = [""].concat(html.replace(/\r\n|\r|\n/g, "\n").split("\n"));

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
                    line += getLine(match[0]);
				// Comment
				}else if ( html.indexOf("<!--") == 0 ) {
					index = html.indexOf("-->");

					if ( index >= 4 ) {
						if ( handler.comment )
							handler.comment( html.substring( 4, index ) );
                        line += getLine(html.substring(0, index));
						html = html.substring( index + 3 );
                    }else{
                        error.push({
                            line: line,
                            message: "comment is not closed.",
                            source: lines[line],
                            code: errorCode.tagsNestedIllegal
                        });
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
                        error.push({
                            line: line,
                            message: "tag "+stack.last().tagName+" closed.",
                            source: lines[line],
                            code: errorCode.tagsNestedIllegal
                        });
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
                        error.push({
                            line: line,
                            message: "tag is unclosed.",
                            source: lines[line],
                            code: errorCode.tagsNestedIllegal
                        });
                        index = html.indexOf("<", 1);
                        if(index > -1){
                            line += getLine(html.substring(0, index));
                            html = html.substring(index);
                        }else{
                            // Clean up any remaining tags
                            parseEndTag();
                            return error;
                        }
                    }
				}else{
					index = html.indexOf("<");

					var text = index < 0 ? html : html.substring( 0, index );
					html = index < 0 ? "" : html.substring( index );

					if ( handler.chars )
						handler.chars( text );

                    line += getLine(text);
                    if(index < 0){
                        // Clean up any remaining tags
                        parseEndTag();
                        return error;
                    }
				}

			} else {
				html = html.replace(regexp_special[stack.last().tagName], function(all, text){
					text = text.replace(/<!--(.*?)-->/g, "$1")
						.replace(/<!\[CDATA\[(.*?)]]>/g, "$1");

					if ( handler.chars )
						handler.chars( text );

					return "";
				});

				parseEndTag( "", stack.last().tagName );
			}

            if ( html == last ){
                error.push({
                    line: line,
                    message: "Parse Error.",
                    source: html,
                    //source: lines[line],
                    code: errorCode.tagsNestedIllegal
                });

                return error;
            }
			last = html;
		}

		// Clean up any remaining tags
		parseEndTag();

        return error;

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

		function parseStartTag( tag, tagName, rest, unary ) {
			if ( block[ tagName ] ) {
				while ( stack.last() && inline[ stack.last().tagName ] ) {
					parseEndTag( "", stack.last().tagName );
				}
			}

			if ( closeSelf[ tagName ] && stack.last().tagName == tagName ) {
				parseEndTag( "", tagName );
			}

			unary = empty[ tagName ] || !!unary;

			if ( !unary )
				stack.push({"line": line, "tagName": tagName, "tag": tag});

			if ( handler.start ) {
				var attrs = [];

                // TODO: 引号检查。
				rest.replace(attr, function(match, name) {
					var value = arguments[2] ? arguments[2] :
						arguments[3] ? arguments[3] :
						arguments[4] ? arguments[4] :
						fillAttrs[name] ? name : "";

					attrs.push({
						name: name,
						value: value,
						escaped: value.replace(/(^|[^\\])"/g, '$1\\\"') //"
					});
				});

				if ( handler.start )
					handler.start( tagName, attrs, unary );
			}
		}

		function parseEndTag( tag, tagName ) {
			// If no tag name is provided, clean shop
			if ( !tagName )
				var pos = 0;

			// Find the closest opened tag of the same type
			else
                for ( var pos = stack.length - 1; pos >= 0; pos-- ){
                    if ( stack[pos].tagName == tagName ){
						break;
                    }else{
                        error.push({
                            line: stack[pos].line,
                            message: "tag "+stack[pos].tagName+" unclosed.",
                            source: lines[stack[pos].line],
                            //source: stack[pos].tag,
                            code: errorCode.tagsNestedIllegal
                        })
                    }
                }

			if ( pos >= 0 ) {
				// Close all the open elements, up the stack
                for ( var i = stack.length - 1; i >= pos; i-- ){
                    if(0 == pos){
                        error.push({
                            line: line,
                            message: "tag "+stack[i].tagName+" unclosed.",
                            source: lines[stack[i].line],
                            //source: stack[i].tag,
                            code: errorCode.tagsNestedIllegal
                        })
                    }
                    if ( handler.end ){
						handler.end(stack[i].tagName);
                    }
                }

				// Remove the open elements from the stack
				stack.length = pos;
			}
		}
	};

    this.HTMLint = function(html){
        var error = HTMLParser(html, {});
        return error;
    };

	this.HTMLtoXML = function( html ) {
		var results = "";

		HTMLParser(html, {
            doctype: function(tag){
                results += tag;
            },
			start: function( tag, attrs, unary ) {
				results += "<" + tag;

				for ( var i = 0; i < attrs.length; i++ )
					results += " " + attrs[i].name + '="' + attrs[i].escaped + '"';

				results += (unary ? "/" : "") + ">";
			},
			end: function( tag ) {
				results += "</" + tag + ">";
			},
			chars: function( text ) {
				results += text;
			},
			comment: function( text ) {
				results += "<!--" + text + "-->";
			}
		});

		return results;
	};

	this.HTMLtoDOM = function( html, doc ) {
		// There can be only one of these elements
		var one = makeMap("html,head,body,title");

		// Enforce a structure for the document
		var structure = {
			link: "head",
			base: "head"
		};

		if ( !doc ) {
			if ( typeof DOMDocument != "undefined" )
				doc = new DOMDocument();
			else if ( typeof document != "undefined" && document.implementation && document.implementation.createDocument )
				doc = document.implementation.createDocument("", "", null);
			else if ( typeof ActiveX != "undefined" )
				doc = new ActiveXObject("Msxml.DOMDocument");

		} else
			doc = doc.ownerDocument ||
				doc.getOwnerDocument && doc.getOwnerDocument() ||
				doc;

		var elems = [],
			documentElement = doc.documentElement ||
				doc.getDocumentElement && doc.getDocumentElement();

		// If we're dealing with an empty document then we
		// need to pre-populate it with the HTML document structure
		if ( !documentElement && doc.createElement ) (function(){
			var html = doc.createElement("html");
			var head = doc.createElement("head");
			head.appendChild( doc.createElement("title") );
			html.appendChild( head );
			html.appendChild( doc.createElement("body") );
			doc.appendChild( html );
		})();

		// Find all the unique elements
		if ( doc.getElementsByTagName )
			for ( var i in one )
				one[ i ] = doc.getElementsByTagName( i )[0];

		// If we're working with a document, inject contents into
		// the body element
		var curParentNode = one.body;

		HTMLParser( html, {
			start: function( tagName, attrs, unary ) {
				// If it's a pre-built element, then we can ignore
				// its construction
				if ( one[ tagName ] ) {
					curParentNode = one[ tagName ];
					return;
				}

				var elem = doc.createElement( tagName );

				for ( var attr in attrs )
					elem.setAttribute( attrs[ attr ].name, attrs[ attr ].value );

				if ( structure[ tagName ] && typeof one[ structure[ tagName ] ] != "boolean" )
					one[ structure[ tagName ] ].appendChild( elem );

				else if ( curParentNode && curParentNode.appendChild )
					curParentNode.appendChild( elem );

				if ( !unary ) {
					elems.push( elem );
					curParentNode = elem;
				}
			},
			end: function( tag ) {
				elems.length -= 1;

				// Init the new parentNode
				curParentNode = elems[ elems.length - 1 ];
			},
			chars: function( text ) {
				curParentNode.appendChild( doc.createTextNode( text ) );
			},
			comment: function( text ) {
				// create comment node
			}
		});

		return doc;
	};

	function makeMap(str){
		var obj = {}, items = str.split(",");
		for ( var i = 0; i < items.length; i++ )
			obj[ items[i] ] = true;
		return obj;
	}
})();
