"""Offline tests for fixed-location public weather snapshots."""
from datetime import datetime, timezone, timedelta
from pathlib import Path
import json
from scripts import build_public_overview as mod

NOW=datetime(2026,9,29,12,0,tzinfo=timezone.utc)
def item(now=NOW,temp=30,code=2,prob=45,unit='%'):
    beginning=int(now.timestamp()//3600)*3600
    return {'timezone':'Asia/Bangkok',
            'current':{'time':int(now.timestamp()),'temperature_2m':temp,'weather_code':code},
            'current_units':{'temperature_2m':'°C'},
            'hourly':{'time':[beginning+i*3600 for i in range(9)],
                      'precipitation_probability':[prob]*9},
            'hourly_units':{'precipitation_probability':unit}}

def test_fixed_non_private_locations_and_three_hour_sample():
    url=mod.forecast_url()
    assert 'api.open-meteo.com' in url and 'latitude=' in url
    assert len(mod.CITIES)==6 and len(set(x[0] for x in mod.CITIES))==6
    city=mod.parse_city(item(),mod.CITIES[0],NOW)
    assert city['temperature_c']==30 and city['rain_probability_3h_max']==45
    assert city['rain_hours_available']==3
    assert 'address' not in json.dumps(city).lower()

def test_missing_or_stale_data_never_looks_like_current():
    assert mod.parse_city(item(now=NOW-timedelta(hours=3)),mod.CITIES[0],NOW) is None
    wrong=item();wrong['current_units']['temperature_2m']='°F'
    assert mod.parse_city(wrong,mod.CITIES[0],NOW) is None
    wrong=item();wrong['hourly_units']['precipitation_probability']='mm'
    assert mod.parse_city(wrong,mod.CITIES[0],NOW) is None
    partial=item(temp=None,code=None,prob=None)
    assert mod.parse_city(partial,mod.CITIES[0],NOW) is None

def test_aggregate_requires_at_least_three_valid_city_samples():
    valid=[item() for _ in range(6)]
    assert len(mod.parse_batch(valid,NOW))==6
    broken=[None]*6
    for i in (0,2):broken[i]=item()
    try:mod.parse_batch(broken,NOW)
    except ValueError:pass
    else:raise AssertionError('incomplete batch accepted')

def test_bad_api_produces_unavailable_manifest_without_fake_weather(tmp_path):
    class FakeResponse:
        status_code=503;url=mod.forecast_url();headers={'content-type':'application/json'}
        def __enter__(self):return self
        def __exit__(self,*args):return False
    class FakeSession:
        def get(self,*args,**kwargs):
            assert kwargs['allow_redirects'] is False
            return FakeResponse()
    result=mod.build(tmp_path,session=FakeSession(),now=NOW)
    assert result['status']=='unavailable' and result['cities']==[]
    assert json.loads((tmp_path/'public-overview.json').read_text())['cities']==[]
