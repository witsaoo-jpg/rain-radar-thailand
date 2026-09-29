# Rain Radar Thailand · Phase 1.9 One-tap Weather

Unofficial, Thai-language weather-radar viewer for **GitHub Pages**. Frontend is HTML/CSS/vanilla JS. Radar images originate from TMD's public pages. This is **not** a TMD API, an official TMD product, or a guaranteed live weather service.

## What changed from v0.1

- Preserved the responsive dark dashboard and five station/source tabs.
- Added fully static website at `docs/`: all asset paths are relative so GitHub's `/USERNAME/REPOSITORY/` URLs work.
- A scheduled/manual **GitHub Actions** workflow checks selected public TMD pages and, when permitted and accessible, validates and publishes actual image snapshots and `docs/data/radar.json` as a Pages deployment. No always-on MacBook or paid API needed.
- Images that cannot be downloaded or verified are **not substituted with sample weather**. Each station has a working link to its official source.
- Optional browser GPS: only shows coordinates and opens OpenStreetMap. It does not upload location or imply location-specific precipitation.
- Official TMD Chonburi province forecast link (rather than presenting unverified forecast data as our own).
- Separately labels Snapshot generation time and radar observation time. The latter stays unknown unless provided and validated by the source; users must inspect UTC on the image (+7 h for Thailand).
- Historical frames are shown only if verified/source-provided. This version does **not** invent animation or future rain forecasts.

## Important: publishing to GitHub Pages

1. Create a **public repository**, for example `rain-radar-thailand` (GitHub Pages for public repositories is available on GitHub Free).
2. Unzip the release and upload **the contents of `rain-radar-webapp/`** to the repository root, including the hidden `.github/workflows/pages.yml` file. Do not upload the enclosing folder as an extra level.
3. Open repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Open **Actions → Build and publish radar viewer → Run workflow** to produce the first snapshot. The same workflow runs on pushes to `main` and (best-effort) roughly every 30 minutes. GitHub's schedule is not exact and jobs may be delayed or paused.
5. Wait for the deployment to turn green. Your URL will normally be `https://USERNAME.github.io/rain-radar-thailand/` (replace both names with the real ones). A disabled Actions workflow, changed TMD site, or upstream refusal will leave a transparent unavailable state and source links.

**You must check TMD's usage conditions/permission before publicly republishing its images, especially commercially.** GitHub Pages publicly serves the snapshot images. For a strictly link-only site, disable the schedule and use official-page links; source acknowledgement does not by itself grant redistribution rights.

No API keys, passwords, `.env`, or private patient/research data should be committed. This repository is unrelated to `thesis-esymptom-webapp`.

### Web use locally (without backend)

```bash
cd rain-radar-webapp
python3 -m http.server 8082 --directory docs
# Open http://localhost:8082
```

Initial `docs/data/radar.json` intentionally says the radar is unavailable until the publish workflow fetches actual imagery. To build fresh snapshots locally (requires internet and Python dependencies):

```bash
python3 -m pip install -r requirements-publish.txt
python3 scripts/update_radar.py --output docs/data
python3 -m http.server 8082 --directory docs
```

On a successful fetch, the image is saved as `docs/data/images/<station>.<extension>`. The script uses allowlisted TMD hosts, rejects redirects and files above 12 MB, checks actual image format/pixel size, and never guesses scan time.

### Legacy FastAPI v0.1

The original local backend remains in `app.py`, with its frontend under `static/`. It still runs via `./run_mac.command` and is independent of the GitHub Pages edition. GitHub Pages cannot execute FastAPI/Python on each website visit.

### Run tests

```bash
python3 -m pip install -r requirements-publish.txt -r requirements.txt pytest
pytest -q
node --check docs/assets/app.js # if Node.js is available
```

### Sources & terms

