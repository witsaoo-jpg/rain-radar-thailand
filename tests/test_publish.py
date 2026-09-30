"""Offline tests for public/static publishing. No TMD traffic in test suite."""
import io
import json
from pathlib import Path
from PIL import Image
import pytest
from scripts import update_radar as mod


def image_bytes(fmt='PNG', count=1):
    buffer=io.BytesIO()
    frames=[Image.new('RGB',(420,420),(i*20,45,75)) for i in range(count)]
    frames[0].save(buffer,format=fmt,save_all=(count>1),append_images=frames[1:],duration=300,loop=0)
    return buffer.getvalue()


class FakeResponse:
    def __init__(self, url, content, mime='text/html', status=200):
        self.url=url;self.content=content;self.status_code=status;self.headers={'content-type':mime}
    def __enter__(self):return self
    def __exit__(self,*args):return False
    def iter_content(self,chunk_size=65536):yield self.content


class FakeSession:
    def __init__(self, mapping):self.mapping=mapping;self.calls=[]
    def get(self,url,**kwargs):
        self.calls.append(url)
        assert kwargs['allow_redirects'] is False
        return self.mapping[url]


def test_allowlist_and_bad_targets():
    assert mod.trusted('https://weather.tmd.go.th/img/latest.png')
    for x in ['http://weather.tmd.go.th/x','https://weather.tmd.go.th.evil.test/x','https://127.0.0.1/x','https://weather.tmd.go.th:8000/x','https://user:pw@weather.tmd.go.th/x']:
        assert not mod.trusted(x)


def test_candidate_extracts_main_and_skips_logo_and_third_party():
    html='<img src="/assets/logo.png" alt="logo"><img id="radar-image" src="/radar/latest.png" alt="ภาพเรดาร์ฝน"><img src="https://evil.test/radar.png">'
    got=mod.extract_candidates(html,mod.STATIONS['rayong']['source'],'rayong')
    assert got==['https://weather.tmd.go.th/radar/latest.png']


def test_rejects_non_radar_satda_products():
    html='<img src="/data/cloud.png" alt="cloud"><img src="/data/composite_th.png" alt="Radar Composite">'
    got=mod.extract_candidates(html,mod.STATIONS['thailand']['fallback'],'thailand')
    assert got==['https://satda.tmd.go.th/data/composite_th.png']


def test_image_validates_real_pixels_and_loop_must_animate():
    assert mod.validate_image(image_bytes())=='png'
    assert mod.validate_image(image_bytes('GIF',3),animated_only=True)=='gif'
    with pytest.raises(ValueError):mod.validate_image(b'<html>fake</html>')
    with pytest.raises(ValueError):mod.validate_image(image_bytes(),animated_only=True)


def test_success_and_no_invented_observation_time(tmp_path):
    page=mod.STATIONS['rayong']['source']; img='https://weather.tmd.go.th/radar/radar_latest.png'
    s=FakeSession({page:FakeResponse(page,b'<img alt="Radar" src="/radar/radar_latest.png">'),img:FakeResponse(img,image_bytes(),'image/png')})
    r=mod.fetch_one('rayong',tmp_path,session=s)
    assert r['available'] and r['observed_at'] is None
    assert (tmp_path/'rayong.png').exists()
    assert r['image']=='./data/images/rayong.png'


def test_failed_source_not_published_as_fake_or_stale(tmp_path):
    # All upstream pages return 503; stale imagery must be removed from static data.
    imgdir=tmp_path/'images';imgdir.mkdir()
    (imgdir/'rayong.png').write_bytes(image_bytes())
    pages={v['source']:FakeResponse(v['source'],b'',status=503) for v in mod.STATIONS.values()}
    pages[mod.STATIONS['thailand']['fallback']]=FakeResponse(mod.STATIONS['thailand']['fallback'],b'',status=503)
    s=FakeSession(pages)
    result=mod.build(tmp_path,session=s)
    assert all(not v['available'] and v['observed_at'] is None for v in result['stations'].values())
    assert not (imgdir/'rayong.png').exists()
    assert json.loads((tmp_path/'radar.json').read_text())['stations']['rayong']['image'] is None


