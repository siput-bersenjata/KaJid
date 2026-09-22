/* Ekspor PDF / Word / CSV — nama masjid + by Salshya-Dev */
const DEV_LINK = 'https://salshya-club.vercel.app/';
const DEV_LABEL = 'by Salshya-Dev';

function jsPDFInstance() { return new window.jspdf.jsPDF(); }
function masjidName() { try { return getDB().settings.nama || 'Kas Masjid'; } catch { return 'Kas Masjid'; } }

function pdfFooter(doc) {
  const n = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFontSize(8); doc.setTextColor(100);
  doc.text(DEV_LABEL + ' — ' + DEV_LINK, n / 2, h - 8, { align: 'center' });
}

function wordFooterHTML() {
  return `<p style="text-align:center;color:#64748B;font-size:11px;margin-top:24px;"><a href="${DEV_LINK}">${DEV_LABEL}</a> — ${DEV_LINK}</p>`;
}

function exportJadwalPDF() {
  if (!list30.length) return toast('Jadwal belum dimuat — klik Tampilkan dulu');
  const db = getDB();
  const doc = jsPDFInstance();
  doc.setFontSize(14); doc.setTextColor(15, 23, 42);
  doc.text(`Jadwal Sholat — ${masjidName()}`, 14, 15);
  doc.setFontSize(10);
  doc.text(`Lokasi: ${db.settings.kotaLabel} (${Number(db.settings.lat).toFixed(3)}, ${Number(db.settings.lng).toFixed(3)}) • Metode Kemenag RI`, 14, 22);
  doc.text(`Periode: ${jadwalPeriodeLabel} • ${list30.length} hari`, 14, 28);
  doc.autoTable({
    startY: 33,
    head: [['Tanggal', 'Imsak', 'Subuh', 'Terbit', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya']],
    body: list30.map(({ d, t }) => [d.toLocaleDateString('id-ID'), cleanTime(t.Imsak), cleanTime(t.Fajr), cleanTime(t.Sunrise), cleanTime(t.Dhuhr), cleanTime(t.Asr), cleanTime(t.Maghrib), cleanTime(t.Isha)]),
    styles: { fontSize: 8 }, headStyles: { fillColor: [15, 23, 42] },
    didDrawPage: () => pdfFooter(doc)
  });
  pdfFooter(doc);
  doc.save(`jadwal-sholat-${masjidName().replace(/\s+/g, '-').toLowerCase()}.pdf`);
  toast(`PDF jadwal (${list30.length} hari) diunduh`);
}

function exportJadwalWord() {
  if (!list30.length) return toast('Jadwal belum dimuat — klik Tampilkan dulu');
  const db = getDB();
  const rows = list30.map(({ d, t }) => `<tr><td>${d.toLocaleDateString('id-ID')}</td><td>${cleanTime(t.Imsak)}</td><td>${cleanTime(t.Fajr)}</td><td>${cleanTime(t.Sunrise)}</td><td>${cleanTime(t.Dhuhr)}</td><td>${cleanTime(t.Asr)}</td><td>${cleanTime(t.Maghrib)}</td><td>${cleanTime(t.Isha)}</td></tr>`).join('');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body><h2>Jadwal Sholat — ${masjidName()}</h2><p>Lokasi: ${db.settings.kotaLabel} • Metode Kemenag RI<br>Periode: ${jadwalPeriodeLabel} • ${list30.length} hari</p><table border="1" cellspacing="0" cellpadding="6"><tr><th>Tanggal</th><th>Imsak</th><th>Subuh</th><th>Terbit</th><th>Dzuhur</th><th>Ashar</th><th>Maghrib</th><th>Isya</th></tr>${rows}</table>${wordFooterHTML()}</body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'jadwal-sholat.doc'; a.click();
  toast(`Word jadwal (${list30.length} hari) diunduh`);
}

function exportPuasaPDF() {
  if (!puasaWeek.length) return toast('Jadwal puasa belum dimuat — klik Tampilkan dulu');
  const db = getDB();
  const doc = jsPDFInstance();
  doc.setFontSize(14); doc.setTextColor(15, 23, 42);
  doc.text(`Jadwal Puasa & Imsak — ${masjidName()}`, 14, 15);
  doc.setFontSize(10);
  doc.text(`Lokasi: ${db.settings.kotaLabel} • Periode: ${puasaPeriodeLabel} • ${puasaWeek.length} hari`, 14, 22);
  doc.autoTable({
    startY: 27,
    head: [['Tanggal', 'Hari', 'Imsak', 'Buka (Maghrib)', 'Durasi', 'Sunnah']],
    body: puasaWeek.map(({ d, t }) => {
      const imsak = cleanTime(t.Imsak), buka = cleanTime(t.Maghrib);
      const hari = d.toLocaleDateString('id-ID', { weekday: 'long' });
      let sun = '—'; if (d.getDay() === 1) sun = 'Senin'; if (d.getDay() === 4) sun = 'Kamis';
      return [d.toLocaleDateString('id-ID'), hari, imsak, buka, durasiStr(imsak, buka), sun];
    }),
    styles: { fontSize: 9 }, headStyles: { fillColor: [161, 98, 7] },
    didDrawPage: () => pdfFooter(doc)
  });
  pdfFooter(doc);
  doc.save(`jadwal-puasa-${masjidName().replace(/\s+/g, '-').toLowerCase()}.pdf`);
  toast(`PDF puasa (${puasaWeek.length} hari) diunduh`);
}

function exportPuasaWord() {
  if (!puasaWeek.length) return toast('Jadwal puasa belum dimuat — klik Tampilkan dulu');
  const rows = puasaWeek.map(({ d, t }) => {
    const imsak = cleanTime(t.Imsak), buka = cleanTime(t.Maghrib);
    return `<tr><td>${d.toLocaleDateString('id-ID')}</td><td>${d.toLocaleDateString('id-ID', { weekday: 'long' })}</td><td>${imsak}</td><td>${buka}</td><td>${durasiStr(imsak, buka)}</td></tr>`;
  }).join('');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body><h2>Jadwal Puasa &amp; Imsak — ${masjidName()}</h2><p>Periode: ${puasaPeriodeLabel} • ${puasaWeek.length} hari</p><table border="1" cellspacing="0" cellpadding="6"><tr><th>Tanggal</th><th>Hari</th><th>Imsak</th><th>Buka</th><th>Durasi</th></tr>${rows}</table>${wordFooterHTML()}</body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'jadwal-puasa.doc'; a.click();
  toast(`Word puasa (${puasaWeek.length} hari) diunduh`);
}

function exportTransaksiCSV(rows) {
  if (!rows.length) return toast('Tidak ada data pada filter ini');
  const head = 'tanggal,jenis,kategori,keterangan,nominal,pihak,bukti\n';
  const body = rows.map(t => [t.tanggal, t.jenis, `"${t.kategori}"`, `"${(t.keterangan || '').replace(/"/g, '""')}"`, t.nominal, `"${(t.pihak || '').replace(/"/g, '""')}"`, t.bukti ? 'Ada' : 'Tidak'].join(',')).join('\n');
  const blob = new Blob([head + body], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'transaksi-kas-masjid.csv'; a.click();
  toast(`CSV ${rows.length} transaksi diunduh`);
}

function exportTransaksiPDF(rows, periodeLabel) {
  if (!rows.length) return toast('Tidak ada data pada filter ini');
  const doc = jsPDFInstance();
  doc.setFontSize(14); doc.text(`Transaksi Kas — ${masjidName()}`, 14, 15);
  doc.setFontSize(10); doc.text(`Periode: ${periodeLabel} • ${rows.length} transaksi`, 14, 22);
  doc.autoTable({
    startY: 27,
    head: [['Tanggal', 'Keterangan', 'Kategori', 'Jenis', 'Bukti', 'Nominal']],
    body: rows.map(t => [t.tanggal, `${t.keterangan}${t.pihak ? ' (' + t.pihak + ')' : ''}`, t.kategori, t.jenis === 'masuk' ? 'Masuk' : 'Keluar', t.bukti ? 'Ada' : '-', rupiah(t.nominal)]),
    styles: { fontSize: 8 }, headStyles: { fillColor: [15, 23, 42] },
    didDrawPage: () => pdfFooter(doc)
  });
  pdfFooter(doc);
  doc.save('transaksi-kas-masjid.pdf');
  toast('PDF transaksi diunduh');
}

function exportTransaksiWord(rows, periodeLabel) {
  if (!rows.length) return toast('Tidak ada data pada filter ini');
  const trs = rows.map(t => `<tr><td>${t.tanggal}</td><td>${t.keterangan}</td><td>${t.kategori}</td><td>${t.jenis}</td><td>${t.bukti ? 'Ada' : '-'}</td><td>${rupiah(t.nominal)}</td></tr>`).join('');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body><h2>Transaksi Kas — ${masjidName()}</h2><p>Periode: ${periodeLabel} • ${rows.length} transaksi</p><table border="1" cellspacing="0" cellpadding="6"><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th>Jenis</th><th>Bukti</th><th>Nominal</th></tr>${trs}</table>${wordFooterHTML()}</body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'transaksi-kas-masjid.doc'; a.click();
  toast('Word transaksi diunduh');
}

function exportLaporanPDF(periode, rows, sum) {
  const doc = jsPDFInstance();
  doc.setFontSize(14); doc.text(`Laporan Kas — ${masjidName()}`, 14, 15);
  doc.setFontSize(10); doc.text(`Periode: ${periode} • Saldo akhir: ${rupiah(sum.saldo)}`, 14, 22);
  doc.autoTable({
    startY: 27,
    head: [['Kategori', 'Masuk', 'Keluar', 'Net']],
    body: rows.map(r => [r.kat, rupiah(r.masuk), rupiah(r.keluar), rupiah(r.masuk - r.keluar)]),
    styles: { fontSize: 9 }, headStyles: { fillColor: [15, 23, 42] },
    didDrawPage: () => pdfFooter(doc)
  });
  pdfFooter(doc);
  doc.save(`laporan-${periode.replace(/[^\w-]+/g, '-')}.pdf`);
  toast('PDF laporan diunduh');
}

function exportLaporanWord(periode, rows, sum) {
  const trs = rows.map(r => `<tr><td>${r.kat}</td><td>${rupiah(r.masuk)}</td><td>${rupiah(r.keluar)}</td><td>${rupiah(r.masuk - r.keluar)}</td></tr>`).join('');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body><h2>Laporan Kas — ${masjidName()}</h2><p>Periode: ${periode} • Saldo akhir: ${rupiah(sum.saldo)}</p><table border="1" cellspacing="0" cellpadding="6"><tr><th>Kategori</th><th>Masuk</th><th>Keluar</th><th>Net</th></tr>${trs}</table>${wordFooterHTML()}</body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'laporan-kas-masjid.doc'; a.click();
  toast('Word laporan diunduh');
}
