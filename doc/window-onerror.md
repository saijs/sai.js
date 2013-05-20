
# window.onerror

最早有 IE 中加入的特性，后来逐渐成为实时标准。

```javascript
window.onerror = function(message, file, line){
};
```

window.onerror 中包含了异常消息、异常所在文件、和异常所在行这几个重要的异常信息，
但是现在的 JavaScript 脚本逐渐增大，实际发布到线上运行的版本都需要压缩甚至混淆，
对于这样的代码，提供异常行号的意义不大。需要提供对应的列号。通过准确详细的列号
信息和 SourceMap 技术，找到对应原始码的位置，以利于源码分析和异常调试。

截至目前主流浏览器均不支持 window.onerror 中提供列号信息。

* IE 10
* Chrome 26.0.1410.65
* Firefox 19.0.2
* Safari 6.0.4
* Opera 12.15

* http://html5.org/tools/web-apps-tracker?from=6956&to=6957
* [Get the actual Javascript Error object with window.onerror](http://stackoverflow.com/questions/7099127/get-the-actual-javascript-error-object-with-window-onerror)
* [[whatwg] window.onerror -ancient feature needs upgrade](http://lists.whatwg.org/pipermail/whatwg-whatwg.org/2008-August/015824.html)
* [window.onerror](https://developer.mozilla.org/en-US/docs/DOM/window.onerror)
* [Bug 355430 - Stack information of uncaught Error object should be available in window.onerror](https://bugzilla.mozilla.org/show_bug.cgi?id=355430)
* [Bug 723020 - Implement a column argument to window.onerror](https://bugzilla.mozilla.org/show_bug.cgi?id=723020)
* [Bug 13319 - Script errors should provide column position (add a fourth argument to onerror handler)](https://www.w3.org/Bugs/Public/show_bug.cgi?id=13319)
* [Bug 101641 - Summary:	Add column information to window.onerror](https://bugs.webkit.org/show_bug.cgi?id=101641)
