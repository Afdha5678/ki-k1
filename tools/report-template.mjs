/** report-template.mjs — Templat HTML laporan Tugas K1 (dicetak ke PDF oleh build-report.mjs). */

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const RULE = { baris: 'Baris sama', kolom: 'Kolom sama', persegi: 'Persegi panjang' };
const NOTE = { sisip: 'sisipan (huruf kembar)', ganjil: 'tambahan (jumlah ganjil)' };
const num = (x, d = 4) => x.toFixed(d).replace('.', ',');
const pos = (ps) => ps.map((p) => `(${p.row + 1},${p.col + 1})`).join(' ');

function squareTable(grid, keyLetters = '') {
  const keySet = new Set(keyLetters);
  return `<table class="square">${grid
    .map((r) => `<tr>${r.map((ch) => `<td class="${keySet.has(ch) ? 'k' : ''}">${ch}</td>`).join('')}</tr>`)
    .join('')}</table>`;
}

export function renderReport(d) {
  const { identitas: id, shots, slide, sample, tests, code } = d;
  let figNo = 0;
  let tabNo = 0;
  const fig = (key, note = '') => {
    const s = shots[key];
    figNo += 1;
    return `<figure><img src="${s.file}" alt="${esc(s.caption)}"><figcaption>Gambar ${figNo}. ${esc(s.caption)}</figcaption>${
      note ? `<p class="fignote">${note}</p>` : ''
    }</figure>`;
  };
  const tcap = (text) => {
    tabNo += 1;
    return `<p class="tcap">Tabel ${tabNo}. ${text}</p>`;
  };

  const icLower = sample.ic.cipher < sample.ic.plain;
  const members = id.anggota;
  const timAplikasi = members.filter((m) => /aplikasi/i.test(m.bagian)).map((m) => esc(m.nama));
  const timLaporan = members.filter((m) => !/aplikasi/i.test(m.bagian)).map((m) => esc(m.nama));

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>Laporan Tugas K1: Implementasi Playfair Cipher</title>
<style>
  @page { size: A4; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 11.5pt/1.55 "Times New Roman", Times, serif; color: #111; text-align: justify; hyphens: auto; }
  h1, h2, h3 { font-family: "Times New Roman", Times, serif; text-align: left; break-after: avoid; }
  h1 { font-size: 15pt; text-align: center; margin: 0 0 18px; letter-spacing: .3px; }
  h1 small { display: block; font-size: 13pt; font-weight: 700; }
  h2 { font-size: 12.5pt; margin: 20px 0 6px; }
  h3 { font-size: 11.5pt; margin: 14px 0 4px; }
  p { margin: 0 0 8px; }
  ul, ol { margin: 0 0 8px; padding-left: 22px; }
  li { margin-bottom: 2px; }
  .chapter { break-before: page; }
  section.cover + section.chapter { break-before: auto; }
  code, pre, .mono { font-family: Menlo, Consolas, "Courier New", monospace; }
  code { font-size: 9.5pt; background: #f2f2f2; padding: 0 3px; border-radius: 2px; }
  pre { font-size: 8.4pt; line-height: 1.4; background: #f6f6f4; border: 1px solid #ddd; border-radius: 4px; padding: 8px 10px; white-space: pre-wrap; word-break: break-word; text-align: left; margin: 4px 0 10px; }
  pre.cipher { font-size: 9.5pt; letter-spacing: .4px; }
  table { border-collapse: collapse; margin: 4px auto 12px; font-size: 10pt; text-align: left; break-inside: avoid; }
  th, td { border: 1px solid #999; padding: 3px 8px; vertical-align: top; }
  th { background: #eee; }
  table.full { width: 100%; }
  td.c, th.c { text-align: center; }
  .ok { color: #17692f; font-weight: 700; }
  .bad { color: #b42318; font-weight: 700; }
  .tcap { text-align: center; font-size: 10pt; margin: 10px 0 2px; font-weight: 700; break-after: avoid; }
  figure { margin: 10px 0 14px; text-align: center; break-inside: avoid; }
  figure img { max-width: 100%; border: 1px solid #bbb; }
  figcaption { font-size: 10pt; margin-top: 4px; font-weight: 700; }
  .fignote { font-size: 10pt; text-align: justify; margin-top: 4px; }
  table.square { margin: 6px auto 4px; }
  table.square td { width: 30px; height: 30px; text-align: center; vertical-align: middle; font: 700 12pt Menlo, Consolas, monospace; padding: 0; }
  table.square td.k { background: #e6ecf6; }
  .squares { display: flex; justify-content: center; gap: 50px; break-inside: avoid; }
  .squares div { text-align: center; font-size: 10pt; }
  .flow { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 4px; margin: 8px 0 12px; font-size: 9.5pt; text-align: center; break-inside: avoid; }
  .flow span.box { border: 1px solid #555; border-radius: 4px; padding: 4px 7px; background: #f6f6f4; }
  .flow span.ar { color: #555; }
  .box-note { break-inside: avoid; border-left: 3px solid #0f6e66; background: #f3f8f7; padding: 6px 10px; margin: 6px 0 10px; font-size: 10.5pt; }

  /* Halaman 1 */
  .cover { break-after: page; text-align: center; }
  .cover .title { font-size: 16pt; font-weight: 700; line-height: 1.35; margin-top: 4mm; }
  .cover .subtitle { font-size: 12.5pt; margin: 4px 0 12px; }
  .cover .members-title { text-align: center; font-size: 13pt; margin: 14px 0 2px; }
  .cover .members-note { text-align: center; font-size: 10pt; margin: 2px 0 6px; }
  .cover table.members { font-size: 10.5pt; }
  .cover table.members td, .cover table.members th { padding: 4px 7px; vertical-align: middle; }
  .cover .inst { font-size: 12pt; font-weight: 700; line-height: 1.45; margin-top: 14mm; }
  .nav-table td:first-child { white-space: nowrap; }
  a { color: #0b4f8a; }
</style>
</head>
<body>

<!-- ======================= HALAMAN 1: ANGGOTA ======================= -->
<section class="cover">
  <div class="title">LAPORAN TUGAS K1<br>IMPLEMENTASI ENKRIPSI PLAYFAIR CIPHER</div>
  <div class="subtitle">${esc(id.mataKuliah)} · ${esc(id.kelompok)}</div>
  <h2 class="members-title">Daftar Anggota Tim dan Pembagian Kerja</h2>
  <p class="members-note">Beban kerja dibagi rata kepada seluruh anggota.</p>
  <table class="full members">
    <tr><th class="c" style="width:6%">No</th><th style="width:27%">Nama</th><th style="width:19%">NIM</th><th>Bagian Kerja</th><th class="c" style="width:15%">Kontribusi</th></tr>
    ${members
      .map((m, i) => `<tr><td class="c">${i + 1}</td><td><b>${esc(m.nama)}</b></td><td>${esc(m.nim)}</td><td>${esc(m.bagian)}</td><td class="c">${esc(m.kontribusi)}</td></tr>`)
      .join('')}
    <tr><th colspan="4" style="text-align:right">Total</th><th class="c">100%</th></tr>
  </table>
  <p class="members-note">Pengembangan aplikasi: ${timAplikasi.join(', ')}.<br>Penyusunan laporan: ${timLaporan.join(', ')}.</p>
  <div class="inst">${id.institusi.map(esc).join('<br>')}<br>${esc(id.tahun)}</div>
</section>

<!-- ======================= BAB I ======================= -->
<section class="chapter">
<h1>BAB I<small>PENDAHULUAN</small></h1>

<h2>1.1 Latar Belakang</h2>
<p>Algoritma kriptografi klasik adalah algoritma berbasis karakter yang dahulu dikerjakan hanya dengan pena dan kertas. Meskipun sudah tidak aman untuk kebutuhan modern, algoritma klasik tetap penting dipelajari karena menjadi dasar pemahaman konsep kriptografi, merupakan fondasi algoritma kriptografi modern, dan memperlihatkan kelemahan-kelemahan yang harus dihindari dalam perancangan sistem cipher.</p>
<p>Salah satu algoritma klasik yang menarik adalah <i>Playfair cipher</i>, yaitu cipher substitusi poligram yang mengenkripsi pasangan huruf (bigram), bukan huruf tunggal. Dengan mengenkripsi bigram, distribusi frekuensi huruf pada cipherteks menjadi lebih datar sehingga analisis frekuensi huruf tunggal menjadi jauh lebih sulit dibandingkan cipher abjad-tunggal seperti Caesar cipher.</p>
<p>Pada tugas K1 mata kuliah Keamanan Informasi ini dibuat sebuah aplikasi web yang mengimplementasikan enkripsi Playfair cipher terhadap berkas teks, beserta laporan implementasinya.</p>

<h2>1.2 Tujuan</h2>
<ol>
  <li>Mengimplementasikan algoritma Playfair cipher sesuai materi kuliah Kriptografi Klasik.</li>
  <li>Membangun aplikasi yang menerima berkas teks asli dan kata/frasa kunci, lalu menghasilkan berkas/teks terenkripsi.</li>
  <li>Menguji kebenaran implementasi terhadap contoh pada materi kuliah serta melalui pengujian otomatis.</li>
</ol>

<h2>1.3 Spesifikasi Tugas</h2>
${tcap('Spesifikasi aplikasi dan pemenuhannya')}
<table class="full">
  <tr><th style="width:18%">Komponen</th><th style="width:34%">Spesifikasi</th><th>Pemenuhan pada aplikasi</th></tr>
  <tr><td>Masukan</td><td>Berkas teks asli</td><td>Unggah berkas <code>.txt</code> (klik atau <i>drag &amp; drop</i>); isi berkas tampil dan dapat disunting.</td></tr>
  <tr><td>Kunci</td><td>Kata/frasa kunci</td><td>Kolom kunci; bujursangkar 5×5 diperbarui secara langsung saat kunci diketik.</td></tr>
  <tr><td>Keluaran</td><td>Berkas/teks terenkripsi</td><td>Cipherteks ditampilkan, dapat disalin, dan diunduh sebagai berkas <code>*-terenkripsi.txt</code>.</td></tr>
  <tr><td>Keluaran</td><td>Aplikasi program</td><td>Aplikasi web statis (HTML, CSS, JavaScript) pada folder <code>app/</code>.</td></tr>
  <tr><td>Keluaran</td><td>Laporan PDF dengan screenshot</td><td>Dokumen ini (BAB IV memuat screenshot program).</td></tr>
</table>

<h2>1.4 Ruang Lingkup</h2>
<ul>
  <li>Alfabet yang digunakan adalah 25 huruf Latin (A–Z tanpa J); huruf J diganti I.</li>
  <li>Karakter selain huruf (spasi, angka, tanda baca) dibuang pada tahap pra-pemrosesan, sebagaimana Playfair klasik.</li>
  <li>Selain enkripsi, aplikasi juga menyediakan dekripsi untuk memverifikasi bahwa cipherteks dapat dikembalikan.</li>
</ul>

<h2>1.5 Deskripsi Aplikasi</h2>
<p><b>Playfair Cipher</b> adalah aplikasi web yang dibuat Kelompok 3 untuk mengenkripsi dan mendekripsi berkas teks menggunakan algoritma Playfair cipher. Pengguna cukup memilih berkas <code>.txt</code> berisi teks asli dan mengetik kata/frasa kunci. Aplikasi lalu menyusun bujursangkar kunci 5×5, memproses teks per bigram, dan menghasilkan cipherteks yang dapat disalin atau diunduh sebagai berkas teks.</p>
<p>Aplikasi berjalan sepenuhnya di peramban tanpa server, sehingga isi berkas tidak dikirim ke mana pun. Selain hasil akhir, aplikasi menampilkan langkah-langkah prosesnya (normalisasi, pembentukan bigram, aturan yang dipakai tiap bigram, dan posisi huruf pada bujursangkar) serta grafik frekuensi huruf, sehingga cara kerja Playfair cipher dapat dipelajari secara visual. Aplikasi dapat diakses di <a href="${esc(id.deploy)}">${esc(id.deploy)}</a>.</p>
${tcap('Ringkasan aplikasi')}
<table class="full">
  <tr><th style="width:26%">Aspek</th><th>Keterangan</th></tr>
  <tr><td>Jenis</td><td>Aplikasi web statis (HTML, CSS, JavaScript), dapat dibuka di Chrome, Edge, Firefox, atau Safari</td></tr>
  <tr><td>Masukan</td><td>Berkas teks asli (<code>.txt</code>) atau teks yang diketik, serta kata/frasa kunci</td></tr>
  <tr><td>Keluaran</td><td>Cipherteks/plainteks yang dapat disalin dan diunduh sebagai <code>.txt</code></td></tr>
  <tr><td>Mode</td><td>Enkripsi dan dekripsi</td></tr>
  <tr><td>Fitur pendukung</td><td>Bujursangkar kunci langsung, rincian proses per bigram, histogram frekuensi, contoh dari materi kuliah, validasi masukan</td></tr>
</table>
</section>

<!-- ======================= BAB II ======================= -->
<section class="chapter">
<h1>BAB II<small>DASAR TEORI</small></h1>

<h2>2.1 Cipher Substitusi Poligram</h2>
<p>Cipher substitusi poligram mensubstitusi blok huruf plainteks dengan blok huruf cipherteks, misalnya <code>AS</code> diganti <code>RT</code>. Jika panjang blok dua huruf disebut <i>digram</i> (bigram). Tujuannya adalah membuat distribusi kemunculan poligram menjadi datar sehingga menyulitkan analisis frekuensi.</p>

<h2>2.2 Playfair Cipher</h2>
<p>Playfair cipher ditemukan oleh Sir Charles Wheatstone dan dipromosikan oleh Baron Lyon Playfair pada tahun 1854. Kunci kriptografinya adalah 25 huruf yang disusun dalam bujursangkar 5×5 dengan menghilangkan huruf J dari abjad, sehingga jumlah kemungkinan kunci adalah 25! = 15.511.210.043.330.985.984.000.000.</p>

<h3>2.2.1 Pembentukan Bujursangkar Kunci</h3>
<p>Huruf-huruf unik dari kata/frasa kunci ditulis terlebih dahulu dari kiri ke kanan dan dari atas ke bawah, kemudian dilanjutkan dengan huruf alfabet yang belum muncul. Tabel ${tabNo + 1} memperlihatkan bujursangkar yang digunakan pada contoh materi kuliah (huruf dari kunci diberi latar biru).</p>
${tcap('Bujursangkar kunci pada contoh materi kuliah (kunci ALNGESHPUB)')}
${squareTable(slide.grid, slide.keyLetters)}

<h3>2.2.2 Pra-pemrosesan Pesan</h3>
<ol>
  <li>Ganti huruf J (bila ada) dengan I.</li>
  <li>Tulis pesan dalam pasangan huruf (bigram).</li>
  <li>Jangan sampai ada pasangan huruf yang sama; jika ada, sisipkan X di tengahnya.</li>
  <li>Jika jumlah huruf ganjil, tambahkan huruf X di akhir.</li>
</ol>
<p>Contoh: plainteks <code>temui ibu nanti malam</code> menjadi bigram <code>TE MU IX IB UN AN TI MA LA MX</code>.</p>

<h3>2.2.3 Algoritma Enkripsi</h3>
<p>Misalkan huruf pertama bigram berada pada baris <i>r</i><sub>1</sub> kolom <i>c</i><sub>1</sub> dan huruf kedua pada baris <i>r</i><sub>2</sub> kolom <i>c</i><sub>2</sub> (indeks 0–4):</p>
<ol>
  <li><b>Baris sama</b> (<i>r</i><sub>1</sub> = <i>r</i><sub>2</sub>): tiap huruf diganti huruf di kanannya secara siklik, yaitu (<i>r</i>, (<i>c</i> + 1) mod 5).</li>
  <li><b>Kolom sama</b> (<i>c</i><sub>1</sub> = <i>c</i><sub>2</sub>): tiap huruf diganti huruf di bawahnya secara siklik, yaitu ((<i>r</i> + 1) mod 5, <i>c</i>).</li>
  <li><b>Persegi panjang</b>: huruf pertama diganti huruf pada perpotongan baris huruf pertama dan kolom huruf kedua (<i>r</i><sub>1</sub>, <i>c</i><sub>2</sub>); huruf kedua diganti huruf pada titik sudut keempat (<i>r</i><sub>2</sub>, <i>c</i><sub>1</sub>).</li>
</ol>

<h3>2.2.4 Algoritma Dekripsi</h3>
<p>Dekripsi merupakan kebalikan enkripsi: pada baris yang sama huruf diganti huruf di kirinya, ((<i>c</i> + 4) mod 5); pada kolom yang sama huruf diganti huruf di atasnya, ((<i>r</i> + 4) mod 5); aturan persegi panjang tetap sama. Terakhir, huruf X yang tidak mengandung makna (sisipan) dibuang.</p>

<h2>2.3 Keamanan Playfair Cipher</h2>
<p>Terdapat 26 × 26 = 676 bigram sehingga identifikasi bigram individual lebih sukar daripada huruf tunggal. Namun ukuran poligram hanya dua huruf, sehingga Playfair cipher tetap tidak aman: dengan tabel frekuensi pasangan huruf (misalnya TH dan HE dalam bahasa Inggris) dan cipherteks yang cukup banyak, cipher ini dapat dipecahkan melalui analisis frekuensi bigram.</p>
</section>

<!-- ======================= BAB III ======================= -->
<section class="chapter">
<h1>BAB III<small>PERANCANGAN DAN IMPLEMENTASI</small></h1>

<h2>3.1 Lingkungan dan Teknologi</h2>
<ul>
  <li><b>Jenis aplikasi:</b> aplikasi web statis; seluruh proses berjalan di peramban tanpa server dan tanpa koneksi internet.</li>
  <li><b>Bahasa:</b> HTML5, CSS3, dan JavaScript (ECMAScript 2020) tanpa pustaka eksternal.</li>
  <li><b>Pembacaan berkas:</b> <code>FileReader API</code> (UTF-8); <b>penyimpanan hasil:</b> <code>Blob</code> + tautan unduhan.</li>
  <li><b>Pengujian:</b> Node.js ${esc(tests.node)} dengan modul bawaan <code>node:test</code>; laporan dan screenshot dibuat otomatis dengan Chrome headless (puppeteer-core).</li>
</ul>

<h2>3.2 Struktur Proyek</h2>
<pre>ki-k1/
├── app/
│   ├── index.html        halaman antarmuka
│   ├── style.css         tampilan
│   ├── playfair.js       modul inti algoritma Playfair (dipakai browser &amp; Node.js)
│   └── app.js            logika antarmuka: baca berkas, proses, tampilkan, unduh
├── samples/
│   ├── plainteks.txt                 berkas teks asli contoh
│   ├── plainteks-terenkripsi.txt     berkas hasil enkripsi (diunduh dari aplikasi)
│   └── plainteks-terdekripsi.txt     berkas hasil dekripsi (diunduh dari aplikasi)
├── tests/playfair.test.js  unit test
├── tools/                  skrip pembuat laporan PDF
└── laporan/                laporan HTML/PDF dan screenshot</pre>

<h2>3.3 Alur Kerja Aplikasi</h2>
<div class="flow">
  <span class="box">Buka<br>aplikasi</span><span class="ar">→</span>
  <span class="box">Pilih mode<br>(Enkripsi/Dekripsi)</span><span class="ar">→</span>
  <span class="box">Ketik kunci →<br>bujursangkar 5×5</span><span class="ar">→</span>
  <span class="box">Pilih berkas<br>.txt</span><span class="ar">→</span>
  <span class="box">Klik proses<br>&amp; validasi</span><span class="ar">→</span>
  <span class="box">Normalisasi &amp;<br>bentuk bigram</span><span class="ar">→</span>
  <span class="box">Transformasi<br>tiap bigram</span><span class="ar">→</span>
  <span class="box">Tampilkan, salin,<br>unduh hasil</span>
</div>
<ol>
  <li><b>Membuka aplikasi.</b> Pengguna membuka <code>app/index.html</code> atau alamat Vercel. Halaman berisi panel masukan di kiri dan bujursangkar kunci di kanan.</li>
  <li><b>Memilih mode.</b> Tombol <i>Enkripsi</i> atau <i>Dekripsi</i> menentukan proses yang dijalankan dan label berkas masukan.</li>
  <li><b>Memasukkan kunci.</b> Setiap huruf yang diketik langsung memperbarui bujursangkar 5×5: huruf unik kunci ditulis lebih dulu, J diganti I, lalu sisa alfabet.</li>
  <li><b>Memilih berkas teks.</b> Berkas <code>.txt</code> dipilih atau diseret ke area unggah, lalu dibaca oleh <code>FileReader</code> dan isinya ditampilkan di kolom teks.</li>
  <li><b>Memproses.</b> Tombol proses (atau Ctrl/⌘ + Enter) memvalidasi masukan. Kunci kosong, teks kosong, atau cipherteks tidak valid ditolak dengan pesan kesalahan.</li>
  <li><b>Pra-pemrosesan.</b> Untuk enkripsi, teks dinormalisasi (huruf kapital, J → I, karakter non-huruf dibuang) lalu dipecah menjadi bigram dengan sisipan X. Untuk dekripsi, cipherteks dipecah per dua huruf.</li>
  <li><b>Transformasi.</b> Setiap bigram diproses dengan aturan baris sama, kolom sama, atau persegi panjang.</li>
  <li><b>Menampilkan hasil.</b> Hasil, statistik, daftar bigram, tabel langkah, dan histogram frekuensi ditampilkan. Pengguna dapat menyalin, mengunduh <code>.txt</code>, atau langsung memakai hasil sebagai masukan mode sebaliknya.</li>
</ol>
<p>Secara teknis, modul inti <code>playfair.js</code> dipisahkan dari antarmuka (<code>app.js</code>) sehingga fungsi yang sama dapat diuji langsung melalui Node.js. Setiap fungsi enkripsi/dekripsi mengembalikan hasil akhir sekaligus rincian langkah per bigram (posisi asal, aturan, posisi hasil) yang ditampilkan pada antarmuka.</p>

<h2>3.4 Implementasi Modul Inti</h2>
<h3>3.4.1 Normalisasi dan Bujursangkar Kunci</h3>
<p>Fungsi <code>normalize</code> mengubah teks menjadi huruf kapital, mengganti J dengan I, dan membuang karakter non-huruf. Fungsi <code>buildKeySquare</code> menggabungkan huruf kunci dengan alfabet 25 huruf, mengambil huruf unik, lalu menyusunnya ke dalam matriks 5×5 beserta tabel posisi setiap huruf agar pencarian posisi bernilai O(1).</p>
<pre>${esc(code.buildKeySquare)}</pre>

<h3>3.4.2 Pembentukan Bigram</h3>
<p>Plainteks dibaca dua huruf sekaligus. Bila kedua huruf sama, hanya huruf pertama yang diambil dan dipasangkan dengan huruf sisipan (default X); bila tersisa satu huruf di akhir, huruf tersebut dipasangkan dengan huruf tambahan. Kasus khusus huruf kembar <code>XX</code> menggunakan sisipan Q agar tidak menghasilkan bigram kembar baru.</p>
<pre>${esc(code.toBigrams)}</pre>

<h3>3.4.3 Transformasi Bigram (Enkripsi dan Dekripsi)</h3>
<p>Satu fungsi digunakan untuk kedua arah. Pergeseran bernilai +1 untuk enkripsi dan +4 (setara −1 mod 5) untuk dekripsi; aturan persegi panjang tidak bergantung pada arah.</p>
<pre>${esc(code.transformPair)}</pre>

<h3>3.4.4 Pembuangan Huruf Sisipan pada Dekripsi</h3>
<p>Setelah dekripsi, X dianggap sisipan apabila berada di antara dua huruf kembar (misalnya <code>IX IB</code> → <code>IIB</code>) atau berada di akhir pesan. Karena heuristik ini dapat ikut membuang X asli, aplikasi juga menampilkan hasil mentah sebelum pembuangan.</p>
<pre>${esc(code.markRemovableFillers)}</pre>

<h2>3.5 Fitur Antarmuka</h2>
${tcap('Fitur aplikasi')}
<table class="full">
  <tr><th style="width:30%">Fitur</th><th>Keterangan</th></tr>
  <tr><td>Mode enkripsi &amp; dekripsi</td><td>Dipilih melalui tombol segmen; label masukan dan nama berkas keluaran menyesuaikan mode.</td></tr>
  <tr><td>Unggah berkas teks</td><td>Tombol pilih berkas atau <i>drag &amp; drop</i>, batas 5 MB, isi berkas dapat disunting.</td></tr>
  <tr><td>Bujursangkar kunci langsung</td><td>Matriks 5×5 diperbarui setiap kunci diketik; huruf yang berasal dari kunci ditandai.</td></tr>
  <tr><td>Rincian proses</td><td>Hasil normalisasi, daftar bigram (huruf sisipan ditandai), serta tabel posisi dan aturan untuk setiap bigram; posisi disorot pada bujursangkar.</td></tr>
  <tr><td>Keluaran</td><td>Format per bigram, blok 5 huruf, atau tanpa spasi; tombol Salin, Unduh .txt, dan “Gunakan sebagai masukan” untuk langsung menguji dekripsi.</td></tr>
  <tr><td>Analisis frekuensi</td><td>Histogram frekuensi huruf plainteks dibandingkan cipherteks.</td></tr>
  <tr><td>Validasi</td><td>Kunci kosong, teks kosong, cipherteks ganjil, dan bigram kembar pada cipherteks ditolak dengan pesan yang jelas.</td></tr>
</table>
</section>

<!-- ======================= BAB IV ======================= -->
<section class="chapter">
<h1>BAB IV<small>HASIL DAN PENGUJIAN</small></h1>

<h2>4.1 Navigasi Aplikasi</h2>
<p>Aplikasi terdiri atas satu halaman yang dibaca dari atas ke bawah. Tabel berikut merangkum setiap bagian yang dilalui pengguna beserta gambar yang menjelaskannya pada bab ini.</p>
${tcap('Bagian navigasi aplikasi')}
<table class="full nav-table">
  <tr><th style="width:30%">Bagian</th><th>Fungsi</th><th class="c" style="width:14%">Gambar</th></tr>
  <tr><td>Halaman awal</td><td>Panel masukan, pilihan mode, dan bujursangkar kunci kosong</td><td class="c">1</td></tr>
  <tr><td>1. Masukan</td><td>Mode, kunci, unggah berkas, huruf sisipan, format keluaran, tombol proses</td><td class="c">2, 7</td></tr>
  <tr><td>2. Cipherteks / Plainteks</td><td>Hasil, statistik, tombol Salin, Unduh .txt, dan Gunakan sebagai masukan</td><td class="c">3, 8</td></tr>
  <tr><td>3. Pra-pemrosesan</td><td>Teks ternormalisasi dan daftar bigram</td><td class="c">4</td></tr>
  <tr><td>4. Proses per bigram</td><td>Tabel posisi dan aturan tiap bigram, disorot di bujursangkar</td><td class="c">5</td></tr>
  <tr><td>5. Frekuensi huruf</td><td>Histogram frekuensi plainteks dan cipherteks</td><td class="c">6</td></tr>
  <tr><td>Muat contoh</td><td>Memuat contoh materi kuliah secara otomatis</td><td class="c">9</td></tr>
  <tr><td>Pesan kesalahan</td><td>Peringatan jika masukan tidak valid</td><td class="c">10</td></tr>
</table>
${fig('01-tampilan-awal', 'Saat pertama dibuka, pengguna melihat kartu <b>1 Masukan</b> berisi tombol mode Enkripsi/Dekripsi, kolom kunci, area unggah berkas, kolom teks, pilihan huruf sisipan dan format keluaran, serta tombol <b>Enkripsi</b>, <b>Muat contoh slide</b>, dan <b>Reset</b>. Panel kanan menampilkan bujursangkar kunci beserta keterangan warna dan ringkasan aturan Playfair.')}

<h2>4.2 Pengujian Enkripsi Berkas Teks</h2>
<p>Pengujian menggunakan berkas <code>${esc(sample.files.plain)}</code> dan kunci <code>${esc(sample.key)}</code>. Isi berkas teks asli adalah sebagai berikut.</p>
<pre>${esc(sample.plainText.trim())}</pre>
${fig('02-input-enkripsi', 'Setelah kunci diketik, panel samping langsung menampilkan bujursangkar kunci. Berkas yang dipilih ditampilkan nama dan ukurannya, dan isinya dimuat ke kolom teks.')}
${tcap(`Bujursangkar kunci "${esc(sample.key)}"`)}
${squareTable(sample.grid, sample.keyLetters)}
${fig('03-hasil-enkripsi', `Proses enkripsi menghasilkan ${sample.stats.bigrams} bigram dari ${sample.stats.letters} huruf, dengan ${sample.stats.fillers} huruf sisipan. Distribusi aturan: ${sample.stats.rules.baris} baris sama, ${sample.stats.rules.kolom} kolom sama, dan ${sample.stats.rules.persegi} persegi panjang.`)}
${fig('04-prapemrosesan', 'Kartu <b>3 Pra-pemrosesan</b> menunjukkan teks setelah dinormalisasi dan daftar bigram. Bigram yang mendapat huruf sisipan diberi warna jingga dan huruf sisipannya digarisbawahi.')}
${fig('05-proses-bigram', 'Kartu <b>4 Proses per bigram</b> berisi tabel nomor, bigram, posisi (baris, kolom), aturan, posisi hasil, dan hasil. Saat kursor diarahkan ke suatu baris, huruf masukan (hijau) dan huruf hasil (jingga) disorot pada bujursangkar kunci di panel kanan.')}
${tcap('Dua belas langkah pertama enkripsi berkas contoh')}
<table class="full">
  <tr><th class="c">No</th><th class="c">Bigram</th><th>Posisi (b,k)</th><th>Aturan</th><th>Posisi hasil</th><th class="c">Hasil</th></tr>
  ${sample.firstSteps
    .map(
      (s, i) => `<tr><td class="c">${i + 1}</td><td class="c mono">${s.input}</td><td class="mono">${pos(s.from)}</td><td>${RULE[s.rule]}</td><td class="mono">${pos(s.to)}</td><td class="c mono"><b>${s.output}</b></td></tr>`
    )
    .join('')}
</table>
${
  sample.fillerSteps.length
    ? `<p>Huruf sisipan ditambahkan pada bigram: ${sample.fillerSteps
        .map((s) => `ke-${s.no} <code>${s.input}</code> (${NOTE[s.note]})`)
        .join(', ')}.</p>`
    : ''
}
<p>Berkas hasil enkripsi yang diunduh dari aplikasi (<code>${esc(sample.files.cipher)}</code>) berisi cipherteks berikut.</p>
<pre class="cipher">${esc(sample.cipherFile)}</pre>
<div class="box-note">Isi berkas unduhan dibandingkan dengan keluaran fungsi <code>encrypt</code> yang dijalankan terpisah di Node.js: <span class="${sample.cipherMatchesLibrary ? 'ok' : 'bad'}">${sample.cipherMatchesLibrary ? 'identik' : 'TIDAK identik'}</span>.</div>
${fig('06-frekuensi', 'Kartu <b>5 Frekuensi huruf</b> membandingkan jumlah kemunculan setiap huruf A–Z pada plainteks (abu-abu) dan cipherteks (hijau).')}
<p>Nilai <i>index of coincidence</i> (IC) plainteks adalah ${num(sample.ic.plain)} sedangkan cipherteks ${num(sample.ic.cipher)}. Huruf terbanyak pada plainteks adalah ${sample.top.plain
    .map((t) => `${t.ch} (${num(t.pct, 1)}%)`)
    .join(', ')}; pada cipherteks ${sample.top.cipher.map((t) => `${t.ch} (${num(t.pct, 1)}%)`).join(', ')}. ${
    icLower
      ? 'IC cipherteks yang lebih rendah menunjukkan distribusi huruf cipherteks lebih datar, sesuai tujuan Playfair cipher untuk menyamarkan frekuensi huruf tunggal.'
      : 'Pada teks sependek ini IC cipherteks tidak lebih rendah; perataan distribusi baru terlihat konsisten pada teks yang lebih panjang.'
  } Meskipun demikian, frekuensi bigram tetap terjaga sehingga cipher masih rentan terhadap analisis frekuensi pasangan huruf.</p>

<h2>4.3 Pengujian Dekripsi</h2>
<p>Untuk memastikan cipherteks dapat dikembalikan, berkas <code>${esc(sample.files.cipher)}</code> didekripsi kembali dengan kunci yang sama.</p>
${fig('07-input-dekripsi', 'Untuk dekripsi, pengguna menekan tombol <b>Dekripsi</b> di kanan atas kartu masukan. Label berubah menjadi berkas cipherteks, lalu berkas hasil enkripsi dipilih dan kunci yang sama diketik.')}
${fig('08-hasil-dekripsi', 'Hasil dekripsi ditampilkan tanpa spasi. Di bawahnya terdapat hasil mentah per bigram sebelum huruf sisipan X dibuang, sehingga pengguna dapat memeriksa X yang dihapus.')}
<p>Isi berkas hasil dekripsi (<code>${esc(sample.files.decrypted)}</code>):</p>
<pre class="cipher">${esc(sample.decryptedFile)}</pre>
${tcap('Hasil verifikasi dekripsi')}
<table class="full">
  <tr><th>Pemeriksaan</th><th class="c" style="width:22%">Hasil</th></tr>
  <tr><td>Hasil dekripsi mentah sama dengan rangkaian bigram plainteks (termasuk huruf sisipan)</td><td class="c ${sample.rawEqualsBigrams ? 'ok' : 'bad'}">${sample.rawEqualsBigrams ? 'Sesuai' : 'Tidak sesuai'}</td></tr>
  <tr><td>Hasil dekripsi setelah huruf sisipan dibuang sama dengan plainteks ternormalisasi</td><td class="c ${sample.decryptedEqualsPlain ? 'ok' : 'bad'}">${sample.decryptedEqualsPlain ? 'Sesuai' : 'Tidak sesuai*'}</td></tr>
</table>
${sample.decryptedEqualsPlain ? '' : '<p>*Perbedaan disebabkan heuristik pembuangan X yang ikut membuang huruf X asli; hasil mentah tetap tersedia pada aplikasi.</p>'}
<p>Perlu dicatat bahwa hasil dekripsi tidak memuat spasi, tanda baca, dan huruf J, karena informasi tersebut memang dihilangkan pada tahap pra-pemrosesan Playfair cipher.</p>

<h2>4.4 Verifikasi terhadap Contoh Materi Kuliah</h2>
<p>Implementasi diuji menggunakan contoh pada materi kuliah: plainteks <code>${esc(slide.plaintext)}</code> dengan bujursangkar pada Tabel 2. Tombol <b>Muat contoh</b> pada aplikasi memuat contoh ini secara otomatis.</p>
${fig('09-contoh-slide', 'Tombol <b>Muat contoh</b> mengisi kunci ALNGESHPUB dan plainteks dari materi kuliah, lalu langsung menjalankan enkripsi.')}
${tcap('Perbandingan hasil aplikasi dengan contoh materi kuliah')}
<table>
  <tr><th class="c">No</th><th class="c">Bigram</th><th>Aturan</th><th class="c">Hasil aplikasi</th><th class="c">Hasil pada slide</th><th class="c">Status</th></tr>
  ${slide.bigrams
    .map(
      (s, i) => `<tr><td class="c">${i + 1}</td><td class="c mono">${s.input}</td><td>${RULE[s.rule]}</td><td class="c mono">${s.output}</td><td class="c mono">${s.expected}</td><td class="c ${s.output === s.expected ? 'ok' : 'bad'}">${s.output === s.expected ? '✓' : '✗'}</td></tr>`
    )
    .join('')}
</table>
<div class="box-note">Cipherteks aplikasi <code>${slide.actual}</code> ${slide.match ? '<span class="ok">sama persis</span>' : '<span class="bad">berbeda</span>'} dengan cipherteks pada slide <code>${slide.expected}</code>. Contoh aturan tunggal pada slide (DI→FK, QT→RM, NQ→PX, OW→WL, HZ→BW) juga diuji pada unit test.</div>

<h2>4.5 Validasi Masukan</h2>
${fig('10-validasi', 'Aplikasi menolak cipherteks dengan jumlah huruf ganjil karena cipherteks Playfair selalu berjumlah genap. Validasi serupa berlaku untuk kunci kosong, teks kosong, dan bigram kembar pada cipherteks.')}

<h2>4.6 Pengujian Otomatis (Unit Test)</h2>
<p>Pengujian otomatis dijalankan dengan perintah <code>npm test</code> (Node.js ${esc(tests.node)}). Hasil: <b class="${tests.failed ? 'bad' : 'ok'}">${tests.passed} dari ${tests.cases.length} kasus lulus</b>.</p>
${tcap('Daftar kasus unit test')}
<table class="full">
  <tr><th class="c" style="width:8%">No</th><th>Kasus uji</th><th class="c" style="width:14%">Status</th></tr>
  ${tests.cases
    .map((c, i) => `<tr><td class="c">${i + 1}</td><td>${esc(c.name)}</td><td class="c ${c.ok ? 'ok' : 'bad'}">${c.ok ? 'Lulus' : 'Gagal'}</td></tr>`)
    .join('')}
</table>
</section>

<!-- ======================= BAB V ======================= -->
<section class="chapter">
<h1>BAB V<small>KESIMPULAN</small></h1>
<h2>5.1 Kesimpulan</h2>
<ol>
  <li>Playfair cipher berhasil diimplementasikan sebagai aplikasi web yang menerima berkas teks asli dan kata/frasa kunci, lalu menghasilkan cipherteks yang dapat disalin maupun diunduh sebagai berkas teks.</li>
  <li>Implementasi mengikuti aturan pada materi kuliah: bujursangkar 5×5 tanpa J, penyisipan X pada huruf kembar dan jumlah ganjil, serta aturan baris, kolom, dan persegi panjang. Hasil enkripsi contoh <code>${esc(slide.plaintext)}</code> ${slide.match ? 'sama persis' : 'dibandingkan'} dengan slide (<code>${slide.expected}</code>).</li>
  <li>Dekripsi berkas hasil enkripsi mengembalikan plainteks ternormalisasi, dan ${tests.passed} dari ${tests.cases.length} unit test (termasuk 500 pengujian <i>round-trip</i> acak) lulus.</li>
  <li>Rincian proses per bigram dan sorotan pada bujursangkar kunci membantu memahami cara kerja algoritma. Analisis frekuensi memperlihatkan bahwa Playfair menyamarkan frekuensi huruf tunggal, tetapi karena blok hanya dua huruf, cipher ini tetap rentan terhadap analisis frekuensi bigram dan tidak layak dipakai untuk pengamanan data modern.</li>
</ol>

<h2>5.2 Kode Sumber dan Akses Aplikasi</h2>
${tcap('Tautan kode sumber dan aplikasi')}
<table class="full">
  <tr><th style="width:28%">Keterangan</th><th>Tautan</th></tr>
  <tr><td>Kode sumber aplikasi (GitHub)</td><td><a href="${esc(id.githubWeb)}">${esc(id.githubWeb)}</a></td></tr>
  <tr><td>Repositori kelompok: aplikasi, berkas contoh, pengujian, dan laporan (GitHub)</td><td><a href="${esc(id.github)}">${esc(id.github)}</a></td></tr>
  <tr><td>Aplikasi daring (Vercel)</td><td><a href="${esc(id.deploy)}">${esc(id.deploy)}</a></td></tr>
</table>
<p>Repositori berisi kode aplikasi (<code>app/</code>), berkas contoh plainteks beserta hasil enkripsi dan dekripsinya (<code>samples/</code>), unit test (<code>tests/</code>), serta skrip pembuat laporan (<code>tools/</code>).</p>
<p>Cara menjalankan aplikasi:</p>
<ol>
  <li>Buka tautan Vercel di atas, atau unduh repositori lalu buka <code>app/index.html</code> di peramban. Tidak diperlukan instalasi maupun server.</li>
  <li>Pilih mode <b>Enkripsi</b>, ketik kunci, lalu pilih atau seret berkas <code>.txt</code>.</li>
  <li>Klik <b>Enkripsi</b> (atau Ctrl/⌘ + Enter), kemudian klik <b>Unduh .txt</b> untuk menyimpan berkas terenkripsi.</li>
  <li>Untuk dekripsi, pilih mode <b>Dekripsi</b>, gunakan kunci yang sama, dan pilih berkas cipherteks.</li>
  <li>Unit test dijalankan dengan <code>npm test</code>; laporan dibuat ulang dengan <code>npm install</code> lalu <code>npm run report</code>.</li>
</ol>
</section>

</body>
</html>`;
}
