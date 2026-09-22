# KaJid — Dashboard Kas Masjid

Aplikasi web pencatatan keuangan masjid + jadwal sholat berbasis GPS + jadwal puasa & imsak, dengan ekspor PDF/Word dan database lokal. Tanpa build step — cukup buka di browser.

> **About:** Dashboard keuangan masjid (pemasukan/pengeluaran, bukti transaksi, laporan), jadwal sholat akurat lokasi GPS + alamat otomatis (Aladhan API, metode Kemenag RI), jadwal puasa & imsak, ekspor fleksibel (30 hari / bulan / range tanggal) ke PDF–Word–CSV, database lokal + auto-backup harian, tema khas masjid, mode gelap AMOLED, dan shadow 3D.

## Fitur

- **Dashboard** — total saldo, pemasukan/pengeluaran bulan ini, grafik arus kas 6 bulan, donat kategori, sholat berikutnya + countdown detik, transaksi terbaru.
- **Transaksi** — tambah/ubah/hapus, cari, filter jenis/kategori/periode (semua waktu, 30 hari, bulan, range tanggal), **upload bukti struk (opsional, dikompres & tersimpan lokal)**, grafik detail **harian** animasi tumbuh bawah-ke-atas 1-per-1, donat kategori, Top 5 hari terbesar, ekspor CSV/PDF/Word mengikuti filter.
- **Laporan** — rekap per kategori per periode (bulan / 30 hari / range) + ekspor PDF/Word.
- **Jadwal Sholat** — tombol Aktifkan GPS → koordinat + **alamat akurat otomatis** (reverse-geocode), fallback 15 kota Indonesia, 7 waktu (Imsak–Isya), highlight sholat berikutnya, tanggal Hijriah, tabel periode fleksibel (30 hari / bulan / range) + ekspor PDF/Word.
- **Puasa & Imsak** — imsak/buka hari ini, durasi puasa, puasa Senin–Kamis terdekat, tabel periode fleksibel (7/30 hari / bulan / range) + ekspor PDF/Word.
- **Database lokal** — `localStorage` (`kasMasjidDB_v1`), backup/restore JSON manual, **auto-backup harian otomatis ke folder pilihan** + restore otomatis dari folder, reset data dummy.
- **Tampilan** — 6 tema khas masjid + warna kustom, **mode gelap AMOLED** mengikuti tema, toggle **shadow 3D** + intensitas, animasi halaman stagger, hormati `prefers-reduced-motion`.

## Cara menjalankan

```bash
cd "D:\koding\Projek Dummy\Kas Masjid Dummy"
python -m http.server 8080
# buka http://localhost:8080
```

Server lokal disarankan agar fetch API jadwal (Aladhan, BigDataCloud) tidak terhambat. Data dummy (~50 transaksi 6 bulan) dibuat otomatis saat dibuka pertama.

## Teknologi

HTML + Tailwind CDN + Chart.js + jsPDF + Aladhan API + BigDataCloud reverse-geocode + File System Access API. Data di browser, tanpa server.

## Struktur

- `index.html` — layout SPA 6 halaman
- `assets/css/style.css` — token, tema, dark mode, animasi
- `assets/js/db.js` — database lokal + tema/preset
- `assets/js/dummy.js` — generator data dummy
- `assets/js/prayer.js` — GPS, alamat, jadwal sholat & puasa
- `assets/js/export.js` — ekspor PDF/Word/CSV
- `assets/js/autobackup.js` — auto-backup harian & restore folder
- `assets/js/app.js` — navigasi, grafik, CRUD, tema

---

by [Salshya-Dev](https://salshya-club.vercel.app/)
