
# 数据通信规格(v1)

----

## PV 统计

用户的每次请求（采样）都会向日志服务器发送请求，用于计算 PV 值。

```json
{
    "url": "https://www.alipay.com/",
    "ref": "https://www.google.com/",
    "sys": "personal",
    "client": {
        "dev": "pc"              // device name.
        "os": "Windows/5.2",     // operating system name & version.
        "scr": "1400x1050x32",   // screen size & color depth.
        "bro": "Firefox/5.3.6",  // browser name & version.
        "eng": "Trident/3"       // engine name & version.
    },
    "pv": 1,
    "domready":345,
    "load": 1060,
    "rnd": "random string"
}
```


## 资源统计(HTML,Image,JavaScript,CSS,Flash,CMS)

```json
{
    "url":"https://www.alipay.com/",
    "ref": "",
    "sys": "cashier",
    "client": {
        "dev": "pc"
        "os": "Windows/5.2",
        "scr": "1400x1050x32",
        "bro": "Firefox/5.3.6",
        "eng": "Trident/3"
    },
    "htmlSize":1024,
    "res":{
        "img": ["https://static.alipay.com/logo.gif",
            "https://static.alipay.com/a.gif", "https://static.alipay.com/b.gif"],
        "css": ["https://static.alipay.com/a.css",
            "https://static.alipay.com/min/?path/to/b.css,path/to/c.css",
            "https://assets.alipay.com/??path/to/file.css,file2.css,file3.css"],
        "js" : ["https://static.alipay.com/a.js", "https://static.alipay.com/b.js"],
        "fla": ["https://static.alipay.com/a.swf", "https://static.alipay.com/b.swf"]
    },
    "rnd": "random string"
}
```

## HTML 不合法

资源统计&HTML错误的数据格式，有且仅有 1 次发送：

```json
{
    "url":"https://www.alipay.com/",
    "ref": "",
    "sys": "cashier",
    "client": {
        "dev": "iPhone"
        "os": "iOS/5.2",
        "scr": "1400x1050x32",
        "bro": "Safari/5.3.6",
        "eng": "Trident/3"
    },
    "htmlError":[
        {
            "ln"    : 1,
            "err"   : 1,
            "code"  : "<label>no [for=id]</label>"
        },
        {
            "ln"    : 2,
            "err"   : 2,
            "code"  : "<input type=\"text\" value=\"no [name=name]\" />"
        }
    ],
    "rnd": "random string"
}
```

## JavaScript 异常

JavaScript 异常消息数据格式，可能有 0 或多次消息发送：

```json
{
    "url":"https://www.alipay.com/",
    "ref": "",
    "sys": "cashier",
    "client": {
        "dev": "pc"
        "os": "Windows/5.2",
        "scr": "1400x1050x32",
        "bro": "Firefox/5.3.6",
        "eng": "Trident/3"
    },
    "jsError":{
        "ln":1,
        "file":"https://static.alipay.com/a.js",
        "msg":"n is undefined."
    },
    "rnd": "random string"
}
```

JavaScript 异常，每一个脚本报错都实时发送。

## 自定义产品监控

```json
{
    "url":"https://www.alipay.com/",
    "ref": "",
    "sys": "cashier",
    "client": {
        "dev": "pc"
        "os": "Windows/5.2",
        "scr": "1400x1050x32",
        "bro": "Firefox/5.3.6",
        "eng": "Trident/3"
    },
    "constom":{
        "type": "log",              // log, info, warn, error.
        "productLine": "security",  // 产品线
        "product": "ukey",            // 产品名称
        "errorCode": "api1-172",     // 错误码
        "counts": 1                    // 可选。错误次数，默认 1 次。
    },
    "rnd": "random string"
}
```

## 最终将统计信息及异常报告URI编码之后发送到服务端


```
SIT:
http://fmsmng.sit.alipay.net:7788/m.gif?encodeURIComponent(data)

线上：
https://magentmng.alipay.com/m.gif?encodeURIComponent(data)
```
