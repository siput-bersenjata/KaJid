/* Jadwal Sholat GPS + Puasa — Aladhan API, metode Kemenag RI */
const KOTA_LIST = [
  { label: 'Jakarta', lat: -6.2088, lng: 106.8456 },
  { label: 'Bogor', lat: -6.595, lng: 106.8166 },
  { label: 'Bandung', lat: -6.9175, lng: 107.6191 },
  { label: 'Semarang', lat: -6.9667, lng: 110.4167 },
  { label: 'Yogyakarta', lat: -7.7956, lng: 110.3695 },
  { label: 'Surabaya', lat: -7.2575, lng: 112.7521 },
  { label: 'Medan', lat: 3.5952, lng: 98.6722 },
  { label: 'Palembang', lat: -2.9909, lng: 104.7565 },
  { label: 'Makassar', lat: -5.1477, lng: 119.4327 },
  { label: 'Balikpapan', lat: -1.2654, lng: 116.8312 },
  { label: 'Denpasar', lat: -8.65, lng: 115.2167 },
  { label: 'Pontianak', lat: -0.0263, lng: 109.3425 },
  { label: 'Banjarmasin', lat: -3.3194, lng: 114.5908 },
  { label: 'Manado', lat: 1.4748, lng: 124.8421 },
  { label: 'Jayapura', lat: -2.5337, lng: 140.7181 },
];

const PRAYER_ORDER = [
  { key: 'Imsak', label: 'Imsak' },
  { key: 'Fajr', label: 'Subuh' },
  { key: 'Sunrise', label: 'Terbit' },
  { key: 'Dhuhr', label: 'Dzuhur' },
  { key: 'Asr', label: 'Ashar' },
  { key: 'Maghrib', label: 'Maghrib' },
  { key: 'Isha', label: 'Isya' },
];

const jadwalCache = {}; // dd-mm-yyyy -> api response
let todayTimings = null, todayHijri = null;
let list30 = [];
let puasaWeek = [];
let jadwalPeriodeLabel = '30 hari ke depan';
let puasaPeriodeLabel = '7 hari ke depan';

function toISODate(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function parseISO(s) { const [y, m, dd] = (s || '').split('-').map(Number); if (!y || !m || !dd) return null; return new Date(y, m - 1, dd); }
function daysInMonthOf(ym) { const [y, m] = ym.split('-').map(Number); if (!y || !m) return []; const out = []; const n = new Date(y, m, 0).getDate(); for (let i = 1; i <= n; i++) out.push(new Date(y, m - 1, i)); return out; }

function getJadwalDates() {
  const mode = (document.getElementById('jadwalMode') || {}).value || '30hari';
  if (mode === 'bulan') {
    const v = document.getElementById('jadwalBulan').value;
    if (v) { jadwalPeriodeLabel = 'Bulan ' + v; return daysInMonthOf(v); }
  }
  if (mode === 'range') {
    const a = parseISO(document.getElementById('jadwalDari').value);
    const b = parseISO(document.getElementById('jadwalSampai').value);
    if (a && b) {
      let s = a < b ? a : b, e = a < b ? b : a;
      const out = []; const d = new Date(s);
      while (d <= e && out.length < 62) { out.push(new Date(d)); d.setDate(d.getDate() + 1); }
      jadwalPeriodeLabel = `Range ${toISODate(s)} s/d ${toISODate(e)}`;
      return out;
    }
  }
  jadwalPeriodeLabel = '30 hari ke depan';
  const out = []; for (let i = 0; i < 30; i++) { const d = new Date(); d.setDate(d.getDate() + i); out.push(d); }
  return out;
}

function getPuasaDates() {
  const mode = (document.getElementById('puasaMode') || {}).value || '7hari';
  if (mode === '30hari') { puasaPeriodeLabel = '30 hari ke depan'; const out = []; for (let i = 0; i < 30; i++) { const d = new Date(); d.setDate(d.getDate() + i); out.push(d); } return out; }
  if (mode === 'bulan') {
    const v = document.getElementById('puasaBulan').value;
    if (v) { puasaPeriodeLabel = 'Bulan ' + v; return daysInMonthOf(v); }
  }
  if (mode === 'range') {
    const a = parseISO(document.getElementById('puasaDari').value);
    const b = parseISO(document.getElementById('puasaSampai').value);
    if (a && b) {
      let s = a < b ? a : b, e = a < b ? b : a;
      const out = []; const d = new Date(s);
      while (d <= e && out.length < 62) { out.push(new Date(d)); d.setDate(d.getDate() + 1); }
      puasaPeriodeLabel = `Range ${toISODate(s)} s/d ${toISODate(e)}`;
      return out;
    }
  }
  puasaPeriodeLabel = '7 hari ke depan';
  const out = []; for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() + i); out.push(d); }
  return out;
}

