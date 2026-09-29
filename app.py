"""Rain Radar Thailand: a small, unofficial viewer of TMD public radar pages.

This service does not expose an invented official radar API. It reads known
public station pages, extracts a suitable radar image when possible, and offers
an official-page fallback when a page format changes.
"""
from __future__ import annotations

import asyncio
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlsplit

import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent
STATIONS = {
    "thailand": {"name": "เรดาร์ทั่วประเทศ", "english": "Thailand composite", "region": "ภาพรวมประเทศไทย", "source": "https://weather.tmd.go.th/THA_Z.php", "kind": "composite"},
    "sattahip": {"name": "สัตหีบ · ชลบุรี", "english": "Sattahip", "region": "ชลบุรีและใกล้เคียง", "source": "https://weather.tmd.go.th/sattahip.php", "kind": "station"},
    "rayong": {"name": "ระยอง", "english": "Rayong", "region": "ชายฝั่งภาคตะวันออก", "source": "https://weather.tmd.go.th/ryg.php", "kind": "station"},
    "suvarnabhumi": {"name": "สุวรรณภูมิ", "english": "Suvarnabhumi", "region": "กรุงเทพฯ และปริมณฑล", "source": "https://weather.tmd.go.th/svp120.php", "kind": "station"},
    "thailand-loop": {"name": "ภาพเคลื่อนไหวทั่วประเทศ", "english": "Thailand radar loop", "region": "ภาพเคลื่อนไหว (ต้นทาง)", "source": "https://weather.tmd.go.th/THA_loop.php", "kind": "loop"},
}
ALLOWED_HOSTS = {"weather.tmd.go.th", "satda.tmd.go.th"}
HEADERS = {"User-Agent": "RainRadarThailand/0.1 (personal TMD source viewer)", "Accept": "text/html,image/*;q=0.9,*/*;q=0.7"}
META_TTL = 300
IMAGE_TTL = 300
_cache: dict[str, tuple[float, dict]] = {}
_image_cache: dict[str, tuple[float, bytes, str]] = {}
_lock = asyncio.Lock()
app = FastAPI(title="Rain Radar Thailand", version="0.1.0")
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")


def allowed_url(raw: str) -> bool:
    try:
        p = urlsplit(raw)
        return p.scheme == "https" and p.hostname in ALLOWED_HOSTS and not p.username and not p.password and p.port in (None, 443)
    except ValueError:
        return False


def extract_radar_url(html: str, base: str) -> str | None:
    """Best-effort image extraction; no guarantee that TMD uses stable HTML."""
    soup = BeautifulSoup(html, "html.parser")
    candidates: list[tuple[int, str]] = []
    for el in soup.find_all("img"):
        attrs = [el.get(x) for x in ("src", "data-src", "data-original", "data-image", "data-lazy-src")]
        srcset = el.get("srcset", "")
        if srcset:
            attrs.append(srcset.split(",")[0].strip().split(" ")[0])
        for path in attrs:
            if not path or path.startswith("data:"):
                continue
            target = urljoin(base, path.strip())
            if not allowed_url(target):
                continue
            lower = target.lower()
            if not re.search(r"\.(?:png|jpe?g|gif|webp)(?:\?|$)", lower):
                continue
            alt = (el.get("alt") or "").lower()
            combined = (alt + " " + lower + " " + str(el.get("id", "")) + " " + " ".join(el.get("class", []))).lower()
            if any(x in combined for x in ("logo", "icon", "banner", "facebook", "twitter", "social", "flag", "legend", "favicon", "loading", "spinner")):
                continue
            score = 10
            if any(x in combined for x in ("radar", "เรดาร์", "composite", "sattahip", "rayong", "ppi", "latest", "tha_", "satda")):
                score += 20
            if el.get("width", "").isdigit() and int(el["width"]) >= 350:
                score += 5
            if "loop" in combined or lower.endswith(".gif"):
                score += 3
            candidates.append((score, target))
    # Some TMD pages assign the main image by script rather than <img> markup.
    if not candidates:
        for m in re.finditer(r"['\"]([^'\"\s<>]+\.(?:png|jpe?g|gif|webp)(?:\?[^'\"\s<>]*)?)['\"]", html, re.I):
            target = urljoin(base, m.group(1))
            if allowed_url(target) and not any(x in target.lower() for x in ("logo", "icon", "banner", "legend")):
                score = 10 + (20 if any(x in target.lower() for x in ("radar", "composite", "ppi", "latest", "tha_")) else 0)
                candidates.append((score, target))
    return max(candidates, key=lambda x: x[0])[1] if candidates else None


