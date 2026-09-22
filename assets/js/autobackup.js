/* Auto backup harian ke folder pilihan + restore otomatis (File System Access API) */
const FS_SUPPORTED = ('showDirectoryPicker' in window);
const FS_DB = 'kasMasjidFS', FS_STORE = 'handles', FS_KEY = 'backupFolder';

function fsIdb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(FS_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(FS_STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function fsSaveHandle(h) {
  const db = await fsIdb();
  return new Promise((res, rej) => {
    const tx = db.transaction(FS_STORE, 'readwrite');
    tx.objectStore(FS_STORE).put(h, FS_KEY);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}
async function fsLoadHandle() {
  try {
    const db = await fsIdb();
    return new Promise((res, rej) => {
      const tx = db.transaction(FS_STORE, 'readonly');
      const q = tx.objectStore(FS_STORE).get(FS_KEY);
      q.onsuccess = () => res(q.result || null);
      q.onerror = () => rej(q.error);
    });
  } catch { return null; }
}
async function fsEnsureHandle(mode = 'readwrite') {
  const h = await fsLoadHandle();
  if (!h) return null;
  try {
    if ((await h.queryPermission({ mode })) === 'granted') return h;
    return (await h.requestPermission({ mode })) === 'granted' ? h : null;
  } catch { return null; }
}

function autoBackupSettings() {
  try { return getDB().settings.autoBackup || { on: false }; } catch { return { on: false }; }
}

function refreshAutoBackupUI() {
  const s = autoBackupSettings();
  const t = document.getElementById('setAutoBackup'); if (t) t.checked = !!s.on;
  const fn = document.getElementById('folderName');
  if (fn) fn.textContent = s.folderName ? ('Folder: ' + s.folderName) : 'Belum ada folder dipilih';
  const lb = document.getElementById('lastBackup');
  if (lb) lb.textContent = s.lastDate ? `${s.lastDate}${s.lastTime ? ' ' + s.lastTime : ''}` : '—';
  const note = document.getElementById('fsSupportNote');
  if (note) note.classList.toggle('hidden', FS_SUPPORTED);
  const pf = document.getElementById('btnPilihFolder'); if (pf) pf.disabled = !FS_SUPPORTED;
  const ro = document.getElementById('btnRestoreOtomatis'); if (ro) ro.disabled = !FS_SUPPORTED;
}

async function doAutoBackup() {
  const s = autoBackupSettings();
  if (!s.on || !FS_SUPPORTED) return false;
  const dir = await fsEnsureHandle('readwrite');
  if (!dir) { toast('Izin folder belum diberikan — klik Pilih Folder Backup'); return false; }
  const today = new Date().toISOString().slice(0, 10);
  try {
    const fh = await dir.getFileHandle(`kas-masjid-${today}.json`, { create: true });
    const w = await fh.createWritable();
    await w.write(JSON.stringify(getDB()));
    await w.close();
    const db = getDB();
    db.settings.autoBackup.lastDate = today;
    db.settings.autoBackup.lastTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    saveDB(db);
    refreshAutoBackupUI();
    return true;
  } catch (e) {
    console.warn('Auto backup gagal:', e);
    return false;
  }
}

// Dipanggil saat aplikasi dibuka & setiap ada perubahan data.
// Menulis file hanya 1x per hari (file per tanggal dioverwrite).
async function checkDailyBackup() {
  const s = autoBackupSettings();
  if (!s.on || !FS_SUPPORTED) return;
  const today = new Date().toISOString().slice(0, 10);
  if (s.lastDate === today) return;
  if (await doAutoBackup()) toast('Auto-backup hari ini tersimpan');
}
window.checkDailyBackup = checkDailyBackup;

async function autoRestore() {
  if (!FS_SUPPORTED) return toast('Browser tidak mendukung akses folder');
  const dir = await fsEnsureHandle('read');
  if (!dir) return toast('Pilih folder backup dulu');
  try {
    let latest = null;
    for await (const entry of dir.values()) {
      if (entry.kind === 'file' && /^kas-masjid-\d{4}-\d{2}-\d{2}\.json$/.test(entry.name)) {
        if (!latest || entry.name > latest.name) latest = entry;
      }
    }
    if (!latest) return toast('Tidak ada file backup di folder ini');
    const file = await latest.getFile();
    const data = JSON.parse(await file.text());
    if (!data.settings || !Array.isArray(data.transactions)) return toast('File backup tidak valid');
    if (!confirm(`Restore dari ${latest.name} (${data.transactions.length} transaksi)? Data saat ini diganti.`)) return;
    localStorage.setItem(DB_KEY, JSON.stringify(data));
    renderAll();
    toast('Restore otomatis berhasil');
  } catch (e) {
    console.warn(e);
    toast('Restore gagal: ' + e.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  refreshAutoBackupUI();

  document.getElementById('setAutoBackup').onchange = async (e) => {
    if (e.target.checked && !FS_SUPPORTED) {
      e.target.checked = false;
      return toast('Browser tidak mendukung akses folder — gunakan Chrome/Edge');
    }
    const db = getDB();
    db.settings.autoBackup.on = e.target.checked;
    try { saveDB(db); } catch { return; }
    refreshAutoBackupUI();
    toast(e.target.checked ? 'Auto-backup harian aktif' : 'Auto-backup dimatikan');
    if (e.target.checked) {
      const has = await fsLoadHandle();
      if (!has) toast('Klik "Pilih Folder Backup" untuk menentukan lokasi');
      else checkDailyBackup();
    }
  };

  document.getElementById('btnPilihFolder').onclick = async () => {
    if (!FS_SUPPORTED) return toast('Browser tidak mendukung akses folder');
    try {
      const dir = await window.showDirectoryPicker({ mode: 'readwrite' });
      await fsSaveHandle(dir);
      const db = getDB();
      db.settings.autoBackup.folderName = dir.name;
      saveDB(db);
      refreshAutoBackupUI();
      toast('Folder backup: ' + dir.name);
      checkDailyBackup();
    } catch (e) {
      if (e.name !== 'AbortError') toast('Gagal memilih folder');
    }
  };

  document.getElementById('btnRestoreOtomatis').onclick = autoRestore;

  // cek backup harian saat dibuka + tiap 1 jam selama aplikasi terbuka
  setTimeout(checkDailyBackup, 3000);
  setInterval(checkDailyBackup, 3600000);
});
