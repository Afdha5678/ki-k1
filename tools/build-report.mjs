/**
 * build-report.mjs — Membuat laporan PDF secara otomatis.
 *
 * 1. Menjalankan aplikasi (app/index.html) di Chrome headless dan mengambil screenshot
 *    alur enkripsi & dekripsi berkas samples/plainteks.txt.
 * 2. Mengunduh berkas terenkripsi/terdekripsi melalui tombol "Unduh .txt" aplikasi ke samples/.
 * 3. Menjalankan unit test dan memverifikasi contoh dari slide.
 * 4. Menyusun laporan/laporan.html lalu mencetaknya menjadi PDF.
 *
 * Jalankan: npm run report   (Chrome dapat diganti lewat env CHROME_PATH)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { renderReport } from './report-template.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const Playfair = require(path.join(ROOT, 'app/playfair.js'));

const REPORT_DIR = path.join(ROOT, 'laporan');
const SHOTS_DIR = path.join(REPORT_DIR, 'screenshots');
const SAMPLES_DIR = path.join(ROOT, 'samples');
const PLAIN_FILE = path.join(SAMPLES_DIR, 'plainteks.txt');
const CIPHER_FILE = path.join(SAMPLES_DIR, 'plainteks-terenkripsi.txt');
const DECRYPTED_FILE = path.join(SAMPLES_DIR, 'plainteks-terdekripsi.txt');
const PDF_FILE = path.join(REPORT_DIR, 'Laporan-K1-Playfair-Cipher.pdf');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const DEMO_KEY = 'KEAMANAN INFORMASI';
const SLIDE = {
  key: 'ALNGESHPUB',
  plaintext: 'temui ibu nanti malam',
  expected: 'ZB RS FY KU PG LG RK VS NL QV',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForFile(file, timeout = 15000) {
  const start = Date.now();
  let lastSize = -1;
  while (Date.now() - start < timeout) {
    if (fs.existsSync(file)) {
      const size = fs.statSync(file).size;
      if (size > 0 && size === lastSize) return;
      lastSize = size;
    }
    await sleep(150);
  }
  throw new Error(`Berkas unduhan tidak ditemukan: ${file}`);
}

async function captureApp(browser) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playfair-dl-'));

  const page = await browser.newPage();
  await page.setViewport({ width: 1360, height: 900, deviceScaleFactor: 2 });
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir });
  await page.goto(pathToFileURL(path.join(ROOT, 'app/index.html')).href, { waitUntil: 'load' });

  const shots = {};
  const settle = () => sleep(300);
  const scrollTo = (selector, offset = 16) =>
    page.evaluate((s, o) => {
      const el = document.querySelector(s);
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - o);
    }, selector, offset);
  const shot = async (name, caption, selector) => {
    await settle();
    const file = path.join(SHOTS_DIR, `${name}.png`);
    if (selector) await (await page.$(selector)).screenshot({ path: file });
    else await page.screenshot({ path: file });
    shots[name] = { file: `screenshots/${name}.png`, caption };
  };
  const shotRegion = async (name, caption, fromSelector, toSelector) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await settle();
    const clip = await page.evaluate((a, b) => {
      const layout = document.querySelector('.layout').getBoundingClientRect();
      const top = document.querySelector(a).getBoundingClientRect().top;
      const bottom = document.querySelector(b).getBoundingClientRect().bottom;
      return { x: layout.left + 16, y: top + window.scrollY - 12, width: layout.width - 32, height: bottom - top + 24 };
    }, fromSelector, toSelector);
    const file = path.join(SHOTS_DIR, `${name}.png`);
    await page.screenshot({ path: file, clip, captureBeyondViewport: true });
    shots[name] = { file: `screenshots/${name}.png`, caption };
  };
  const chooseMode = (value) => page.click(`.segmented label:nth-child(${value === 'encrypt' ? 1 : 2})`);
  const upload = async (file) => {
    await (await page.$('#file')).uploadFile(file);
    await page.waitForFunction(
      (name) => document.getElementById('file-name').textContent.includes(name),
      {},
      path.basename(file)
    );
  };
  const processAndWait = async () => {
    await page.click('#btn-process');
    await page.waitForSelector('#results:not([hidden])');
  };
  const downloadTo = async (target) => {
    const name = await page.evaluate(() => {
      document.getElementById('btn-download').click();
      const base = (document.getElementById('file-name').textContent.split(' · ')[0] || 'teks').replace(/\.[^.]+$/, '');
      const enc = document.querySelector('input[name="mode"]:checked').value === 'encrypt';
      return `${base}-${enc ? 'terenkripsi' : 'terdekripsi'}.txt`;
    });
    const downloaded = path.join(downloadDir, name);
    await waitForFile(downloaded);
    fs.copyFileSync(downloaded, target);
  };

  // --- Tampilan awal
  await shot('01-tampilan-awal', 'Tampilan awal aplikasi Playfair Cipher');

  // --- Enkripsi berkas plainteks
  await page.type('#key', DEMO_KEY);
  await upload(PLAIN_FILE);
  await shot('02-input-enkripsi', `Masukan enkripsi: kunci "${DEMO_KEY}" dan berkas plainteks.txt yang telah dipilih`);

  await processAndWait();
  await scrollTo('#results');
  await shot('03-hasil-enkripsi', 'Hasil enkripsi: cipherteks, statistik proses, serta tombol Salin dan Unduh .txt');
  await downloadTo(CIPHER_FILE);

  await shot('04-prapemrosesan', 'Tahap pra-pemrosesan: normalisasi teks dan pembentukan bigram (huruf sisipan ditandai)', '#results > .card:nth-child(2)');

  await scrollTo('#results > .card:nth-child(3)');
  await page.hover('#steps-body tr[data-i="2"]');
  await shot('05-proses-bigram', 'Tabel proses per bigram; baris yang disorot ditampilkan posisinya pada bujursangkar kunci');

  await shot('06-frekuensi', 'Perbandingan frekuensi huruf plainteks dan cipherteks', '#results > .card:nth-child(4)');

  // --- Dekripsi berkas cipherteks hasil unduhan
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('#btn-reset');
  await chooseMode('decrypt');
  await page.type('#key', DEMO_KEY);
  await upload(CIPHER_FILE);
  await shot('07-input-dekripsi', 'Masukan dekripsi: berkas plainteks-terenkripsi.txt dengan kunci yang sama');

  await processAndWait();
  await scrollTo('#results');
  await shot('08-hasil-dekripsi', 'Hasil dekripsi: plainteks setelah huruf sisipan dibuang beserta hasil mentahnya');
  await downloadTo(DECRYPTED_FILE);

  // --- Contoh dari slide
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('#btn-sample');
  await page.waitForSelector('#results:not([hidden])');
  await shotRegion('09-contoh-slide', 'Verifikasi contoh slide: "temui ibu nanti malam" menghasilkan ZB RS FY KU PG LG RK VS NL QV', '#input-card', '#results > .card:nth-child(1)');

  // --- Validasi masukan
  await page.click('#btn-reset');
  await chooseMode('decrypt');
  await page.type('#key', 'KUNCI');
  await page.type('#input', 'ABCDE');
  await page.click('#btn-process');
  await page.waitForSelector('#error:not([hidden])');
  await shot('10-validasi', 'Validasi masukan: cipherteks berjumlah ganjil ditolak dengan pesan kesalahan', '#input-card');

  await page.close();
  fs.rmSync(downloadDir, { recursive: true, force: true });
  return shots;
}

function runUnitTests() {
  let output;
  try {
    output = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tests/playfair.test.js'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
  } catch (err) {
    output = err.stdout || '';
  }
  const cases = [];
  for (const line of output.split('\n')) {
    const m = line.match(/^(not )?ok \d+ - (.+?)(?: # .*)?$/);
    if (m) cases.push({ name: m[2].replace(/\\#/g, '#'), ok: !m[1] });
  }
  return { cases, passed: cases.filter((c) => c.ok).length, failed: cases.filter((c) => !c.ok).length, node: process.version };
}

function indexOfCoincidence(text) {
  const counts = Playfair.letterFrequency(text);
  const n = counts.reduce((a, b) => a + b, 0);
  return n > 1 ? counts.reduce((s, c) => s + c * (c - 1), 0) / (n * (n - 1)) : 0;
}

function topLetters(text, k = 5) {
  const counts = Playfair.letterFrequency(text);
  const n = counts.reduce((a, b) => a + b, 0) || 1;
  return counts
    .map((c, i) => ({ ch: String.fromCharCode(65 + i), pct: (c / n) * 100 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, k);
}

function extractFunction(src, name) {
  const start = src.indexOf(`  function ${name}(`);
  const end = src.indexOf('\n  }\n', start) + 4;
  // Sertakan komentar JSDoc hanya jika tepat berada di atas fungsi.
  const docStart = src.lastIndexOf('  /**', start);
  const hasDoc = docStart !== -1 && /^\s*\/\*\*[\s\S]*?\*\/\n$/.test(src.slice(docStart, start)) &&
    src.slice(docStart, start).indexOf('*/') === src.slice(docStart, start).lastIndexOf('*/');
  return src.slice(hasDoc ? docStart : start, end)
    .split('\n').map((l) => l.replace(/^ {2}/, '')).join('\n');
}

