/* App utama */
let chArus = null, chDonat = null;
let tempBukti = null; // dataURL gambar bukti yg sedang diinput (null = tidak ada / tidak berubah)

/* ---------- Bukti transaksi (gambar opsional, simpan lokal) ---------- */
function compressImage(file, maxDim = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width: w, height: h } = img;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        w = Math.round(w * scale); h = Math.round(h * scale);
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(cv.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showBuktiPreview(dataURL, infoText) {
  const wrap = document.getElementById('buktiPreviewWrap');
  if (!dataURL) { wrap.classList.add('hidden'); wrap.classList.remove('flex'); return; }
  wrap.classList.remove('hidden'); wrap.classList.add('flex');
  document.getElementById('buktiPreview').src = dataURL;
  document.getElementById('buktiInfo').textContent = infoText || `${Math.round(dataURL.length / 1024)} KB tersimpan lokal`;
}

function openBuktiLightbox(dataURL, caption) {
  if (!dataURL) return;
  document.getElementById('buktiBesar').src = dataURL;
  document.getElementById('buktiCaption').textContent = caption || '';
  document.getElementById('buktiModal').classList.remove('hidden');
}

window.lihatBukti = (id) => {
  const t = getDB().transactions.find(x => x.id === id);
  if (!t || !t.bukti) return toast('Tidak ada bukti');
  openBuktiLightbox(t.bukti, `${t.tanggal} • ${t.keterangan} • ${rupiah(t.nominal)}`);
};

/* ---------- Shadow 3D kartu ---------- */
function applyShadow() {
  let sh = { on: true, intensity: 'sedang' };
  try { sh = getDB().settings.shadow || sh; } catch {}
  document.body.classList.toggle('shadow-3d', !!sh.on);
  document.body.dataset.shIntensity = sh.intensity || 'sedang';
  const t = document.getElementById('setShadow'); if (t) t.checked = !!sh.on;
  const s = document.getElementById('setShadowInt'); if (s) s.value = sh.intensity || 'sedang';
}

/* ---------- Mode gelap AMOLED ---------- */
function applyDark() {
  let on = false;
  try { on = !!getDB().settings.dark; } catch {}
  document.body.classList.toggle('dark', on);
  const t = document.getElementById('setDark'); if (t) t.checked = on;
}

/* Warna grid/tick/legenda grafik mengikuti mode */
function chartSkin() {
  return document.body.classList.contains('dark')
    ? { tick: '#A1A1AA', grid: 'rgba(255,255,255,0.08)', legend: '#E4E4E7' }
    : { tick: '#64748B', grid: 'rgba(15,23,42,0.06)', legend: '#334155' };
}

/* ---------- Tema website ---------- */
function themeColors() {
  try { return getDB().settings.theme || { ...THEME_DEFAULT }; } catch { return { ...THEME_DEFAULT }; }
}

function applyTheme() {
  const th = themeColors();
  let st = document.getElementById('themeOverride');
  if (!st) { st = document.createElement('style'); st.id = 'themeOverride'; document.head.appendChild(st); }
  st.textContent = `
    aside{ background:${th.primary} !important; }
    .btn-primary{ background:${th.primary} !important; }
    .btn-primary:hover{ background:${th.secondary} !important; }
    .btn-accent{ background:${th.accent} !important; }
    .navbtn.active{ color:${th.primary} !important; }
    .mnavbtn.active{ background:${th.primary} !important; }
    .sholat-card.next{ background:${th.primary} !important; border-color:${th.primary} !important; }
    .linkbtn{ color:${th.secondary} !important; }
    footer a, .text-secondary{ color:${th.secondary} !important; }
    .text-accent{ color:${th.accent} !important; }
    .inp:focus{ border-color:${th.primary} !important; box-shadow:0 0 0 3px ${th.primary}22 !important; }
    :focus-visible{ outline-color:${th.secondary} !important; }
    #fabDev{ background:${th.primary} !important; }
    #fabDev:hover{ background:${th.secondary} !important; }
    .theme-swatch.active{ border-color:${th.primary} !important; box-shadow:0 0 0 3px ${th.primary}33 !important; }
  `;
  // sinkronkan color picker jika ada
  const p = document.getElementById('thPrimary'); if (p) p.value = th.primary;
  const s = document.getElementById('thSecondary'); if (s) s.value = th.secondary;
  const a = document.getElementById('thAccent'); if (a) a.value = th.accent;
}

function renderTema() {
  const th = themeColors();
  const grid = document.getElementById('themeGrid');
  if (!grid) return;
  grid.innerHTML = THEME_PRESETS.map(t => `
    <button class="theme-swatch ${th.preset === t.id ? 'active' : ''}" data-theme="${t.id}">
      <span class="theme-dots"><span style="background:${t.primary}"></span><span style="background:${t.secondary}"></span><span style="background:${t.accent}"></span></span>
      <span class="text-xs font-semibold">${t.nama}</span>
    </button>`).join('');
  grid.querySelectorAll('[data-theme]').forEach(b => b.onclick = () => {
    const t = THEME_PRESETS.find(x => x.id === b.dataset.theme);
    if (!t) return;
    const db = getDB();
    db.settings.theme = { preset: t.id, primary: t.primary, secondary: t.secondary, accent: t.accent };
    try { saveDB(db); } catch { return; }
    applyTheme(); renderTema(); renderCharts();
    toast('Tema: ' + t.nama);
  });
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.add('hidden'), 2200);
}

