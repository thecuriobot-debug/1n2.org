(() => {
  "use strict";
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const PHASES = [
    { name: "storm", label: "荒波 · Riding the Storm", duration: 28 },
    { name: "zoom_out", label: "大浪 · The Great Wave", duration: 14 },
    { name: "calm_hunt", label: "静寂 · Finding Calm", duration: 9 },
    { name: "zoom_in", label: "安心 · Settling In", duration: 11 },
    { name: "calm", label: "浮 · Calm Float", duration: Infinity },
  ];

  const view = { width: 1280, height: 720, dpr: 1 };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function smoothstep(e0, e1, x) { const t = clamp((x-e0)/(e1-e0), 0, 1); return t*t*(3-2*t); }
  function easeInOutCubic(t) { const x = clamp(t,0,1); return x<0.5 ? 4*x*x*x : 1-Math.pow(-2*x+2,3)/2; }

  let BTC=[], SURFACE=[], CALM_IDX=0, PMIN=0, PMAX=0, PMEAN=0;

  function pricesToSurface(p) {
    const v=p.map(x=>x.price); PMIN=Math.min(...v); PMAX=Math.max(...v);
    PMEAN=v.reduce((a,b)=>a+b,0)/v.length;
    const r=PMAX-PMIN;
    // Amplify the waves — make drops DEEP and rises HIGH
    return smooth(v.map(x=>((x-PMEAN)/(r*0.5))*420), 1, 1);
  }
  function smooth(s, rad, passes) {
    let src=s.slice(); const o=new Array(src.length);
    for(let p=0;p<passes;p++){
      for(let i=0;i<src.length;i++){
        let wt=0,ws=0;
        for(let k=-rad;k<=rad;k++){const idx=clamp(i+k,0,src.length-1),w=rad+1-Math.abs(k);wt+=w;ws+=src[idx]*w;}
        o[i]=ws/wt;
      } src=o.slice();
    } return src;
  }
  function sam(idx) {
    if(idx<=0) return SURFACE[0]; const mx=SURFACE.length-1;
    if(idx>=mx) return SURFACE[mx]; const l=Math.floor(idx),t=idx-l;
    return lerp(SURFACE[l],SURFACE[l+1],t);
  }
  function prAt(idx) { return BTC[clamp(Math.round(idx),0,BTC.length-1)]; }
  function findCalm() {
    const n=SURFACE.length,w=Math.min(200,Math.floor(n*0.04));
    let b=Math.floor(n*0.8),bs=Infinity;
    for(let s=Math.floor(n*0.5);s<=n-w-1;s+=4){
      let sm=0,sq=0;for(let j=s;j<s+w;j++){sm+=SURFACE[j];sq+=SURFACE[j]*SURFACE[j];}
      const m=sm/w,v=sq/w-m*m,std=Math.sqrt(Math.max(v,0));
      const sc=std+Math.abs((s+w/2)-n*0.82)*0.002;
      if(sc<bs){bs=sc;b=Math.round(s+w/2);}
    } return b;
  }

  // Ship tiers: marukibune(dugout) → bekabune(plank) → tsuribune(fishing) → bezaisen(trader) → sengokubune(grand)
  function tier(price) { if(price<500)return 0; if(price<5000)return 1; if(price<20000)return 2; if(price<60000)return 3; return 4; }
  const SHIP_NAMES = ['丸木舟 Marukibune','ベカ舟 Bekabune','釣船 Tsuribune','弁才船 Bezaisen','千石船 Sengokubune'];

  function createState() {
    const start = 2; // Start from the very beginning of BTC history
    const sl = view.height * 0.52;
    return {
      mode:"playing", seqT:0, phI:0, phT:0, tlX:start, camX:start,
      zoom:1, tZoom:1, sl, turb:1.3,
      bY:sl, bVY:0, bRoll:0, bTRoll:0,
      hDrift:0, chartOp:0, wt:0,
      spray:[],
    };
  }
  let S = null;
  const ph = () => PHASES[Math.min(S.phI, PHASES.length-1)];
  const wzf = () => Math.pow(S.zoom, 0.66);

  function updatePhase(dt) {
    S.seqT+=dt; S.phT+=dt; S.wt+=dt;
    const c=ph();
    if(Number.isFinite(c.duration) && S.phT>=c.duration) { S.phT-=c.duration; S.phI=Math.min(S.phI+1,PHASES.length-1); }
    const p=ph();
    let spd=20, dZ=1.18, tT=0.82;
    if(p.name==="storm") { spd=220; dZ=1; tT=1.6; }
    else if(p.name==="zoom_out") { spd=55; const t=S.phT/p.duration; dZ=lerp(1,0.05,easeInOutCubic(t)); tT=1.0; S.chartOp=clamp(S.chartOp+dt*0.22,0,0.5); }
    else if(p.name==="calm_hunt") { spd=6; dZ=0.05; tT=0.85; S.chartOp=0.5; const s=1-Math.exp(-dt*1.4); S.tlX=lerp(S.tlX,CALM_IDX-80,s); }
    else if(p.name==="zoom_in") { spd=18; const t=S.phT/p.duration; dZ=lerp(0.05,1.18,easeInOutCubic(t)); tT=0.65; S.chartOp=clamp(S.chartOp-dt*0.16,0,0.5); if(S.tlX<CALM_IDX-60) S.tlX+=(CALM_IDX-60-S.tlX)*Math.min(1,dt*1.3); }
    else if(p.name==="calm") { spd=10; dZ=1.18; tT=0.5; S.chartOp=clamp(S.chartOp-dt*0.1,0,0.5); }
    S.tlX+=spd*dt; S.tZoom=dZ;
    S.turb+=(tT-S.turb)*Math.min(1,dt*0.9);
    S.zoom+=(S.tZoom-S.zoom)*Math.min(1,dt*2.2);
    S.tlX=clamp(S.tlX,1,SURFACE.length-2); S.camX=S.tlX;
  }

  // ─── BOAT PHYSICS: ride the curves TIGHT ───
  function updateBoat(dt) {
    const vz = wzf();
    const wv = sam(S.tlX) * S.turb;
    const surfY = S.sl - wv * vz;
    // Very stiff spring — boat hugs the wave surface
    const desired = surfY - 6 * clamp(S.zoom, 0.3, 1.2);
    const spring = (desired - S.bY) * 30;  // extremely stiff — glued to wave
    const damp = -S.bVY * 5.5;  // less damping = more bounce
    S.bVY += (spring + damp) * dt;
    S.bY += S.bVY * dt;

    // Roll: tight slope following
    const ss = 4;
    const slope = (sam(S.tlX + ss) - sam(S.tlX - ss)) / (ss * 2);
    S.bTRoll = clamp(-slope * 0.18 * vz, -0.6, 0.6);
    S.bRoll += (S.bTRoll - S.bRoll) * Math.min(1, dt * 8);  // fast response

    S.hDrift += dt * (8 + S.zoom * 5);

    // Spray on impacts
    if (Math.abs(S.bVY) > 40 && Math.random() < 0.5) {
      for (let i = 0; i < 8; i++) {
        S.spray.push({
          x: view.width*0.5 + (Math.random()-0.5)*80,
          y: S.bY + 8,
          vx: (Math.random()-0.5)*180,
          vy: -Math.random()*200 - 50,
          life: 1.0, r: 1 + Math.random()*2,
        });
      }
    }
    S.spray = S.spray.filter(p => { p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=400*dt; p.life-=dt*2; return p.life>0; });
  }

  function step(dt) { if(S.mode!=="playing") return; updatePhase(dt); updateBoat(dt); }
  function w2s(sx) { return S.camX + (sx - view.width*0.5) / S.zoom; }
  function sy4w(wx) { return S.sl - sam(wx) * S.turb * wzf(); }

  // ─── GHIBLI SKY ───
  function drawSky() {
    // Warm Ghibli gradient — deep indigo to warm horizon
    const g = ctx.createLinearGradient(0, 0, 0, view.height);
    g.addColorStop(0, "#0b1628"); g.addColorStop(0.25, "#122240");
    g.addColorStop(0.5, "#1e3a5e"); g.addColorStop(0.75, "#2a5a78");
    g.addColorStop(1, "#3a7a8e");
    ctx.fillStyle = g; ctx.fillRect(0, 0, view.width, view.height);

    // Ghibli clouds — soft, luminous
    const ca = clamp(S.zoom * 0.6, 0, 1);
    if (ca > 0.05) {
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 251 + 100) % view.width) + Math.sin(S.wt * 0.05 + i) * 20;
        const cy = 40 + i * 28 + Math.sin(S.wt * 0.08 + i * 2) * 8;
        const cg = ctx.createRadialGradient(cx, cy, 10, cx, cy, 60 + i * 15);
        cg.addColorStop(0, `rgba(200,220,240,${(ca*0.12).toFixed(3)})`);
        cg.addColorStop(1, "rgba(200,220,240,0)");
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.ellipse(cx, cy, 80+i*20, 20+i*5, 0, 0, Math.PI*2); ctx.fill();
      }
    }

    // Stars
    const sa = clamp(S.zoom * 0.7, 0, 1);
    if (sa > 0.05) {
      for (let i = 0; i < 70; i++) {
        const sx = ((12345*(i+1)*7919) % view.width);
        const sy = ((12345*(i+1)*6271) % (view.height*0.35));
        const twinkle = 0.3 + 0.3 * Math.sin(S.wt * (1 + i * 0.1) + i);
        ctx.fillStyle = `rgba(220,240,255,${(sa*twinkle).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(sx, sy, 0.4+((i*13)%3)*0.4, 0, Math.PI*2); ctx.fill();
      }
    }

    // Moon with Ghibli glow
    const mx = view.width * 0.82, my = view.height * 0.11;
    const mg = ctx.createRadialGradient(mx, my, 5, mx, my, 90);
    mg.addColorStop(0, "rgba(255,248,230,0.7)"); mg.addColorStop(0.3, "rgba(255,220,180,0.2)");
    mg.addColorStop(1, "rgba(255,220,180,0)");
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, 90, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "rgba(255,250,235,0.88)"; ctx.beginPath(); ctx.arc(mx, my, 13, 0, Math.PI*2); ctx.fill();
  }

  // ─── HOKUSAI OCEAN — many layered wave system ───
  function drawOcean() {
    const wt = S.wt, vz = wzf(), tb = S.turb;

    // DISTANT SWELLS — 5 background wave layers (Hokusai distant lines)
    for (let L = 0; L < 5; L++) {
      const depth = L * 0.15, alpha = 0.08 + L * 0.04, speed = (L+1) * 0.07;
      ctx.beginPath();
      for (let x = 0; x <= view.width+4; x += 3) {
        const wx = w2s(x + S.hDrift * speed * (L+1));
        const by = S.sl - sam(wx) * vz * (0.08 + L*0.06) + L*30 - 60;
        const rip = Math.sin((x*0.007+wt*(0.5+L*0.25))*(2+L)) * (3+L*1.5)
                  + Math.sin((x*0.013+wt*(0.8+L*0.15)+L*1.5)) * (2+L);
        x===0 ? ctx.moveTo(x, by+rip) : ctx.lineTo(x, by+rip);
      }
      ctx.strokeStyle = `rgba(120,200,230,${alpha.toFixed(3)})`; ctx.lineWidth = 0.8; ctx.stroke();
    }

    // MAIN WAVE BODY — with aggressive sloshing
    ctx.beginPath();
    for (let x = 0; x <= view.width+2; x += 2) {
      const wx = w2s(x), by = sy4w(wx);
      // Multi-frequency sloshing — waves crash and recede HARD
      const slosh = Math.sin(x*0.01 + wt*3.5) * (6 + tb*8)
                  + Math.sin(x*0.022 + wt*6.0) * (3 + tb*5)
                  + Math.sin(x*0.04 + wt*9.5) * (2 + tb*3)
                  + Math.sin(x*0.008 + wt*1.8) * (4 + tb*4);
      x===0 ? ctx.moveTo(x, by+slosh) : ctx.lineTo(x, by+slosh);
    }
    ctx.lineTo(view.width, view.height); ctx.lineTo(0, view.height); ctx.closePath();
    const wg = ctx.createLinearGradient(0, S.sl-120, 0, view.height);
    wg.addColorStop(0, "rgba(18,75,125,0.95)"); wg.addColorStop(0.25, "rgba(10,55,100,0.97)");
    wg.addColorStop(0.6, "rgba(5,32,68,0.98)"); wg.addColorStop(1, "rgba(2,16,40,0.99)");
    ctx.fillStyle = wg; ctx.fill();

    // HOKUSAI CREST — thick white foam with curling tips
    ctx.beginPath();
    for (let x = 0; x <= view.width+2; x += 2) {
      const wx = w2s(x), by = sy4w(wx);
      const slosh = Math.sin(x*0.01+wt*3.5)*(6+tb*8) + Math.sin(x*0.022+wt*6)*(3+tb*5) + Math.sin(x*0.04+wt*9.5)*(2+tb*3) + Math.sin(x*0.008+wt*1.8)*(4+tb*4);
      const curl = Math.max(0, Math.sin(x*0.016+wt*3.5))**2 * tb * 4;
      x===0 ? ctx.moveTo(x, by+slosh-curl) : ctx.lineTo(x, by+slosh-curl);
    }
    ctx.strokeStyle = "rgba(235,250,255,0.85)"; ctx.lineWidth = 2.8; ctx.stroke();

    // SECONDARY FOAM LINE
    ctx.beginPath();
    for (let x=0; x<=view.width+3; x+=3) {
      const wx=w2s(x), by=sy4w(wx);
      const s2 = Math.sin(x*0.013+wt*2+1.2)*(2+tb*3) + Math.sin(x*0.03+wt*4.5)*(1+tb);
      x===0 ? ctx.moveTo(x, by+s2+10) : ctx.lineTo(x, by+s2+10);
    }
    ctx.strokeStyle = "rgba(160,220,245,0.35)"; ctx.lineWidth = 1.5; ctx.stroke();

    // HOKUSAI CURL FINGERS — little spiraling foam marks on wave crests
    const nc = Math.floor(8 + tb * 10);
    for (let i = 0; i < nc; i++) {
      const sx = ((i*137 + Math.floor(wt*50)) % (view.width+120)) - 60;
      const wx = w2s(sx), surfY = sy4w(wx);
      const slope = sam(wx+3) - sam(wx-3);
      if (slope > 1.2 * tb) {
        ctx.save(); ctx.translate(sx, surfY - 3); ctx.rotate(-0.2 - slope*0.02);
        // Draw a small Hokusai-style curl
        ctx.beginPath();
        ctx.arc(0, 0, 4 + tb*3, Math.PI*0.7, Math.PI*2.3);
        ctx.strokeStyle = `rgba(255,255,255,${(0.25+tb*0.12).toFixed(2)})`; ctx.lineWidth = 1.2; ctx.stroke();
        // Foam dots
        for (let d = 0; d < 3; d++) {
          const dx = Math.cos(Math.PI*0.7 + d*0.5) * (6+tb*2);
          const dy = Math.sin(Math.PI*0.7 + d*0.5) * (6+tb*2);
          ctx.fillStyle = `rgba(255,255,255,${(0.15+tb*0.05).toFixed(2)})`;
          ctx.beginPath(); ctx.arc(dx, dy, 1+Math.random(), 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
      }
    }

    // DEPTH SHIMMER — undulating lines below surface
    for (let d = 0; d < 5; d++) {
      ctx.beginPath();
      for (let x = 0; x <= view.width+4; x += 4) {
        const wx = w2s(x), by = sy4w(wx) + 18 + d*16;
        const sh = Math.sin(x*0.005+wt*(0.6+d*0.15)+d*2.5) * (3-d*0.4);
        x===0 ? ctx.moveTo(x, by+sh) : ctx.lineTo(x, by+sh);
      }
      ctx.strokeStyle = `rgba(50,150,200,${(0.15-d*0.025).toFixed(3)})`; ctx.lineWidth = 0.8; ctx.stroke();
    }

    // SPRAY particles
    for (const p of S.spray) {
      ctx.globalAlpha = p.life * 0.7;
      ctx.fillStyle = "rgba(220,245,255,0.8)";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ─── SHIP DRAWING — historically-inspired wasen ───
  function drawShip() {
    const cx = view.width*0.5, cy = S.bY;
    const price = prAt(S.tlX).price, t = tier(price);
    const sc = clamp(0.45 + S.zoom*0.55, 0.45, 1.15) * (0.65 + t*0.15);

    ctx.save(); ctx.translate(cx, cy); ctx.rotate(S.bRoll); ctx.scale(sc, sc);

    if (t === 0) drawMarukibune();
    else if (t === 1) drawBekabune();
    else if (t === 2) drawTsuribune();
    else if (t === 3) drawBezaisen();
    else drawSengokubune();

    ctx.restore();
  }

  // Tier 0: Marukibune — dugout canoe
  function drawMarukibune() {
    ctx.fillStyle = "#6a4a2a";
    ctx.beginPath(); ctx.moveTo(-35, 6); ctx.quadraticCurveTo(0, 18, 38, 4);
    ctx.lineTo(30, 12); ctx.quadraticCurveTo(0, 20, -28, 12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#3a2a14"; ctx.lineWidth = 1; ctx.stroke();
    // Simple pole
    ctx.strokeStyle = "#8a6a3a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -30); ctx.stroke();
    // Ragged cloth
    ctx.fillStyle = "rgba(160,140,100,0.6)";
    ctx.beginPath(); ctx.moveTo(1,-26); ctx.lineTo(1,-6); ctx.lineTo(16,-10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(200,160,40,0.35)"; ctx.font = "bold 9px sans-serif"; ctx.fillText("₿", 3, -13);
  }

  // Tier 1: Bekabune — small plank boat
  function drawBekabune() {
    // Hull — flat bottom, rising sides
    ctx.fillStyle = "#5a3a18"; ctx.strokeStyle = "#3a2210";
    ctx.beginPath(); ctx.moveTo(-44, 4); ctx.quadraticCurveTo(0, 22, 48, 2);
    ctx.lineTo(35, 16); ctx.quadraticCurveTo(0, 26, -34, 14); ctx.closePath();
    ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
    // Plank lines
    ctx.strokeStyle = "rgba(90,60,30,0.4)"; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-38, 9); ctx.lineTo(42, 3); ctx.stroke();
    // Mast from deck
    ctx.strokeStyle = "#b09060"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(2, 12); ctx.lineTo(2, -48); ctx.stroke();
    // Sail
    ctx.fillStyle = "#e0d8c8";
    ctx.beginPath(); ctx.moveTo(3,-44); ctx.lineTo(3,-6); ctx.lineTo(28,-12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(230,170,40,0.5)"; ctx.font = "bold 14px sans-serif"; ctx.fillText("₿", 6, -20);
  }

  // Tier 2: Tsuribune — fishing boat with proper wasen hull and junk-style sail
  function drawTsuribune() {
    // Wasen hull — wide planks, raised bow/stern
    ctx.fillStyle = "#5a3210";
    ctx.beginPath(); ctx.moveTo(-58, -2); ctx.quadraticCurveTo(-30, 28, 0, 24);
    ctx.quadraticCurveTo(30, 28, 62, -4);
    ctx.lineTo(48, 18); ctx.quadraticCurveTo(0, 32, -44, 16); ctx.closePath();
    ctx.fill(); ctx.strokeStyle = "#2a1408"; ctx.lineWidth = 1.5; ctx.stroke();
    // Gunwale
    ctx.strokeStyle = "#7a5228"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-58, -2); ctx.quadraticCurveTo(0, 10, 62, -4); ctx.stroke();
    // Deck
    ctx.fillStyle = "rgba(120,90,50,0.5)";
    ctx.beginPath(); ctx.moveTo(-44, 6); ctx.lineTo(48, 4); ctx.lineTo(48, 8); ctx.lineTo(-44, 10); ctx.closePath(); ctx.fill();
    // Mast — planted through deck into hull
    ctx.strokeStyle = "#c0a060"; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(4, 16); ctx.lineTo(4, -75); ctx.stroke();
    // Mast step visible on deck
    ctx.fillStyle = "#8a6a30"; ctx.fillRect(0, 4, 8, 6);
    // Japanese-style sail — rectangular with bamboo battens
    ctx.fillStyle = "#f0e8d8";
    ctx.beginPath(); ctx.moveTo(5,-70); ctx.lineTo(5,-6); ctx.lineTo(48,-14); ctx.lineTo(48,-66); ctx.closePath(); ctx.fill();
    // Battens (horizontal lines across sail)
    ctx.strokeStyle = "rgba(140,110,60,0.4)"; ctx.lineWidth = 0.8;
    for (let i = 0; i < 5; i++) {
      const y = -66 + i * 12;
      ctx.beginPath(); ctx.moveTo(6, y); ctx.lineTo(47, y - 2); ctx.stroke();
    }
    // Jib
    ctx.fillStyle = "#f0d8a0";
    ctx.beginPath(); ctx.moveTo(3,-58); ctx.lineTo(3, 0); ctx.lineTo(-36, -6); ctx.closePath(); ctx.fill();
    // ₿ on sail
    ctx.fillStyle = "rgba(240,170,30,0.55)"; ctx.font = "bold 22px sans-serif"; ctx.fillText("₿", 16, -30);
    // Rudder
    ctx.fillStyle = "#4a2a10"; ctx.fillRect(-52, 6, 4, 14);
  }

  // Tier 3: Bezaisen — elegant Edo-period coastal trader
  function drawBezaisen() {
    // Deep hull with raised bow (miyoshi) and stern
    ctx.fillStyle = "#4a2808";
    ctx.beginPath();
    ctx.moveTo(-72, -8); ctx.quadraticCurveTo(-50, -14, -40, 0);
    ctx.quadraticCurveTo(0, 30, 40, 0);
    ctx.quadraticCurveTo(55, -16, 78, -10);
    ctx.lineTo(60, 18); ctx.quadraticCurveTo(0, 36, -56, 16); ctx.closePath();
    ctx.fill(); ctx.strokeStyle = "#1a0a04"; ctx.lineWidth = 2; ctx.stroke();
    // Gunwale with copper cladding
    ctx.strokeStyle = "#8a5a2a"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-72,-8); ctx.quadraticCurveTo(-40,-14,0,4); ctx.quadraticCurveTo(40,-14,78,-10); ctx.stroke();
    // Deck planks
    ctx.fillStyle = "rgba(100,75,40,0.5)";
    ctx.fillRect(-50, 2, 100, 8);
    // TWO masts — both firmly planted in deck
    ctx.strokeStyle = "#c8a860"; ctx.lineWidth = 4;
    // Main mast (taller)
    ctx.beginPath(); ctx.moveTo(-8, 14); ctx.lineTo(-8, -95); ctx.stroke();
    ctx.fillStyle = "#8a6a30"; ctx.fillRect(-12, 2, 8, 8); // mast step
    // Foremast
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(35, 12); ctx.lineTo(35, -72); ctx.stroke();
    ctx.fillStyle = "#8a6a30"; ctx.fillRect(32, 2, 6, 6);
    // Main sail — large square with battens
    ctx.fillStyle = "#efe6d4";
    ctx.beginPath(); ctx.moveTo(-7,-90); ctx.lineTo(-7,-4); ctx.lineTo(33,-8); ctx.lineTo(33,-86); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(120,90,50,0.35)"; ctx.lineWidth = 0.8;
    for (let i=0;i<7;i++) { const y=-86+i*12; ctx.beginPath(); ctx.moveTo(-6,y); ctx.lineTo(32,y-1); ctx.stroke(); }
    // Fore sail
    ctx.fillStyle = "#e8dcc4";
    ctx.beginPath(); ctx.moveTo(36,-68); ctx.lineTo(36,-2); ctx.lineTo(62,-8); ctx.lineTo(62,-64); ctx.closePath(); ctx.fill();
    // Jib
    ctx.fillStyle = "#f0d8a0";
    ctx.beginPath(); ctx.moveTo(-9,-76); ctx.lineTo(-9,0); ctx.lineTo(-46,-6); ctx.closePath(); ctx.fill();
    // ₿ on main sail
    ctx.fillStyle = "rgba(247,147,26,0.6)"; ctx.font = "bold 28px sans-serif"; ctx.fillText("₿", 2, -40);
    // Stern cabin
    ctx.fillStyle = "#3a1a08";
    ctx.beginPath(); ctx.roundRect(-60, -8, 24, 16, 2); ctx.fill();
    ctx.fillStyle = "#ffd44f"; ctx.fillRect(-55, -5, 3, 3); ctx.fillRect(-48, -5, 3, 3);
    // Flag
    ctx.fillStyle = "#f7931a"; ctx.fillRect(-8, -97, 12, 7);
    // Rudder (Japanese-style large)
    ctx.fillStyle = "#3a1a08"; ctx.fillRect(-66, 6, 5, 16);
  }

  // Tier 4: Sengokubune — grand 1000-koku ship, the pride of Edo
  function drawSengokubune() {
    // Massive hull with pronounced miyoshi bow and stern castle
    ctx.fillStyle = "#3a1e08";
    ctx.beginPath();
    ctx.moveTo(-90, -14); ctx.quadraticCurveTo(-65, -22, -45, 0);
    ctx.quadraticCurveTo(0, 34, 50, 0);
    ctx.quadraticCurveTo(70, -24, 95, -14);
    ctx.lineTo(72, 22); ctx.quadraticCurveTo(0, 42, -68, 20); ctx.closePath();
    ctx.fill(); ctx.strokeStyle = "#0a0402"; ctx.lineWidth = 2; ctx.stroke();
    // Copper plating on hull bottom
    ctx.fillStyle = "rgba(120,80,30,0.3)";
    ctx.beginPath(); ctx.moveTo(-55, 12); ctx.quadraticCurveTo(0, 34, 55, 12);
    ctx.lineTo(60, 18); ctx.quadraticCurveTo(0, 38, -58, 18); ctx.closePath(); ctx.fill();
    // Gunwale
    ctx.strokeStyle = "#8a5a2a"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-90,-14); ctx.quadraticCurveTo(-40,-20,0,4); ctx.quadraticCurveTo(50,-20,95,-14); ctx.stroke();
    // Stern castle
    ctx.fillStyle = "#4a2a10";
    ctx.beginPath(); ctx.roundRect(-82, -22, 32, 26, 3); ctx.fill();
    ctx.strokeStyle = "#2a1408"; ctx.lineWidth = 1; ctx.stroke();
    // Castle windows
    ctx.fillStyle = "#ffd44f";
    for(let r=0;r<2;r++) for(let c=0;c<3;c++) ctx.fillRect(-77+c*9, -18+r*9, 4, 4);
    // Deck
    ctx.fillStyle = "rgba(100,75,40,0.4)"; ctx.fillRect(-48, 2, 110, 8);
    // THREE masts — firmly stepped
    ctx.strokeStyle = "#c8a860";
    const masts = [{x:-25, h:-110, w:4.5}, {x:15, h:-115, w:5}, {x:55, h:-100, w:4}];
    for (const m of masts) {
      ctx.lineWidth = m.w;
      ctx.beginPath(); ctx.moveTo(m.x, 14); ctx.lineTo(m.x, m.h); ctx.stroke();
      ctx.fillStyle = "#8a6a30"; ctx.fillRect(m.x-3, 2, 6, 6); // mast step
      // Cross spars
      ctx.lineWidth = 2; ctx.strokeStyle = "#a08040";
      ctx.beginPath(); ctx.moveTo(m.x-22, m.h+22); ctx.lineTo(m.x+22, m.h+22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(m.x-18, m.h+48); ctx.lineTo(m.x+18, m.h+48); ctx.stroke();
    }
    // Square sails with battens
    ctx.fillStyle = "#efe6d4";
    for (const m of masts) {
      ctx.fillRect(m.x-20, m.h+23, 40, 23);
      ctx.fillRect(m.x-16, m.h+49, 32, 18);
      ctx.strokeStyle = "rgba(120,90,50,0.3)"; ctx.lineWidth = 0.6;
      for(let b=0;b<3;b++){const y=m.h+25+b*7; ctx.beginPath(); ctx.moveTo(m.x-19,y); ctx.lineTo(m.x+19,y); ctx.stroke();}
    }
    // Large ₿ on main sail
    ctx.fillStyle = "rgba(247,147,26,0.7)"; ctx.font = "bold 34px sans-serif"; ctx.fillText("₿", 4, -62);
    // Bitcoin flag at top
    ctx.fillStyle = "#f7931a"; ctx.fillRect(15, -117, 16, 9);
    ctx.fillStyle = "#fff"; ctx.font = "bold 7px sans-serif"; ctx.fillText("₿", 19, -110);
    // Rudder
    ctx.fillStyle = "#3a1a08";
    ctx.beginPath(); ctx.moveTo(-84, 8); ctx.lineTo(-88, 8); ctx.lineTo(-88, 26); ctx.lineTo(-82, 26); ctx.closePath(); ctx.fill();
    // Deck details — barrels
    ctx.fillStyle = "#5a3a18";
    for(let i=0;i<4;i++) { ctx.beginPath(); ctx.ellipse(-10+i*16, 4, 4, 3, 0, 0, Math.PI*2); ctx.fill(); }
  }

  // ─── CHART OVERLAY ───
  function drawChart() {
    if(S.chartOp<0.02) return;
    ctx.save(); ctx.globalAlpha=S.chartOp;
    const n=SURFACE.length,m=40,cW=view.width-m*2,cH=view.height*0.56,cY=view.height*0.2;
    const st=Math.max(1,Math.floor(n/cW));
    ctx.beginPath();
    for(let i=0;i<n;i+=st){const x=m+(i/n)*cW;const p=BTC[clamp(i,0,BTC.length-1)].price;const y=cY+cH-((p-PMIN)/(PMAX-PMIN))*cH;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
    ctx.strokeStyle="rgba(247,147,26,0.7)";ctx.lineWidth=1.5;ctx.stroke();
    const cx=m+(S.tlX/n)*cW,cp=prAt(S.tlX),curY=cY+cH-((cp.price-PMIN)/(PMAX-PMIN))*cH;
    ctx.fillStyle="#ff4444";ctx.beginPath();ctx.arc(cx,curY,5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="rgba(220,240,255,0.7)";ctx.font="600 11px 'Noto Serif JP',serif";
    ctx.fillText(`$${PMAX.toLocaleString()}`,m,cY-4);ctx.fillText(`$${PMIN.toLocaleString()}`,m,cY+cH+14);
    let ly="";for(let i=0;i<BTC.length;i+=Math.floor(BTC.length/12)){const yr=BTC[i].date.slice(0,4);if(yr!==ly){ctx.fillText(yr,m+(i/n)*cW,cY+cH+28);ly=yr;}}
    ctx.restore();
  }

  // ─── STYLED HUD (wooden aesthetic) ───
  function drawHud() {
    const p = ph(), pd = prAt(S.tlX), t = tier(pd.price);
    // Wooden panel
    ctx.fillStyle = "rgba(30,18,8,0.75)";
    ctx.strokeStyle = "rgba(140,100,50,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(18, 18, 340, 115, 6); ctx.fill(); ctx.stroke();
    // Inner gold line
    ctx.strokeStyle = "rgba(200,160,80,0.2)"; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.roundRect(22, 22, 332, 107, 4); ctx.stroke();

    ctx.fillStyle = "#c8a060"; ctx.font = "700 20px 'Noto Serif JP', serif"; ctx.fillText("Bitcoin Ships 3", 34, 46);
    ctx.font = "600 12px 'Noto Serif JP', serif"; ctx.fillStyle = "#8a7a5a";
    ctx.fillText(`${p.label}`, 34, 66);
    ctx.fillStyle = "#a08a5a"; ctx.fillText(`${SHIP_NAMES[t]}`, 34, 82);
    ctx.fillStyle = "#f7931a"; ctx.font = "700 17px 'JetBrains Mono', monospace, sans-serif";
    ctx.fillText(`₿ ${('$'+Math.round(pd.price).toLocaleString())}`, 34, 104);
    ctx.fillStyle = "#6a5a3a"; ctx.font = "600 11px 'Noto Serif JP', serif";
    ctx.fillText(pd.date, 34, 122);
    // 7d change
    if(S.tlX > 10) {
      const prev = prAt(S.tlX-7).price, ch = ((pd.price-prev)/prev*100);
      ctx.fillStyle = ch>=0 ? "#6ab870" : "#c86060";
      ctx.fillText(`${ch>=0?'▲':'▼'} ${Math.abs(ch).toFixed(1)}%`, 200, 104);
    }

    // Bottom controls — subtle
    ctx.fillStyle = "rgba(30,18,8,0.55)";
    ctx.beginPath(); ctx.roundRect(18, view.height-42, 440, 24, 4); ctx.fill();
    ctx.fillStyle = "#6a5a3a"; ctx.font = "600 10px 'Noto Serif JP', serif";
    ctx.fillText("Space: pause  ←→: scrub  ↑↓: waves  A: skip  R: reset  F: fullscreen", 28, view.height-26);

    if (S.mode === "paused") {
      ctx.fillStyle = "rgba(20,12,4,0.8)";
      ctx.beginPath(); ctx.roundRect(view.width/2-100, view.height/2-32, 200, 64, 8); ctx.fill();
      ctx.strokeStyle = "rgba(200,160,80,0.4)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(view.width/2-100, view.height/2-32, 200, 64, 8); ctx.stroke();
      ctx.fillStyle = "#c8a060"; ctx.font = "700 22px 'Noto Serif JP', serif";
      ctx.fillText("一時停止", view.width/2-44, view.height/2-2);
      ctx.font = "600 12px 'Noto Serif JP', serif"; ctx.fillStyle = "#8a7a5a";
      ctx.fillText("Press Space", view.width/2-36, view.height/2+18);
    }
  }

  // ─── RENDER + INIT ───
  function render() {
    ctx.setTransform(view.dpr,0,0,view.dpr,0,0);
    ctx.clearRect(0,0,view.width,view.height);
    drawSky(); drawOcean(); drawShip(); drawChart(); drawHud();
  }
  function resize() {
    view.width=Math.max(680,Math.floor(canvas.clientWidth));
    view.height=Math.max(400,Math.floor(canvas.clientHeight));
    view.dpr=window.devicePixelRatio||1;
    canvas.width=Math.floor(view.width*view.dpr);
    canvas.height=Math.floor(view.height*view.dpr);
    if(S){S.sl=view.height*0.52;S.bY=clamp(S.bY,0,view.height+120);}
  }
  async function toggleFS(){if(!document.fullscreenElement){if(document.getElementById('frame').requestFullscreen) await document.getElementById('frame').requestFullscreen();}else if(document.exitFullscreen) await document.exitFullscreen();}
  window.addEventListener("keydown",(e)=>{
    if(["Space","ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.code))e.preventDefault();
    if(!S)return;
    if(e.code==="Space"){S.mode=S.mode==="playing"?"paused":"playing";return;}
    if(e.code==="ArrowLeft"){S.tlX=clamp(S.tlX-60,1,SURFACE.length-2);return;}
    if(e.code==="ArrowRight"){S.tlX=clamp(S.tlX+60,1,SURFACE.length-2);return;}
    if(e.code==="ArrowUp"){S.turb=clamp(S.turb+0.08,0.3,1.8);return;}
    if(e.code==="ArrowDown"){S.turb=clamp(S.turb-0.08,0.3,1.8);return;}
    if(e.code==="KeyA"){S.phI=Math.min(S.phI+1,PHASES.length-1);S.phT=0;return;}
    if(e.code==="KeyR"||e.code==="KeyB"){S=createState();return;}
    if(e.code==="KeyF"){toggleFS().catch(()=>{});}
  },{passive:false});
  window.addEventListener("resize",resize);
  document.addEventListener("fullscreenchange",resize);
  async function loadPrices(){
    try{const r=await fetch("/tbg-mirrors/btc-prices.json");const d=await r.json();
    return Object.entries(d).map(([date,price])=>({date,price})).sort((a,b)=>a.date.localeCompare(b.date));}
    catch(e){console.error(e);const ent=[];let p=800;for(let i=0;i<4000;i++){p+=(Math.random()-0.48)*p*0.03;p=Math.max(50,p);const d=new Date(2013,0,1);d.setDate(d.getDate()+i);ent.push({date:d.toISOString().slice(0,10),price:Math.round(p)});}return ent;}
  }
  async function init(){
    resize(); BTC=await loadPrices(); SURFACE=pricesToSurface(BTC);
    CALM_IDX=findCalm(); S=createState();
    document.getElementById("loading").style.display="none";
    let prev=performance.now();
    function frame(now){const dt=Math.min(0.05,Math.max(0.001,(now-prev)/1000));prev=now;step(dt);render();requestAnimationFrame(frame);}
    requestAnimationFrame(frame);
  }
  init();
})();
