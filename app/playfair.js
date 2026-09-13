/**
 * playfair.js — Implementasi inti Playfair Cipher.
 *
 * Aturan mengikuti materi K2 Kriptografi Klasik (KOM1314):
 *   - Bujursangkar kunci 5x5 berisi 25 huruf (huruf J dihilangkan, J -> I).
 *   - Pesan ditulis dalam bigram; huruf kembar dalam satu bigram disisipi X,
 *     dan jika jumlah huruf ganjil ditambahkan X di akhir.
 *   - Enkripsi: baris sama -> geser kanan, kolom sama -> geser bawah,
 *     selain itu -> titik sudut persegi panjang.
 *   - Dekripsi: kebalikannya (geser kiri / geser atas), lalu buang X sisipan.
 *
 * Modul ini dapat dipakai di browser (window.Playfair) maupun Node.js (require).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Playfair = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SIZE = 5;
  const ALPHABET = 'ABCDEFGHIKLMNOPQRSTUVWXYZ'; // 25 huruf, tanpa J

  /** Kapitalkan, hapus diakritik, ganti J -> I, dan buang semua karakter non-huruf. */
  function normalize(text) {
    return String(text == null ? '' : text)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/J/g, 'I')
      .replace(/[^A-Z]/g, '');
  }

  /** Susun bujursangkar kunci 5x5 dari kata/frasa kunci. */
  function buildKeySquare(key) {
    const normalizedKey = normalize(key);
    const seen = new Set();
    const sequence = [];
    for (const ch of normalizedKey + ALPHABET) {
      if (!seen.has(ch)) {
        seen.add(ch);
        sequence.push(ch);
      }
    }

    const grid = [];
    const position = {};
    sequence.forEach((ch, i) => {
      const row = Math.floor(i / SIZE);
      const col = i % SIZE;
      if (!grid[row]) grid[row] = [];
      grid[row][col] = ch;
      position[ch] = { row, col };
    });

    return {
      key: normalizedKey,
      keyLetters: Array.from(new Set(normalizedKey)).join(''),
      sequence: sequence.join(''),
      grid,
      position,
    };
  }

  /** Huruf sisipan; jika sama dengan huruf yang dipisahkan (mis. "XX"), pakai Q (atau Z). */
  function fillerFor(letter, filler) {
    if (letter !== filler) return filler;
    return filler === 'Q' ? 'Z' : 'Q';
  }

  function resolveFiller(filler) {
    return normalize(filler).charAt(0) || 'X';
  }

  /**
   * Pecah plainteks menjadi bigram.
   * note: null (normal) | 'sisip' (huruf kembar disisipi) | 'ganjil' (tambahan di akhir)
   */
  function toBigrams(text, filler) {
    const f = resolveFiller(filler);
    const s = normalize(text);
    const bigrams = [];
    let i = 0;
    while (i < s.length) {
      const a = s[i];
      const b = s[i + 1];
      if (b === undefined) {
        bigrams.push({ pair: a + fillerFor(a, f), note: 'ganjil' });
        i += 1;
      } else if (a === b) {
        bigrams.push({ pair: a + fillerFor(a, f), note: 'sisip' });
        i += 1;
      } else {
        bigrams.push({ pair: a + b, note: null });
        i += 2;
      }
    }
    return { normalized: s, bigrams };
  }

  /** Transformasi satu bigram. direction: 'encrypt' | 'decrypt'. */
  function transformPair(pair, square, direction) {
    const shift = direction === 'decrypt' ? SIZE - 1 : 1;
    const p1 = square.position[pair[0]];
    const p2 = square.position[pair[1]];
    let c1;
    let c2;
    let rule;

    if (p1.row === p2.row) {
      rule = 'baris';
      c1 = { row: p1.row, col: (p1.col + shift) % SIZE };
      c2 = { row: p2.row, col: (p2.col + shift) % SIZE };
    } else if (p1.col === p2.col) {
      rule = 'kolom';
      c1 = { row: (p1.row + shift) % SIZE, col: p1.col };
      c2 = { row: (p2.row + shift) % SIZE, col: p2.col };
    } else {
      rule = 'persegi';
      c1 = { row: p1.row, col: p2.col };
      c2 = { row: p2.row, col: p1.col };
    }

    return {
      input: pair,
      output: square.grid[c1.row][c1.col] + square.grid[c2.row][c2.col],
      rule,
      from: [p1, p2],
      to: [c1, c2],
    };
  }

  function countRules(steps) {
    const rules = { baris: 0, kolom: 0, persegi: 0 };
    steps.forEach((s) => { rules[s.rule] += 1; });
    return rules;
  }

  function encrypt(plaintext, key, options) {
    const opts = options || {};
    const filler = resolveFiller(opts.filler);
    const square = buildKeySquare(key);
    const { normalized, bigrams } = toBigrams(plaintext, filler);
    const steps = bigrams.map((b) =>
      Object.assign(transformPair(b.pair, square, 'encrypt'), { note: b.note })
    );
    return {
      mode: 'encrypt',
      filler,
      square,
      normalized,
      steps,
      result: steps.map((s) => s.output).join(''),
      stats: {
        letters: normalized.length,
        bigrams: steps.length,
        fillers: steps.filter((s) => s.note).length,
        rules: countRules(steps),
      },
    };
  }

  /**
   * Buang huruf sisipan hasil dekripsi (langkah 4 pada slide: "buang huruf X yang tidak
   * mengandung makna"): X di antara dua huruf kembar dan X di akhir pesan.
   * Heuristik ini bisa ikut membuang X asli (mis. "EXE"), karena itu hasil mentah juga disediakan.
   */
  function markRemovableFillers(steps, filler) {
    steps.forEach((step, i) => {
      const p = step.output;
      const next = steps[i + 1];
      const isFiller = p[1] === fillerFor(p[0], filler);
      step.note = null;
      if (isFiller && next && next.output[0] === p[0]) step.note = 'sisip';
      else if (isFiller && !next) step.note = 'ganjil';
    });
    return steps.map((s) => (s.note ? s.output[0] : s.output)).join('');
  }

  function decrypt(ciphertext, key, options) {
    const opts = options || {};
    const filler = resolveFiller(opts.filler);
    const square = buildKeySquare(key);
    const normalized = normalize(ciphertext);

    if (normalized.length % 2 !== 0) {
      throw new Error(
        `Panjang cipherteks (${normalized.length} huruf) ganjil. Cipherteks Playfair selalu berjumlah genap.`
      );
    }

    const steps = [];
    for (let i = 0; i < normalized.length; i += 2) {
      const pair = normalized.slice(i, i + 2);
      if (pair[0] === pair[1]) {
        throw new Error(
          `Bigram ke-${i / 2 + 1} "${pair}" berisi huruf kembar, sehingga bukan cipherteks Playfair yang valid.`
        );
      }
      steps.push(transformPair(pair, square, 'decrypt'));
    }

    const rawResult = steps.map((s) => s.output).join('');
    const result = markRemovableFillers(steps, filler);
    return {
      mode: 'decrypt',
      filler,
      square,
      normalized,
      steps,
      rawResult,
      result,
      stats: {
        letters: normalized.length,
        bigrams: steps.length,
        fillers: steps.filter((s) => s.note).length,
        rules: countRules(steps),
      },
    };
  }

  /** Format keluaran: groupSize 2 (bigram), 5 (blok), atau 0 (tanpa spasi). */
  function format(text, groupSize, groupsPerLine) {
    const size = Number(groupSize) || 0;
    if (!size) return text;
    const groups = text.match(new RegExp(`.{1,${size}}`, 'g')) || [];
    const perLine = groupsPerLine || (size === 2 ? 20 : 12);
    const lines = [];
    for (let i = 0; i < groups.length; i += perLine) {
      lines.push(groups.slice(i, i + perLine).join(' '));
    }
    return lines.join('\n');
  }

  /** Frekuensi kemunculan huruf A-Z. */
  function letterFrequency(text) {
    const counts = new Array(26).fill(0);
    for (const ch of String(text).toUpperCase()) {
      const code = ch.charCodeAt(0) - 65;
      if (code >= 0 && code < 26) counts[code] += 1;
    }
    return counts;
  }

  return {
    SIZE,
    ALPHABET,
    normalize,
    buildKeySquare,
    toBigrams,
    transformPair,
    encrypt,
    decrypt,
    format,
    letterFrequency,
  };
});