function switchPage(name) {
  document.querySelectorAll('.page').forEach(s => {
    const show = s.dataset.section === name;
    s.classList.toggle('hidden', !show);
    s.classList.remove('page-enter');
  });
  document.querySelectorAll('.navbtn').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  document.querySelectorAll('.mnavbtn').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  const titles = { dashboard: 'Dashboard Keuangan', transaksi: 'Data Transaksi', laporan: 'Laporan Keuangan', jadwal: 'Jadwal Sholat', puasa: 'Puasa & Imsak', pengaturan: 'Pengaturan' };
  document.getElementById('topTitle').textContent = titles[name] || name;
  if (name === 'laporan') renderLaporan();
  // putar ulang animasi halaman setiap dibuka (compositor-only, hormati reduced-motion)
  const target = document.querySelector(`.page[data-section="${name}"]`);
  if (target && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    void target.offsetWidth; // paksa reflow agar animasi restart
    target.classList.add('page-enter');
    // animasi grafik ikut diputar ulang saat dashboard dibuka
    if (name === 'dashboard') renderCharts();
    setTimeout(() => target.classList.remove('page-enter'), 900);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function monthKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }

function renderAll() {
  const db = getDB();
  document.getElementById('brandName').textContent = db.settings.nama;
  document.title = `${db.settings.nama} — Dashboard Keuangan`;
  const fm = document.getElementById('footMasjid'); if (fm) fm.textContent = db.settings.nama;
  document.getElementById('topDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  if (typeof refreshLokasiUI === 'function') refreshLokasiUI();
  else document.getElementById('topLokasi').textContent = db.settings.kotaLabel;
  applyTheme();
  applyDark();
  applyShadow();
  renderDashboard(); renderTransaksi(); renderPengaturan(); renderTema(); updateDbInfo();
}

function transPeriodeLabel() {
  const mode = document.getElementById('fPeriode').value;
  if (mode === '30hari') return '30 hari terakhir';
  if (mode === 'bulan') return 'Bulan ' + (document.getElementById('fBulan').value || monthKey());
  if (mode === 'range') return `Range ${document.getElementById('fDari').value || '?'} s/d ${document.getElementById('fSampai').value || '?'}`;
  return 'Semua waktu';
}

function renderDashboard() {
  const db = getDB();
  const mk = monthKey();
  const bulanIni = db.transactions.filter(t => (t.tanggal || '').slice(0, 7) === mk);
  const all = calcSummary(db.transactions, db.settings.saldoAwal);
  const bln = calcSummary(bulanIni, 0);

  document.getElementById('stSaldo').textContent = rupiah(all.saldo);
  document.getElementById('stSaldoSub').textContent = `${db.transactions.length} transaksi tercatat`;
  document.getElementById('sideSaldo').textContent = rupiah(all.saldo);
  document.getElementById('stMasuk').textContent = rupiah(bln.masuk);
  document.getElementById('stMasukSub').textContent = bulanIni.filter(t => t.jenis === 'masuk').length + ' pemasukan';
  document.getElementById('stKeluar').textContent = rupiah(bln.keluar);
  document.getElementById('stKeluarSub').textContent = bulanIni.filter(t => t.jenis === 'keluar').length + ' pengeluaran';
  document.getElementById('stCount').textContent = bln.count;

  // recent
  const recent = [...db.transactions].sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 5);
  document.getElementById('tbRecent').innerHTML = recent.map(t => `<tr><td class="whitespace-nowrap">${t.tanggal}</td><td>${t.keterangan}<br><span class="text-xs text-slate-400">${t.pihak || ''}</span></td><td>${t.kategori}</td><td class="text-right font-semibold ${t.jenis === 'masuk' ? 'text-emerald-600' : 'text-rose-600'}">${t.jenis === 'masuk' ? '+' : '-'}${rupiah(t.nominal)}</td></tr>`).join('') || '<tr><td colspan="4" class="text-center text-slate-400">Belum ada data</td></tr>';

  renderCharts();
}

function renderCharts() {
  const db = getDB();
  const th = themeColors();
  const labels = [], masuk = [], keluar = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const k = monthKey(d);
    labels.push(d.toLocaleDateString('id-ID', { month: 'short' }));
    const rows = db.transactions.filter(t => (t.tanggal || '').slice(0, 7) === k);
    masuk.push(rows.filter(t => t.jenis === 'masuk').reduce((s, t) => s + Number(t.nominal), 0));
    keluar.push(rows.filter(t => t.jenis === 'keluar').reduce((s, t) => s + Number(t.nominal), 0));
  }
  if (chArus) chArus.destroy();
  const skin = chartSkin();
  chArus = new Chart(document.getElementById('chArus'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Masuk', data: masuk, backgroundColor: th.secondary, borderRadius: 6 }, { label: 'Keluar', data: keluar, backgroundColor: '#E11D48', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: skin.legend } } }, scales: { x: { ticks: { color: skin.tick }, grid: { color: skin.grid } }, y: { ticks: { color: skin.tick }, grid: { color: skin.grid } } } }
  });

  const mk = monthKey();
  const blnMasuk = db.transactions.filter(t => (t.tanggal || '').slice(0, 7) === mk && t.jenis === 'masuk');
  const byKat = {};
  blnMasuk.forEach(t => byKat[t.kategori] = (byKat[t.kategori] || 0) + Number(t.nominal));
  if (chDonat) chDonat.destroy();
  chDonat = new Chart(document.getElementById('chDonat'), {
    type: 'doughnut',
    data: { labels: Object.keys(byKat).length ? Object.keys(byKat) : ['Belum ada'], datasets: [{ data: Object.keys(byKat).length ? Object.values(byKat) : [1], backgroundColor: [th.primary, th.secondary, th.accent, '#15803D', '#0E7490', '#7C3AED', '#94A3B8'] }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: skin.legend } } } }
  });
}

