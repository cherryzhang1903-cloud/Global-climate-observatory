# V9人口静态瓦片服务

线上：`https://global-climate-population-v9.cherry-zhang1903.workers.dev/tiles/worldpop-2026-r2025a/{z}/{x}/{y}.webp`

采用WorldPop Global2 R2025A v1、2026年模型估计（含外推），UN-adjusted constrained全球30角秒格网（赤道附近约1km）。来源：https://hub.worldpop.org/geodata/summary?id=80032 ，CC BY4.0，DOI10.5258/SOTON/WP00845。不是2026逐户普查实测，也不使用未来2030年数据。

原每格人数按纬度相关球面面积换算成人/km²，半径6371007.1809m；先生成密度栅格及平均有效值概览，再以nearest投影成1024px无损WebP。地图缩小时属于显示概化，不能通过屏幕色块面积计算人口；空白不直接判零。原生约1km，放大不创造细节。

z0–6共5461张瓦片，包括透明空瓦片，部署至Cloudflare静态资产。`_headers.template`复制为`public/_headers`。正常瓦片由静态服务直接提供CORS和一年不可变缓存，不需回源原GeoTIFF、不运行Worker。旧PMTiles接口保留为历史兼容，不是当前V9人口源；兼容接口缓存按数据版本及字节范围区分，保存200字节块后恢复206，带HIT/MISS诊断。

## 重建和部署

安装requirements.txt，按官方页面下载2026原始GeoTIFF。不要上传原始TIFF或账号凭据到Git。

```powershell
python tools/build_population2026_tiles.py --source C:/path/worldpop-2026.tif --density C:/path/density-2026.tif --assets ./public
Copy-Item _headers.template public/_headers
npx wrangler deploy
```

检查输出人口总量、NoData/零值及密度还原误差；清单见population-manifest.json。脚本会限制总文件数。原生格网更新、配色或算法有变动时，应改瓦片路径版本再发布，以免immutable缓存混用旧内容。不要运行本地临时下载转发程序到生产。
