
# 其他

----

## JSniffer

嗅探 JavaScript 异常，捕获异常信息：
* 行号
* 出错文件
* 错误消息
* 错误上下文（函数体，调用过程）


## DOMLint

### 处理浏览器解析好的DOM结构，检测异常情况：

* DOCTYPE: `"BackCompat" != document.compatMode`
* 编码
    * `head>*:first-child == meta[charset]`
    * `head>*:first-child == meta[http-equiv][content=text/html; charset=xxx]`
    * `script[src]:has([charset])`
    * `link[rel=stylesheet]:has([charset])`
* 文档标题: `head>title`
* HTTPS 页面中是否有引用 HTTP 资源
    * `object[codebase=uri]`
    * `object>param[src=uri]`
    * `object>param[name=movie][value=uri]`
    * `embed[src=uri]`
    * `script[src=uri]`
    * `link[href=uri]`
    * `iframe[src=uri]`
    * `frame[src=uri]`
* 重复 ID 检查
* 元素异常嵌套情况
    * `p>*:not(block-level)`
    * `pre>*:not(block-level)`
    * `inline>*:not(block-level)`
* `label[for]`
* `img[alt][width[height]]`
* ?: `textarea[rows][cols]`

### 统计页面资源引用情况：
* img, javascript, css, flash 这些资源的使用情况
* 文档大小


## HTMLint

### HTML 源码验证

在DOMReady后再请求一次当前地址，获得当前页面的HTML源码。然后解析源码：

