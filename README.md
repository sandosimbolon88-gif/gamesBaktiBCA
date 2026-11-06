# Games Bakti Lingkungan — Pulang ke Banyuwangi v8

Game konservasi penyu untuk browser, berbasis HTML lampiran v6. Visual digambar dengan Canvas; game tidak membutuhkan CDN, akun, atau koneksi internet saat file mandiri dibuka.

**Mulai:** buka `games/penyu/index.html`, atau jalankan server lokal:

```bash
python -m http.server 8000 --bind 127.0.0.1
```

Lalu buka `http://127.0.0.1:8000/games/penyu/`. Untuk HP/tablet, gunakan hosting statis melalui HTTPS. Versi hosting menyimpan file untuk bermain offline setelah cache selesai.

**Satu HTML:** jalankan `python tools/buat_satu_file.py`. Hasilnya `dist/pulang-ke-banyuwangi.html`, dapat dibuka langsung di laptop tanpa internet. Folder `dist/` adalah keluaran build dan tidak disimpan di Git.

## Yang berubah

Pembaruan v8 menambah 10–16 sampah saat awal laut, dengan batas 16/20/24 per fase. Botol, kantong, plastik robek dan fragmen mendominasi. Warna ubur-ubur dan plastik sengaja berdekatan; cincin makanan dihapus agar pemain mengamati bentuknya.

Makanan benar selalu **+5**, sampah selalu **−4**, termasuk saat frenzy dan pada semua tingkat. Pengali hanya berlaku untuk bonus perjalanan. Botol mengurangi 28 health; kantong/plastik robek 32. Makanan biasa memulihkan 0,45 health.

Makanan mencakup moluska (kerang/siput), tunikata, salpa, alga merah dan lamun dengan bentuk berbeda, sesuai diet spesies. Barakuda mengancam tukik; satu pemburu ilegal dapat muncul pada fase laut muda/dewasa, didahului peringatan. Penyelam biasa serta relawan konservasi bukan musuh.

Intan Box dan semi alami mempunyai lintasan pasir lebih panjang. Gerak pasir perlu tahan klik/sentuhan atau Spasi, dengan kecepatan lebih rendah. Gangguan pada tahap bertelur berasal dari cahaya kafe/kota yang mengarah ke pasir. Jarak dan kontrol tersebut merupakan aturan game, bukan petunjuk pelepasliaran.

Dasar visual dan alur dari v7 tetap dipakai:

- Penyu dengan pola cangkang per spesies dan sirip beranimasi; material baru untuk ikan, ubur-ubur, plastik, kapal dan alga, tambahan kaleng/tali.
- Laut berlapis, cahaya air, relief dasar laut, dan menu bernuansa pesisir.
- Makan berurutan memberi kombo; 12 makanan mengaktifkan frenzy. Melesat mempunyai cooldown tiga detik. Tetap makan sesuai diet penyu.
- Ukuran cangkang dan panjang predator memakai skala per fase; belimbing dewasa lebih besar daripada penyu lain. Hiu macan tetap berbahaya. Makanan mikroskopis diperbesar dan pertumbuhan dipercepat.
- Sampah, predator, jaring dan kapal dibatasi agar ada ruang berenang; hiu diperingatkan sebelum masuk.
- Fakta dan kuis diperiksa ulang. Sumber dapat dibuka dari kartu fakta. Status hijau LC global diperbarui; data capaian BCA bertanggal Agustus 2026.

Dasar sumber, koreksi, ukuran dan batas penyederhanaan: **[docs/FACT_CHECK.md](docs/FACT_CHECK.md)**. `docs/PLAN.md` adalah arsip rancangan awal.

## Kontrol

Mouse: arahkan untuk berenang. Sentuh: tahan dan geser. Keyboard: WASD/panah. Shift atau tombol Melesat untuk dash di tiga fase laut. Di pasir: tahan klik/sentuhan atau Spasi untuk berjalan dan menggali, lalu arahkan dengan mouse/WASD. Lepas jaring: ketuk atau tekan Spasi/Enter berulang. Esc/P untuk jeda.

## Operator dan skor

Tahan label Bakti Lingkungan di judul selama 1,5 detik, atau tekan O. Menu menyediakan mode cepat, suara, statistik, ekspor CSV dan reset. Skor disimpan per perangkat; gunakan nama panggilan. Papan v8 terpisah dari papan v7/v1 karena keseimbangan skor berubah; data lama tidak dihapus. Statistik penggunaan tetap dilanjutkan.

Ubah konten di `games/penyu/js/data.js`; gaya dan renderer masing-masing di `style.css` dan `js/art.js`. Bila memperbarui aplikasi hosting, naikkan versi cache di `sw.js`. Teks booth opsional harus sesuai periode kegiatan; nilai default nonaktif.

## Pengujian

```bash
npm install --ignore-scripts
npx playwright install chromium
# Jalankan server lokal di terminal lain, lalu:
npm test
```

Jika memakai Chromium sistem: `CHROMIUM_PATH=/usr/bin/chromium npm test`. `GAME_URL` dapat menunjuk server lain. Uji meliputi empat spesies/tiga fase laut, batas rintangan, diet, +5/−4 di seluruh mode/fase termasuk migrasi, tombol tahan/lepas, pemburu ilegal, geometri cahaya bangunan, napas, kombo, lepas jaring, satu nyawa per kontak, alur lima tahap, kuis, penyimpanan skor, tautan sumber, sentuh, dan cache offline.

`?debug=1` mengaktifkan N untuk melewati tahap dan K untuk mengurangi nyawa. `?bot=1` mengaktifkan pemain otomatis untuk inspeksi; keduanya melewati registrasi service worker.
