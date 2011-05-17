// document.getElementsByTagName('html')[0].outerHTML
// document.documentElement.outerHTML
// AJAX re-send GET/POST request.
// plugins to read browser cache.

window.HTMLint = function(html){
    var stack=[];
	stack.last = function(){
		var len = this.length;
		if (len == 0){
			return this[ len - 1 ];
		} else {
			return this[ len - 1 ][0];
		}
	};

    // Regular Expressions for parsing tags and attributes
    var startTag = /^<(\w+)((?:\s+\w+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/,
        endTag = /^<\/(\w+)[^>]*>/,
        attr = /(\w+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g,
        doctype = /^\s+<!DOCTYPE\s[^>]+>/im,
        doctype0 = /^<!DOCTYPE\s[^>]+>/i,
        reNewLine = /^(?:\r\n|\r|\n)/;

    var idx=0, len=html.length;
    var line=0;

    // detect doctype.
    if(html.indexOf("<!DOCTYPE")==0 || html.indexOf("<!doctype")==0){
        log("html", "DOCTYPE 没有顶格写。", errorCode.doctypeAtStart);
    }
    while(html){
        if(html.indexOf("<!DOCTYPE")==0 || html.indexOf("<!doctype")==0){
            html = html.substring(html.indexOf(">"))
        }else if(html.test(reNewLine)){
            html = html.replace(reNewLine, "");
            line++;
        }else if(html.indexOf("<!--") == 0){
            html = html.substring(4);
            idx = html.indexOf("-->");

            if (idx >= 0){
                html = html.substring( idx + 3 );
            }else{
                log("html", "注释未结束", errorCode.tagNotClosed);
                return;
            }
        }else if(html.indexOf("</")==0){
            match = html.match( endTag );
            if(match){
                html = html.substring( match[0].length );
                match[0].replace( endTag, parseEndTag );
            }
        }else if(html.indexOf("<")==0){
            match = html.match( startTag );
            if(match){
                html = html.substring( match[0].length );
                match[0].replace( startTag, parseStartTag );
            }
        }else{
            idx = html.indexOf("<");
            var text = idx<0 ? html : html.substring(0,idx);
            html = idx<0 ? "" : html.substring(idx);
        }
    }
};