async function fetchRange(dates) {
  const jobs = dates.map(d => (async () => {
    try { const j = await fetchTimings(d); return { d, t: j.data.timings }; }
    catch { const j = fallbackTimings(d); return { d, t: j.data.timings }; }
  })());
  const out = await Promise.all(jobs);
  out.sort((a, b) => a.d - b.d);
  return out;
}

async function loadJadwal() {
  const dates = getJadwalDates();
  const lbl = document.getElementById('jadwalCount');
  if (lbl) lbl.textContent = `Memuat ${dates.length} hari...`;
  list30 = await fetchRange(dates);
  render30Table();
  const t = document.getElementById('jadwalTableTitle');
  if (t) t.textContent = `Jadwal (${dates.length} hari — ${jadwalPeriodeLabel})`;
  if (lbl) lbl.textContent = `${dates.length} hari • ${jadwalPeriodeLabel}`;
}

async function loadPuasa() {
  const dates = getPuasaDates();
  const lbl = document.getElementById('puasaCount');
  if (lbl) lbl.textContent = `Memuat ${dates.length} hari...`;
  puasaWeek = await fetchRange(dates);
  renderPuasaWeek();
  const t = document.getElementById('puasaTableTitle');
  if (t) t.textContent = `Jadwal Puasa (${dates.length} hari — ${puasaPeriodeLabel})`;
  if (lbl) lbl.textContent = `${dates.length} hari • ${puasaPeriodeLabel}`;
}

async function load30Days() {
  await loadJadwal();
  await loadPuasa();
}

function fmtDateAPI(d) {
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}
function cleanTime(s) { return (s || '').split(' ')[0].slice(0, 5); }

