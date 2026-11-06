/* Mesin game: loop, input, dan semua tahap permainan. */
(function () {
  'use strict';
  const D = window.PB_DATA, A = window.PB_ART, SFX = window.PB_SFX, ST = window.PB_STORE;
  const W = 1280, H = 720, SURF = 82, FLOOR = 676;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const d2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
  const dist = (ax, ay, bx, by) => Math.sqrt(d2(ax, ay, bx, by));

  const CFG = {
    goal: [0, 34, 54, 90],
    speed: [0, 280, 295, 305],
    breathDrain: [0, 3.6, 3.2, 2.8],
    migrateDur: 45,
    quick: 0.6,
    nestMash: 14,
    netMash: [0, 6, 7, 9],
    netTime: 5,
    foodScore: 5, trashPenalty: 4,
    trashDamage: { kantong: 32, robek: 32, serpih: 26, botol: 28, sedotan: 22, tutup: 20, kaleng: 24, tali: 26 }
  };

  const G = {
    W: W, H: H, SURF: SURF, FLOOR: FLOOR, CFG: CFG,
    t: 0, last: 0, paused: false, scene: null, run: null, shake: 0,
    input: { x: W / 2, y: H / 2, active: false, inside: false, type: 'mouse', keys: {}, mash: 0 },
    toastMsg: null,
    settings: { cepat: false, bisu: false },
    bot: false, debug: false,
    lastInput: Date.now(),
    onRunEnd: null, onStageCard: null
  };

  /* ---------------- Utilitas ---------------- */
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  G.rr = rr;

  function wrap(ctx, text, maxW) {
    const words = String(text).split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function newFx() { return { texts: [], parts: [] }; }
  function addText(fx, x, y, s, col, size) { fx.texts.push({ x: x, y: y, s: s, col: col || '#fff', size: size || 22, life: 1.1, max: 1.1 }); }
  function bubbles(fx, x, y, n, spread) {
    for (let i = 0; i < n; i++) fx.parts.push({ k: 'b', x: x + rand(-spread, spread), y: y + rand(-spread, spread), vx: rand(-15, 15), vy: rand(-70, -30), r: rand(2, 5), life: rand(0.6, 1.3) });
  }
  function sparkle(fx, x, y, col, n) {
    for (let i = 0; i < (n || 8); i++) {
      const a = rand(0, TAU), s = rand(60, 160);
      fx.parts.push({ k: 's', x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rand(2, 4), life: rand(0.3, 0.6), col: col || '255,255,200' });
    }
  }
  function gulp(fx, x, y, r, col) {
    fx.parts.push({ k: 'r', x: x, y: y, vx: 0, vy: 0, r: Math.max(8, r * 0.45), maxR: Math.max(24, r * 1.9), life: 0.34, max: 0.34, col: col || '210,245,255' });
    bubbles(fx, x, y, 4 + Math.round(r / 10), Math.max(6, r * 0.35));
  }
  function sand(fx, x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(60, 200);
      fx.parts.push({ k: 'd', x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rand(2, 4), life: rand(0.3, 0.7) });
    }
  }
  function updFx(fx, dt) {
    for (const p of fx.parts) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.k === 's' || p.k === 'd') { p.vx *= 0.92; p.vy *= 0.92; }
      if (p.k === 'r') p.r += (p.maxR - p.r) * 0.22;
    }
    fx.parts = fx.parts.filter((p) => p.life > 0 && (p.k !== 'b' || p.y > SURF - 4));
    for (const t of fx.texts) { t.life -= dt; t.y -= 40 * dt; }
    fx.texts = fx.texts.filter((t) => t.life > 0);
  }
  function drawFx(ctx, fx) {
    for (const p of fx.parts) {
      if (p.k === 'b') {
        ctx.strokeStyle = 'rgba(220,245,255,0.7)';
        ctx.lineWidth = 1.3;
        A.ell(ctx, p.x, p.y, p.r, p.r);
        ctx.stroke();
      } else if (p.k === 's') {
        ctx.fillStyle = `rgba(${p.col},${clamp(p.life * 2, 0, 1)})`;
        A.ell(ctx, p.x, p.y, p.r, p.r);
        ctx.fill();
      } else if (p.k === 'r') {
        ctx.strokeStyle = `rgba(${p.col},${clamp(p.life / p.max, 0, 1) * 0.72})`;
        ctx.lineWidth = Math.max(1.5, p.life * 8);
        A.ell(ctx, p.x, p.y, p.r, p.r * 0.68);
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(190,165,120,${clamp(p.life * 2, 0, 1)})`;
        A.ell(ctx, p.x, p.y, p.r, p.r);
        ctx.fill();
      }
    }
    for (const t of fx.texts) {
      ctx.globalAlpha = clamp(t.life / t.max * 1.6, 0, 1);
      ctx.font = `800 ${t.size}px "Trebuchet MS", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,30,60,0.75)';
      ctx.strokeText(t.s, t.x, t.y);
      ctx.fillStyle = t.col;
      ctx.fillText(t.s, t.x, t.y);
      ctx.globalAlpha = 1;
    }
  }

  G.isPlaying = function () { return !!(G.scene && G.scene.isPlay && G.run && !G.run.ended); };

  /* setTimeout yang batal sendiri bila permainan sudah berganti/berakhir */
  G.later = function (fn, ms) {
    const run = G.run;
    setTimeout(() => { if (G.run === run && run && !run.ended) fn(); }, ms);
  };

  G.toast = function (text, dur, kind) {
    G.toastMsg = { text: text, t: 0, dur: dur || 3, kind: kind || 'info' };
  };

  function drawToast(ctx, dt) {
    const m = G.toastMsg;
    if (!m) return;
    m.t += dt;
    if (m.t > m.dur) { G.toastMsg = null; return; }
    const a = clamp(Math.min(m.t * 5, (m.dur - m.t) * 3), 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = '700 24px "Trebuchet MS", system-ui, sans-serif';
    const lines = wrap(ctx, m.text, 760);
    const w = Math.min(840, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 56);
    const h = lines.length * 32 + 26;
    const x = W / 2 - w / 2, y = 118;
    rr(ctx, x, y, w, h, 18);
    ctx.fillStyle = m.kind === 'bad' ? 'rgba(150,30,40,0.88)' : m.kind === 'good' ? 'rgba(20,110,70,0.9)' : 'rgba(8,40,80,0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, W / 2, y + 13 + 16 + i * 32));
    ctx.restore();
  }

  /* ---------------- Input ---------------- */
  function toLocal(e) {
    const rect = G.canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width * W, y: (e.clientY - rect.top) / rect.height * H };
  }

  function bindInput() {
    const c = G.canvas;
    c.addEventListener('pointerdown', (e) => {
      const p = toLocal(e);
      G.input.x = p.x; G.input.y = p.y;
      G.input.active = true;
      G.input.inside = true;
      G.input.type = e.pointerType || 'mouse';
      G.input.mash++;
      G.input.usingKeys = false;
      G.lastInput = Date.now();
      SFX.unlock();
      try { c.setPointerCapture(e.pointerId); } catch (err) { /* abaikan */ }
      e.preventDefault();
    });
    c.addEventListener('pointermove', (e) => {
      const p = toLocal(e);
      G.input.x = p.x; G.input.y = p.y;
      G.input.type = e.pointerType || 'mouse';
      G.input.inside = true;
      if (e.pointerType === 'mouse') G.input.usingKeys = false;
      G.lastInput = Date.now();
    });
    const up = () => { G.input.active = false; };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') G.input.inside = false; });
    window.addEventListener('keydown', (e) => {
      G.lastInput = Date.now();
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      G.input.keys[e.code] = true;
      if (e.code === 'Space' || e.code === 'Enter') { if (G.isPlaying() && !G.paused && !e.repeat) G.input.mash++; }
      if (/^Arrow/.test(e.code) || e.code === 'Space') { if (G.isPlaying()) e.preventDefault(); }
      if (G.debug && G.isPlaying()) {
        if (e.code === 'KeyN' && G.scene.debugSkip) G.scene.debugSkip();
        if (e.code === 'KeyK' && G.scene.debugHurt) G.scene.debugHurt();
      }
    });
    window.addEventListener('keyup', (e) => { G.input.keys[e.code] = false; });
    window.addEventListener('blur', () => { G.input.keys = {}; G.input.active = false; });
  }

  function sandHeld() { return G.bot || G.input.active || !!G.input.keys.Space; }
  function crawlSand(p,dt,speed,target) {
    if (!sandHeld()) { p.vx=p.vy=0; return; }
    const noDirection = !G.input.inside && !keyDir().x && !keyDir().y;
    steer(p,dt,speed,9,G.bot ? target : noDirection ? target : null);
  }
  function sandHint(ctx) {
    ctx.save(); rr(ctx,18,H-43,760,29,12);ctx.fillStyle='rgba(4,29,39,.85)';ctx.fill();
    ctx.font='600 14px system-ui';ctx.fillStyle='#f4dfb6';ctx.textAlign='left';
    ctx.fillText('Tahan klik / sentuhan atau SPASI untuk mengais pasir · Mouse / WASD: arah',32,H-23);ctx.restore();
  }
  function takeMash() { const m = G.input.mash; G.input.mash = 0; return m; }

  function keyDir() {
    const k = G.input.keys;
    const x = (k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0);
    const y = (k.ArrowDown || k.KeyS ? 1 : 0) - (k.ArrowUp || k.KeyW ? 1 : 0);
    return { x: x, y: y };
  }

  function steer(p, dt, maxSpd, accel, target) {
    let dvx = 0, dvy = 0;
    const kd = keyDir();
    if (kd.x || kd.y) {
      const l = Math.hypot(kd.x, kd.y);
      dvx = kd.x / l * maxSpd;
      dvy = kd.y / l * maxSpd;
    } else {
      let tx = null, ty = null;
      if (target) { tx = target.x; ty = target.y; } else if (G.input.type === 'mouse' ? G.input.inside : G.input.active) { tx = G.input.x; ty = G.input.y; }
      if (tx !== null) {
        const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
        if (d > 4) {
          const s = Math.min(maxSpd, d * 3.2);
          dvx = dx / d * s;
          dvy = dy / d * s;
        }
      }
    }
    const a = 1 - Math.exp(-accel * dt);
    p.vx += (dvx - p.vx) * a;
    p.vy += (dvy - p.vy) * a;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }

  /* ---------------- HUD ---------------- */
  function drawLives(ctx, x, y) {
    const r = G.run;
    for (let i = 0; i < r.maxLives; i++) {
      ctx.globalAlpha = i < r.lives ? 1 : 0.25;
      A.turtleTop(ctx, x + i * 34, y, 11, r.sp, { angle: -Math.PI / 2, t: G.t + i, crawl: i < r.lives ? 0.4 : 0 });
    }
    ctx.globalAlpha = 1;
  }

  function bar(ctx, x, y, w, h, v, col, bg) {
    rr(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = bg || 'rgba(255,255,255,0.18)';
    ctx.fill();
    if (v > 0.001) {
      rr(ctx, x, y, Math.max(h, w * clamp(v, 0, 1)), h, h / 2);
      ctx.fillStyle = col;
      ctx.fill();
    }
  }

  function drawHUD(ctx, o) {
    const run = G.run;
    ctx.save();
    ctx.font = '800 18px "Trebuchet MS", system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    // panel kiri
    rr(ctx, 14, 10, 300, o.meters ? 98 : 50, 16);
    ctx.fillStyle = 'rgba(4,30,60,0.62)';
    ctx.fill();
    drawLives(ctx, 38, 35);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.font = '700 15px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillText('Saudara tukik', 302, 35);
    if (o.meters) {
      A.heart(ctx, 34, 70, 10);
      bar(ctx, 52, 63, 248, 14, run.health / 100, run.health < 35 ? '#ff5d73' : '#ff8fa0');
      if (o.breath !== false) {
        A.bubbleIcon(ctx, 32, 93, 12);
        const bv = run.breath / 100;
        bar(ctx, 52, 86, 248, 14, bv, bv < 0.25 ? (Math.floor(G.t * 6) % 2 ? '#ffd166' : '#ff9f43') : '#7fd8ff');
      }
    }
    // panel tengah
    if (o.center) {
      rr(ctx, W / 2 - 230, 10, 460, 62, 16);
      ctx.fillStyle = 'rgba(4,30,60,0.62)';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = '800 18px "Trebuchet MS", system-ui, sans-serif';
      ctx.fillText(o.center.label, W / 2, 28);
      if (o.center.icon === 'leaf') A.leafIcon(ctx, W / 2 - 200, 54, 10);
      bar(ctx, W / 2 - 184, 47, 400, 15, o.center.v, o.center.col || '#7ee08a');
    }
    // panel kanan (skor)
    const sx = W / 2 + 244;
    rr(ctx, sx, 10, 180, 62, 16);
    ctx.fillStyle = 'rgba(4,30,60,0.62)';
    ctx.fill();
    ctx.fillStyle = '#9fd8ff';
    ctx.textAlign = 'left';
    ctx.font = '700 14px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillText('SKOR', sx + 16, 28);
    ctx.fillStyle = '#fff';
    ctx.font = '800 28px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillText(G.score().toLocaleString('id-ID'), sx + 16, 54);
    ctx.restore();
  }

  /* ---------------- Skor & alur ---------------- */
  G.rawTotal = function () {
    const r=G.run.raw; return r.makan+r.sampah+r.tahap+r.jarak+r.telur+r.bebas;
  };
  G.scoreRun = function(run,withQuiz=false) {
    const r=run.raw;
    const bonus=Math.round((r.tahap+r.jarak+r.telur+r.bebas)*run.ht.pengali);
    return bonus+r.makan+r.sampah+(withQuiz?(run.quiz||0)*D.kuisBonus:0);
  };
  G.score = function() { return G.run ? G.scoreRun(G.run) : 0; };
  G.recordFood = function(run) { run.raw.makan+=CFG.foodScore;run.eaten++;return CFG.foodScore; };
  G.recordTrash = function(run,type) {
    run.raw.sampah-=CFG.trashPenalty; run.health-=CFG.trashDamage[type]||26;
    run.plasticFree=false;run.plastic++;
  };

  G.newRun = function (spId, htId) {
    const sp = D.spesies.find((s) => s.id === spId) || D.spesies[0];
    const ht = D.penetasan.find((h) => h.id === htId) || D.penetasan[0];
    G.run = {
      sp: sp, ht: ht, lives: ht.nyawa, maxLives: ht.nyawa,
      raw: { makan: 0, sampah: 0, tahap: 0, jarak: 0, telur: 0, bebas: 0 },
      eaten: 0, health: 100, breath: 100, plasticFree: true, plastic: 0,
      eggs: 0, disturbed: 0, stage: 0, finished: false, reason: '', start: Date.now()
    };
    ST.track((s) => {
      s.main++;
      s.spesies[sp.id] = (s.spesies[sp.id] || 0) + 1;
      s.penetasan[ht.id] = (s.penetasan[ht.id] || 0) + 1;
    });
    G.paused = false;
    G.setScene(Beach);
  };

  G.setScene = function (sc, arg) {
    G.scene = sc;
    G.toastMsg = null;
    G.input.mash = 0;
    if (sc.enter) sc.enter(arg);
  };

  G.stageCard = function (idx, cb) {
    G.paused = true;
    const run = G.run;
    const go = () => { if (G.run !== run) return; G.paused = false; G.lastInput = Date.now(); cb(); };
    if (G.onStageCard) G.onStageCard(idx, go); else go();
  };

  G.loseLife = function (reason) {
    const r = G.run;
    r.lives--;
    SFX.hurt();
    G.shake = 0.35;
    if (r.lives <= 0) {
      r.lives = 0;
      r.reason = reason;
      G.endRun(false);
      return false;
    }
    r.health = 100;
    r.breath = 100;
    G.toast((D.pesan[reason] || '') + ' ' + D.pesan.saudara, 2.8, 'bad');
    return true;
  };

  G.endRun = function (finished) {
    const r = G.run;
    if (!r || r.ended) return;
    r.ended = true;
    r.finished = finished;
    if (!finished) r.raw.bebas = 0;
    r.final = G.score();
    ST.track((s) => {
      if (finished) s.selesai++;
      s.totalSkor += r.final;
      s.plastik += r.plastic;
    });
    const delay = finished ? 0.4 : 1.4;
    G.scene.frozen = true;
    setTimeout(() => {
      if (G.run !== r) return;
      G.setScene(Idle);
      if (G.onRunEnd) G.onRunEnd(r);
    }, delay * 1000);
  };

  G.abandon = function () {
    G.run = null;
    G.paused = false;
    G.setScene(Idle);
  };

  /* ================================================================
   * Latar laut (dipakai Idle, Laut, Migrasi)
   * ================================================================ */
  const bgCache = {};
  function seabedY(x, stage) {
    return FLOOR - 8 + Math.sin(x * 0.0065 + stage * 1.7) * 21 + Math.sin(x * 0.014 + stage * 0.8) * 11 + Math.sin(x * 0.041 + stage) * 3;
  }

  function oceanPalette(stage) {
    if (stage === 2) return { sky: ['#8fd8ff', '#e2f7ff'], water: ['#409f9e', '#196976', '#103d52'], sand: ['#e6cf98', '#c9ad73'] };
    if (stage === 3) return { sky: ['#6fb0e6', '#cbe7fb'], water: ['#367e92', '#164c66', '#0b2d46'], sand: ['#3e4b5a', '#2c3542'] };
    return { sky: ['#8fd3ff', '#dcf3ff'], water: ['#3c9aa4', '#1b697f', '#103e59'], sand: ['#c9b07b', '#a08857'] };
  }

  function buildOceanBG(stage) {
    if (bgCache[stage]) return bgCache[stage];
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    const pal = oceanPalette(stage);
    let g = x.createLinearGradient(0, 0, 0, SURF);
    g.addColorStop(0, pal.sky[0]);
    g.addColorStop(1, pal.sky[1]);
    x.fillStyle = g;
    x.fillRect(0, 0, W, SURF);
    // awan
    x.fillStyle = 'rgba(255,255,255,0.75)';
    const rc = A.rng(stage * 31 + 5);
    for (let i = 0; i < 6; i++) {
      const cx = rc() * W, cy = 20 + rc() * 30;
      for (let k = 0; k < 4; k++) { A.ell(x, cx + k * 18, cy + (k % 2) * 5, 22, 11); x.fill(); }
    }
    g = x.createLinearGradient(0, SURF, 0, H);
    g.addColorStop(0, pal.water[0]);
    g.addColorStop(0.55, pal.water[1]);
    g.addColorStop(1, pal.water[2]);
    x.fillStyle = g;
    x.fillRect(0, SURF, W, H - SURF);
    // Distant banks have no collision; atmospheric layers keep the swim lane open.
    for (let layer=0;layer<3;layer++) {
      x.fillStyle=['#0b536320','#0a485438','#063e4c48'][layer];
      x.beginPath();x.moveTo(0,H);
      for(let px=0;px<=W;px+=18) x.lineTo(px,530+layer*45+Math.sin(px*.004+layer*2+stage)*44+Math.sin(px*.01+layer)*18);
      x.lineTo(W,H);x.closePath();x.fill();
    }
    const sun=x.createRadialGradient(1040,90,10,1040,90,700);sun.addColorStop(0,'#c8edc22e');sun.addColorStop(1,'#c8edc200');x.fillStyle=sun;x.fillRect(0,SURF,W,H-SURF);
    // dasar laut
    x.fillStyle = pal.sand[0];
    x.beginPath();
    x.moveTo(0, H);
    for (let px = 0; px <= W; px += 16) x.lineTo(px, seabedY(px, stage));
    x.lineTo(W, H);
    x.closePath();
    x.fill();
    x.strokeStyle = stage === 3 ? 'rgba(115,140,160,0.34)' : 'rgba(255,235,180,0.42)';
    x.lineWidth = 4; x.beginPath();
    for (let px = 0; px <= W; px += 16) { const py = seabedY(px, stage); if (px === 0) x.moveTo(px, py); else x.lineTo(px, py); }
    x.stroke();
    x.fillStyle = pal.sand[1];
    const rs = A.rng(stage * 7 + 1);
    for (let i = 0; i < 260; i++) { const dx = rs() * W; A.ell(x, dx, seabedY(dx, stage) + 10 + rs() * 42, 1.5 + rs() * 2, 1 + rs()); x.fill(); }
    if (stage !== 2) {
      const rd = A.rng(stage * 133 + 17), count = stage === 1 ? 18 : 13;
      for (let i = 0; i < count; i++) {
        const cx = 25 + rd() * (W - 50), cy = seabedY(cx, stage) + 7, h = 18 + rd() * 28;
        x.strokeStyle = stage === 3 ? 'rgba(105,125,145,0.62)' : ['#d9857d','#b879a0','#cf9d68'][i % 3];
        x.lineWidth = 4 + rd() * 3; x.lineCap = 'round';
        x.beginPath(); x.moveTo(cx, cy); x.quadraticCurveTo(cx - 8, cy - h * .55, cx - 4, cy - h); x.stroke();
        x.beginPath(); x.moveTo(cx - 3, cy - h * .42); x.lineTo(cx - 15 - rd()*8, cy - h * .72); x.stroke();
        x.beginPath(); x.moveTo(cx - 4, cy - h * .62); x.lineTo(cx + 10 + rd()*8, cy - h * .9); x.stroke();
      }
    }
    if (stage === 2) {
      // terumbu karang dekoratif yang padat; bukan makanan dan tidak memengaruhi tabrakan.
      const rk = A.rng(99);
      for (let i = 0; i < 23; i++) {
        const cx = 18 + (i * 43) % (W - 30) + rk() * 24, cy = seabedY(cx, stage) + 10;
        const type = i % 4;
        if (type === 0) {
          x.strokeStyle = ['#ff7f7f', '#ffa07a', '#f78fb3'][i % 3];
          x.lineWidth = 7;
          x.lineCap = 'round';
          const br = (bx, by, a, l, d) => {
            if (d > 3) return;
            const ex = bx + Math.cos(a) * l, ey = by + Math.sin(a) * l;
            x.beginPath(); x.moveTo(bx, by); x.lineTo(ex, ey); x.stroke();
            br(ex, ey, a - 0.45, l * 0.72, d + 1);
            br(ex, ey, a + 0.4, l * 0.7, d + 1);
          };
          br(cx, cy, -Math.PI / 2, 30 + rk() * 10, 0);
        } else if (type === 1) {
          x.fillStyle = '#c0a060';
          A.ell(x, cx, cy - 6, 34, 24);
          x.fill();
          x.strokeStyle = 'rgba(90,60,20,0.45)';
          x.lineWidth = 2;
          for (let k = 0; k < 5; k++) { x.beginPath(); x.ellipse(cx, cy - 6, 30 - k * 6, 20 - k * 4, 0, Math.PI, TAU); x.stroke(); }
        } else if (type === 2) {
          x.fillStyle = 'rgba(155,89,182,0.85)';
          x.beginPath();
          x.moveTo(cx, cy);
          x.quadraticCurveTo(cx - 45, cy - 40, cx - 20, cy - 75);
          x.quadraticCurveTo(cx, cy - 85, cx + 20, cy - 75);
          x.quadraticCurveTo(cx + 45, cy - 40, cx, cy);
          x.fill();
          x.strokeStyle = 'rgba(80,30,100,0.5)';
          x.lineWidth = 1.5;
          for (let k = -3; k <= 3; k++) { x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + k * 8, cy - 70); x.stroke(); }
        } else {
          x.fillStyle = '#6c7a89';
          A.ell(x, cx, cy - 4, 40, 18);
          x.fill();
        }
      }
    } else {
      const rk = A.rng(stage * 13);
      x.fillStyle = stage === 3 ? '#232c38' : '#8a7550';
      for (let i = 0; i < 9; i++) { A.ell(x, rk() * W, FLOOR + 10, 20 + rk() * 40, 10 + rk() * 12); x.fill(); }
    }
    bgCache[stage] = c;
    return c;
  }

  function drawRays(ctx, t, alpha) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const x0 = ((i * 260 + t * 12) % (W + 400)) - 200;
      const sw = Math.sin(t * 0.5 + i) * 30;
      const g = ctx.createLinearGradient(0, SURF, 0, H * 0.9);
      g.addColorStop(0, `rgba(255,255,255,${0.09 * alpha})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0, SURF);
      ctx.lineTo(x0 + 70, SURF);
      ctx.lineTo(x0 + 190 + sw, H * 0.9);
      ctx.lineTo(x0 + 60 + sw, H * 0.9);
      ctx.closePath();
      ctx.fill();
    }
    // Slow caustic ribbons near the sand, with no flashing.
    ctx.strokeStyle='rgba(169,224,202,.055)';ctx.lineWidth=2;
    for(let row=0;row<3;row++) {
      ctx.beginPath();for(let x=0;x<=W;x+=16){const y=615+row*27+Math.sin(x*.016+t*.5+row)*10;if(x)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.stroke();
    }
    ctx.restore();
  }

  function drawSurface(ctx, t) {
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.moveTo(0, SURF - 4);
    for (let x = 0; x <= W; x += 16) ctx.lineTo(x, SURF + Math.sin(x * 0.03 + t * 2) * 3 - 2);
    for (let x = W; x >= 0; x -= 16) ctx.lineTo(x, SURF + Math.sin(x * 0.03 + t * 2) * 3 + 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 16) {
      const y = SURF + Math.sin(x * 0.03 + t * 2) * 3 - 2;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function ambient(fx, dt) {
    if (Math.random() < dt * 3) bubbles(fx, rand(0, W), FLOOR - 10, 1, 4);
  }

  /* ================================================================
   * Idle: latar animasi di balik menu
   * ================================================================ */
  const Idle = {
    isPlay: false,
    enter: function () {
      this.fx = newFx();
      this.swimmers = D.spesies.map((sp, i) => ({ sp: sp, x: rand(0, W), y: 200 + i * 110, v: rand(40, 70) * (i % 2 ? -1 : 1), r: 26 * sp.stat.size, ph: rand(0, 6) }));
      this.fish = [];
      for (let i = 0; i < 9; i++) this.fish.push({ x: rand(0, W), y: rand(150, 600), v: rand(30, 60) * (Math.random() < 0.5 ? -1 : 1), r: rand(8, 13) });
    },
    update: function (dt) {
      for (const s of this.swimmers) {
        s.x += s.v * dt;
        if (s.x > W + 120) s.x = -120;
        if (s.x < -120) s.x = W + 120;
      }
      for (const f of this.fish) {
        f.x += f.v * dt;
        if (f.x > W + 40) f.x = -40;
        if (f.x < -40) f.x = W + 40;
      }
      ambient(this.fx, dt);
      updFx(this.fx, dt);
    },
    draw: function (ctx) {
      ctx.drawImage(buildOceanBG(2), 0, 0);
      drawRays(ctx, G.t, 1);
      drawSurface(ctx, G.t);
      for (const f of this.fish) A.fish(ctx, f.x, f.y, f.r, { t: G.t, facing: f.v > 0 ? 1 : -1, body: 'rgba(255,214,90,0.9)', belly: 'rgba(255,245,200,0.9)', fin: 'rgba(240,160,60,0.9)' });
      for (const s of (document.getElementById('scrTitle').classList.contains('hidden') ? this.swimmers : [])) {
        A.turtleSide(ctx, s.x, s.y + Math.sin(G.t + s.ph) * 10, s.r, s.sp, { t: G.t + s.ph, facing: s.v > 0 ? 1 : -1, tilt: Math.cos(G.t + s.ph) * 0.12, swim: 0.6 });
      }
      if (!document.getElementById('scrTitle').classList.contains('hidden')) {
        A.turtleSide(ctx, 970, 345 + Math.sin(G.t*.8)*12, 133, D.spesies[1], {t:G.t, facing:-1, tilt:-.13, swim:.28});
      }
      drawFx(ctx, this.fx);
    }
  };

  /* ================================================================
   * Tahap 0: Menetas dan lari ke laut (pantai malam, tampak atas)
   * ================================================================ */
  let sandCache = {};
  function buildSand(kind) {
    if (sandCache[kind]) return sandCache[kind];
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    let g;
    if (kind === 'hatch') {
      g = x.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, '#8a7f62');
      g.addColorStop(0.75, '#7d7358');
      g.addColorStop(1, '#5e5643');
    } else {
      g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#857a5e');
      g.addColorStop(0.7, '#7d7358');
      g.addColorStop(1, '#5e5643');
    }
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    const r = A.rng(kind === 'hatch' ? 4 : 9);
    for (let i = 0; i < 4500; i++) {
      x.fillStyle = r() < 0.5 ? 'rgba(255,240,200,0.08)' : 'rgba(0,0,0,0.1)';
      x.fillRect(r() * W, r() * H, 2, 2);
    }
    x.strokeStyle = 'rgba(0,0,0,0.08)';
    x.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      const sx = r() * W, sy = r() * H;
      x.beginPath();
      x.moveTo(sx, sy);
      x.quadraticCurveTo(sx + 40, sy + (kind === 'hatch' ? 30 : -6), sx + 80, sy + (kind === 'hatch' ? 0 : 4));
      x.stroke();
    }
    if (kind === 'nest') {
      // vegetasi pantai di atas
      g = x.createLinearGradient(0, 0, 0, 150);
      g.addColorStop(0, '#16301f');
      g.addColorStop(1, 'rgba(22,48,31,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, W, 150);
    } else {
      g = x.createLinearGradient(0, 0, 160, 0);
      g.addColorStop(0, '#16301f');
      g.addColorStop(1, 'rgba(22,48,31,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 160, H);
    }
    sandCache[kind] = c;
    return c;
  }

  function drawSeaSide(ctx, t, seaX) {
    // laut di sisi kanan
    const g = ctx.createLinearGradient(seaX, 0, W, 0);
    g.addColorStop(0, '#1d4f73');
    g.addColorStop(1, '#0c2a47');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(W, 0);
    for (let y = 0; y <= H; y += 12) ctx.lineTo(seaX + Math.sin(y * 0.02 + t * 1.4) * 10 + Math.sin(t * 0.8) * 8, y);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let y = 0; y <= H; y += 12) {
      const xx = seaX + Math.sin(y * 0.02 + t * 1.4) * 10 + Math.sin(t * 0.8) * 8;
      if (y === 0) ctx.moveTo(xx, y); else ctx.lineTo(xx, y);
    }
    ctx.stroke();
    // pantulan bulan
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 12; i++) {
      const yy = 120 + i * 40, xx = seaX + 60 + ((i * 37) % 90);
      ctx.fillStyle = `rgba(220,235,255,${0.12 + 0.08 * Math.sin(t * 2 + i)})`;
      A.ell(ctx, xx, yy, 30, 4);
      ctx.fill();
    }
    ctx.restore();
  }


  function drawBeachDepthSide(ctx, t, seaX) {
    // Lapisan pasir basah membuat transisi pantai-laut lebih dalam tanpa aset eksternal.
    const wet = ctx.createLinearGradient(seaX - 165, 0, seaX + 28, 0);
    wet.addColorStop(0, 'rgba(38,55,55,0)');
    wet.addColorStop(0.45, 'rgba(45,70,72,0.18)');
    wet.addColorStop(0.82, 'rgba(80,105,105,0.34)');
    wet.addColorStop(1, 'rgba(150,190,190,0.12)');
    ctx.fillStyle = wet; ctx.fillRect(seaX - 180, 0, 215, H);
    ctx.save(); ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let y = -10; y <= H + 10; y += 14) {
        const x = seaX - 16 - k * 27 + Math.sin(y * 0.022 + t * (1.15 - k * .12) + k) * (12 + k * 3);
        if (y < 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(235,247,242,${0.34 - k * .08})`; ctx.lineWidth = 3 - k * .55; ctx.stroke();
    }
    ctx.restore();
  }

  function drawBeachDepthBottom(ctx, t, seaY) {
    const wet = ctx.createLinearGradient(0, seaY - 145, 0, seaY + 35);
    wet.addColorStop(0, 'rgba(33,48,47,0)'); wet.addColorStop(.55, 'rgba(42,66,66,.2)'); wet.addColorStop(1, 'rgba(90,130,130,.3)');
    ctx.fillStyle = wet; ctx.fillRect(0, seaY - 155, W, 195);
    ctx.save(); ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let x = -10; x <= W + 10; x += 18) {
        const y = seaY - 12 - k * 24 + Math.sin(x * .018 + t * (1.2 - k * .14) + k) * (7 + k * 2);
        if (x < 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(235,247,242,${.32 - k * .07})`; ctx.lineWidth = 3 - k * .55; ctx.stroke();
    }
    // Detail kecil konsisten, dihitung deterministik agar stabil dan murah.
    for (let i = 0; i < 22; i++) {
      const x = 35 + ((i * 137) % (W - 70)), y = seaY - 175 - ((i * 61) % 270);
      ctx.strokeStyle = i % 3 ? 'rgba(225,205,155,.28)' : 'rgba(120,82,52,.28)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 3 + i % 4, Math.PI * .15, Math.PI * 1.65); ctx.stroke();
    }
    ctx.restore();
  }

  const Beach = {
    isPlay: true,
    enter: function () {
      const id = G.run.ht.id;
      this.mode = id;
      this.t = 0;
      this.frozen = false;
      this.seaX = 1110;
      this.fx = newFx();
      this.start = id === 'alami' ? { x: 150, y: 380 } : id === 'semi' ? { x: 360, y: 380 } : { x: 540, y: 380 };
      this.p = { x: this.start.x, y: this.start.y, vx: 0, vy: 0, r: 12, angle: 0, inv: 1, hold: 0 };
      this.crabs = [];
      const nCrab = { alami: 5, semi: 3, intan: 1 }[id];
      for (let i = 0; i < nCrab; i++) {
        const x0 = lerp(this.start.x + 150, this.seaX - 80, (i + 0.5) / nCrab) + rand(-30, 30);
        const y0 = rand(140, 620);
        this.crabs.push({ x: x0, y: y0, hy: y0, dir: Math.random() < 0.5 ? 1 : -1, sp: rand(65, 95), range: rand(80, 140), st: 'jalan', tt: 0, vx: 0, vy: 0, ang: 0 });
      }
      this.birdMax = { alami: 1, semi: 1, intan: 0 }[id];
      this.birds = [];
      this.birdT = id === 'alami' ? 2.2 : 3.5;
      this.lamp = id === 'alami' ? { x: 600, y: 22, R: 290 } : null;
      this.logs = [];
      const nLog = { alami: 6, semi: 3, intan: 2 }[id];
      for (let i = 0; i < nLog; i++) {
        let lx, ly, ok = false, tries = 0;
        while (!ok && tries++ < 40) {
          lx = rand(this.start.x + 90, this.seaX - 90);
          ly = rand(110, 640);
          ok = d2(lx, ly, this.start.x, this.start.y) > 120 * 120 && this.logs.every((l) => d2(l.x, l.y, lx, ly) > 140 * 140);
        }
        this.logs.push({ x: lx, y: ly, r: rand(16, 22), rot: rand(0, 3), trash: Math.random() < 0.5 });
      }
      this.trail = [];
      this.lastTrail = { x: this.p.x, y: this.p.y };
      this.done = false;
      this.lampHint = false;
      G.toast(D.tahap.menetas[id], 4.5);
    },
    reset: function () {
      this.p.x = this.start.x;
      this.p.y = this.start.y;
      this.p.vx = this.p.vy = 0;
      this.p.inv = 2.0;
      this.p.hold = 0.6;
      this.birds = [];
    },
    caught: function (reason) {
      if (this.p.inv > 0 || this.done) return;
      sparkle(this.fx, this.p.x, this.p.y, '255,120,120', 12);
      if (G.loseLife(reason)) this.reset();
      else this.done = true;
    },
    botTarget: function () {
      const p = this.p;
      let tx = this.seaX + 40, ty = p.y;
      let ax = 0, ay = 0;
      for (const c of this.crabs) { const d = dist(p.x, p.y, c.x, c.y); if (d < 170) { ax += (p.x - c.x) / d * (170 - d) * 6; ay += (p.y - c.y) / d * (170 - d) * 6; } }
      for (const b of this.birds) { const d = dist(p.x, p.y, b.x, b.y); if (d < 120) { ax += (p.x - b.x) / d * 400; ay += (p.y - b.y) / d * 400; } }
      if (this.lamp) { const d = dist(p.x, p.y, this.lamp.x, this.lamp.y); if (d < this.lamp.R + 40) ay += 300; }
      for (const l of this.logs) { const d = dist(p.x, p.y, l.x, l.y); if (d < 70) { ay += (p.y - l.y >= 0 ? 1 : -1) * 260; } }
      return { x: tx + ax, y: clamp(ty + ay, 100, 660) };
    },
    debugSkip: function () { this.p.x = this.seaX; },
    debugHurt: function () { this.caught('kepiting'); },
    update: function (dt) {
      if (this.frozen) return;
      this.t += dt;
      const p = this.p, sp = G.run.sp;
      p.inv -= dt;
      if (p.hold > 0) {
        p.hold -= dt;
      } else if (!this.done) {
        crawlSand(p,dt,52*sp.stat.speed,G.bot?this.botTarget():{x:this.seaX+30,y:p.y});
        if(sandHeld() && Math.random()<dt*12) sand(this.fx,p.x-9,p.y+4,2);
      }
      // tarikan cahaya lampu
      if (this.lamp && !this.done && sandHeld()) {
        const L = this.lamp, d = dist(p.x, p.y, L.x, L.y);
        if (d < L.R) {
          const s = Math.pow(1 - d / L.R, 1.2) * 190;
          p.x += (L.x - p.x) / d * s * dt;
          p.y += (L.y - p.y) / d * s * dt;
          if (!this.lampHint) { this.lampHint = true; G.toast('Jangan ikuti cahaya lampu! Tukik bisa tersesat menjauhi laut.', 3.5, 'bad'); }
          if (d < 60) this.caught('lampu');
        }
      }
      // rintangan
      for (const l of this.logs) {
        const rr2 = l.r + p.r, d = dist(p.x, p.y, l.x, l.y);
        if (d < rr2 && d > 0.01) { p.x = l.x + (p.x - l.x) / d * rr2; p.y = l.y + (p.y - l.y) / d * rr2; }
      }
      p.x = clamp(p.x, 20, W - 20);
      p.y = clamp(p.y, 20, H - 20);
      if (Math.hypot(p.vx, p.vy) > 10) p.angle = Math.atan2(p.vy, p.vx);
      if (dist(p.x, p.y, this.lastTrail.x, this.lastTrail.y) > 9) {
        this.trail.push({ x: p.x, y: p.y, a: p.angle });
        if (this.trail.length > 200) this.trail.shift();
        this.lastTrail = { x: p.x, y: p.y };
      }
      // kepiting hantu
      for (const c of this.crabs) {
        c.tt -= dt;
        const dp = dist(p.x, p.y, c.x, c.y);
        if (c.st === 'jalan') {
          c.y += c.dir * c.sp * dt;
          if (Math.abs(c.y - c.hy) > c.range) c.dir *= -1;
          c.ang = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          if (dp < 110 && p.inv <= 0 && !this.done) {
            c.st = 'siap';
            c.tt = 0.65;
          }
        } else if (c.st === 'siap') {
          // jeda singkat sebelum menerjang, supaya pemain sempat menghindar
          c.ang = Math.atan2(p.y - c.y, p.x - c.x);
          if (c.tt <= 0) {
            c.st = 'kejar';
            c.tt = 0.55;
            c.vx = Math.cos(c.ang) * 110;
            c.vy = Math.sin(c.ang) * 110;
          }
        } else if (c.st === 'kejar') {
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          c.ang = Math.atan2(c.vy, c.vx);
          if (c.tt <= 0) { c.st = 'diam'; c.tt = 1.4; }
        } else if (c.tt <= 0) { c.st = 'jalan'; c.hy = c.y; }
        if (dp < p.r + 11) this.caught('kepiting');
      }
      // burung
      if (this.birdMax > 0 && !this.done) {
        this.birdT -= dt;
        if (this.birdT <= 0 && this.birds.length < this.birdMax && p.inv <= 0) {
          this.birdT = this.mode === 'alami' ? rand(2.0, 3.0) : rand(3.5, 4.8);
          this.birds.push({ x: clamp(p.x + p.vx * 0.8 + rand(-25, 25), 40, this.seaX - 20), y: clamp(p.y + p.vy * 0.8 + rand(-25, 25), 40, H - 40), st: 'bayang', tt: 1.45, R: 30 });
        }
      }
      for (const b of this.birds) {
        b.tt -= dt;
        if (b.st === 'bayang' && b.tt <= 0) {
          b.st = 'sambar';
          b.tt = 0.3;
          SFX.warn();
          if (dist(p.x, p.y, b.x, b.y) < b.R) this.caught('burung');
        } else if (b.st === 'sambar' && b.tt <= 0) { b.st = 'pergi'; b.tt = 0.7; }
      }
      this.birds = this.birds.filter((b) => !(b.st === 'pergi' && b.tt <= 0));
      // sampai di laut
      if (!this.done && p.x >= this.seaX - 6) {
        this.done = true;
        SFX.level();
        G.run.raw.tahap += 300;
        G.run.stage = 1;
        sparkle(this.fx, p.x, p.y, '200,240,255', 16);
        G.toast('Berhasil sampai ke laut!', 2, 'good');
        G.later(() => G.stageCard(1, () => G.setScene(Ocean, 1)), 900);
      }
      updFx(this.fx, dt);
    },
    draw: function (ctx) {
      const t = G.t, p = this.p, sp = G.run.sp;
      ctx.drawImage(buildSand('hatch'), 0, 0);
      drawSeaSide(ctx, t, this.seaX);
      drawBeachDepthSide(ctx, t, this.seaX);
      // jejak
      ctx.fillStyle = 'rgba(30,25,15,0.35)';
      for (let i = 0; i < this.trail.length; i += 2) {
        const tr = this.trail[i];
        for (const s of [-1, 1]) {
          A.ell(ctx, tr.x + Math.cos(tr.a + s * 1.6) * 7, tr.y + Math.sin(tr.a + s * 1.6) * 7, 2.2, 1.4, tr.a);
          ctx.fill();
        }
      }
      // sarang & elemen per metode
      if (this.mode === 'alami') {
        A.nestPit(ctx, this.start.x, this.start.y, 34);
      } else if (this.mode === 'semi') {
        A.fence(ctx, this.start.x, this.start.y, 230, 180);
        A.nestPit(ctx, this.start.x - 40, this.start.y, 26);
        A.person(ctx, this.start.x - 80, this.start.y - 120, 16, Math.PI / 2, 0, '#ff8a3d');
        A.person(ctx, this.start.x + 30, this.start.y + 130, 16, -Math.PI / 2, 0, '#ff8a3d');
      } else {
        A.incubator(ctx, this.start.x - 110, this.start.y - 70, t);
        A.person(ctx, this.start.x - 60, this.start.y + 50, 17, 0, 0, '#ff8a3d');
      }
      // saudara tukik di sarang
      for (let i = 0; i < G.run.lives - 1; i++) {
        A.turtleTop(ctx, this.start.x - 14 + (i % 2) * 18, this.start.y - 14 + Math.floor(i / 2) * 18, 8, sp, { angle: 0, t: t + i, crawl: 0.3 });
      }
      for (const l of this.logs) {
        if (l.trash) A.trashPile(ctx, l.x, l.y, l.r, Math.floor(l.x));
        else A.log(ctx, l.x, l.y, l.r, l.rot);
      }
      for (const c of this.crabs) {
        A.ghostCrab(ctx, c.x, c.y, 15, c.st === 'diam' ? 0 : t, c.ang);
        if (c.st === 'siap' || c.st === 'kejar') {
          ctx.fillStyle = '#ff5d73';
          ctx.font = '900 20px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('!', c.x, c.y - 22);
        }
      }
      // tukik
      if (!(p.inv > 0 && Math.floor(t * 10) % 2)) A.turtleTop(ctx, p.x, p.y, p.r, sp, { angle: p.angle, t: t, crawl: Math.min(1, Math.hypot(p.vx, p.vy) / 60) });
      // burung
      for (const b of this.birds) {
        if (b.st === 'bayang') {
          const k = 1 - b.tt / 1.45;
          ctx.fillStyle = `rgba(0,0,0,${0.20 + k * 0.42})`;
          A.ell(ctx, b.x, b.y, b.R * (0.5 + k * 0.5), b.R * (0.35 + k * 0.35));
          ctx.fill();
          ctx.strokeStyle = `rgba(255,70,70,${0.42 + k * 0.55})`;
          ctx.lineWidth = 3;
          A.ell(ctx, b.x, b.y, b.R, b.R * 0.7);
          ctx.stroke();
        } else {
          const k = b.st === 'sambar' ? 0 : 1 - b.tt / 0.7;
          A.bird(ctx, b.x + k * 235, b.y - k * 300, 48, t, b.st === 'sambar', 1);
        }
      }
      // gelap malam + cahaya
      ctx.fillStyle = 'rgba(8,16,40,0.3)';
      ctx.fillRect(0, 0, W, H);
      // penanda tukik pemain
      if (!this.done) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 5);
        ctx.strokeStyle = `rgba(255,230,120,${0.45 + pulse * 0.4})`;
        ctx.lineWidth = 3;
        A.ell(ctx, p.x, p.y, p.r + 10 + pulse * 4, p.r + 10 + pulse * 4);
        ctx.stroke();
        if (this.t < 4) {
          ctx.fillStyle = '#ffe680';
          ctx.font = '900 20px "Trebuchet MS", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('KAMU', p.x, p.y - p.r - 26);
        }
      }
      if (this.lamp) {
        A.lampGlow(ctx, this.lamp.x, this.lamp.y, this.lamp.R, t, 1);
        A.lampPost(ctx, this.lamp.x, this.lamp.y);
      }
      drawFx(ctx, this.fx);
      // HUD
      ctx.save();
      rr(ctx, 14, 10, 300, 50, 16);
      ctx.fillStyle = 'rgba(4,30,60,0.62)';
      ctx.fill();
      drawLives(ctx, 38, 35);
      ctx.fillStyle = '#fff';
      ctx.font = '700 15px "Trebuchet MS", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('Saudara tukik', 302, 35);
      rr(ctx, W / 2 - 230, 10, 460, 62, 16);
      ctx.fillStyle = 'rgba(4,30,60,0.62)';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = '800 18px "Trebuchet MS", system-ui, sans-serif';
      ctx.fillText('Menetas · ' + G.run.ht.nama + ' (' + G.run.ht.tingkat + ')', W / 2, 28);
      const prog = clamp((p.x - this.start.x) / (this.seaX - this.start.x), 0, 1);
      bar(ctx, W / 2 - 200, 47, 400, 15, prog, '#7fd8ff');
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '800 20px "Trebuchet MS", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LAUT ➜', this.seaX + 85, H / 2);
      sandHint(ctx);
    }
  };

  /* ================================================================
   * Tahap 1–3: Laut (makan, tumbuh, hindari predator & sampah)
   * ================================================================ */
  const FOOD = {
    plankton: { r: 13, val: 1, mv: 'drift' },
    telur: { r: 13, val: 1, mv: 'drift' },
    ubur: { r: 18, val: 2, mv: 'jelly' },
    uburBesar: { r: 25, val: 3, mv: 'jelly' },
    udang: { r: 16, val: 2, mv: 'dart' },
    kepiting: { r: 17, val: 2, mv: 'floor' },
    lamun: { r: 22, val: 2, mv: 'static' },
    alga: { r: 18, val: 2, mv: 'drift' },
    spons: { r: 22, val: 3, mv: 'static' },
    kerang: { r: 17, val: 2, mv: 'static' },
    siput: { r: 16, val: 2, mv: 'static' },
    salpa: { r: 18, val: 2, mv: 'drift' },
    tunikata: { r: 20, val: 3, mv: 'static' },
    algaMerah: { r: 21, val: 2, mv: 'drift' },
    lamunDaun: { r: 25, val: 2, mv: 'static' }
  };
  const TRASH = { kantong: 18, botol: 16, sedotan: 12, tutup: 9, kaleng: 14, tali: 19, robek: 23, serpih: 17 };
  // Per-stage zoom. Shell length (cm) and predator total length (cm) use the same scale.
  // Hatchlings are shown close up; this is an arcade timeline, not a growth model.
  const PIXELS_CM = [0, 4.0, 1.7, 1.1];
  const LIMITS = [null, { trash: 16, preds: 3, total: 22 }, { trash: 20, preds: 3, total: 27 }, { trash: 24, preds: 3, total: 31 }];
  const FOOD_NAMES = { plankton: 'Zooplankton · diperbesar', telur: 'Telur ikan · diperbesar', ubur: 'Ubur-ubur', uburBesar: 'Ubur-ubur', udang: 'Udang', kepiting: 'Kepiting', lamun: 'Lamun', alga: 'Alga', spons: 'Spons', kerang:'Kerang', siput:'Siput laut',salpa:'Salpa',tunikata:'Tunikata',algaMerah:'Alga merah',lamunDaun:'Lamun daun lebar' };
  // Fish are illustrative potential hatchling predators, not named local species.
  const PRED = {
    kakap: { label: 'Ikan besar', draw: 'fish', body: '#559ca7', belly: '#d2e5cc', fin: '#246175', cm: [25, 40], span: 2.6, visual: 1, hit: .9, spd: [85, 115], maxPreyCm: 15 },
    barakuda: { label:'Barakuda',draw:'fish',kind:'barakuda',body:'#8eacb1',belly:'#dce4d8',fin:'#52777e',cm:[35,60],span:2.6,visual:1,hit:.8,spd:[100,140],maxPreyCm:15 },
    kerapu: { label: 'Ikan besar', draw: 'fish', body: '#a18c68', belly: '#e1d3ad', fin: '#605740', cm: [30, 45], span: 2.6, visual: 1, hit: .9, spd: [70, 100], maxPreyCm: 15 },
    hiu: { label: 'Hiu macan muda', draw: 'shark', tiger: true, cm: [200, 250], span: 3.05, visual: 1, hit: 1.2, spd: [100, 125], chase: true, always: true, warn: true },
    hiumacan: { label: 'Hiu macan', draw: 'shark', tiger: true, cm: [300, 400], span: 3.05, visual: 1, hit: 1.2, spd: [100, 125], chase: true, always: true, warn: true }
  };

  function weighted(obj) {
    let tot = 0;
    for (const k in obj) tot += obj[k];
    let v = Math.random() * tot;
    for (const k in obj) { v -= obj[k]; if (v <= 0) return k; }
    return Object.keys(obj)[0];
  }

  function drawFood(ctx, f, t) {
    const a = clamp(f.fade, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    const hy = f.mv === 'static' ? f.y - f.r * 0.6 : f.y;
    switch (f.type) {
      case 'plankton': A.plankton(ctx, f.x, f.y, f.r, t + f.ph); break;
      case 'telur': A.fishEggs(ctx, f.x, f.y, f.r); break;
      case 'ubur': case 'uburBesar': {
        const jc = f.jellyClass || (f.type === 'uburBesar' ? 'besar' : 'kecil');
        const col = [[204,220,220],[217,224,216],[205,214,227]][Math.floor(f.ph||0)%3];
        A.jelly(ctx, f.x, f.y, f.r, t + f.ph * (jc === 'mini' ? 1.35 : jc === 'besar' ? 0.72 : 1), col);
        ctx.shadowBlur = 0;
        break;
      }
      case 'udang': A.shrimp(ctx, f.x, f.y, f.r, t + f.ph, f.vx >= 0 ? 1 : -1); break;
      case 'kepiting': A.crabSide(ctx, f.x, f.y, f.r, t + f.ph); break;
      case 'lamun': A.seagrass(ctx, f.x, f.y, f.r, t + f.ph); break;
      case 'alga': A.algae(ctx, f.x, f.y, f.r, t + f.ph); break;
      case 'spons': A.sponge(ctx, f.x, f.y, f.r, t, f.hue); break;
      case 'kerang': A.shellfish(ctx,f.x,f.y,f.r,t); break;
      case 'siput': A.seaSnail(ctx,f.x,f.y,f.r,t); break;
      case 'salpa': A.salp(ctx,f.x,f.y,f.r,t+f.ph); break;
      case 'tunikata': A.tunicate(ctx,f.x,f.y,f.r,t); break;
      case 'algaMerah': A.redAlgae(ctx,f.x,f.y,f.r,t); break;
      case 'lamunDaun': A.broadSeagrass(ctx,f.x,f.y,f.r,t); break;
    }
    if (f.fade > .7 && (f.type === 'spons' || f.type === 'lamun')) {
      ctx.font = '600 12px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#d7ffe5';
      ctx.strokeStyle = '#073839'; ctx.lineWidth = 4;
      ctx.strokeText(FOOD_NAMES[f.type], f.x, hy - f.r - 12); ctx.fillText(FOOD_NAMES[f.type], f.x, hy - f.r - 12);
    }
    ctx.restore();
  }

  function drawTrash(ctx, e, t) {
    switch (e.type) {
      case 'kantong': A.bag(ctx, e.x, e.y, e.r, t + e.ph); break;
      case 'robek': A.tornBag(ctx,e.x,e.y,e.r,t+e.ph,false); break;
      case 'serpih': A.tornBag(ctx,e.x,e.y,e.r,t+e.ph,true); break;
      case 'botol': A.bottle(ctx, e.x, e.y, e.r, t, e.rot); break;
      case 'sedotan': A.straw(ctx, e.x, e.y, e.r, e.rot); break;
      case 'tutup': A.cap(ctx, e.x, e.y, e.r, e.col); break;
      case 'kaleng': A.can(ctx, e.x, e.y, e.r, e.rot); break;
      case 'tali': A.rope(ctx, e.x, e.y, e.r, t); break;
    }
  }

  function drawPred(ctx, e, t, danger) {
    const P = PRED[e.type];
    if (danger) {
      ctx.save();
      const pulse = 0.5 + 0.5 * Math.sin(t * 8);
      ctx.shadowColor = `rgba(255,40,40,${0.7 + pulse * 0.3})`;
      ctx.shadowBlur = 5;
    }
    const tilt = clamp(Math.atan2(e.vy, Math.abs(e.vx) + 1), -0.6, 0.6);
    const vr = e.r * (P.visual || 1);
    if (P.draw === 'fish') A.fish(ctx, e.x, e.y, vr, { t: t + e.ph, facing: e.vx >= 0 ? 1 : -1, tilt: tilt, body: P.body, belly: P.belly, fin: P.fin, kind: P.kind });
    else A.shark(ctx, e.x, e.y, vr, { t: t + e.ph, facing: e.vx >= 0 ? 1 : -1, tilt: tilt, tiger: P.tiger });
    if (danger) ctx.restore();
    if (danger) {
      ctx.fillStyle = '#ff4757';
      ctx.font = '900 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', e.x, e.y - e.r * .8 - 10);
      ctx.font = '600 12px system-ui'; ctx.fillStyle = '#ffe0cf';
      ctx.fillText(P.label + (e.cm ? ' · ' + (e.cm >= 100 ? (e.cm / 100).toFixed(1) + ' m' : Math.round(e.cm) + ' cm') : ''), e.x, e.y - e.r * .8 - 30);
    }
  }

  const Ocean = {
    isPlay: true,
    enter: function (stage) {
      this.stage = stage;
      this.t = 0;
      this.frozen = false;
      this.fx = newFx();
      this.food = [];
      this.trash = [];
      this.preds = [];
      this.divers = [];
      this.nets = [];
      this.birds = [];
      this.boats = [];
      this.sargs = [];
      this.warns = [];
      this.goal = CFG.goal[stage] * (G.settings.cepat ? CFG.quick : 1);
      this.growth = 0;
      this.combo = 0;
      this.comboT = 0;
      this.comboBest = 0;
      this.frenzyT = 0;
      this.eatPulse = 0;
      this.milestone = 0; this.dash = 0; this.dashCool = 0;
      this.done = false;
      const sp = G.run.sp;
      this.sp = sp;
      this.p = { x: W * 0.5, y: H * 0.45, vx: 0, vy: 0, facing: 1, tilt: 0, inv: 2, slow: 0, full: 0, net: null, netMash: 0, netT: 0, netCool: 0, hidden: false };
      this.tm = { food: 0, trash: 2.5, kakap: 2.5, kerapu: 3.5, hiu: 6, tiger: 5, diver: 13, bird: 5, sarg: 0.5, boat: 8, net: 7 };
      this.trashEvery=[0,1.35,1.15,1.0][stage];
      this.trashW={kantong:8,botol:10,robek:8,serpih:5,sedotan:1,tutup:1,kaleng:1,tali:1};
      this.diet=stage===1?sp.dietTukik.slice():sp.dietRemaja.slice();
      if(stage===3 && sp.id==='belimbing')this.diet=['ubur','uburBesar','salpa'];
      const staticShare = this.diet.filter((k) => FOOD[k].mv === 'static').length / this.diet.length;
      this.foodTarget = [0, 14, 12, 11][stage] + Math.round(staticShare * 2);
      for (let i = 0; i < this.foodTarget; i++) this.spawnFood(true);
      if (stage === 1) { this.spawnSarg(rand(200, 500)); }
      const initialTrash=[0,10,13,16][stage];
      for(let attempt=0;attempt<initialTrash*8 && this.trash.length<initialTrash;attempt++)this.spawnTrash(true);
      this.breathWarn = false;
      this.plasticTip = false;
      buildOceanBG(stage);
    },
    shellCm: function () {
      const bounds = this.stage === 1 ? [5, 12] : this.stage === 2 ? [20, 45] : this.sp.adultCm;
      return lerp(bounds[0], bounds[1], clamp(this.growth / this.goal, 0, 1));
    },
    radius: function () { return this.shellCm() * PIXELS_CM[this.stage] / 2; },
    danger: function (e) { const p = PRED[e.type]; return !!(p.always || this.shellCm() < p.maxPreyCm); },
    canHazard: function (area) {
      const l = LIMITS[this.stage];
      const count = this.trash.length + this.preds.length + this.nets.length + this.boats.length + this.divers.length + this.warns.length;
      const occupied = this.trash.reduce((n,e) => n + Math.PI * e.r * e.r, 0) + [...this.preds, ...this.warns.filter(w=>w.then).map(w=>w.then)].reduce((n,e) => n + Math.PI * e.r * e.r * .6, 0) + this.nets.reduce((n,e) => n + e.w * e.h, 0);
      return count < l.total && occupied + this.divers.length*15000 + this.warns.filter(w=>w.thenDiver).length*15000 + area < W * (FLOOR - SURF) * .22;
    },
    spawnFood: function (inside) {
      const type = pick(this.diet), F = FOOD[type];
      let foodScale = rand(0.90, 1.15), foodVal = F.val, jellyClass = '';
      if (type === 'ubur' || type === 'uburBesar') {
        const roll = Math.random();
        if (roll < 0.30) { foodScale = rand(0.60, 0.80); foodVal = 1; jellyClass = 'mini'; }
        else if (roll < 0.76) { foodScale = rand(0.88, 1.08); foodVal = 2; jellyClass = 'kecil'; }
        else if (roll < 0.97) { foodScale = rand(1.28, 1.58); foodVal = 4; jellyClass = 'besar'; }
        else { foodScale = rand(1.68, 1.92); foodVal = 6; jellyClass = 'langka'; }
        if (type === 'uburBesar') { foodScale *= 1.08; foodVal += 1; }
      }
      const f = { type: type, r: F.r * foodScale, val: foodVal, mv: F.mv, jellyClass: jellyClass, ph: rand(0, 6), fade: inside ? 0 : 1, life: 999, hue: Math.random() < 0.5 ? 0 : 1 };
      const pl = this.p;
      if (F.mv === 'static' || F.mv === 'floor') {
        let tries = 0;
        do {
          f.x = rand(60, W - 60);
          tries++;
        } while (tries < 20 && (this.food.some((o) => (o.mv === 'static' || o.mv === 'floor') && Math.abs(o.x - f.x) < 60) || Math.abs(f.x - pl.x) < 80));
        f.y = seabedY(f.x, this.stage) - (F.mv === 'floor' ? 8 : 14);
        f.vx = F.mv === 'floor' ? rand(15, 30) * (Math.random() < 0.5 ? -1 : 1) : 0;
        f.vy = 0;
        f.fade = 0;
        f.life = rand(13, 17);
      } else if (inside || Math.random() < 0.5) {
        let tries = 0;
        do {
          f.x = rand(60, W - 60);
          f.y = rand(SURF + 50, FLOOR - 60);
          tries++;
        } while (tries < 20 && (d2(f.x, f.y, pl.x, pl.y) < 85 * 85 || this.food.some(o => d2(o.x,o.y,f.x,f.y) < 48*48)));
        f.vx = rand(15, 40) * (Math.random() < 0.5 ? -1 : 1);
        f.vy = rand(-8, 8);
        f.fade = 0;
      } else {
        const left = Math.random() < 0.5;
        f.x = left ? -20 : W + 20;
        f.y = rand(SURF + 50, FLOOR - 60);
        f.vx = rand(25, 60) * (left ? 1 : -1);
        f.vy = rand(-8, 8);
      }
      if (F.mv === 'dart') f.vx *= 1.6;
      this.food.push(f);
    },
    spawnTrash: function (inside) {
      if (this.trash.length >= LIMITS[this.stage].trash || !this.canHazard(2200)) return;
      const type = weighted(this.trashW);
      const e = { type, r: TRASH[type], ph: rand(0,6), rot: rand(0,6), spin: rand(-.4,.4), col: pick(['#db975a','#7ca6ac','#c66b62']), settle: 0, age: 0 };
      const left = Math.random() < .5;
      e.x = inside ? rand(100,W-100) : left ? -35 : W+35;
      e.y = rand(SURF+60,FLOOR-60);
      if (inside && (dist(e.x,e.y,this.p.x,this.p.y)<155 || this.food.some(f=>dist(e.x,e.y,f.x,f.y)<42) || this.trash.some(f=>dist(e.x,e.y,f.x,f.y)<65))) return;
      e.vx = rand(22,38)*(left?1:-1); e.vy=rand(-3,7);
      this.trash.push(e);
    },
    spawnSarg: function (x) {
      const left = x == null ? Math.random() < 0.5 : false;
      const w = rand(190, 260);
      this.sargs.push({ x: x != null ? x : left ? -w / 2 : W + w / 2, w: w, vx: (x != null ? 1 : left ? 1 : -1) * rand(28, 40) });
      if (x == null) for (let i = 0; i < 2; i++) this.spawnFood(true);
    },
    spawnPred: function (type) {
      const P = PRED[type];
      if (this.preds.length + this.warns.filter(w=>w.then).length >= LIMITS[this.stage].preds || !this.canHazard(18000)) return;
      const pl = this.p;
      let left = Math.random() < 0.5;
      let y = rand(SURF + 70, FLOOR - 60);
      if ((left && pl.x < 260) || (!left && pl.x > W - 260)) left = !left;
      const cm = rand(P.cm[0], P.cm[1]);
      const r = cm * PIXELS_CM[this.stage] / P.span;
      if (!this.canHazard(Math.PI*r*r*.6)) return;
      const e = { type: type, cm: cm, age: 0, r: r, x: left ? -r * 1.6 : W + r * 1.6, y: y, vx: rand(P.spd[0], P.spd[1]) * (left ? 1 : -1), vy: 0, ph: rand(0, 6), chaseT: P.chase ? 1.2 : 0, lungeCd: 1, lungeT: 0, base: 0 };
      e.base = Math.abs(e.vx);
      if (P.warn) this.warns.push({ x: left ? 26 : W - 26, y: y, t: 2.2, then: e });
      else this.preds.push(e);
    },
    spawnDiver: function() {
      if(this.stage<2 || this.divers.length || this.warns.some(w=>w.thenDiver) || !this.canHazard(15000))return;
      const dir=this.p.x<W/2?-1:1;
      const e={x:dir===1?-110:W+110,y:rand(SURF+150,FLOOR-110),dir,age:0,chase:4,size:170*PIXELS_CM[this.stage]/3.4};
      this.warns.push({x:dir===1?26:W-26,y:e.y,t:2.4,thenDiver:e});
    },
    spawnBoat: function () {
      if (this.boats.length || this.warns.some(w=>w.thenBoat) || !this.canHazard(0)) return;
      const left = Math.random() < 0.5;
      const e = { L: 600 * PIXELS_CM[this.stage], x: left ? -400 : W + 400, dir: left ? 1 : -1, v: rand(140, 165) };
      this.warns.push({ x: left ? 26 : W - 26, y: SURF + 20, t: 2.5, thenBoat: e });
    },
    spawnNet: function () {
      if (this.nets.length || !this.canHazard(24000)) return;
      const left = Math.random() < 0.5;
      const w = rand(120, 155), h = rand(100, 145);
      this.nets.push({ x: left ? -w / 2 : W + w / 2, y: rand(SURF + 100, FLOOR - 110), w: w, h: h, vx: rand(22, 36) * (left ? 1 : -1), ph: rand(0, 6) });
    },
    respawn: function () {
      const p = this.p;
      p.x = W / 2;
      p.y = H * 0.42;
      p.vx = p.vy = 0;
      p.inv = 2.5;
      p.net = null;
      p.full = 0;
      p.slow = 0;
      this.preds = this.preds.filter((e) => !(this.danger(e) && dist(e.x, e.y, p.x, p.y) < 360));
      this.birds = [];
      this.divers = [];
      this.trash = this.trash.filter(e=>dist(e.x,e.y,p.x,p.y)>200);
      this.nets = this.nets.filter(e=>dist(e.x,e.y,p.x,p.y)>250);
    },
    hurt: function (reason) {
      if (this.done) return;
      this.combo = 0; this.comboT = 0; this.frenzyT = 0;
      sparkle(this.fx, this.p.x, this.p.y, '255,120,120', 14);
      if (G.loseLife(reason)) this.respawn();
      else this.done = true;
    },
    complete: function () {
      if (this.done) return;
      this.done = true;
      SFX.level();
      G.run.raw.tahap += 500;
      G.run.stage = this.stage + 1;
      sparkle(this.fx, this.p.x, this.p.y, '180,255,190', 24);
      G.toast('Kamu tumbuh! Naik ke tahap berikutnya.', 2, 'good');
      const next = this.stage + 1;
      G.later(() => G.stageCard(next, () => (next <= 3 ? G.setScene(Ocean, next) : G.setScene(Migrate))), 1000);
    },
    debugSkip: function () { this.growth = this.goal; },
    debugHurt: function () { this.hurt('dimangsa'); },
    botTarget: function () {
      const p = this.p, pr = this.radius();
      if (G.run.breath < 30) return { x: p.x, y: SURF - 30 };
      let best = null, bd = 1e9;
      if (p.full <= 0) {
        for (const f of this.food) {
          if (f.fade < 0.5) continue;
          const dd = d2(f.x, f.y, p.x, p.y);
          if (dd < bd) { bd = dd; best = f; }
        }
      }
      let tx = best ? best.x : W / 2, ty = best ? best.y : H / 2;
      let ax = 0, ay = 0;
      for (const e of this.preds) {
        if (!this.danger(e)) continue;
        const d = dist(p.x, p.y, e.x, e.y);
        if (d < 260) { ax += (p.x - e.x) / d * (260 - d) * 4; ay += (p.y - e.y) / d * (260 - d) * 4; }
      }
      for (const e of this.trash) {
        const d = dist(p.x, p.y, e.x, e.y);
        if (d < pr + 50) { ax += (p.x - e.x) / d * 300; ay += (p.y - e.y) / d * 300; }
      }
      for(const d of this.divers){const dd=Math.max(1,dist(p.x,p.y,d.x,d.y));if(dd<260){ax+=(p.x-d.x)/dd*400;ay+=(p.y-d.y)/dd*400;}}
      for (const n of this.nets) {
        if (Math.abs(p.x - n.x) < n.w / 2 + 70 && Math.abs(p.y - n.y) < n.h / 2 + 70) ay += (p.y < n.y ? -1 : 1) * 400;
      }
      for (const b of this.boats) { if (Math.abs(p.x - b.x) < 260 && p.y < SURF + 120) ay += 500; }
      return { x: tx + ax, y: ty + ay };
    },
    update: function (dt) {
      if (this.frozen) return;
      this.t += dt;
      const run = G.run, sp = this.sp, p = this.p, st = this.stage;
      const pr = this.radius();
      p.inv -= dt; p.slow -= dt; p.full -= dt; p.netCool -= dt;
      this.eatPulse = Math.max(0, this.eatPulse - dt * 4.5);
      this.frenzyT = Math.max(0, this.frenzyT - dt);
      if (this.combo > 0) {
        this.comboT -= dt;
        if (this.comboT <= 0) { this.combo = Math.max(0, this.combo - 1); this.comboT = this.combo ? 0.45 : 0; }
      }

      this.dash = Math.max(0,this.dash-dt); this.dashCool=Math.max(0,this.dashCool-dt);
      if (!p.net && !this.done && this.dashCool<=0 && (G.input.keys.ShiftLeft || G.input.keys.ShiftRight || G.input.dash)) {
        this.dash=.32; this.dashCool=3; bubbles(this.fx,p.x,p.y,8,20);
      }
      G.input.dash=false;
      // gerak pemain
      if (p.net) {
        const n = p.net;
        p.netT -= dt;
        p.x = n.x + p.netOx + Math.sin(this.t * 20) * 3;
        p.y = n.y + p.netOy;
        p.vx = p.vy = 0;
        const m = G.bot ? (Math.random() < dt * 9 ? 1 : 0) : takeMash();
        if (m > 0) {
          p.netMash += m;
          SFX.mash();
          bubbles(this.fx, p.x, p.y, 3, 10);
        }
        if (p.netMash >= CFG.netMash[st]) {
          p.net = null;
          p.netCool = 2.5;
          p.inv = Math.max(p.inv, 0.8);
          p.vy = -200;
          G.toast('Berhasil lepas dari jaring!', 1.6, 'good');
          SFX.level();
        } else if (p.netT <= 0) {
          this.nets = this.nets.filter((x) => x !== n);
          p.net = null;
          this.hurt('jaring');
        }
      } else if (!this.done) {
        takeMash();
        const maxS = CFG.speed[st] * sp.stat.speed * (p.slow > 0 ? 0.55 : 1) * (this.frenzyT > 0 ? 1.10 : 1) * (this.dash>0 ? 1.8 : 1);
        steer(p, dt, maxS, 6 * sp.stat.accel, G.bot ? this.botTarget() : null);
      }
      p.x = clamp(p.x, pr, W - pr);
      p.y = clamp(p.y, SURF + pr * 0.25, FLOOR - pr * 0.55);
      if (p.vx > 25) p.facing = 1; else if (p.vx < -25) p.facing = -1;
      p.tilt = lerp(p.tilt, clamp(Math.atan2(p.vy, Math.abs(p.vx) + 60) * 0.7, -0.55, 0.55), 1 - Math.exp(-8 * dt));
      if (Math.random() < dt * 1.5) bubbles(this.fx, p.x + p.facing * pr, p.y - pr * 0.2, 1, 3);

      // napas
      const atSurface = p.y - pr * 0.5 <= SURF + 8;
      if (atSurface) {
        if (run.breath < 90 && Math.random() < dt * 4) SFX.breath();
        run.breath = Math.min(100, run.breath + 48 * dt);
        this.breathWarn = false;
      } else {
        run.breath = Math.max(0, run.breath - CFG.breathDrain[st] * sp.stat.breath * dt);
      }
      if (run.breath < 25 && !this.breathWarn) { this.breathWarn = true; G.toast(D.pesan.napas, 3, 'bad'); SFX.warn(); }
      if (run.breath <= 0) run.health -= 22 * dt;

      // sembunyi di Sargassum
      p.hidden = false;
      for (const s of this.sargs) if (Math.abs(p.x - s.x) < s.w / 2 && p.y < SURF + 66) p.hidden = true;

      // spawn
      const tm = this.tm;
      for (const k in tm) tm[k] -= dt;
      if (tm.food <= 0) {
        tm.food = 0.38;
        if (this.food.length < this.foodTarget) this.spawnFood(false);
      }
      if (tm.trash <= 0) { tm.trash = this.trashEvery * rand(.85,1.2); this.spawnTrash(); }
      if (st === 1) {
        if (tm.kakap <= 0) { tm.kakap = rand(7,10); this.spawnPred(Math.random()<.45?'barakuda':'kakap'); }
        if (tm.bird <= 0) { tm.bird = rand(12,16); if (!this.birds.length) this.birds.push({ x:rand(100,W-100), y:-40, st:'terbang', tt:1.8, tx:0, vx:100 }); }
        if (tm.sarg <= 0) { tm.sarg = rand(12,16); if (this.sargs.length<2) this.spawnSarg(); }
      } else if (st === 2) {
        if (tm.hiu <= 0) { tm.hiu = rand(14,18); this.spawnPred('hiu'); }
        if (tm.net <= 0) { tm.net = rand(19,24); this.spawnNet(); }
      } else {
        if (tm.tiger <= 0) { tm.tiger = rand(15,20); this.spawnPred('hiumacan'); }
        if (tm.boat <= 0) { tm.boat = rand(22,27); this.spawnBoat(); }
        if (tm.net <= 0) { tm.net = rand(20,25); this.spawnNet(); }
      }

      if(st>=2 && tm.diver<=0){tm.diver=rand(24,30);this.spawnDiver();}

      // peringatan → muncul
      for (const w of this.warns) {
        w.t -= dt;
        if (w.t <= 0) {
          if (w.then) this.preds.push(w.then);
          if (w.thenBoat) this.boats.push(w.thenBoat);
          if (w.thenDiver) this.divers.push(w.thenDiver);
        }
      }
      this.warns = this.warns.filter((w) => w.t > 0);

      // makanan
      for (const f of this.food) {
        f.fade = Math.min(1, f.fade + dt * 1.5);
        if (f.mv === 'static' || f.mv === 'floor') {
          f.life -= dt;
          if (f.life < 1) f.fade = Math.min(f.fade, f.life);
          if (f.mv === 'floor') { f.x += f.vx * dt; if (f.x < 30 || f.x > W - 30) f.vx *= -1; }
        } else {
          f.x += f.vx * dt;
          f.y += (f.vy + (f.mv === 'jelly' ? Math.sin(this.t * 2 + f.ph) * 18 : 0)) * dt;
          if (f.y < SURF + 30) f.vy = Math.abs(f.vy) + 5;
          if (f.y > FLOOR - 40) f.vy = -Math.abs(f.vy) - 5;
          if (f.mv === 'dart' && Math.random() < dt * 0.8) f.vx = -f.vx;
        }
        if (!this.done && f.fade > 0.4 && p.full <= 0 && !p.net && d2(f.x, f.y, p.x + p.facing * pr * .8, p.y) < Math.pow(Math.max(12,pr*.55) + f.r*.75,2)) {
          f.eaten = true;
          this.combo++;
          this.comboBest = Math.max(this.comboBest, this.combo);
          this.comboT = 3.4;
          if (this.combo === 3 || this.combo === 5 || this.combo === 8 || this.combo === 12) SFX.combo(this.combo);
          if (this.combo >= 12) this.frenzyT = Math.max(this.frenzyT, 5);
          const frenzyMult = this.frenzyT > 0 ? 1.3 : 1;
          this.growth += f.val * sp.stat.growth * frenzyMult;
          const eatPts = G.recordFood(run);
          run.health = Math.min(100, run.health + .45);
          const isJelly = f.type === 'ubur' || f.type === 'uburBesar';
          if (isJelly) SFX.eatJelly(this.combo, f.val >= 4);
          else if (f.val >= 3) SFX.eatMedium(this.combo);
          else SFX.eatSmall(this.combo);
          this.eatPulse = f.val >= 4 ? 1 : 0.65;
          gulp(this.fx, f.x, f.y, f.r, isJelly ? '200,235,255' : '255,245,185');
          sparkle(this.fx, f.x, f.y, f.val >= 4 ? '255,225,120' : '255,250,190', f.val >= 4 ? 13 : 7);
          addText(this.fx, f.x, f.y - 14, '+' + eatPts, f.val >= 4 ? '#ffe17a' : '#fff6a8', f.val >= 4 ? 25 : 20);
        }
      }
      this.food = this.food.filter((f) => !f.eaten && f.x > -80 && f.x < W + 80 && f.life > 0);

      // sampah
      for (const e of this.trash) {
        e.age += dt;
        if (e.settle > 0) {
          e.settle -= dt;
        } else {
          e.x += e.vx * dt;
          e.y += (e.vy + Math.sin(this.t * 1.5 + e.ph) * 8) * dt;
          e.rot += e.spin * dt;
          if (e.y > seabedY(e.x, st) - 8) { e.y = seabedY(e.x, st) - 8; e.vy = 0; e.vx = 0; e.settle = rand(6, 9); e.life = e.settle; }
        }
        if (!this.done && p.inv <= 0 && !p.net && d2(e.x, e.y, p.x, p.y) < Math.pow(pr * 0.66 + e.r * 0.58, 2)) {
          e.gone = true;
          G.recordTrash(run,e.type);
          p.full = 1.8;
          p.slow = 1.8;
          p.inv = Math.max(p.inv,.75);
          this.combo = 0; this.comboT = 0; this.frenzyT = 0;
          SFX.bad();
          addText(this.fx, p.x, p.y - pr - 12, D.pesan.plastik, '#ff9aa8', 22);
          if (!this.plasticTip && run.plastic === 1) { this.plasticTip = true; G.toast(D.pesan.plastikTips, 4, 'bad'); }
        }
      }
      this.trash = this.trash.filter((e) => !e.gone && e.age < 36 && e.x > -60 && e.x < W + 60 && !(e.settle <= 0 && e.life !== undefined && e.vy === 0 && e.y >= seabedY(e.x, st) - 8));

      // jaring
      for (const n of this.nets) {
        n.x += n.vx * dt;
        n.ph += dt;
        if (!this.done && !p.net && p.netCool <= 0 && p.inv <= 0) {
          const cx = clamp(p.x, n.x - n.w / 2, n.x + n.w / 2), cy = clamp(p.y, n.y - n.h / 2, n.y + n.h / 2);
          if (d2(cx, cy, p.x, p.y) < Math.pow(pr * 0.6, 2)) {
            p.net = n;
            p.netOx = clamp(p.x - n.x, -n.w / 2 + 10, n.w / 2 - 10);
            p.netOy = clamp(p.y - n.y, -n.h / 2 + 10, n.h / 2 - 10);
            p.netMash = 0;
            p.netT = CFG.netTime;
            G.input.mash = 0;
            SFX.warn();
            G.toast(D.pesan.lepasJaring, 2.2, 'bad');
          }
        }
      }
      this.nets = this.nets.filter((n) => n === p.net || (n.x > -n.w && n.x < W + n.w));

      // predator
      const visible = !p.hidden && p.inv <= 0 && !this.done;
      for (const e of this.preds) {
        e.age += dt;
        const P = PRED[e.type];
        const dang = this.danger(e);
        const dp = dist(e.x, e.y, p.x, p.y);
        if (P.chase && dang && visible && e.chaseT > 0 && dp < 340) {
          e.chaseT -= dt;
          const want = Math.atan2(p.y - e.y, p.x - e.x);
          let cur = Math.atan2(e.vy, e.vx);
          let diff = want - cur;
          while (diff > Math.PI) diff -= TAU;
          while (diff < -Math.PI) diff += TAU;
          cur += clamp(diff, -1.25 * dt, 1.25 * dt);
          const sp2 = e.base;
          e.vx = Math.cos(cur) * sp2;
          e.vy = Math.sin(cur) * sp2;
        } else if (P.lunge && dang && visible && dp < 170 && e.lungeCd <= 0) {
          e.lungeT = 0.45;
          e.lungeCd = 3;
          e.vx = (p.x - e.x) / dp * e.base * 3;
          e.vy = (p.y - e.y) / dp * e.base * 3;
        } else if (!dang && dp < 160) {
          e.vy += (e.y > p.y ? 1 : -1) * 80 * dt;
        }
        e.lungeCd -= dt;
        if (e.lungeT > 0) {
          e.lungeT -= dt;
          if (e.lungeT <= 0) { const s = Math.hypot(e.vx, e.vy) || 1; e.vx = e.vx / s * e.base; e.vy = e.vy / s * e.base * 0.3; }
        }
        e.vy *= 1 - dt * 0.5;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.y = clamp(e.y, SURF + e.r * 0.5, FLOOR - e.r * 0.4);
        if (dang && visible && !p.net && p.inv <= 0) {
          const hitR = e.r * (P.hit || 1);
          const hx = e.x + Math.sign(e.vx) * hitR * 0.52;
          if (d2(hx, e.y, p.x, p.y) < Math.pow(pr * 0.62 + hitR * 0.48, 2)) this.hurt('dimangsa');
        }
      }
      this.preds = this.preds.filter((e) => e.age < 22 && e.x > -e.r * 3 && e.x < W + e.r * 3);

      // Illegal capture: slower than the turtle, warned before entry, never a patrol.
      for(const d of this.divers){
        d.age+=dt;
        const facing=d.dir;
        if(!this.done && p.inv<=0 && d.chase>0 && dist(d.x,d.y,p.x,p.y)<340){
          d.chase-=dt;d.y+=clamp(p.y-d.y,-55,55)*dt;
        }
        d.x+=facing*90*dt;
        if(!this.done && p.inv<=0 && !p.net && dist(d.x+facing*d.size*.9,d.y,p.x,p.y)<pr*.62+19)this.hurt('pemburu');
      }
      this.divers=this.divers.filter(d=>d.age<23 && d.x>-250 && d.x<W+250);
      // burung
      for (const b of this.birds) {
        b.tt -= dt;
        if (b.st === 'terbang') {
          b.y = lerp(b.y, 30, 1 - Math.exp(-4 * dt));
          b.x += b.vx * dt;
          if (b.tt <= 0) {
            b.st = 'incar';
            b.tt = 0.95;
            b.tx = p.y < SURF + 150 && visible ? clamp(p.x + p.vx * 0.6, 60, W - 60) : rand(100, W - 100);
            SFX.warn();
          }
        } else if (b.st === 'incar') {
          b.x = lerp(b.x, b.tx, 1 - Math.exp(-6 * dt));
          if (b.tt <= 0) { b.st = 'selam'; b.x = b.tx; }
        } else if (b.st === 'selam') {
          b.y += 560 * dt;
          if (b.y > SURF + 120) { b.st = 'naik'; }
        } else if (b.st === 'naik') {
          b.y -= 420 * dt;
          b.x += 160 * dt;
        }
        if ((b.st === 'selam' || b.st === 'naik') && b.y > SURF && visible && !p.net && d2(b.x, b.y, p.x, p.y) < Math.pow(pr * 0.7 + 20, 2)) {
          b.st = 'naik';
          this.hurt('burung');
        }
      }
      this.birds = this.birds.filter((b) => !(b.st === 'naik' && b.y < -60));

      // kapal
      for (const b of this.boats) {
        b.x += b.dir * b.v * dt;
        const px = b.x - b.dir * b.L * 0.42, py = SURF + 26;
        if (Math.random() < dt * 20) bubbles(this.fx, px, py, 1, 8);
        if (!this.done && p.inv <= 0 && !p.net && d2(px, py, p.x, p.y) < Math.pow(pr * 0.7 + 24, 2)) this.hurt('kapal');
      }
      this.boats = this.boats.filter((b) => b.x > -b.L && b.x < W + b.L);

      // Sargassum
      for (const s of this.sargs) s.x += s.vx * dt;
      this.sargs = this.sargs.filter((s) => s.x > -s.w && s.x < W + s.w);

      if (run.health <= 0 && !this.done) this.hurt('sehat');
      const milestoneNow = Math.min(4, Math.floor((this.growth / this.goal) * 4));
      if (!this.done && milestoneNow > this.milestone && milestoneNow < 4) {
        this.milestone = milestoneNow;
        SFX.level();
        sparkle(this.fx, p.x, p.y, '170,245,255', 20);
        G.toast(['', 'Tubuhmu mulai membesar!', 'Cangkangmu semakin kuat!', 'Hampir dewasa! Pertahankan rantai makan.'][milestoneNow], 2.2, 'good');
      }
      if (!this.done && this.growth >= this.goal) this.complete();

      ambient(this.fx, dt);
      updFx(this.fx, dt);
    },
    draw: function (ctx) {
      const t = G.t, p = this.p, st = this.stage, sp = this.sp;
      const pr = this.radius();
      ctx.drawImage(buildOceanBG(st === 2 && sp.id === 'belimbing' ? 3 : st), 0, 0);
      drawRays(ctx, t, st === 3 ? 0.6 : 1);
      // ikan kecil latar
      ctx.save();
      ctx.globalAlpha = 0.25;
      for (let i = 0; i < 7; i++) {
        const fx = ((i * 211 + t * (20 + i * 4)) % (W + 100)) - 50, fy = 160 + ((i * 97) % 420);
        A.fish(ctx, fx, fy, 7, { t: t + i, facing: 1, body: '#08355e', fin: '#08355e' });
      }
      ctx.restore();
      for (const s of this.sargs) A.sargassum(ctx, s.x, SURF - 4, s.w, t);
      for (const n of this.nets) A.net(ctx, n.x, n.y, n.w, n.h, t + n.ph);
      for (const f of this.food) drawFood(ctx, f, t);
      for (const e of this.trash) drawTrash(ctx, e, t);
      for (const e of this.preds) drawPred(ctx, e, t, this.danger(e));
      for(const d of this.divers){
        A.diver(ctx,d.x,d.y,d.size,t,d.dir);ctx.font='700 14px system-ui';ctx.textAlign='center';ctx.fillStyle='#ffb5a0';ctx.fillText('! Pemburu ilegal',d.x,d.y-d.size*.8-15);
      }
      // pemain
      const blink = p.inv > 0 && Math.floor(t * 10) % 2;
      if (!blink) {
        if (p.hidden) ctx.globalAlpha = 0.75;
        const pulseScale = 1 + this.eatPulse * 0.055;
        A.turtleSide(ctx, p.x, p.y, pr * pulseScale, sp, { t: t, facing: p.facing, tilt: p.tilt, swim: p.net ? 1.6 : clamp(Math.hypot(p.vx, p.vy) / 150, 0.3, 1.3), baby: st === 1 });
        ctx.globalAlpha = 1;
      }
      if (this.frenzyT > 0) {
        const glow = 0.25 + 0.15 * Math.sin(t * 8);
        const g = ctx.createRadialGradient(p.x, p.y, pr, p.x, p.y, pr * 4.5);
        g.addColorStop(0, `rgba(100,220,255,${glow})`); g.addColorStop(1, 'rgba(100,220,255,0)');
        ctx.fillStyle = g; A.ell(ctx, p.x, p.y, pr * 4.5, pr * 4.5); ctx.fill();
      }
      if (this.combo >= 3) {
        ctx.font = `900 ${this.combo >= 12 ? 28 : 22}px "Trebuchet MS", system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,30,60,0.75)';
        ctx.fillStyle = this.combo >= 12 ? '#ffe36e' : '#d8f7ff';
        const label = this.combo >= 12 ? `FEEDING FRENZY ×${this.combo}` : `COMBO ×${this.combo}`;
        ctx.strokeText(label, p.x, p.y - pr - 28); ctx.fillText(label, p.x, p.y - pr - 28);
      }
      if (p.full > 0) {
        ctx.font = '800 16px "Trebuchet MS", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffb3be';
        ctx.fillText('Sulit makan', p.x, p.y - pr - 12);
      } else if (p.hidden) {
        ctx.font = '800 16px "Trebuchet MS", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#d9ffcf';
        ctx.fillText(D.pesan.sembunyi, p.x, p.y + pr + 18);
      }
      if (p.net) {
        const k = p.netMash / CFG.netMash[st];
        bar(ctx, p.x - 50, p.y - pr - 30, 100, 12, k, '#ffd166');
        ctx.font = '800 18px "Trebuchet MS", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText('KETUK! KETUK!', p.x, p.y - pr - 42);
      }
      for (const b of this.boats) A.boat(ctx, b.x, SURF, b.L, t, b.dir);
      drawSurface(ctx, t);
      for (const b of this.birds) {
        if (b.st === 'incar') {
          ctx.strokeStyle = `rgba(255,70,70,${0.5 + 0.5 * Math.sin(t * 14)})`;
          ctx.lineWidth = 3;
          A.ell(ctx, b.tx, SURF + 4, 34, 9);
          ctx.stroke();
        }
        A.bird(ctx, b.x, b.y, 22, t, b.st === 'selam', b.vx >= 0 ? 1 : -1);
      }
      drawFx(ctx, this.fx);
      for (const w of this.warns) {
        const a = 0.5 + 0.5 * Math.sin(t * 5);
        ctx.fillStyle = `rgba(255,60,60,${0.55 + a * 0.45})`;
        ctx.beginPath();
        ctx.moveTo(w.x, w.y - 24);
        ctx.lineTo(w.x + 22, w.y + 16);
        ctx.lineTo(w.x - 22, w.y + 16);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '900 22px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', w.x, w.y + 5);
      }
      ctx.save();
      rr(ctx, 18, H-44, 625, 30, 12); ctx.fillStyle='rgba(3,31,42,.82)'; ctx.fill();
      ctx.font='600 13px system-ui'; ctx.textAlign='left'; ctx.fillStyle='#d8f6ec';
      ctx.fillText('Cangkang ~' + Math.round(this.shellCm()) + ' cm  ·  Makanan +5 / Sampah −4  ·  Shift: melesat',32,H-24);
      ctx.restore();
      const card = D.tahap.kartu[st];
      drawHUD(ctx, { meters: true, center: { label: card.label + ' · ' + card.nama + ' — Tumbuh', v: this.growth / this.goal, icon: 'leaf' } });
    }
  };

  /* ================================================================
   * Tahap 4: Migrasi pulang (layar bergulir otomatis)
   * ================================================================ */
  const Migrate = {
    isPlay: true,
    enter: function () {
      this.t = 0;
      this.frozen = false;
      this.done = false;
      this.dur = CFG.migrateDur * (G.settings.cepat ? 0.67 : 1);
      this.prog = 0;
      this.fx = newFx();
      this.items = [];
      this.nets = [];
      this.boats = [];
      this.warns = [];
      this.streaks = [];
      for (let i = 0; i < 26; i++) this.streaks.push({ x: rand(0, W), y: rand(SURF + 20, FLOOR - 20), l: rand(40, 120), v: rand(1.2, 2.2) });
      this.sp = G.run.sp;
      this.r = this.sp.adultCm[1] * PIXELS_CM[3] / 2;
      this.p = { x: 320, y: H * 0.5, vx: 0, vy: 0, inv: 2, slow: 0, net: null, netMash: 0, netT: 0, netCool: 0, tilt: 0 };
      this.tm = { trash: 1, net: 4, boat: 6, food: 1.5 };
      this.jarakAwal = G.run.raw.jarak;
      this.breathWarn = false;
    },
    hurt: function (reason) {
      if (this.done) return;
      sparkle(this.fx, this.p.x, this.p.y, '255,120,120', 14);
      if (G.loseLife(reason)) { this.p.inv = 2.5; this.p.net = null; this.p.x = 320; this.p.y = H * 0.45; }
      else this.done = true;
    },
    debugSkip: function () { this.prog = 1; },
    debugHurt: function () { this.hurt('kapal'); },
    botTarget: function () {
      const p = this.p;
      if (G.run.breath < 28) return { x: p.x, y: SURF - 20 };
      let best = p.y, bestScore = -1e9;
      for (let y = SURF + 70; y <= FLOOR - 50; y += 30) {
        let s = -Math.abs(y - p.y) * 0.3;
        for (const it of this.items) if (it.bad && it.x > p.x - 30 && it.x < p.x + 380) s -= Math.max(0, 90 - Math.abs(it.y - y)) * 3;
        for (const n of this.nets) if (n.x > p.x - 120 && n.x < p.x + 400 && Math.abs(y - n.y) < n.h / 2 + 50) s -= 600;
        for (const b of this.boats) if (b.x > p.x - 260 && b.x < p.x + 400 && y < SURF + 120) s -= 600;
        if (s > bestScore) { bestScore = s; best = y; }
      }
      return { x: 320, y: best };
    },
    update: function (dt) {
      if (this.frozen) return;
      this.t += dt;
      const run = G.run, p = this.p, sp = this.sp, pr = this.r;
      const V = 230;
      if (!this.done) this.prog = Math.min(1, this.prog + dt / this.dur);
      run.raw.jarak = this.jarakAwal + Math.round(this.prog * 1500);
      p.inv -= dt; p.slow -= dt; p.netCool -= dt;

      if (p.net) {
        const n = p.net;
        p.netT -= dt;
        p.x = n.x + p.netOx;
        p.y = n.y + p.netOy;
        const m = G.bot ? (Math.random() < dt * 9 ? 1 : 0) : takeMash();
        if (m > 0) { p.netMash += m; SFX.mash(); bubbles(this.fx, p.x, p.y, 3, 10); }
        if (p.netMash >= CFG.netMash[3]) {
          p.net = null; p.netCool = 2; p.inv = Math.max(p.inv, 0.8);
          G.toast('Berhasil lepas dari jaring!', 1.6, 'good');
          SFX.level();
        } else if (p.netT <= 0 || p.x < 30) {
          this.nets = this.nets.filter((x) => x !== n);
          p.net = null;
          this.hurt('jaring');
        }
      } else if (!this.done) {
        takeMash();
        steer(p, dt, 300 * sp.stat.speed * (p.slow > 0 ? 0.6 : 1), 6 * sp.stat.accel, G.bot ? this.botTarget() : null);
      }
      p.x = clamp(p.x, 110, 720);
      p.y = clamp(p.y, SURF + pr * 0.25, FLOOR - pr * 0.55);
      p.tilt = lerp(p.tilt, clamp(Math.atan2(p.vy, 300) * 0.8, -0.5, 0.5), 1 - Math.exp(-8 * dt));

      // napas
      if (p.y - pr * 0.5 <= SURF + 8) { run.breath = Math.min(100, run.breath + 48 * dt); this.breathWarn = false; }
      else run.breath = Math.max(0, run.breath - 2.6 * sp.stat.breath * dt);
      if (run.breath < 25 && !this.breathWarn) { this.breathWarn = true; G.toast(D.pesan.napas, 2.5, 'bad'); SFX.warn(); }
      if (run.breath <= 0) run.health -= 22 * dt;

      // spawn
      const tm = this.tm;
      for (const k in tm) tm[k] -= dt;
      if (!this.done && this.prog < 0.96) {
        if (tm.trash <= 0) {
          tm.trash = lerp(1.25,.9,this.prog);
          const cy = rand(SURF + 40, FLOOR - 40), n = 2+Math.floor(Math.random()*2);
          for (let i = 0; i < n && this.items.filter(it=>it.bad).length<18; i++) {
            const type = weighted({kantong:6,botol:8,robek:6,serpih:4,sedotan:1,tutup:1});
            this.items.push({ bad: true, type: type, r: TRASH[type], x: W + 40 + i * rand(30, 60), y: clamp(cy + rand(-50, 50), SURF + 20, FLOOR - 20), vx: rand(-20, 20), ph: rand(0, 6), rot: rand(0, 6), spin: rand(-1.5, 1.5), col: pick(['#ff8a3d', '#3498db', '#e74c3c']) });
          }
        }
        if (tm.food <= 0) {
          tm.food = rand(1.6, 2.4);
          const type = pick(sp.dietMigration);
          this.items.push({ bad: false, type: type, r: FOOD[type].r, x: W + 40, y: rand(SURF + 60, FLOOR - 60), vx: rand(-10, 10), ph: rand(0, 6), fade: 1 });
        }
        if (tm.net <= 0) {
          tm.net = rand(10, 13);
          const h = rand(120, 165);
          this.nets.push({ x: W + 90, y: rand(SURF + h / 2 + 20, FLOOR - h / 2 - 10), w: 120, h: h, vy: rand(-20, 20), ph: rand(0, 6) });
        }
        if (tm.boat <= 0) {
          tm.boat = rand(16, 20);
          this.warns.push({ x: W - 26, y: SURF + 20, t: 1.3, boat: { L: 660, x: W + 360, dir: -1, v: 150 } });
        }
      }
      for (const w of this.warns) { w.t -= dt; if (w.t <= 0) this.boats.push(w.boat); }
      this.warns = this.warns.filter((w) => w.t > 0);

      for (const it of this.items) {
        it.x -= (V + it.vx) * dt;
        it.y += Math.sin(this.t * 1.6 + it.ph) * 14 * dt;
        if (it.rot !== undefined) it.rot += (it.spin || 0) * dt;
        if (!this.done && !p.net && d2(it.x, it.y, p.x, p.y) < Math.pow(pr * 0.75 + it.r * 0.7, 2)) {
          if (it.bad) {
            if (p.inv > 0) continue;
            it.gone = true;
            G.recordTrash(run,it.type);
            p.slow = 1.8; p.inv=Math.max(p.inv,.75);
            SFX.bad();
            addText(this.fx, p.x, p.y - pr - 12, D.pesan.plastik, '#ff9aa8', 22);
          } else {
            it.gone = true;
            run.health = Math.min(100,run.health+.45);
            G.recordFood(run);
            SFX.eat();
            sparkle(this.fx, it.x, it.y, '255,250,190', 6);
            addText(this.fx, it.x, it.y - 14, '+5', '#fff6a8', 20);
          }
        }
      }
      this.items = this.items.filter((it) => !it.gone && it.x > -80);

      for (const n of this.nets) {
        n.x -= V * dt;
        n.y = clamp(n.y + n.vy * dt, SURF + n.h / 2 + 10, FLOOR - n.h / 2 - 5);
        if (n.y <= SURF + n.h / 2 + 10 || n.y >= FLOOR - n.h / 2 - 5) n.vy = -n.vy;
        if (!this.done && !p.net && p.netCool <= 0 && p.inv <= 0) {
          const cx = clamp(p.x, n.x - n.w / 2, n.x + n.w / 2), cy = clamp(p.y, n.y - n.h / 2, n.y + n.h / 2);
          if (d2(cx, cy, p.x, p.y) < Math.pow(pr * 0.6, 2)) {
            p.net = n;
            p.netOx = clamp(p.x - n.x, -n.w / 2 + 10, n.w / 2 - 10);
            p.netOy = clamp(p.y - n.y, -n.h / 2 + 10, n.h / 2 - 10);
            p.netMash = 0;
            p.netT = CFG.netTime;
            G.input.mash = 0;
            SFX.warn();
            G.toast(D.pesan.lepasJaring, 2.2, 'bad');
          }
        }
      }
      this.nets = this.nets.filter((n) => n === p.net || n.x > -n.w);

      for (const b of this.boats) {
        b.x += b.dir * b.v * dt - V * 0.3 * dt;
        const px = b.x + b.L * 0.42, py = SURF + 26;
        if (Math.random() < dt * 20) bubbles(this.fx, px, py, 1, 8);
        if (!this.done && p.inv <= 0 && !p.net && d2(px, py, p.x, p.y) < Math.pow(pr * 0.7 + 24, 2)) this.hurt('kapal');
      }
      this.boats = this.boats.filter((b) => b.x > -320);

      for (const s of this.streaks) { s.x -= V * s.v * dt; if (s.x < -s.l) { s.x = W + rand(0, 100); s.y = rand(SURF + 20, FLOOR - 20); } }

      if (run.health <= 0 && !this.done) this.hurt('sehat');
      if (!this.done && this.prog >= 1) {
        this.done = true;
        SFX.level();
        run.raw.tahap += 500;
        run.stage = 5;
        G.toast('Kamu sampai di perairan Banyuwangi!', 2, 'good');
        G.later(() => G.stageCard(5, () => G.setScene(Nest)), 1100);
      }
      ambient(this.fx, dt);
      updFx(this.fx, dt);
    },
    draw: function (ctx) {
      const t = G.t, p = this.p, pr = this.r, sp = this.sp;
      ctx.drawImage(buildOceanBG(3), 0, 0);
      // makin dekat pantai, air makin terang
      ctx.fillStyle = `rgba(40,190,210,${this.prog * 0.45})`;
      ctx.fillRect(0, SURF, W, H - SURF);
      drawRays(ctx, t, 0.6 + this.prog * 0.5);
      ctx.strokeStyle = 'rgba(200,240,255,0.25)';
      ctx.lineWidth = 2;
      for (const s of this.streaks) { ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + s.l, s.y); ctx.stroke(); }
      if (this.prog > 0.8) {
        const k = (this.prog - 0.8) / 0.2;
        ctx.fillStyle = '#d8c08a';
        ctx.beginPath();
        ctx.moveTo(W, H);
        ctx.lineTo(W - k * 520, H);
        ctx.quadraticCurveTo(W - k * 200, FLOOR - k * 120, W, FLOOR - k * 260);
        ctx.closePath();
        ctx.fill();
      }
      for (const n of this.nets) A.net(ctx, n.x, n.y, n.w, n.h, t + n.ph);
      for (const it of this.items) {
        if (it.bad) drawTrash(ctx, it, t);
        else drawFood(ctx, it, t);
      }
      if (!(p.inv > 0 && Math.floor(t * 10) % 2)) A.turtleSide(ctx, p.x, p.y, pr, sp, { t: t, facing: 1, tilt: p.tilt, swim: p.net ? 1.6 : 0.9 });
      if (p.net) {
        bar(ctx, p.x - 50, p.y - pr - 30, 100, 12, p.netMash / CFG.netMash[3], '#ffd166');
        ctx.font = '800 18px "Trebuchet MS", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText('KETUK! KETUK!', p.x, p.y - pr - 42);
      }
      for (const b of this.boats) A.boat(ctx, b.x, SURF, b.L, t, b.dir);
      drawSurface(ctx, t);
      drawFx(ctx, this.fx);
      for (const w of this.warns) {
        const a = 0.5 + 0.5 * Math.sin(t * 5);
        ctx.fillStyle = `rgba(255,60,60,${0.55 + a * 0.45})`;
        ctx.beginPath();
        ctx.moveTo(w.x, w.y - 24); ctx.lineTo(w.x + 22, w.y + 16); ctx.lineTo(w.x - 22, w.y + 16);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '900 22px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', w.x, w.y + 5);
      }
      drawHUD(ctx, { meters: true, center: { label: 'Tahap 4 · Pulang — ' + Math.round(this.prog*100) + '% perjalanan ke Banyuwangi', v: this.prog, col: '#7fd8ff' } });
      // peta mini
      const mx = W / 2 - 184, my = 84;
      ctx.save();
      ctx.font = '700 13px "Trebuchet MS", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.textAlign = 'left';
      ctx.fillText('Laut lepas', mx, my + 8);
      ctx.textAlign = 'right';
      ctx.fillText('Banyuwangi', mx + 400, my + 8);
      A.turtleTop(ctx, mx + 400 * this.prog, 62, 7, sp, { angle: 0, t: t });
      ctx.restore();
    }
  };

  /* ================================================================
   * Tahap 5: Bertelur di pantai Banyuwangi (malam, tampak atas)
   * ================================================================ */
  function drawSeaBottom(ctx, t, seaY) {
    const g = ctx.createLinearGradient(0, seaY, 0, H);
    g.addColorStop(0, '#1d4f73');
    g.addColorStop(1, '#0c2a47');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 14) ctx.lineTo(x, seaY + Math.sin(x * 0.015 + t * 1.3) * 9 + Math.sin(t * 0.7) * 6);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 14) {
      const y = seaY + Math.sin(x * 0.015 + t * 1.3) * 9 + Math.sin(t * 0.7) * 6;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const Nest = {
    isPlay: true,
    enter: function () {
      this.t = 0;
      this.frozen = false;
      this.done = false;
      this.fx = newFx();
      this.sp = G.run.sp;
      this.r = 35 * this.sp.stat.size;
      this.seaY = 620;
      this.start = { x: W / 2, y: 660 };
      this.p = { x: this.start.x, y: this.start.y, vx: 0, vy: 0, angle: -Math.PI / 2, inv: 1.5, hold: 0 };
      this.state = 'naik';
      this.disturb = 0;
      this.lights=[
        {x:145,y:330,angle:-.08,len:780,spread:.17,power:65,kind:'cafe'},
        {x:1135,y:455,angle:Math.PI+.13,len:760,spread:.14,power:60,kind:'kota'}
      ];
      this.piles = [];
      const spots = [[300, 300], [860, 420], [300, 520], [980, 230], [640, 400]];
      for (const s of spots) this.piles.push({ x: s[0] + rand(-30, 30), y: s[1] + rand(-20, 20), r: rand(22, 28), seed: Math.floor(rand(1, 99)) });
      this.zone = { y1: 150, y2: 240 };
      this.mash = 0;
      this.eggs = 0;
      this.shown = 0;
      this.layT = 0;
      this.trail = [];
      this.lastTrail = { x: this.p.x, y: this.p.y };
      this.relawan = null;
      this.lightHint = false;
    },
    calcEggs: function () {
      const r = G.run;
      const q = 0.55 * (r.health / 100) + (r.plasticFree ? 0.25 : 0) + 0.2 * (r.lives / r.maxLives) - 0.12 * r.disturbed;
      return Math.round(50 + 70 * clamp(q, 0, 1));
    },
    debugSkip: function () { this.p.y = this.zone.y2 - 2; },
    debugHurt: function () { this.disturb = 100; },
    lightAt: function(x,y) {
      let strength=0;
      for(const l of this.lights){
        const dx=x-l.x,dy=y-l.y,d=Math.hypot(dx,dy);
        const diff=Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-l.angle),Math.cos(Math.atan2(dy,dx)-l.angle)));
        if(d<l.len && diff<l.spread) strength+=(1-d/l.len)*(1-diff/l.spread)*l.power;
      }
      return strength;
    },
    botTarget: function() {
      // A continuous route remains clear even for the largest turtle.
      return this.p.y>535?{x:450,y:520}:{x:450,y:this.zone.y1};
    },
    update: function (dt) {
      if (this.frozen) return;
      this.t += dt;
      const p = this.p, run = G.run, sp = this.sp;
      p.inv -= dt;
      if (this.state === 'naik') {
        if (p.hold > 0) p.hold -= dt;
        else {
          crawlSand(p,dt,34*sp.stat.speed,G.bot?this.botTarget():{x:p.x,y:this.zone.y1});
          if(sandHeld() && Math.random()<dt*9)sand(this.fx,p.x,p.y+this.r*.5,2);
        }
        takeMash();
        for (const pl of this.piles) {
          const rr2 = pl.r + this.r * 0.7, d = dist(p.x, p.y, pl.x, pl.y);
          if (d < rr2 && d > 0.01) { p.x = pl.x + (p.x - pl.x) / d * rr2; p.y = pl.y + (p.y - pl.y) / d * rr2; }
        }
        p.x = clamp(p.x,210,W-210);
        p.y = clamp(p.y, this.zone.y1, 690);
        if (Math.hypot(p.vx, p.vy) > 6) p.angle = Math.atan2(p.vy, p.vx);
        if (dist(p.x, p.y, this.lastTrail.x, this.lastTrail.y) > 10) {
          this.trail.push({ x: p.x, y: p.y, a: p.angle });
          if (this.trail.length > 160) this.trail.shift();
          this.lastTrail = { x: p.x, y: p.y };
        }
        // gangguan cahaya
        const lit=p.inv<=0?this.lightAt(p.x,p.y):0;
        if (lit > 0) {
          this.disturb += lit * dt;
          if (!this.lightHint) { this.lightHint = true; G.toast('Cahaya kafe / kota mencapai pasir! Cari jalur yang gelap.', 3, 'bad'); }
        } else this.disturb = Math.max(0, this.disturb - 18 * dt);
        if (this.disturb >= 100) {
          this.disturb = 0;
          run.disturbed++;
          SFX.hurt();
          G.toast(D.pesan.terganggu, 2.8, 'bad');
          p.x = this.start.x; p.y = this.start.y; p.vx = p.vy = 0; p.inv = 1.8; p.hold = 0.8;
          this.trail = [];
        }
        if (p.y <= this.zone.y2) {
          this.state = 'gali';
          p.vx = p.vy = 0;
          G.input.mash = 0;
          G.toast(D.pesan.gali, 3);
        }
      } else if (this.state === 'gali') {
        const m=G.bot?dt*4:takeMash()+(sandHeld()?dt*4:0);
        if (m > 0) {
          this.mash += m;
          if(Math.floor(this.t*8)!==Math.floor((this.t-dt)*8)){SFX.mash();sand(this.fx,p.x-Math.cos(p.angle)*this.r,p.y-Math.sin(p.angle)*this.r,6);}
        }
        if (this.mash >= CFG.nestMash) {
          this.state = 'telur';
          this.eggs = this.calcEggs();
          this.layT = 0;
          G.toast('Penyumu bertelur!', 2.2, 'good');
        }
      } else if (this.state === 'telur') {
        this.layT += dt;
        const n = Math.min(this.eggs, Math.floor(this.layT / 2.4 * this.eggs));
        if (n > this.shown) { this.shown = n; if (n % 4 === 0) SFX.egg(); }
        if (this.layT >= 2.8) {
          this.state = 'relawan';
          this.layT = 0;
          this.relawan = { x: -40, y: this.p.y - 60 };
          G.toast(D.pesan.relawan, 4.5, 'good');
          SFX.win();
        }
      } else if (this.state === 'relawan') {
        this.layT += dt;
        if (this.relawan) this.relawan.x = lerp(this.relawan.x, p.x - 120, 1 - Math.exp(-1.5 * dt));
        if (this.layT >= 3.6 && !this.done) {
          this.done = true;
          run.eggs = this.eggs;
          run.raw.telur = this.eggs * 10;
          run.raw.bebas = run.plasticFree ? 1000 : 0;
          G.endRun(true);
        }
      }
      updFx(this.fx, dt);
    },
    draw: function (ctx) {
      const t = G.t, p = this.p, sp = this.sp;
      ctx.drawImage(buildSand('nest'), 0, 0);
      for (let i = 0; i < 14; i++) A.pandan(ctx, 40 + i * 92 + (i % 2) * 20, 70 + (i % 3) * 18, 52, t);
      drawSeaBottom(ctx, t, this.seaY);
      drawBeachDepthBottom(ctx, t, this.seaY);
      // area bertelur
      ctx.save();
      ctx.setLineDash([12, 10]);
      ctx.strokeStyle = `rgba(180,255,190,${0.45 + 0.25 * Math.sin(t * 3)})`;
      ctx.lineWidth = 3;
      rr(ctx, 60, this.zone.y1 - 6, W - 120, this.zone.y2 - this.zone.y1 + 12, 20);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(200,255,210,0.85)';
      ctx.font = '800 18px "Trebuchet MS", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Area bertelur (dekat pandan laut)', 80, this.zone.y1 + 16);
      ctx.restore();
      // jejak penyu
      ctx.fillStyle = 'rgba(30,25,15,0.4)';
      for (const tr of this.trail) {
        for (const s of [-1, 1]) {
          A.ell(ctx, tr.x + Math.cos(tr.a + s * 1.57) * this.r * 0.8, tr.y + Math.sin(tr.a + s * 1.57) * this.r * 0.8, 6, 2.5, tr.a + s * 0.6);
          ctx.fill();
        }
      }
      for (const pl of this.piles) A.trashPile(ctx, pl.x, pl.y, pl.r, pl.seed);
      if (this.state === 'telur' || this.state === 'relawan') {
        A.nestPit(ctx, p.x, p.y + this.r * 0.2, this.r * 1.2);
        const show = this.state === 'relawan' ? this.eggs : this.shown;
        for (let i = 0; i < Math.min(show, 40); i++) A.egg(ctx, p.x + ((i * 37) % 50) - 25, p.y + this.r * 0.9 + Math.floor(i / 8) * 5, 4);
      }
      if (!(p.inv > 0 && Math.floor(t * 10) % 2)) {
        const crawl = this.state === 'naik' ? Math.min(1, Math.hypot(p.vx, p.vy) / 30) : this.state === 'gali' ? 0.8 : 0;
        A.turtleTop(ctx, p.x, p.y, this.r, sp, { angle: p.angle, t: t, crawl: crawl });
      }
      if (this.relawan) A.person(ctx, this.relawan.x, this.relawan.y, 18, 0, t, '#ff8a3d');
      drawFx(ctx, this.fx);
      // malam & cahaya
      ctx.fillStyle = 'rgba(8,16,40,0.32)';
      ctx.fillRect(0, 0, W, H);
      A.coastalBuildings(ctx,this.lights,t);
      for(const l of this.lights)A.cone(ctx,l.x,l.y,l.angle,l.len,l.spread,'255,235,180',.7);
      if(this.state==='naik')sandHint(ctx);
      // HUD
      let center;
      if (this.state === 'naik') center = { label: 'Tahap 5 · Bertelur — Cahaya kafe / kota', v: this.disturb / 100, col: this.disturb > 60 ? '#ff5d73' : '#ffd166' };
      else if (this.state === 'gali') center = { label: 'Menggali sarang — tahan klik / Spasi', v: this.mash / CFG.nestMash, col: '#d9b46a' };
      else center = { label: 'Telur: ' + (this.state === 'relawan' ? this.eggs : this.shown) + ' butir', v: (this.state === 'relawan' ? 1 : this.shown / Math.max(1, this.eggs)), col: '#f8f3e3' };
      drawHUD(ctx, { meters: true, breath: false, center: center });
      if (this.state === 'gali') {
        ctx.font = '900 30px "Trebuchet MS", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 5;
        const s = 'TAHAN KLIK / SPASI';
        ctx.strokeText(s, p.x, p.y + this.r + 50);
        ctx.fillText(s, p.x, p.y + this.r + 50);
      }
    }
  };

  /* ---------------- Loop & ukuran layar ---------------- */
  G.resize = function () {
    const wrap = document.getElementById('stage');
    const vw = window.innerWidth, vh = window.innerHeight;
    const s = Math.min(vw / W, vh / H);
    G.scale = s;
    wrap.style.transform = `translate(${(vw - W * s) / 2}px, ${(vh - H * s) / 2}px) scale(${s})`;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.round(W * s * dpr), bh = Math.round(H * s * dpr);
    if (G.canvas.width !== bw || G.canvas.height !== bh) { G.canvas.width = bw; G.canvas.height = bh; }
    G.pxScale = bw / W;
  };

  function frame(ts) {
    const dt = Math.min(0.05, Math.max(0, (ts - G.last) / 1000));
    G.last = ts;
    G.t += dt;
    if (G.scene && !G.paused && G.scene.update) G.scene.update(dt);
    const ctx = G.ctx;
    ctx.setTransform(G.pxScale, 0, 0, G.pxScale, 0, 0);
    if (G.shake > 0) {
      G.shake -= dt;
      ctx.translate(rand(-6, 6) * G.shake * 3, rand(-6, 6) * G.shake * 3);
    }
    ctx.clearRect(-20, -20, W + 40, H + 40);
    if (G.scene && G.scene.draw) G.scene.draw(ctx);
    if (!G.paused) drawToast(ctx, dt);
    const dashButton=document.getElementById('btnDash');
    dashButton.classList.toggle('hidden', G.scene!==Ocean || G.paused);
    dashButton.setAttribute('aria-disabled', G.scene===Ocean && G.scene.dashCool>0 ? 'true' : 'false');
    requestAnimationFrame(frame);
  }

  G.init = function (canvas) {
    G.canvas = canvas;
    G.ctx = canvas.getContext('2d');
    const q = new URLSearchParams(location.search);
    G.bot = q.get('bot') === '1';
    G.debug = q.get('debug') === '1' || G.bot;
    bindInput();
    G.resize();
    window.addEventListener('resize', G.resize);
    window.addEventListener('orientationchange', () => setTimeout(G.resize, 200));
    G.setScene(Idle);
    requestAnimationFrame((ts) => { G.last = ts; frame(ts); });
  };

  G.Idle = Idle;
  G.scenes = { Ocean, Beach, Migrate, Nest };
  G.ecology = { PIXELS_CM, LIMITS, PRED };
  window.PB_GAME = G;
  window.__PB = G;
})();


