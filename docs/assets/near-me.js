/* Rain Near Me v1.2 — explicit, session-only geolocation; no rainfall inference. */
(() => {
  'use strict';
  const get = id => document.getElementById(id);
  const locate = get('gps-button');
  if (!locate) return;
  const clear = get('gps-clear-button');
  const mapButton = get('gps-map-button');
  const status = get('gps-status');
  const details = get('gps-details');
  const coordinates = get('gps-coordinates');
  const accuracy = get('gps-accuracy');
  const measured = get('gps-measured');
  const mapFrame = get('gps-map-frame');
  const mapWrap = get('gps-map-wrap');
  const external = get('gps-map-link');
  let position = null;
  let requestId = 0;

  function setMessage(message) { status.textContent = message; }
  function setBusy(busy) {
    locate.disabled = busy;
    locate.textContent = busy ? 'กำลังหาตำแหน่ง…' : (position ? 'อัปเดตพิกัด' : 'อนุญาตใช้ตำแหน่ง');
  }
  function hideMap() {
    mapWrap.hidden = true;
    mapFrame.removeAttribute('src');
    mapButton.textContent = 'แสดงบนแผนที่';
    mapButton.setAttribute('aria-expanded', 'false');
  }
  function reset() {
    requestId += 1; // invalidates pending geolocation callbacks
    position = null;
    setBusy(false);
    details.hidden = true;
    clear.hidden = true;
    mapButton.hidden = true;
    external.hidden = true;
    external.removeAttribute('href');
    hideMap();
    setMessage('กดอนุญาตเพื่อแสดงตำแหน่งของคุณ โดยไม่บันทึกพิกัดไว้ในระบบ');
    if (typeof CustomEvent === 'function' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new CustomEvent('rainradar:location', { detail: { coords: null } }));
  }
  function mapUrl(p) {
    const lat = p.latitude;
    const lon = p.longitude;
    // A small display window, not a transformation into TMD radar-image pixels.
    const west = Math.max(-180, lon - 0.04);
    const east = Math.min(180, lon + 0.04);
    const south = Math.max(-85, lat - 0.03);
    const north = Math.min(85, lat + 0.03);
    const url = new URL('https://www.openstreetmap.org/export/embed.html');
    url.searchParams.set('bbox', [west, south, east, north].join(','));
    url.searchParams.set('layer', 'mapnik');
    url.searchParams.set('marker', `${lat},${lon}`);
    return url.toString();
  }
  function showPosition(result) {
    const { latitude, longitude, accuracy: meters } = result.coords || {};
    if (![latitude, longitude].every(Number.isFinite) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setMessage('ตำแหน่งที่ได้รับไม่ถูกต้อง กรุณาลองใหม่');
      window.dispatchEvent?.(new CustomEvent('rainradar:gps-error', {detail:{message:status.textContent}}));
      return;
    }
    position = { latitude, longitude };
    coordinates.textContent = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    accuracy.textContent = Number.isFinite(meters) && meters >= 0 ? `ประมาณ ±${Math.round(meters).toLocaleString('th-TH')} เมตร` : 'ไม่ทราบความแม่นยำ';
    const timestamp = Number.isFinite(result.timestamp) ? result.timestamp : Date.now();
    measured.textContent = new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(timestamp)) + ' น.';
    details.hidden = false;
    clear.hidden = false;
    mapButton.hidden = false;
    const url = new URL('https://www.openstreetmap.org/');
    url.searchParams.set('mlat', String(latitude));
    url.searchParams.set('mlon', String(longitude));
    url.hash = `map=13/${latitude}/${longitude}`;
    external.href = url.toString();
    external.hidden = false;
    hideMap();
    setMessage('ได้รับพิกัดแล้ว • จุดบนแผนที่เป็นตำแหน่งอุปกรณ์ ไม่ใช่จุดที่ยืนยันว่าฝนตก');
    if (typeof CustomEvent === 'function' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new CustomEvent('rainradar:location', { detail: { coords: { latitude, longitude } } }));
  }
  locate.addEventListener('click', () => {
    if (!window.isSecureContext || !navigator.geolocation) {
      setMessage('GPS ต้องใช้ HTTPS หรือ localhost และเบราว์เซอร์ที่รองรับ');
      window.dispatchEvent?.(new CustomEvent('rainradar:gps-error', {detail:{message:'อุปกรณ์หรือเบราว์เซอร์ไม่รองรับ GPS'}}));
      return;
    }
    const current = ++requestId;
    setBusy(true);
    setMessage('กำลังขออนุญาตจากเบราว์เซอร์…');
    navigator.geolocation.getCurrentPosition(result => {
      if (current !== requestId) return;
      setBusy(false);
      showPosition(result);
    }, error => {
      if (current !== requestId) return;
      setBusy(false);
      const messages = {
        1: 'ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง ตรวจสอบสิทธิ์ Location ของเว็บไซต์ในเบราว์เซอร์',
        2: 'ไม่สามารถระบุตำแหน่งอุปกรณ์ได้ กรุณาตรวจสอบบริการ Location',
        3: 'ค้นหาตำแหน่งไม่ทันเวลาที่กำหนด กรุณาลองอีกครั้ง'
      };
      setMessage(messages[error?.code] || 'เกิดข้อผิดพลาดขณะค้นหาพิกัด กรุณาลองใหม่');
      window.dispatchEvent?.(new CustomEvent('rainradar:gps-error', {detail:{message:status.textContent}}));
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  });
  clear.addEventListener('click', reset);
  mapButton.addEventListener('click', () => {
    if (!position) return;
    if (!mapWrap.hidden) { hideMap(); return; }
    // Only an explicit click sends the coordinates to OpenStreetMap.
    mapFrame.src = mapUrl(position);
    mapWrap.hidden = false;
    mapButton.textContent = 'ซ่อนแผนที่';
    mapButton.setAttribute('aria-expanded', 'true');
  });
  reset();
})();
