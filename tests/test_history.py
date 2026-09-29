"""Offline tests for authentic radar history, without external weather requests."""
import hashlib
import io
from datetime import datetime, timedelta, timezone
from pathlib import Path
from PIL import Image
from scripts import build_history as h
from scripts.update_radar import validate_image

def png(color):
    stream=io.BytesIO()
    Image.new('RGB',(420,420),color).save(stream,format='PNG')
    return stream.getvalue()

class Resp:
    def __init__(self,url,data,mime):
        self.url=url;self.content=data;self.status_code=200;self.headers={'content-type':mime}
    def __enter__(self): return self
    def __exit__(self,*args): return False
    def iter_content(self,chunk_size=65536): yield self.content

class Session:
    def __init__(self,mapping):self.mapping=mapping;self.calls=[]
    def get(self,url,**kwargs):
        self.calls.append(url)
        assert kwargs['allow_redirects'] is False
        return self.mapping[url]

def make(tmp_path,now,image=None):
    output=tmp_path/'output';(output/'images').mkdir(parents=True)
    entries={key:{'available':False,'image':None,'history':[]} for key in h.KEYS}
    if image is not None:
        (output/'images'/'thailand.png').write_bytes(image)
        entries['thailand']={'available':True,'image':'./data/images/thailand.png','history':[]}
    return output,{'generated_at':now.isoformat(),'stations':entries}

def test_first_capture_has_timestamp_not_fake_scan_time(tmp_path):
    now=datetime(2026,9,29,8,tzinfo=timezone.utc)
    output,manifest=make(tmp_path,now,png('blue'))
    h.attach_history(output,manifest,previous={},now=now,validator=validate_image)
    frames=manifest['stations']['thailand']['history']
    assert len(frames)==1 and frames[0]['observed_at'] is None
    assert (output/frames[0]['path'][2:].replace('data/','')).is_file()

def test_previous_capture_retained_with_hash(tmp_path):
    now=datetime(2026,9,29,8,tzinfo=timezone.utc)
    old=png('red');latest=png('blue');digest=hashlib.sha256(old).hexdigest()
    path='./data/images/history/thailand/'+digest[:20]+'.png'
    previous={'generated_at':(now-timedelta(minutes=30)).isoformat(),'stations':{'thailand':{'available':False,'history':[{'path':path,'sha256':digest,'captured_at':(now-timedelta(minutes=30)).isoformat()}]}}}
    session=Session({h.SITE+path[2:]:Resp(h.SITE+path[2:],old,'image/png')})
    output,manifest=make(tmp_path,now,latest)
    h.attach_history(output,manifest,previous=previous,session=session,now=now,validator=validate_image)
    frames=manifest['stations']['thailand']['history']
    assert len(frames)==2 and frames[0]['sha256']==digest
    assert frames[1]['sha256']==hashlib.sha256(latest).hexdigest()

def test_wrong_hash_and_untrusted_path_rejected(tmp_path):
    now=datetime(2026,9,29,8,tzinfo=timezone.utc)
    old=png('red');digest=hashlib.sha256(old).hexdigest();path='./data/images/history/thailand/'+digest[:20]+'.png'
    previous={'generated_at':(now-timedelta(minutes=5)).isoformat(),'stations':{'thailand':{'available':False,'history':[{'path':path,'sha256':'0'*64,'captured_at':now.isoformat()},{'path':'./../../secret.png','captured_at':now.isoformat()}]}}}
    session=Session({h.SITE+path[2:]:Resp(h.SITE+path[2:],old,'image/png')})
    output,manifest=make(tmp_path,now)
    h.attach_history(output,manifest,previous=previous,session=session,now=now,validator=validate_image)
    assert not manifest['stations']['thailand']['history'] and len(session.calls)==1

def test_invalid_download_paths():
    for path in ('/data/radar.json','../secret','data/../../etc','data/images/x.png?secret=1'):
        try: h.download(path)
        except ValueError: pass
        else: raise AssertionError(path)
