"""Publish a six-city public weather overview without using any visitor location.

These are independent representative city grid forecasts, NOT a nationwide aggregate.
Fail closed on API errors; never publish fabricated or stale values.
"""
from __future__ import annotations
import argparse
import json
import math
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlencode
import requests

API = 'https://api.open-meteo.com/v1/forecast'
CITIES = (
    ('north', 'ภาคเหนือ', 'เชียงใหม่', 18.79, 98.99),
    ('northeast', 'ภาคตะวันออกเฉียงเหนือ', 'ขอนแก่น', 16.43, 102.83),
    ('central', 'ภาคกลาง', 'กรุงเทพมหานคร', 13.75, 100.50),
    ('east', 'ภาคตะวันออก', 'ชลบุรี', 13.36, 100.98),
    ('west', 'ภาคตะวันตก', 'กาญจนบุรี', 14.02, 99.53),
    ('south', 'ภาคใต้', 'หาดใหญ่', 7.01, 100.47),
)
MAX_BYTES = 180_000

def forecast_url():
    return API + '?' + urlencode({
        'latitude': ','.join(str(x[3]) for x in CITIES),
        'longitude': ','.join(str(x[4]) for x in CITIES),
        'current': 'temperature_2m,weather_code',
        'hourly': 'precipitation_probability',
        'timezone': 'Asia/Bangkok',
        'timeformat': 'unixtime',
        'forecast_days': '2',
    })

def number(value, lo, hi):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        return None
    return value if lo <= value <= hi else None

def parse_city(item, city, now):
    if not isinstance(item, dict) or item.get('timezone') != 'Asia/Bangkok':
        return None
    cur, units, hourly, hourly_units = (item.get(k) for k in ('current','current_units','hourly','hourly_units'))
    if not all(isinstance(x, dict) for x in (cur, units, hourly, hourly_units)):
        return None
    if units.get('temperature_2m') != '°C' or hourly_units.get('precipitation_probability') != '%':
        return None
    timestamp = cur.get('time')
    if isinstance(timestamp, bool) or not isinstance(timestamp, int):
        return None
    ts = datetime.fromtimestamp(timestamp, timezone.utc)
    if ts > now + timedelta(minutes=15) or now - ts > timedelta(hours=2):
        return None
    temperature = number(cur.get('temperature_2m'), -70, 65)
    code = cur.get('weather_code')
    code = code if isinstance(code, int) and not isinstance(code, bool) and 0 <= code <= 99 else None
    times, probabilities = hourly.get('time'), hourly.get('precipitation_probability')
    if not isinstance(times, list) or not isinstance(probabilities, list) or len(times) != len(probabilities):
        return None
    next_end = math.ceil(now.timestamp() / 3600) * 3600
    next_three = []
    for end, p in zip(times, probabilities):
        if type(end) is not int or end < next_end or end >= next_end + 3 * 3600:
            continue
        valid = number(p, 0, 100)
        if valid is not None:
            next_three.append(valid)
    if temperature is None and code is None and not next_three:
        return None
    key, region, label, _lat, _lon = city
    return {'id': key, 'region': region, 'city': label, 'temperature_c': temperature,
            'weather_code': code, 'rain_probability_3h_max': max(next_three) if next_three else None,
            'model_time': ts.isoformat(), 'rain_hours_available': len(next_three)}

def parse_batch(raw, now):
    if not isinstance(raw, list) or len(raw) != len(CITIES):
        raise ValueError('Expected one model forecast per public sample city')
    cities = [parse_city(item, city, now) for item, city in zip(raw, CITIES)]
    found = [city for city in cities if city is not None]
    if len(found) < 3:
        raise ValueError('Not enough valid representative cities')
    return found

def single_url(city):
    return API + '?' + urlencode({
        'latitude': str(city[3]), 'longitude': str(city[4]),
        'current': 'temperature_2m,weather_code',
        'hourly': 'precipitation_probability', 'timezone': 'Asia/Bangkok',
        'timeformat': 'unixtime', 'forecast_days': '2'
    })

def fetch_payload(url, *, session=None, timeout=(5, 22)):
    requester = session or requests
    with requester.get(url, timeout=timeout, allow_redirects=False,
                       headers={'User-Agent': 'RainRadarThailand-public-overview/1.10', 'Accept':'application/json'},
                       stream=True) as response:
        if response.status_code != 200 or response.url != url:
            raise ValueError('Public forecast unavailable or redirected')
        if response.headers.get('content-type','').split(';')[0].lower().strip() != 'application/json':
            raise ValueError('Expected JSON data')
        buf = bytearray()
        for chunk in response.iter_content(chunk_size=32_768):
            buf.extend(chunk)
            if len(buf) > MAX_BYTES:
                raise ValueError('Unexpectedly large response')
        return json.loads(buf)

def fetch_batch(*, session=None, now=None):
    now = now or datetime.now(timezone.utc)
    # Single round trip is cheapest, but batch endpoints can be slower than small city queries.
    try:
        return parse_batch(fetch_payload(forecast_url(), session=session), now)
    except (requests.RequestException, ValueError, TypeError, OverflowError, OSError) as exc:
        print('Batch overview unavailable: '+type(exc).__name__+'; trying fixed cities', flush=True)
    found = []
    for city in CITIES:
        try:
            data = fetch_payload(single_url(city), session=session, timeout=(5, 12))
            if isinstance(data, list):
                raise ValueError('Expected a single city forecast')
            parsed = parse_city(data, city, now)
            if parsed:
                found.append(parsed)
        except (requests.RequestException, ValueError, TypeError, OverflowError, OSError):
            continue
    if len(found) < 3:
        raise ValueError('Not enough available city forecasts')
    return found

def build(output: Path, *, session=None, now=None):
    now = now or datetime.now(timezone.utc)
    payload = {'schema_version': 1, 'generated_at': now.isoformat(), 'source': 'Open-Meteo forecast model',
               'scope': 'six fixed representative Thai cities, not a Thailand-wide forecast',
               'status': 'unavailable', 'cities': []}
    try:
        payload['cities'] = fetch_batch(session=session, now=now)
        payload['status'] = 'available'
    except (requests.RequestException, ValueError, TypeError, OverflowError, OSError) as exc:
        print('Public overview unavailable: ' + type(exc).__name__, flush=True)
    output.mkdir(parents=True, exist_ok=True)
    (output / 'public-overview.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n',
                                                  encoding='utf-8')
    return payload

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=Path('docs/data'))
    args = parser.parse_args()
    print('Overview status: ' + build(args.output)['status'], flush=True)