async def fetch_external(url: str, *, image: bool = False) -> httpx.Response:
    if not allowed_url(url):
        raise ValueError("Remote host is not allowlisted")
    async with httpx.AsyncClient(timeout=httpx.Timeout(13.0, connect=5.0), follow_redirects=False, headers=HEADERS) as client:
        response = await client.get(url)
    # Do not follow redirects, in particular to untrusted hosts.
    response.raise_for_status()
    if 300 <= response.status_code < 400:
        raise ValueError("Unexpected redirect from source")
    return response


async def get_meta(key: str, refresh: bool = False) -> dict:
    station = STATIONS.get(key)
    if not station:
        raise HTTPException(status_code=404, detail="Unknown radar station")
    now = time.monotonic()
    existing = _cache.get(key)
    if existing and not refresh and now - existing[0] < META_TTL:
        return existing[1]
    async with _lock:
        now = time.monotonic()
        existing = _cache.get(key)
        if existing and not refresh and now - existing[0] < META_TTL:
            return existing[1]
        record = {"id": key, **station, "status": "unavailable", "image_available": False,
                  "fetched_at": datetime.now(timezone.utc).isoformat(), "observed_at": None,
                  "notice": "ยังไม่สามารถดึงภาพจากต้นทางได้ กรุณาเปิดเว็บไซต์กรมอุตุนิยมวิทยา"}
        try:
            response = await fetch_external(station["source"])
            if "html" not in response.headers.get("content-type", "").lower():
                raise ValueError("The source did not return HTML")
            src = extract_radar_url(response.text, station["source"])
            if not src:
                raise ValueError("Radar image not found in source HTML")
            record.update(status="available", image_available=True, image_url=f"/api/radar/{key}/image", notice="เวลาที่ดึงข้อมูลไม่ใช่เวลาตรวจวัด โปรดดูเวลา UTC บนภาพต้นฉบับ")
            # Keep the remote URL server-side; never fetch arbitrary user-supplied URLs.
            record["_remote_url"] = src
        except (httpx.HTTPError, ValueError, UnicodeError) as exc:
            record["error_type"] = type(exc).__name__
        _cache[key] = (time.monotonic(), record)
        _image_cache.pop(key, None)
        return record


@app.get("/", include_in_schema=False)
async def homepage():
    return FileResponse(ROOT / "static" / "index.html")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "Rain Radar Thailand", "version": app.version}


@app.get("/api/stations")
async def stations():
    return [{"id": key, **value} for key, value in STATIONS.items()]


@app.get("/api/radar/{key}")
async def radar(key: str, refresh: bool = False):
    record = await get_meta(key, refresh=refresh)
    return {k: v for k, v in record.items() if not k.startswith("_")}


@app.get("/api/radar/{key}/image")
async def radar_image(key: str):
    record = await get_meta(key)
    if not record["image_available"]:
        raise HTTPException(503, "Source image is currently unavailable")
    now = time.monotonic()
    cached = _image_cache.get(key)
    if cached and now - cached[0] < IMAGE_TTL:
        return Response(cached[1], media_type=cached[2], headers={"Cache-Control": "public, max-age=60"})
    try:
        response = await fetch_external(record["_remote_url"], image=True)
        content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
        if content_type not in ("image/png", "image/jpeg", "image/gif", "image/webp"):
            raise ValueError("Remote response is not a supported image")
        if not (0 < len(response.content) <= 16 * 1024 * 1024):
            raise ValueError("Remote image size outside accepted limits")
        _image_cache[key] = (time.monotonic(), response.content, content_type)
        return Response(response.content, media_type=content_type, headers={"Cache-Control": "public, max-age=60"})
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(503, f"Cannot load remote radar image: {type(exc).__name__}") from exc