async function fetchTimings(dateObj) {
  const db = getDB();
  const { lat, lng, method } = db.settings;
  const key = `${fmtDateAPI(dateObj)}_${Number(lat).toFixed(3)}_${Number(lng).toFixed(3)}_m${method}`;
  const cacheKey = 'jcache_' + key;
  try {
    const c = localStorage.getItem(cacheKey);
    if (c) return JSON.parse(c);
  } catch {}
  const url = `https://api.aladhan.com/v1/timings/${fmtDateAPI(dateObj)}?latitude=${lat}&longitude=${lng}&method=${method || 20}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('API ' + res.status);
  const json = await res.json();
  try { localStorage.setItem(cacheKey, JSON.stringify(json)); } catch {}
  return json;
}

function fallbackTimings(dateObj) {
  // Fallback statis WIB jika offline
  return { data: { timings: { Imsak: '04:25', Fajr: '04:35', Sunrise: '05:55', Dhuhr: '11:55', Asr: '15:15', Maghrib: '17:55', Isha: '19:05' }, date: { hijri: { day: '—', month: { en: '—' }, year: '—' }, readable: dateObj.toDateString() } } };
}

async function loadTodayPrayer() {
  const now = new Date();
  try { const j = await fetchTimings(now); todayTimings = j.data.timings; todayHijri = j.data.date.hijri; }
  catch (e) { const j = fallbackTimings(now); todayTimings = j.data.timings; todayHijri = j.data.date.hijri; }
  renderTodayPrayer();
  renderPuasaCards();
}

async function load30Days() {
  list30 = [];
  const jobs = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    jobs.push((async () => {
      try { const j = await fetchTimings(d); return { d, t: j.data.timings }; }
      catch { const j = fallbackTimings(d); return { d, t: j.data.timings }; }
    })());
  }
  const out = await Promise.all(jobs);
  out.sort((a, b) => a.d - b.d);
  list30 = out;
  render30Table();
  renderPuasaWeek();
}

function getNextPrayer() {
  if (!todayTimings) return null;
  const now = new Date();
  const seq = [
    { k: 'Fajr', n: 'Subuh' }, { k: 'Sunrise', n: 'Terbit' }, { k: 'Dhuhr', n: 'Dzuhur' },
    { k: 'Asr', n: 'Ashar' }, { k: 'Maghrib', n: 'Maghrib' }, { k: 'Isha', n: 'Isya' },
  ];
  for (const s of seq) {
    const [h, m] = cleanTime(todayTimings[s.k]).split(':').map(Number);
    const dt = new Date(); dt.setHours(h, m, 0, 0);
    if (dt > now) return { ...s, time: cleanTime(todayTimings[s.k]), date: dt };
  }
  return { k: 'Fajr', n: 'Subuh (besok)', time: cleanTime(todayTimings['Fajr']), date: null };
}

function renderTodayPrayer() {
  const grid = document.getElementById('gridSholat');
  const next = getNextPrayer();
  grid.innerHTML = PRAYER_ORDER.map(p => {
    const isNext = next && ((p.key === next.k) || (next.k === 'Fajr' && p.key === 'Fajr' && next.n.includes('besok') && false));
    const highlight = next && p.label === next.n.replace(' (besok)', '');
    return `<div class="sholat-card ${highlight ? 'next' : ''}">
      <p class="text-xs font-semibold ${highlight ? '' : 'text-slate-500'}">${p.label}</p>
      <p class="t">${cleanTime(todayTimings[p.key])}</p>
    </div>`;
  }).join('');

  // info bar
  const db = getDB();
  document.getElementById('lokasiInfo').textContent = `Lokasi: ${db.settings.kotaLabel} (${Number(db.settings.lat).toFixed(3)}, ${Number(db.settings.lng).toFixed(3)})`;
  const h = todayHijri;
  const hijriStr = h ? `${h.day} ${h.month.en} ${h.year} H` : '—';
  document.getElementById('hijriInfo').textContent = 'Hijriah: ' + hijriStr;
  const sideH = document.getElementById('sideHijri'); if (sideH) sideH.textContent = hijriStr;
  if (next) document.getElementById('nextInfo').textContent = `Berikutnya: ${next.n} ${next.time}`;

  // mini dashboard
  if (next) {
    document.getElementById('miniNextName').textContent = next.n;
    document.getElementById('miniNextTime').textContent = next.time;
    document.getElementById('miniLokasi').textContent = db.settings.kotaLabel;
    document.getElementById('miniList').innerHTML = PRAYER_ORDER.map(p =>
      `<div class="flex justify-between border-b border-slate-100 pb-1"><span>${p.label}</span><b>${cleanTime(todayTimings[p.key])}</b></div>`).join('');
  }
}

function render30Table() {
  const tb = document.getElementById('tbJadwal30');
  tb.innerHTML = list30.map(({ d, t }) => {
    const tgl = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    return `<tr><td class="whitespace-nowrap">${tgl}</td><td>${cleanTime(t.Imsak)}</td><td>${cleanTime(t.Fajr)}</td><td>${cleanTime(t.Sunrise)}</td><td>${cleanTime(t.Dhuhr)}</td><td>${cleanTime(t.Asr)}</td><td class="font-bold">${cleanTime(t.Maghrib)}</td><td>${cleanTime(t.Isha)}</td></tr>`;
  }).join('');
}

// ---- Puasa ----
function sunnahOf(dateObj, hijriDay) {
  const dow = dateObj.getDay(); // 1 senin, 4 kamis
  if (dow === 1) return 'Senin';
  if (dow === 4) return 'Kamis';
  if ([13, 14, 15].includes(Number(hijriDay))) return 'Ayyamul Bidh';
  return '—';
}
function durasiStr(imsak, maghrib) {
  const [h1, m1] = imsak.split(':').map(Number);
  const [h2, m2] = maghrib.split(':').map(Number);
  let dif = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (dif < 0) dif += 1440;
  return `${Math.floor(dif / 60)}j ${dif % 60}m`;
}

function renderPuasaCards() {
  if (!todayTimings) return;
  const imsak = cleanTime(todayTimings.Imsak), buka = cleanTime(todayTimings.Maghrib);
  document.getElementById('puImsak').textContent = imsak;
  document.getElementById('puBuka').textContent = buka;
  document.getElementById('puDurasi').textContent = 'Durasi ' + durasiStr(imsak, buka);
}

async function renderPuasaWeek() {
  const tb = document.getElementById('tbPuasa');
  if (!puasaWeek.length) { tb.innerHTML = '<tr><td colspan="6" class="text-center text-slate-400">Belum ada data</td></tr>'; return; }
  // ambil hijri day per tanggal untuk ayyamul bidh (fetch ulang ringan: pakai gToH API? sederhanakan: tandai Senin/Kamis saja + info hijri hari ini)
  tb.innerHTML = puasaWeek.map(({ d, t }) => {
    const imsak = cleanTime(t.Imsak), buka = cleanTime(t.Maghrib);
    const hari = d.toLocaleDateString('id-ID', { weekday: 'long' });
    const tgl = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    let sun = '—';
    if (d.getDay() === 1) sun = 'Senin';
    if (d.getDay() === 4) sun = 'Kamis';
    return `<tr><td class="whitespace-nowrap">${tgl}</td><td>${hari}</td><td>${imsak}</td><td class="font-bold">${buka}</td><td>${durasiStr(imsak, buka)}</td><td>${sun}</td></tr>`;
  }).join('');

  // puasa sunnah terdekat
  const today = new Date().getDay();
  const nextS = puasaWeek.find(({ d }) => d.getDay() === 1 || d.getDay() === 4);
  if (nextS) {
    document.getElementById('puNext').textContent = nextS.d.getDay() === 1 ? 'Senin' : 'Kamis';
    document.getElementById('puNextDate').textContent = nextS.d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' });
  }
}

// ---- GPS + alamat akurat (reverse geocode, gratis tanpa API key) ----
async function reverseGeocode(lat, lng) {
  const key = `geo_${Number(lat).toFixed(3)}_${Number(lng).toFixed(3)}`;
  try {
    const cached = localStorage.getItem(key);
    if (cached) return cached;
  } catch {}
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=id`;
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    const loc = (j.locality || '').trim(), city = (j.city || '').trim(), prov = (j.principalSubdivision || '').trim();
    let label = '';
    if (loc && city && loc.toLowerCase() !== city.toLowerCase()) label = `${loc}, ${city}`;
    else if (city && prov && prov.toLowerCase() !== city.toLowerCase()) label = `${city}, ${prov}`;
    else label = city || loc || prov;
    if (label) { try { localStorage.setItem(key, label); } catch {} return label; }
    return null;
  } catch (e) {
    console.warn('Reverse geocode gagal:', e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function refreshLokasiUI() {
  const db = getDB();
  const badge = document.getElementById('gpsBadge');
  const isGps = !KOTA_LIST.some(k => k.label === db.settings.kotaLabel) && !String(db.settings.kotaLabel || '').includes('(default)');
  if (badge) {
    badge.textContent = isGps ? 'GPS aktif' : 'GPS nonaktif';
  }
  const top = document.getElementById('topLokasi');
  if (top) top.textContent = isGps ? `${db.settings.kotaLabel} • GPS` : db.settings.kotaLabel;
}

function activateGPS() {
  const badge = document.getElementById('gpsBadge');
  if (!navigator.geolocation) { toast('Browser tidak mendukung GPS'); return; }
  badge.textContent = 'Mencari lokasi...';
  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude, lng = pos.coords.longitude;
    let db = getDB();
    db.settings.lat = lat;
    db.settings.lng = lng;
    db.settings.kotaLabel = 'Mencari alamat...';
    saveDB(db);
    refreshLokasiUI();
    badge.textContent = 'Mencari alamat...';
    // ambil alamat akurat sesuai koordinat
    const alamat = await reverseGeocode(lat, lng);
    db = getDB();
    db.settings.kotaLabel = alamat || `GPS ${lat.toFixed(3)}, ${lng.toFixed(3)}`;
    saveDB(db);
    refreshLokasiUI();
    renderAll();
    toast(alamat ? ('Lokasi: ' + alamat) : 'Lokasi GPS tersimpan (alamat tak ditemukan)');
    await loadTodayPrayer(); await loadJadwal(); await loadPuasa();
  }, err => {
    badge.textContent = 'GPS gagal';
    toast('GPS gagal: ' + err.message + ' — pakai pilihan kota');
  }, { enableHighAccuracy: true, timeout: 15000 });
}

