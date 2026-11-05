# 全球气候观测 V12

全部12967个站点的详细气象报告改为ECMWF官方ERA5点位时间序列，按需获取2025年数据，不使用Meteostat气象数据或其他站点回退。太阳辐照与UVA＋UVB仍为NASA POWER，累计单位MJ/㎡；紫外只展示每月、全年。

ERA5是0.25°最近网格再分析，不是站点仪器实测；高山、盆地、海岸会存在局地代表性差异，同一网格的多个站点可能数据相同。报告末尾标注实际网格坐标、来源、IANA时区和缓存情况。四站试点Pilatus年均温差约5.52℃，吐鲁番AH小时数501对比原报告1276；不能把原Meteostat（含大量模型记录）当纯实测基准，也不能宣称ERA5逐站精度已验证。

首页风险分、气候类型、极寒标记和Excel快照仍沿用原结果，未按ERA5重算；点击后气象统计由ERA5逐小时数据重新计算。人口和中国进出口航运图层保持独立。

## 获取与处理

- 官方来源：https://polytope-edr.lumi.apps.dte.destination-earth.eu/collections/era5-single-levels 。直接浏览器跨域读取，不把CDS账号令牌放入前端。接口可用性受官方服务影响，失败显示重试，不使用其他来源冒充ERA5。
- 气温与露点：2米温度，K转℃。相对湿度RH=100×es(Td)/es(T)，IFS CY41R2水面饱和水汽压公式，限制0–100%。风速：10米u/v合成，m/s；气压为海平面气压Pa转hPa；总降水m转mm，按官方逐小时累计时段。
- 读取UTC前后边界，按站点IANA时区过滤2025当地年度。保留夏令时23/25小时日和重复当地小时，CSV保留UTC。半小时时区保留分钟，不人为移动最高温时刻。吐鲁番沿用Asia/Urumqi（UTC+6）。
- 浏览器最多缓存12份ERA5原始响应，有效期30天；报告注明缓存命中。缓存仅存ERA5，失效后重新下载。缺失值不补零。
- 保留完整双站独立报告、Canvas全部小时散点、延迟绘图、导出/打印及右侧固定返回；HH/AH明细表保持隐藏，统计图仍保留。

## 许可

Copernicus Climate Change Service (C3S), ERA5 hourly data on single levels, DOI 10.24381/cds.adbb2d47，CC-BY。保留NASA POWER、WorldPop和第三方地图组件原有来源许可。
