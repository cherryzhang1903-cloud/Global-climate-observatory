# 全球气候观测 V9

基于V5。保留12967站2025风险分、30/60分类、极寒蓝色、散点、筛选、CSV及Meteostat当地时间报告；报告保留NASA POWER太阳辐照和仅月/年的UVA＋UVB（MJ/㎡）。不重新计算首页评分。

人口为Luminocity3D原图GHSL 2020人口密度栅格，非气象站点人口或Excel城市人口。单位人/km²；沿用原图16档非线性色带，放大有细网格。白色不能直接判零。预着色PNG不能反算精确人口值，人口层不提供虚构的数值查询。Web Mercator仅用于浏览；不据投影图上的面积计算人口。

## 使用

在项目目录运行 `python start_v9.py`，打开 http://127.0.0.1:8930/v9/index.html 。Windows也可运行项目的“打开V9.ps1”。需要互联网。本地服务固定转发原图PMTiles的有限字节范围，带64MiB内存缓存，不会全量下载约10GB档案。

地图切换“气候＋人口、仅气候、仅人口”，人口透明度可调。气候颜色/形状与散点一致；点击气候站点打开独立report-v9报告。搜索和筛选只改变气候站点，不裁切全球人口分布。地图中的中国选区含台湾图形。

## 已配置的线上服务

首页和report-v9为静态文件，但本地 `/population/world.pmtiles` 转发端点不能在GitHub Pages上运行。当前url已配置为 `https://global-climate-population-v9.cherry-zhang1903.workers.dev/population/world.pmtiles`；已在GitHub网页中实测跨域206响应。localhost/127.0.0.1通过localURL继续使用本地服务。将来更换服务时，需使用支持HTTPS、HTTP Range和CORS的人口PMTiles地址。保留原档案内容及许可/署名。不要把10GB档案直接提交Git仓库。修改配置后点击重试即可。

源服务器与网络速度仍决定新视野瓦片到达时间。单地图引擎消除了iframe视图同步步骤，不保证所有网络环境下加载更快。失败时页面显示错误并可切换仅气候。

## 来源

- 人口绘图与瓦片：[D A Smith / CASA UCL, Luminocity3D](https://luminocity3d.org/WorldPopDen/)
- 人口数据：[EC JRC GHSL](https://human-settlement.emergency.copernicus.eu/) / CIESIN；年份2020。
- MapLibre GL JS 5.6.2、PMTiles 4.4.0，许可保存在vendor/。
- 实施参考：[MapLibre PMTiles Patterns](https://github.com/maplibre/maplibre-agent-skills/blob/main/skills/maplibre-pmtiles-patterns/SKILL.md)、[Cartography & Geovisualization](https://github.com/muend/geoai-skills/blob/main/skills/cartography-geoviz/SKILL.md)。这些Skill提供方法，不提供人口数据托管。
