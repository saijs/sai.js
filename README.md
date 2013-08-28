# monitor

---

通用前端监控采集脚本。

前端监控脚本提供以下监控特性：

* JavaScript 异常监控。
* DOM 非法使用。
* 静态资源非法使用。


前端监控脚本可以自动收集页面中未捕获的 JavaScript 异常。
对于已被捕获的异常，可以通过 `monitor.error()` 接口进行监控。

---

前端监控脚本拆分为两个部分，小巧的先行脚本建议内联（也可以外联）在页面头部，
在所有脚本和外部资源之前，最佳位置推荐如下：

```html
<html>
  <head>
    <meta charset="utf-8" />
    <script type="text/javascript" src="seer.js"></script>
  </head>
</html>
```

另一个脚本可以通过异步方式加载在页面底部，用于处理监控日志的发送和其他扩展
监控支持。

## 使用说明

```javascript
try{
  throw new Error("msg");
}catch(ex){
  monitor.error(ex);
}
```


## API

### monitor.error(Error error)

JavaScript 异常监控的接口，可以用于主动监控被捕获的 JavaScript 异常。

### monitor.log(String seed [, String profile])

前端监控的通用频次监控接口。通过这个发送监控数据，并配合对应的日志处理和数据分析，
可以完成多种监控需求。

* `seed`: 监控点。
* `profile`: 日志类型，默认为 `log`。

### monitor.log(Object data)

可以发送任意自定义键值对的数据类型。

### monitor.on(String eventName, Function handler)

监控到特定类型的数据时，会触发的特定事件。内置支持的事件类型包括：

* `*`: 发送所有类型的数据都会触发。
* `jserror`: 发送 JavaScript 异常数据前触发。
* `log`: 发送自定义 log 监控数据会触发。


### monitor.off(String eventName [, Function handler])

取消通过 on 绑定的事件。

### monitor.lost(String uri)

页面加载特定资源失败时，可以调用这个方法。
缺失的资源对于异常分析有较大帮助。

范例：

```html
<script src="sea.js" onerror="window.monitor && monitor.lost && monitor.lost(this.src)"></script>
<script>
// seajs 2.1 开始支持，但 error 事件仍有缺陷，下面的实例代码仅做演示。
seajs.on("error", function(module){
  window.monitor && monitor.lost && monitor.lost(module.uri);
});
</script>
```
