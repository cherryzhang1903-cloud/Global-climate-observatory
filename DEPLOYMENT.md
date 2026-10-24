# 全球气候风险观测 V3

V3为静态在线气象报告，入口为 `v3/index.html`；根页面会自动跳转。全部12967个站点的风险分及分类来自已确认年度工作簿。逐小时气象数据按需直接读取Meteostat官方年度接口，无API密钥，无本地逐小时气象文件。

站点当地时区及夏令时用于日/月分组，跨年边界按需补取前后年度记录；CSV同时导出当地时间和UTC时间。网络或数据缺失会显示提示，不会静默使用本地气象文件。具体说明见V3使用说明.md。

本仓库许可证仅适用于原创代码；Meteostat数据、第三方依赖及地图仍适用各自许可。Meteostat数据来源和许可链接在站点报告内；ECharts许可和NOTICE位于vendor目录。

GitHub Pages设置：仓库Settings → Pages → Deploy from a branch → main / (root)。`.nojekyll`确保直接提供静态文件。不要上传原始逐小时数据或本地完整工作区。
