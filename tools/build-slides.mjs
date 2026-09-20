/**
 * build-slides.mjs — Membuat presentasi 10 slide (laporan/Presentasi-K1-Playfair-Cipher.pptx)
 * dari BAB I–V laporan. Data anggota diambil dari laporan/identitas.json dan gambar dari
 * laporan/screenshots (jalankan `npm run report` lebih dulu agar screenshot terbaru).
 *
 * Jalankan: npm run slides
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import pptxgen from 'pptxgenjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const Playfair = require(path.join(ROOT, 'app/playfair.js'));
const id = JSON.parse(fs.readFileSync(path.join(ROOT, 'laporan/identitas.json'), 'utf8'));
const shot = (name) => path.join(ROOT, 'laporan/screenshots', `${name}.png`);
const OUT = path.join(ROOT, 'laporan/Presentasi-K1-Playfair-Cipher.pptx');

const C = { ink: '1D232A', muted: '66707A', accent: '0F6E66', soft: 'D9EFEC', paper: 'F4F2EC', dst: 'B4540A', line: 'E2DED3', white: 'FFFFFF' };
const FONT = 'Calibri';
const MONO = 'Consolas';

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
pptx.title = 'Implementasi Enkripsi Playfair Cipher';
pptx.company = id.kelompok;

const TOTAL = 10;
let slideNo = 0;

function base(bab, title) {
  slideNo += 1;
  const s = pptx.addSlide();
  s.background = { color: C.paper };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: C.accent }, line: { color: C.accent } });
  if (bab) s.addText(bab, { x: 0.6, y: 0.35, w: 8, h: 0.35, fontFace: FONT, fontSize: 13, bold: true, color: C.accent, charSpacing: 1 });
  s.addText(title, { x: 0.6, y: 0.68, w: 12.1, h: 0.75, fontFace: FONT, fontSize: 30, bold: true, color: C.ink });
  s.addText(`${id.kelompok} · Playfair Cipher`, { x: 0.6, y: 7.0, w: 8, h: 0.3, fontFace: FONT, fontSize: 10, color: C.muted });
  s.addText(`${slideNo} / ${TOTAL}`, { x: 11.7, y: 7.0, w: 1.0, h: 0.3, fontFace: FONT, fontSize: 10, color: C.muted, align: 'right' });
  return s;
}

function bullets(s, items, box) {
  s.addText(
    items.map((t) => ({ text: t, options: { bullet: { indent: 18 }, paraSpaceAfter: 8 } })),
    { fontFace: FONT, fontSize: 17, color: C.ink, valign: 'top', ...box }
  );
}

function card(s, x, y, w, h) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: C.white }, line: { color: C.line, width: 1 } });
}

function image(s, name, box) {
  card(s, box.x - 0.08, box.y - 0.08, box.w + 0.16, box.h + 0.16);
  s.addImage({ path: shot(name), ...box, sizing: { type: 'contain', w: box.w, h: box.h } });
}

function keySquare(s, grid, keyLetters, x, y, cell) {
  grid.forEach((row, r) =>
    row.forEach((ch, c) => {
      const isKey = keyLetters.includes(ch);
      s.addText(ch, {
        x: x + c * (cell + 0.06), y: y + r * (cell + 0.06), w: cell, h: cell,
        fontFace: MONO, fontSize: 20, bold: true, align: 'center', valign: 'middle',
        color: isKey ? C.white : C.ink, fill: { color: isKey ? C.accent : C.white }, line: { color: C.line, width: 1 },
      });
    })
  );
}

// 1. Judul
{
  slideNo += 1;
  const s = pptx.addSlide();
  s.background = { color: C.ink };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.25, h: 7.5, fill: { color: C.accent }, line: { color: C.accent } });
  s.addText('TUGAS K1 · ' + id.mataKuliah.toUpperCase(), { x: 0.9, y: 1.3, w: 8, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: '8FD3CC', charSpacing: 2 });
  s.addText('Implementasi Enkripsi\nPlayfair Cipher', { x: 0.9, y: 1.8, w: 7.5, h: 2.1, fontFace: FONT, fontSize: 44, bold: true, color: C.white });
  s.addText('Aplikasi web enkripsi & dekripsi berkas teks dengan bujursangkar kunci 5×5', { x: 0.9, y: 3.95, w: 7, h: 0.8, fontFace: FONT, fontSize: 18, color: 'B9C0C7' });
  s.addText(id.kelompok, { x: 0.9, y: 5.2, w: 6, h: 0.5, fontFace: FONT, fontSize: 22, bold: true, color: C.white });
  s.addText(id.institusi.join(' · ') + ' · ' + id.tahun, { x: 0.9, y: 5.7, w: 8, h: 0.8, fontFace: FONT, fontSize: 12, color: 'B9C0C7' });
  const sq = Playfair.buildKeySquare('ALNGESHPUB');
  sq.grid.forEach((row, r) =>
    row.forEach((ch, c) => {
      const isKey = sq.keyLetters.includes(ch);
      s.addText(ch, {
        x: 8.95 + c * 0.78, y: 1.75 + r * 0.78, w: 0.7, h: 0.7, fontFace: MONO, fontSize: 22, bold: true, align: 'center', valign: 'middle',
        color: isKey ? C.white : '8FD3CC', fill: { color: isKey ? C.accent : '2A333C' }, line: { color: '3A434D', width: 1 },
      });
    })
  );
}

// 2. Anggota & kontribusi
{
  const s = base('ANGGOTA TIM', 'Pembagian Kerja & Kontribusi');
  const members = id.anggota;
  const head = ['No', 'Nama', 'NIM', 'Bagian Kerja', 'Kontribusi'].map((t) => ({
    text: t, options: { bold: true, color: C.white, fill: { color: C.accent }, align: t === 'Bagian Kerja' || t === 'Nama' ? 'left' : 'center' },
  }));
  const isApp = (m) => /aplikasi/i.test(m.bagian);
  const rows = members.map((m, i) => [
    { text: String(i + 1), options: { align: 'center' } },
    { text: m.nama, options: { bold: true } },
    { text: m.nim, options: { align: 'center' } },
    { text: m.bagian, options: { color: isApp(m) ? C.accent : C.ink, bold: isApp(m) } },
    { text: m.kontribusi, options: { align: 'center', bold: true } },
  ]);
  s.addTable([head, ...rows], {
    x: 0.6, y: 1.55, w: 12.1, colW: [0.6, 3.5, 1.9, 4.9, 1.2],
    fontFace: FONT, fontSize: 11.5, color: C.ink, fill: { color: C.white },
    border: { type: 'solid', pt: 0.75, color: C.line }, rowH: 0.43, valign: 'middle', margin: 0.05,
  });
}

// 3. BAB I – Pendahuluan
{
  const s = base('BAB I · PENDAHULUAN', 'Latar Belakang & Tujuan');
  card(s, 0.6, 1.6, 6.0, 5.1);
  s.addText('Latar Belakang', { x: 0.85, y: 1.75, w: 5.5, h: 0.45, fontFace: FONT, fontSize: 19, bold: true, color: C.accent });
  bullets(s, [
    'Kriptografi klasik adalah dasar konsep dan algoritma kriptografi modern.',
    'Playfair cipher (Wheatstone, 1854) mengenkripsi pasangan huruf (bigram), bukan huruf tunggal.',
    'Frekuensi huruf cipherteks lebih datar sehingga analisis frekuensi huruf tunggal lebih sulit.',
  ], { x: 0.85, y: 2.25, w: 5.5, h: 4.3 });
  card(s, 6.8, 1.6, 5.9, 5.1);
  s.addText('Tujuan', { x: 7.05, y: 1.75, w: 5.4, h: 0.45, fontFace: FONT, fontSize: 19, bold: true, color: C.accent });
  bullets(s, [
    'Mengimplementasikan Playfair cipher sesuai materi kuliah Kriptografi Klasik.',
    'Membangun aplikasi dengan masukan berkas teks & kunci, keluaran berkas terenkripsi.',
    'Menguji kebenaran terhadap contoh materi kuliah dan pengujian otomatis.',
  ], { x: 7.05, y: 2.25, w: 5.4, h: 4.3 });
}

// 4. BAB I – Deskripsi aplikasi
{
  const s = base('BAB I · PENDAHULUAN', 'Deskripsi Aplikasi');
  s.addText('Aplikasi web statis yang mengenkripsi dan mendekripsi berkas teks dengan Playfair cipher. Seluruh proses berjalan di peramban, tanpa server.', {
    x: 0.6, y: 1.5, w: 6.2, h: 1.0, fontFace: FONT, fontSize: 16, color: C.ink, valign: 'top',
  });
  const rows = [
    ['Masukan', 'Berkas .txt atau teks ketikan + kata/frasa kunci'],
    ['Keluaran', 'Cipherteks/plainteks: salin atau unduh .txt'],
    ['Mode', 'Enkripsi dan dekripsi'],
    ['Fitur', 'Bujursangkar langsung, proses per bigram, histogram frekuensi, contoh slide, validasi'],
    ['Teknologi', 'HTML, CSS, JavaScript tanpa pustaka eksternal'],
  ].map(([a, b]) => [{ text: a, options: { bold: true, color: C.accent } }, { text: b }]);
  s.addTable(rows, {
    x: 0.6, y: 2.6, w: 6.2, colW: [1.5, 4.7], fontFace: FONT, fontSize: 13.5, color: C.ink, fill: { color: C.white },
    border: { type: 'solid', pt: 0.75, color: C.line }, rowH: 0.62, valign: 'middle', margin: 0.08,
  });
  image(s, '01-tampilan-awal', { x: 7.15, y: 1.55, w: 5.55, h: 3.67 });
  s.addText(id.deploy.replace('https://', ''), { x: 7.15, y: 5.45, w: 5.55, h: 0.4, fontFace: MONO, fontSize: 11, bold: true, color: C.accent, align: 'center', hyperlink: { url: id.deploy } });
}

// 5. BAB II – Dasar teori
{
  const s = base('BAB II · DASAR TEORI', 'Aturan Playfair Cipher');
  const sq = Playfair.buildKeySquare('ALNGESHPUB');
  card(s, 0.6, 1.6, 4.1, 5.1);
  s.addText('Bujursangkar kunci "ALNGESHPUB"', { x: 0.75, y: 1.72, w: 3.8, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: C.ink, align: 'center' });
  keySquare(s, sq.grid, sq.keyLetters, 0.95, 2.25, 0.62);
  s.addText('25 huruf tanpa J · 25! kemungkinan kunci', { x: 0.75, y: 5.8, w: 3.8, h: 0.6, fontFace: FONT, fontSize: 12, color: C.muted, align: 'center' });

  const rules = [
    ['Pra-pemrosesan', 'J → I, tulis per bigram, huruf kembar disisipi X, jumlah ganjil ditambah X'],
    ['Baris sama', 'Geser ke kanan (dekripsi: kiri), siklik. Contoh DI → FK'],
    ['Kolom sama', 'Geser ke bawah (dekripsi: atas), siklik. Contoh NQ → PX'],
    ['Persegi panjang', 'Ambil sudut pada baris masing-masing huruf. Contoh HZ → BW'],
  ];
  rules.forEach(([t, d], i) => {
    const y = 1.6 + i * 1.3;
    card(s, 4.95, y, 7.75, 1.15);
    s.addText(t, { x: 5.2, y: y + 0.1, w: 7.3, h: 0.4, fontFace: FONT, fontSize: 17, bold: true, color: C.accent });
    s.addText(d, { x: 5.2, y: y + 0.5, w: 7.3, h: 0.55, fontFace: FONT, fontSize: 14.5, color: C.ink });
  });
}

// 6. BAB III – Alur kerja
{
  const s = base('BAB III · PERANCANGAN', 'Alur Kerja Aplikasi');
  const steps = [
    ['Pilih mode', 'Enkripsi / Dekripsi'],
    ['Ketik kunci', 'Bujursangkar 5×5 terbentuk langsung'],
    ['Pilih berkas', '.txt dibaca FileReader'],
    ['Proses', 'Validasi masukan'],
    ['Pra-pemrosesan', 'Normalisasi & bigram'],
    ['Transformasi', 'Aturan baris/kolom/persegi'],
    ['Hasil', 'Tampilkan, salin, unduh .txt'],
  ];
  const w = 1.58, gap = 0.17, y = 2.2;
  steps.forEach(([t, d], i) => {
    const x = 0.6 + i * (w + gap);
    s.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 2.0, rectRadius: 0.08, fill: { color: i === steps.length - 1 ? C.accent : C.white }, line: { color: C.accent, width: 1.25 } });
    s.addText(String(i + 1), { x: x + 0.55, y: y + 0.15, w: 0.48, h: 0.48, fontFace: FONT, fontSize: 15, bold: true, align: 'center', valign: 'middle', color: i === steps.length - 1 ? C.accent : C.white, fill: { color: i === steps.length - 1 ? C.white : C.accent }, shape: pptx.ShapeType.ellipse });
    s.addText(t, { x: x + 0.05, y: y + 0.75, w: w - 0.1, h: 0.45, fontFace: FONT, fontSize: 14, bold: true, align: 'center', color: i === steps.length - 1 ? C.white : C.ink });
    s.addText(d, { x: x + 0.08, y: y + 1.2, w: w - 0.16, h: 0.7, fontFace: FONT, fontSize: 11.5, align: 'center', valign: 'top', color: i === steps.length - 1 ? C.white : C.muted });
    if (i < steps.length - 1) s.addText('›', { x: x + w - 0.02, y: y + 0.7, w: gap + 0.04, h: 0.5, fontFace: FONT, fontSize: 22, bold: true, color: C.accent, align: 'center' });
  });
  card(s, 0.6, 4.65, 12.1, 1.95);
  bullets(s, [
    'Kunci diketik → huruf unik kunci ditulis lebih dulu, J diganti I, lalu sisa alfabet.',
    'Teks dinormalisasi (huruf kapital, non-huruf dibuang), dipecah per bigram, lalu tiap bigram diganti sesuai aturannya.',
    'Hasil dapat langsung dipakai sebagai masukan mode sebaliknya untuk memeriksa dekripsi.',
  ], { x: 0.85, y: 4.8, w: 11.6, h: 1.7 });
}

// 7. BAB III – Implementasi
{
  const s = base('BAB III · IMPLEMENTASI', 'Struktur Kode');
  const files = [
    ['app/playfair.js', 'Algoritma inti: normalize, buildKeySquare, toBigrams, transformPair, encrypt, decrypt'],
    ['app/app.js', 'Logika antarmuka: baca berkas, proses, tampilkan langkah, salin & unduh'],
    ['app/index.html + style.css', 'Tampilan halaman: kartu masukan, hasil, tabel, histogram, bujursangkar'],
    ['tests/playfair.test.js', 'Unit test dengan node:test, termasuk contoh dari slide'],
  ];
  files.forEach(([f, d], i) => {
    const y = 1.6 + i * 1.02;
    card(s, 0.6, y, 6.3, 0.88);
    s.addText(f, { x: 0.8, y: y + 0.06, w: 5.9, h: 0.36, fontFace: MONO, fontSize: 14, bold: true, color: C.accent });
    s.addText(d, { x: 0.8, y: y + 0.42, w: 5.9, h: 0.4, fontFace: FONT, fontSize: 12, color: C.ink });
  });
  s.addText('Satu fungsi untuk dua arah: pergeseran +1 saat enkripsi dan +4 (≡ −1 mod 5) saat dekripsi.', { x: 0.6, y: 5.8, w: 6.3, h: 0.8, fontFace: FONT, fontSize: 13, italic: true, color: C.muted });
  card(s, 7.15, 1.6, 5.55, 5.0);
  s.addText([
    'function transformPair(pair, square, dir) {',
    '  const shift = dir === "decrypt" ? 4 : 1;',
    '  const p1 = square.position[pair[0]];',
    '  const p2 = square.position[pair[1]];',
    '  if (p1.row === p2.row)      // baris sama',
    '    → geser kolom (c + shift) mod 5',
    '  else if (p1.col === p2.col) // kolom sama',
    '    → geser baris (r + shift) mod 5',
    '  else                        // persegi',
    '    → (r1, c2) dan (r2, c1)',
    '}',
  ].join('\n'), { x: 7.35, y: 1.8, w: 5.2, h: 4.6, fontFace: MONO, fontSize: 12.5, color: C.ink, valign: 'top' });
}

// 8. BAB IV – Navigasi
{
  const s = base('BAB IV · HASIL', 'Navigasi Aplikasi');
  const shots = [
    ['02-input-enkripsi', '1 · Masukan', 'Pilih mode, ketik kunci, unggah berkas .txt'],
    ['03-hasil-enkripsi', '2 · Hasil', 'Cipherteks, statistik, Salin & Unduh .txt'],
    ['05-proses-bigram', '3–4 · Proses', 'Bigram & tabel aturan, disorot di bujursangkar'],
    ['08-hasil-dekripsi', 'Dekripsi', 'Plainteks kembali + hasil mentah sebelum X dibuang'],
  ];
  shots.forEach(([name, t, d], i) => {
    const x = 0.6 + (i % 2) * 6.15;
    const y = 1.55 + Math.floor(i / 2) * 2.72;
    image(s, name, { x: x + 0.08, y: y + 0.08, w: 3.2, h: 2.12 });
    s.addText(t, { x: x + 3.5, y: y + 0.3, w: 2.45, h: 0.45, fontFace: FONT, fontSize: 17, bold: true, color: C.accent });
    s.addText(d, { x: x + 3.5, y: y + 0.8, w: 2.45, h: 1.3, fontFace: FONT, fontSize: 13, color: C.ink, valign: 'top' });
  });
}

// 9. BAB IV – Pengujian
{
  const s = base('BAB IV · PENGUJIAN', 'Verifikasi dengan Contoh Materi Kuliah');
  const res = Playfair.encrypt('temui ibu nanti malam', 'ALNGESHPUB');
  const expected = 'ZB RS FY KU PG LG RK VS NL QV'.split(' ');
  const head = ['Bigram', 'Hasil aplikasi', 'Slide', ''].map((t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.accent }, align: 'center' } }));
  const rows = res.steps.map((st, i) => [
    { text: st.input, options: { fontFace: MONO, bold: true } },
    { text: st.output, options: { fontFace: MONO } },
    { text: expected[i], options: { fontFace: MONO } },
    { text: st.output === expected[i] ? '✓' : '✗', options: { color: st.output === expected[i] ? '17692F' : 'B42318', bold: true } },
  ]);
  s.addTable([head, ...rows], {
    x: 0.6, y: 1.55, w: 5.2, colW: [1.2, 1.6, 1.4, 1.0], fontFace: FONT, fontSize: 13, color: C.ink, fill: { color: C.white },
    border: { type: 'solid', pt: 0.75, color: C.line }, rowH: 0.43, align: 'center', valign: 'middle',
  });
  const allMatch = res.steps.every((st, i) => st.output === expected[i]);
  const stats = [
    [allMatch ? '10/10' : 'Beda', 'bigram contoh slide sama persis'],
    ['10/10', 'unit test lulus (npm test)'],
    ['500', 'uji acak enkripsi → dekripsi kembali'],
  ];
  stats.forEach(([v, l], i) => {
    const y = 1.55 + i * 1.25;
    card(s, 6.2, y, 6.5, 1.08);
    s.addText(v, { x: 6.4, y: y + 0.1, w: 1.9, h: 0.88, fontFace: FONT, fontSize: 30, bold: true, color: C.accent, valign: 'middle' });
    s.addText(l, { x: 8.3, y: y + 0.1, w: 4.2, h: 0.88, fontFace: FONT, fontSize: 16, color: C.ink, valign: 'middle' });
  });
  s.addText('Plainteks "temui ibu nanti malam" → ZB RS FY KU PG LG RK VS NL QV. Masukan tidak valid (misalnya cipherteks ganjil) ditolak dengan pesan kesalahan.', {
    x: 6.2, y: 5.4, w: 6.5, h: 1.2, fontFace: FONT, fontSize: 13.5, color: C.muted, valign: 'top',
  });
}

// 10. BAB V – Kesimpulan & kode sumber
{
  const s = base('BAB V · KESIMPULAN', 'Kesimpulan & Kode Sumber');
  card(s, 0.6, 1.6, 7.3, 5.05);
  bullets(s, [
    'Playfair cipher berhasil diimplementasikan sebagai aplikasi web: masukan berkas teks & kunci, keluaran berkas terenkripsi.',
    'Hasil sesuai materi kuliah dan lolos seluruh unit test; dekripsi mengembalikan plainteks.',
    'Frekuensi huruf tunggal tersamarkan, tetapi karena blok hanya 2 huruf, Playfair tetap rentan analisis frekuensi bigram, sehingga tidak layak untuk pengamanan modern.',
  ], { x: 0.85, y: 1.8, w: 6.85, h: 4.7 });
  const links = [['Kode aplikasi (GitHub)', id.githubWeb], ['Aplikasi (Vercel)', id.deploy]];
  links.forEach(([t, url], i) => {
    const y = 1.6 + i * 1.6;
    s.addShape(pptx.ShapeType.roundRect, { x: 8.15, y, w: 4.55, h: 1.4, rectRadius: 0.08, fill: { color: i === 0 ? C.ink : C.accent }, line: { color: i === 0 ? C.ink : C.accent } });
    s.addText(t, { x: 8.35, y: y + 0.15, w: 4.15, h: 0.45, fontFace: FONT, fontSize: 15, bold: true, color: 'B9E3DE' });
    s.addText(url.replace('https://', ''), { x: 8.35, y: y + 0.62, w: 4.15, h: 0.7, fontFace: MONO, fontSize: 11, bold: true, color: C.white, hyperlink: { url } });
  });
  s.addText('Terima kasih', { x: 8.15, y: 5.1, w: 4.55, h: 0.8, fontFace: FONT, fontSize: 30, bold: true, color: C.ink, align: 'center' });
  s.addText('Sesi tanya jawab', { x: 8.15, y: 5.85, w: 4.55, h: 0.45, fontFace: FONT, fontSize: 15, color: C.muted, align: 'center' });
}

await pptx.writeFile({ fileName: OUT });
console.log(`✓ Selesai: ${path.relative(ROOT, OUT)} (${slideNo} slide)`);
