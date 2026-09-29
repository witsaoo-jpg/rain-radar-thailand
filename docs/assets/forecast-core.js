/* Open-Meteo forecast parsing. Forecast != TMD radar measurement.
 * Valid times are Unix seconds UTC; no local-time string parsing.
 * Hourly precipitation_probability and precipitation refer to preceding hour.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RainForecastCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
  function validLocation(lat, lon) {
    return typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
      typeof lon === 'number' && Number.isFinite(lon) && lon >= -180 && lon <= 180;
  }
  function roundedLocation(lat, lon) {
    if (!validLocation(lat, lon)) throw new Error('Invalid location');
    return { latitude: Number(lat.toFixed(2)), longitude: Number(lon.toFixed(2)) };
  }
  function buildUrl(lat, lon) {
    const p = roundedLocation(lat, lon);
    const u = new URL(ENDPOINT);
    u.searchParams.set('latitude', String(p.latitude));
    u.searchParams.set('longitude', String(p.longitude));
    u.searchParams.set('hourly', 'precipitation_probability,precipitation');
    u.searchParams.set('current', 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m');
    u.searchParams.set('timeformat', 'unixtime');
    u.searchParams.set('timezone', 'Asia/Bangkok');
    u.searchParams.set('forecast_days', '2');
    return u.toString();
  }
  function optionalNumber(value, lower, upper) {
    return typeof value === 'number' && Number.isFinite(value) && value >= lower && value <= upper ? value : null;
  }
  function parseForecast(data, nowMs) {
    if (!data || data.error || data.timezone !== 'Asia/Bangkok' || !data.hourly || !data.hourly_units ||
      data.hourly_units.precipitation_probability !== '%' || data.hourly_units.precipitation !== 'mm') {
      throw new Error('ข้อมูลพยากรณ์หรือหน่วยไม่ตรงตามรูปแบบที่รองรับ');
    }
    const h = data.hourly;
    if (!Array.isArray(h.time) || !Array.isArray(h.precipitation_probability) || !Array.isArray(h.precipitation) ||
      h.time.length !== h.precipitation_probability.length || h.time.length !== h.precipitation.length) {
      throw new Error('ชุดข้อมูลรายชั่วโมงไม่ครบ');
    }
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const earliest = Math.ceil(now / 3600000) * 3600; // next full hour: preceding-hour forecast interval
    const rows = [];
    let previous = -Infinity;
    for (let i = 0; i < h.time.length; i++) {
      const t = h.time[i];
      if (!Number.isSafeInteger(t) || t <= previous) throw new Error('ช่วงเวลาข้อมูลไม่ถูกต้อง');
      previous = t;
      if (t < earliest || rows.length >= 6) continue;
      const probability = optionalNumber(h.precipitation_probability[i], 0, 100);
      const precipitation = optionalNumber(h.precipitation[i], 0, 1000);
      rows.push({ timestamp: t * 1000, probability, precipitation });
    }
    if (!rows.length || rows.every(r => r.probability === null && r.precipitation === null)) {
      throw new Error('ไม่มีข้อมูลรายชั่วโมงที่ใช้แสดงผลได้');
    }
    const first3 = rows.slice(0, 3);
    const known = first3.map(x => x.probability).filter(x => x !== null);
    const maxProbability = known.length ? Math.max(...known) : null;
    const sumPrecipitation = first3.length === 3 && first3.every(x => x.precipitation !== null)
      ? first3.reduce((sum, x) => sum + x.precipitation, 0) : null;
    const grid = validLocation(data.latitude, data.longitude) ?
      { latitude: data.latitude, longitude: data.longitude } : null;
    return { rows, maxProbability, sumPrecipitation, grid };
  }
  function advisory(max) {
    // Editorial UI reading of model percentages, NOT a meteorological warning.
    if (max === null) return 'ยังไม่มีข้อมูลโอกาสเกิดฝนเพียงพอ โปรดดูประกาศทางการและเรดาร์';
    if (max >= 70) return 'แบบจำลองให้ค่าโอกาสเกิดฝนค่อนข้างสูงในบางชั่วโมง ควรเตรียมอุปกรณ์กันฝนและตรวจประกาศเตือนภัย';
    if (max >= 40) return 'บางชั่วโมงมีโอกาสเกิดฝน ควรตรวจสภาพอากาศอีกครั้งก่อนออกเดินทาง';
    return 'แบบจำลองให้ค่าโอกาสเกิดฝนไม่สูงในช่วงนี้ แต่ยังมีฝนเฉพาะจุดได้ โปรดตรวจเรดาร์และประกาศทางการ';
  }

  // Current values are model/grid estimates, not on-site observations.
  function weatherDescription(code) {
    if (!Number.isInteger(code)) return 'ไม่มีข้อมูลสภาพท้องฟ้า';
    if (code === 0) return 'ท้องฟ้าแจ่มใส';
    if (code === 1) return 'ท้องฟ้าโปร่งเป็นส่วนใหญ่';
    if (code === 2) return 'มีเมฆบางส่วน';
    if (code === 3) return 'เมฆมาก';
    if (code === 45 || code === 48) return 'มีหมอก';
    if ([51,53,55,56,57].includes(code)) return 'ฝนละออง';
    if ([61,63,65,66,67].includes(code)) return 'มีฝน';
    if ([71,73,75,77].includes(code)) return 'มีหิมะ';
    if ([80,81,82].includes(code)) return 'มีฝนเป็นแห่ง ๆ';
    if ([85,86].includes(code)) return 'หิมะตกเป็นแห่ง ๆ';
    if ([95,96,99].includes(code)) return 'มีพายุฝนฟ้าคะนองตามแบบจำลอง';
    return 'ไม่มีข้อมูลสภาพท้องฟ้าที่จำแนกได้';
  }
  function parseCurrent(data, nowMs) {
    if (!data || !data.current || !data.current_units) return null;
    const units = data.current_units, c = data.current;
    if (units.temperature_2m !== '°C' || units.apparent_temperature !== '°C' ||
        units.relative_humidity_2m !== '%' || units.wind_speed_10m !== 'km/h') return null;
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const timestamp = Number.isSafeInteger(c.time) ? c.time * 1000 : NaN;
    // Older than 2h or unexpectedly future means there is no defensible current label.
    if (!Number.isFinite(timestamp) || now - timestamp > 7200000 || timestamp - now > 900000) return null;
    const temperature = optionalNumber(c.temperature_2m, -100, 70);
    const feelsLike = optionalNumber(c.apparent_temperature, -100, 90);
    const humidity = optionalNumber(c.relative_humidity_2m, 0, 100);
    const wind = optionalNumber(c.wind_speed_10m, 0, 400);
    const code = Number.isInteger(c.weather_code) && c.weather_code >= 0 && c.weather_code <= 99 ? c.weather_code : null;
    if ([temperature, feelsLike, humidity, wind, code].every(v => v === null)) return null;
    return { timestamp, temperature, feelsLike, humidity, wind, code, description: weatherDescription(code) };
  }
  return { buildUrl, roundedLocation, parseForecast, parseCurrent, weatherDescription, advisory };
});
