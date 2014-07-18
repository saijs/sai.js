
# 安装部署

安装部署到页面上主要包含两个步骤：

1. 部署前置脚本。

    在页面头部，所有的 JavaScript 脚本之前，加人前端监控前置脚本。
    建议使用内联脚本方式部署，也可以使用外联脚本方式。

    前置脚本由小巧的核心部分组成，部署在页面的最前面，可以捕获所有的异常信息。

2. 部署后置脚本。

    使用像 SeaJS 这样的 CMD 模块加载器动态加载后置模块。
    后置模块加载完成后，会自动发送前置脚本已收集的数据。

大概的样本部署代码如下：

```html
<html>
 <head>
  <meta charset="utf-8" />
  <script type="text/javascript" charset="utf-8" src="seer.js"></script>

  <!-- other meta datas... -->
 </head>
 <body>

  page content...


  <!-- page footer bottom -->
  <script type="text/javascript">

  // 如果前置脚本未准备好，建议不加载后置脚本。
  // 如果需要采样监控，请在采样命中后 use 加载 Sai 模块。
  if(window.Sai && rateHited){
    seajs.use(["sai"], function(Sai){
    });
  }

  </script>
 </body>
</html>
```
