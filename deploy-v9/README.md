# V9线上人口接口

GitHub Pages只托管静态页面。此Cloudflare Worker为该站固定转发Luminocity3D人口PMTiles的有限字节范围，保留206、Content-Range和ETag，允许本站CORS；拒绝无界/多段/超过8MiB请求，不接受任意上游URL。原始数据与制图署名保留在V9网页。

在用户自己的Cloudflare账号登录后，在本目录执行 `npx wrangler deploy`。发布后将V9的population-config.json中url改为 `https://实际Worker域名/population/world.pmtiles`，实测浏览器读取后才发布网页。不要将登录凭据写入仓库。

Worker和上游仍有可用性与请求配额限制；人口原数据不在GitHub仓库内。原图是预渲染人口密度，不能通过颜色反算精确数值。
