/**
 * @overview
 *
 * @author 闲耘™ (hotoo.cn[AT]gmail.com)
 * @version 2013/05/08
 */

define(function(require, exports, module){
  function deepEquals(a, b){
    if(a === b){return true;}
    var typeA = Object.prototype.toString.call(a);
    var typeB = Object.prototype.toString.call(b);
    if(typeA !== typeB){return false;}
    var eq = true;
    var re_blank = /\s{2,}/, s_blank = " ";
    switch(typeA){
    case '[object String]':
    case '[object Number]':
    case '[object Boolean]':
      return a === b;
    case '[object RegExp]':
      return a.source === b.source &&
        a.ignoreCase === b.ignoreCase &&
        a.multiline == b.multiline &&
        a.global === b.global;
    case '[object Object]':
      for(var k in a){
        if(!a.hasOwnProperty(k)){continue;}
        if(!b.hasOwnProperty(k)){return false;}
        eq = eq && deepEquals(a[k], b[k]);
      }
      if(!eq){return false;}
      for(var k in b){
        if(!b.hasOwnProperty(k)){continue;}
        if(!a.hasOwnProperty(k)){return false;}
      }
      return true;
    case '[object Array]':
      if(a.length !== b.length){return false;}
      for(var i=0,l=a.length; i<l; i++){
        eq = eq && deepEquals(a[i], b[i]);
      }
      return eq;
    case '[object Function]':
      return a.toString().replace(re_blank, s_blank) ===
        b.toString().replace(re_blank, s_blank);
    default:
      throw new Error("Not support type "+typeA);
      break;
    }
  }

  exports.equals = deepEquals;
})