// ---- Transaksi ----
function katOptions(jenis) {
  const all = [...new Set([...(jenis === 'masuk' ? KAT_MASUK_DEFAULT : KAT_KELUAR_DEFAULT)])];
  return all;
}
function refreshKatFilter() {
  const sel = document.getElementById('fKategori');
  const cats = [...new Set(getDB().transactions.map(t => t.kategori))].sort();
  const cur = sel.value;
  sel.innerHTML = '<option value="">Semua kategori</option>' + cats.map(c => `<option>${c}</option>`).join('');
  sel.value = cur;
}

function renderTransaksi() {
  refreshKatFilter();
  const db = getDB();
  const q = document.getElementById('fSearch').value.toLowerCase();
  const fj = document.getElementById('fJenis').value;
  const fk = document.getElementById('fKategori').value;
  const mode = document.getElementById('fPeriode').value || 'semua';
  const fb = document.getElementById('fBulan').value;
  const fd = document.getElementById('fDari').value;
  const fs = document.getElementById('fSampai').value;
  let rows = [...db.transactions].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  if (q) rows = rows.filter(t => (t.keterangan + ' ' + (t.pihak || '') + ' ' + t.kategori).toLowerCase().includes(q));
  if (fj) rows = rows.filter(t => t.jenis === fj);
  if (fk) rows = rows.filter(t => t.kategori === fk);
  if (mode === 'bulan' && fb) rows = rows.filter(t => (t.tanggal || '').slice(0, 7) === fb);
  if (mode === '30hari') {
    const cut = new Date(); cut.setDate(cut.getDate() - 30);
    const iso = cut.toISOString().slice(0, 10);
    rows = rows.filter(t => (t.tanggal || '') >= iso);
  }
  if (mode === 'range' && (fd || fs)) {
    const a = fd || '0000-01-01', b = fs || '9999-12-31';
    const s = a < b ? a : b, e = a < b ? b : a;
    rows = rows.filter(t => (t.tanggal || '') >= s && (t.tanggal || '') <= e);
  }
  document.getElementById('tbTrans').innerHTML = rows.map(t => `<tr>
    <td class="whitespace-nowrap">${t.tanggal}</td><td><b>${t.keterangan}</b><br><span class="text-xs text-slate-400">${t.pihak || ''}</span></td>
    <td>${t.kategori}</td><td><span class="badge ${t.jenis === 'masuk' ? 'b-masuk' : 'b-keluar'}">${t.jenis === 'masuk' ? 'Masuk' : 'Keluar'}</span></td>
    <td>${t.bukti ? `<img src="${t.bukti}" alt="Bukti" class="bukti-thumb" onclick="lihatBukti('${t.id}')" title="Klik untuk melihat">` : '<span class="text-xs text-slate-300">—</span>'}</td>
    <td class="text-right font-semibold">${rupiah(t.nominal)}</td>
    <td class="text-right whitespace-nowrap"><button class="linkbtn mr-2" onclick="editTrans('${t.id}')">Ubah</button><button class="linkbtn !text-rose-600" onclick="hapusTrans('${t.id}')">Hapus</button></td></tr>`).join('');
  document.getElementById('transEmpty').classList.toggle('hidden', rows.length > 0);
  const cnt = document.getElementById('transCount'); if (cnt) cnt.textContent = `${rows.length} data • ${transPeriodeLabel()}`;
  document.getElementById('btnExportCsv').onclick = () => exportTransaksiCSV(rows);
  document.getElementById('btnExportTransPdf').onclick = () => exportTransaksiPDF(rows, transPeriodeLabel());
  document.getElementById('btnExportTransWord').onclick = () => exportTransaksiWord(rows, transPeriodeLabel());
  renderTransCharts(rows);
}

