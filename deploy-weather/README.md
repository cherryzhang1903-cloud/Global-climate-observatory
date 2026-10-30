# V11 Meteostat official-data relay

Endpoint: `https://global-climate-weather.cherry-zhang1903.workers.dev/hourly/{year}/{station}.csv.gz`

The service accepts only catalog station IDs and UTC years 2024–2026, covering the 2025 local-year boundary. It creates server-side requests to fixed official Meteostat hosts without forwarding browser Origin, cookies or credentials. Responses allow the GitHub Pages origin and local loopback development origins; this is not an arbitrary URL proxy. No API key is exposed to the website. Population service is unchanged.

Preferred source is `https://data.meteostat.net/hourly/{year}/{station}.csv.gz`. If unavailable, the relay tries official legacy v2 annual and full-station archives. `X-Meteostat-Format`, `X-Meteostat-Source-URL`, `X-Meteostat-Modified` and `X-Meteostat-Upstream-Status` expose the actual source and failure chain to the application. Only successful responses are cached for 24 hours; failed responses are not cached. Compressed files are streamed with a 32 MiB bound, with no yearly parsing on the Worker.

The browser streams legacy archives, retains only the 2024–2026 UTC records, and reuses a full archive for local-year boundary data instead of downloading it again. Original units and UTC timestamps are retained until the existing station IANA conversion. Missing fields remain missing. Legacy model-source metadata is unknown and displayed as such, not zero model hours; a visible warning records the archive source and modification date. No other station or local hourly file substitutes for failures.

## Deployment and tests

`node test-worker.mjs` checks allowlists, CORS, Origin omission, official fallback order, platform redirect compatibility and errors. Run `wrangler deploy` in this folder using the account's normal OAuth login. Do not copy tokens into this project. Loader tests are in `../report-v15/test-meteostat-relay.mjs`.

## Primary references

- [Current hourly time series specification](https://dev.meteostat.net/data/timeseries/hourly)
- [Meteostat v1.6.8 legacy hourly schema](https://github.com/meteostat/meteostat-python/blob/v1.6.8/meteostat/interface/hourly.py)
- [Legacy endpoint construction](https://github.com/meteostat/meteostat-python/blob/v1.6.8/meteostat/utilities/endpoint.py)
- [Official source/model mapping](https://github.com/meteostat/meteostat-python/blob/v1.7.6/meteostat/interface/hourly.py)
- [Data license](https://dev.meteostat.net/license.html)

Meteorological data remains Meteostat data, including any source-specific/model substitutions. The relay is a transport and compatibility service; it does not synthesize observations or recalculate homepage risk scores.
