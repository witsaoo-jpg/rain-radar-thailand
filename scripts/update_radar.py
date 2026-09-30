"""Build a bounded, best-effort TMD snapshot for the static GitHub Pages site.

Not an official TMD API. It never invents a radar frame or observation time.
Requests only predefined TMD hosts and refuses redirects/untrusted image files.
"""
from __future__ import annotations

import argparse
import io
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlsplit

import requests
from bs4 import BeautifulSoup
from PIL import Image, UnidentifiedImageError
if __package__:
    from .build_history import attach_history
else:
    from build_history import attach_history

STATIONS = {
    'thailand': {'source': 'https://weather.tmd.go.th/THA_Z.php', 'fallback': 'https://satda.tmd.go.th/wp-content/uploads/data/radar_composite/radar_composite.php'},
    'sattahip': {'source': 'https://weather.tmd.go.th/sattahip.php'},
    'rayong': {'source': 'https://weather.tmd.go.th/ryg.php'},
    'suvarnabhumi': {'source': 'https://weather.tmd.go.th/svp120.php'},
    'cri': {'source': 'https://weather.tmd.go.th/cri.php'},
    'kkn': {'source': 'https://weather.tmd.go.th/kkn.php'},
    'pkt': {'source': 'https://weather.tmd.go.th/pkt.php'},
    'thailand-loop': {'source': 'https://weather.tmd.go.th/THA_loop.php', 'animated_only': True},
}
HOSTS = frozenset({'weather.tmd.go.th', 'satda.tmd.go.th'})
TYPES = {'PNG': 'png', 'JPEG': 'jpg', 'GIF': 'gif', 'WEBP': 'webp'}
BAD_WORDS = ('logo', 'favicon', 'banner', 'icon', 'flag', 'facebook', 'twitter', 'loading', 'spinner', 'advert', 'legend', 'donate')
MAX_BYTES = 12 * 1024 * 1024
HEADERS = {'User-Agent': 'RainRadarThailand-v1.1 (GitHub Pages unofficial public radar viewer)', 'Accept': 'text/html,image/*;q=0.8,*/*;q=0.6'}


def trusted(url: str) -> bool:
    try:
        x = urlsplit(url)
        return x.scheme == 'https' and x.hostname in HOSTS and not x.username and not x.password and x.port in (None, 443)
    except ValueError:
        return False


def read_remote(url: str, *, session=None) -> tuple[bytes, str]:
    if not trusted(url):
        raise ValueError('Untrusted URL')
    requester = session or requests
    with requester.get(url, headers=HEADERS, timeout=(8, 20), allow_redirects=False, stream=True) as r:
        if r.status_code != 200 or not trusted(r.url):
            raise ValueError(f'Invalid upstream response: HTTP {r.status_code}')
        content_type = r.headers.get('content-type', '').split(';')[0].strip().lower()
        chunks = []
        total = 0
        for chunk in r.iter_content(chunk_size=65536):
            total += len(chunk)
            if total > MAX_BYTES:
                raise ValueError('Remote response too large')
            chunks.append(chunk)
        if not total:
            raise ValueError('Empty remote response')
        return b''.join(chunks), content_type


def extract_candidates(html: str, base: str, station: str) -> list[str]:
    soup = BeautifulSoup(html, 'html.parser')
    candidates: list[tuple[int, int, str]] = []
    seen: set[str] = set()

    def add(src, text='', tag=''):
        if not src or src.startswith(('data:', 'blob:', '#')):
            return
        url = urljoin(base, src.strip())
        if not trusted(url) or url in seen:
            return
        pathname = urlsplit(url).path.lower()
        if not re.search(r'\.(png|jpe?g|gif|webp)$', pathname):
            return
        combined = f'{text} {tag} {pathname}'.lower()
        if any(w in combined for w in BAD_WORDS):
            return
        # A SATDA page contains many different products. Filter to radar composite.
        if 'satda.tmd.go.th' in base and station == 'thailand' and not any(w in combined for w in ('composite', 'radar')):
            return
        score = 10
        if any(w in combined for w in ('radar', 'เรดาร์', 'ppi', 'composite', 'sattahip', 'rayong', 'tha_', 'satda')):
            score += 25
        if any(w in combined for w in ('latest', 'image', 'radar-img', 'radar_image', 'main', 'radar_image')):
            score += 8
        if station == 'thailand' and 'composite' in combined:
            score += 15
        if station == 'thailand-loop' and '.gif' in pathname:
            score += 18
        # TMD station pages often label their single important radar image in alt.
        if 'ภาพเรดาร์' in text or 'radar' in text.lower():
            score += 10
        seen.add(url)
        candidates.append((-score, len(candidates), url))

    for el in soup.select('img, source'):
        text = ' '.join(str(el.get(x) or '') for x in ('alt', 'title', 'id', 'class'))
        for key in ('src', 'data-src', 'data-original', 'data-image', 'data-lazy-src'):
            add(el.get(key), text, el.name)
        if el.get('srcset'):
            add(el['srcset'].split(',')[0].strip().split(' ')[0], text, el.name)
    # Literal urls/paths sometimes appear in JS rather than img tags. Reject dynamic code.
    for match in re.finditer(r'[\'\"]([^\'\"\s<>]+\.(?:png|jpe?g|gif|webp)(?:\?[^\'\"\s<>]*)?)[\'\"]', html, re.I):
        add(match.group(1))
    candidates.sort()
    return [url for _, _, url in candidates][:12]


