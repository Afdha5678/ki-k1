/* app.js — Antarmuka aplikasi Playfair Cipher (menggunakan window.Playfair dari playfair.js). */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const els = {
    key: $('key'),
    file: $('file'),
    dropzone: $('dropzone'),
    fileName: $('file-name'),
    fileLabel: $('file-label'),
    textLabel: $('text-label'),
    input: $('input'),
    filler: $('filler'),
    grouping: $('grouping'),
    error: $('error'),
    btnProcess: $('btn-process'),
    btnSample: $('btn-sample'),
    btnReset: $('btn-reset'),
    results: $('results'),
    outputTitle: $('output-title'),
    stats: $('stats'),
    output: $('output'),
    rawWrap: $('raw-wrap'),
    rawOutput: $('raw-output'),
    btnCopy: $('btn-copy'),
    btnDownload: $('btn-download'),
    btnSwap: $('btn-swap'),
    prep: $('prep'),
    stepsBody: $('steps-body'),
    tableNote: $('table-note'),
    histogram: $('histogram'),
    legendIn: $('legend-in'),
    legendOut: $('legend-out'),
    square: $('square'),
    caption: $('hl-caption'),
    keyInfo: $('key-info'),
  };

  const TABLE_LIMIT = 300;
  const CHIP_LIMIT = 400;
  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  // Contoh pada materi K2 (slide 66–72): bujursangkar ALNGE/SHPUB/CDFIK/MOQRT/VWXYZ.
  const SAMPLE = { key: 'ALNGESHPUB', text: 'temui ibu nanti malam', fileName: 'contoh-slide.txt' };

  const state = { fileName: null, result: null, pinned: null };

  const mode = () => document.querySelector('input[name="mode"]:checked').value;
  const isEncrypt = () => mode() === 'encrypt';

  /* ---------------- Bujursangkar ---------------- */

  function renderSquare() {
    const sq = Playfair.buildKeySquare(els.key.value);
    const keySet = new Set(sq.keyLetters);
    const frag = document.createDocumentFragment();
    sq.grid.forEach((row, r) =>
      row.forEach((ch, c) => {
        const cell = document.createElement('div');
        cell.className = 'cell' + (keySet.has(ch) ? ' from-key' : '');
        cell.id = `cell-${r}-${c}`;
        cell.textContent = ch;
        frag.appendChild(cell);
      })
    );
    els.square.replaceChildren(frag);
    els.caption.innerHTML = '&nbsp;';
    els.keyInfo.textContent = sq.keyLetters
      ? `Huruf unik dari kunci: ${sq.keyLetters}`
      : 'Isi kunci untuk membentuk bujursangkar.';
  }

  function highlight(step) {
    els.square.querySelectorAll('.hl-src, .hl-dst').forEach((c) => c.classList.remove('hl-src', 'hl-dst'));
    if (!step) {
      els.caption.innerHTML = '&nbsp;';
      return;
    }
    step.from.forEach((p) => $(`cell-${p.row}-${p.col}`).classList.add('hl-src'));
    step.to.forEach((p) => $(`cell-${p.row}-${p.col}`).classList.add('hl-dst'));
    els.caption.innerHTML = `${step.input}<span class="arrow">→</span>${step.output} <span class="tag ${step.rule}">${step.rule}</span>`;
  }

  /* ---------------- Mode & label ---------------- */

  function updateModeLabels() {
    const enc = isEncrypt();
    // Cipherteks lazim ditulis per bigram, plainteks hasil dekripsi tanpa spasi.
    els.grouping.value = enc ? '2' : '0';
    els.btnProcess.textContent = enc ? 'Enkripsi' : 'Dekripsi';
    els.fileLabel.textContent = enc ? 'Berkas plainteks (.txt)' : 'Berkas cipherteks (.txt)';
    els.textLabel.textContent = enc ? 'Isi plainteks' : 'Isi cipherteks';
  }

  /* ---------------- Berkas ---------------- */

  function formatBytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
  }

  function setFile(name, sizeText) {
    state.fileName = name;
    els.fileName.textContent = name ? `${name}${sizeText ? ' · ' + sizeText : ''}` : 'Belum ada berkas dipilih';
    els.dropzone.classList.toggle('has-file', Boolean(name));
  }

  function readFile(file) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      showError(`Ukuran berkas ${formatBytes(file.size)} melebihi batas 5 MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      els.input.value = reader.result;
      setFile(file.name, formatBytes(file.size));
      hideError();
      els.results.hidden = true;
    };
    reader.onerror = () => showError('Gagal membaca berkas.');
    reader.readAsText(file, 'UTF-8');
  }

  /* ---------------- Proses ---------------- */

  function showError(msg) {
    els.error.textContent = msg;
    els.error.hidden = false;
  }
  function hideError() {
    els.error.hidden = true;
  }

  function process() {
    hideError();
    const enc = isEncrypt();
    if (!Playfair.normalize(els.key.value)) {
      showError('Kunci tidak boleh kosong dan harus mengandung minimal satu huruf.');
      els.key.focus();
      return;
    }
    if (!Playfair.normalize(els.input.value)) {
      showError(`${enc ? 'Plainteks' : 'Cipherteks'} kosong atau tidak mengandung huruf. Pilih berkas .txt atau ketik teks terlebih dahulu.`);
      return;
    }
    const opts = { filler: els.filler.value };
    try {
      state.result = enc
        ? Playfair.encrypt(els.input.value, els.key.value, opts)
        : Playfair.decrypt(els.input.value, els.key.value, opts);
    } catch (err) {
      els.results.hidden = true;
      showError(err.message);
      return;
    }
    state.pinned = null;
    renderResult(state.result, els.input.value);
    els.results.hidden = false;
  }

  function renderResult(res, originalText) {
    const enc = res.mode === 'encrypt';
    els.outputTitle.textContent = enc ? 'Cipherteks' : 'Plainteks hasil dekripsi';
    els.output.value = Playfair.format(res.result, els.grouping.value);
    els.rawWrap.hidden = enc;
    if (!enc) els.rawOutput.textContent = Playfair.format(res.rawResult, 2);

    renderStats(res);
    renderPrep(res, originalText);
    renderSteps(res);
    renderHistogram(enc ? res.normalized : res.result, enc ? res.result : res.normalized, enc);
    highlight(res.steps[0]);
    markActiveRow(0);
  }

  function renderStats(res) {
    const s = res.stats;
    const items = [
      [s.letters, res.mode === 'encrypt' ? 'huruf plainteks' : 'huruf cipherteks'],
      [s.bigrams, 'bigram'],
      [s.fillers, res.mode === 'encrypt' ? `huruf sisipan ditambah` : `huruf sisipan dibuang`],
      [`${s.rules.baris}/${s.rules.kolom}/${s.rules.persegi}`, 'baris / kolom / persegi'],
    ];
    els.stats.innerHTML = items.map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
  }

  function chipsHtml(res) {
    const shown = res.steps.slice(0, CHIP_LIMIT);
    const html = shown
      .map((s) => {
        const pair = res.mode === 'encrypt' ? s.input : s.output;
        if (!s.note) return `<span class="chip">${pair}</span>`;
        return `<span class="chip noted">${pair[0]}<em>${pair[1]}</em></span>`;
      })
      .join('');
    const more = res.steps.length > CHIP_LIMIT ? `<span class="chip">… +${res.steps.length - CHIP_LIMIT}</span>` : '';
    return `<div class="chips">${html}${more}</div>`;
  }

  function renderPrep(res, originalText) {
    const jCount = (originalText.match(/[jJ]/g) || []).length;
    const removed = originalText.length - (originalText.match(/[A-Za-z]/g) || []).length;
    const letters = res.normalized;
    const preview = letters.length > 600 ? letters.slice(0, 600) + '…' : letters;
    const esc = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

    if (res.mode === 'encrypt') {
      els.prep.innerHTML = `
        <li><span class="label">Normalisasi</span><span class="sub">huruf kapital, ${jCount} huruf J → I, ${removed} karakter non-huruf dibuang</span>
          <pre class="mono-box">${esc(preview)}</pre></li>
        <li><span class="label">Bentuk bigram</span><span class="sub">huruf <em>bergaris bawah</em> = sisipan "${res.filler}" (huruf kembar / jumlah ganjil)</span>
          ${chipsHtml(res)}</li>`;
    } else {
      els.prep.innerHTML = `
        <li><span class="label">Normalisasi cipherteks</span><span class="sub">spasi &amp; karakter non-huruf dibuang, ${letters.length} huruf</span>
          <pre class="mono-box">${esc(preview)}</pre></li>
        <li><span class="label">Hasil dekripsi per bigram</span><span class="sub">huruf <em>bergaris bawah</em> = sisipan "${res.filler}" yang dibuang</span>
          ${chipsHtml(res)}</li>`;
    }
  }

  const RULE_TEXT = {
    encrypt: { baris: 'baris sama → geser kanan', kolom: 'kolom sama → geser bawah', persegi: 'titik sudut persegi' },
    decrypt: { baris: 'baris sama → geser kiri', kolom: 'kolom sama → geser atas', persegi: 'titik sudut persegi' },
  };
  const NOTE_TEXT = {
    encrypt: { sisip: 'sisip huruf (huruf kembar)', ganjil: 'tambah huruf (jumlah ganjil)' },
    decrypt: { sisip: 'huruf sisipan dibuang', ganjil: 'huruf tambahan akhir dibuang' },
  };

  function renderSteps(res) {
    const pos = (ps) => ps.map((p) => `(${p.row + 1},${p.col + 1})`).join(' ');
    const rows = res.steps.slice(0, TABLE_LIMIT).map((s, i) => `
      <tr data-i="${i}">
        <td class="mono">${i + 1}</td>
        <td class="pair">${s.input}</td>
        <td class="mono">${pos(s.from)}</td>
        <td><span class="tag ${s.rule}">${RULE_TEXT[res.mode][s.rule]}</span></td>
        <td class="mono">${pos(s.to)}</td>
        <td class="pair out">${s.output}</td>
        <td class="note">${s.note ? NOTE_TEXT[res.mode][s.note] : ''}</td>
      </tr>`);
    els.stepsBody.innerHTML = rows.join('');
    els.tableNote.hidden = res.steps.length <= TABLE_LIMIT;
    els.tableNote.textContent = `Menampilkan ${TABLE_LIMIT} dari ${res.steps.length} bigram. Hasil lengkap tetap tersedia pada bagian keluaran.`;
  }

  function markActiveRow(i) {
    els.stepsBody.querySelectorAll('tr.active').forEach((tr) => tr.classList.remove('active'));
    const tr = els.stepsBody.querySelector(`tr[data-i="${i}"]`);
    if (tr) tr.classList.add('active');
  }

  function renderHistogram(plain, cipher, enc) {
    els.legendIn.textContent = 'Plainteks';
    els.legendOut.textContent = 'Cipherteks';
    const a = Playfair.letterFrequency(plain);
    const b = Playfair.letterFrequency(cipher);
    const max = Math.max(1, ...a, ...b);
    els.histogram.innerHTML = a
      .map((v, i) => {
        const ch = String.fromCharCode(65 + i);
        return `<div class="hcol" title="${ch}: plainteks ${v}, cipherteks ${b[i]}">
          <div class="hbars">
            <div class="hbar in" style="height:${(v / max) * 100}%"></div>
            <div class="hbar out" style="height:${(b[i] / max) * 100}%"></div>
          </div>
          <span class="hlabel">${ch}</span>
        </div>`;
      })
      .join('');
  }

  /* ---------------- Keluaran ---------------- */

  function outputFileName() {
    const base = (state.fileName || 'teks').replace(/\.[^.]+$/, '');
    return `${base}-${state.result.mode === 'encrypt' ? 'terenkripsi' : 'terdekripsi'}.txt`;
  }

  function download() {
    if (!state.result) return;
    const blob = new Blob([els.output.value + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outputFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function flash(btn, text) {
    const old = btn.textContent;
    btn.textContent = text;
    setTimeout(() => { btn.textContent = old; }, 1400);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(els.output.value);
    } catch (_) {
      els.output.select();
      document.execCommand('copy');
    }
    flash(els.btnCopy, 'Tersalin ✓');
  }

  function swap() {
    if (!state.result) return;
    const wasEncrypt = state.result.mode === 'encrypt';
    els.input.value = els.output.value;
    document.querySelector(`input[name="mode"][value="${wasEncrypt ? 'decrypt' : 'encrypt'}"]`).checked = true;
    setFile(outputFileName(), '');
    updateModeLabels();
    els.results.hidden = true;
    hideError();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    els.key.value = '';
    els.input.value = '';
    els.file.value = '';
    els.filler.value = 'X';
    state.result = null;
    setFile(null);
    els.results.hidden = true;
    hideError();
    renderSquare();
  }

  function loadSample() {
    document.querySelector('input[name="mode"][value="encrypt"]').checked = true;
    updateModeLabels();
    els.key.value = SAMPLE.key;
    els.input.value = SAMPLE.text;
    setFile(SAMPLE.fileName, '');
    renderSquare();
    process();
  }

  /* ---------------- Event ---------------- */

  els.key.addEventListener('input', () => {
    renderSquare();
    if (state.result) highlight(null);
  });
  document.querySelectorAll('input[name="mode"]').forEach((r) =>
    r.addEventListener('change', () => {
      updateModeLabels();
      els.results.hidden = true;
      hideError();
    })
  );
  els.file.addEventListener('change', () => readFile(els.file.files[0]));
  ['dragenter', 'dragover'].forEach((ev) =>
    els.dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      els.dropzone.classList.add('drag');
    })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    els.dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      els.dropzone.classList.remove('drag');
    })
  );
  els.dropzone.addEventListener('drop', (e) => readFile(e.dataTransfer.files[0]));

  els.grouping.addEventListener('change', () => {
    if (state.result) els.output.value = Playfair.format(state.result.result, els.grouping.value);
  });

  els.btnProcess.addEventListener('click', process);
  els.btnSample.addEventListener('click', loadSample);
  els.btnReset.addEventListener('click', reset);
  els.btnDownload.addEventListener('click', download);
  els.btnCopy.addEventListener('click', copy);
  els.btnSwap.addEventListener('click', swap);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) process();
  });

  els.stepsBody.addEventListener('mouseover', (e) => {
    const tr = e.target.closest('tr[data-i]');
    if (tr && state.result) highlight(state.result.steps[Number(tr.dataset.i)]);
  });
  els.stepsBody.addEventListener('mouseleave', () => {
    if (state.result) highlight(state.result.steps[state.pinned || 0]);
  });
  els.stepsBody.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-i]');
    if (!tr) return;
    state.pinned = Number(tr.dataset.i);
    markActiveRow(state.pinned);
  });

  updateModeLabels();
  renderSquare();
})();
