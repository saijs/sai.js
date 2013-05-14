
# 数据通信规格(v2)

----

## JavaScript 异常

* 脚本异常上下文编号(context)：
    * `0` 异常之前没有不正常情况。
    * `1` 异常之前有脚本资源加载失败。
* 用户现场场景（用户关键行为）

```
?url=
&ref=
&clnt=pc/-1|windows/5.2|ie/8.0|trident/4.0
&screen=1400x1050x32
&v=2.0
&profile=jserror
&file=
&line=
&msg=
&context=0
```

## HTML 不合法

```
?url=
&ref=
&clnt=pc/-1|windows/5.2|ie/8.0|trident/4.0
&screen=1400x1050x32
&v=2.0
&profile=htmlerror
&line=
&code=
&source=
```

## 明文敏感信息监控

监控网站上的敏感信息明文输出的情况。

明文敏感信息包括：

* 身份证号码(idcard)
* 银行卡号码(bankcard)
* 手机号码(phone)

```
?url=
&ref=
&clnt=pc/-1|windows/5.2|ie/8.0|trident/4.0
&screen=1400x1050x32
&v=2.0
&profile=sens
&type=idcard
&content=3604...2013
&msg=
```
