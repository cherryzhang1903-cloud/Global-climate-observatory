# 全球气候观测V9 · 人口加载优化

基于V5，保留12967站2025年风险、30/60分类、极寒蓝色、当地时间Meteostat报告和NASA POWER太阳及月/年UVA＋UVB（MJ/㎡）。

人口从原2020 GHSL制图更新为[WorldPop Global2 R2025A v1的2026年模型估计](https://hub.worldpop.org/geodata/summary?id=80032)（含外推），原生30角秒、赤道附近约1km。CC BY4.0，WorldPop / University of Southampton；DOI10.5258/SOTON/WP00845。数据产品可修订，不能当作2026普查实测。原每格人数按格网纬度面积转换为人/km²，缩小时为显示概化，不用于反算总人口。空白不判零，放大不提高原始精度。

地图使用缓存静态XYZ无损WebP，不再读取约10GB原图档案。支持气候＋人口、仅气候、仅人口及透明度；筛选仅改变气候站点。实际耗时取决于网络与缓存。网页不包含原始人口GeoTIFF。

本地运行项目start_v9.py，预制瓦片放在deploy-v9/public；线上人口源在population-config.json。生成、来源、精度和部署方法见[deploy-v9说明](../deploy-v9/README.md)，校验清单见[population-manifest.json](../deploy-v9/population-manifest.json)。本地与线上均无需人口服务密钥。
