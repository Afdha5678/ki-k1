# Playfair Cipher: Tugas K1 Keamanan Informasi

Aplikasi web untuk enkripsi dan dekripsi berkas teks menggunakan **Playfair Cipher**, disertai laporan PDF implementasi.


## Menjalankan aplikasi

Tidak perlu instalasi. Buka `app/index.html` di peramban (Chrome/Edge/Firefox/Safari).

1. Pilih mode **Enkripsi** atau **Dekripsi**.
2. Ketik kata/frasa kunci; bujursangkar 5×5 langsung terbentuk.
3. Pilih atau seret berkas `.txt` (isinya bisa juga diketik atau diedit).
4. Klik **Enkripsi**/**Dekripsi** (atau Ctrl/⌘ + Enter), lalu **Unduh .txt**.

Tombol **Muat contoh slide** memuat contoh dari materi kuliah (`temui ibu nanti malam` → `ZB RS FY KU PG LG RK VS NL QV`).

## Aturan yang diimplementasikan

- Bujursangkar kunci 5×5 dari huruf unik kunci + sisa alfabet, tanpa huruf J (J → I).
- Karakter non-huruf dibuang; huruf kembar dalam satu bigram disisipi `X`; jumlah ganjil ditambah `X` (untuk `XX` dipakai `Q`).
- Enkripsi: baris sama → geser kanan, kolom sama → geser bawah, lainnya → titik sudut persegi panjang.
- Dekripsi: kebalikannya, lalu `X` sisipan dibuang (hasil mentah juga ditampilkan).

## Pengembangan

```bash
npm test
```

Membuat ulang screenshot, berkas contoh, dan laporan PDF (butuh Google Chrome). Isi dulu NIM di `laporan/identitas.json`:

```bash
npm install
```

```bash
npm run report
```

## Struktur

```
app/        index.html, style.css, app.js (UI), playfair.js (algoritma inti)
samples/    berkas plainteks, hasil enkripsi & dekripsi (diunduh dari aplikasi)
tests/      unit test (node:test)
tools/      build-report.mjs & report-template.mjs (screenshot + PDF)
laporan/    identitas.json, laporan.html, screenshots/, PDF
```
