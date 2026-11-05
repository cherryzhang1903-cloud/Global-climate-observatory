# 柯本—盖格气候图层

历史基准期1991—2020，与本站2025年气象和2026年人口是不同时间口径；不参与首页干湿热评分计算。

科学来源：Beck et al. (2023), High-resolution (1 km) Köppen-Geiger maps for 1901–2099 based on constrained CMIP6 projections, Scientific Data 10, 724. https://doi.org/10.1038/s41597-023-02549-6 。数据许可CC BY 4.0。

显示数据： https://koppenmap.com/data/cogs/1991-2020.tif ，来自 https://github.com/dropbop/koppen 项目的web-ready派生数据；其README明确从0.1°来源概化生成4096×4096 EPSG:3857栅格。因此本站显示约10km概化图，不声称保持原研究1km分辨率。源图类别为0–30，0无数据透明。下载后使用Pillow以最近邻生成z0–4本地XYZ PNG，类别不作双线性插值，不依据颜色推导人口或风险。

30类型的颜色与代码来自原派生项目zones.json；中文名称为本站说明。缩放超过z4仅放大原栅格，不增加空间精度。海洋/无数据透明，不将空白解释为零风险。

图层与气候站点、人口分别开关，独立透明度，顺序从下到上为柯本、人口、站点；不改变其他图层的数据。港航保持独立模式。
