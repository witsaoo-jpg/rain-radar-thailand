# Rain Radar Thailand · Phase 1.3

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