* `/^(\s*|<!--.*?-->)<!DOCTYPE\s+[^>]+>/`
* Charset: [同 DOMLint]
* Title: [同 DOMLint]
* 重复ID检测: [同 DOMLint]
* 标签非法嵌套情况
    * !`inline>block-level`
    * !`p p`
    * !`h[1-6]>block-level`
    * !`pre>block-level`
        * [HTML <pre> 标签](http://www.w3school.com.cn/tags/tag_pre.asp)
* 标签的闭合情况
* `label[for]`
* `img[alt][width][height]`
* ?: `textarea[rows][cols]`

### 统计页面资源引用情况：
* img, javascript, css, flash 这些资源的使用情况
* 文档大小

通过再发一次当前页面地址的GET请求，获取HTML源码的方式有以下风险：
1. PV 倍增，服务器压力倍增
2. 无法获取POST提交的页面的源码
3. 服务端设置的token导致重复请求，而使获取的源码不一致
4. 重复请求对业务可能的影响

所以这种获取源码的方式只适用于使用GET请求访问、仅用于信息展示作用的页面。

另一种方法与DOM类似，取出的内容是被解析过的结果：
document.getElementsByTagName('html')[0].outerHTML
document.documentElement.outerHTML

终极方法是实现客户端插件，直接读取用户的浏览器缓存。
* http://www.mnot.net/cache_docs/ Caching Tutorial
* http://www.mnot.net/javascript/xmlhttprequest/cache.html XMLHttpRequest Caching Tests
* http://www.web-caching.com/mnot_tutorial/how.html
* http://discuss.joelonsoftware.com/default.asp?joel.3.193583.5 Get html source in javascript

    [
        {
            tagStart:"<!DOCTYPE html>",
            attrs:{},
            tagName: "!DOCTYPE",
            tagEnd: null,
            children:null,
            parent: null
        },
        {
            tagStart:"<html xmlns=\"http://...\">",
            attrs:[
                xmlns:"http://..."
            ]
            tagName:"html",
            tagEnd:"</html>",
            parent:null,
            children:[
                {
                    tagStart:"<head>",
                    tagName:"head",
                    tagEnd:"</head>",
                    parent:html,
                    children:[
                        {
                            tagStart:"<meta charset=\"gbk\" />",
                            tagEnd: null,
                            attrs:{
                                charset:"gbk"
                            }
                        }
                    ]
                }
            ],
            parent: null
        }
    ]


## CSSniffer

基于浏览器DOM嗅探整个文档使用背景图的情况，而无需重新请求加载源码。


## CSSLint

有两种检测机制：
* 基于字符串简单解析源码，找出背景图的使用情况
* CSS Parse 详细解析源码，找出：
* 背景图
* 硬编码
* CSS hacks
* 基于 Alice 规范的检测。


## JSLint

对于前端监控系统来说，目前实用价值不大，可作为兴趣研究项目。

1. 检查未定义的变量（会当作全局变量）


## GET 请求最大长度限制
* Internet Explorer
    * [http://support.microsoft.com/kb/208427/zh-cn 最大 URL 长度是在 Internet Explorer 中的 2,083 字符]
    * [http://support.microsoft.com/kb/254786/zh-cn 截断 PRB： 查询字符串]
* Firefox
    * [http://forums.mozillazine.org/viewtopic.php?f=7&t=322458 What's the Maximum URL length in Firefox]
* Apache
    * [http://httpd.apache.org/docs/2.2/mod/core.html#limitrequestline LimitRequestLine Directive]
    * [http://stackoverflow.com/questions/1289585/what-is-apaches-maximum-url-length What is apache's maximum url length?]
* URL
    * [http://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url What is the maximum length of a URL?]
    * [http://www.boutell.com/newfaq/misc/urllength.html What is the maximum length of a URL?]
    * [http://hiox.org/425-maximum-length-of-a-url.php Maximum length of a URL]
    * [http://blog.csdn.net/somat/archive/2004/10/29/158707.aspx 两个长度限制问题的分析]
    * [http://www.leosio.com/max-length-with-get-method GET方式传值的最大长度]
    * [http://blog.csdn.net/m_changgong/archive/2010/07/25/5764711.aspx HTTP Get请求URL最大长度]
    * [http://www.cnblogs.com/hyddd/archive/2009/03/31/1426026.html 浅谈HTTP中Get与Post的区别]
    * [http://hi.baidu.com/%BF%A8%C3%D7%D1%AA%CC%E3/blog/item/8042cb97570f08037bf480a3.html Get方法提交URL的最大长度限制]

    IE:      2,083
    FF:     65,536
    Safari: 80,000
    Opera: 190,000
    Apache:  8,190
    IIS:    16,384

其他测试结果：
IE6.0                   :url最大长度2083个字符，超过最大长度后无法提交。
IE7.0                   :url最大长度2083个字符，超过最大长度后仍然能提交，但是只能传过去2083个字符。
firefox 3.0.3           :url最大长度7764个字符，超过最大长度后无法提交。
Opera 9.52              :url最大长度7648个字符，超过最大长度后无法提交。
Google Chrome 2.0.168   :url最大长度7713个字符，超过最大长度后无法提交。

Baidu:
IE6: 2152,2664,2152,2152,2089
IE8: 2344,2536,2152,
FF3: 3176,2472,2344,
Ch11: 2536,3238

ECMNG:
IE: 4095, 无效指针
FF,Chrome,Apache: 8209


## 部署

JSniffer

DOMLint
HTMLint

==
开发环境 DEV
测试环境 SIT
    JSniffer

    DOMLint
    HTMLint
    CSSniffer
    CSSLint
发布环境 PUB
    JSniffer

    DOMLint
    CSSniffer

## See Also

* [](https://damnit.jupiterit.com/home/learn)
* HTML
    * [display:inline-block的深入理解](http://www.planabc.net/2007/03/11/display_inline-block/)
    * [inline-block属性总结](http://www.cnblogs.com/svage/archive/2011/01/17/1937670.html)
    * [XHTML标签的嵌套规则](http://www.makben.cn/?p=305),
        [2](http://www.cnblogs.com/newmin/archive/2011/02/18/1958059.html)
    * [p标签的应用](http://www.yzznl.cn/archives/52.html)
    * [html 标签嵌套总结](http://www.xh-css.cn/2010/08/21/html-%E6%A0%87%E7%AD%BE%E5%B5%8C%E5%A5%97%E6%80%BB%E7%BB%93/)
    * [什么是块级元素和内联元素?](http://blog.bandao.cn/archive/39296/blogs-381381.aspx)
    * [谈谈两个可变元素——ins和del](http://xiao3210li.blog.163.com/blog/static/96005640201052033459148/)
        [2](http://www.huihui.name/knowledge-sharing/530.html)
        [baidu cache](http://cache.baidu.com/c?m=9f65cb4a8c8507ed4fece763105392230e54f7397b8c8a5224c3933fcf3704165a3fbfe6627c475286926b6777ee130faaab6a272a0421b58cc8ff109be4cc3c6ad567627f0bf74205a36fb8ca3632b12a872eedb81897ad804684dfd9c4af5744bd55127bf0e7fd5c1767b97881642695ac8e49654863b9fa4316e82a743eec5057b737a2bc737906f1e1ad2f5bb25cc76061c1f86b&p=9c769a46d29852f20aacc4710b1790&user=baidu&fm=sc&query=%C1%BD%B8%F6%BF%C9%B1%E4%D4%AA%CB%D8%A1%AA%A1%AAins%BA%CDdel&qid=a89dd50d0a7ae6ce&p1=1)
    * [HTMLParser](http://ejohn.org/apps/htmlparser/)
        [blog](http://ejohn.org/blog/pure-javascript-html-parser/)
    * [HTML Minifier](http://kangax.github.com/html-minifier/)
* CSS
    * [CSS Parser](http://cssparser.sourceforge.net/)
    * [Simple CSS Parser](http://www.codeproject.com/KB/recipes/CSSParser.aspx)
    * [CSS Order - A Lint style maven2 plugin for CSS to validate best practice](http://code.google.com/p/cssorder/)
    * [Dust Me Selector](http://www.sitepoint.com/dustmeselectors/)
        [@addons.mozilla](https://addons.mozilla.org/en-US/firefox/addon/dust-me-selectors/)
