import asyncio
import pytest
from fastapi.testclient import TestClient
from app import app, STATIONS, allowed_url, extract_radar_url, get_meta, _cache, _image_cache

client = TestClient(app)

def test_home_and_station_catalog():
    assert client.get('/').status_code == 200
    r = client.get('/api/stations')
    assert r.status_code == 200 and len(r.json()) == 5
    assert client.get('/api/health').json()['status'] == 'ok'


def test_unknown_station():
    assert client.get('/api/radar/not-a-station').status_code == 404
    assert client.get('/api/radar/not-a-station/image').status_code == 404


def test_allowlist_prevents_ssrf():
    assert allowed_url('https://weather.tmd.go.th/img/a.png')
    assert not allowed_url('http://weather.tmd.go.th/img/a.png')
    assert not allowed_url('https://weather.tmd.go.th.evil.com/x.png')
    assert not allowed_url('https://127.0.0.1/x.png')
    assert not allowed_url('https://weather.tmd.go.th:2222/x.png')


def test_extract_best_radar_image_and_skips_logo():
    html = '''<img src="/assets/logo.png" alt="logo" width="500"><img src="/radar/radar_latest.png" alt="ภาพเรดาร์" width="800">'''
    assert extract_radar_url(html, STATIONS['thailand']['source']) == 'https://weather.tmd.go.th/radar/radar_latest.png'


def test_external_image_is_rejected():
    html = '<img src="https://private.example.org/fake_radar.png" alt="radar">'
    assert extract_radar_url(html, STATIONS['thailand']['source']) is None


def test_no_fake_data_when_tmd_page_unavailable(monkeypatch):
    import app as module
    import httpx
    async def fail(url, **kwargs):
        raise httpx.ConnectError('Offline')
    monkeypatch.setattr(module, 'fetch_external', fail)
    _cache.clear(); _image_cache.clear()
    r=client.get('/api/radar/sattahip?refresh=true')
    assert r.status_code==200
    data=r.json()
    assert data['image_available'] is False and data['status']=='unavailable'
    assert data['observed_at'] is None
    assert data['source']==STATIONS['sattahip']['source']
    assert client.get('/api/radar/sattahip/image').status_code == 503


def test_metadata_success_no_misleading_observation_time(monkeypatch):
    import app as module
    import httpx
    async def fake(url, **kwargs):
        return httpx.Response(200,headers={'content-type':'text/html'},text='<img alt="เรดาร์" src="/radar/latest.png">',request=httpx.Request('GET',url))
    monkeypatch.setattr(module,'fetch_external',fake)
    _cache.clear();_image_cache.clear()
    data=client.get('/api/radar/rayong?refresh=true').json()
    assert data['image_available'] is True
    assert data['observed_at'] is None
    assert data['image_url']=='/api/radar/rayong/image'
    assert '_remote_url' not in data