def validate_image(data: bytes, *, animated_only=False) -> str:
    try:
        im = Image.open(io.BytesIO(data))
        fmt = im.format
        width, height = im.size
        frames = getattr(im, 'n_frames', 1)
        im.verify()
    except (UnidentifiedImageError, OSError, ValueError) as e:
        raise ValueError('Not a valid image') from e
    if fmt not in TYPES or width < 280 or height < 280:
        raise ValueError('Unexpected format or dimensions')
    if animated_only and frames < 2:
        raise ValueError('Image is not animated')
    return TYPES[fmt]


def fetch_one(key: str, output: Path, *, session=None) -> dict:
    station = STATIONS[key]
    entry = {'available': False, 'image': None, 'observed_at': None, 'source': station['source'],
             'history': [], 'notice': 'ต้นทางไม่ส่งภาพที่นำมาแสดงได้ กรุณาเปิดหน้า TMD โดยตรง'}
    pages = [station['source']]
    if station.get('fallback'):
        pages.append(station['fallback'])
    error_names = []
    for page in pages:
        try:
            html_bytes, content_type = read_remote(page, session=session)
            if 'html' not in content_type:
                raise ValueError('Upstream page was not HTML')
            for url in extract_candidates(html_bytes.decode('utf-8', errors='replace'), page, key):
                try:
                    image_bytes, image_type = read_remote(url, session=session)
                    if not image_type.startswith('image/'):
                        raise ValueError('Not served as image')
                    ext = validate_image(image_bytes, animated_only=station.get('animated_only', False))
                    output.mkdir(parents=True, exist_ok=True)
                    filename = f'{key}.{ext}'
                    (output / filename).write_bytes(image_bytes)
                    entry.update(available=True, image='./data/images/' + filename, source_image_url=url,
                                 source_page=page, notice='ภาพจริงจาก TMD; เวลาสร้าง Snapshot ไม่ใช่เวลาตรวจวัด')
                    # No invented timestamps. Source pages do not expose a guaranteed
                    # machine-readable observation timestamp in our integration.
                    return entry
                except (requests.RequestException, ValueError, OSError) as e:
                    error_names.append(type(e).__name__)
        except (requests.RequestException, ValueError, OSError) as e:
            error_names.append(type(e).__name__)
    entry['diagnostic'] = ', '.join(error_names[:3]) or 'no-image-urls'
    return entry


def build(output: Path, *, session=None, previous_site=False, previous=None, now=None) -> dict:
    (output / 'images').mkdir(parents=True, exist_ok=True)
    # Delete stale images: a failed fetch must never look like current weather.
    for old in (output / 'images').iterdir():
        if old.is_file() and old.name.split('.')[0] in STATIONS:
            old.unlink()
    now = now or datetime.now(timezone.utc)
    manifest = {'schema_version': 2, 'generated_at': now.isoformat(), 'stations': {}}
    for key in STATIONS:
        manifest['stations'][key] = fetch_one(key, output / 'images', session=session)
        print(key, 'available' if manifest['stations'][key]['available'] else 'unavailable', flush=True)
    if previous_site or previous is not None:
        attach_history(output, manifest, validator=validate_image, session=session,
                       previous=previous, now=now)
    (output / 'radar.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=Path('docs/data'))
    parser.add_argument("--previous-site", action="store_true", help="Validate snapshots from prior public Pages deployment")
    args = parser.parse_args()
    build(args.output, previous_site=args.previous_site)


if __name__ == '__main__':
    main()