let chTransTren = null, chTransKat = null;

function renderTransCharts(rows) {
  const th = themeColors();
  const empty = document.getElementById('transChartEmpty');
  const sumM = rows.filter(t => t.jenis === 'masuk').reduce((s, t) => s + Number(t.nominal || 0), 0);
  const sumK = rows.filter(t => t.jenis === 'keluar').reduce((s, t) => s + Number(t.nominal || 0), 0);
  document.getElementById('transSumMasuk').textContent = rupiah(sumM);
  document.getElementById('transSumKeluar').textContent = rupiah(sumK);
  const net = sumM - sumK;
  const netEl = document.getElementById('transSumNet');
  netEl.textContent = (net < 0 ? '-' : '') + rupiah(Math.abs(net));
  netEl.className = 'font-display font-bold ' + (net < 0 ? 'text-rose-600' : 'text-emerald-700');
  document.getElementById('transSumAvg').textContent = rows.length ? rupiah(Math.round((sumM + sumK) / rows.length)) : 'Rp 0';
  if (empty) empty.classList.toggle('hidden', rows.length > 0);
  if (chTransTren) { chTransTren.destroy(); chTransTren = null; }
  if (chTransKat) { chTransKat.destroy(); chTransKat = null; }
  if (!rows.length) return;

  // Selalu detail HARIAN: isi tanggal kosong dengan 0 agar pola harian terlihat penuh
  const sorted = rows.map(t => t.tanggal).sort();
  const dMin = new Date(sorted[0] + 'T00:00:00'), dMax = new Date(sorted[sorted.length - 1] + 'T00:00:00');
  const buckets = {};
  const cursor = new Date(dMin);
  let guard = 0;
  while (cursor <= dMax && guard < 400) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    buckets[key] = { masuk: 0, keluar: 0 };
    cursor.setDate(cursor.getDate() + 1); guard++;
  }
  rows.forEach(t => {
    if (!buckets[t.tanggal]) buckets[t.tanggal] = { masuk: 0, keluar: 0 };
    if (t.jenis === 'masuk') buckets[t.tanggal].masuk += Number(t.nominal || 0);
    else buckets[t.tanggal].keluar += Number(t.nominal || 0);
  });
  const order = Object.keys(buckets).sort();
  const withYear = (dMax - dMin) > 90 * 86400000;
  const labels = order.map(k => new Date(k + 'T00:00:00').toLocaleDateString('id-ID', withYear ? { day: '2-digit', month: 'short', year: '2-digit' } : { day: '2-digit', month: 'short' }));
  const lbl = document.getElementById('transTrenLabel');
  if (lbl) lbl.textContent = `harian • ${order.length} hari • ${transPeriodeLabel()}`;

  // Animasi tumbuh dari BAWAH ke ATAS, 1 bar per 1 bar:
  // hanya properti y + height yang dianimasikan (x/lebar instan, tanpa fade),
  // dengan delay bertahap per bar — Masuk dulu, lalu Keluar.
  const stepMs = order.length > 60 ? 12 : order.length > 31 ? 25 : 45;
  const growDelay = (ctx) => (ctx.datasetIndex || 0) * 450 + (ctx.dataIndex || 0) * stepMs;
  const growProp = { type: 'number', duration: 650, easing: 'easeOutQuart', delay: growDelay };
  const barAnims = {
    x: { duration: 0 },
    width: { duration: 0 },
    y: { ...growProp },
    height: { ...growProp }
  };

  chTransTren = new Chart(document.getElementById('chTransTren'), {
    type: 'bar',
    data: { labels, datasets: [
      { label: 'Masuk', data: order.map(k => buckets[k].masuk), backgroundColor: th.secondary, borderRadius: 4, maxBarThickness: 22 },
      { label: 'Keluar', data: order.map(k => buckets[k].keluar), backgroundColor: '#E11D48', borderRadius: 4, maxBarThickness: 22 }
    ]},
    options: (() => { const sk = chartSkin(); return { responsive: true, maintainAspectRatio: false, animations: barAnims, plugins: { legend: { position: 'bottom', labels: { color: sk.legend } }, tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${rupiah(c.parsed.y)}` } } }, scales: { x: { ticks: { color: sk.tick, maxRotation: 45, autoSkip: true, maxTicksLimit: 15 }, grid: { color: sk.grid } }, y: { ticks: { color: sk.tick, callback: (v) => v >= 1000000 ? (v / 1000000) + 'jt' : v >= 1000 ? (v / 1000) + 'rb' : v }, grid: { color: sk.grid } } } }; })()
  });

  const byKat = {};
  rows.forEach(t => { byKat[t.kategori] = (byKat[t.kategori] || 0) + Number(t.nominal || 0); });
  const katKeys = Object.keys(byKat).sort((a, b) => byKat[b] - byKat[a]);
  chTransKat = new Chart(document.getElementById('chTransKat'), {
    type: 'doughnut',
    data: { labels: katKeys, datasets: [{ data: katKeys.map(k => byKat[k]), backgroundColor: [th.primary, th.secondary, th.accent, '#15803D', '#0E7490', '#7C3AED', '#DB2777', '#EA580C', '#65A30D', '#0284C7', '#94A3B8', '#57534E', '#A21CAF'] }] },
    options: { responsive: true, maintainAspectRatio: false, animation: { duration: 700, easing: 'easeOutQuart', delay: (ctx) => (ctx.dataIndex || 0) * 90 }, plugins: { legend: { position: 'bottom', labels: { color: chartSkin().legend } }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${rupiah(c.parsed)}` } } } }
  });

  // Top 5 hari dengan total transaksi terbesar
  const top = order
    .map(k => ({ k, masuk: buckets[k].masuk, keluar: buckets[k].keluar, total: buckets[k].masuk + buckets[k].keluar }))
    .filter(x => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  document.getElementById('tbTopHari').innerHTML = top.map(x => {
    const d = new Date(x.k + 'T00:00:00');
    return `<tr><td class="whitespace-nowrap">${d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td><td>${d.toLocaleDateString('id-ID', { weekday: 'long' })}</td><td class="text-right text-emerald-700">${rupiah(x.masuk)}</td><td class="text-right text-rose-600">${rupiah(x.keluar)}</td><td class="text-right font-bold">${rupiah(x.total)}</td></tr>`;
  }).join('') || '<tr><td colspan="5" class="text-center text-slate-400">—</td></tr>';
}