- [TMD radar composite](https://weather.tmd.go.th/THA_Z.php)
- [TMD Sattahip](https://weather.tmd.go.th/sattahip.php)
- [TMD Rayong](https://weather.tmd.go.th/ryg.php)
- [TMD Suvarnabhumi](https://weather.tmd.go.th/svp120.php)
- [TMD radar disclaimer](https://weather.tmd.go.th/disclaimer.html)
- [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

Radar echoes can include non-precipitation objects. Source pages may report UTC. The project gives no rain probability, nowcast, or safety guarantee. TMD, not this project, is the source of radar imagery.

## Phase 1.2 — Rain Near Me (GPS only)

- Permission-based browser Geolocation API, HTTPS/localhost only. No auto-request, local storage, API submission or server-side GPS tracking.
- Coordinates, reported accuracy and location timestamp are shown only in the current page. Clear invalidates pending callbacks and empties the iframe.
- Optional OpenStreetMap map and external link: **location is sent to OpenStreetMap only when the user explicitly chooses the map/link**. The default app does not contact OpenStreetMap.
- The TMD image is **not georeferenced** in the current integration, so GPS is displayed on a separate map, never falsely superimposed on radar pixels. No rainfall-distance or arrival-time claims.
- To run frontend tests: `node --test tests/test_near_me.cjs`; test-before-deploy runs in GitHub Actions.

The public TMD radar disclaimer describes its imagery as near-real-time and subject to non-precipitation echoes: https://weather.tmd.go.th/disclaimer.html

## Footer attribution and optional visitor counter

The footer credits **witsaoya** and loads the visitor-counter image from a third-party provider, FreeCounterStat / optistats.ovh. This is not an in-house measurement. Visiting the website can contact that provider when the image is loaded, potentially exposing browser connection information (such as IP address and user agent) according to the provider's policies. The image uses `loading="lazy"` and `referrerpolicy="no-referrer"`. Counter availability and accuracy are outside this project's control.

## Phase 1.3 — Snapshot replay, public safety links and PWA

- The scheduled Pages job uses only validated public TMD radar images and tries to retrieve **its own previous public Pages snapshot** to preserve up to six unique frames within the last two hours. Each frame is SHA-256 validated, image-format validated, and limited to 12 MB; bad, expired or inaccessible history is discarded. Frames are collected only while the workflow succeeds, and schedules may be delayed. The animation may therefore be unavailable or shorter than two hours.
- Replay is manual Play/Pause or timeline slider, labeled by **capture/snapshot time**, not by TMD radar observation time. Images may have different source framing. No automated motion vectors, heading, speed, or rain-arrival predictions are asserted; users can visually compare captures only.
- Official source links for [TMD weather warnings](https://www.tmd.go.th/warning-and-events/warning-storm) and [Chonburi weather including 7-day forecast](https://tmd.go.th/weather/province/chonburi) avoid republishing potentially stale alerts or claiming the absence of a displayed alert means no threat. This static site does not send notifications.
- Mobile PWA includes a manifest and generated 192/512px icons; the service worker caches only its UI shell. **Radar images, radar.json and warnings are never intentionally cached as current data.** Installation support varies by browser; internet is required for up-to-date weather. On iPhone use Safari → Share → Add to Home Screen.
- FreeCounterStat footer and Credit: witsaoya are retained. Third-party counter privacy applies.
- Tests: `python -m pytest -q tests/test_app.py tests/test_publish.py tests/test_history.py` and `node --test tests/test_near_me.cjs`; GitHub Actions gates public deployment on these tests and JavaScript syntax checks.

The weather source can be unavailable without this application being able to fix it. Never use this project as a substitute for official emergency alerts.

## Phase 1.4 — opt-in local rain forecast

- User must first grant browser GPS access, then separately click **ดึงพยากรณ์พื้นที่ของฉัน** before this site sends approximate coordinates to Open-Meteo. Coordinates are rounded to two decimal places client-side and are not added to the repository, application storage, or site backend. Open-Meteo receives those coordinates and normal connection information under its own privacy policy.
- Request: `https://api.open-meteo.com/v1/forecast` with hourly `precipitation_probability` and `precipitation`, Unix timestamps, Asia/Bangkok timezone, 2 forecast days. Display 6 upcoming full-hour values. The three-hour summary is the maximum available model probability and sum of precipitation only when all three amount values are available. Unknown values remain unknown.
- Model forecast is **not** a TMD radar observation, GPS rain measurement, official emergency warning, guaranteed rainfall, or imminent rain alert. Model grid coordinates may differ from device GPS. The display gives forecast retrieval time and per-hour forecast time.
- A previously requested forecast is cleared when GPS is cleared or changed, including pending results. The "clear forecast" control also cancels a pending request; geolocation remains until separately cleared.
- Radar pixel-to-geographic coordinates have not been verified from the current PNG source. Consequently v1.4 shows an honest unsupported-state notice instead of inventing distance to a rain cell, its travel direction or arrival time. A genuinely georeferenced radar/QPE dataset with documented timestamps and projection would be required to ship those measurements.
- Source and terms: [Open-Meteo API documentation](https://open-meteo.com/en/docs), [Open-Meteo terms](https://open-meteo.com/en/terms), [TMD official warnings](https://www.tmd.go.th/warning-and-events/warning-storm). Check whether the site's use qualifies for Open-Meteo's free non-commercial tier before changing traffic or monetizing.
- Browser forecast API fetches always use network and are not stored by the PWA service worker. Site counter remains a separate optistats.ovh third party.
- Automated checks include `node --test tests/test_forecast.cjs` and the existing GPS/radar/Python tests.

## Phase 1.5 — opt-in weather summary at top
- The location-aware summary appears **under the page heading and above the radar** on desktop/mobile. Until GPS and an additional explicit forecast request, it shows a neutral prompt. It never initiates geolocation or third-party forecast requests on page load.
- The same consent-based Open-Meteo request already powering Phase 1.4 also requests current model estimates (temperature, apparent temperature, relative humidity, wind speed and WMO weather code). No extra remote request or site-side storage. Coordinates are rounded to two decimal places before transmission.
- The banner summarizes weather code, temperature and maximum rain probability in the next three hourly forecast intervals. Model/current timestamp and retrieval time are labeled separately. Missing/stale values cannot be displayed as current, and a failed request or cleared GPS resets the banner safely.
- It is **not an official TMD warning**, an onsite rain measurement, or a push notification. Always consult official TMD warnings when appropriate. The existing counter and Credit: witsaoya are unchanged.

## Phase 1.5.1 / 1.6 — history quality and My Locations

- Reconcile replay/history paths with the producer's actual validated `./data/images/history/<station>/<sha>.<extension>` naming. Paths are constrained to the selected radar station. Duplicate or malformed frames are excluded; timestamps are sorted by explicit ISO UTC offset.
- Radar manifest older than 90 minutes (or >5 minutes into the future) is **not presented as current weather**. The page shows an unavailable state with the official source link. Snapshot capture time is NOT radar observation time. Replay is never treated as a current observation.
- Favorite places may be explicitly saved, named and deleted on the same browser (up to five). Enter latitude and longitude directly, or click to copy an already-consented GPS reading into the form. No external geocoder or automatic reverse-geolocation calls. Local browser storage is optional; data does not sync to other devices.
- Selecting a saved location passes coordinates only inside this webpage. It resets the prior forecast and explicitly requires another click on the forecast button, where coordinates are rounded to 2 decimals before the request to Open-Meteo. The banner identifies the selected name and does not claim to be an official radar-based nowcast.
- **Radar-only localized nowcasting/distance-to-rain remains unsupported** with the present unlabeled PNG raster: accurate location-based overlay needs authenticated geographic grid/projection, calibrated observation timestamps, and validated motion estimation. The app does not pretend its weather model percentages are radar measurements.
- Existing dashboard, TMD sources, third-party visitor counter and `Credit: witsaoya` remain intact.
- JavaScript regression checks: `node --test tests/test_places_history.cjs`, `node --test tests/test_near_me.cjs`, and `node --test tests/test_forecast.cjs`.

## GPS favorites hotfix and public-weather roadmap implementation

- Fix: `places.js` previously returned early because it looked for an absent `favorite-places` DOM id. It now initializes against the actual `places-heading` element. The GPS copy button fills coordinates, and saving still requires a user-provided name and an explicit click.
- Phase 1.7: Add a separately labeled, plain-language weather-model advisory from a forecast the user deliberately requests. Values are not radar nowcasting or official TMD warnings. A cleared/changed location invalidates the previous advisory.
- Phase 1.8: Add an opt-in interactive OpenStreetMap view of the selected GPS/favorite location. The external iframe is only loaded on a separate explicit click. It is not an overlay over ungeoreferenced TMD radar and cannot give storm distance or rain arrival time.
- Phase 2.0 **foreground beta only**: Users may opt into in-page advisories when requesting a forecast, with an optional browser Notification permission requested only by user gesture. No background subscription, persistent monitoring, remote push, server, automatic weather checking or official emergency alert claim is implemented. For reliable notifications while the site is closed, a backend/push provider, VAPID, consent/opt-out storage and quotas must be designed and deployed separately.
- Model data source: Open-Meteo; observed radar source: TMD; official severe weather warnings remain linked to TMD. No automatic sharing of GPS with forecast or OpenStreetMap providers.
- CI now tests favorite-panel initialization, advisory thresholds, in-session opt-in, and all earlier frontend/backend/snapshot tests.

## Phase 1.8: Local Weather Intelligence, source-separated
The consolidated report appears above the radar after the user explicitly selects a place and requests its forecast. Open-Meteo model fields supply weather code, temperature, forecast-model rain amount, cloud cover, wind and visibility; display labels always state that these are model estimates rather than observations at the user's precise GPS coordinate. Missing or stale current values do not become zero or "clear". Rain probability is summarized separately for the next three displayed hourly model intervals.
A separate TMD box reports selected radar station availability and snapshot capture time. It does **not** extract pixel measurements, assume georeferencing, imply precipitation at the selected coordinate, identify ground fog, measure temperature, or claim a storm arrival time. The actual radar observation time remains unknown unless separately validated. Raw TMD imagery remains viewable in the original dashboard, and official warning links remain available.
The opt-in GPS/forecast flow, local-only favorite places, PWA, third-party visitor counter and Credit: witsaoya are unchanged. Tests: `node --test tests/test_weather_intel.cjs` and the existing CI suites.

## Phase 1.9 — One-tap report after selecting an area

- Previously, selecting a saved place updated the top banner but required finding a separate forecast button down the page. Now the **top banner itself** becomes the explicit consent action: its label states that approximate rounded coordinates will be sent to Open-Meteo. No forecast call occurs when merely selecting a favorite or GPS.
- Before any selection the same button scrolls to GPS/area selection. After a selection, one deliberate click calls the existing validated forecast flow. Loading, retry, and hourly details are visible from the top.
- Hide the six empty model-data cards until a successful response; leave the independent TMD radar availability notice visible. Clearing/changing location clears the previous report rather than presenting data for the wrong place. The PWA cache version is advanced to refresh the old interface.
- This remains a **model forecast** and radar snapshot display, not location-specific radar nowcasting or a live severe-weather alert. GPS is never automatically transmitted or stored on our server.
- New regression tests: `node --test tests/test_one_tap.cjs` plus all previous checks.
