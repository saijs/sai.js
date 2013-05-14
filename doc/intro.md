
# 简介

----

前端监控脚本用户监控脚本用户浏览器端运行时异常检查，也附带实现了部分静态资源的检查。

主要包括以下几个部分：

* JavaScript 运行时异常嗅探；
* HTML 源码解析并执行规则校验；
* DOM 结构遍历并执行规则校验；
* CSS 静态文件解析并执行规则校验；
* 运行时 DOM CSS 渲染结果并检查/统计特定属性；

## JSniffer

JSniffer 模块用于嗅探 JavaScript 异常情况，绑定 window.onerror 处理函数，
脚本抛出异常时，嗅探收集、处理&整理、汇报到服务端。

使用 window.onerror 而不是 addEventListener，在于onerror 处理函数接受的参数
一致并具有实用性，而 addEventListener/attachEvent 方式各浏览器传递的参数不一致
（有传 Event 对象）且不具实用性）。

监控脚本无法捕获的异常：

1. window.onerror 函数绑定之前的脚本异常；
1. window.onerror 本身所在的 <script> 块有异常，导致绑定失败。

策略是：

1. 将 JavaScript异常监控脚本放置文档最前面（至少是其他 <script> 块之前）；
1. JavaScript 异常监控脚本独立在一个 <script> 块中（建议是外部脚本文件，亦可使用缓存）；

JavaScript 异常包括：

1. 通常意义上的脚本运行时异常；
1. 脚本（多出现于 JSON/JSONP 请求）加载失败。

JSON/JSONP 一般会带比较长的参数，每次请求都可能不一样，甚至为了避免缓存加上随机数，
这些参数数据在在错误文件地址中，基本是没有用处，可以删除，只保留地址部分。



## DOMLint

DOMLint 在 DOMReady （一段时间）之后，遍历整个 DOM 校验一遍规则，最终收集到的
异常信息汇报到服务端。

遍历的规则包括标签的非法嵌套，过期标签的使用，出现重复 ID 等规则，详细规则
请参考 [前端硬编码规则|TYCP:硬编码规范] 和 [HTML校验规则&错误编号|1.HTML校验规则&错误编号] 。


遍历 DOM 过程中，顺便收集文档中的 IMAGE，CSS，JAVASCRIPT，FLASH 的使用情况，
文档大小，加载时间等信息。

对于图片，CSS，JAVASCRIPT，FLASH，如果地址中带有参数（一般为避免缓存时使用，
例如验证码，自动时间戳等），这对于统计页面的图片使用情况是无益的，收集时可以
去除，便于统计。

风险&误差：

1. 浏览器兼容性问题，忽略某些检测造成的遗漏。
1. 客户端控件、插件修改DOM会影响到检测结果的正确性。

相比 HTMLint 的优势：

1. 可以检测 DOM 中使用的背景图资源信息。




## HTMLint

HTMLint 在 DOMReady （一段时间）之后，通过 AJAX 再请求一次当前页面，
取得 HTML 源码之后进行解析并校验规则，将收集到的异常信息汇报到服务端。

校验规则大致与 DOMLint 相同，另外还包括标签非法闭合等规则（DOM 中无法检测），
详细参考 [前端硬编码规则|TYCP:硬编码规范] 和 [HTML校验规则&错误编号|1.HTML校验规则&错误编号] 。

HTML Lint 时同样会收集文档中的 IMAGE, CSS, JAVASCRIPT, FLASH 的使用情况，文档大小，加载时间等信息。

通过 AJAX 请求获取 HTML 源码，可能带来的风险：

1. PV 倍增，服务器压力倍增（启用缓存可以在一定程度上避免）；
1. 技术上无法获取 POST 提交结果页的 HTML 源码；
1. 服务端设置的 TOKEN 导致重复请求异常，使获取的 HTML 源码和当前页面不一致；
1. 重复请求对业务可能的影响（改变数据）。