window.hapusTrans = (id) => { if (confirm('Hapus transaksi ini?')) { deleteTransaction(id); renderAll(); toast('Transaksi dihapus'); } };
window.editTrans = (id) => {
  const t = getDB().transactions.find(x => x.id === id); if (!t) return;
  openModal(t);
};

function openModal(t = null) {
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modalTitle').textContent = t ? 'Ubah Transaksi' : 'Tambah Transaksi';
  document.getElementById('mId').value = t?.id || '';
  document.getElementById('mTanggal').value = t?.tanggal || new Date().toISOString().slice(0, 10);
  document.getElementById('mJenis').value = t?.jenis || 'masuk';
  syncModalKat();
  document.getElementById('mKategori').value = t?.kategori || document.getElementById('mKategori').value;
  document.getElementById('mKet').value = t?.keterangan || '';
  document.getElementById('mNominal').value = t?.nominal || '';
  document.getElementById('mPihak').value = t?.pihak || '';
  document.getElementById('mBukti').value = '';
  tempBukti = t?.bukti || null;
  showBuktiPreview(tempBukti, t?.bukti ? 'Bukti tersimpan — ganti dengan pilih file baru' : null);
}
function syncModalKat() {
  const j = document.getElementById('mJenis').value;
  document.getElementById('mKategori').innerHTML = katOptions(j).map(k => `<option>${k}</option>`).join('');
}

