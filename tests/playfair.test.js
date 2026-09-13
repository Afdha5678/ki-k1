const test = require('node:test');
const assert = require('node:assert/strict');
const Playfair = require('../app/playfair.js');

const SLIDE_KEY = 'ALNGESHPUB';
const rows = (square) => square.grid.map((r) => r.join(''));
const encPair = (pair, key = SLIDE_KEY) =>
  Playfair.transformPair(pair, Playfair.buildKeySquare(key), 'encrypt').output;

test('bujursangkar kunci sesuai contoh slide 68', () => {
  assert.deepEqual(rows(Playfair.buildKeySquare(SLIDE_KEY)), ['ALNGE', 'SHPUB', 'CDFIK', 'MOQRT', 'VWXYZ']);
});

test('bujursangkar tanpa huruf J, huruf unik, J pada kunci menjadi I', () => {
  const sq = Playfair.buildKeySquare('Jakarta Jaya');
  assert.equal(sq.sequence.length, 25);
  assert.equal(new Set(sq.sequence).size, 25);
  assert.ok(!sq.sequence.includes('J'));
  assert.equal(sq.sequence.slice(0, 6), 'IAKRTY');
});

test('bigram contoh slide 67: "temui ibu nanti malam"', () => {
  const { bigrams } = Playfair.toBigrams('temui ibu nanti malam');
  assert.equal(bigrams.map((b) => b.pair).join(' '), 'TE MU IX IB UN AN TI MA LA MX');
});

test('aturan per bigram sesuai slide 68–70', () => {
  assert.equal(encPair('DI'), 'FK'); // baris sama
  assert.equal(encPair('QT'), 'RM'); // baris sama, siklik
  assert.equal(encPair('NQ'), 'PX'); // kolom sama
  assert.equal(encPair('OW'), 'WL'); // kolom sama, siklik
  assert.equal(encPair('HZ'), 'BW'); // persegi panjang
});

test('enkripsi contoh slide 71', () => {
  const res = Playfair.encrypt('temui ibu nanti malam', SLIDE_KEY);
  assert.equal(Playfair.format(res.result, 2), 'ZB RS FY KU PG LG RK VS NL QV');
  assert.equal(res.stats.fillers, 2);
});

test('dekripsi contoh slide mengembalikan plainteks dan membuang X sisipan', () => {
  const res = Playfair.decrypt('ZB RS FY KU PG LG RK VS NL QV', SLIDE_KEY);
  assert.equal(res.rawResult, 'TEMUIXIBUNANTIMALAMX');
  assert.equal(res.result, 'TEMUIIBUNANTIMALAM');
});

test('normalisasi: J -> I, diakritik dan non-huruf dibuang', () => {
  assert.equal(Playfair.normalize('Jalan-jalan ke Café, 2024!'), 'IALANIALANKECAFE');
});

test('huruf sisipan X pada "XX" diganti Q', () => {
  const { bigrams } = Playfair.toBigrams('XX');
  assert.deepEqual(bigrams.map((b) => b.pair), ['XQ', 'XQ']);
});

test('dekripsi menolak cipherteks ganjil atau berisi bigram kembar', () => {
  assert.throws(() => Playfair.decrypt('ABC', 'KUNCI'), /ganjil/);
  assert.throws(() => Playfair.decrypt('AABC', 'KUNCI'), /kembar/);
});

test('round-trip acak: dekripsi(enkripsi(p)) == bigram plainteks', () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ .,';
  const rand = (n) => Array.from({ length: n }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  for (let i = 0; i < 500; i++) {
    const plain = rand(1 + Math.floor(Math.random() * 80));
    const key = rand(1 + Math.floor(Math.random() * 20)) + 'K';
    const enc = Playfair.encrypt(plain, key);
    if (!enc.result) continue;
    const expected = Playfair.toBigrams(plain).bigrams.map((b) => b.pair).join('');
    assert.equal(Playfair.decrypt(enc.result, key).rawResult, expected, `plain=${plain} key=${key}`);
  }
});