这种获取 HTML 源码的方式，仅适合使用 GET 访问，用于信息展示作用的页面。

相比 DOMLint 的优势：

1. 不受浏览器影响，也无兼容性问题需要针对某些浏览器不检测某些规则。
1. 可以检测标签未结束，同一标签中出现多个同名属性等语法错误问题。

| 检测内容                   | HTMLint | DOMLint |
|----------------------------|---------|---------|
| 标签未结束                 | √      | ×      |
| 标签未闭合                 | √      | ×      |
| 同名属性                   | √      | ×      |
| 文档大小                   | √      | ≈      |
| 标签的嵌套问题             | √      | ≈      |
| 特殊标签出现次数及嵌套问题 | √      | ≈      |
| 背景图                     | ×      | √      |
| 校验准确性                 | √      | ≈      |

HTMLint 的准确性受获取源码的影响；DOMLint 的准确性稍差，会受客户端脚本和用户插件的影响。






## CSSLint

废弃。


## CSSniffer

整合在 DOMLint 遍历 DOM 的过程中，检测文档中所有元素的背景图使用情况。

目前没有其他使用需求，但是可扩展完全。


## 数据传输

通过 new Image() 带上异常数据，往服务端发送 GET 请求。

在各浏览器和服务器中有最大 URL 长度限制：

* IE: 官方文档介绍的是 2083 字节，实际测试发送的图片地址长度最大可以 4095 字节，
  再长就会报“无效指针）的内部错误。
* 其他浏览器，官方介绍不详，各种非官方测试结果也不同，不过实际测试结果是，
  均超过 Apache 的默认最大受理长度。
* Apache: 官方文档介绍默认是 8190 字节，实际测试 magentmng 系统的结果是 8209 字节。

针对性处理，对于 IE，使用安全的官方长度（2083字节），其他浏览器使用 Apache
的最大受理长度（默认 8190 字节）。

对于超出的长度，分成片段数据多次发送。

对于 IE6 会 abort 掉 http 请求的 BUG，最终决定采用 队列+分时 的方案发送数据。

采用队列的另一个重要原因，是希望将一个袖珍的脚本异常嗅探脚本独立在页面顶部，
嗅探到脚本异常就 push 到队列中，当页底的发送数据的监控脚本准备好时，开始发送
队列中的数据。分时的串行发送数据，可以降低客户端和服务端的处理压力，同时避免
IE6 中的 BUG。

## See Also:

1. [丢弃图片的 HTTP 请求|http://blog.hotoo.me/abort-image-request.html]
1. [IE6下链接ONCLICK事件处理中的请求被ABORTED|http://www.xiahaixia.com/2010/11/19/ie6下链接onclick事件处理中的请求被aborted/]
1. [What does (Aborted) mean in HttpWatch?|http://www.cnblogs.com/zhyt1985/archive/2009/05/27/1490755.html]
    [来源|http://www.sanotes.net/html/y2008/165.html]
1. [http://blog.httpwatch.com/2007/11/20/error_internet_invalid_url-httpwatch/]
1. [HttpWatch工具简介及使用技巧|http://www.cnblogs.com/mayingbao/archive/2007/11/30/978530.html]


Abrot Image Test.

*为什么不是 script/link?*

使用 document.createElement("script") 创建元素并设置 src 属性，appendChild 到
DOM 中会去请求指定资源，可以到底向日志服务器发送数据的要求。


但是使用这种方式有一下几点弊端：

1. 创建脚本带来的危险性。
1. 会向 DOM 中附加元素，影响 DOMLint 校验。
1. 无法 abort，无论设置 `script = null;` `script.src="";` `script.src=null;`
    `script.removeAttribute("src");` `document.body.removeChild(script);` 都无法实现 abort.
1. 引入资源不触发 onload/onerror/onabort 事件，除非使用 jsonp 的方式，对元素本身无法得到回调。

## 展望

1. JavaScript 性能检测。
1. ActionScript 异常嗅探 & 性能检测。