// ---- Laporan ----
function lapRowsAndLabel() {
  const mode = document.getElementById('lapMode').value || 'bulan';
  const db = getDB();
  if (mode === '30hari') {
    const cut = new Date(); cut.setDate(cut.getDate() - 30);
    const iso = cut.toISOString().slice(0, 10);
    return { rows: db.transactions.filter(t => (t.tanggal || '') >= iso), label: '30 hari terakhir' };
  }
  if (mode === 'range') {
    const a = document.getElementById('lapDari').value || '0000-01-01';
    const b = document.getElementById('lapSampai').value || '9999-12-31';
    const s = a < b ? a : b, e = a < b ? b : a;
    return { rows: db.transactions.filter(t => (t.tanggal || '') >= s && (t.tanggal || '') <= e), label: `Range ${s} s/d ${e}` };
  }
  const periode = document.getElementById('lapBulan').value || monthKey();
  return { rows: db.transactions.filter(t => (t.tanggal || '').slice(0, 7) === periode), label: 'Bulan ' + periode };
}

function renderLaporan() {
  const { rows, label } = lapRowsAndLabel();
  const db = getDB();
  const sum = calcSummary(rows, 0);
  // saldo akhir = semua transaksi s/d akhir periode
  let cutoff = '9999-12-31';
  const mode = document.getElementById('lapMode').value;
  if (mode === 'bulan') { const p = document.getElementById('lapBulan').value || monthKey(); cutoff = p + '-31'; }
  else if (mode === '30hari') cutoff = new Date().toISOString().slice(0, 10);
  else cutoff = document.getElementById('lapSampai').value || document.getElementById('lapDari').value || cutoff;
  const saldoAkhir = calcSummary(db.transactions.filter(t => (t.tanggal || '') <= cutoff), db.settings.saldoAwal).saldo;
  const byKat = {};
  rows.forEach(t => {
    byKat[t.kategori] = byKat[t.kategori] || { kat: t.kategori, masuk: 0, keluar: 0 };
    if (t.jenis === 'masuk') byKat[t.kategori].masuk += Number(t.nominal); else byKat[t.kategori].keluar += Number(t.nominal);
  });
  const lbl = document.getElementById('lapPeriodeLabel'); if (lbl) lbl.textContent = `${label} • ${rows.length} transaksi`;
  document.getElementById('lapCards').innerHTML = `
    <div class="stat-card"><p class="stat-label">Masuk (${label})</p><p class="stat-value text-emerald-600">${rupiah(sum.masuk)}</p></div>
    <div class="stat-card"><p class="stat-label">Keluar (${label})</p><p class="stat-value text-rose-600">${rupiah(sum.keluar)}</p></div>
    <div class="stat-card"><p class="stat-label">Saldo Akhir Kas</p><p class="stat-value">${rupiah(saldoAkhir)}</p></div>`;
  document.getElementById('tbLap').innerHTML = Object.values(byKat).map(r => `<tr><td>${r.kat}</td><td class="text-right">${rupiah(r.masuk)}</td><td class="text-right">${rupiah(r.keluar)}</td><td class="text-right font-bold">${rupiah(r.masuk - r.keluar)}</td></tr>`).join('') || '<tr><td colspan="4" class="text-center text-slate-400">Belum ada data periode ini</td></tr>';
  document.getElementById('btnLapPdf').onclick = () => exportLaporanPDF(label, Object.values(byKat), { saldo: saldoAkhir });
  document.getElementById('btnLapWord').onclick = () => exportLaporanWord(label, Object.values(byKat), { saldo: saldoAkhir });
}

