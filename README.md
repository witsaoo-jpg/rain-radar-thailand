# Rain Radar Thailand · Phase 1.16 Forecast Verification

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

## Phase 1.9.1 — senior-friendly single refresh
- A large button immediately above the weather banner checks the current radar snapshot and, only if a place has already been selected and a forecast request can be made, explicitly requests the latest model forecast with the already-disclosed rounded coordinates. It never reacquires GPS, reloads the page, saves locations, or creates a background geolocation/forecast watch.
- Before selecting a place, it updates the public radar only and explains how to select GPS or a favorite place. After selecting a place, clicking is consent to contact Open-Meteo for a fresh model report. Loading and success/failure are announced in a live region, and the control is disabled while its own requests are pending.
- "Refresh" checks the newest **published** TMD snapshot; it does not make GitHub Actions run immediately nor assert that the radar observation time has changed. The forecast and radar remain separate data sources.
- Uses a bumped PWA shell cache version; backend, original radar dashboard, Counter and Credit: witsaoya remain unchanged. `node --test tests/test_easy_refresh.cjs` checks the opt-in and no-reload behavior.

## Phase 1.10 — weather first, large typography and simple flow

- On opening the site, a static public snapshot from Open-Meteo automatically shows the conditions of **six fixed Thai representative cities** (Chiang Mai, Khon Kaen, Bangkok, Chonburi, Kanchanaburi and Hat Yai). This requires no browser geolocation, no browser-side third-party forecast call, and no user action. These are city grid forecasts, **not** direct radar interpretation or a complete nationwide forecast.
- The summary counts only represented cities whose maximum hourly model rain probability in the next three forecast intervals reaches 50%. It does not claim that all other parts of Thailand are dry. Labels show source and snapshot retrieval time. A snapshot older than 120 minutes, or with insufficient valid city data, is unavailable rather than falsely current.
- Large text and touch targets are used at the top and on mobile. The detailed forecast tiles and advisory are folded into a voluntary “ดูรายละเอียด...” section so the radar can be found without scrolling through numerous empty dashboard cards. Personal forecasts still require first choosing GPS/favorite place and explicitly consenting to send rounded coordinates to Open-Meteo.
- The big refresh requests the newest **published** public overview and radar snapshot, plus a fresh personal forecast only after the user has selected a place and clicks. It does not trigger GitHub Actions instantly. TMD official warning link remains prominent; all prior radar controls, visitors counter and Credit: witsaoya stay unchanged.
- Build: GitHub Pages Actions generates `docs/data/public-overview.json` at each deployment. Any upstream failure writes `status=unavailable, cities=[]`. Tests include `pytest tests/test_public_overview.py` and `node --test tests/test_public_overview.cjs`.

## Phase 1.10.1 — integrated favorite places and local weather

The saved-place list is now directly within the large top Local Weather banner, not buried in a separate side card. Pressing **ดูอากาศ** next to a named favorite is a single deliberate consent action to send approximate coordinates (rounded to two decimal places) to Open-Meteo and immediately render the existing forecast in that same banner. The disclosure is visible directly above the buttons. Merely visiting the site or loading saved favorites still does not contact the provider with private coordinates.

Add/remove forms and exact locally saved coordinates remain in a separate collapsible place-management section. No saved data is migrated, deleted, or submitted automatically. The default public six-city forecast remains independent of location permission. The original radar, public warnings, PWA, visitor counter, and Credit: witsaoya remain unchanged.

## Phase 1.11 — location-first accessible home, opt-in automatic return

- First screen is a large-print local weather card followed by hourly and seven-day Open-Meteo model forecasts, with Home / Radar / Other tools navigation. The original radar stations, history, favorites, weather detail, TMD warnings, visitor counter and Credit: witsaoya remain accessible in Other tools or Radar.
- First-time access: the site does **not** prompt for GPS or send private coordinates until the user presses the clearly labeled opt-in button. That button expressly authorizes a browser GPS request, an approximate (2-decimal) coordinate forecast request to Open-Meteo, and remembering that automatic location forecast is desired on future visits. It never stores exact GPS coordinates persistently.
- Returning users who previously opted in: the page checks browser geolocation permission via Permissions API and only attempts to acquire GPS automatically when the existing permission is `granted`. It does not force a fresh prompt on return when the browser reports `prompt` or cannot be queried. Users can turn off automatic return access with the visible checkbox; a denied request clears the saved preference.
- Each home refresh explicitly requests the existing approximate-location forecast; location changes and forecast errors invalidate displayed personal details. The no-consent fallback offers the existing public six-city sample without a location request.
- Weather information is Open-Meteo forecast model data, **not** direct GPS weather observation or geographic TMD radar nowcast. Daily values use Asia/Bangkok and are checked for structure/units; unavailable values remain unavailable.
- The PWA shell cache has been refreshed to include the location-first UI while model forecasts and radar data remain network-only. Added Node regression tests for initial/return consent, denial, toggle, report display, and navigation.

## Phase 1.12–2.0: ECMWF and comparison groundwork

