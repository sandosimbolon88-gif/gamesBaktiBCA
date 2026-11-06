/* Start python -m http.server 8000 --bind 127.0.0.1, then npm test.
 * CHROMIUM_PATH may select a system browser; GAME_URL may select another server.
 */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const url = process.env.GAME_URL || 'http://127.0.0.1:8000/games/penyu/';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url + '?debug=1');
    await page.getByRole('button', { name: /Mulai petualangan/ }).click();
    assert.equal(await page.locator('#speciesCards .pick').count(), 4);
    await page.locator('#speciesCards [data-id=hijau]').click();
    await page.locator('#btnSpeciesNext').click();
    await page.locator('#hatchCards [data-id=intan]').click();
    await page.locator('#btnHatchStart').click();
    assert.equal(await page.evaluate(() => PB_GAME.run.stage), 0);
    // Keyboard movement in the real beach scene.
    const initialX = await page.evaluate(() => PB_GAME.scene.p.x);
    await page.keyboard.down('Space');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('Space');
    assert.ok(await page.evaluate(x => PB_GAME.scene.p.x > x, initialX));
    const mouseTarget=await page.locator('#game').evaluate(c=>{const r=c.getBoundingClientRect();return{x:r.left+r.width*.8,y:r.top+r.height*.53};});
    await page.mouse.move(mouseTarget.x,mouseTarget.y);
    const beforeMouse=await page.evaluate(()=>PB_GAME.scene.p.x);
    await page.mouse.down();await page.waitForTimeout(250);await page.mouse.up();
    const released=await page.evaluate(()=>PB_GAME.scene.p.x);await page.waitForTimeout(150);
    assert.ok(released>beforeMouse);
    assert.ok(await page.evaluate(x=>Math.abs(PB_GAME.scene.p.x-x)<.1,released));
    assert.deepEqual(errors,[]);
    const v8Results=await require('./v8-regressions.cjs')(page);
    const results = await page.evaluate(() => {
      const G = PB_GAME;
      G.paused = true;
      PB_SFX.setMuted(true);
      const checks = [];
      const verify = (ok, message) => { if (!ok) throw Error(message); checks.push(message); };
      let seed = 91825;
      const originalRandom = Math.random;
      Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      try {
        for (const sp of PB_DATA.spesies) for (let stage = 1; stage <= 3; stage++) {
          G.run.sp = sp; G.run.health = 100; G.run.breath = 100;
          G.setScene(G.scenes.Ocean, stage);
          const o = G.scene;
          verify(o.trash.length>=[0,10,13,16][stage],`initial debris density ${sp.id}/${stage}`);
          for (let i = 0; i < 80; i++) { o.spawnTrash(); o.spawnPred(stage === 1 ? 'kakap' : 'hiumacan'); if (stage > 1) o.spawnNet(); }
          verify(o.trash.length <= [0,16,20,24][stage] && o.preds.length + o.warns.filter(w=>w.then).length <= 3 && o.nets.length <= 1, `caps ${sp.id}/${stage}`);
          verify(!o.food.some(f => f.power), `no magical food ${sp.id}/${stage}`);
          if (sp.id === 'belimbing') verify(o.food.every(f=>['ubur','uburBesar','salpa'].includes(f.type)), `leatherback diet ${stage}`);
          if (sp.id === 'hijau' && stage > 1) verify(o.food.every(f=>['lamun','lamunDaun','alga','algaMerah'].includes(f.type)), `green diet ${stage}`);
          o.growth = o.goal;
          verify(o.danger({type:'hiumacan'}), `shark still dangerous ${sp.id}/${stage}`);
          if (stage > 1) verify(!o.danger({type:'kakap'}), `fish do not hunt large turtle ${sp.id}/${stage}`);
          if (stage === 3) {
            verify(Math.abs(o.radius()*2 / 1.1 - sp.adultCm[1]) < .01, `adult shell scale ${sp.id}`);
          }
        }
        G.run.sp = PB_DATA.spesies[0]; G.run.health=100;G.run.breath=50;
        G.setScene(G.scenes.Ocean, 1);
        const o=G.scene;
        o.trash=[];o.preds=[];o.warns=[];o.birds=[];o.sargs=[];
        G.input.inside=false;G.input.active=false;
        // Eating a sequence of real food must grow the turtle and activate frenzy.
        for(let i=0;i<12;i++) {
          o.food=[{type:'telur',r:10,val:1,mv:'drift',x:o.p.x+o.p.facing*o.radius()*.8,y:o.p.y,vx:0,vy:0,fade:1,life:99,ph:0}];
          o.update(.016);
        }
        verify(o.combo===12 && o.frenzyT>0 && o.growth>12, '12 food chain activates frenzy and growth');
        o.p.y=G.SURF+o.radius()*.25;G.run.breath=20;o.update(.1);
        verify(G.run.breath>20,'surfacing restores breath');
        G.input.dash=true;o.update(.016);verify(o.dash>0 && o.dashCool>0,'dash starts with cooldown');
        // The same Space input used by players releases a net after enough presses.
        o.p.net={x:o.p.x,y:o.p.y};o.p.netOx=0;o.p.netOy=0;o.p.netMash=0;o.p.netT=5;
        G.input.mash=6;o.update(.016);verify(!o.p.net && o.p.netCool>0,'net escape uses mash input');
        // One contact must cost one life, even with two overlapping predators.
        G.setScene(G.scenes.Ocean,3);const a=G.scene;a.p.inv=0;a.trash=[];a.nets=[];a.food=[];
        const life=G.run.lives;
        for(let i=0;i<2;i++)a.preds.push({type:'hiumacan',r:110,x:a.p.x-68,y:a.p.y,vx:100,vy:0,base:100,age:0,ph:0,chaseT:0,lungeCd:1,lungeT:0});
        a.update(.016);verify(G.run.lives===life-1,'overlapping predators cost only one life');
      } finally { Math.random=originalRandom; }
      G.paused=false;
      return checks;
    });
    // Follow the actual stage-card callbacks, quiz, score entry and local board.
    await page.evaluate(()=>{PB_GAME.newRun('sisik','intan'); PB_GAME.settings.cepat=true;});
    await page.keyboard.press('KeyN');
    await page.locator('#btnCardGo').waitFor({state:'visible'});
    await page.locator('#btnCardGo').click();
    for(let i=1;i<=3;i++) {
      await page.keyboard.press('KeyN');
      await page.locator('#btnCardGo').waitFor({state:'visible'});
      await page.locator('#btnCardGo').click();
    }
    await page.keyboard.press('KeyN');
    await page.locator('#btnCardGo').waitFor({state:'visible'});
    await page.locator('#btnCardGo').click();
    await page.keyboard.press('KeyN');
    await page.waitForFunction(()=>PB_GAME.scene.state==='gali');
    for(let i=0;i<16;i++)await page.keyboard.press('Space');
    await page.locator('#btnQuizSkip').waitFor({state:'visible',timeout:15000});
    await page.locator('#btnQuizSkip').click();
    await page.keyboard.type('Penjelajah');
    await page.locator('#btnSave').click();
    assert.match(await page.locator('#boardTable').innerText(), /Penjelajah/);
    await page.locator('#btnBoardNext').click();
    assert.match(await page.locator('#ctaParas').innerText(), /Agustus 2026/);
    await page.locator('#btnCtaDone').click();
    await page.getByRole('button',{name:'Fakta Penyu',exact:true}).click();
    assert.equal(await page.locator('#factList a').count(),21);
    assert.ok(await page.locator('#factList a').evaluateAll(as=>as.every(a=>a.href.startsWith('https://') && a.rel.includes('noopener'))));
    assert.deepEqual(errors,[]);
    // Touch interaction in a small landscape viewport.
    const mobile = await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
    mobile.on('pageerror',e=>errors.push(e.message));
    await mobile.goto(url+'?debug=1');
    await mobile.getByRole('button',{name:/Mulai petualangan/}).tap();
    await mobile.locator('#speciesCards [data-id=belimbing]').tap();
    await mobile.locator('#btnSpeciesNext').tap();
    await mobile.locator('#hatchCards [data-id=intan]').tap();
    await mobile.locator('#btnHatchStart').tap();
    const touchTarget=await mobile.locator('#game').evaluate(c=>{const r=c.getBoundingClientRect();return{x:r.left+r.width*.8,y:r.top+r.height*.53};});
    const touchBefore=await mobile.evaluate(()=>PB_GAME.scene.p.x);
    const cdp=await mobile.context().newCDPSession(mobile);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchTarget.x,y:touchTarget.y}]});
    await mobile.waitForTimeout(250);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    const touchReleased=await mobile.evaluate(()=>PB_GAME.scene.p.x);await mobile.waitForTimeout(150);
    assert.ok(touchReleased>touchBefore);
    assert.ok(await mobile.evaluate(x=>Math.abs(PB_GAME.scene.p.x-x)<.1,touchReleased));
    await mobile.evaluate(()=>PB_GAME.setScene(PB_GAME.scenes.Ocean,1));
    await mobile.locator('#btnDash').tap();
    await mobile.waitForFunction(()=>PB_GAME.scene.dashCool>0);
    // The service worker must cache a complete playable app.
    const offline=await browser.newContext();
    const offlinePage=await offline.newPage();
    offlinePage.on('pageerror',e=>errors.push(e.message));
    await offlinePage.goto(url);
    await offlinePage.evaluate(()=>navigator.serviceWorker.ready);
    await offlinePage.reload();
    await offline.setOffline(true);
    await offlinePage.reload();
    await offlinePage.getByRole('button',{name:/Mulai petualangan/}).click();
    assert.equal(await offlinePage.locator('#speciesCards .pick').count(),4);
    assert.deepEqual(errors,[]);
    console.log(`PASS: ${results.length+v8Results.length} ecology/gameplay checks; keyboard, five stages, quiz, local score, sources, touch, offline cache; no browser errors.`);
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1);});