def test_static_site_relative_assets_and_no_backend_dependency():
    text=Path('docs/index.html').read_text()
    js=Path('docs/assets/app.js').read_text()
    assert './assets/styles.css' in text and './assets/app.js' in text
    assert "fetch('./data/radar.json'" in js
    assert '/api/radar/' not in js
    assert 'navigator.geolocation.getCurrentPosition' in Path('docs/assets/near-me.js').read_text()
    assert './assets/near-me.js' in text and './assets/near-me.css' in text
    assert 'gps-map-wrap' in text and 'gps-clear-button' in text
    assert 'Credit: <strong>witsaoya</strong>' in text
    assert 'https://www.freecounterstat.com' in text
    assert 'counter6.optistats.ovh/private/freecounterstat.php?c=qyc8yzea1rsx5tfnpsymctx2sh78mtlg' in text
    assert 'referrerpolicy="no-referrer"' in text
    assert './assets/animation.js' in text and 'history-play' in text and 'history-slider' in text
    assert 'https://www.tmd.go.th/warning-and-events/warning-storm' in text
    assert './manifest.webmanifest' in text and './assets/pwa.js' in text
    assert 'Credit: <strong>witsaoya</strong>' in text
    assert Path('docs/sw.js').is_file() and Path('scripts/build_history.py').is_file()
    assert './assets/forecast-core.js' in text and './assets/forecast.js' in text
    assert 'forecast-consent' in text and 'forecast-request' in text
    assert 'ระยะห่างจากกลุ่มฝน' in text and 'ยังไม่เปิดการคำนวณ' in text
    assert 'Credit: <strong>witsaoya</strong>' in text
    assert 'rain-radar-shell-v115' in Path('docs/sw.js').read_text()
    assert 'forecast-core.js' in Path('docs/sw.js').read_text()
    assert 'id="weather-banner"' in text
    assert 'id="weather-headline"' in text
    assert 'id="weather-banner-action"' in text
    assert "rain-radar-shell-v115" in Path('docs/sw.js').read_text()
    assert './assets/radar-utils.js' in text and './assets/places-core.js' in text and './assets/places.js' in text
    assert 'places-form' in text and 'places-list' in text
    assert 'RainPlacesCore' in Path('docs/assets/places.js').read_text()
    assert 'id="advisory-heading"' in text and 'id="notify-enable"' in text
    assert 'id="selected-map-open"' in text
    assert './assets/advisory.js' in text and './assets/selected-map.js' in text
    assert 'id="weather-intel"' in text and 'id="intel-radar"' in text
    assert './assets/weather-intel-core.js' in text and './assets/weather-intel.js' in text
    assert 'id="weather-hourly-link"' in text and 'id="intel-grid" hidden' in text
    assert 'ขอรายงานอากาศ (ส่งพิกัดโดยประมาณ)' in Path('docs/assets/forecast.js').read_text()
    assert 'id="easy-refresh-button"' in text and 'id="easy-refresh-status"' in text
    assert './assets/easy-refresh.js' in text
    assert 'easy-refresh.js' in Path('docs/sw.js').read_text()
    assert 'id="public-weather-headline"' in text
    assert 'id="public-weather-cities"' in text
    assert './assets/public-overview.js' in text
    assert 'id="public-weather-refresh"' in text
    assert '<details class="weather-more">' in text
    assert 'public-overview.js' in Path('docs/sw.js').read_text()
    assert 'id="places-manage-open"' in text and 'id="places-manage-list"' in text
    assert 'id="places-list"' in text and 'id="places-count"' in text
    assert 'rainradar:favorite-forecast' in Path('docs/assets/forecast.js').read_text()
    assert 'id="home-view"' in text and 'id="tools-view"' in text
    assert 'id="home-location"' in text and 'id="home-auto-toggle"' in text
    assert 'id="tab-home"' in text and 'id="tab-radar"' in text and 'id="tab-more"' in text
    assert './assets/home.js' in text and "'./assets/home.js'" in Path('docs/sw.js').read_text()
    assert 'rainradar:auto-location:v1' in Path('docs/assets/home.js').read_text()
    assert 'id="rain-outlook"' in text and 'id="outlook-request"' in text
    assert 'id="outlook-ensemble"' in text
    assert './assets/rain-outlook-core.js' in text and './assets/rain-outlook.js' in text
    assert 'rain-outlook.js' in Path('docs/sw.js').read_text()
    assert 'Credit: <strong>witsaoya</strong>' in text
    assert 'qyc8yzea1rsx5tfnpsymctx2sh78mtlg' in text
    assert 'id="home-place-lookup"' in text and 'id="home-place-revoke"' in text
    assert 'id="home-place-detail"' in text and 'id="home-place-status"' in text
    assert './assets/place-name-core.js' in text and './assets/place-name.js' in text
    assert 'place-name.js' in Path('docs/sw.js').read_text()
    assert 'id="outlook-public"' in text and 'id="outlook-public-lead"' in text
    assert 'id="outlook-public-periods"' in text
    assert '<details class="outlook-technical">' in text
    assert 'publicSummary' in Path('docs/assets/rain-outlook-core.js').read_text()
    assert 'id="radar-station-search"' in text and 'id="station-nav"' in text
    assert './assets/radar-directory.js' in text and "'./assets/radar-directory.js'" in Path('docs/sw.js').read_text()
    assert 'data-radar-kind' in Path('docs/assets/radar-directory.js').read_text() or "dataset.radarKind" in Path('docs/assets/radar-directory.js').read_text()
    assert 'data-region-station="cri"' in text and 'data-region-station="kkn"' in text and 'data-region-station="pkt"' in text
    assert 'id="outlook-rain-pattern"' in text and 'id="outlook-rain-chance"' in text
    assert 'region-radar-picker' in text
    assert 'rainPattern' in Path('docs/assets/rain-outlook-core.js').read_text()
    assert 'id="install-app"' in text and 'id="install-guide"' in text
    assert 'id="install-guide-body"' in text and 'id="install-hint"' in text
    assert 'apple-mobile-web-app-capable' in text and 'apple-touch-icon' in text
    assert 'beforeinstallprompt' in Path('docs/assets/pwa.js').read_text()
    assert 'navigator.standalone' in Path('docs/assets/pwa.js').read_text()
    assert '© original data providers' not in text