function collectData(shots) {
  // Contoh slide
  const slideRes = Playfair.encrypt(SLIDE.plaintext, SLIDE.key);
  const expectedPairs = SLIDE.expected.split(' ');
  const slide = {
    ...SLIDE,
    grid: slideRes.square.grid,
    keyLetters: slideRes.square.keyLetters,
    bigrams: slideRes.steps.map((s, i) => ({ ...s, expected: expectedPairs[i] })),
    actual: Playfair.format(slideRes.result, 2),
  };
  slide.match = slide.actual === SLIDE.expected;

  // Berkas contoh
  const plainText = fs.readFileSync(PLAIN_FILE, 'utf8');
  const cipherFile = fs.readFileSync(CIPHER_FILE, 'utf8').trim();
  const decryptedFile = fs.readFileSync(DECRYPTED_FILE, 'utf8').trim();
  const enc = Playfair.encrypt(plainText, DEMO_KEY);
  const dec = Playfair.decrypt(cipherFile, DEMO_KEY);
  const sample = {
    key: DEMO_KEY,
    grid: enc.square.grid,
    keyLetters: enc.square.keyLetters,
    plainText,
    normalized: enc.normalized,
    cipherFile,
    cipherMatchesLibrary: cipherFile === Playfair.format(enc.result, 2),
    decryptedFile,
    decryptedEqualsPlain: Playfair.normalize(decryptedFile) === enc.normalized,
    rawEqualsBigrams: dec.rawResult === enc.steps.map((s) => s.input).join(''),
    stats: enc.stats,
    firstSteps: enc.steps.slice(0, 12),
    fillerSteps: enc.steps.map((s, i) => ({ ...s, no: i + 1 })).filter((s) => s.note),
    ic: { plain: indexOfCoincidence(enc.normalized), cipher: indexOfCoincidence(enc.result) },
    top: { plain: topLetters(enc.normalized), cipher: topLetters(enc.result) },
    files: {
      plain: path.relative(ROOT, PLAIN_FILE),
      cipher: path.relative(ROOT, CIPHER_FILE),
      decrypted: path.relative(ROOT, DECRYPTED_FILE),
    },
  };

  const src = fs.readFileSync(path.join(ROOT, 'app/playfair.js'), 'utf8');
  const code = {
    full: src,
    buildKeySquare: extractFunction(src, 'buildKeySquare'),
    toBigrams: extractFunction(src, 'toBigrams'),
    transformPair: extractFunction(src, 'transformPair'),
    markRemovableFillers: extractFunction(src, 'markRemovableFillers'),
  };

  return {
    identitas: JSON.parse(fs.readFileSync(path.join(REPORT_DIR, 'identitas.json'), 'utf8')),
    shots,
    slide,
    sample,
    tests: runUnitTests(),
    code,
  };
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    console.log('• Mengambil screenshot aplikasi…');
    const shots = await captureApp(browser);

    console.log('• Menjalankan pengujian & menyusun data laporan…');
    const data = collectData(shots);
    if (!data.slide.match) console.warn('  ! Hasil contoh slide TIDAK sesuai!');
    if (data.tests.failed) console.warn(`  ! ${data.tests.failed} unit test gagal`);

    const htmlFile = path.join(REPORT_DIR, 'laporan.html');
    fs.writeFileSync(htmlFile, renderReport(data));

    console.log('• Mencetak PDF…');
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' });
    await page.pdf({
      path: PDF_FILE,
      format: 'A4',
      printBackground: true,
      margin: { top: '22mm', bottom: '20mm', left: '25mm', right: '20mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate:
        '<div style="width:100%;font-size:9px;color:#777;text-align:center;font-family:Times New Roman,serif;"><span class="pageNumber"></span></div>',
    });
    console.log(`✓ Selesai: ${path.relative(ROOT, PDF_FILE)}`);
    console.log(`  Unit test: ${data.tests.passed} lulus, ${data.tests.failed} gagal · contoh slide: ${data.slide.match ? 'sesuai' : 'TIDAK sesuai'}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
