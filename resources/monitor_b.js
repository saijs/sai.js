/**
 *
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version 2011/10/20
 */

!window.monitor || (function(){
    // 1. merge(DOMLint, HTMLint);
    // 2. sit ? HTMLint : DOMLint;
    // 3. HTMLint || DOMLint

    var M = window.monitor;
    window.setTimeout(function(){
    try{
        if("undefined" != typeof(M.DOMLint)){
            var dom = M.DOMLint(document);
            M.report({
                res: dom.res,
                htmlSize: dom.htmlSize
            });
            if(dom.htmlErr && dom.htmlErr.length>0){
                M.report({
                    htmlError: dom.htmlErr
                });
            }
        }
    }catch(ex){}
    }, 10);
})();
