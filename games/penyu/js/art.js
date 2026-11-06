/* Semua gambar digambar langsung dengan kode (tanpa file gambar) supaya
 * game ringan, tajam di semua layar, dan bisa jalan tanpa internet. */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const A = {};

  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }
  A.rng = rng;

  function ell(ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU);
  }
  A.ell = ell;

  function paddle(ctx, L, w) {
    ctx.beginPath();
    ctx.moveTo(0, -w * 0.35);
    ctx.quadraticCurveTo(L * 0.45, -w * 1.0, L, -w * 0.12);
    ctx.quadraticCurveTo(L * 0.55, w * 0.75, 0, w * 0.35);
    ctx.closePath();
  }

  function shellPath(ctx, r) {
    ctx.beginPath();
    ctx.moveTo(-r * 1.0, r * 0.18);
    ctx.bezierCurveTo(-r * 0.95, -r * 0.8, r * 0.72, -r * 0.88, r * 0.98, r * 0.08);
    ctx.quadraticCurveTo(r * 0.1, r * 0.52, -r * 1.0, r * 0.18);
    ctx.closePath();
  }

  /* ---------------- Penyu tampak samping (di laut) ---------------- */
  /* Three-quarter turtle illustration. r is half the shell length. */
  A.turtleSide = function(ctx,x,y,r,sp,o={}) {
    const t=o.t||0, c=sp.warna, leather=sp.id==='belimbing';
    const phase=t*3.2, effort=Math.min(1.2,o.swim==null?.6:o.swim);
    ctx.save();ctx.translate(x,y);ctx.scale((o.facing||1)*r,r);ctx.rotate(o.tilt||0);
    if(o.alpha!=null)ctx.globalAlpha*=o.alpha;
    const shape=(d,fill,stroke,width=.018)=>{ctx.beginPath();d();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}};
    const oval=(x,y,a,b,col,rot=0)=>{ctx.beginPath();ctx.ellipse(x,y,a,b,rot,0,TAU);ctx.fillStyle=col;ctx.fill();};
    const flipper=(near,back)=>{
      ctx.save();ctx.translate(back?-.76:.52,near?.27:-.22);
      ctx.rotate((near?.4:-.7)+Math.sin(phase+(near?0:1.2))*.34*effort);
      const length=(back?.52:leather?1.55:1.03),dir=near?1:-1;
      const g=ctx.createLinearGradient(0,0,length*.3,dir*length);
      g.addColorStop(0,near?c.skin:c.skinDark);g.addColorStop(1,c.skinDark);
      shape(()=>{ctx.moveTo(-.12,0);ctx.bezierCurveTo(.32,-.05,.26,dir*length*.5,-.12,dir*length);ctx.bezierCurveTo(-.3,dir*length*.83,-.38,dir*length*.2,-.12,0);},g,'#243e39',.016);
      ctx.strokeStyle=leather?'#c0d6cf80':'#e0d8a050';ctx.lineWidth=.016;
      for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(-.16,dir*i*length/6);ctx.lineTo(.03,dir*(i+.3)*length/6);ctx.stroke();}
      ctx.restore();
    };
    flipper(false,false);flipper(false,true);
    shape(()=>{ctx.moveTo(-.82,.2);ctx.lineTo(-1.28,.25);ctx.lineTo(-.85,.1);},c.skinDark);
    // Cream plastron and neck under the shell.
    oval(0,.13,1,.43,c.belly);
    shape(()=>{ctx.moveTo(.7,-.2);ctx.bezierCurveTo(.99,-.2,1.12,-.17,1.23,-.03);ctx.lineTo(1.23,.18);ctx.lineTo(.7,.27);},c.skin,c.skinDark);
    const hs=o.baby?1.12:1;
    ctx.save();ctx.translate(1.24,0);ctx.scale(hs,hs);
    const head=ctx.createLinearGradient(0,-.3,0,.27);head.addColorStop(0,c.accent);head.addColorStop(.45,c.skin);head.addColorStop(1,c.skinDark);
    shape(()=>{ctx.moveTo(-.19,-.21);ctx.bezierCurveTo(.04,-.31,.31,-.21,.35,-.04);ctx.quadraticCurveTo(sp.id==='sisik'?.53:.39,.09,.23,.2);ctx.bezierCurveTo(-.02,.27,-.25,.17,-.23,-.02);},head,c.skinDark);
    if(!leather){
      ctx.strokeStyle=c.skinDark;ctx.lineWidth=.014;
      for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-.18+i*.1,-.17);ctx.lineTo(-.11+i*.11,-.03);ctx.lineTo(-.2+i*.11,.09);ctx.stroke();}
    }else for(let i=0;i<7;i++)oval(-.16+(i%4)*.08,-.16+Math.floor(i/4)*.13,.014,.014,'#d5dfd1');
    oval(.17,-.075,.066,.068,'#172a29');oval(.18,-.08,.032,.035,'#563f24');oval(.18,-.08,.020,.025,'#081b1d');oval(.193,-.1,.013,.015,'#fff4d6');
    ctx.strokeStyle=c.skinDark;ctx.lineWidth=.017;ctx.beginPath();ctx.moveTo(.33,.08);ctx.quadraticCurveTo(.17,.12,.07,.1);ctx.stroke();
    oval(.29,-.06,.009,.012,c.skinDark);ctx.restore();
    const shell=ctx.createLinearGradient(-.4,-.72,.3,.5);
    shell.addColorStop(0,leather?'#6a8580':c.accent);shell.addColorStop(.35,c.shell);shell.addColorStop(1,c.shellDark);
    const shellPath=()=>ell(ctx,-.02,-.08,1,.62,-.03);
    shellPath();ctx.fillStyle=shell;ctx.fill();ctx.strokeStyle='#1b3837';ctx.lineWidth=.035;ctx.stroke();
    ctx.save();shellPath();ctx.clip();
    if(leather){
      // Seven longitudinal ridges, without hard-shell scutes.
      for(let i=-3;i<=3;i++){
        ctx.strokeStyle=i%2?'#a0b3a170':'#172c3480';ctx.lineWidth=.022;ctx.beginPath();
        ctx.moveTo(-1,.08+i*.045);ctx.bezierCurveTo(-.55,-.25+i*.14,.6,-.27+i*.14,1,.01+i*.03);ctx.stroke();
      }
      const rand=rng(38);for(let i=0;i<65;i++)oval(rand()*1.9-.97,rand()*1.1-.62,.008+rand()*.008,.008,'#d7e5d090');
    }else{
      const rand=rng(31);ctx.lineWidth=.018;
      // Offset polygonal scutes, each with its own warm reflection.
      for(let row=-1;row<=1;row++)for(let col=-3;col<=3;col++){
        const cx=col*.36+(row%2)*.18,cy=row*.31-.1;
        ctx.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3+Math.PI/6;const px=cx+Math.cos(a)*.207,py=cy+Math.sin(a)*.207;if(k)ctx.lineTo(px,py);else ctx.moveTo(px,py);}ctx.closePath();
        ctx.fillStyle=sp.id==='sisik'?['#c5994c80','#e1b36580','#593a2880'][Math.floor(rand()*3)]:`rgba(225,217,157,${.025+rand()*.12})`;
        ctx.fill();ctx.strokeStyle=c.shellDark;ctx.stroke();
        if(sp.id==='sisik'){
          ctx.strokeStyle='#5b3e2670';ctx.lineWidth=.012;
          for(let k=0;k<3;k++){ctx.beginPath();ctx.moveTo(cx-.08+k*.06,cy-.09);ctx.lineTo(cx-.12+k*.06,cy+.08);ctx.stroke();}
          ctx.lineWidth=.018;
        }
      }
      // Rim plates distinguish the shell from an ordinary land tortoise.
      ctx.strokeStyle=c.accent;ctx.lineWidth=.065;ell(ctx,-.02,-.08,.94,.57,-.03);ctx.stroke();
      ctx.strokeStyle=c.shellDark;ctx.lineWidth=.018;
      for(let a=0;a<TAU;a+=.24){ctx.beginPath();ctx.moveTo(Math.cos(a)*.88-.02,Math.sin(a)*.52-.08);ctx.lineTo(Math.cos(a)*1.02-.02,Math.sin(a)*.64-.08);ctx.stroke();}
    }
    const sheen=ctx.createRadialGradient(-.33,-.43,.01,-.18,-.2,.85);sheen.addColorStop(0,'#fff3b235');sheen.addColorStop(1,'#fff3b200');
    ctx.fillStyle=sheen;ctx.fillRect(-1.1,-.75,2.2,1.5);ctx.restore();
    flipper(true,true);flipper(true,false);
    ctx.restore();
  };


  /* ---------------- Penyu tampak atas (di pantai) ---------------- */
  A.turtleTop = function (ctx, x, y, r, sp, o) {
    o = o || {};
    ctx.save(); ctx.globalAlpha *= 0.23; ctx.fillStyle = '#15150f'; ell(ctx, x + r * .16, y + r * .3, r * 1.18, r * .68, o.angle || 0); ctx.fill(); ctx.restore();
    const t = o.t || 0, c = sp.warna, id = sp.id;
    const crawl = o.crawl == null ? 1 : o.crawl;
    const sw = Math.sin(t * 7) * 0.45 * crawl;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(o.angle || 0);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const flipL = id === 'belimbing' ? 1.3 : 0.95;
    ctx.fillStyle = c.skinDark;
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(r * 0.3, s * r * 0.5);
      ctx.rotate(s * (1.95 + (s > 0 ? sw : -sw)));
      paddle(ctx, r * flipL, r * 0.34);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(-r * 0.62, s * r * 0.34);
      ctx.rotate(s * (2.5 - (s > 0 ? sw : -sw) * 0.5));
      paddle(ctx, r * 0.42, r * 0.24);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = c.skin;
    ell(ctx, r * 0.92, 0, r * 0.3, r * 0.25);
    ctx.fill();
    ctx.fillStyle = '#151515';
    ell(ctx, r * 1.02, -r * 0.13, r * 0.05, r * 0.05); ctx.fill();
    ell(ctx, r * 1.02, r * 0.13, r * 0.05, r * 0.05); ctx.fill();

    const g = ctx.createRadialGradient(-r * 0.1, -r * 0.1, r * 0.1, 0, 0, r * 0.9);
    g.addColorStop(0, c.accent);
    g.addColorStop(0.5, c.shell);
    g.addColorStop(1, c.shellDark);
    ctx.beginPath();
    if (id === 'belimbing') {
      ctx.moveTo(r * 0.75, 0);
      ctx.bezierCurveTo(r * 0.75, -r * 0.7, -r * 0.5, -r * 0.7, -r * 1.05, 0);
      ctx.bezierCurveTo(-r * 0.5, r * 0.7, r * 0.75, r * 0.7, r * 0.75, 0);
    } else {
      ctx.ellipse(0, 0, r * 0.82, r * 0.66, 0, 0, TAU);
    }
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = c.shellDark;
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.stroke();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = Math.max(1, r * 0.045);
    if (id === 'belimbing') {
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(r * 0.7, k * r * 0.12);
        ctx.quadraticCurveTo(0, k * r * 0.26, -r * 1.0, 0);
        ctx.stroke();
      }
    } else {
      // deretan scute tengah
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const cx = r * (0.45 - i * 0.32);
        ctx.moveTo(cx + r * 0.16, 0);
        ctx.lineTo(cx + r * 0.08, -r * 0.16);
        ctx.lineTo(cx - r * 0.08, -r * 0.16);
        ctx.lineTo(cx - r * 0.16, 0);
        ctx.lineTo(cx - r * 0.08, r * 0.16);
        ctx.lineTo(cx + r * 0.08, r * 0.16);
        ctx.closePath();
      }
      for (let i = 0; i < 4; i++) {
        const cx = r * (0.45 - i * 0.32);
        ctx.moveTo(cx + r * 0.08, -r * 0.16); ctx.lineTo(cx + r * 0.12, -r * 0.6);
        ctx.moveTo(cx + r * 0.08, r * 0.16); ctx.lineTo(cx + r * 0.12, r * 0.6);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.64, r * 0.48, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  };

  /* ---------------- Ikan ---------------- */
  A.fish = function (ctx, x, y, r, o) {
    o = o || {};
    const t = o.t || 0, f = o.facing || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(f, 1);
    ctx.rotate(o.tilt || 0);
    const wag = Math.sin(t * 9) * 0.25;
    ctx.save();
    ctx.translate(-r * 0.95, 0);
    ctx.rotate(wag);
    ctx.fillStyle = o.fin || o.body;
    ctx.beginPath();
    ctx.moveTo(r * 0.1, 0);
    ctx.lineTo(-r * 0.55, -r * 0.5);
    ctx.quadraticCurveTo(-r * 0.35, 0, -r * 0.55, r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const ry = r * (o.kind === 'barakuda' ? .24 : o.kind === 'kerapu' ? .62 : .52);
    const g = ctx.createLinearGradient(0, -ry, 0, ry);
    g.addColorStop(0, o.body);
    g.addColorStop(1, o.belly || o.body);
    ctx.fillStyle = o.fin || o.body;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -ry * 0.8);
    ctx.quadraticCurveTo(-r * 0.05, -ry * 1.6, r * 0.35, -ry * 0.85);
    ctx.closePath();
    ctx.fill();
    ell(ctx, 0, 0, r * 1.05, ry);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save(); ell(ctx,0,0,r*1.05,ry);ctx.clip();
    ctx.strokeStyle='rgba(237,247,214,.18)';ctx.lineWidth=Math.max(.5,r*.018);
    for(let row=-2;row<=2;row++) for(let k=-3;k<=2;k++) {
      ctx.beginPath();ctx.arc((k*.27+(row%2)*.13)*r,row*ry*.3,r*.14,-1,1);ctx.stroke();
    }
    ctx.restore();
    if (o.kind === 'kerapu') {
      ctx.fillStyle = 'rgba(40,20,10,0.35)';
      const rr = rng(3);
      for (let i = 0; i < 12; i++) { ell(ctx, (rr() * 1.6 - 0.8) * r, (rr() - 0.5) * ry * 1.4, r * 0.07, r * 0.07); ctx.fill(); }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.moveTo(r * 0.45, -ry * 0.6);
    ctx.quadraticCurveTo(r * 0.3, 0, r * 0.45, ry * 0.6);
    ctx.lineTo(r * 0.4, ry * 0.6);
    ctx.quadraticCurveTo(r * 0.25, 0, r * 0.4, -ry * 0.6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ell(ctx, r * 0.65, -ry * 0.25, r * 0.075, r * 0.075);
    ctx.fill();
    ctx.fillStyle = '#111';
    ell(ctx, r * 0.67, -ry * 0.25, r * 0.048, r * 0.048);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = Math.max(1, r * 0.04);
    ctx.beginPath();
    ctx.moveTo(r * 1.02, ry * 0.15);
    ctx.lineTo(r * 0.82, ry * 0.25);
    ctx.stroke();
    ctx.restore();
  };

  /* ---------------- Hiu ---------------- */
  A.shark = function (ctx, x, y, r, o) {
    o = o || {};
    const t = o.t || 0, f = o.facing || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(f, 1);
    ctx.rotate(o.tilt || 0);
    const wag = Math.sin(t * 6) * 0.18;
    const top = o.tiger ? '#6f7a72' : '#6b7f92';
    const dark = o.tiger ? '#3b443e' : '#3d4d5d';
    // ekor
    ctx.save();
    ctx.translate(-r * 1.25, -r * 0.02);
    ctx.rotate(wag);
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(r * 0.15, 0);
    ctx.lineTo(-r * 0.45, -r * 0.62);
    ctx.lineTo(-r * 0.25, 0);
    ctx.lineTo(-r * 0.38, r * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // sirip punggung
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(r * 0.15, -r * 0.3);
    ctx.quadraticCurveTo(-r * 0.05, -r * 0.65, -r * 0.3, -r * 0.82);
    ctx.lineTo(-r * 0.32, -r * 0.28);
    ctx.closePath();
    ctx.fill();
    // badan
    const g = ctx.createLinearGradient(0, -r * 0.4, 0, r * 0.4);
    g.addColorStop(0, top);
    g.addColorStop(0.55, top);
    g.addColorStop(0.62, '#dfe6ea');
    g.addColorStop(1, '#f2f5f6');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(r * 1.35, r * 0.02);
    ctx.quadraticCurveTo(r * 1.2, -r * 0.38, r * 0.4, -r * 0.4);
    ctx.quadraticCurveTo(-r * 0.6, -r * 0.42, -r * 1.3, -r * 0.05);
    ctx.quadraticCurveTo(-r * 0.6, r * 0.28, r * 0.4, r * 0.32);
    ctx.quadraticCurveTo(r * 1.15, r * 0.3, r * 1.35, r * 0.02);
    ctx.closePath();
    ctx.fill();
    if (o.tiger) {
      ctx.strokeStyle = 'rgba(30,35,30,0.45)';
      ctx.lineWidth = Math.max(1.5, r * 0.06);
      for (let i = 0; i < 7; i++) {
        const sx = r * (0.7 - i * 0.26);
        ctx.beginPath();
        ctx.moveTo(sx, -r * 0.36);
        ctx.lineTo(sx - r * 0.08, -r * 0.08);
        ctx.stroke();
      }
    }
    // sirip dada
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(r * 0.45, r * 0.2);
    ctx.lineTo(r * 0.05, r * 0.7);
    ctx.lineTo(r * 0.12, r * 0.25);
    ctx.closePath();
    ctx.fill();
    // insang
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = Math.max(1, r * 0.03);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(r * (0.62 - i * 0.07), -r * 0.12);
      ctx.lineTo(r * (0.58 - i * 0.07), r * 0.12);
      ctx.stroke();
    }
    ctx.fillStyle = '#0c0c0c';
    ell(ctx, r * 0.95, -r * 0.1, r * 0.06, r * 0.06);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.moveTo(r * 1.2, r * 0.14);
    ctx.quadraticCurveTo(r * 1.0, r * 0.2, r * 0.82, r * 0.14);
    ctx.stroke();
    ctx.restore();
  };

  /* ---------------- Ubur-ubur ---------------- */
  /* ---------------- Sampah ---------------- */
  A.bottle = function (ctx, x, y, r, t, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.fillStyle = 'rgba(170,220,240,0.6)';
    ctx.strokeStyle = 'rgba(220,245,255,0.9)';
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(-r * 1.1, -r * 0.42);
    ctx.lineTo(r * 0.5, -r * 0.42);
    ctx.quadraticCurveTo(r * 0.7, -r * 0.42, r * 0.85, -r * 0.18);
    ctx.lineTo(r * 1.05, -r * 0.18);
    ctx.lineTo(r * 1.05, r * 0.18);
    ctx.lineTo(r * 0.85, r * 0.18);
    ctx.quadraticCurveTo(r * 0.7, r * 0.42, r * 0.5, r * 0.42);
    ctx.lineTo(-r * 1.1, r * 0.42);
    ctx.quadraticCurveTo(-r * 1.25, 0, -r * 1.1, -r * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2f7de0';
    ctx.fillRect(r * 1.02, -r * 0.24, r * 0.22, r * 0.48);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(-r * 0.6, -r * 0.42, r * 0.55, r * 0.84);
    ctx.restore();
  };

  A.straw = function (ctx, x, y, r, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    const w = r * 2.2, h = Math.max(3, r * 0.28);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = '#ef4b5f';
    for (let i = 0; i < 6; i++) ctx.fillRect(-w / 2 + i * w / 6, -h / 2, w / 12, h);
    ctx.restore();
  };

  A.cap = function (ctx, x, y, r, col) {
    ctx.fillStyle = col || '#ff8a3d';
    ell(ctx, x, y, r, r * 0.85);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ell(ctx, x - r * 0.25, y - r * 0.25, r * 0.35, r * 0.25);
    ctx.fill();
  };

  A.net = function (ctx, x, y, w, h, t) {
    ctx.save();
    ctx.translate(x, y);
    const cols = Math.max(3, Math.round(w / 22)), rows = Math.max(3, Math.round(h / 22));
    const P = (i, j) => [
      -w / 2 + (i / cols) * w + Math.sin(t * 1.4 + j * 0.7) * 5,
      -h / 2 + (j / rows) * h + Math.sin(t * 1.1 + i * 0.6) * 4 + (j / rows) * Math.sin(i / cols * Math.PI) * 10
    ];
    ctx.strokeStyle = 'rgba(190,205,170,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) {
        const p = P(i, j);
        if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
    }
    for (let i = 0; i <= cols; i++) {
      for (let j = 0; j <= rows; j++) {
        const p = P(i, j);
        if (j === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,135,105,0.9)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let i = 0; i <= cols; i++) {
      const p = P(i, 0);
      if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke();
    for (let i = 0; i <= cols; i += 2) {
      const p = P(i, 0);
      ctx.fillStyle = '#ff7a2f';
      ell(ctx, p[0], p[1] - 4, 7, 6);
      ctx.fill();
    }
    ctx.restore();
  };

  /* ---------------- Kapal nelayan ---------------- */
  /* ---------------- Burung laut ---------------- */
  A.bird = function (ctx, x, y, r, t, dive, facing) {
    ctx.save(); ctx.translate(x, y); ctx.scale(facing || 1, 1);
    const flap = Math.sin(t * 8.5), pitch = dive ? 0.72 : -0.08 + flap * 0.04;
    ctx.rotate(pitch);
    // shadow under body gives separation from the dark beach overlay
    ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = '#08111b'; ell(ctx, -r * .05, r * .18, r * 1.05, r * .23); ctx.fill(); ctx.restore();
    // far wing
    ctx.fillStyle = '#8f9ba8'; ctx.beginPath(); ctx.moveTo(-r*.18,0);
    ctx.bezierCurveTo(-r*.55,-r*(.35+flap*.2),-r*1.45,-r*(.55+flap*.35),-r*1.72,-r*(.13+flap*.12));
    ctx.bezierCurveTo(-r*1.15,-r*.1,-r*.6,r*.12,r*.12,r*.12); ctx.closePath(); ctx.fill();
    // body and neck
    const bg=ctx.createLinearGradient(-r, -r*.2, r, r*.25); bg.addColorStop(0,'#dfe7ec'); bg.addColorStop(1,'#f8faf9');
    ctx.fillStyle=bg; ell(ctx,0,0,r*.92,r*.27,-.02); ctx.fill();
    ctx.beginPath(); ctx.moveTo(r*.48,-r*.12); ctx.quadraticCurveTo(r*.7,-r*.33,r*.78,-r*.05); ctx.quadraticCurveTo(r*.72,r*.13,r*.45,r*.14); ctx.closePath(); ctx.fill();
    // near wing
    ctx.fillStyle='#667584'; ctx.beginPath(); ctx.moveTo(-r*.2,r*.02);
    ctx.bezierCurveTo(-r*.38,r*(.25+flap*.22),-r*1.1,r*(.72+flap*.42),-r*1.55,r*(.25+flap*.18));
    ctx.bezierCurveTo(-r*.95,r*.12,-r*.42,r*.02,r*.18,-r*.03); ctx.closePath(); ctx.fill();
    // dark primary feathers
    ctx.strokeStyle='#33414e'; ctx.lineWidth=Math.max(1.5,r*.055); ctx.lineCap='round';
    for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-r*(1.05+i*.12),r*(.22+i*.03));ctx.lineTo(-r*(1.45+i*.08),r*(.38+i*.045));ctx.stroke();}
    // beak and eye
    ctx.fillStyle='#e7a43b'; ctx.beginPath(); ctx.moveTo(r*.72,-r*.08); ctx.lineTo(r*1.12,0); ctx.lineTo(r*.72,r*.07); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#101820'; ell(ctx,r*.66,-r*.09,r*.045,r*.045); ctx.fill();
    ctx.restore();
  };

  /* ---------------- Makanan ---------------- */
  // Magnified zooplankton: a stylised copepod, not a healing microalga.
  A.plankton = function(ctx,x,y,r,t) {
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*.8)*.25);
    ctx.strokeStyle='#d8edcbb0';ctx.lineWidth=1.15;
    for(let i=0;i<4;i++)for(const sign of [-1,1]) {
      ctx.beginPath();ctx.moveTo(sign*r*.16,r*(i*.24-.2));ctx.lineTo(sign*r*(.65-i*.07),r*(i*.3-.25));ctx.lineTo(sign*r*.85,r*(i*.3-.45));ctx.stroke();
    }
    const g=ctx.createLinearGradient(-r*.4,0,r*.4,0);g.addColorStop(0,'#94c4b355');g.addColorStop(.5,'#e2f3cea0');g.addColorStop(1,'#94c4b355');
    ell(ctx,0,-r*.05,r*.33,r*.69);ctx.fillStyle=g;ctx.fill();
    ctx.strokeStyle='#daf8d5a0';ctx.stroke();
    for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-r*.25,r*(i*.23-.1));ctx.quadraticCurveTo(0,r*(i*.23+.03),r*.25,r*(i*.23-.1));ctx.stroke();}
    for(const sign of [-1,1]){ctx.beginPath();ctx.moveTo(sign*r*.2,-r*.5);ctx.quadraticCurveTo(sign*r*.6,-r*1.1,sign*r*1.15,-r*.75);ctx.stroke();}
    ell(ctx,0,-r*.4,r*.045,r*.045);ctx.fillStyle='#335e62';ctx.fill();
    ctx.restore();
  };

  A.fishEggs = function (ctx, x, y, r) {
    const rr = rng(17);
    for (let i = 0; i < 7; i++) {
      const px = x + (rr() - 0.5) * r * 1.4, py = y + (rr() - 0.5) * r * 1.4;
      ctx.fillStyle = 'rgba(255,170,80,0.9)';
      ell(ctx, px, py, r * 0.32, r * 0.32);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ell(ctx, px - r * 0.1, py - r * 0.1, r * 0.1, r * 0.1);
      ctx.fill();
    }
  };

  A.shrimp = function (ctx, x, y, r, t, facing) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing || 1, 1);
    ctx.strokeStyle = '#ff9a8a';
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(r * 0.8, -r * 0.1);
    ctx.quadraticCurveTo(r * 1.5, -r * 0.8, r * 2.0, -r * 0.4 + Math.sin(t * 5) * r * 0.2);
    ctx.stroke();
    ctx.fillStyle = '#ff7f6e';
    ctx.beginPath();
    ctx.moveTo(r * 0.9, 0);
    ctx.quadraticCurveTo(r * 0.3, -r * 0.8, -r * 0.6, -r * 0.3);
    ctx.quadraticCurveTo(-r * 1.0, r * 0.1, -r * 0.7, r * 0.5);
    ctx.quadraticCurveTo(r * 0.2, r * 0.45, r * 0.9, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,40,30,0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(r * (0.5 - i * 0.3), -r * 0.45);
      ctx.lineTo(r * (0.45 - i * 0.3), r * 0.35);
      ctx.stroke();
    }
    ctx.fillStyle = '#222';
    ell(ctx, r * 0.6, -r * 0.2, r * 0.08, r * 0.08);
    ctx.fill();
    ctx.restore();
  };

  A.crabSide = function (ctx, x, y, r, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#d35400';
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const a = Math.sin(t * 10 + i) * 0.2;
        ctx.beginPath();
        ctx.moveTo(s * r * 0.4, r * 0.1);
        ctx.lineTo(s * r * (0.9 + i * 0.15), r * (0.2 + a));
        ctx.lineTo(s * r * (1.0 + i * 0.15), r * 0.7);
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#e8732a';
    ell(ctx, 0, 0, r * 0.75, r * 0.5);
    ctx.fill();
    for (const s of [-1, 1]) {
      ell(ctx, s * r * 0.95, -r * 0.45, r * 0.28, r * 0.22);
      ctx.fill();
    }
    ctx.fillStyle = '#222';
    ell(ctx, -r * 0.2, -r * 0.5, r * 0.08, r * 0.08); ctx.fill();
    ell(ctx, r * 0.2, -r * 0.5, r * 0.08, r * 0.08); ctx.fill();
    ctx.restore();
  };

  A.seagrass = function (ctx, x, y, r, t) {
    ctx.save();
    ctx.translate(x, y);
    for (let i = 0; i < 6; i++) {
      const bx = (i - 2.5) * r * 0.28;
      const h = r * (1.6 + (i % 3) * 0.35);
      const sw = Math.sin(t * 1.8 + i) * r * 0.35;
      ctx.strokeStyle = i % 2 ? '#3fa34d' : '#5cc160';
      ctx.lineWidth = Math.max(2, r * 0.18);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, r * 0.8);
      ctx.quadraticCurveTo(bx + sw * 0.4, r * 0.8 - h * 0.5, bx + sw, r * 0.8 - h);
      ctx.stroke();
    }
    ctx.restore();
  };

  A.sponge = function (ctx, x, y, r, t, hue) {
    ctx.save();
    ctx.translate(x, y);
    const cols = hue === 1 ? ['#9b59b6', '#7d3c98'] : ['#ff9f43', '#e67e22'];
    const tubes = [[-0.45, 1.2], [0, 1.6], [0.45, 1.0]];
    for (const [bx, h] of tubes) {
      ctx.fillStyle = cols[0];
      ctx.beginPath();
      ctx.moveTo(r * (bx - 0.2), r * 0.8);
      ctx.lineTo(r * (bx - 0.24), r * (0.8 - h));
      ctx.lineTo(r * (bx + 0.24), r * (0.8 - h));
      ctx.lineTo(r * (bx + 0.2), r * 0.8);
      ctx.fill();
      ctx.fillStyle = cols[1];
      ell(ctx, r * bx, r * (0.8 - h), r * 0.24, r * 0.09);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ell(ctx, r * bx, r * (0.8 - h), r * 0.14, r * 0.05);
      ctx.fill();
    }
    ctx.restore();
  };

  A.sargassum = function (ctx, x, y, w, t) {
    ctx.save();
    ctx.translate(x, y);
    const rr = rng(Math.floor(w * 13));
    ctx.strokeStyle = '#a9782c';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const bx = (rr() - 0.5) * w;
      const len = 25 + rr() * 35;
      const sw = Math.sin(t * 1.5 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.quadraticCurveTo(bx + sw, len * 0.5, bx + sw * 1.5 + (rr() - 0.5) * 20, len);
      ctx.stroke();
    }
    for (let i = 0; i < 26; i++) {
      const bx = (rr() - 0.5) * w, by = rr() * 45;
      ctx.fillStyle = i % 3 ? '#c8973c' : '#d9b04f';
      ell(ctx, bx + Math.sin(t + i) * 2, by, 9 + rr() * 6, 4 + rr() * 3, rr() * 3);
      ctx.fill();
      if (i % 2 === 0) {
        ctx.fillStyle = '#8f6421';
        ell(ctx, bx + 6, by + 4, 3, 3);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  /* ---------------- Elemen pantai (tampak atas) ---------------- */
  A.ghostCrab = function (ctx, x, y, r, t, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    ctx.strokeStyle = '#e8dcc0';
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const a = Math.sin(t * 16 + i * 1.3) * 0.25;
        ctx.beginPath();
        ctx.moveTo((i - 1.5) * r * 0.25, s * r * 0.35);
        ctx.lineTo((i - 1.5) * r * 0.32 + a * r, s * r * 1.0);
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#f2e7cc';
    ell(ctx, 0, 0, r * 0.62, r * 0.55);
    ctx.fill();
    ctx.fillStyle = '#d8c79f';
    ell(ctx, r * 0.55, -r * 0.35, r * 0.25, r * 0.18); ctx.fill();
    ell(ctx, r * 0.55, r * 0.35, r * 0.25, r * 0.18); ctx.fill();
    ctx.fillStyle = '#111';
    ell(ctx, r * 0.45, -r * 0.18, r * 0.09, r * 0.09); ctx.fill();
    ell(ctx, r * 0.45, r * 0.18, r * 0.09, r * 0.09); ctx.fill();
    ctx.restore();
  };

  A.lampGlow = function (ctx, x, y, R, t, alpha) {
    const fl = 1 + Math.sin(t * 13) * 0.02;
    const g = ctx.createRadialGradient(x, y, 0, x, y, R * fl);
    g.addColorStop(0, `rgba(255,236,170,${0.75 * alpha})`);
    g.addColorStop(0.35, `rgba(255,214,120,${0.32 * alpha})`);
    g.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = g;
    ell(ctx, x, y, R * fl, R * fl);
    ctx.fill();
  };

  A.lampPost = function (ctx, x, y) {
    ctx.fillStyle = '#3b3b3b';
    ell(ctx, x, y, 10, 10);
    ctx.fill();
    ctx.fillStyle = '#fff6cf';
    ell(ctx, x, y, 6, 6);
    ctx.fill();
  };

  A.person = function (ctx, x, y, r, angle, t, vest) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const step = Math.sin(t * 8) * r * 0.25;
    ctx.fillStyle = '#2d2d2d';
    ell(ctx, step, -r * 0.3, r * 0.3, r * 0.18); ctx.fill();
    ell(ctx, -step, r * 0.3, r * 0.3, r * 0.18); ctx.fill();
    ctx.fillStyle = vest || '#3d6fa8';
    ell(ctx, 0, 0, r * 0.45, r * 0.8);
    ctx.fill();
    ctx.fillStyle = '#d9a77c';
    ell(ctx, r * 0.1, 0, r * 0.38, r * 0.38);
    ctx.fill();
    ctx.fillStyle = '#2b1d14';
    ell(ctx, -r * 0.02, 0, r * 0.33, r * 0.34);
    ctx.fill();
    ctx.restore();
  };

  A.cone = function (ctx, x, y, angle, len, spread, col, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, len);
    g.addColorStop(0, `rgba(${col},${0.55 * alpha})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, len, angle - spread, angle + spread);
    ctx.closePath();
    ctx.fill();
  };

  A.log = function (ctx, x, y, r, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = '#6e4b2a';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.5, r * 0.5, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#4a3019';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 1.1, -r * 0.1); ctx.lineTo(r * 0.8, -r * 0.18);
    ctx.moveTo(-r * 0.6, r * 0.2); ctx.lineTo(r * 1.0, r * 0.12);
    ctx.stroke();
    ctx.fillStyle = '#a07a4f';
    ell(ctx, r * 1.45, 0, r * 0.18, r * 0.45);
    ctx.fill();
    ctx.restore();
  };

  A.trashPile = function (ctx, x, y, r, seed) {
    const rr = rng(seed || 3);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ell(ctx, x + 3, y + 4, r * 1.1, r * 0.8);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const px = x + (rr() - 0.5) * r * 1.2, py = y + (rr() - 0.5) * r * 0.9;
      const k = rr();
      if (k < 0.35) A.bottle(ctx, px, py, r * 0.35, 0, rr() * 6);
      else if (k < 0.6) A.cap(ctx, px, py, r * 0.15, ['#e74c3c', '#3498db', '#f1c40f'][i % 3]);
      else {
        ctx.fillStyle = ['rgba(240,240,240,0.85)', 'rgba(52,152,219,0.7)', 'rgba(231,76,60,0.7)'][i % 3];
        ell(ctx, px, py, r * 0.35, r * 0.22, rr() * 3);
        ctx.fill();
      }
    }
  };

  A.pandan = function (ctx, x, y, r, t) {
    ctx.save();
    ctx.translate(x, y);
    for (let i = 0; i < 11; i++) {
      const a = -Math.PI / 2 + (i - 5) * 0.28 + Math.sin(t * 0.8 + i) * 0.03;
      const L = r * (1.0 + (i % 3) * 0.25);
      ctx.strokeStyle = i % 2 ? '#2f7d3a' : '#3f9a4a';
      ctx.lineWidth = Math.max(2, r * 0.12);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(Math.cos(a) * L * 0.5, Math.sin(a) * L * 0.5 - r * 0.1, Math.cos(a) * L, Math.sin(a) * L);
      ctx.stroke();
    }
    ctx.restore();
  };

  A.incubator = function (ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-36, -26, 80, 60);
    ctx.fillStyle = '#e9f1f7';
    ctx.fillRect(-40, -30, 80, 60);
    ctx.strokeStyle = '#7f9db4';
    ctx.lineWidth = 3;
    ctx.strokeRect(-40, -30, 80, 60);
    ctx.fillStyle = '#183b5c';
    ctx.fillRect(-28, -20, 56, 18);
    ctx.fillStyle = '#5ef2a3';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('28,5°C', 0, -11);
    ctx.fillStyle = '#f7f1df';
    for (let i = 0; i < 5; i++) { ell(ctx, -24 + i * 12, 14, 5, 6); ctx.fill(); }
    ctx.restore();
  };

  A.fence = function (ctx, x, y, w, h) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#a57c45';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.moveTo(w / 2, -h / 2);
    ctx.lineTo(-w / 2, -h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#7a5a2e';
    for (let i = 0; i <= 6; i++) {
      ell(ctx, -w / 2 + (i / 6) * w, -h / 2, 4, 4); ctx.fill();
      ell(ctx, -w / 2 + (i / 6) * w, h / 2, 4, 4); ctx.fill();
    }
    ctx.restore();
  };

  A.nestPit = function (ctx, x, y, r) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(70,50,30,0.8)');
    g.addColorStop(1, 'rgba(70,50,30,0)');
    ctx.fillStyle = g;
    ell(ctx, x, y, r, r * 0.8);
    ctx.fill();
    ctx.fillStyle = '#f3ecd8';
    const rr = rng(21);
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.translate(x + (rr() - 0.5) * r, y + (rr() - 0.5) * r * 0.7);
      ctx.rotate(rr() * 6);
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI);
      ctx.fill();
      ctx.restore();
    }
  };

  A.egg = function (ctx, x, y, s) {
    ctx.fillStyle = '#f8f3e3';
    ell(ctx, x, y, s, s * 1.05);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ell(ctx, x - s * 0.3, y - s * 0.3, s * 0.3, s * 0.25);
    ctx.fill();
  };

  /* ---------------- Ikon HUD ---------------- */
  A.heart = function (ctx, x, y, s, col) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = col || '#ff5d73';
    ctx.beginPath();
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.45, -s * 1.0, 0, -s * 0.45);
    ctx.bezierCurveTo(s * 0.45, -s * 1.0, s * 1.1, -s * 0.35, 0, s * 0.35);
    ctx.fill();
    ctx.restore();
  };

  A.bubbleIcon = function (ctx, x, y, s) {
    ctx.strokeStyle = '#bfe9ff';
    ctx.lineWidth = 2;
    ell(ctx, x, y, s * 0.55, s * 0.55);
    ctx.stroke();
    ell(ctx, x + s * 0.55, y - s * 0.45, s * 0.25, s * 0.25);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ell(ctx, x - s * 0.18, y - s * 0.18, s * 0.12, s * 0.12);
    ctx.fill();
  };

  A.leafIcon = function (ctx, x, y, s) {
    ctx.fillStyle = '#7ee08a';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.7, y + s * 0.5);
    ctx.quadraticCurveTo(x - s * 0.6, y - s * 0.7, x + s * 0.7, y - s * 0.6);
    ctx.quadraticCurveTo(x + s * 0.5, y + s * 0.6, x - s * 0.7, y + s * 0.5);
    ctx.fill();
  };

  /* Gambar kecil penyu untuk kartu pilihan (canvas terpisah) */
  A.renderPortrait = function (canvas, sp, t) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#387e84');
    g.addColorStop(1, '#153f52');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(w * (0.1 + i * 0.25), 0);
      ctx.lineTo(w * (0.2 + i * 0.25), 0);
      ctx.lineTo(w * (0.05 + i * 0.25), h);
      ctx.lineTo(w * (-0.05 + i * 0.25), h);
      ctx.fill();
    }
    const r = h * 0.3 * (sp.id === 'belimbing' ? 1.08 : sp.id === 'lekang' ? 0.92 : 1);
    A.turtleSide(ctx, w * 0.44, h * 0.5 + Math.sin(t * 1.5) * 3, r, sp, { t: t, facing: 1, swim: 0.6 });
  };

  A.can = function(ctx,x,y,r,rot) {
    ctx.save();ctx.translate(x,y);ctx.rotate(rot||0);
    const g=ctx.createLinearGradient(-r,0,r,0);g.addColorStop(0,'#708f91');g.addColorStop(.4,'#d8e4db');g.addColorStop(1,'#68888a');
    ctx.fillStyle=g;ctx.fillRect(-r*.65,-r,r*1.3,r*2);
    ctx.fillStyle='#cf835f';ctx.fillRect(-r*.65,-r*.45,r*1.3,r*.9);
    ell(ctx,0,-r,r*.65,r*.22);ctx.fillStyle='#dbe8df';ctx.fill();
    ell(ctx,0,-r,r*.22,r*.1);ctx.strokeStyle='#5e787b';ctx.lineWidth=1.2;ctx.stroke();
    ctx.restore();
  };
  A.rope = function(ctx,x,y,r,t) {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle='#a1c4a6';ctx.lineWidth=2.3;
    ctx.beginPath();ctx.moveTo(-r,-r*.4);ctx.bezierCurveTo(r,-r*1.6,-r*1.2,r*1.4,r*.6,r*.5);ctx.bezierCurveTo(r*1.8,0,-r*.5,-r,r,-r*.7+Math.sin(t)*3);ctx.stroke();
    ctx.strokeStyle='#34544c';ctx.lineWidth=.8;ctx.setLineDash([2,3]);ctx.stroke();ctx.restore();
  };
  /* v7 marine illustrations: distinct silhouettes, soft material highlights. */
  A.jelly=function(ctx,x,y,r,t,col=[185,220,238]) {
    ctx.save();ctx.translate(x,y);const pulse=1+Math.sin(t*2.6)*.065;
    const rgb=col.join(',');ctx.strokeStyle=`rgba(${rgb},.58)`;ctx.lineWidth=Math.max(.8,r*.045);
    for(let i=0;i<7;i++){
      const sx=(i-3)*r*.23;ctx.beginPath();ctx.moveTo(sx,0);
      for(let k=1;k<9;k++)ctx.lineTo(sx+Math.sin(t*1.7+k*.75+i)*r*.1,k*r*.16);ctx.stroke();
    }
    for(let i=-1;i<=1;i++){
      ctx.strokeStyle=`rgba(${rgb},.34)`;ctx.lineWidth=r*.16;
      ctx.beginPath();ctx.moveTo(i*r*.3,-r*.2);ctx.bezierCurveTo(i*r*.45+r*.2,r*.5,i*r*.3-r*.3,r*.9,i*r*.2,r*1.15);ctx.stroke();
    }
    const g=ctx.createRadialGradient(-r*.25,-r*.4,0,0,-r*.1,r);
    g.addColorStop(0,`rgba(${rgb},.85)`);g.addColorStop(.5,`rgba(${rgb},.42)`);g.addColorStop(1,`rgba(${rgb},.16)`);
    ctx.beginPath();ctx.moveTo(-r*pulse,0);ctx.bezierCurveTo(-r*pulse,-r*1.15,r*pulse,-r*1.15,r*pulse,0);
    ctx.quadraticCurveTo(r*.5,r*.2,0,r*.1);ctx.quadraticCurveTo(-r*.5,r*.2,-r*pulse,0);ctx.fillStyle=g;ctx.fill();
    ctx.strokeStyle=`rgba(${rgb},.84)`;ctx.lineWidth=1.1;ctx.stroke();
    ctx.strokeStyle=`rgba(${rgb},.32)`;ctx.lineWidth=.8;
    for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(0,-r*.75);ctx.quadraticCurveTo(i*r*.5,-r*.5,i*r*.65,r*.02);ctx.stroke();}
    ctx.fillStyle=`rgba(${rgb},.5)`;
    for(let i=0;i<4;i++){const a=i*Math.PI/2;ell(ctx,Math.cos(a)*r*.19,-r*.25+Math.sin(a)*r*.14,r*.13,r*.1);ctx.fill();}
    ctx.restore();
  };
  A.bag=function(ctx,x,y,r,t) {
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*.9)*.18);
    const g=ctx.createLinearGradient(-r,-r,r,r);g.addColorStop(0,'#dce8df85');g.addColorStop(.4,'#eff5dd38');g.addColorStop(1,'#c8ddd678');
    ctx.strokeStyle='#d3e8e3b0';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(-r*.65,-r*.4);ctx.lineTo(-r*.78,r*.65);ctx.quadraticCurveTo(0,r*.9,r*.75,r*.6);ctx.lineTo(r*.62,-r*.4);ctx.lineTo(r*.25,-r*.4);ctx.lineTo(r*.18,-r*.05);ctx.lineTo(-r*.22,-r*.05);ctx.lineTo(-r*.28,-r*.4);ctx.closePath();ctx.fillStyle=g;ctx.fill();ctx.stroke();
    for(const sign of [-1,1]){ctx.beginPath();ctx.ellipse(sign*r*.44,-r*.46,r*.17,r*.37,0,Math.PI,Math.PI*2);ctx.stroke();}
    ctx.strokeStyle='#e2eeeb70';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(-r*.5,-r*.1);ctx.lineTo(-r*.3,r*.58);ctx.lineTo(-r*.05,r*.15);ctx.lineTo(r*.12,r*.7);ctx.moveTo(r*.5,-r*.12);ctx.lineTo(r*.38,r*.56);ctx.stroke();ctx.restore();
  };
  A.algae=function(ctx,x,y,r,t) {
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*.7)*.16);
    ctx.strokeStyle='#87ad77';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-r*.8,r*.4);ctx.quadraticCurveTo(0,0,r*.8,-r*.4);ctx.stroke();
    for(let i=0;i<7;i++){
      const px=(i-3)*r*.22,py=-px*.5;
      ctx.fillStyle=i%2?'#8db67c':'#5d946d';ctx.beginPath();ctx.moveTo(px,py);ctx.bezierCurveTo(px-r*.42,py-r*.55,px+r*.13,py-r*.9,px+r*.1,py-r*.15);ctx.quadraticCurveTo(px+r*.7,py+r*.17,px,py);ctx.fill();
    }
    ctx.restore();
  };
  A.boat=function(ctx,x,sy,L,t,facing) {
    ctx.save();ctx.translate(x,sy+Math.sin(t*1.6)*1.5);ctx.scale(facing||1,1);
    const hull=ctx.createLinearGradient(0,-25,0,19);hull.addColorStop(0,'#668f8c');hull.addColorStop(.3,'#2f666b');hull.addColorStop(1,'#153b4b');
    ctx.beginPath();ctx.moveTo(-L*.5,-24);ctx.lineTo(L*.53,-29);ctx.quadraticCurveTo(L*.44,14,L*.29,17);ctx.lineTo(-L*.42,17);ctx.quadraticCurveTo(-L*.5,10,-L*.5,-24);ctx.closePath();ctx.fillStyle=hull;ctx.fill();ctx.strokeStyle='#183c47';ctx.lineWidth=2;ctx.stroke();
    ctx.save();ctx.clip();ctx.fillStyle='#f0c396';ctx.fillRect(-L*.52,-16,L*1.1,4);
    ctx.strokeStyle='#afd0bb30';ctx.lineWidth=1;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-L*.45,-4+i*6);ctx.lineTo(L*.48,-7+i*6);ctx.stroke();}ctx.restore();
    ctx.fillStyle='#c4bb9b';ctx.fillRect(-L*.24,-54,L*.28,29);
    ctx.fillStyle='#194b5c';ctx.fillRect(-L*.21,-49,L*.08,16);ctx.fillRect(-L*.1,-49,L*.08,16);
    ctx.fillStyle='#a8d2cc80';ctx.fillRect(-L*.21,-49,L*.018,16);ctx.fillRect(-L*.1,-49,L*.018,16);
    ctx.fillStyle='#a9815e';ctx.fillRect(-L*.27,-58,L*.34,6);
    ctx.strokeStyle='#839d93';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(L*.2,-26);ctx.lineTo(L*.2,-74);ctx.moveTo(-L*.35,-24);ctx.lineTo(-L*.35,-40);ctx.lineTo(-L*.23,-40);ctx.stroke();
    ctx.strokeStyle='#d0c5a78c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(L*.2,-72);ctx.lineTo(L*.42,-26);ctx.moveTo(L*.2,-72);ctx.lineTo(-L*.22,-26);ctx.stroke();
    ctx.fillStyle='#d87d67';ctx.fillRect(L*.2,-73,27,6);ctx.fillStyle='#ece4cb';ctx.fillRect(L*.2,-67,27,6);
    ctx.strokeStyle='#c7c7af';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-L*.42,0);ctx.lineTo(-L*.42,27);ctx.stroke();
    ctx.save();ctx.translate(-L*.42,27);ctx.rotate(t*18);ctx.fillStyle='#c9ab6e';ell(ctx,0,0,4,13);ctx.fill();ell(ctx,0,0,13,4);ctx.fill();ctx.restore();
    ctx.strokeStyle='#d5efe080';ctx.lineWidth=1.3;
    for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-L*.55-i*10,18+i*2);ctx.quadraticCurveTo(-L*.49,24+i*2,-L*.4,18+i*2);ctx.stroke();}
    ctx.restore();
  };

  A.tornBag=function(ctx,x,y,r,t,fragment) {
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*.65)*.17);
    const g=ctx.createLinearGradient(-r,-r,r,r);g.addColorStop(0,'#d4e2dc99');g.addColorStop(.5,'#d6e0dc38');g.addColorStop(1,'#c9d9df80');
    ctx.beginPath();ctx.moveTo(-r*.8,-r*.25);ctx.lineTo(-r*.48,-r*.8);ctx.lineTo(-r*.14,-r*.66);ctx.lineTo(r*.18,-r*.86);ctx.lineTo(r*.76,-r*.2);
    ctx.lineTo(r*.63,r*.35);ctx.lineTo(r*.3,r*.18);ctx.lineTo(r*.05,r*.4);ctx.lineTo(-r*.32,r*.16);ctx.lineTo(-r*.69,r*.4);ctx.closePath();
    if(!fragment){ctx.moveTo(-r*.32,-r*.4);ctx.lineTo(-r*.22,-r*.52);ctx.lineTo(-r*.03,-r*.36);ctx.lineTo(-r*.15,-r*.2);ctx.lineTo(-r*.28,-r*.23);ctx.closePath();}
    ctx.fillStyle=g;ctx.fill('evenodd');ctx.strokeStyle='#d6e8e4a0';ctx.lineWidth=1;ctx.stroke();
    const count=fragment?4:7;
    for(let i=0;i<count;i++){
      const sx=(i/(count-1)-.5)*r*1.3,L=r*(.65+(i%3)*.22),sw=Math.sin(t*1.6+i)*r*.12;
      ctx.beginPath();ctx.moveTo(sx-r*.055,r*.15);ctx.bezierCurveTo(sx+sw,r*.5,sx-sw,r*.95,sx+sw*.8,r*.2+L);ctx.lineTo(sx+sw*.8+r*.055,r*.12+L);ctx.bezierCurveTo(sx+r*.1-sw,r*.7,sx+sw+r*.12,r*.5,sx+r*.07,r*.16);ctx.closePath();ctx.fillStyle=i%2?'#dce6df70':'#cbdde17a';ctx.fill();
    }
    ctx.strokeStyle='#eff5e96b';ctx.lineWidth=.75;ctx.beginPath();ctx.moveTo(-r*.5,-r*.45);ctx.lineTo(-r*.12,r*.14);ctx.moveTo(r*.5,-r*.34);ctx.lineTo(r*.15,r*.18);ctx.stroke();ctx.restore();
  };
  A.shellfish=function(ctx,x,y,r) {
    ctx.save();ctx.translate(x,y);const g=ctx.createLinearGradient(0,-r,0,r);g.addColorStop(0,'#ded4ae');g.addColorStop(1,'#846d61');
    ctx.beginPath();ctx.moveTo(-r*.7,r*.2);ctx.bezierCurveTo(-r*.95,-r*.8,r*.95,-r*.8,r*.7,r*.2);ctx.quadraticCurveTo(0,r*.55,-r*.7,r*.2);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#71635b';ctx.lineWidth=1;ctx.stroke();
    for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*r*.24,-r*.34);ctx.quadraticCurveTo(i*r*.13,-r*.1,i*r*.12,r*.3);ctx.stroke();}
    ctx.restore();
  };
  A.seaSnail=function(ctx,x,y,r,t) {
    ctx.save();ctx.translate(x,y);ctx.fillStyle='#a4ae88';ell(ctx,r*.05,r*.25,r*.9,r*.19);ctx.fill();
    const g=ctx.createRadialGradient(-r*.2,-r*.2,0,0,0,r*.7);g.addColorStop(0,'#ecd7a7');g.addColorStop(1,'#947252');ctx.fillStyle=g;ell(ctx,-r*.08,-r*.08,r*.63,r*.57);ctx.fill();
    ctx.strokeStyle='#715c45';ctx.lineWidth=1.4;ctx.beginPath();for(let a=0;a<Math.PI*4.5;a+=.15){const rad=r*.035*a;const px=Math.cos(a)*rad-r*.08,py=Math.sin(a)*rad-r*.08;if(a)ctx.lineTo(px,py);else ctx.moveTo(px,py);}ctx.stroke();ctx.restore();
  };
  A.salp=function(ctx,x,y,r,t) {
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*.8)*.18);ctx.strokeStyle='#d5e7dfa0';ctx.lineWidth=1;
    for(let j=-1;j<=1;j++){
      ell(ctx,j*r*.52,Math.sin(t+j)*r*.07,r*.42,r*.57,.15);ctx.fillStyle='#d1e2dd24';ctx.fill();ctx.stroke();
      for(let k=-1;k<=1;k++){ctx.beginPath();ctx.ellipse(j*r*.52,0,r*.18+k*r*.04,r*.5,0,-1.2,1.2);ctx.stroke();}
      ell(ctx,j*r*.52+r*.1,r*.18,r*.08,r*.1);ctx.fillStyle='#b69f6cbd';ctx.fill();
    }ctx.restore();
  };
  A.tunicate=function(ctx,x,y,r,t) {
    ctx.save();ctx.translate(x,y);ctx.fillStyle='#b89b73';ctx.beginPath();ctx.moveTo(-r*.65,r*.6);ctx.bezierCurveTo(-r*.85,-r*.5,-r*.45,-r*.8,-r*.1,-r*.25);ctx.bezierCurveTo(r*.05,-r*.8,r*.85,-r*.6,r*.65,r*.6);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#e3c69d';ctx.lineWidth=1.5;ctx.stroke();
    for(const sign of [-1,1]){ell(ctx,sign*r*.34,-r*.35,r*.17,r*.12);ctx.fillStyle='#4c5149';ctx.fill();ctx.stroke();}ctx.restore();
  };
  A.redAlgae=function(ctx,x,y,r,t) {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle='#b9908c';ctx.lineCap='round';
    for(let i=-2;i<=2;i++){ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,r*.65);const xx=i*r*.26+Math.sin(t*.8+i)*r*.08;ctx.quadraticCurveTo(xx*.4,0,xx,-r*.7);ctx.moveTo(xx*.6,-r*.1);ctx.lineTo(xx-r*.2,-r*.45);ctx.moveTo(xx*.8,-r*.3);ctx.lineTo(xx+r*.2,-r*.6);ctx.stroke();}ctx.restore();
  };
  A.broadSeagrass=function(ctx,x,y,r,t) {
    ctx.save();ctx.translate(x,y);for(let i=-2;i<=2;i++){
      const sway=Math.sin(t*.9+i)*r*.13;ctx.fillStyle=i%2?'#6e9f77':'#95b285';ctx.beginPath();ctx.moveTo(i*r*.13,r*.5);ctx.bezierCurveTo(i*r*.2-r*.12,-r*.1,i*r*.25+sway,-r*1.1,i*r*.29+sway,-r*.8);ctx.quadraticCurveTo(i*r*.35+sway,0,i*r*.13,r*.5);ctx.fill();
    }ctx.restore();
  };
  A.diver=function(ctx,x,y,r,t,dir) {
    ctx.save();ctx.translate(x,y);ctx.scale(dir,1);
    const kick=Math.sin(t*4)*r*.18;ctx.lineCap='round';
    // Legs, fins and dark wetsuit: the red capture net identifies illegal intent.
    ctx.strokeStyle='#172e40';ctx.lineWidth=r*.19;
    for(const sign of [-1,1]){ctx.beginPath();ctx.moveTo(-r*.2,sign*r*.12);ctx.lineTo(-r*.78,sign*r*.25+kick*sign);ctx.lineTo(-r*1.12,sign*r*.1-kick*sign);ctx.stroke();ctx.fillStyle='#55707a';ctx.beginPath();ctx.moveTo(-r*1.06,sign*r*.1-kick*sign);ctx.lineTo(-r*1.55,sign*r*.22-kick*sign);ctx.lineTo(-r*1.35,sign*r*.38-kick*sign);ctx.closePath();ctx.fill();}
    ctx.fillStyle='#203747';ell(ctx,r*.1,0,r*.55,r*.25);ctx.fill();
    ctx.fillStyle='#ad8554';ell(ctx,-r*.02,-r*.3,r*.43,r*.13);ctx.fill();ctx.strokeStyle='#647676';ctx.lineWidth=r*.06;ctx.beginPath();ctx.moveTo(-r*.02,-r*.4);ctx.lineTo(-r*.02,-r*.16);ctx.stroke();
    ctx.fillStyle='#c2b397';ell(ctx,r*.68,-r*.02,r*.22,r*.2);ctx.fill();ctx.fillStyle='#244654';ctx.fillRect(r*.64,-r*.2,r*.27,r*.14);ctx.fillStyle='#c2dcd58c';ctx.fillRect(r*.7,-r*.18,r*.17,r*.1);
    ctx.strokeStyle='#7f9a95';ctx.lineWidth=r*.035;ctx.beginPath();ctx.moveTo(r*.25,-r*.37);ctx.quadraticCurveTo(r*.75,-r*.55,r*.8,0);ctx.stroke();
    ctx.strokeStyle='#203747';ctx.lineWidth=r*.12;ctx.beginPath();ctx.moveTo(r*.3,r*.15);ctx.lineTo(r*.8,r*.3);ctx.lineTo(r*1.16,r*.08);ctx.stroke();
    ctx.strokeStyle='#bd8876';ctx.lineWidth=r*.04;ctx.beginPath();ctx.moveTo(r*.95,r*.14);ctx.lineTo(r*1.55,r*.02);ctx.stroke();
    ctx.strokeStyle='#d7a397';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(r*1.57,r*.02,r*.22,r*.32,0,0,TAU);ctx.stroke();ctx.lineWidth=.7;
    for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(r*1.4,r*i*.14);ctx.lineTo(r*1.78,r*i*.14);ctx.stroke();}
    ctx.restore();
  };
  A.coastalBuildings=function(ctx,lights,t) {
    ctx.save();
    // Buildings sit along the edge of the beach; their windows cast the light.
    ctx.fillStyle='#142c3b';ctx.fillRect(0,235,135,205);ctx.fillStyle='#26404a';ctx.fillRect(0,226,145,24);
    ctx.fillStyle='#1a333e';ctx.fillRect(12,252,102,160);ctx.fillStyle='#e5c185';ctx.fillRect(118,292,17,60);ctx.fillRect(16,270,28,35);ctx.fillRect(57,270,28,35);
    ctx.fillStyle='#d5b182';ctx.font='600 15px system-ui';ctx.textAlign='center';ctx.fillText('KAFE',63,385);
    for(let i=0;i<3;i++){
      const bx=1145+i*43,by=260+(i%2)*75;ctx.fillStyle=i%2?'#1c3444':'#243d49';ctx.fillRect(bx,by,43,270);
      for(let row=0;row<7;row++)for(let col=0;col<2;col++){ctx.fillStyle=(row+col+i)%3?'#dcbd794f':'#e3c9999e';ctx.fillRect(bx+8+col*17,by+15+row*31,9,14);}
    }
    ctx.fillStyle='#c8b991';ctx.font='600 13px system-ui';ctx.textAlign='center';ctx.fillText('KOTA',1210,560);
    for(const l of lights){const glow=ctx.createRadialGradient(l.x,l.y,0,l.x,l.y,50);glow.addColorStop(0,'#ffe7a066');glow.addColorStop(1,'#ffe7a000');ctx.fillStyle=glow;ctx.fillRect(l.x-50,l.y-50,100,100);}
    ctx.restore();
  };

  window.PB_ART = A;
})();