// ---- Pengaturan ----
function renderPengaturan() {
  const db = getDB();
  document.getElementById('setNama').value = db.settings.nama;
  document.getElementById('setAlamat').value = db.settings.alamat;
  document.getElementById('setSaldo').value = db.settings.saldoAwal;
  document.getElementById('setMethod').value = String(db.settings.method || 20);
  document.getElementById('listKatMasuk').innerHTML = KAT_MASUK_DEFAULT.map(k => `<li>• ${k}</li>`).join('');
  document.getElementById('listKatKeluar').innerHTML = KAT_KELUAR_DEFAULT.map(k => `<li>• ${k}</li>`).join('');
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  seedDummy(false);
  const mk = monthKey();
  document.getElementById('lapBulan').value = mk;
  document.getElementById('fBulan').value = mk;
  document.getElementById('fPeriode').value = 'semua';
  document.getElementById('jadwalBulan').value = mk;
  document.getElementById('puasaBulan').value = mk;

  document.querySelectorAll('[data-page]').forEach(b => b.onclick = () => switchPage(b.dataset.page));
  document.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => switchPage(b.dataset.goto));

  ['fSearch', 'fJenis', 'fKategori', 'fBulan', 'fPeriode', 'fDari', 'fSampai'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    el.addEventListener('input', renderTransaksi);
    el.addEventListener('change', renderTransaksi);
  });
  ['lapMode', 'lapBulan', 'lapDari', 'lapSampai'].forEach(id => {
    const el = document.getElementById(id); if (el) el.addEventListener('change', renderLaporan);
  });

  document.getElementById('btnTambah').onclick = () => openModal();
  document.getElementById('btnBatal').onclick = () => document.getElementById('modal').classList.add('hidden');
  document.getElementById('mJenis').onchange = syncModalKat;

  // upload bukti opsional
  document.getElementById('mBukti').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast('File harus gambar');
    if (f.size > 8 * 1024 * 1024) return toast('Gambar maksimal 8MB');
    toast('Mengompres gambar...');
    try {
      tempBukti = await compressImage(f);
      showBuktiPreview(tempBukti);
      toast('Bukti siap disimpan');
    } catch { toast('Gagal membaca gambar'); }
  };
  document.getElementById('btnHapusBukti').onclick = () => {
    tempBukti = null;
    document.getElementById('mBukti').value = '';
    showBuktiPreview(null);
  };
  document.getElementById('btnLihatBukti').onclick = () => openBuktiLightbox(tempBukti, 'Pratinjau bukti');
  document.getElementById('buktiPreview').onclick = () => openBuktiLightbox(tempBukti, 'Pratinjau bukti');
  document.getElementById('btnTutupBukti').onclick = () => document.getElementById('buktiModal').classList.add('hidden');
  document.getElementById('buktiModal').onclick = (e) => { if (e.target.id === 'buktiModal') e.target.classList.add('hidden'); };

  // tema kustom
  document.getElementById('btnSimpanTema').onclick = () => {
    const db = getDB();
    db.settings.theme = {
      preset: 'kustom',
      primary: document.getElementById('thPrimary').value,
      secondary: document.getElementById('thSecondary').value,
      accent: document.getElementById('thAccent').value
    };
    try { saveDB(db); } catch { return; }
    applyTheme(); renderTema(); renderCharts();
    toast('Tema kustom tersimpan');
  };
  document.getElementById('btnResetTema').onclick = () => {
    const db = getDB();
    db.settings.theme = { ...THEME_DEFAULT };
    try { saveDB(db); } catch { return; }
    applyTheme(); renderTema(); renderCharts();
    toast('Tema dikembalikan default');
  };
  document.getElementById('setDark').onchange = (e) => {
    const db = getDB();
    db.settings.dark = e.target.checked;
    try { saveDB(db); } catch { return; }
    applyDark(); renderCharts(); renderTransaksi();
    toast(e.target.checked ? 'Mode gelap AMOLED aktif' : 'Mode terang aktif');
  };
  document.getElementById('setShadow').onchange = (e) => {    const db = getDB();
    db.settings.shadow = { on: e.target.checked, intensity: (document.getElementById('setShadowInt') || {}).value || 'sedang' };
    try { saveDB(db); } catch { return; }
    applyShadow();
    toast(e.target.checked ? 'Shadow 3D diaktifkan' : 'Shadow 3D dimatikan');
  };
  document.getElementById('setShadowInt').onchange = (e) => {
    const db = getDB();
    db.settings.shadow = { on: (document.getElementById('setShadow') || {}).checked !== false, intensity: e.target.value };
    try { saveDB(db); } catch { return; }
    applyShadow();
    toast('Intensitas shadow: ' + e.target.value);
  };

  document.getElementById('btnSimpanTrans').onclick = () => {
    const ket = document.getElementById('mKet').value.trim();
    const nom = Number(document.getElementById('mNominal').value);
    if (!ket || !nom) return toast('Lengkapi keterangan & nominal');
    const data = { tanggal: document.getElementById('mTanggal').value || new Date().toISOString().slice(0, 10), jenis: document.getElementById('mJenis').value, kategori: document.getElementById('mKategori').value, keterangan: ket, nominal: nom, pihak: document.getElementById('mPihak').value.trim(), bukti: tempBukti || null };
    const id = document.getElementById('mId').value;
    try {
      if (id) updateTransaction(id, data); else addTransaction(data);
    } catch { return; }
    document.getElementById('modal').classList.add('hidden');
    tempBukti = null;
    renderAll(); toast('Transaksi tersimpan' + (data.bukti ? ' + bukti' : ''));
    if (typeof checkDailyBackup === 'function') checkDailyBackup();
  };

  document.getElementById('btnGPS').onclick = activateGPS;
  document.getElementById('btnJadwalPdf').onclick = exportJadwalPDF;
  document.getElementById('btnJadwalWord').onclick = exportJadwalWord;
  document.getElementById('btnPuasaPdf').onclick = exportPuasaPDF;
  document.getElementById('btnPuasaWord').onclick = exportPuasaWord;
  document.getElementById('btnTerapkanJadwal').onclick = async () => { toast('Memuat jadwal...'); await loadJadwal(); };
  document.getElementById('btnTerapkanPuasa').onclick = async () => { toast('Memuat jadwal puasa...'); await loadPuasa(); };

  document.getElementById('btnSimpanSet').onclick = () => {
    const db = getDB();
    db.settings.nama = document.getElementById('setNama').value || db.settings.nama;
    db.settings.alamat = document.getElementById('setAlamat').value || '';
    db.settings.saldoAwal = Number(document.getElementById('setSaldo').value) || 0;
    db.settings.method = Number(document.getElementById('setMethod').value) || 20;
    saveDB(db); renderAll(); toast('Pengaturan tersimpan');
    loadTodayPrayer(); load30Days();
  };
  document.getElementById('btnBackup').onclick = () => {
    const blob = new Blob([localStorage.getItem(DB_KEY)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'backup-kas-masjid.json'; a.click();
  };
  document.getElementById('fileRestore').onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { JSON.parse(r.result); localStorage.setItem(DB_KEY, r.result); renderAll(); toast('Restore berhasil'); } catch { toast('File tidak valid'); } };
    r.readAsText(f);
  };
  document.getElementById('btnResetDummy').onclick = () => { if (confirm('Reset ke data dummy? Data saat ini hilang.')) { localStorage.removeItem(DB_KEY); getDB(); seedDummy(true); renderAll(); toast('Data dummy dimuat ulang'); } };
  document.getElementById('btnHapusSemua').onclick = () => { if (confirm('Hapus SEMUA transaksi?')) { const db = getDB(); db.transactions = []; saveDB(db); renderAll(); toast('Semua transaksi dihapus'); } };

  renderAll();
  initKotaSelect();
  // animasi awal dashboard saat pertama dibuka
  const first = document.querySelector('.page[data-section="dashboard"]');
  if (first && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    first.classList.add('page-enter');
    setTimeout(() => first.classList.remove('page-enter'), 900);
  }
  toast('Memuat jadwal sholat...');
  await loadTodayPrayer();
  await load30Days();
  if (typeof upgradeGpsLabel === 'function') upgradeGpsLabel();
});
