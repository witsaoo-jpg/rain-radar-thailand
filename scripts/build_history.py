"""Retain authentic previously published radar snapshots for a 120-minute replay.

Only fetch from this project's public GitHub Pages URL. Capture time != radar scan time.
"""
from __future__ import annotations
import hashlib
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urljoin
import requests

SITE = 'https://witsaoo-jpg.github.io/rain-radar-thailand/'
MAX_FRAME_BYTES = 12 * 1024 * 1024
MAX_MANIFEST_BYTES = 100_000
MAX_FRAMES = 6
WINDOW = timedelta(minutes=120)
KEYS = {'thailand', 'sattahip', 'rayong', 'suvarnabhumi'}
HIST_RE = re.compile(r'^\./data/images/history/(thailand|sattahip|rayong|suvarnabhumi)/([a-f0-9]{20})\.(png|jpg|gif|webp)$')
MAIN_RE = re.compile(r'^\./data/images/(thailand|sattahip|rayong|suvarnabhumi)\.(png|jpg|gif|webp)$')

def parse_time(value):
    try:
        dt = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        return dt.astimezone(timezone.utc) if dt.tzinfo else None
    except (TypeError, ValueError, OverflowError):
        return None

def download(path: str, *, session=None, max_bytes=MAX_FRAME_BYTES, mime='image/'):
    if path.startswith('/') or '..' in path or '?' in path or '#' in path or not (path == 'data/radar.json' or path.startswith('data/images/')):
        raise ValueError('Untrusted previous-site path')
    url = urljoin(SITE, path)
    requester = session or requests
    with requester.get(url, timeout=(5, 14), stream=True, allow_redirects=False, headers={'User-Agent': 'RainRadarThailand-history/1.3'}) as response:
        if response.status_code != 200 or response.url != url:
            raise ValueError('Previous site unavailable or redirected')
        if not response.headers.get('content-type', '').split(';')[0].lower().startswith(mime):
            raise ValueError('Unexpected previous-site content-type')
        data = bytearray()
        for chunk in response.iter_content(chunk_size=65536):
            data.extend(chunk)
            if len(data) > max_bytes:
                raise ValueError('Previous-site object too large')
        if not data:
            raise ValueError('Empty previous-site object')
        return bytes(data)

def previous_manifest(*, session=None):
    try:
        obj = json.loads(download('data/radar.json', session=session, max_bytes=MAX_MANIFEST_BYTES, mime='application/json'))
        return obj if isinstance(obj, dict) and isinstance(obj.get('stations'), dict) else None
    except (requests.RequestException, ValueError, OSError, UnicodeError):
        return None

def attach_history(output: Path, manifest: dict, *, session=None, validator=None, previous=None, now=None):
    if validator is None:
        raise ValueError('Validated-image callback required')
    now = now or datetime.now(timezone.utc)
    previous = previous if previous is not None else previous_manifest(session=session)
    older_at = parse_time(previous.get('generated_at')) if previous else None
    if older_at is None or older_at > now + timedelta(minutes=3) or now - older_at > timedelta(hours=3):
        previous = None
    for key, current in manifest['stations'].items():
        if key not in KEYS:
            current['history'] = []
            continue
        candidates = []
        old = previous.get('stations', {}).get(key, {}) if previous else {}
        if isinstance(old, dict):
            for row in (old.get('history') or []):
                if not isinstance(row, dict):
                    continue
                stamp = parse_time(row.get('captured_at'))
                match = HIST_RE.fullmatch(str(row.get('path', '')))
                if match and match.group(1) == key and stamp and timedelta(0) <= now - stamp <= WINDOW:
                    candidates.append((stamp, row['path'], row.get('sha256')))
            if old.get('available'):
                stamp = older_at
                match = MAIN_RE.fullmatch(str(old.get('image', '')))
                if match and match.group(1) == key and timedelta(0) <= now - stamp <= WINDOW:
                    candidates.append((stamp, old['image'], None))
        frames = {}
        for stamp, path, expected in candidates[-MAX_FRAMES * 2:]:
            try:
                data = download(path[2:], session=session)
                digest = hashlib.sha256(data).hexdigest()
                if expected and digest != expected:
                    continue
                ext = validator(data)
                if not path.endswith('.' + ext):
                    continue
                frames[digest] = (stamp, data, ext)
            except (requests.RequestException, ValueError, OSError):
                continue
        if current.get('available') and current.get('image'):
            try:
                path = output / 'images' / Path(current['image']).name
                data = path.read_bytes()
                ext = validator(data)
                digest = hashlib.sha256(data).hexdigest()
                if digest not in frames:
                    frames[digest] = (now, data, ext)
            except (ValueError, OSError):
                pass
        ordered = sorted(frames.items(), key=lambda item: item[1][0])[-MAX_FRAMES:]
        entries = []
        for digest, (stamp, data, ext) in ordered:
            rel = f'./data/images/history/{key}/{digest[:20]}.{ext}'
            target = output / 'images' / 'history' / key / (digest[:20] + '.' + ext)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            entries.append({'path': rel, 'captured_at': stamp.isoformat(), 'sha256': digest,
                            'label': stamp.strftime('%H:%M UTC'), 'observed_at': None})
        current['history'] = entries
    return manifest
