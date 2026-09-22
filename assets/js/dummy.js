/* Data dummy 6 bulan terakhir */
function seedDummy(force = false) {
  let db = getDB();
  if (db.transactions.length > 0 && !force) return false;

  const names = ['Hamba Allah', 'Bpk. Ahmad', 'Ibu Siti', 'Bpk. Budi', 'Ibu Rina', 'Bpk. Harto', 'Ibu Dewi', 'Bpk. Slamet', 'Komunitas Remaja', 'Toko Berkah'];
  const masukPool = [
    ['Infaq Jumat', 'Infaq sholat Jumat', 800000, 2500000],
    ['Kotak Amal', 'Kotak amal harian', 150000, 600000],
    ['Donatur', 'Donasi pembangunan', 500000, 5000000],
    ['Zakat', 'Zakat mal jamaah', 300000, 2000000],
    ['Wakaf', 'Wakaf tunai', 1000000, 3000000],
    ['Parkir', 'Infaq parkir', 100000, 400000],
  ];
  const keluarPool = [
    ['Listrik & Air', 'Bayar listrik & PDAM', 400000, 900000],
    ['Gaji Marbot', 'Honor marbot & imam', 1200000, 2000000],
    ['Perbaikan', 'Perbaikan sound / atap', 300000, 2500000],
    ['Kegiatan', 'Kajian & buka bersama', 500000, 1800000],
    ['Sembako Dhuafa', 'Santunan dhuafa', 600000, 1500000],
    ['Kebersihan', 'Alat kebersihan & sabun', 150000, 500000],
  ];

  const trs = [];
  const today = new Date();
  for (let m = 5; m >= 0; m--) {
    const base = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    // 8-12 transaksi per bulan
    const n = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const isMasuk = Math.random() < 0.55;
      const pool = isMasuk ? masukPool : keluarPool;
      const [kat, ketBase, lo, hi] = pool[Math.floor(Math.random() * pool.length)];
      const day = 1 + Math.floor(Math.random() * daysInMonth);
      const tgl = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const nominal = Math.round((lo + Math.random() * (hi - lo)) / 1000) * 1000;
      trs.push({
        id: uid(),
        tanggal: tgl,
        jenis: isMasuk ? 'masuk' : 'keluar',
        kategori: kat,
        keterangan: kat === 'Infaq Jumat' ? 'Infaq sholat Jumat' : `${ketBase}`,
        nominal,
        pihak: names[Math.floor(Math.random() * names.length)]
      });
    }
  }
  // Jumat selalu ada infaq besar minggu berjalan
  trs.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  db = getDB();
  db.transactions = trs;
  db.seededAt = new Date().toISOString();
  saveDB(db);
  return true;
}
