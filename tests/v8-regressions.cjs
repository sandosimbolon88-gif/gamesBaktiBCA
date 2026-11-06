module.exports = async function v8Checks(page) {
  return page.evaluate(() => {
    const G=PB_GAME, checks=[];
    const verify=(ok,message)=>{if(!ok)throw Error(message);checks.push(message);};
    G.paused=true;G.bot=false;PB_SFX.setMuted(true);
    G.input.inside=false;G.input.active=false;G.input.keys={};
    const cleanOcean=o=>{
      o.food=[];o.trash=[];o.preds=[];o.divers=[];o.warns=[];o.nets=[];o.birds=[];o.sargs=[];o.boats=[];
      for(const k in o.tm)o.tm[k]=9999;
    };
    for(const mode of ['intan','semi','alami']) {
      G.newRun('lekang',mode);G.paused=true;
      const b=G.scene;
      verify(b.seaX-b.start.x>=570,`long beach ${mode}`);
      const initial=b.p.x;G.input.keys.ArrowRight=true;b.update(.2);
      verify(b.p.x===initial,`no sand movement without effort ${mode}`);
      G.input.keys.Space=true;b.update(.2);
      verify(b.p.x>initial && b.p.vx<65,`slow sand movement while held ${mode}`);
      G.input.keys={};const stopped=b.p.x;b.update(.2);
      verify(b.p.x===stopped,`release stops sand movement ${mode}`);
      for(let stage=1;stage<=3;stage++) {
        G.newRun('lekang',mode);G.paused=true;G.setScene(G.scenes.Ocean,stage);
        const o=G.scene;cleanOcean(o);o.p.inv=0;
        o.combo=15;o.comboT=3;o.frenzyT=4;
        const score=G.score();
        o.food=[{type:'udang',r:14,val:2,mv:'drift',x:o.p.x+o.p.facing*o.radius()*.8,y:o.p.y,vx:0,vy:0,fade:1,life:99,ph:0}];
        o.update(.016);
        verify(G.score()-score===5,`food +5 despite difficulty and frenzy ${mode}/${stage}`);
        const foodScore=G.score();G.run.health=100;o.p.inv=0;
        o.trash=[{type:'botol',r:16,x:o.p.x,y:o.p.y,age:0,vx:0,vy:0,ph:0,rot:0,spin:0,settle:0}];o.update(.016);
        verify(G.score()-foodScore===-4 && G.run.raw.sampah===-4,`plastic -4 ${mode}/${stage}`);
        verify(G.run.health===72,`bottle costs 28 health ${mode}/${stage}`);
        verify(G.scoreRun(G.run,true)===G.score(),`result and HUD use same score ${mode}/${stage}`);
      }
      G.newRun('lekang',mode);G.paused=true;G.setScene(G.scenes.Migrate);
      const m=G.scene;m.items=[];m.nets=[];m.boats=[];m.warns=[];m.dur=1e9;for(const k in m.tm)m.tm[k]=9999;
      m.items=[{bad:false,type:'udang',r:14,x:m.p.x+230*.016,y:m.p.y,vx:0,ph:0,fade:1}];const before=G.score();m.update(.016);
      verify(G.score()-before===5,`migration food +5 ${mode}`);
      const beforeTrash=G.score();m.p.inv=0;G.run.health=100;m.items=[{bad:true,type:'robek',r:23,x:m.p.x+230*.016,y:m.p.y,vx:0,ph:0,rot:0,spin:0}];m.update(.016);
      verify(G.score()-beforeTrash===-4 && G.run.health===68,`migration torn plastic -4 and health -32 ${mode}`);
    }
    G.newRun('hijau','intan');G.paused=true;G.setScene(G.scenes.Ocean,3);
    const o=G.scene;cleanOcean(o);o.spawnDiver();o.spawnDiver();
    verify(o.warns.filter(w=>w.thenDiver).length===1 && !o.divers.length,'one illegal hunter, warned before entry');
    for(let i=0;i<150;i++)o.update(.02);
    verify(o.divers.length===1,'hunter enters after warning');
    const hunter=o.divers[0];hunter.x=500;hunter.y=350;o.p.x=hunter.x+hunter.dir*hunter.size*.9;o.p.y=hunter.y;o.p.inv=0;const lives=G.run.lives;o.update(.001);
    verify(G.run.lives===lives-1,'illegal capture costs one life');
    G.newRun('hijau','intan');G.paused=true;G.setScene(G.scenes.Nest);
    const n=G.scene;
    verify(!n.people && !n.lamps,'no hostile flashlight people in nesting');
    verify(n.lights.some(l=>l.kind==='cafe') && n.lights.some(l=>l.kind==='kota'),'cafe and city are light sources');
    const light=n.lights[0];verify(n.lightAt(light.x+Math.cos(light.angle)*250,light.y+Math.sin(light.angle)*250)>0,'lit sand matches beam geometry');
    verify(n.lightAt(640,160)===0,'dark nesting area remains available');
    G.input.keys={};G.input.inside=false;G.input.active=false;const y=n.p.y;n.update(.2);verify(n.p.y===y,'nesting crawl also requires hold');
    G.input.keys.Space=true;n.update(.2);verify(n.p.y<y,'Space alone crawls toward nesting area');
    G.input.keys={};n.state='gali';n.mash=0;G.input.active=true;for(let i=0;i<180 && n.state==='gali';i++)n.update(.02);
    verify(n.state==='telur','held pointer digs the nest');
    G.input.active=false;G.input.keys={};G.newRun('hijau','intan');G.paused=true;
    return checks;
  });
};
