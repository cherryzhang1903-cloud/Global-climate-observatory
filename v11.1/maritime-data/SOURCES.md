# V10 港口与海上参考航路

## 港口目录

数据来自 [NGA World Port Index (Pub 150)](https://msi.nga.mil/Publications/WPI)，本次下载的[官方 CSV](https://msi.nga.mil/api/publications/download?key=16920959/SFH00000/UpdatedPub150.csv&type=view)包含3,807条记录。快照取得日期为2026-10-30；这不是港口设施在2026年的实时普查或运营承诺。

`ports.json` 保留官方港名、WPI编号、原始UN/LOCODE、国家字段、经纬度、港口规模及部分设施字段。内部唯一ID使用本快照的`OID_`：原CSV存在重复WPI编号，因此没有仅凭WPI编号合并或丢弃记录。保留原始UN/LOCODE拼写与空格，不擅自更正代码。空白/Unknown为未提供，不等同于“No”；没有把零深度解释为实测水深。

[官方字段说明](https://msi.nga.mil/api/publications/download?key=16920959/SFH00000/WPI_Explanation_of_Data_Fields.pdf&type=view)。原始 `Estimated Time of Arrival Message` 是港口报文属性，不是航运班期或运输时间。

[NGA原出版物](https://msi.nga.mil/api/publications/download?key=16694622/SFH00000/Pub150bk.pdf&type=view)说明不主张美国Title17版权。本网站不代表NGA背书。

## 参考航路网络及许可

数据来源 [Eurostat SeaRoute / Marnet](https://github.com/eurostat/searoute)，固定提交 `88a2e568a8e0144d1f5a81c3931a7bc2bcce6901` 的20km简化海网。[原始GeoPackage](https://raw.githubusercontent.com/eurostat/searoute/88a2e568a8e0144d1f5a81c3931a7bc2bcce6901/modules/core/src/main/resources/marnet/marnet_plus_20km.gpkg)另提供于本目录的`marnet_plus_20km.gpkg`。

官方说明：网络基于ORNL 2000全球航路网，并加入欧洲沿海AIS派生线和后续维护。它是参考路网，不能解释为当前船舶轨迹、实时交通密度、航次或船公司班期。

原始网络及转换数据继续使用 [EUPL-1.2](EUPL-1.2-LICENSE.txt)，不改标为网站根目录的MIT许可。2026-10-30的转换修改：保留折线顶点、经度归一化、坐标保留六位小数、去重重合节点和无向边、以半径6371.0088km的haversine计算每条边距离，并保留通道标签。结果为16,219个节点、31,758条无向边。

复现：在本目录运行 `python convert_network.py`，读取同目录原始GPKG后写出`network.json`。转换代码与网络转换结果按EUPL-1.2提供，来源与修改说明保留在文件头和清单中。

## 航程估算口径

展示范围只限中国港口与海外港口之间的进出口参考联通航线。底层全球海网用于路径计算，不作为完整全球路网显示。中国港口按来源地区字段China、Hong Kong、Taiwan、Macau/Macao识别；来源目录中的76条中国港口记录与示例或当前查询关联的海外港口显示于地图，目录其余港口可作为海外目的港查询。示例不代表实际贸易额、货流量或特定船公司的既有航次。

网站在参考海网上计算最短路径，默认避开西北与东北极地航道。海网存在不代表当前开放，也未核验船型、吃水、通行许可或实时封航。

`估算纯航行小时 = 参考航路距离km ÷ 1.852 ÷ 船速节`，天数为小时÷24。默认16节，用户可在5–40节间调整；这是输入假设，不是某艘船的实测速度。距离显示海里与公里。

港口参考点到最近海网节点的直线仅为虚线接入示意，未验证可航行，不计入网络距离或估算时间；两端接入距离单独显示。任一端超过150km、落在同一节点或所选条件无连通路径时，不生成冒充可航行的港口直线航线。

估算不含等泊、装卸、停港、运河排队、天气海况和船型限制，不是实际运输承诺或预计到港日期。地图上可点击的线条均为具有中国与海外起止港口的完整参考航程；不把单个海网段的时间冒充完整港口航程。所有资料仅供地图分析与可视化参考。

数据哈希和下载地址见 [manifest.json](manifest.json)。
