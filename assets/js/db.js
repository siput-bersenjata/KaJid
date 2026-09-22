/* Database lokal Kas Masjid — localStorage */
const DB_KEY = 'kasMasjidDB_v1';

const KAT_MASUK_DEFAULT = ['Infaq Jumat', 'Kotak Amal', 'Donatur', 'Zakat', 'Wakaf', 'Parkir', 'Lainnya'];
const KAT_KELUAR_DEFAULT = ['Listrik & Air', 'Gaji Marbot', 'Perbaikan', 'Kegiatan', 'Sembako Dhuafa', 'Kebersihan', 'Lainnya'];

const THEME_DEFAULT = { preset: 'navy-gold', primary: '#0F172A', secondary: '#1E3A8A', accent: '#A16207' };
const THEME_PRESETS = [
  { id: 'navy-gold', nama: 'Navy + Emas', primary: '#0F172A', secondary: '#1E3A8A', accent: '#A16207' },
  { id: 'hijau-masjid', nama: 'Hijau Masjid', primary: '#064E3B', secondary: '#047857', accent: '#B45309' },
  { id: 'zamrud-krem', nama: 'Zamrud Krem', primary: '#065F46', secondary: '#0D9488', accent: '#92400E' },
  { id: 'maroon-emas', nama: 'Maroon + Emas', primary: '#4C0519', secondary: '#9F1239', accent: '#B45309' },
  { id: 'teal-amber', nama: 'Teal Amber', primary: '#134E4A', secondary: '#0F766E', accent: '#D97706' },
  { id: 'coklat-kayu', nama: 'Coklat Kayu', primary: '#3B2F2F', secondary: '#795548', accent: '#A16207' },
];

function defaultDB() {
  return {
    settings: {
      nama: 'Masjid Al-Barokah',
      alamat: 'Jl. Kedamaian No. 12, Jakarta Selatan',
      saldoAwal: 5000000,
      method: 20,
      lat: -6.2297, lng: 106.8294, kotaLabel: 'Jakarta (default)',
      theme: { ...THEME_DEFAULT },
      shadow: { on: true, intensity: 'sedang' },
      dark: false,
      autoBackup: { on: false, folderName: '', lastDate: '', lastTime: '' }
    },
    transactions: [],
    seededAt: null
  };
}

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) { const d = defaultDB(); localStorage.setItem(DB_KEY, JSON.stringify(d)); return d; }
    const d = JSON.parse(raw);
    if (!d.settings) Object.assign(d, defaultDB());
    // migrasi: pastikan theme & field baru ada
    if (!d.settings.theme) d.settings.theme = { ...THEME_DEFAULT };
    ['primary', 'secondary', 'accent', 'preset'].forEach(k => { if (!d.settings.theme[k]) d.settings.theme[k] = THEME_DEFAULT[k]; });
    if (!d.settings.shadow) d.settings.shadow = { on: true, intensity: 'sedang' };
    if (typeof d.settings.dark !== 'boolean') d.settings.dark = false;
    if (!d.settings.autoBackup) d.settings.autoBackup = { on: false, folderName: '', lastDate: '', lastTime: '' };
    if (!Array.isArray(d.transactions)) d.transactions = [];
    return d;
  } catch (e) {
    const d = defaultDB();
    try { localStorage.setItem(DB_KEY, JSON.stringify(d)); } catch {}
    return d;
  }
}

function saveDB(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (e) {
    if (typeof toast === 'function') toast('Penyimpanan penuh! Hapus bukti lama atau backup lalu hapus data.');
    throw e;
  }
  updateDbInfo();
}
function getDB() { return loadDB(); }

function uid() { return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function addTransaction(tr) {
  const db = getDB();
  tr.id = tr.id || uid();
  db.transactions.push(tr);
  db.transactions.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  saveDB(db);
  return tr;
}
function updateTransaction(id, patch) {
  const db = getDB();
  const i = db.transactions.findIndex(t => t.id === id);
  if (i >= 0) { db.transactions[i] = { ...db.transactions[i], ...patch }; saveDB(db); return true; }
  return false;
}
function deleteTransaction(id) {
  const db = getDB();
  db.transactions = db.transactions.filter(t => t.id !== id);
  saveDB(db);
}

function calcSummary(transactions, saldoAwal) {
  let masuk = 0, keluar = 0;
  transactions.forEach(t => { const n = Number(t.nominal) || 0; if (t.jenis === 'masuk') masuk += n; else keluar += n; });
  return { masuk, keluar, saldo: saldoAwal + masuk - keluar, count: transactions.length };
}

function rupiah(n) {
  return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
}

function updateDbInfo() {
  const el = document.getElementById('dbInfo');
  if (!el) return;
  try {
    const raw = localStorage.getItem(DB_KEY) || '';
    el.textContent = (raw.length / 1024).toFixed(1) + ' KB • ' + getDB().transactions.length + ' transaksi';
  } catch {}
}