// Tingkatkan label GPS lama ("GPS Anda") menjadi alamat asli di background
async function upgradeGpsLabel() {
  try {
    const db = getDB();
    if (db.settings.kotaLabel !== 'GPS Anda') return;
    const alamat = await reverseGeocode(db.settings.lat, db.settings.lng);
    if (!alamat) return;
    const d = getDB();
    if (d.settings.kotaLabel !== 'GPS Anda') return;
    d.settings.kotaLabel = alamat;
    saveDB(d);
    refreshLokasiUI();
    renderTodayPrayer();
  } catch {}
}

function initKotaSelect() {
  const sel = document.getElementById('selKota');
  const db = getDB();
  sel.innerHTML = KOTA_LIST.map(k => `<option value="${k.label}">${k.label}</option>`).join('') + `<option value="__gps">GPS Saya</option>`;
  sel.value = KOTA_LIST.some(k => k.label === db.settings.kotaLabel) ? db.settings.kotaLabel : '__gps';
  sel.onchange = async () => {
    if (sel.value === '__gps') { activateGPS(); return; }
    const k = KOTA_LIST.find(x => x.label === sel.value);
    if (!k) return;
    const d = getDB();
    d.settings.lat = k.lat; d.settings.lng = k.lng; d.settings.kotaLabel = k.label;
    saveDB(d);
    toast('Lokasi: ' + k.label);
    await loadTodayPrayer(); await load30Days();
  };
}

// countdown tiap detik
setInterval(() => {
  const next = getNextPrayer();
  if (!next || !next.date) {
    const el = document.getElementById('miniCountdown');
    if (el) el.textContent = next ? 'Besok ' + next.time : '—';
    return;
  }
  const dif = next.date - new Date();
  if (dif < 0) { renderTodayPrayer(); return; }
  const h = Math.floor(dif / 3600000), m = Math.floor(dif % 3600000 / 60000), s = Math.floor(dif % 60000 / 1000);
  const el = document.getElementById('miniCountdown');
  if (el) el.textContent = `-${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}, 1000);