The Location First landing page now has an optional **Rainfall Outlook** card. Only after a location has been selected and the user clicks **วิเคราะห์ฝนสะสม 5 วัน** does the browser send approximate (2-decimal) coordinates to Open-Meteo. It requests three independent model outputs: ECMWF IFS 0.25°, NOAA GFS Global and DWD ICON Global. Each valid result is checked for timezone, millimetre units, sorted hourly Unix timestamps, and **120 consecutive upcoming hourly precipitation values** (values represent the preceding hour). Incomplete 24/72/120-hour totals remain unavailable; they are never treated as zero. Open-Meteo may interpolate a model's native temporal resolution, so interpolated hourly totals should not be mistaken for native hourly model steps. Retrieved-at time is displayed; original model run timestamp is not asserted unless separately validated.

Multi-model comparisons show the numeric range of valid 120-hour accumulation forecasts and explicitly do not infer an event probability, issue a warning, or predict flooding. The user may separately request an ECMWF 0.25° ensemble distribution: P10, median and P90 are displayed only with at least ten complete validated ensemble member records. This is a *forecast spread*, not a flood probability, return period, or official severity grade. A failed/unavailable model never substitutes another model, fabricated data or a worst-case claim.

Phase 2.0 **preparedness integration, not completed hydrological prediction**: Official [TMD severe weather warnings](https://www.tmd.go.th/warning-and-events/warning-storm) and [ThaiWater](https://www.thaiwater.net/) are linked from the rain outlook. No live hydrological data, drainage capacity, inundation model or verified georeferenced radar cells are yet integrated; the app does not publish evacuation instructions or the label "มหาอุทกภัย" derived from precipitation alone. Direct model API terms/attribution and quotas must be respected before scaling traffic or monetization.

The original radar dashboard, six-city public view, opt-in GPS flow, saved places, visitor counter, and Credit: witsaoya remain intact. Front-end regression tests: `node --test tests/test_rain_outlook.cjs` plus all existing CI checks.

## Phase 1.12.1 — Optional locality names instead of coordinates

On the Location First card, current device GPS can be reverse-geocoded into an **approximate nearby locality, town and province**. This is a third-party geocoding result, not an address verification, exact nearby landmark, or the location of a home. It is obtained via BigDataCloud's free client-side `reverse-geocode-client` endpoint after a *separate explicit consent click*, which clearly discloses that rounded live GPS and connection information are received by the provider. Once opted in, future consented live-GPS updates may resolve names automatically. The user can opt out at any time, and only a consent flag is stored locally, never GPS coordinates or the resolved name. Saved favorites and externally provided coordinates are not sent to the free client API, in accordance with the provider's client-side usage rules. The browser uses four-decimal rounding in this optional service. API errors and rejected/far-away/IP-derived results leave the existing GPS label as a fallback; pending fetches are aborted when the current place changes.

BigDataCloud free service policy: https://www.bigdatacloud.com/docs/article/why-is-reverse-geocoding-api-free and domain guidance: https://www.bigdatacloud.com/docs/api-domains . This is independent of the existing Open-Meteo weather-model forecast consent.

## Phase 1.12.2 — Rain outlook explained in Thai for the public

After an explicit model analysis, a prominent large-print summary explains the 24-hour, 72-hour and 120-hour accumulation ranges based only on complete valid ECMWF/GFS/ICON data. It states how many of three models actually have each complete accumulation period, describes their numerical difference, and gives ordinary preparedness guidance to consult daily forecasts, TMD warnings and radar. It never infers flooding, event probabilities or guaranteed safety from rainfall alone. If model results are missing it visibly reports insufficient evidence rather than replacing them with zero. The detailed numerical comparison remains accessible in an expandable section, with optional ECMWF Ensemble below. Changing or clearing the selected location clears the entire previous summary. Tests are included in the existing Rain Outlook suites. Original weather home, opt-in GPS, TMD radar, Counter and Credit: witsaoya remain unchanged.

## Phase 1.13 — National Radar Explorer (regional station directory)

The Radar tab now contains a searchable/collapsible sidebar catalogue of TMD-listed radar stations across the country, including separate Bangkok and Rainmaking groupings as shown on the TMD public radar directory. Station listings are **directory links, not proof that any station is operational or currently publishing data**. Only the five already tested local viewer sources (national composite, national loop, Sattahip, Rayong and Suvarnabhumi) use our GitHub Pages snapshot manifest; their dots denote the availability/freshness of a published snapshot, not radar instrument health or guaranteed observation timestamp. All other entries open the official [TMD radar directory](https://weather.tmd.go.th/THA_Z.php) in a separate tab when an exact station deep link was not independently verified. This avoids broken, guessed or unauthorized image URLs, and places the authoritative choice with the user. The existing failure fallback link remains visible for in-app stations where the TMD snapshot cannot be validated.

The directory does not increase scraping frequency nor load images for every station. Before adding individual image snapshots, each station URL, actual image provenance, image licensing/terms, observation timestamp and technical handling must be verified separately. No invented observations. Search and accessible mobile regional menus are checked by tests. Existing Location First forecast, ECMWF outlook, counter and Credit: witsaoya remain unchanged.

## Phase 1.14 — working zoom, representative radar for five regions, citizen-level rainfall interpretation

The image viewport now permits raster zoom up to 250% with true scrollbars, keeping its controls above the image. Zoom is disabled when a real published image is unavailable. Five one-tap region buttons show representative TMD station snapshots in the **same WEATHER RADAR FEED**: Chiang Rai (North), Khon Kaen (Northeast), Suvarnabhumi (Central), Rayong (East), and Phuket (South); national composite is also offered. These represent each station's radar coverage, not every province in the region. Chiang Rai, Khon Kaen and Phuket are newly added to the bounded GitHub Actions capture allowlist using verified TMD public source pages. If upstream content fails image validation, the viewer reports "unavailable" and provides a source-page link, not fabricated imagery. New stations do not yet have retained image history, and snapshot capture time is not radar observation time.

After users explicitly request the multi-model rainfall forecast, a Thai-language sentence uses **complete 24-hour model precipitation series** to say how many of ECMWF/GFS/ICON predict at least 0.1 mm in any hourly interval, whether models disagree, and the largest predicted one-hour amount. This is not a claim that rain persists all day, a calibrated probability, or flood risk. A separately obtained Open-Meteo location forecast's maximum probability for the displayed next three hours may be shown **with its separate attribution and timeframe**, only when present and fresh. Five-day precipitation totals are millimetres, never a percent chance of rainfall. Incomplete or unavailable series lead to a plain no-data explanation.

## Phase 1.15 — Easy Install / Add to Home Screen

A compact install action now lives in the top bar beside Thai time. The interface distinguishes platform capabilities instead of showing a fake universal install button:

- **Android / Chromium installable browsers:** the button appears only after the browser emits the standard `beforeinstallprompt` event. A click invokes the browser's native PWA installation prompt. If the user dismisses it, the UI falls back to honest manual browser-menu instructions.
- **iPhone / iPad:** because browsers do not expose the same programmatic install prompt, the visible action opens a large Thai guide: open in Safari, tap Share, choose **Add to Home Screen / เพิ่มไปยังหน้าจอโฮม**, then Add.
- **Already installed / standalone:** the install action is hidden using `display-mode: standalone` / iOS standalone detection. The `appinstalled` event also closes the guide and hides the action.
- The existing service worker continues to cache only the application shell; radar, forecast, warning and other `/data/` responses remain network-driven. The cache version is `rain-radar-shell-v115`.
- Added Apple web-app metadata and an Apple touch icon reference. No account, notification permission or GPS permission is requested by installation.
- Automated Node tests cover iPhone guidance, Android native prompt, prompt dismissal/manual fallback, installed-state hiding, and secure-context service-worker registration.

The website remains usable without installation. Installation does not make live radar or forecast data offline.

### Rainfall criteria in millimetres

The public Rainfall Outlook now also shows a **24-hour rainfall criteria** panel in millimetres: <0.1 mm (unmeasurable/trace), 0.1–10.0 mm (light), 10.1–35.0 mm (moderate), 35.1–90.0 mm (heavy), and ≥90.1 mm (very heavy). The app compares the validated next-24-hour ECMWF/GFS/ICON accumulation range with these TMD-style rainfall-amount bands and states the resulting label in plain Thai. This is a readability aid for forecast accumulation, **not** an assertion that forecast values are observed TMD 07:00–07:00 rainfall. The thresholds are not applied directly to 72-hour or 120-hour totals and are not used to infer flooding or issue warnings.

The PWA shell cache is refreshed as `rain-radar-shell-v115-rain-mm` so installed users receive the new panel.


## Phase 1.16 — Forecast Verification

The Rainfall Outlook now creates a **local-only 24-hour forecast snapshot** whenever the user explicitly requests validated ECMWF/GFS/ICON rainfall guidance. The snapshot records the selected place label, the exact forecast verification window, retrieval time and each available model's 24-hour precipitation total. Up to 20 records are retained in that browser's `localStorage`; they are not uploaded to GitHub or a project server.

A verification record cannot be scored until its full 24-hour window has ended. The user may then enter an observed 24-hour rainfall total in millimetres and identify the source (for example, an official rain gauge/AWS report) while confirming that the observation covers the **same displayed time window**. The app computes, separately for each model:

- absolute rainfall error and running MAE in millimetres;
- Hit, Miss, False alarm and Correct negative using 0.1 mm as the rain/no-rain threshold;
- whether the forecast and observed 24-hour totals fall in the same rainfall-amount band.

The application deliberately **does not convert the existing radar PNG/dBZ image into observed millimetres**. The current radar integration is not a verified georeferenced QPE product, so radar pixels are excluded from verification scoring. The app also does not rank or name a “best” model; it exposes the accumulated measurements so performance can be interpreted from evidence.

Clearing browser site data removes these local verification records. A future phase may automate observations only after a documented, time-aligned official rainfall observation source is integrated and validated.
