/* Semua layar menu (DOM) dan alur permainan dari awal sampai akhir. */
(function () {
  'use strict';
  const D = window.PB_DATA, G = window.PB_GAME, ST = window.PB_STORE, SFX = window.PB_SFX, A = window.PB_ART;
  const $ = (id) => document.getElementById(id);
  const SCREENS = ['scrTitle', 'scrSpecies', 'scrHatch', 'scrCard', 'scrPause', 'scrOver', 'scrQuiz', 'scrResult', 'scrBoard', 'scrCta', 'scrFacts', 'scrOp'];
  const U = { cur: null, sel: { sp: null, ht: null }, run: null, quiz: null, name: '', board: { mode: 'hari', hi: null, next: 'title', attract: false, since: 0 }, cardTimer: null, rotateOk: false };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Math.round(n).toLocaleString('id-ID');
  const mult = (m) => '×' + (Number.isInteger(m) ? m + ',0' : String(m).replace('.', ','));

  function show(id) {
    for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id);
    U.cur = id;
    G.lastInput = Date.now();
    const sc = $(id);
    if (sc) sc.scrollTop = 0;
  }
  function hideAll() {
    for (const s of SCREENS) $(s).classList.add('hidden');
    U.cur = null;
  }
  function pauseBtn(v) { $('btnPause').classList.toggle('hidden', !v); }

  /* ---------------- Judul ---------------- */
  function renderTitle() {
    $('titleText').innerHTML = 'Pulang ke<br><em>Banyuwangi.</em>';
    $('subtitleText').textContent = D.subjudul;
    $('programLabel').textContent = D.labelProgram;
    const top = ST.top('hari', 5);
    $('titleTop').innerHTML = top.length
      ? top.map((e) => `<li>${esc(e.name)} <span>${fmt(e.score)}</span></li>`).join('')
      : '<li class="empty">Belum ada skor hari ini. Jadilah yang pertama!</li>';
  }

  function toTitle() {
    if (G.run && !G.run.ended) G.abandon();
    G.run = null;
    G.paused = false;
    if (G.scene !== G.Idle) G.setScene(G.Idle);
    pauseBtn(false);
    clearInterval(U.cardTimer);
    U.board.attract = false;
    renderTitle();
    show('scrTitle');
  }

  /* ---------------- Pilih penyu ---------------- */
  function buildSpecies() {
    const wrap = $('speciesCards');
    wrap.innerHTML = '';
    for (const sp of D.spesies) {
      const b = document.createElement('button');
      b.className = 'pick';
      b.dataset.id = sp.id;
      b.innerHTML = `
        <canvas width="560" height="300"></canvas>
        <h3>${esc(sp.nama)}</h3>
        <div class="latin">${esc(sp.latin)}</div>
        <div><span class="badge iucn-${esc(sp.iucn)}">${esc(sp.iucnLabel)} (${esc(sp.iucn)}) · global</span></div>
        <div class="row"><b>Ukuran:</b> ${esc(sp.ukuran)}</div>
        <div class="row"><b>Makanan:</b> ${esc(sp.makanan)}</div>
        <div class="row"><b>Gaya main:</b> ${esc(sp.gaya)}</div>
        <div class="fact">${esc(sp.fakta)}</div>`;
      b.addEventListener('click', () => {
        SFX.click();
        U.sel.sp = sp.id;
        for (const c of wrap.children) c.classList.toggle('selected', c.dataset.id === sp.id);
        $('btnSpeciesNext').disabled = false;
      });
      wrap.appendChild(b);
    }
  }

  function animPortraits(ts) {
    if (U.cur === 'scrSpecies') {
      const cards = $('speciesCards').children;
      for (let i = 0; i < cards.length; i++) {
        const cv = cards[i].querySelector('canvas');
        const sp = D.spesies[i];
        A.renderPortrait(cv, sp, ts / 1000 + i);
      }
    }
    requestAnimationFrame(animPortraits);
  }

  /* ---------------- Pilih cara menetas ---------------- */
  function buildHatch() {
    const wrap = $('hatchCards');
    wrap.innerHTML = '';
    for (const ht of D.penetasan) {
      const b = document.createElement('button');
      b.className = 'pick';
      b.dataset.id = ht.id;
      b.innerHTML = `
        <div><span class="badge lvl lvl-${esc(ht.tingkat)}">${esc(ht.tingkat)}</span></div>
        <h3>${esc(ht.nama)}</h3>
        <div class="row">${esc(ht.penjelasan)}</div>
        <div class="row"><b>Tingkat penetasan:</b> ${esc(ht.tingkatPenetasan)}</div>
        <div class="row"><b>Di game:</b> ${esc(ht.diGame)}</div>
        <div class="row"><b>Saudara tukik (nyawa):</b> <span class="lives">${'🐢'.repeat(ht.nyawa)}</span></div>
        <div class="row"><b>Pengali bonus perjalanan:</b> ${mult(ht.pengali)}</div>
        <div class="fact">${esc(ht.peran)}</div>`;
      b.addEventListener('click', () => {
        SFX.click();
        U.sel.ht = ht.id;
        for (const c of wrap.children) c.classList.toggle('selected', c.dataset.id === ht.id);
        $('btnHatchStart').disabled = false;
      });
      wrap.appendChild(b);
    }
    $('hatchNote').textContent = D.catatanPenetasan;
  }

  function startGame() {
    if (!U.sel.sp || !U.sel.ht) return;
    SFX.click();
    hideAll();
    pauseBtn(true);
    G.newRun(U.sel.sp, U.sel.ht);
  }

  /* ---------------- Kartu tahap ---------------- */
  function fill(str, sp) {
    return String(str).replace('{makanan}', sp.makanan.toLowerCase()).replace('{faktaRemaja}', sp.faktaRemaja);
  }

  function stageCard(idx, go) {
    const card = D.tahap.kartu[idx];
    const sp = G.run.sp;
    pauseBtn(false);
    $('cardLabel').textContent = card.label + ' dari 5';
    $('cardName').textContent = card.nama;
    $('cardPlace').textContent = idx===2 && sp.id==='belimbing' ? 'Laut lepas · habitat pelagis' : card.lokasi;
    $('cardText').textContent = fill(card.teks, sp);
    $('cardSource').href = D.sources.find(s=>s.id===({'lekang':'noaa-olive','hijau':'noaa-green','sisik':'noaa-hawksbill','belimbing':'noaa-leather'}[sp.id])).url;
    $('cardTips').innerHTML = card.tips.map((t) => `<li>${esc(fill(t, sp))}</li>`).join('');
    $('cardFact').textContent = fill(card.fakta, sp);
    show('scrCard');
    let n = 15;
    const btn = $('btnCardGo');
    btn.textContent = `Lanjut (${n})`;
    clearInterval(U.cardTimer);
    const done = () => {
      clearInterval(U.cardTimer);
      btn.onclick = null;
      hideAll();
      pauseBtn(true);
      go();
    };
    U.cardTimer = setInterval(() => {
      n--;
      btn.textContent = `Lanjut (${n})`;
      if (n <= 0) done();
    }, 1000);
    btn.onclick = () => { SFX.click(); done(); };
  }

  /* ---------------- Akhir permainan ---------------- */
  function runEnded(run) {
    pauseBtn(false);
    U.run = run;
    if (!run.finished) {
      $('overReason').textContent = (D.pesan[run.reason] || 'Perjalanan penyumu terhenti.') + ' Semua saudara tukik sudah berusaha sebaik mungkin.';
      show('scrOver');
    } else {
      startQuiz();
    }
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function startQuiz() {
    const qs = shuffle(D.kuis.slice()).slice(0, D.kuisJumlah).map((q) => {
      const opts = q.p.map((t, i) => ({ t: t, ok: i === q.j }));
      return { t: q.t, opts: shuffle(opts) };
    });
    U.quiz = { qs: qs, i: 0, correct: 0, answered: 0, lock: false };
    show('scrQuiz');
    renderQuiz();
  }

  function renderQuiz() {
    const Q = U.quiz, q = Q.qs[Q.i];
    $('quizCount').textContent = `Kuis · Soal ${Q.i + 1} dari ${Q.qs.length}`;
    $('quizQ').textContent = q.t;
    $('quizFeedback').textContent = '';
    const wrap = $('quizOpts');
    wrap.innerHTML = '';
    q.opts.forEach((o) => {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = o.t;
      b.addEventListener('click', () => answer(o, b));
      wrap.appendChild(b);
    });
    Q.lock = false;
  }

  function answer(o, btn) {
    const Q = U.quiz;
    if (Q.lock) return;
    Q.lock = true;
    Q.answered++;
    const q = Q.qs[Q.i];
    const btns = $('quizOpts').children;
    for (let i = 0; i < btns.length; i++) {
      btns[i].disabled = true;
      if (q.opts[i].ok) btns[i].classList.add('right');
    }
    if (o.ok) {
      Q.correct++;
      SFX.level();
      $('quizFeedback').textContent = `Benar! +${D.kuisBonus} poin`;
      $('quizFeedback').style.color = '#7ff0b8';
    } else {
      btn.classList.add('wrong');
      SFX.bad();
      $('quizFeedback').textContent = 'Kurang tepat. Jawaban yang benar ditandai hijau.';
      $('quizFeedback').style.color = '#ffb3be';
    }
    setTimeout(() => {
      if (U.cur !== 'scrQuiz' || U.quiz !== Q) return;
      Q.i++;
      if (Q.i >= Q.qs.length) finishQuiz(); else renderQuiz();
    }, 1600);
  }

  function finishQuiz() {
    const Q = U.quiz;
    U.run.quiz = Q ? Q.correct : 0;
    if (Q) ST.track((s) => { s.kuisBenar += Q.correct; s.kuisTotal += Q.answered; });
    showResult();
  }

  /* ---------------- Hasil & nama ---------------- */
  const KB = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  function buildKeyboard() {
    const kb = $('keyboard');
    kb.innerHTML = '';
    for (const row of KB) {
      const r = document.createElement('div');
      r.className = 'kb-row';
      for (const ch of row) {
        const k = document.createElement('button');
        k.className = 'key';
        k.textContent = ch;
        k.addEventListener('click', () => typeChar(ch));
        r.appendChild(k);
      }
      kb.appendChild(r);
    }
    const r = document.createElement('div');
    r.className = 'kb-row';
    const mk = (label, fn) => { const k = document.createElement('button'); k.className = 'key wide'; k.textContent = label; k.addEventListener('click', fn); r.appendChild(k); };
    mk('Spasi', () => typeChar(' '));
    mk('⌫ Hapus', () => { U.name = U.name.slice(0, -1); renderName(); SFX.click(); });
    kb.appendChild(r);
  }

  function typeChar(ch) {
    if (U.name.length >= 12) return;
    if (ch === ' ' && (U.name === '' || U.name.endsWith(' '))) return;
    let c = ch;
    if (/[A-Z]/i.test(ch)) c = U.name === '' || U.name.endsWith(' ') ? ch.toUpperCase() : ch.toLowerCase();
    U.name += c;
    renderName();
    SFX.click();
  }
  function renderName() { $('nameText').textContent = U.name; }

  function showResult() {
    const run = U.run, raw = run.raw;
    const bonus=raw.tahap+raw.jarak+raw.telur+raw.bebas;
    const quizPts=(run.quiz||0)*D.kuisBonus;
    run.total=G.scoreRun(run,true);
    $('resultTitle').textContent = run.finished ? 'Penyumu berhasil bertelur!' : 'Hasil Perjalanan';
    const rows = [
      ['Makanan benar (' + run.eaten + ' × 5)', '+' + fmt(raw.makan)],
      ['Sampah (' + run.plastic + ' × −4)', fmt(raw.sampah)],
      ['Naik tahap', fmt(raw.tahap)],
      ['Perjalanan pulang', fmt(raw.jarak)],
      [run.finished ? `Telur (${run.eggs} butir × 10)` : 'Telur', fmt(raw.telur)],
      ['Bonus Bebas Plastik' + (run.plastic > 0 ? ` (insiden plastik ${run.plastic}×)` : ''), raw.bebas ? fmt(raw.bebas) : '–'],
      ['Subtotal bonus perjalanan', fmt(bonus), 'sub'],
      [`Pengali bonus perjalanan ${run.ht.tingkat}`, mult(run.ht.pengali), 'sub'],
      [`Kuis (${run.quiz || 0} benar)`, '+' + fmt(quizPts)],
      ['TOTAL', fmt(run.total), 'total']
    ];
    $('resultTable').innerHTML = `<tr class="sub"><td colspan="2">${esc(run.sp.nama)} · ${esc(run.ht.nama)} (${esc(run.ht.tingkat)})</td></tr>` +
      rows.map((r) => `<tr class="${r[2] || ''}"><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('');
    U.name = '';
    renderName();
    $('btnSave').disabled = false;
    show('scrResult');
  }

  function saveScore() {
    const run = U.run;
    if (!run || $('btnSave').disabled) return;
    $('btnSave').disabled = true;
    SFX.click();
    const entry = ST.addEntry({
      name: ST.cleanName(U.name), score: run.total, species: run.sp.id, speciesName: run.sp.nama,
      tingkat: run.ht.tingkat, hatch: run.ht.id, eggs: run.eggs || 0, finished: run.finished
    });
    showBoard('hari', entry.id, 'cta');
  }

  /* ---------------- Papan juara ---------------- */
  function showBoard(mode, hi, next, attract) {
    U.board = { mode: mode, hi: hi, next: next, attract: !!attract, since: Date.now() };
    renderBoard();
    $('btnBoardNext').textContent = next === 'cta' ? 'Lanjut' : 'Kembali';
    show('scrBoard');
  }

  function renderBoard() {
    const B = U.board;
    for (const t of document.querySelectorAll('#scrBoard .tab')) t.classList.toggle('active', t.dataset.mode === B.mode);
    const top = ST.top(B.mode, 10);
    let html = '<tr><th>#</th><th>Nama</th><th>Penyu</th><th>Tingkat</th><th style="text-align:right">Skor</th></tr>';
    if (!top.length) html += '<tr><td colspan="5" class="empty">Belum ada skor. Ayo main dan jadi juara pertama!</td></tr>';
    top.forEach((e, i) => {
      html += `<tr class="${e.id === B.hi ? 'me' : ''}"><td class="rank">${i + 1}</td><td>${esc(e.name)}</td><td>${esc(String(e.speciesName || '').replace('Penyu ', ''))}</td>` +
        `<td><span class="badge lvl-${esc(e.tingkat)}">${esc(e.tingkat)}</span></td><td class="num">${fmt(e.score)}</td></tr>`;
    });
    $('boardTable').innerHTML = html;
    let mine = '';
    if (B.hi) {
      const rank = ST.rankOf(B.mode, B.hi);
      if (rank) mine = rank <= 10 ? `Selamat! Kamu peringkat ${rank} ${B.mode === 'hari' ? 'hari ini' : 'sepanjang pameran'}.` : `Peringkatmu: ${rank}. Coba lagi untuk masuk 10 besar!`;
    }
    $('boardMine').textContent = mine;
  }

  /* ---------------- Ajakan Bakti BCA ---------------- */
  function qrSvg() {
    const q = window.PB_QR;
    if (!q || !q.rows) return '';
    const n = q.rows.length, m = 3;
    let d = '';
    q.rows.forEach((row, y) => {
      let x = 0;
      while (x < n) {
        if (row[x] === '1') {
          const s = x;
          while (x < n && row[x] === '1') x++;
          d += `M${s + m} ${y + m}h${x - s}v1h-${x - s}z`;
        } else x++;
      }
    });
    return `<svg viewBox="0 0 ${n + 2 * m} ${n + 2 * m}" shape-rendering="crispEdges" role="img" aria-label="Kode QR"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }

  function showCta() {
    const C = D.ajakan, run = U.run;
    $('ctaTitle').textContent = run && run.finished ? C.judulSelesai : C.judulGagal;
    $('ctaParas').innerHTML = C.paragraf.map((p) => `<p>${esc(p)}</p>`).join('');
    $('ctaStats').innerHTML = C.angka.map((a) => `<div class="stat"><b>${esc(a.nilai)}</b><span>${esc(a.label)}</span></div>`).join('');
    $('ctaClose').textContent = C.penutup;
    $('ctaQr').innerHTML = qrSvg();
    $('ctaQrLabel').textContent = C.qrLabel;
    $('ctaActTitle').textContent = C.aksiJudul;
    $('ctaActs').innerHTML = C.aksi.map((a) => `<li>${esc(a)}</li>`).join('');
    $('ctaBooth').textContent = C.teksBooth;
    $('ctaBooth').classList.toggle('hidden', !C.tampilkanBooth);
    $('ctaTag').textContent = C.tagar;
    show('scrCta');
  }

  /* ---------------- Fakta ---------------- */
  function showFacts() {
    $('factList').innerHTML = D.fakta.map((f, i) => {
      const source=D.sources.find(s=>s.id===f.source);
      return `<div class="fact-item"><b>${String(i+1).padStart(2,'0')}</b><p>${esc(f.text)}</p><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.label)} ↗</a></div>`;
    }).join('');
    show('scrFacts');
  }

  /* ---------------- Operator ---------------- */
  function showOp() {
    const s = ST.stats();
    const nameOf = (id, list) => (list.find((x) => x.id === id) || { nama: id }).nama;
    const sp = Object.keys(s.spesies).map((k) => `${nameOf(k, D.spesies)}: ${s.spesies[k]}`).join(' · ') || '–';
    const ht = Object.keys(s.penetasan).map((k) => `${nameOf(k, D.penetasan)}: ${s.penetasan[k]}`).join(' · ') || '–';
    const all = ST.allEntries();
    $('opStats').innerHTML =
      `Jumlah main: <b>${s.main}</b> · Sampai bertelur: <b>${s.selesai}</b><br>` +
      `Rata-rata skor (sebelum kuis): <b>${s.main ? fmt(s.totalSkor / s.main) : 0}</b> · Skor tersimpan: <b>${all.length}</b><br>` +
      `Penyu dipilih: ${esc(sp)}<br>Cara menetas dipilih: ${esc(ht)}<br>` +
      `Kuis benar: <b>${s.kuisBenar}</b> dari ${s.kuisTotal} soal · Rata-rata insiden plastik: <b>${s.main ? (s.plastik / s.main).toFixed(1) : 0}</b> per permainan`;
    $('opQuick').checked = !!G.settings.cepat;
    $('opMute').checked = !!G.settings.bisu;
    show('scrOp');
  }

  function saveSettings() {
    ST.saveSettings(G.settings);
    SFX.setMuted(G.settings.bisu);
    $('btnSound').textContent = G.settings.bisu ? '🔇' : '🔊';
  }

  function downloadCsv() {
    const blob = new Blob(['﻿' + ST.csv()], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'papan-juara-penyu-' + ST.today() + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------------- Jeda ---------------- */
  function pauseGame() {
    if (!G.isPlaying() || G.paused) return;
    G.paused = true;
    pauseBtn(false);
    show('scrPause');
  }
  function resumeGame() {
    hideAll();
    G.paused = false;
    pauseBtn(true);
    G.lastInput = Date.now();
  }

  /* ---------------- Layar penuh & orientasi ---------------- */
  function fsSupported() { return !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen); }
  function toggleFs() {
    const d = document, el = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
  }
  function checkRotate() {
    const portrait = window.innerHeight > window.innerWidth * 1.05 && window.innerWidth < 900;
    $('rotate').classList.toggle('hidden', !portrait || U.rotateOk);
  }

  /* ---------------- Idle / mode pameran ---------------- */
  function idleTick() {
    const idle = Date.now() - G.lastInput;
    if (G.bot) return;
    if (G.isPlaying()) {
      if (U.cur === null && !G.paused && idle > 45000) toTitle();
      else if (U.cur === 'scrPause' && idle > 60000) toTitle();
      return;
    }
    if (U.cur === 'scrTitle') {
      if (idle > 25000 && ST.allEntries().length) showBoard('hari', null, 'title', true);
      return;
    }
    if (U.cur === 'scrBoard' && U.board.attract) {
      if (Date.now() - U.board.since > 12000) toTitle();
      return;
    }
    if (U.cur && U.cur !== 'scrOp' && U.cur !== 'scrCard' && idle > 60000) toTitle();
  }

  /* ---------------- Inisialisasi ---------------- */
  function init() {
    G.settings = ST.settings();
    SFX.setMuted(G.settings.bisu);
    $('btnSound').textContent = G.settings.bisu ? '🔇' : '🔊';
    G.init($('game'));
    $('btnDash').addEventListener('pointerdown',e=>{e.preventDefault();G.input.dash=true;G.lastInput=Date.now();});
    G.onStageCard = stageCard;
    G.onRunEnd = runEnded;

    buildSpecies();
    buildHatch();
    buildKeyboard();
    requestAnimationFrame(animPortraits);

    document.addEventListener('pointerdown', () => { G.lastInput = Date.now(); SFX.unlock(); }, true);
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-go]');
      if (!b) return;
      SFX.click();
      const go = b.dataset.go;
      if (go === 'title') toTitle();
      else if (go === 'species') show('scrSpecies');
      else if (go === 'board') showBoard('hari', null, 'title');
      else if (go === 'facts') showFacts();
    });
    $('btnSpeciesNext').addEventListener('click', () => { SFX.click(); show('scrHatch'); });
    $('btnHatchStart').addEventListener('click', startGame);
    $('btnPause').addEventListener('click', () => { SFX.click(); pauseGame(); });
    $('btnResume').addEventListener('click', () => { SFX.click(); resumeGame(); });
    $('btnQuit').addEventListener('click', () => { SFX.click(); toTitle(); });
    $('btnOverNext').addEventListener('click', () => { SFX.click(); startQuiz(); });
    $('btnQuizSkip').addEventListener('click', () => { SFX.click(); finishQuiz(); });
    $('btnSave').addEventListener('click', saveScore);
    $('btnBoardNext').addEventListener('click', () => {
      SFX.click();
      if (U.board.next === 'cta') showCta(); else toTitle();
    });
    for (const t of document.querySelectorAll('#scrBoard .tab')) {
      t.addEventListener('click', () => { SFX.click(); U.board.mode = t.dataset.mode; U.board.since = Date.now(); renderBoard(); });
    }
    $('btnCtaDone').addEventListener('click', () => { SFX.click(); toTitle(); });
    $('btnSound').addEventListener('click', () => { G.settings.bisu = !G.settings.bisu; saveSettings(); SFX.click(); });
    if (fsSupported()) $('btnFull').addEventListener('click', () => { SFX.click(); toggleFs(); });
    else $('btnFull').classList.add('hidden');
    $('btnRotateOk').addEventListener('click', () => { U.rotateOk = true; checkRotate(); });

    // menu operator: tahan label program 1,5 detik, atau tekan O di layar judul
    let holdT = null;
    const label = $('programLabel');
    label.addEventListener('pointerdown', () => { holdT = setTimeout(showOp, 1500); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => label.addEventListener(ev, () => clearTimeout(holdT)));
    $('opQuick').addEventListener('change', (e) => { G.settings.cepat = e.target.checked; saveSettings(); });
    $('opMute').addEventListener('change', (e) => { G.settings.bisu = e.target.checked; saveSettings(); });
    $('opCsv').addEventListener('click', downloadCsv);
    $('opResetToday').addEventListener('click', () => { if (confirm('Hapus semua skor hari ini?')) { ST.resetToday(); showOp(); } });
    $('opResetAll').addEventListener('click', () => { if (confirm('Hapus SEMUA skor di perangkat ini? Tindakan ini tidak bisa dibatalkan.')) { ST.resetAll(); showOp(); } });
    $('opResetStats').addEventListener('click', () => { if (confirm('Reset statistik perangkat ini?')) { ST.resetStats(); showOp(); } });

    document.addEventListener('keydown', (e) => {
      if (U.cur === 'scrResult') {
        if (e.key === 'Enter') { saveScore(); e.preventDefault(); return; }
        if (e.key === 'Backspace') { U.name = U.name.slice(0, -1); renderName(); e.preventDefault(); return; }
        if (e.key.length === 1 && /[A-Za-z0-9 ]/.test(e.key)) { typeChar(e.key); e.preventDefault(); }
        return;
      }
      if (U.cur === 'scrTitle' && (e.key === 'o' || e.key === 'O')) { showOp(); return; }
      if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && G.isPlaying()) {
        if (U.cur === 'scrPause') resumeGame(); else if (U.cur === null) pauseGame();
      }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
    window.addEventListener('resize', checkRotate);
    checkRotate();
    setInterval(idleTick, 1000);

    toTitle();

    if (/^https?:$/.test(location.protocol) && 'serviceWorker' in navigator && !G.debug) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* abaikan */ });
    }
  }

  window.PB_UI = U;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();


