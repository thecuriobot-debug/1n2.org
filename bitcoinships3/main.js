(() => {
  "use strict";
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const PHASES = [
    { name: "storm", label: "荒波 · Riding the Storm", duration: 55 },
    { name: "calm", label: "浮 · Calm Float", duration: Infinity },
  ];

  const view = { width: 1280, height: 720, dpr: 1 };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function easeInOutCubic(t) { const x = clamp(t,0,1); return x<0.5 ? 4*x*x*x : 1-Math.pow(-2*x+2,3)/2; }

  let BTC=[], SURFACE=[], CALM_IDX=0, PMIN=0, PMAX=0;

  // USE LOG SCALE so early $14→$1000 swings are as visible as $60K→$100K
  function pricesToSurface(p) {
    const logs = p.map(x => Math.log10(Math.max(x.price, 1)));
    PMIN = Math.min(...p.map(x=>x.price)); PMAX = Math.max(...p.map(x=>x.price));
    const logMin = Math.min(...logs), logMax = Math.max(...logs);
    const logRange = logMax - logMin;
    // Map log prices to wave displacement: high price = high wave (negative Y = up)
    return logs.map(l => ((l - logMin) / logRange - 0.5) * -500);
  }

  function sam(idx) {
    if(idx<=0) return SURFACE[0]; const mx=SURFACE.length-1;
    if(idx>=mx) return SURFACE[mx]; const l=Math.floor(idx),t=idx-l;
    return lerp(SURFACE[l],SURFACE[l+1],t);
  }
  function prAt(idx) { return BTC[clamp(Math.round(idx),0,BTC.length-1)]; }
  function findCalm() {
    const n=SURFACE.length,w=Math.min(180,Math.floor(n*0.035));
    let b=Math.floor(n*0.85),bs=Infinity;
    for(let s=Math.floor(n*0.6);s<=n-w-1;s+=4){
      let sm=0,sq=0;for(let j=s;j<s+w;j++){sm+=SURFACE[j];sq+=SURFACE[j]*SURFACE[j];}
      const m=sm/w,v=sq/w-m*m,std=Math.sqrt(Math.max(v,0));
      if(std<bs){bs=std;b=Math.round(s+w/2);}
    } return b;
  }

  function tier(price) { if(price<500)return 0; if(price<5000)return 1; if(price<20000)return 2; if(price<60000)return 3; return 4; }
  const SHIP_NAMES = ['丸木舟 Marukibune','ベカ舟 Bekabune','釣船 Tsuribune','弁才船 Bezaisen','千石船 Sengokubune'];

  function createState() {
    return {
      mode:"playing", seqT:0, phI:0, phT:0, tlX:2, camX:2,
      zoom:1, sl:view.height*0.5, turb:1.3,
      bY:view.height*0.5, bRoll:0, bTRoll:0, prevBY:view.height*0.5,
      hDrift:0, wt:0, spray:[],
    };
  }
  let S = null;
  const ph = () => PHASES[Math.min(S.phI, PHASES.length-1)];

  // ─── THE VISIBLE WAVE — one function, boat + ocean + foam all use it ───
  function visibleY(screenX) {
    const wx = S.camX + (screenX - view.width*0.5);
    const wt = S.wt, tb = S.turb;
    const base = S.sl + sam(wx) * 0.55;  // gentler mapping
    // Smooth oceanic sloshing
    const slosh = Math.sin(screenX*0.01 + wt*1.8) * (2 + tb*3)
                + Math.sin(screenX*0.024 + wt*3.0) * (1 + tb*1.5)
                + Math.sin(screenX*0.005 + wt*0.8) * (1.5 + tb*2);
    return clamp(base + slosh, 50, view.height - 35);
  }

  function updatePhase(dt) {
    S.seqT+=dt; S.phT+=dt; S.wt+=dt;
    const c=ph();
    if(Number.isFinite(c.duration) && S.phT>=c.duration) { S.phT-=c.duration; S.phI=Math.min(S.phI+1,PHASES.length-1); }
    const p=ph();
    let spd=20, tT=0.82;
    if(p.name==="storm") { spd=105; tT=1.3; }
    else if(p.name==="calm") { spd=10; tT=0.45; }
    S.tlX+=spd*dt;
    S.turb+=(tT-S.turb)*Math.min(1,dt*0.9);
    S.tlX=clamp(S.tlX,1,SURFACE.length-2); S.camX=S.tlX;
  }

  // ─── BOAT: hull follows wave smoothly (no jitter) ───
  function updateBoat(dt) {
    const cx = view.width * 0.5;
    const surfY = visibleY(cx);
    // Smooth follow — lerp to wave surface, not snap
    S.bY = lerp(S.bY, surfY, Math.min(1, dt * 8));
    const vel = (S.bY - S.prevBY) / Math.max(dt, 0.001);
    S.prevBY = S.bY;
    // Roll from visible slope
    const sL = visibleY(cx - 25), sR = visibleY(cx + 25);
    S.bTRoll = clamp((sR - sL) / 50 * 0.9, -0.5, 0.5);
    S.bRoll += (S.bTRoll - S.bRoll) * Math.min(1, dt * 14);
    S.hDrift += dt * 8;
    // Minimal spray — only on big drops, fewer particles
    if (vel > 120 && Math.random() < 0.2) {
      for (let i = 0; i < 3; i++) {
        S.spray.push({ x:cx+(Math.random()-0.5)*50, y:S.bY, vx:(Math.random()-0.5)*80, vy:-Math.random()*100-30, life:0.8, r:1+Math.random() });
      }
    }
    S.spray = S.spray.filter(p => { p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=300*dt; p.life-=dt*2.5; return p.life>0; });
  }

  function step(dt) { if(S.mode!=="playing") return; updatePhase(dt); updateBoat(dt); }

  // ─── DRAWING ───
  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, view.height);
    g.addColorStop(0, "#0b1628"); g.addColorStop(0.3, "#122240");
    g.addColorStop(0.6, "#1e3a5e"); g.addColorStop(1, "#2a6a8e");
    ctx.fillStyle = g; ctx.fillRect(0, 0, view.width, view.height);
    // Stars
    const sa = clamp(0.6, 0, 1);
    ctx.fillStyle = `rgba(200,230,255,${(sa*0.4).toFixed(3)})`;
    for (let i = 0; i < 60; i++) {
      const sx = ((12345*(i+1)*7919) % view.width), sy = ((12345*(i+1)*6271) % (view.height*0.35));
      const tw = 0.3 + 0.2*Math.sin(S.wt*(0.8+i*0.05)+i);
      ctx.globalAlpha = tw; ctx.beginPath(); ctx.arc(sx, sy, 0.5+((i*13)%3)*0.3, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Moon
    const mx = view.width*0.82, my = view.height*0.11;
    const mg = ctx.createRadialGradient(mx,my,5,mx,my,70);
    mg.addColorStop(0,"rgba(255,248,230,0.65)"); mg.addColorStop(1,"rgba(255,220,180,0)");
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx,my,70,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = "rgba(255,250,235,0.85)"; ctx.beginPath(); ctx.arc(mx,my,12,0,Math.PI*2); ctx.fill();
  }

  function drawOcean() {
    const wt = S.wt, tb = S.turb;
    // Background swells
    for (let L = 0; L < 4; L++) {
      ctx.beginPath();
      for (let x = 0; x <= view.width+4; x += 3) {
        const wx = S.camX + (x - view.width*0.5) + S.hDrift*(L+1)*0.1;
        const by = S.sl + sam(wx)*0.65*(0.1+L*0.08) + L*28 - 45;
        const rip = Math.sin((x*0.008+wt*(0.4+L*0.2))*(2+L))*(2+L*1.2);
        x===0 ? ctx.moveTo(x, by+rip) : ctx.lineTo(x, by+rip);
      }
      ctx.strokeStyle = `rgba(100,190,220,${(0.06+L*0.03).toFixed(3)})`; ctx.lineWidth = 0.7; ctx.stroke();
    }
    // Main wave body — uses visibleY
    ctx.beginPath();
    for (let x = 0; x <= view.width+2; x += 2) { const y = visibleY(x); x===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y); }
    ctx.lineTo(view.width, view.height); ctx.lineTo(0, view.height); ctx.closePath();
    const wg = ctx.createLinearGradient(0, S.sl-80, 0, view.height);
    wg.addColorStop(0,"rgba(15,68,118,0.95)"); wg.addColorStop(0.3,"rgba(8,48,95,0.97)");
    wg.addColorStop(0.7,"rgba(4,28,62,0.98)"); wg.addColorStop(1,"rgba(2,14,35,0.99)");
    ctx.fillStyle = wg; ctx.fill();
    // Foam crest — same visibleY, thin clean line
    ctx.beginPath();
    for (let x = 0; x <= view.width+2; x += 2) {
      const y = visibleY(x);
      const curl = Math.max(0, Math.sin(x*0.015+wt*3))**2 * tb * 2.5;
      x===0 ? ctx.moveTo(x,y-curl) : ctx.lineTo(x,y-curl);
    }
    ctx.strokeStyle = "rgba(230,248,255,0.8)"; ctx.lineWidth = 2.2; ctx.stroke();
    // Depth lines
    for (let d = 0; d < 3; d++) {
      ctx.beginPath();
      for (let x = 0; x <= view.width+4; x += 4) {
        const y = visibleY(x) + 14 + d*14 + Math.sin(x*0.005+wt*(0.5+d*0.15)+d*2)*2;
        x===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      }
      ctx.strokeStyle = `rgba(50,140,190,${(0.12-d*0.03).toFixed(3)})`; ctx.lineWidth = 0.6; ctx.stroke();
    }
    // Spray — minimal
    for (const p of S.spray) { ctx.globalAlpha=p.life*0.5; ctx.fillStyle="rgba(220,245,255,0.6)"; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  // ─── LEMMINGS-STYLE ANIMATED CREW ───
  function drawPerson(x, y, s, action, phase) {
    const sc = s || 1, t = (S.wt + phase*2.3) * 1.5;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    // Head
    ctx.fillStyle="#e8c8a0"; ctx.beginPath(); ctx.arc(0,-10,2.5,0,Math.PI*2); ctx.fill();
    // Sugegasa hat
    ctx.fillStyle="#c8a860"; ctx.beginPath(); ctx.moveTo(-4.5,-11.5); ctx.lineTo(0,-16); ctx.lineTo(4.5,-11.5); ctx.closePath(); ctx.fill();
    // Body
    ctx.fillStyle = action==='row'?'#3a5a3a':'#2a4a6a';
    ctx.fillRect(-2.5,-7,5,7);
    // Animated arms based on action
    ctx.strokeStyle="#e8c8a0"; ctx.lineWidth=1.2;
    if(action==='row') {
      // Rowing motion
      const arm = Math.sin(t*3)*0.6;
      ctx.beginPath(); ctx.moveTo(-2.5,-5); ctx.lineTo(-6+arm*3,-1+arm*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2.5,-5); ctx.lineTo(6-arm*3,-1-arm*2); ctx.stroke();
    } else if(action==='wave') {
      // Waving at the sky
      const arm = Math.sin(t*2)*0.5;
      ctx.beginPath(); ctx.moveTo(2.5,-5); ctx.lineTo(6,-10+arm*4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2.5,-5); ctx.lineTo(-5,-2); ctx.stroke();
    } else if(action==='bail') {
      // Bailing water
      const arm = Math.sin(t*4)*0.4;
      ctx.beginPath(); ctx.moveTo(-2.5,-4); ctx.lineTo(-5+arm*2, 1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2.5,-4); ctx.lineTo(5-arm*2, 1); ctx.stroke();
      // Bucket
      ctx.fillStyle="#8a6a3a"; ctx.fillRect(-3+arm*2, 0, 3, 2);
    } else if(action==='lookout') {
      // Hand over eyes, looking forward
      ctx.beginPath(); ctx.moveTo(2.5,-6); ctx.lineTo(5,-9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2.5,-5); ctx.lineTo(-4,-3); ctx.stroke();
    } else if(action==='steer') {
      // Holding the rudder
      ctx.beginPath(); ctx.moveTo(-2.5,-4); ctx.lineTo(-6,-2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2.5,-4); ctx.lineTo(-4,-2); ctx.stroke();
    } else {
      // Standing idle with slight sway
      const sway = Math.sin(t*0.8)*0.3;
      ctx.beginPath(); ctx.moveTo(-2.5,-5); ctx.lineTo(-4+sway,-2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2.5,-5); ctx.lineTo(4-sway,-2); ctx.stroke();
    }
    ctx.restore();
  }

  // ─── SHIP — smooth scale transitions ───
  let shipScaleSmooth = 1.0;
  function drawShip() {
    const cx = view.width*0.5, cy = S.bY;
    const price = prAt(S.tlX).price, t = tier(price);
    const targetSc = (0.8 + t*0.2) * 1.3;
    // Smooth scale transition
    shipScaleSmooth = lerp(shipScaleSmooth, targetSc, 0.02);
    const sc = shipScaleSmooth;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(S.bRoll); ctx.scale(sc, sc);
    if (t===0) drawMarukibune(); else if (t===1) drawBekabune();
    else if (t===2) drawTsuribune(); else if (t===3) drawBezaisen();
    else drawSengokubune();
    ctx.restore();
  }

  function drawMarukibune() {
    ctx.fillStyle="#6a4a2a"; ctx.beginPath();
    ctx.moveTo(-30,0); ctx.quadraticCurveTo(0,14,33,0); ctx.lineTo(24,8); ctx.quadraticCurveTo(0,16,-22,8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle="#3a2a14"; ctx.lineWidth=1; ctx.stroke();
    ctx.strokeStyle="#8a6a3a"; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(0,6); ctx.lineTo(0,-25); ctx.stroke();
    ctx.fillStyle="rgba(160,140,100,0.6)"; ctx.beginPath(); ctx.moveTo(1,-22); ctx.lineTo(1,-4); ctx.lineTo(14,-8); ctx.closePath(); ctx.fill();
    // Even the dugout has a lone paddler!
    drawPerson(8, -2, 0.65, 'row', 0);
  }

  function drawBekabune() {
    ctx.fillStyle="#5a3a18"; ctx.beginPath();
    ctx.moveTo(-40,0); ctx.quadraticCurveTo(0,18,44,0); ctx.lineTo(32,12); ctx.quadraticCurveTo(0,22,-30,12); ctx.closePath();
    ctx.fill(); ctx.strokeStyle="#3a2210"; ctx.lineWidth=1; ctx.stroke();
    ctx.strokeStyle="#b09060"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(2,8); ctx.lineTo(2,-42); ctx.stroke();
    ctx.fillStyle="#e0d8c8"; ctx.beginPath(); ctx.moveTo(3,-38); ctx.lineTo(3,-4); ctx.lineTo(24,-10); ctx.closePath(); ctx.fill();
    ctx.fillStyle="rgba(230,170,40,0.5)"; ctx.font="bold 12px sans-serif"; ctx.fillText("₿",6,-18);
    // Two crew: one rows, one looks out
    drawPerson(-12, -2, 0.6, 'row', 0);
    drawPerson(14, -2, 0.6, 'lookout', 1);
  }

  function drawTsuribune() {
    ctx.fillStyle="#5a3210"; ctx.beginPath();
    ctx.moveTo(-52,0); ctx.quadraticCurveTo(0,22,56,0); ctx.lineTo(42,14); ctx.quadraticCurveTo(0,26,-38,14); ctx.closePath();
    ctx.fill(); ctx.strokeStyle="#2a1408"; ctx.lineWidth=1.5; ctx.stroke();
    ctx.strokeStyle="#7a5228"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-52,0); ctx.quadraticCurveTo(0,8,56,0); ctx.stroke();
    ctx.strokeStyle="#c0a060"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(4,10); ctx.lineTo(4,-65); ctx.stroke();
    ctx.fillStyle="#8a6a30"; ctx.fillRect(1,2,6,5);
    ctx.fillStyle="#f0e8d8"; ctx.beginPath(); ctx.moveTo(5,-60); ctx.lineTo(5,-4); ctx.lineTo(40,-12); ctx.lineTo(40,-56); ctx.closePath(); ctx.fill();
    ctx.strokeStyle="rgba(140,110,60,0.4)"; ctx.lineWidth=0.6;
    for(let i=0;i<4;i++){const y=-56+i*13; ctx.beginPath(); ctx.moveTo(6,y); ctx.lineTo(39,y-2); ctx.stroke();}
    ctx.fillStyle="#f0d8a0"; ctx.beginPath(); ctx.moveTo(3,-50); ctx.lineTo(3,0); ctx.lineTo(-30,-5); ctx.closePath(); ctx.fill();
    ctx.fillStyle="rgba(240,170,30,0.55)"; ctx.font="bold 18px sans-serif"; ctx.fillText("₿",14,-26);
    ctx.fillStyle="#4a2a10"; ctx.fillRect(-46,4,3,12);
    // 3 crew with actions
    drawPerson(-18, 0, 0.7, 'steer', 0);  // helmsman at rudder
    drawPerson(10, -2, 0.7, 'bail', 1);   // bailing water
    drawPerson(30, -2, 0.65, 'lookout', 2); // lookout
  }

  function drawBezaisen() {
    ctx.fillStyle="#4a2808"; ctx.beginPath();
    ctx.moveTo(-65,0); ctx.quadraticCurveTo(-45,-8,-35,2); ctx.quadraticCurveTo(0,26,40,2); ctx.quadraticCurveTo(55,-10,72,0);
    ctx.lineTo(55,14); ctx.quadraticCurveTo(0,30,-50,12); ctx.closePath();
    ctx.fill(); ctx.strokeStyle="#1a0a04"; ctx.lineWidth=1.5; ctx.stroke();
    ctx.strokeStyle="#8a5a2a"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-65,0); ctx.quadraticCurveTo(0,4,72,0); ctx.stroke();
    ctx.strokeStyle="#c8a860"; ctx.lineWidth=3.5;
    ctx.beginPath(); ctx.moveTo(-6,10); ctx.lineTo(-6,-82); ctx.stroke();
    ctx.fillStyle="#8a6a30"; ctx.fillRect(-9,2,6,6);
    ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(32,8); ctx.lineTo(32,-62); ctx.stroke();
    ctx.fillStyle="#efe6d4";
    ctx.beginPath(); ctx.moveTo(-5,-78); ctx.lineTo(-5,-2); ctx.lineTo(30,-6); ctx.lineTo(30,-74); ctx.closePath(); ctx.fill();
    ctx.fillStyle="#e8dcc4"; ctx.beginPath(); ctx.moveTo(33,-58); ctx.lineTo(33,0); ctx.lineTo(55,-6); ctx.lineTo(55,-54); ctx.closePath(); ctx.fill();
    ctx.fillStyle="#f0d8a0"; ctx.beginPath(); ctx.moveTo(-7,-66); ctx.lineTo(-7,0); ctx.lineTo(-40,-5); ctx.closePath(); ctx.fill();
    ctx.fillStyle="rgba(247,147,26,0.6)"; ctx.font="bold 22px sans-serif"; ctx.fillText("₿",2,-34);
    ctx.fillStyle="#3a1a08"; ctx.beginPath(); ctx.roundRect(-56,-6,20,14,2); ctx.fill();
    ctx.fillStyle="#ffd44f"; ctx.fillRect(-52,-3,2.5,2.5); ctx.fillRect(-46,-3,2.5,2.5);
    ctx.fillStyle="#f7931a"; ctx.fillRect(-6,-84,10,6);
    ctx.fillStyle="#3a1a08"; ctx.fillRect(-60,4,4,14);
    // 4 crew busy on the trader
    drawPerson(-38, -2, 0.75, 'steer', 0);   // helmsman
    drawPerson(-12, 0, 0.8, 'row', 1);        // working ropes
    drawPerson(18, -2, 0.75, 'wave', 2);       // celebrating
    drawPerson(42, -2, 0.7, 'lookout', 3);     // lookout at bow
  }

  function drawSengokubune() {
    ctx.fillStyle="#3a1e08"; ctx.beginPath();
    ctx.moveTo(-82,0); ctx.quadraticCurveTo(-58,-14,-40,2); ctx.quadraticCurveTo(0,30,45,2);
    ctx.quadraticCurveTo(65,-16,88,0); ctx.lineTo(66,18); ctx.quadraticCurveTo(0,36,-62,16); ctx.closePath();
    ctx.fill(); ctx.strokeStyle="#0a0402"; ctx.lineWidth=2; ctx.stroke();
    ctx.strokeStyle="#8a5a2a"; ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(-82,0); ctx.quadraticCurveTo(0,6,88,0); ctx.stroke();
    ctx.fillStyle="#4a2a10"; ctx.beginPath(); ctx.roundRect(-74,-16,26,22,2); ctx.fill();
    ctx.fillStyle="#ffd44f"; for(let r=0;r<2;r++) for(let c=0;c<2;c++) ctx.fillRect(-70+c*8,-12+r*8,3,3);
    ctx.strokeStyle="#c8a860";
    const masts=[{x:-22,h:-96,w:4},{x:14,h:-100,w:4.5},{x:50,h:-86,w:3.5}];
    for(const m of masts){
      ctx.lineWidth=m.w; ctx.beginPath(); ctx.moveTo(m.x,10); ctx.lineTo(m.x,m.h); ctx.stroke();
      ctx.fillStyle="#8a6a30"; ctx.fillRect(m.x-2.5,2,5,5);
      ctx.lineWidth=1.5; ctx.strokeStyle="#a08040";
      ctx.beginPath(); ctx.moveTo(m.x-18,m.h+18); ctx.lineTo(m.x+18,m.h+18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(m.x-14,m.h+40); ctx.lineTo(m.x+14,m.h+40); ctx.stroke();
    }
    ctx.fillStyle="#efe6d4";
    for(const m of masts){ ctx.fillRect(m.x-16,m.h+19,32,19); ctx.fillRect(m.x-12,m.h+41,24,14); }
    ctx.fillStyle="rgba(247,147,26,0.7)"; ctx.font="bold 28px sans-serif"; ctx.fillText("₿",2,-54);
    ctx.fillStyle="#f7931a"; ctx.fillRect(14,-102,14,8);
    ctx.fillStyle="#fff"; ctx.font="bold 6px sans-serif"; ctx.fillText("₿",18,-96);
    ctx.fillStyle="#3a1a08"; ctx.fillRect(-78,6,4,16);
    // Grand crew of 6 — all busy like lemmings
    drawPerson(-58, -8, 0.65, 'steer', 0);    // helmsman at stern
    drawPerson(-30, -4, 0.8, 'bail', 1);       // bailing
    drawPerson(-5, -2, 0.85, 'wave', 2);       // waving
    drawPerson(20, -4, 0.8, 'row', 3);         // hauling ropes
    drawPerson(42, -2, 0.75, 'lookout', 4);    // lookout
    drawPerson(60, -4, 0.7, 'wave', 5);        // celebrating
  }

  // ─── HUD ───
  function formatUsd(v) { return '$'+Math.round(v).toLocaleString(); }
  function drawHud() {
    const p=ph(), pd=prAt(S.tlX), t=tier(pd.price);
    ctx.fillStyle="rgba(30,18,8,0.72)"; ctx.strokeStyle="rgba(140,100,50,0.4)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.roundRect(16,16,320,105,6); ctx.fill(); ctx.stroke();
    ctx.fillStyle="#c8a060"; ctx.font="700 19px 'Noto Serif JP',serif"; ctx.fillText("Bitcoin Ships 3",30,40);
    ctx.font="600 11px 'Noto Serif JP',serif"; ctx.fillStyle="#8a7a5a"; ctx.fillText(p.label,30,58);
    ctx.fillStyle="#a08a5a"; ctx.fillText(SHIP_NAMES[t],30,73);
    ctx.fillStyle="#f7931a"; ctx.font="700 16px 'JetBrains Mono',monospace"; ctx.fillText(`₿ ${formatUsd(pd.price)}`,30,94);
    ctx.fillStyle="#6a5a3a"; ctx.font="600 10px 'Noto Serif JP',serif"; ctx.fillText(pd.date,30,110);
    if(S.tlX>7){const prev=prAt(S.tlX-7).price,ch=((pd.price-prev)/prev*100);
      ctx.fillStyle=ch>=0?"#6ab870":"#c86060"; ctx.fillText(`${ch>=0?'▲':'▼'} ${Math.abs(ch).toFixed(1)}%`,180,94);}
    ctx.fillStyle="rgba(30,18,8,0.5)"; ctx.beginPath(); ctx.roundRect(16,view.height-38,400,22,4); ctx.fill();
    ctx.fillStyle="#6a5a3a"; ctx.font="600 9px 'Noto Serif JP',serif";
    ctx.fillText("Space: pause  ←→: scrub  ↑↓: waves  A: skip  R: reset  F: fullscreen",24,view.height-23);
    if(S.mode==="paused"){
      ctx.fillStyle="rgba(20,12,4,0.8)"; ctx.beginPath(); ctx.roundRect(view.width/2-90,view.height/2-28,180,56,8); ctx.fill();
      ctx.fillStyle="#c8a060"; ctx.font="700 20px 'Noto Serif JP',serif"; ctx.fillText("一時停止",view.width/2-40,view.height/2);
      ctx.font="600 11px 'Noto Serif JP',serif"; ctx.fillStyle="#8a7a5a"; ctx.fillText("Press Space",view.width/2-32,view.height/2+16);
    }
  }

  // ─── RENDER + INIT ───
  function render() {
    ctx.setTransform(view.dpr,0,0,view.dpr,0,0);
    ctx.clearRect(0,0,view.width,view.height);
    drawSky(); drawOcean(); drawShip(); drawHud();
  }
  function resize() {
    view.width=Math.max(680,Math.floor(canvas.clientWidth));
    view.height=Math.max(400,Math.floor(canvas.clientHeight));
    view.dpr=window.devicePixelRatio||1;
    canvas.width=Math.floor(view.width*view.dpr); canvas.height=Math.floor(view.height*view.dpr);
    if(S){S.sl=view.height*0.5; S.bY=clamp(S.bY,50,view.height-35);}
  }
  async function toggleFS(){const f=document.getElementById('frame');if(!document.fullscreenElement){if(f.requestFullscreen)await f.requestFullscreen();}else if(document.exitFullscreen)await document.exitFullscreen();}
  window.addEventListener("keydown",(e)=>{
    if(["Space","ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.code))e.preventDefault();
    if(!S)return;
    if(e.code==="Space"){S.mode=S.mode==="playing"?"paused":"playing";}
    else if(e.code==="ArrowLeft") S.tlX=clamp(S.tlX-50,1,SURFACE.length-2);
    else if(e.code==="ArrowRight") S.tlX=clamp(S.tlX+50,1,SURFACE.length-2);
    else if(e.code==="ArrowUp") S.turb=clamp(S.turb+0.06,0.2,1.6);
    else if(e.code==="ArrowDown") S.turb=clamp(S.turb-0.06,0.2,1.6);
    else if(e.code==="KeyA"){S.phI=Math.min(S.phI+1,PHASES.length-1);S.phT=0;}
    else if(e.code==="KeyR"||e.code==="KeyB") S=createState();
    else if(e.code==="KeyF") toggleFS().catch(()=>{});
  },{passive:false});
  window.addEventListener("resize",resize);
  document.addEventListener("fullscreenchange",resize);

  // ─── LOAD DATA: Try CoinGecko first, fallback to local ───
  async function loadPrices() {
    // Try CoinGecko API for full history
    try {
      const r = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=max&interval=daily');
      if (r.ok) {
        const d = await r.json();
        const entries = d.prices.map(([ts, price]) => {
          const dt = new Date(ts);
          return { date: dt.toISOString().slice(0,10), price: Math.round(price) };
        });
        console.log(`CoinGecko: ${entries.length} prices, ${entries[0]?.date} → ${entries[entries.length-1]?.date}`);
        if (entries.length > 100) return entries;
      }
    } catch(e) { console.log('CoinGecko failed, trying local:', e); }
    // Fallback: local file
    try {
      const r = await fetch('/tbg-mirrors/btc-prices.json');
      const d = await r.json();
      return Object.entries(d).map(([date,price])=>({date,price})).sort((a,b)=>a.date.localeCompare(b.date));
    } catch(e) {
      console.error('All sources failed:', e);
      const ent=[]; let p=10;
      for(let i=0;i<4000;i++){p+=(Math.random()-0.45)*p*0.04;p=Math.max(1,p);
        const dt=new Date(2011,0,1);dt.setDate(dt.getDate()+i);
        ent.push({date:dt.toISOString().slice(0,10),price:Math.round(p)});}
      return ent;
    }
  }

  async function init() {
    resize(); BTC = await loadPrices(); SURFACE = pricesToSurface(BTC);
    CALM_IDX = findCalm(); S = createState();
    document.getElementById('loading').style.display = 'none';
    let prev = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, Math.max(0.001, (now-prev)/1000)); prev = now;
      step(dt); render(); requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  init();
})();
