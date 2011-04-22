/**
 * @overview
 *
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version 2011/04/21
 */

(function(){
    var check = function(win){
        var ls=win.document.getElementsByTagName("*"),
            re=/https:\/\//i;
        lab:
        for(var i=0,tn,url,l=ls.length; i<l; i++){
            tn=ls[i].tagName.toLowerCase();
            switch(tn){
            case 'img':
            case 'script':
                url=ls[i].src;
                break;
            case 'iframe':
                try{
                    check(ls[i].contentWindow);
                }catch(ex){alert(ex)}
                url=ls[i].src;
                break;
            case 'object':
                url=ls[i].codebase;
                break;
            case 'link':
                url=ls[i].href;
                break;
            default:
                continue lab;
            }
            if(!re.test(url)){
                if(window.console && window.console.log){window.console.log(ls[i], url);}
            }
        }
    };
    check(window);
})();
