// MAD PATROL 4 — main.js
// Expert team: Contra Engineer · Mega Man Designer · Ninja Gaiden Master · Moon Patrol Vet · R-Type Tactician
// Hero: Mad Bitcoins — top hat, red sash, bitcoin logo, fly goggles (black border/red lens), suit
// Inspirations: Contra, Mega Man, Master Blaster, Ninja Gaiden, Moon Patrol
// Created by 1n2.org — Thomas Hunt

(() => {
"use strict";

// ─── CANVAS SETUP ──────────────────────────────────────────────────────────────
const canvas = document.getElementById("game");
const ctx    = canvas.getContext("2d");
const W = 960, H = 540;
canvas.width = W; canvas.height = H;
ctx.imageSmoothingEnabled = false;

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────
const GROUND_Y    = 460;
const GRAVITY     = 1800;
const FIXED_DT    = 1/60;
const PLAYER_W    = 32;
const PLAYER_H    = 52;
const PLAYER_HP   = 16;
const BTC_COIN    = 750;
const VERSION     = "v1.0.0";

// ─── HELPERS ───────────────────────────────────────────────────────────────────
const clamp   = (v,a,b) => Math.max(a, Math.min(b, v));
const lerp    = (a,b,t) => a + (b-a)*t;
const rand    = (a,b)   => a + Math.random()*(b-a);
const randi   = (a,b)   => Math.floor(rand(a,b+1));
const pick    = arr     => arr[(Math.random()*arr.length)|0];
const hypot   = (ax,ay,bx,by) => Math.hypot(ax-bx, ay-by);
const overlap = (a,b)   => a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;

// ─── AUDIO ENGINE ──────────────────────────────────────────────────────────────
let audioCtx = null;
const sfx = {
  shoot:  ()=> beep(700,0.04,'square',  0.04, 140),
  jump:   ()=> beep(330,0.06,'square',  0.05, -90),
  hurt:   ()=> beep(160,0.12,'sawtooth',0.06,-120),
  coin:   ()=> { beep(900,0.04,'triangle',0.05,120); beep(1200,0.04,'triangle',0.04,100); },
  explode:()=> beep(160,0.1,'sawtooth', 0.06,-120),
  sword:  ()=> beep(440,0.05,'sawtooth',0.04, 200),
  grapple:()=> beep(280,0.07,'triangle',0.04,  60),
  powerup:()=> { beep(640,0.09,'square',0.05,100); beep(900,0.07,'square',0.04,80); },
  boss:   ()=> beep(100,0.18,'sawtooth',0.07, -80),
};
function beep(freq=440,dur=0.06,type='square',vol=0.035,slide=0){
  if(!audioCtx) return;
  const now=audioCtx.currentTime, osc=audioCtx.createOscillator(), g=audioCtx.createGain();
  osc.type=type;
  osc.frequency.setValueAtTime(freq,now);
  if(slide) osc.frequency.linearRampToValueAtTime(freq+slide,now+dur);
  g.gain.setValueAtTime(vol,now);
  g.gain.exponentialRampToValueAtTime(0.0001,now+dur);
  osc.connect(g); g.connect(audioCtx.destination);
  osc.start(now); osc.stop(now+dur);
}
function ensureAudio(){
  if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended') audioCtx.resume();
}


// ─── MUSIC ─────────────────────────────────────────────────────────────────────
let musicEnabled = true;
const musicNotes = {
  title:[
    [523,0.14],[659,0.14],[784,0.16],[988,0.20],[784,0.14],[659,0.14],[523,0.16],[440,0.20],
    [523,0.14],[659,0.14],[784,0.16],[880,0.18],[988,0.14],[1047,0.20],[784,0.16],[659,0.20]
  ],
  action:[
    [330,0.1],[440,0.1],[523,0.1],[660,0.1],[784,0.12],[660,0.1],[523,0.1],[440,0.1],
    [392,0.1],[523,0.1],[659,0.12],[784,0.1],[880,0.12],[784,0.1],[659,0.1],[523,0.12]
  ],
  boss:[
    [220,0.12],[196,0.12],[175,0.12],[165,0.16],[147,0.12],[165,0.12],[175,0.12],[196,0.16],
    [220,0.10],[220,0.08],[247,0.12],[262,0.10],[294,0.12],[330,0.16],[294,0.12],[262,0.16]
  ]
};
let musicTick=0, musicStep=0, musicTrack='title';
function tickMusic(){
  if(!audioCtx||!musicEnabled) return;
  if(musicTick-->0) return;
  const seq = musicNotes[musicTrack]||musicNotes.title;
  const [f,d] = seq[musicStep%seq.length];
  beep(f,d,'square',0.04,20);
  beep(f*1.5,d*0.9,'triangle',0.02,-10);
  musicStep++;
  musicTick = Math.max(4, (d*60)|0);
}
function setMusicTrack(t){ musicTrack=t; musicStep=0; musicTick=0; }

// ─── INPUT ─────────────────────────────────────────────────────────────────────
const keys = { down:new Set(), pressed:new Set() };
function isDown(k){ return keys.down.has(k); }
function wasPressed(k){ return keys.pressed.has(k); }
function clearPressed(){ keys.pressed.clear(); }

window.addEventListener('keydown', ev => {
  const k = ev.code;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)) ev.preventDefault();
  if(!keys.down.has(k)) keys.pressed.add(k);
  keys.down.add(k);
  ensureAudio();
  if(k==='KeyM'){ musicEnabled=!musicEnabled; }
  if(k==='KeyF'){
    if(!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }
});
window.addEventListener('keyup', ev => keys.down.delete(ev.code));

// ─── PARTICLE SYSTEM ───────────────────────────────────────────────────────────
const particles = [];
function addParticle(x,y,color,life=22,vx=rand(-2,2),vy=rand(-3,0),r=rand(1.5,3.5)){
  if(particles.length>320) return;
  particles.push({x,y,color,life,max:life,vx,vy,r});
}
function sparkBurst(x,y,colors,n=16,speed=3){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, s=rand(0.5,speed);
    addParticle(x,y,pick(colors),rand(16,28),Math.cos(a)*s,Math.sin(a)*s-1);
  }
}
function updateParticles(){
  for(const p of particles){ p.x+=p.vx; p.y+=p.vy; p.vy+=0.06; p.life--; }
  particles.splice(0, particles.length, ...particles.filter(p=>p.life>0));
}
function drawParticles(){
  for(const p of particles){
    ctx.globalAlpha = p.life/p.max;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x,p.y,p.r,p.r);
  }
  ctx.globalAlpha=1;
}


// ─── STAGE DEFINITIONS ─────────────────────────────────────────────────────────
// 8 stages: Moon Patrol · Contra Run · Mega Man Platform · Ninja Gaiden Sword · 
//           Master Blaster Vehicle · R-Type Shoot · Bionic Grapple · Final Boss
const STAGES = [
  { id:'moon',    name:'Moon Patrol Revival',       kind:'vehicle', theme:'moon',    length:5600, speed:4.2,
    enemyRate:0.022, obstRate:0.016, musicRate:1.0, musicTrack:'action',
    controls:'← → throttle · ↑ jump · SPACE fire (forward+up)', pitCount:10 },
  { id:'contra',  name:'Contra Jungle Sprint',      kind:'run',     theme:'jungle',  length:5000, speed:0,
    enemyRate:0.025, obstRate:0, musicRate:1.1, musicTrack:'action',
    controls:'← → run · ↑ jump · ↓ duck · SPACE shoot', pitCount:0 },
  { id:'mega',    name:'Mega Man Platform Siege',   kind:'platform',theme:'city',    length:5200, speed:0,
    enemyRate:0.028, obstRate:0, musicRate:1.05, musicTrack:'action',
    controls:'← → run · ↑ jump · SPACE shoot (up=up-shot)', pitCount:0 },
  { id:'ninja',   name:'Ninja Gaiden Bitcoin Dojo', kind:'sword',   theme:'dojo',    length:4600, speed:0,
    enemyRate:0.03, obstRate:0, musicRate:0.95, musicTrack:'action',
    controls:'← → run · ↑ jump · SPACE sword combo · ↓ duck', pitCount:0 },
  { id:'blaster', name:'Master Blaster Highlands',  kind:'vehicle', theme:'desert',  length:5800, speed:4.8,
    enemyRate:0.026, obstRate:0.014, musicRate:1.08, musicTrack:'action',
    controls:'← → throttle · ↑ jump · SPACE fire · G grapple', pitCount:14 },
  { id:'rtype',   name:'R-Type Void Corridor',      kind:'shmup',   theme:'space',   length:6000, speed:0,
    enemyRate:0.04, obstRate:0, musicRate:1.15, musicTrack:'action',
    controls:'← → ↑ ↓ fly · SPACE fire (hold for charge)', pitCount:0 },
  { id:'bionic',  name:'Bionic Sky Bridge',          kind:'bionic',  theme:'sky',     length:5400, speed:0,
    enemyRate:0.028, obstRate:0, musicRate:1.0, musicTrack:'action',
    controls:'← → run · ↑ jump · SPACE shoot · G grapple', pitCount:0 },
  { id:'boss',    name:'Satoshi Citadel — Final',   kind:'boss',    theme:'citadel', length:9999, speed:0,
    enemyRate:0.012, obstRate:0, musicRate:1.0, musicTrack:'boss', pitCount:0 },
];

// ─── ROAD WAVE ─────────────────────────────────────────────────────────────────
function groundWave(worldX, kind){
  if(kind==='shmup'||kind==='boss') return 0;
  if(kind==='vehicle') return Math.sin(worldX*0.014)*14 + Math.sin(worldX*0.033)*6;
  return Math.sin(worldX*0.009)*8 + Math.sin(worldX*0.022)*4;
}

// ─── LEVEL GENERATOR ───────────────────────────────────────────────────────────
function generateLevel(stageIdx){
  const s = STAGES[stageIdx];
  const platforms=[], pits=[], anchors=[], spawns=[], pickups=[], banks=[];

  if(s.kind==='platform'||s.kind==='run'||s.kind==='sword'||s.kind==='bionic'){
    // generate floating platforms
    for(let x=600; x<s.length-400; x+=rand(220,360)){
      const y = rand(270,400);
      platforms.push({x, y, w:rand(90,160), h:16});
    }
  }
  if(s.kind==='bionic'){
    for(let x=900; x<s.length-300; x+=rand(400,600)){
      anchors.push({x, y:rand(90,180), r:12});
    }
  }
  if(s.kind==='vehicle'||s.id==='moon'||s.id==='blaster'){
    for(let i=0; i<s.pitCount; i++){
      const x = 800 + i*(s.length-800)/s.pitCount + rand(-60,60);
      pits.push({x, w:rand(90,160)});
      banks.push({worldX:x-200, w:rand(60,100), h:rand(60,90), hp:5, maxHp:5, dead:false});
    }
  }
  // Enemy spawn schedule
  for(let x=500; x<s.length-300; x+=rand(160,280)){
    const types = getEnemyTypes(s.kind);
    spawns.push({x, type:pick(types), done:false});
  }
  // Pickups
  const pTypes=['btc','btc','btc','spread','laser','wave','burst','giant','nuke','shield','med','invincible'];
  for(let x=700; x<s.length-300; x+=rand(500,900)){
    pickups.push({worldX:x, y:rand(160,GROUND_Y-80), type:pick(pTypes), w:48,h:48, taken:false, t:rand(0,6.28)});
  }
  return {platforms,pits,anchors,spawns,pickups,banks};
}

function getEnemyTypes(kind){
  const shared = ['grunt','flyer'];
  if(kind==='vehicle')  return [...shared,'hopper','saucer','raider'];
  if(kind==='run')      return [...shared,'commando','turret'];
  if(kind==='platform') return [...shared,'turret','drone','roboguard'];
  if(kind==='sword')    return ['ninja','elite_ninja','samurai','commando'];
  if(kind==='bionic')   return [...shared,'commando','drone','bionic_ninja'];
  if(kind==='shmup')    return ['flyer','drone','bomber','blade_spinner','ace_fighter'];
  if(kind==='boss')     return ['grunt','flyer','commando'];
  return shared;
}


// ─── GAME STATE ────────────────────────────────────────────────────────────────
function createPlayer(){
  return {
    x:130, y:GROUND_Y-PLAYER_H, vx:0, vy:0,
    w:PLAYER_W, h:PLAYER_H,
    hp:PLAYER_HP, maxHp:PLAYER_HP,
    facing:1,
    onGround:false, crouching:false,
    fireCdF:0, fireCdU:0, fireFxF:0, fireFxU:0,
    inv:0, invincible:0,
    weapon:'basic', weaponTimer:0,
    shield:0,
    swordCombo:0, swordTimer:0, swordFx:0,
    jumpBuffer:0, coyote:0,
    grapple:{active:false,ax:0,ay:0,len:0,angle:0,omega:0,cd:0},
    chargeTimer:0, // for R-Type charge shot
    onBank:false, anim:0,
  };
}

function createBoss(){
  return {
    x:W+200, y:180, w:200, h:200,
    hp:400, maxHp:400, fireCd:60,
    phase:0, t:0, anger:0,
    shield:0, shieldMax:120, shieldTimer:0,
  };
}

function createGame(){
  return {
    state:'title', // title|briefing|playing|paused|stageclear|gameover|win
    stageIdx:0,
    score:0, lives:4,
    hiScore:Number(localStorage.getItem('mp4hi')||'0'),
    cameraX:0, shake:0,
    stageTimer:0, levelTimer:0, textFlash:0,
    player:null,
    bullets:[], enemies:[], pickups:[], obstacles:[], banks:[],
    platforms:[], pits:[], anchors:[],
    boss:null, bossDead:false,
    spawnSchedule:[], pickupSchedule:[],
    nukeBankKills:0,
    titleTimer:0, titleMusicTick:0, titleMusicStep:0,
    quantTick:0,
    briefStage:0,
  };
}

let game = createGame();

// ─── QUANT QUOTES ──────────────────────────────────────────────────────────────
const QUANT = [
  "Halvings compress supply — patience expands conviction.",
  "Every panic candle leaves behind stronger holders.",
  "Bear markets write the code for bull markets.",
  "The signal is long-term issuance, not short-term noise.",
  "Volatility is the fee we pay for early adoption.",
  "Fundamentals whisper long before charts scream.",
  "Large moves start where confidence feels impossible.",
  "The market rewards discipline more than prediction.",
  "Risk first, upside second, survive to stack tomorrow.",
  "Bull runs are built during nobody-cares zones.",
  "Liquidity hunts weak structure before trend resumes.",
  "History rhymes; leverage blows up on schedule.",
];

// ─── INIT / RESET ──────────────────────────────────────────────────────────────
function initStage(idx){
  const s = STAGES[idx];
  game.stageIdx = idx;
  game.levelTimer = 0;
  game.cameraX = 0;
  game.shake = 0;
  game.stageTimer = 200;
  game.textFlash = 1;
  game.nukeBankKills = 0;
  game.bossDead = false;
  game.bullets.length=0;
  game.enemies.length=0;
  const lv = generateLevel(idx);
  game.platforms   = lv.platforms;
  game.pits        = lv.pits;
  game.anchors     = lv.anchors;
  game.spawnSchedule  = lv.spawns;
  game.pickupSchedule = lv.pickups;
  game.banks       = lv.banks;
  game.player = createPlayer();
  // Adjust player start for shmup
  if(s.kind==='shmup'){
    game.player.y = H/2 - PLAYER_H/2;
  }
  if(s.id==='boss'){
    game.boss = createBoss();
  } else {
    game.boss = null;
  }
  setMusicTrack(s.musicTrack||'action');
}

function startGame(){
  game.state='playing';
  game.score=0; game.lives=4;
  initStage(0);
}

function nextStage(){
  game.score += 4000;
  sfx.coin();
  const next = game.stageIdx+1;
  if(next>=STAGES.length){
    game.state='win';
    if(game.score>game.hiScore){ game.hiScore=game.score; localStorage.setItem('mp4hi',String(game.hiScore)); }
    setMusicTrack('title');
  } else {
    game.state='briefing';
    game.briefStage=next;
    game.stageTimer=240;
    setMusicTrack('title');
  }
}


// ─── PLAYER DAMAGE / DEATH ─────────────────────────────────────────────────────
function damagePlayer(amt=1){
  const p=game.player;
  if(p.invincible>0||p.inv>0) return;
  if(p.shield>0){ p.shield=Math.max(0,p.shield-100); beep(230,0.06,'triangle',0.05,-40); return; }
  p.hp -= amt;
  p.inv = 55;
  game.shake = 10;
  sfx.hurt();
  sparkBurst(p.x,p.y,['#ff6a6a','#ff9a9a'],10,2.5);
  if(p.hp<=0){
    game.lives--;
    if(game.lives<0){
      game.state='gameover';
      if(game.score>game.hiScore){ game.hiScore=game.score; localStorage.setItem('mp4hi',String(game.hiScore)); }
      setMusicTrack('title');
    } else {
      initStage(game.stageIdx);
    }
  }
}

// ─── SHOOTING ──────────────────────────────────────────────────────────────────
function shoot(dirY=0){
  const p=game.player, s=STAGES[game.stageIdx];
  const rapid = p.weaponTimer>0&&p.weapon==='spread'?0.6:1;
  if(dirY===-1){
    if(p.fireCdU>0) return;
    p.fireCdU=24*rapid; p.fireFxU=5;
  } else {
    if(p.fireCdF>0) return;
    p.fireCdF=s.kind==='shmup'?10:18*rapid; p.fireFxF=5;
  }

  const power = p.weapon==='laser'?3 : p.weapon==='burst'?2 : p.weapon==='wave'?4 :
                p.weapon==='giant'?10 : p.weapon==='nuke'?9 : 1;
  const fwd = p.facing;
  const px=p.x, py=p.y;

  const mk=(bx,by,vx,vy,w,h,extra={})=>
    game.bullets.push({x:bx,y:by,vx,vy,from:'player',w,h,power,...extra});

  if(s.kind==='shmup'){
    // R-Type: charge blast or spread forward
    if(p.chargeTimer>=60){
      mk(px+fwd*16,py,fwd*11,0,24,12,{power:6,charge:true});
      mk(px+fwd*16,py-10,fwd*10,-1,14,8,{power:4});
      mk(px+fwd*16,py+10,fwd*10,1,14,8,{power:4});
      p.chargeTimer=0;
    } else {
      if(p.weapon==='spread'){
        mk(px+fwd*16,py,fwd*9,0,12,6);
        mk(px+fwd*16,py,fwd*8,-2,10,5);
        mk(px+fwd*16,py,fwd*8,2,10,5);
      } else {
        mk(px+fwd*16,py,fwd*10,0,s.kind==='shmup'?16:12,6,{power});
      }
    }
    sfx.shoot(); return;
  }

  if(s.kind==='sword'){
    // Ninja Gaiden sword combo
    p.swordCombo = Math.min(3, p.swordCombo+1);
    p.swordTimer = 22;
    p.swordFx = 18;
    sfx.sword();
    const slashW = 52 + p.swordCombo*10, slashH=36;
    mk(px+fwd*20,py-10,fwd*1.5,0,slashW,slashH,{sword:true,pierce:8,power:p.swordCombo+1});
    return;
  }

  // Standard shoot: forward + optional up
  if(dirY===-1){
    if(p.weapon==='spread'){
      mk(px,py-16,0,-9,10,5,{power}); mk(px,py-16,2,-8,10,5,{power}); mk(px,py-16,-2,-8,10,5,{power});
    } else if(p.weapon==='nuke'){
      const ns=Math.min(80,32+game.nukeBankKills*2);
      mk(px,py-14,0,-6.5,ns,ns,{power,nuke:true,grow:true});
    } else {
      mk(px,py-16,0,-8.8,10,5,{power});
    }
  } else {
    if(p.weapon==='spread'){
      mk(px+fwd*20,py-8,fwd*8,0,10,5,{power}); mk(px+fwd*20,py-8,fwd*7.5,-2,10,5,{power}); mk(px+fwd*20,py-8,fwd*7.5,2,10,5,{power});
      mk(px-fwd*16,py-7,-fwd*7.2,0,10,5,{power}); // rear shot (Moon Patrol)
    } else if(p.weapon==='giant'){
      mk(px+fwd*20,py-8,fwd*8,0,64,32,{power,giant:true,pierce:2});
      mk(px-fwd*16,py-7,-fwd*6.5,0,54,28,{power,giant:true,pierce:2});
    } else if(p.weapon==='nuke'){
      const ns=Math.min(88,32+game.nukeBankKills*2);
      mk(px+fwd*20,py-8,fwd*7,0,ns,ns,{power,nuke:true,grow:true});
    } else if(p.weapon==='wave'){
      mk(px+fwd*20,py-8,fwd*8.5,0,28,14,{power,wave:true,phase:0,pierce:20,noBank:true});
      mk(px-fwd*16,py-7,-fwd*7,0,22,12,{power,wave:true,phase:1.57,pierce:20,noBank:true});
    } else {
      mk(px+fwd*20,py-8,fwd*8.2,0,12,6,{power});
      mk(px-fwd*16,py-7,-fwd*7.4,0,12,6,{power}); // rear
    }
  }
  sfx.shoot();
}


// ─── ENEMY SPAWN & UPDATE ─────────────────────────────────────────────────────
function spawnEnemy(type, worldX){
  const s = STAGES[game.stageIdx];
  const kind = s.kind;
  let y = GROUND_Y - 24;
  let vx = -2.2 - Math.random()*1.8;
  let vy = 0;
  let hp=1, w=28, h=38, fireCd=randi(50,120);

  if(type==='flyer'||type==='drone'||type==='ace_fighter'||type==='blade_spinner'){
    y = rand(80, H-120);
    vx = kind==='shmup' ? -(2.5+Math.random()*2) : -(1.8+Math.random()*1.4);
    hp = type==='ace_fighter'?3:type==='blade_spinner'?4:1;
    w=38; h=32;
  }
  if(type==='turret'||type==='roboguard'){ y=GROUND_Y-40; w=32; h=40; hp=3; vx=0; }
  if(type==='ninja'||type==='elite_ninja'){ hp=type==='elite_ninja'?3:1; w=26; h=42; }
  if(type==='samurai'){ hp=4; w=32; h=46; }
  if(type==='commando'){ hp=2; w=28; h=40; }
  if(type==='hopper'){ hp=1; w=24; h=28; vy=-4; }
  if(type==='saucer'){ y=rand(100,260); hp=2; w=36; h=18; }
  if(type==='raider'){ hp=2; w=34; h=26; y=rand(120,280); }
  if(type==='bomber'){ y=rand(60,160); hp=2; w=36; h=26; }
  if(type==='bionic_ninja'){ hp=3; w=28; h=44; }

  const screenX = kind==='shmup' ? W+50 : W+60;
  game.enemies.push({
    x:screenX, worldX:screenX+game.cameraX,
    y, vx, vy, w, h, hp, maxHp:hp,
    type, fireCd, t:0, phase:Math.random()*6.28,
    dashTimer:0, dead:false
  });
}

function updateEnemies(dt){
  const s = STAGES[game.stageIdx];
  const p = game.player;

  // Process spawn schedule
  for(const sp of game.spawnSchedule){
    if(!sp.done && sp.x - game.cameraX < W+80){
      spawnEnemy(sp.type, sp.x);
      sp.done=true;
    }
  }

  for(const e of game.enemies){
    e.t += dt;
    e.fireCd -= dt*60;
    e.dashTimer = Math.max(0, e.dashTimer-dt*60);

    // Shmup: enemies drift and swoop
    if(s.kind==='shmup'){
      e.x += e.vx;
      e.y += Math.sin(e.t*2.2+e.phase)*1.2 + e.vy;
      if(e.type==='ace_fighter'&&e.dashTimer<=0){
        const dy=(p.y-e.y); e.vy=clamp(e.vy+dy*0.001*60*dt,-2,2);
      }
      if(e.type==='blade_spinner'){
        e.vx = -2.5 + Math.cos(e.t*3)*1.5;
        e.vy = Math.sin(e.t*3.5)*2;
        e.x+=e.vx; e.y+=e.vy;
      }
    } else if(e.type==='turret'||e.type==='roboguard'){
      // stationary
    } else if(e.type==='flyer'||e.type==='drone'||e.type==='saucer'||e.type==='raider'||e.type==='bomber'){
      e.x += e.vx;
      e.y += Math.sin(e.t*1.8+e.phase)*1.0;
    } else {
      // Ground enemy: apply gravity, bounce
      e.vy += GRAVITY*dt;
      e.x += e.vx;
      e.y += e.vy*dt;
      const gw = groundWave(e.x+game.cameraX, s.kind);
      const floor = GROUND_Y-18+gw;
      if(e.y>=floor){ e.y=floor; e.vy = (e.type==='hopper')?-rand(5,9):0; }
      if(e.y<50) e.y=50;
      // Ninja dash toward player
      if((e.type==='ninja'||e.type==='elite_ninja'||e.type==='bionic_ninja')&&Math.random()<0.01){
        e.vx = (p.x<e.x?-1:1)*(3+Math.random()*2);
      }
    }

    // Enemy shooting
    if(e.fireCd<=0 && e.x>40 && e.x<W-40){
      const dx=p.x-e.x, dy=p.y-e.y, d=Math.hypot(dx,dy)||1;
      if(e.type!=='ninja'&&e.type!=='samurai'){
        game.bullets.push({x:e.x,y:e.y,vx:(dx/d)*3.2,vy:(dy/d)*3.2,from:'enemy',w:9,h:5,power:1});
      }
      e.fireCd = randi(50,130);
    }
  }

  // Cull off-screen enemies
  game.enemies = game.enemies.filter(e=>!e.dead && e.x>-120 && e.x<W+150 && e.y<H+100);
}


// ─── BULLET UPDATE & COLLISION ────────────────────────────────────────────────
function updateBullets(dt){
  const p=game.player;
  for(const b of game.bullets){
    b.x += b.vx;
    if(b.grow){ b.w=Math.min(160,b.w+0.4); b.h=Math.min(160,b.h+0.4); }
    if(b.wave){ b.phase=(b.phase||0)+0.28; b.y+=b.vy+Math.sin(b.phase)*1.8; }
    else b.y += b.vy;
  }

  // Player bullets vs enemies
  for(const b of game.bullets){
    if(b.from!=='player') continue;
    for(const e of game.enemies){
      if(e.dead) continue;
      if(overlap({x:b.x-b.w/2,y:b.y-b.h/2,w:b.w,h:b.h},{x:e.x-e.w/2,y:e.y-e.h/2,w:e.w,h:e.h})){
        e.hp -= b.power;
        if(!b.pierce&&!b.sword) b.x=W+999;
        if(b.pierce) b.pierce--;
        sparkBurst(e.x,e.y,['#ffcf66','#ff9a66'],6,2);
        if(e.hp<=0){
          e.dead=true;
          game.score+=220+(e.maxHp-1)*80;
          sparkBurst(e.x,e.y,['#ff5a5a','#ffd27a','#ff9966'],18,3);
          sfx.explode();
          if(Math.random()<0.08) dropPickup(e.x,e.y);
        }
      }
    }
    // Player bullets vs banks
    if(!b.noBank){
      for(const bk of game.banks){
        if(bk.dead) continue;
        const bkRect={x:bk.x-game.cameraX-bk.w/2,y:bk.y,w:bk.w,h:bk.h};
        if(overlap({x:b.x-b.w/2,y:b.y-b.h/2,w:b.w,h:b.h},bkRect)){
          bk.hp -= b.nuke?999:b.power;
          if(!b.pierce) b.x=W+999;
          if(bk.hp<=0) explodeBank(bk);
        }
      }
    }
    // Player bullets vs boss
    if(game.boss){
      const bs=game.boss;
      if(overlap({x:b.x-b.w/2,y:b.y-b.h/2,w:b.w,h:b.h},{x:bs.x-bs.w/2,y:bs.y-bs.h/2,w:bs.w,h:bs.h})){
        const dmg = bs.shield>0?0.25:b.power;
        bs.hp -= dmg; game.score+=35;
        b.x=W+999;
        sparkBurst(bs.x,bs.y+bs.h*0.2,['#ffd480','#f7931a'],8,2.5);
        if(bs.shield>0){ bs.shield=Math.max(0,bs.shield-b.power*20); }
      }
    }
  }

  // Enemy bullets vs player
  const pr={x:p.x-p.w/2,y:p.y-p.h/2,w:p.w,h:p.crouching?p.h*0.55:p.h};
  for(const b of game.bullets){
    if(b.from!=='enemy') continue;
    if(overlap({x:b.x-b.w/2,y:b.y-3,w:b.w,h:b.h||6},pr)){
      b.x=-999; damagePlayer(b.power||1);
    }
  }

  // Cull
  game.bullets = game.bullets.filter(b=>b.x>-60&&b.x<W+60&&b.y>-60&&b.y<H+60);
}

function explodeBank(bk){
  if(bk.dead) return;
  bk.dead=true;
  sparkBurst(bk.x-game.cameraX,bk.y+bk.h/2,['#f06060','#5f7399','#2a2a2a'],24,3.5);
  game.score+=300; sfx.explode();
  if(Math.random()<0.7) dropPickup(bk.x-game.cameraX,bk.y);
  if(++game.nukeBankKills>8) game.nukeBankKills=8;
}

function dropPickup(x,y){
  const t=pick(['btc','btc','btc','spread','laser','wave','burst','giant','nuke','shield','med','invincible']);
  game.pickups.push({x,y,worldX:x+game.cameraX,w:44,h:44,type:t,t:Math.random()*6.28,y0:y,taken:false});
}


// ─── PICKUP UPDATE ────────────────────────────────────────────────────────────
function updatePickups(dt){
  const p=game.player;
  const s=STAGES[game.stageIdx];

  // Activate from schedule
  for(const pk of game.pickupSchedule){
    if(!pk.taken && pk.worldX-game.cameraX < W+60){
      game.pickups.push({x:pk.worldX-game.cameraX,y:pk.y,worldX:pk.worldX,w:44,h:44,
        type:pk.type,t:pk.phase||0,y0:pk.y,taken:false});
      pk.taken=true;
    }
  }

  // Scroll pickups with camera in scrolling stages
  for(const pk of game.pickups){
    if(!pk.taken){
      pk.t+=dt*2;
      if(s.kind==='vehicle'||s.id==='blaster') pk.x = pk.worldX - game.cameraX;
      pk.y = pk.y0 + Math.sin(pk.t)*7;
    }
  }

  // Collect
  const pr={x:p.x-p.w/2,y:p.y-p.h/2,w:p.w,h:p.h};
  for(const pk of game.pickups){
    if(pk.taken) continue;
    if(overlap({x:pk.x-pk.w/2,y:pk.y-pk.h/2,w:pk.w,h:pk.h},pr)){
      collectPickup(pk); pk.taken=true;
    }
  }
  game.pickups = game.pickups.filter(pk=>!pk.taken && pk.x>-60 && pk.x<W+60);
}

function collectPickup(pk){
  const p=game.player;
  sfx.powerup();
  if(pk.type==='btc'){ game.score+=BTC_COIN; sparkBurst(pk.x,pk.y,['#f7931a','#ffd580','#fff'],12,2.5); return; }
  if(pk.type==='med'){ p.hp=Math.min(p.maxHp,p.hp+2); game.score+=200; return; }
  if(pk.type==='shield'){ p.shield=700; game.score+=300; return; }
  if(pk.type==='invincible'){ p.invincible=480; game.score+=600; return; }
  // Weapons
  const wmap={spread:820,laser:780,wave:1000,burst:760,giant:860,nuke:960};
  if(wmap[pk.type]){ p.weapon=pk.type; p.weaponTimer=wmap[pk.type]; game.score+=350; }
}

// ─── PLATFORM COLLISION ───────────────────────────────────────────────────────
function resolvePlayerPlatforms(){
  const p=game.player;
  p.onGround=false;
  const pw=p.w, ph=p.crouching?p.h*0.55:p.h;
  const px=p.x-pw/2, py=p.y;

  for(const pl of game.platforms){
    const plx=pl.x-game.cameraX;
    if(px+pw<plx||px>plx+pl.w) continue;
    // Land on top
    const prevBottom=py+ph-p.vy*FIXED_DT;
    const plTop=pl.y;
    if(prevBottom<=plTop+4&&py+ph>=plTop-2&&p.vy>=0){
      p.y=plTop-ph; p.vy=0; p.onGround=true; p.coyote=8;
    }
  }
}

// ─── GRAPPLE ─────────────────────────────────────────────────────────────────
function tryGrapple(){
  const p=game.player, gr=p.grapple;
  if(gr.cd>0||!STAGES[game.stageIdx].id==='bionic'&&STAGES[game.stageIdx].kind!=='bionic') return;
  // Find nearest anchor
  let best=null,bestD=360;
  for(const a of game.anchors){
    const ax=a.x-game.cameraX, ay=a.y;
    const d=Math.hypot(ax-p.x,ay-p.y);
    if(d<bestD&&d<340){ bestD=d; best={ax,ay}; }
  }
  if(best){
    gr.active=true; gr.ax=best.ax; gr.ay=best.ay;
    gr.len=Math.hypot(best.ax-p.x,best.ay-p.y);
    gr.angle=Math.atan2(p.y-best.ay,p.x-best.ax);
    gr.omega=-1.2; gr.cd=20;
    sfx.grapple();
  }
}

function updateGrapple(dt){
  const p=game.player, gr=p.grapple;
  p.grapple.cd=Math.max(0,gr.cd-1);
  if(!gr.active) return;
  // Pendulum
  const gravity=GRAVITY*dt;
  const dAngle=-(gravity/gr.len)*Math.sin(gr.angle);
  gr.omega+=dAngle;
  if(isDown('ArrowLeft'))  gr.omega-=0.04;
  if(isDown('ArrowRight')) gr.omega+=0.04;
  gr.omega*=0.98;
  gr.angle+=gr.omega*dt*60*0.06;
  p.x = gr.ax + Math.sin(gr.angle)*gr.len;
  p.y = gr.ay + Math.cos(gr.angle)*gr.len;
  p.vx=0; p.vy=0;
  // Release on jump
  if(wasPressed('Space')||wasPressed('ArrowUp')){
    p.vx=gr.omega*gr.len*0.6*(p.x<gr.ax?-1:1);
    p.vy=-Math.abs(gr.omega)*gr.len*0.5-4;
    gr.active=false;
  }
}


// ─── PLAYER UPDATE ────────────────────────────────────────────────────────────
function updatePlayer(dt){
  const p=game.player, s=STAGES[game.stageIdx];

  p.anim=(p.anim||0)+dt*8;
  p.inv=Math.max(0,p.inv-1);
  p.fireCdF=Math.max(0,p.fireCdF-1);
  p.fireCdU=Math.max(0,p.fireCdU-1);
  p.fireFxF=Math.max(0,p.fireFxF-1);
  p.fireFxU=Math.max(0,p.fireFxU-1);
  p.swordTimer=Math.max(0,(p.swordTimer||0)-1);
  p.swordFx=Math.max(0,(p.swordFx||0)-1);
  p.shield=Math.max(0,p.shield-1);
  p.invincible=Math.max(0,p.invincible-1);
  p.weaponTimer=Math.max(0,p.weaponTimer-1);
  p.jumpBuffer=Math.max(0,(p.jumpBuffer||0)-1);
  p.coyote=Math.max(0,(p.coyote||0)-1);
  if(p.weaponTimer<=0) p.weapon='basic';
  if(p.swordTimer<=0) p.swordCombo=0;

  const left=isDown('ArrowLeft'), right=isDown('ArrowRight');
  const up=isDown('ArrowUp'), down=isDown('ArrowDown');
  if(up) p.jumpBuffer=8;

  // ── SHMUP (R-Type) ──
  if(s.kind==='shmup'){
    if(left)  p.vx-=0.5;
    if(right) p.vx+=0.5;
    if(up)    p.vy-=0.5;
    if(down)  p.vy+=0.5;
    p.vx*=0.86; p.vy*=0.86;
    p.x=clamp(p.x+p.vx,40,W-40);
    p.y=clamp(p.y+p.vy,40,H-40);
    if(isDown('Space')) p.chargeTimer=(p.chargeTimer||0)+1;
    else if(p.chargeTimer>0){ shoot(0); }
    return;
  }

  // ── VEHICLE (Moon Patrol / Master Blaster) ──
  if(s.kind==='vehicle'){
    if(left)  p.vx-=0.55;
    if(right) p.vx+=0.48;
    p.vx+=(280-p.x)*0.006;
    p.vx+=0.05; p.vx*=0.83;
    p.x=clamp(p.x+p.vx,80,480);
    const gw=groundWave(game.cameraX+p.x,s.kind);
    p.vy+=GRAVITY*dt;
    p.y+=p.vy*dt;
    const floor=GROUND_Y-p.h+gw;
    if(p.y>=floor){ p.y=floor; p.vy=0; p.onGround=true; p.coyote=8; }
    else p.onGround=false;
    // Pit rescue
    if(p.y>H-20){ p.hp=Math.max(1,p.hp-2); p.y=floor-10; p.vy=-8; }
    // Jump
    if(p.jumpBuffer>0&&p.coyote>0){
      p.vy=-460; p.onGround=false; p.coyote=0; p.jumpBuffer=0; sfx.jump();
    }
    if(isDown('Space')){ shoot(0); shoot(-1); }
    if(s.kind==='vehicle'&&wasPressed('KeyG')) tryGrapple();
    updateGrapple(dt);
    return;
  }

  // ── ON-FOOT (run/platform/sword/bionic) ──
  p.crouching = down && p.onGround;
  if(left){  p.vx-=0.6; p.facing=-1; }
  if(right){ p.vx+=0.6; p.facing= 1; }
  p.vx*=0.80;
  p.x=clamp(p.x+p.vx,60,W-60);

  // Gravity
  p.vy+=GRAVITY*dt;
  p.y+=p.vy*dt;

  // Ground
  if(s.kind!=='bionic'||true){
    const gw=groundWave(game.cameraX+p.x,s.kind);
    const floor=GROUND_Y-p.h+gw;
    if(p.y>=floor){ p.y=floor; p.vy=0; p.onGround=true; p.coyote=8; }
    else p.onGround=false;
    if(p.y<30) p.y=30;
  }

  resolvePlayerPlatforms();

  // Jump
  if(p.jumpBuffer>0&&p.coyote>0&&!p.crouching){
    p.vy=s.kind==='platform'?-560:-520;
    p.onGround=false; p.coyote=0; p.jumpBuffer=0; sfx.jump();
  }

  // Fire
  if(wasPressed('Space')){
    if(s.kind==='sword') shoot(0);
    else shoot(0);
  }
  if(isDown('Space')&&isDown('ArrowUp')&&s.kind!=='sword') shoot(-1);

  // Grapple
  if(wasPressed('KeyG')&&s.kind==='bionic') tryGrapple();
  updateGrapple(dt);

  // Scroll camera in on-foot stages
  if(s.kind!=='vehicle'){
    const targetCam = p.x - W*0.38;
    game.cameraX = clamp(game.cameraX+(targetCam-game.cameraX)*0.08*60*dt, 0, s.length-W);
  }
}


// ─── BOSS UPDATE ──────────────────────────────────────────────────────────────
function updateBoss(dt){
  const bs=game.boss, p=game.player;
  if(!bs||game.bossDead) return;
  bs.t+=dt*60;
  // Float in
  bs.x+=(W-260-bs.x)*0.03;
  bs.y=180+Math.sin(bs.t*0.03)*80;
  // Phase 2 when low health
  if(bs.hp<bs.maxHp*0.5) bs.phase=1;
  // Shield pulse
  bs.shieldTimer=(bs.shieldTimer||0)+dt;
  if(bs.shieldTimer>8){ bs.shield=bs.shieldMax; bs.shieldTimer=0; }
  bs.shield=Math.max(0,bs.shield-1);
  // Fire
  bs.fireCd-=dt*60;
  if(bs.fireCd<=0){
    bs.fireCd=bs.phase?26:48;
    const dx=p.x-bs.x, dy=p.y-bs.y, d=Math.hypot(dx,dy)||1;
    const spread=bs.phase?0.28:0.08;
    for(let i=-1;i<=1;i++){
      game.bullets.push({x:bs.x-90,y:bs.y+i*22,
        vx:(dx/d)*3.4-2.5+i*spread*5,vy:(dy/d)*3.4+i*spread*8,
        from:'enemy',w:10,h:6,power:bs.phase?2:1});
    }
    if(bs.phase&&Math.random()<0.3){
      // Rage volley
      for(let a=0;a<6;a++){
        const ang=a/6*Math.PI*2;
        game.bullets.push({x:bs.x,y:bs.y,vx:Math.cos(ang)*3,vy:Math.sin(ang)*3,
          from:'enemy',w:8,h:8,power:1});
      }
    }
    sfx.boss();
  }
  // Also spawn minion waves
  if(bs.t%300<2) spawnEnemy('commando', W+60);
  if(bs.t%480<2) spawnEnemy('flyer', W+60);

  if(bs.hp<=0&&!game.bossDead){
    game.bossDead=true;
    sparkBurst(bs.x,bs.y,['#f7931a','#ffd580','#ff6060','#fff'],60,6);
    game.score+=25000; sfx.explode(); sfx.coin();
    setTimeout(()=>nextStage(),2000);
  }
}

// ─── CAMERA + SCROLL ─────────────────────────────────────────────────────────
function updateCamera(dt){
  const s=STAGES[game.stageIdx];
  if(s.kind==='vehicle'){
    game.cameraX+=s.speed*dt*60*0.5;
    game.cameraX=Math.min(game.cameraX,s.length-W);
  }
  game.shake*=0.85;

  // Stage complete for non-boss
  if(s.id!=='boss'&&game.cameraX>=s.length-W-40){
    nextStage();
  }
}

// ─── PLAYER vs ENEMIES collision ─────────────────────────────────────────────
function checkPlayerEnemyCollision(){
  const p=game.player;
  const pr={x:p.x-p.w/2,y:p.y-(p.crouching?p.h*0.55:p.h)/2,w:p.w,h:p.crouching?p.h*0.55:p.h};
  for(const e of game.enemies){
    if(e.dead) continue;
    const er={x:e.x-e.w/2,y:e.y-e.h/2,w:e.w,h:e.h};
    if(overlap(pr,er)){
      if(p.invincible>0){
        e.hp=0; e.dead=true; game.score+=140;
        sparkBurst(e.x,e.y,['#ff9464','#ffd580'],12,2.5);
      } else {
        damagePlayer(1); e.hp-=2;
        if(e.hp<=0){ e.dead=true; sparkBurst(e.x,e.y,['#ff5a5a'],8,2); }
      }
    }
  }
  // Invincible aura
  if(p.invincible>0){
    const r=130+Math.sin(game.levelTimer*0.2)*14;
    for(const e of game.enemies){
      if(e.dead) continue;
      if(Math.hypot(e.x-p.x,e.y-p.y)<r){
        e.dead=true; game.score+=120;
        sparkBurst(e.x,e.y,['#ff9464','#ffd580'],10,2.5);
      }
    }
    if(game.levelTimer%7===0) sparkBurst(p.x+rand(-50,50),p.y+rand(-30,30),['#ff7e52','#ffd173'],4,1.5);
  }
}


// ─── MAIN UPDATE ─────────────────────────────────────────────────────────────
function updatePlaying(dt){
  if(game.paused) return;
  game.levelTimer++;
  tickMusic();

  updatePlayer(dt);
  updateEnemies(dt);
  updateBullets(dt);
  updatePickups(dt);
  updateBoss(dt);
  checkPlayerEnemyCollision();
  updateParticles();
  updateCamera(dt);

  game.stageTimer=Math.max(0,game.stageTimer-1);
  game.quantTick=(game.quantTick||0)+1;
}

// ══════════════════════════════════════════════════════════════════════════════
// ─── DRAW ENGINE ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// Pixel font helper
function ptext(txt,x,y,size=32,color='#fff',shadow='#000'){
  ctx.save();
  ctx.font=`bold ${size}px "Courier New",monospace`;
  ctx.textAlign='center';
  ctx.fillStyle=shadow;
  ctx.fillText(txt,x+Math.max(2,size*0.07),y+Math.max(2,size*0.07));
  ctx.fillStyle=color;
  ctx.fillText(txt,x,y);
  ctx.restore();
}

// Small pixel rectangle shorthand
function px(x,y,w,h,c){ ctx.fillStyle=c; ctx.fillRect((x|0)*2,(y|0)*2,(w|0)*2,(h|0)*2); }

// Bitcoin ₿ glyph (pixel art)
function drawBTC(ox,oy,s=2,color='#f0c642',outline='#6b3d00'){
  const r=(dx,dy,w,h,c)=>{ ctx.fillStyle=c; ctx.fillRect(ox+dx*s,oy+dy*s,w*s,h*s); };
  r(0,0,6,1,outline); r(0,1,1,7,outline); r(0,8,6,1,outline);
  r(5,2,1,2,outline); r(5,5,1,2,outline);
  r(1,1,4,1,color); r(1,7,4,1,color); r(1,4,4,1,color);
  r(1,2,1,2,color); r(1,5,1,2,color);
  r(4,2,1,2,color); r(4,5,1,2,color);
  r(2,-1,1,11,color);
}

// ─── BACKGROUND DRAW ─────────────────────────────────────────────────────────
const THEMES={
  moon:    {sky1:'#2d344f',sky2:'#090a14',hill1:'#4a546d',hill2:'#1c2233',ground:'#6a6f86',tile1:'#9ea4bc',tile2:'#7a829b'},
  jungle:  {sky1:'#446d76',sky2:'#0f1d26',hill1:'#27454d',hill2:'#152e34',ground:'#5e7a5e',tile1:'#4a6a4a',tile2:'#3a5a3a'},
  city:    {sky1:'#1a2240',sky2:'#080c1a',hill1:'#252c50',hill2:'#141a32',ground:'#606880',tile1:'#5a6278',tile2:'#4a5268'},
  dojo:    {sky1:'#3a1a0c',sky2:'#1a0808',hill1:'#5a2a1a',hill2:'#3a1a0c',ground:'#8a6040',tile1:'#7a5030',tile2:'#6a4020'},
  desert:  {sky1:'#e88a30',sky2:'#a05020',hill1:'#c07028',hill2:'#803818',ground:'#d4a060',tile1:'#c09050',tile2:'#b07840'},
  space:   {sky1:'#080c20',sky2:'#020408',hill1:'#101828',hill2:'#060c14',ground:'#101828',tile1:'#141c2c',tile2:'#0c1420'},
  sky:     {sky1:'#4a88cc',sky2:'#1a3860',hill1:'#3a6898',hill2:'#1a3060',ground:'#6aa0cc',tile1:'#5890bc',tile2:'#4880ac'},
  citadel: {sky1:'#1a1a2a',sky2:'#08080f',hill1:'#282838',hill2:'#181820',ground:'#303040',tile1:'#282835',tile2:'#202028'},
};

function drawBackground(){
  const s=STAGES[game.stageIdx];
  const th=THEMES[s.theme]||THEMES.moon;
  const t=game.levelTimer;

  // Sky gradient
  const sg=ctx.createLinearGradient(0,0,0,H*0.72);
  sg.addColorStop(0,th.sky1); sg.addColorStop(1,th.sky2);
  ctx.fillStyle=sg; ctx.fillRect(0,0,W,H*0.72);

  // Stars in dark themes
  if(s.theme==='space'||s.theme==='citadel'||s.theme==='moon'){
    ctx.fillStyle='rgba(255,255,255,0.7)';
    for(let i=0;i<60;i++){
      const sx=(i*197+t*0.1)%W, sy=(i*113)%280;
      const blink=Math.sin(t*0.05+i)*0.4+0.6;
      ctx.globalAlpha=blink*0.8;
      ctx.fillRect(sx,sy,1,1);
    }
    ctx.globalAlpha=1;
  }

  // Clouds in non-space themes
  if(s.theme!=='space'&&s.theme!=='citadel'){
    ctx.fillStyle='rgba(255,255,255,0.14)';
    for(let i=0;i<5;i++){
      const cx=W-((t*(0.4+i*0.08)+i*200)%(W+140))-70;
      const cy=20+(i%3)*24;
      ctx.fillRect(cx,cy,64,16); ctx.fillRect(cx+16,cy-10,80,14); ctx.fillRect(cx+96,cy,48,14);
    }
  }

  // Parallax mountain layers
  for(let layer=0;layer<2;layer++){
    const depth=0.4+layer*0.32, baseY=GROUND_Y-65+layer*18;
    ctx.fillStyle=layer===0?th.hill1:th.hill2;
    for(let i=-1;i<7;i++){
      const hx=W-((t*depth+i*160)%(W+160))-160;
      if(s.theme==='city'||s.theme==='citadel'){
        // City skyline
        ctx.fillRect(hx+4,baseY-80,28,80); ctx.fillRect(hx+34,baseY-110,30,110);
        ctx.fillRect(hx+66,baseY-140,32,140); ctx.fillRect(hx+100,baseY-95,28,95);
        ctx.fillRect(hx+130,baseY-60,26,60);
        ctx.fillStyle='rgba(255,220,80,0.35)';
        for(let wy=baseY-130;wy<baseY;wy+=18) for(let wx=hx+6;wx<hx+156;wx+=14) ctx.fillRect(wx,wy,5,5);
        ctx.fillStyle=layer===0?th.hill1:th.hill2;
      } else {
        ctx.fillRect(hx+8,baseY-48,20,48); ctx.fillRect(hx+28,baseY-74,26,74);
        ctx.fillRect(hx+54,baseY-92,28,92); ctx.fillRect(hx+82,baseY-76,24,76);
        ctx.fillRect(hx+106,baseY-54,22,54); ctx.fillRect(hx+130,baseY-32,24,32);
      }
    }
  }

  // Ground tiles
  if(s.kind!=='shmup'){
    for(let x=0;x<W;x+=8){
      const gw=groundWave(game.cameraX+x,s.kind);
      const ty=GROUND_Y+gw;
      ctx.fillStyle=th.ground; ctx.fillRect(x,ty,8,H-ty);
      ctx.fillStyle='rgba(255,255,255,0.05)'; ctx.fillRect(x,ty,8,2);
    }
    // Brick tiles
    for(let i=0;i<Math.ceil(W/8)+2;i++){
      const x=W-((t*(s.kind==='vehicle'?s.speed:2)+i*8)%(W+8));
      const gw=groundWave(game.cameraX+x,s.kind);
      ctx.fillStyle=i%2?th.tile1:th.tile2;
      ctx.fillRect(x,GROUND_Y+8+gw,8,6);
    }
  } else {
    // Space shmup background: dark with nebula
    ctx.fillStyle='rgba(20,10,40,0.5)'; ctx.fillRect(0,H*0.65,W,H*0.35);
    ctx.fillStyle='rgba(40,20,80,0.3)'; ctx.fillRect(0,0,W,H*0.35);
    // Scrolling stars
    for(let i=0;i<80;i++){
      const sx=W-((i*47+t*2.5)%(W+40)), sy=(i*67)%H;
      ctx.fillStyle=`rgba(180,200,255,${0.3+i%3*0.15})`; ctx.fillRect(sx,sy,1+(i%3),1);
    }
  }

  // Theme accents
  if(s.theme==='dojo'){
    // Torii gates, lanterns
    for(let i=0;i<4;i++){
      const gx=W-((t*1.2+i*280)%(W+140));
      ctx.fillStyle='#8b1a1a'; ctx.fillRect(gx,GROUND_Y-120,8,90); ctx.fillRect(gx+60,GROUND_Y-120,8,90);
      ctx.fillRect(gx-10,GROUND_Y-118,88,10); ctx.fillRect(gx-4,GROUND_Y-104,76,8);
    }
  }

  // NES scanlines
  ctx.fillStyle='rgba(0,0,0,0.06)';
  for(let y=0;y<H;y+=2) ctx.fillRect(0,y,W,1);
}


// ─── DRAW PLAYER: Mad Bitcoins Hero ─────────────────────────────────────────
// Top hat · red sash · bitcoin logo · fly goggles (black border/red lens) · suit
function drawPlayer(){
  const p=game.player;
  if(!p) return;
  if(p.inv>0&&Math.floor(p.inv/4)%2===0) return;

  ctx.save();
  const sx = p.x|0, sy = p.y|0;
  ctx.translate(sx, sy);

  // Scale if invincible
  const sc = p.invincible>0 ? 1.35+Math.sin(game.levelTimer*0.25)*0.08 : 1.0;
  ctx.scale(sc*p.facing, sc);

  // Invincible aura ring
  if(p.invincible>0){
    ctx.strokeStyle=`rgba(255,${160+(game.levelTimer*6)%80},100,0.75)`;
    ctx.lineWidth=3;
    ctx.beginPath(); ctx.ellipse(0,-10,44,30,0,0,Math.PI*2); ctx.stroke();
  }

  // px helper relative to player center (unscaled coords, drawn at 1:1)
  const R=(x,y,w,h,c)=>{ ctx.fillStyle=c; ctx.fillRect(x,y,w,h); };

  // ── VEHICLE sprite (Moon Patrol buggy) ──
  const s=STAGES[game.stageIdx];
  if(s.kind==='vehicle'){
    // Buggy body
    R(-28,-8,56,16,'#0b1733'); R(-26,-7,52,14,'#1f4b95'); R(-24,-5,48,11,'#2f66bf');
    // Canopy
    R(-18,-18,36,12,'#89b6ea'); R(-16,-17,32,4,'#d5e7fb');
    // Wheels (3 with bounce)
    const wb=Math.sin(game.levelTimer*0.25)>0?0:1;
    for(const wx of[-14,0,14]){
      const b=Math.sin(game.levelTimer*0.25+wx)>0?0:wb;
      R(wx-3,6+b,7,7,'#0c0c0c'); R(wx-2,7+b,5,5,'#4d78b0'); R(wx-1,8+b,3,3,'#7fb1ea');
    }
    // Gun barrel (front)
    R(20,-4,12,3,'#7f95bb'); R(30,-4,6,2,'#d5e7fb');
    // Up gun
    R(-22,-22,10,3,'#7f95bb'); R(-24,-25,5,2,'#d5e7fb');
    // Fire FX
    if(p.fireFxF>0){ R(34,-5,5,2,'#ff8f1f'); R(38,-4,4,1,'#ffe28a'); }
    if(p.fireFxU>0){ R(-24,-27,5,3,'#ff8f1f'); R(-23,-31,2,4,'#ffe28a'); }
    // Hero head above canopy
    R(-5,-38,16,12,'#f4d4a8');
    // Goggles (black frame, red lens)
    ctx.fillStyle='#3a1f0a';
    ctx.beginPath(); ctx.arc(-1,-33,5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(8,-33,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#8e1111'; ctx.beginPath(); ctx.arc(-1,-33,3.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(8,-33,3.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#d36262'; ctx.beginPath(); ctx.arc(-2.2,-34.2,1.2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(6.8,-34.2,1.2,0,Math.PI*2); ctx.fill();
    R(2,-34,3,1,'#2a1005'); // bridge
    // Top hat
    R(-9,-56,24,14,'#090c14'); R(-13,-42,30,4,'#090c14'); R(-7,-54,19,2,'#1a2130');
    // Bitcoin ₿ on hat
    drawBTC(-2,-76,1.6,'#f0c642','#7a4f00');
    // Red sash on body (shown as stripe on canopy area)
    R(-5,-5,10,2,'#cc2222');
    if(p.shield>0){ ctx.strokeStyle='rgba(80,220,255,0.8)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(0,-5,38,20,0,0,Math.PI*2); ctx.stroke(); }
    ctx.restore(); return;
  }

  // ── SHMUP sprite (ship form) ──
  if(s.kind==='shmup'){
    R(-24,-6,48,10,'#13284f'); R(-22,-5,44,8,'#2e63b6');
    R(-8,-13,16,7,'#7eb4ea'); R(22,-4,8,4,'#5c789f'); R(28,-3,4,2,'#d9e9ff');
    R(-10,1,26,3,'#1a3b6c'); R(-26,0,16,4,'#325f9a'); R(14,0,16,4,'#325f9a');
    R(-4,-18,10,4,'#090c14');
    drawBTC(-1,-34,1.2,'#f0c642','#7a4f00');
    R(-2,-14,6,4,'#f4d4a8'); R(-1,-13,4,2,'#bb3b3b');
    if(p.fireFxF>0){ R(31,-4,4,2,'#ff8f1f'); R(34,-4,4,1,'#ffe28a'); }
    // Charge glow
    if((p.chargeTimer||0)>30){
      const cr=Math.min(18,(p.chargeTimer-30)*0.5);
      ctx.fillStyle=`rgba(80,200,255,${clamp((p.chargeTimer-30)/60,0,0.8)})`;
      ctx.beginPath(); ctx.arc(28,-2,cr,0,Math.PI*2); ctx.fill();
    }
    ctx.restore(); return;
  }

  // ── SWORD swing override ──
  if(s.kind==='sword'&&p.swordFx>0){
    const life=p.swordFx/18;
    const swingAngle=-0.9+p.swordCombo*0.35+(1-life)*1.8;
    ctx.save();
    // Slash arc
    ctx.strokeStyle=`rgba(200,230,255,${life*0.85})`;
    ctx.lineWidth=8*life+2;
    ctx.beginPath(); ctx.arc(0,-16,42,swingAngle-0.7,swingAngle+0.7); ctx.stroke();
    ctx.strokeStyle=`rgba(255,255,255,${life*0.6})`;
    ctx.lineWidth=4*life;
    ctx.beginPath(); ctx.arc(0,-16,36,swingAngle-0.5,swingAngle+0.5); ctx.stroke();
    ctx.restore();
  }

  // ── ON-FOOT hero body (Contra/Mega Man/Ninja hybrid) ──
  // Legs (walk anim)
  const walkCyc=Math.sin(p.anim*1.2)*6;
  const lLeg = p.onGround&&(isDown('ArrowLeft')||isDown('ArrowRight'))? walkCyc:0;
  R(-8,14+lLeg,7,16,'#1a2540'); R(2,14-lLeg,7,16,'#1a2540');
  R(-8,26+lLeg,7,8,'#2a3a5a'); R(2,26-lLeg,7,8,'#2a3a5a');
  // Suit body
  R(-12,-2,24,20,'#111a2a'); R(-10,-1,20,16,'#1b2d4a');
  // Red sash (diagonal)
  for(let i=0;i<14;i++) R(-8+i,2+i*0.5,3,2,'#cc2222');
  // Bitcoin logo on chest
  drawBTC(-3,-8,1.2,'#f0c642','#7a4f00');
  // Arms
  const armBob=p.onGround?Math.sin(p.anim*1.2)*3:0;
  R(-18,-4+armBob,7,12,'#111823'); R(12,-4-armBob,7,12,'#111823');
  // Gun hand (right)
  R(18,-6,12,5,'#7f95bb'); R(28,-5,6,2,'#c7d7ef');
  if(p.fireFxF>0){ R(32,-6,5,3,'#ff8f1f'); R(36,-5,4,1,'#ffe28a'); }
  if(p.fireFxU>0){ R(10,-20,5,3,'#ff8f1f'); R(12,-24,2,4,'#ffe28a'); }
  // Face (crouching compress)
  const faceY=p.crouching?-14:-22;
  R(-7,faceY,16,14,'#f4d4a8');
  R(-5,faceY+12,12,4,'#dfaa52'); // beard
  R(-1,faceY+8,10,2,'#bb3b3b'); // mouth
  // Goggles (black border, red lens) — bigger and more prominent
  ctx.fillStyle='#3a1f0a';
  ctx.beginPath(); ctx.arc(-4,faceY+4,6,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(6,faceY+4,6,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#8e1111';
  ctx.beginPath(); ctx.arc(-4,faceY+4,4.5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(6,faceY+4,4.5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#d36262';
  ctx.beginPath(); ctx.arc(-5.5,faceY+2.5,1.5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(4.5,faceY+2.5,1.5,0,Math.PI*2); ctx.fill();
  R(0,faceY+3,3,1,'#2a1005'); // goggle bridge
  // Top hat
  R(-8,faceY-18,20,14,'#090c14'); R(-12,faceY-4,28,4,'#090c14'); R(-6,faceY-16,16,2,'#1a2130');
  // Bitcoin ₿ on hat
  drawBTC(-1,faceY-36,1.8,'#f0c642','#7a4f00');
  // Sword draw in sword mode
  if(s.kind==='sword'){
    ctx.save();
    ctx.rotate(p.swordFx>0?-0.4+p.swordCombo*0.3:0.1);
    R(10,-8,28,4,'#c0c8e0'); R(36,-8,8,4,'#e8eeff'); R(8,-8,6,4,'#8a6030');
    ctx.restore();
  }
  if(p.shield>0){ ctx.strokeStyle='rgba(80,220,255,0.8)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.ellipse(0,-8,30,26,0,0,Math.PI*2); ctx.stroke(); }
  ctx.restore();
}


// ─── DRAW ENEMIES ────────────────────────────────────────────────────────────
function drawEnemies(){
  for(const e of game.enemies){
    ctx.save(); ctx.translate(e.x|0,e.y|0);
    const R=(x,y,w,h,c)=>{ ctx.fillStyle=c; ctx.fillRect(x,y,w,h); };
    const t=e.t;

    if(e.type==='grunt'||e.type==='commando'){
      R(-11,-20,22,20,'#1a0a0a'); R(-9,-18,18,16,'#8b2020');
      R(-6,-14,12,6,'#c03030'); R(-4,-8,8,6,'#f08060');
      R(-9,0,8,10,'#3a2a5a'); R(2,0,8,10,'#3a2a5a');
      R(-13,-10,5,3,'#9abfd9'); R(8,-10,5,3,'#9abfd9');
      // helmet
      R(-10,-20,20,6,'#222'); R(-8,-22,16,4,'#333');
    } else if(e.type==='flyer'||e.type==='drone'||e.type==='saucer'){
      const bob=Math.sin(t*3+e.phase)*3;
      R(-16,-9+bob,32,14,'#1a1a3a'); R(-14,-7+bob,28,10,'#4040a0');
      R(-6,-13+bob,12,6,'#7070d0'); R(-8,-7+bob,16,4,'#9090e8');
      // engine glow
      ctx.fillStyle=`rgba(100,180,255,${0.5+Math.sin(t*6)*0.3})`;
      ctx.beginPath(); ctx.ellipse(0,5+bob,12,4,0,0,Math.PI*2); ctx.fill();
    } else if(e.type==='ace_fighter'){
      R(-20,-7,40,12,'#2a1a50'); R(-18,-6,36,10,'#6030c0');
      R(-4,-13,8,7,'#a080ff'); R(18,-5,8,4,'#805090'); R(-26,-4,8,4,'#805090');
      ctx.fillStyle='rgba(180,100,255,0.6)';
      ctx.beginPath(); ctx.ellipse(-22,-1,6,3,0,0,Math.PI*2); ctx.fill();
    } else if(e.type==='blade_spinner'){
      ctx.save(); ctx.rotate(t*4);
      R(-14,-2,28,4,'#c04040'); R(-2,-14,4,28,'#c04040');
      R(-10,-10,4,4,'#ff8080'); R(6,-10,4,4,'#ff8080');
      R(-10,6,4,4,'#ff8080'); R(6,6,4,4,'#ff8080');
      ctx.restore();
      R(-5,-5,10,10,'#2a0a0a');
    } else if(e.type==='ninja'||e.type==='elite_ninja'||e.type==='bionic_ninja'){
      const col=e.type==='elite_ninja'?'#601080':e.type==='bionic_ninja'?'#105080':'#202040';
      R(-10,-20,20,20,col); R(-8,-18,16,12,'#404060');
      R(-12,-10,5,3,'#60c0ff'); R(8,-10,5,3,'#60c0ff');
      R(-9,0,7,12,'#302050'); R(3,0,7,12,'#302050');
      // Sword
      ctx.save(); ctx.rotate(Math.sin(t*5)*0.3);
      R(12,-12,22,3,'#c0c8e0'); R(32,-12,6,3,'#e8eeff');
      ctx.restore();
    } else if(e.type==='samurai'){
      R(-13,-24,26,24,'#4a1010'); R(-11,-22,22,18,'#8a2020');
      R(-8,-14,16,6,'#c04040'); R(-4,-8,8,6,'#f0a080');
      // big hat
      R(-16,-24,32,6,'#1a0808'); R(-10,-30,20,8,'#2a1010');
      // katana
      ctx.save(); ctx.rotate(-0.4+Math.sin(t*4)*0.2);
      R(10,-16,32,3,'#d0d8f0'); R(40,-16,8,3,'#f0f8ff'); R(7,-16,6,4,'#8a5020');
      ctx.restore();
    } else if(e.type==='turret'||e.type==='roboguard'){
      R(-14,-18,28,18,'#1a2030'); R(-12,-16,24,14,'#304060');
      R(-6,-14,12,6,'#60a0d0'); // sensor
      R(10,-12,14,4,'#7f95bb'); R(22,-11,8,3,'#c7d7ef'); // gun
      R(-14,0,28,6,'#1a2030'); // base
    } else if(e.type==='hopper'){
      const hop=Math.abs(Math.sin(t*4))*6;
      R(-10,-14+hop,20,14,'#802020'); R(-8,-12+hop,16,10,'#c04040');
      R(-4,-8+hop,8,5,'#f08060'); R(-12,0,10,8,'#601818'); R(2,0,10,8,'#601818');
    } else if(e.type==='bomber'){
      const bob=Math.sin(t*2.5)*4;
      R(-16,-10+bob,32,16,'#202868'); R(-14,-8+bob,28,12,'#4048b0');
      R(-4,-14+bob,8,6,'#6068d0');
      // bomb drop
      R(-2,6+bob,4,6,'#404040'); R(-3,10+bob,6,3,'#808080');
    } else {
      // Generic candle enemy
      R(-10,-20,20,20,'#8e1f1f'); R(-8,-18,16,8,'#d33d3d');
      R(-2,-24,4,5,'#ffffff'); // wick
      R(-1,-28,2,4,'#ffcf6a'); // flame
    }

    // HP bar for bossy enemies
    if(e.maxHp>1&&e.hp<e.maxHp){
      ctx.fillStyle='#400'; ctx.fillRect(-14,e.h/2+2,28,3);
      ctx.fillStyle='#f7931a'; ctx.fillRect(-14,e.h/2+2,28*(e.hp/e.maxHp),3);
    }
    ctx.restore();
  }
}

// ─── DRAW BANKS ──────────────────────────────────────────────────────────────
function drawBanks(){
  for(const bk of game.banks){
    if(bk.dead) continue;
    const x=(bk.x-game.cameraX)|0, y=bk.y|0, w=bk.w|0, h=bk.h|0;
    ctx.fillStyle='#10172a'; ctx.fillRect(x-w/2-2,y-2,w+4,h+2);
    ctx.fillStyle='#5f7399'; ctx.fillRect(x-w/2,y,w,h);
    ctx.fillStyle='#b6c6df'; ctx.fillRect(x-w/2+2,y+2,w-4,8);
    ctx.fillStyle='#2a395b'; ctx.fillRect(x-w/2+4,y+12,w-8,h-16);
    // Windows
    ctx.fillStyle='#90a8cb';
    for(let wy=y+16;wy<y+h-6;wy+=10) for(let wx=x-w/2+6;wx<x+w/2-10;wx+=10) ctx.fillRect(wx,wy,5,5);
    // Label
    ctx.fillStyle='#223250'; ctx.font='bold 10px "Courier New",monospace'; ctx.textAlign='center';
    ctx.fillText('BANK',x,y+12);
    ctx.fillStyle='#cf2b2b'; ctx.font='bold 16px "Courier New",monospace';
    ctx.fillText('$$$',x,y+Math.min(30,h-8));
    // HP
    if(bk.hp<bk.maxHp){
      ctx.fillStyle='#c00'; ctx.fillRect(x-w/2+4,y+h-6,w-8,3);
      ctx.fillStyle='#f7931a'; ctx.fillRect(x-w/2+4,y+h-6,(w-8)*(bk.hp/bk.maxHp),3);
    }
  }
}

// ─── DRAW PLATFORMS ──────────────────────────────────────────────────────────
function drawPlatforms(){
  const s=STAGES[game.stageIdx];
  for(const pl of game.platforms){
    const x=(pl.x-game.cameraX)|0;
    if(x+pl.w<0||x>W) continue;
    ctx.fillStyle='#1e3060'; ctx.fillRect(x-2,pl.y-2,pl.w+4,pl.h+2);
    ctx.fillStyle='#4a70c0'; ctx.fillRect(x,pl.y,pl.w,pl.h);
    ctx.fillStyle='#7aa8e8'; ctx.fillRect(x,pl.y,pl.w,3);
  }
}

// ─── DRAW ANCHORS ────────────────────────────────────────────────────────────
function drawAnchors(){
  for(const a of game.anchors){
    const ax=(a.x-game.cameraX)|0, ay=a.y|0;
    ctx.fillStyle='#c0a020'; ctx.beginPath(); ctx.arc(ax,ay,a.r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#f0d040'; ctx.beginPath(); ctx.arc(ax-2,ay-2,a.r*0.5,0,Math.PI*2); ctx.fill();
    // Grapple line
    const p=game.player;
    if(p.grapple.active&&Math.abs(p.grapple.ax-ax)<4&&Math.abs(p.grapple.ay-ay)<4){
      ctx.strokeStyle='rgba(200,200,100,0.9)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(p.x,p.y); ctx.stroke();
    }
  }
}


// ─── DRAW PICKUPS ────────────────────────────────────────────────────────────
function drawPickups(){
  for(const pk of game.pickups){
    if(pk.taken) continue;
    ctx.save(); ctx.translate(pk.x|0,pk.y|0);
    const pulse=1+Math.sin(game.levelTimer*0.18+pk.t)*0.07;
    ctx.scale(pulse,pulse);
    const or=pk.w*0.5, ir=pk.w*0.43;
    // Coin base
    ctx.fillStyle='#6b3d00'; ctx.beginPath(); ctx.arc(0,0,or,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#f7931a'; ctx.beginPath(); ctx.arc(0,0,ir,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#ffd583'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(0,0,or*0.62,0,Math.PI*2); ctx.stroke();
    if(pk.type==='btc'){
      drawBTC(-6,-11,2.0,'#fff1c9','#b26e12');
    } else {
      const map={spread:'S',laser:'L',wave:'W',burst:'B',giant:'G',nuke:'N',invincible:'I',shield:'D',med:'+'};
      const ringMap={spread:'#9fe6ff',laser:'#ff9a66',wave:'#7a4dff',burst:'#ffd27a',giant:'#ff5a5a',nuke:'#2a2a2a',invincible:'#ffe994',shield:'#8ac7ff',med:'#9af6a0'};
      ctx.strokeStyle=ringMap[pk.type]||'#fff'; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.arc(0,0,16,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle='#fff1c9'; ctx.font='bold 18px "Courier New",monospace'; ctx.textAlign='center';
      ctx.fillText(map[pk.type]||'?',0,6);
    }
    ctx.restore();
  }
}

// ─── DRAW BULLETS ────────────────────────────────────────────────────────────
function drawBullets(){
  for(const b of game.bullets){
    const x=b.x-b.w/2|0, y=b.y-b.h/2|0;
    if(b.nuke){
      const c=(Math.floor(game.levelTimer/3))%2;
      ctx.fillStyle=c?'#d82424':'#161616';
      ctx.beginPath(); ctx.arc(b.x,b.y,Math.max(4,Math.min(b.w,b.h)*0.5),0,Math.PI*2); ctx.fill();
      ctx.fillStyle=c?'#161616':'#d82424';
      ctx.beginPath(); ctx.arc(b.x,b.y,Math.max(2,Math.min(b.w,b.h)*0.3),0,Math.PI*2); ctx.fill();
    } else if(b.sword){
      ctx.fillStyle='rgba(200,230,255,0.7)'; ctx.fillRect(x,y,b.w,b.h);
      ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fillRect(x+4,y+4,b.w-8,b.h-8);
    } else if(b.wave){
      const c=(Math.floor((game.levelTimer+(b.phase||0)*4)/4))%3;
      ctx.fillStyle=c===0?'#7a4dff':c===1?'#ffffff':'#4aa6ff';
      ctx.fillRect(x,y,b.w,b.h);
    } else if(b.giant){
      ctx.fillStyle='#ff6b6b'; ctx.fillRect(x,y,b.w,b.h);
      ctx.fillStyle='#ffe0e0'; ctx.fillRect(x+3,y+2,b.w-6,b.h-4);
    } else if(b.charge){
      ctx.fillStyle='rgba(80,200,255,0.9)'; ctx.fillRect(x,y,b.w,b.h);
      ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.fillRect(x+2,y+2,b.w-4,b.h-4);
    } else {
      ctx.fillStyle=b.from==='player'?'#ffb347':'#d93636';
      ctx.fillRect(x,y,b.w,b.h);
      ctx.fillStyle=b.from==='player'?'#fff3b0':'#ff9a9a';
      ctx.fillRect(x+2,y+1,Math.max(1,b.w-4),Math.max(1,b.h-2));
    }
  }
}

// ─── DRAW BOSS ───────────────────────────────────────────────────────────────
function drawBoss(){
  const bs=game.boss;
  if(!bs||game.bossDead) return;
  const R=(x,y,w,h,c)=>{ ctx.fillStyle=c; ctx.fillRect(bs.x+x,bs.y+y,w,h); };
  const hw=bs.w/2, hh=bs.h/2;
  // Main body
  R(-hw,-hh,bs.w,bs.h,'#1a1a1a');
  R(-hw+4,-hh+4,bs.w-8,bs.h-8,'#303030');
  // Eye banks
  R(-hw+20,-hh+20,50,30,'#181818'); R(-hw+80,-hh+20,50,30,'#181818');
  R(-hw+22,-hh+22,46,26,'#ff2020'); R(-hw+82,-hh+22,46,26,'#ff2020');
  // Eye pupils (track player)
  const px=clamp(game.player.x-bs.x,-15,15), py=clamp(game.player.y-bs.y,-8,8);
  ctx.fillStyle='#ff8080';
  ctx.beginPath(); ctx.ellipse(bs.x-hw+45+px,bs.y-hh+35+py,12,10,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(bs.x-hw+105+px,bs.y-hh+35+py,12,10,0,0,Math.PI*2); ctx.fill();
  // Bitcoin logo centre
  drawBTC(bs.x-14,bs.y-18,3.5,'#f7931a','#6b3d00');
  // Shield glow
  if(bs.shield>0){
    ctx.strokeStyle=`rgba(80,200,255,${bs.shield/bs.shieldMax*0.8})`;
    ctx.lineWidth=6;
    ctx.beginPath(); ctx.ellipse(bs.x,bs.y,hw+12,hh+12,0,0,Math.PI*2); ctx.stroke();
  }
  // HP bar
  const bpw=340, bph=14;
  ctx.fillStyle='#111'; ctx.fillRect(W/2-bpw/2-2,16,bpw+4,bph+4);
  ctx.fillStyle='#2a2a2a'; ctx.fillRect(W/2-bpw/2,18,bpw,bph);
  const hpFrac=Math.max(0,bs.hp/bs.maxHp);
  const hpColor=hpFrac>0.5?'#f7931a':hpFrac>0.25?'#ff6020':'#ff2020';
  ctx.fillStyle=hpColor; ctx.fillRect(W/2-bpw/2,18,bpw*hpFrac,bph);
  ptext('SATOSHI CITADEL CORE',W/2,14,11,'#fff','#000');
}


// ─── DRAW HUD ────────────────────────────────────────────────────────────────
function drawHUD(){
  const p=game.player, s=STAGES[game.stageIdx];

  // HUD bar
  ctx.fillStyle='rgba(7,10,18,0.88)';
  ctx.fillRect(0,0,W,40);
  ctx.fillStyle='rgba(140,180,220,0.4)';
  ctx.fillRect(0,38,W,2);

  const tf='bold 15px "Courier New",monospace';
  ctx.font=tf; ctx.fillStyle='#d8f1ff'; ctx.textAlign='left';
  ctx.fillText(`SCORE ${String(game.score).padStart(7,'0')}`,12,27);
  ctx.fillText(`HI ${String(game.hiScore).padStart(7,'0')}`,220,27);
  ctx.fillText(`LIVES ${Math.max(0,game.lives)}`,400,27);
  ctx.fillText(`STAGE ${game.stageIdx+1}/8`,490,27);

  // HP bar
  const hpW=120, hpH=10, hpX=580, hpY=15;
  ctx.fillStyle='#111'; ctx.fillRect(hpX-1,hpY-1,hpW+2,hpH+2);
  ctx.fillStyle='#222'; ctx.fillRect(hpX,hpY,hpW,hpH);
  const hpFrac=p.hp/p.maxHp;
  ctx.fillStyle=hpFrac>0.5?'#4aff8a':hpFrac>0.25?'#ffb347':'#ff4444';
  ctx.fillRect(hpX,hpY,hpW*hpFrac,hpH);
  ctx.fillStyle='#9fd4ff'; ctx.fillText('HP',hpX-24,hpY+9);

  // Progress bar (non-boss)
  if(s.id!=='boss'){
    const pW=150, pX=790, pY=14;
    const prog=clamp(game.cameraX/(s.length-W),0,1);
    ctx.fillStyle='#1a2840'; ctx.fillRect(pX,pY,pW,10);
    ctx.fillStyle='#f7931a'; ctx.fillRect(pX,pY,pW*prog,10);
    ctx.fillStyle='#9fd4ff'; ctx.fillRect(pX,pY,pW,2);
    ctx.fillStyle='#9fd4ff'; ctx.font='bold 9px "Courier New",monospace'; ctx.textAlign='center';
    ctx.fillText(`${(prog*100)|0}%`,pX+pW/2,pY+8);
  }

  // Status indicators (bottom-left)
  ctx.textAlign='left'; ctx.font='bold 13px "Courier New",monospace';
  let statusX=10;
  if(p.invincible>0){ ctx.fillStyle='#ffe994'; ctx.fillText('★INVINCIBLE',statusX,H-10); statusX+=120; }
  if(p.shield>0){ ctx.fillStyle='#6effba'; ctx.fillText('SHIELD',statusX,H-10); statusX+=70; }
  if(p.weapon!=='basic'){
    const names={spread:'SPREAD',laser:'LASER',wave:'WAVE',burst:'BURST',giant:'GIANT',nuke:'NUKE'};
    ctx.fillStyle='#ffd27a'; ctx.fillText(`WPN:${names[p.weapon]||'POWER'}`,statusX,H-10);
  }
  if(p.crouching){ ctx.fillStyle='#aaddff'; ctx.fillText('DUCK',W-50,H-10); }
  if(!musicEnabled){ ctx.fillStyle='#ff7777'; ctx.fillText('MUSIC OFF',W-88,27); }

  // Stage flash banner
  if(game.stageTimer>0){
    const alpha=clamp(game.stageTimer/160,0,1);
    ctx.globalAlpha=alpha;
    ptext(`STAGE ${game.stageIdx+1}`,W/2,H/2-22,56,'#ffd86b','#000');
    ptext(s.name.toUpperCase()+' — FIGHT!',W/2,H/2+36,26,'#9ee0ff','#000');
    ctx.globalAlpha=1;
  }
  if(game.paused){ ptext('PAUSED',W/2,H/2,64,'#fff','#000'); }

  // Quant quote (bottom strip)
  if(game.quantTick%900<600){
    const q=QUANT[Math.floor(game.quantTick/900)%QUANT.length];
    ctx.fillStyle='rgba(7,10,18,0.7)'; ctx.fillRect(0,H-28,W,28);
    ctx.fillStyle='rgba(140,180,220,0.3)'; ctx.fillRect(0,H-28,W,1);
    ctx.fillStyle='rgba(180,220,255,0.7)'; ctx.font='11px "Courier New",monospace';
    ctx.textAlign='center'; ctx.fillText('★ '+q+' ★',W/2,H-10);
  }
}

// ─── DRAW PLAYING FRAME ──────────────────────────────────────────────────────
function drawPlaying(){
  ctx.save();
  if(game.shake>0.5){
    ctx.translate(rand(-game.shake,game.shake),rand(-game.shake,game.shake));
  }
  drawBackground();
  drawPlatforms();
  drawBanks();
  drawAnchors();
  drawPickups();
  drawEnemies();
  drawBoss();
  drawBullets();
  drawPlayer();
  drawParticles();
  ctx.restore();
  drawHUD();
}


// ─── TITLE SCREEN ────────────────────────────────────────────────────────────
function drawTitle(){
  // Fake miami background
  const fakeDef={kind:'vehicle',theme:'moon',id:'moon',speed:2};
  const savedStage=game.stageIdx;
  game.stageIdx=0; // force moon theme draw
  drawBackground();
  game.stageIdx=savedStage;
  const t=game.titleTimer;

  // Demo banks
  for(let i=0;i<6;i++){
    const ox=W-((t*5+i*240)%(W+220))-60;
    const oh=58+(i%3)*14;
    const bk={x:ox,y:GROUND_Y-oh,w:58,h:oh,hp:5,maxHp:5,dead:false};
    // draw inline
    ctx.fillStyle='#10172a'; ctx.fillRect(ox-31,GROUND_Y-oh-2,62,oh+2);
    ctx.fillStyle='#5f7399'; ctx.fillRect(ox-29,GROUND_Y-oh,58,oh);
    ctx.fillStyle='#223250'; ctx.font='bold 9px "Courier New",monospace'; ctx.textAlign='center';
    ctx.fillText('BANK',ox,GROUND_Y-oh+12);
    ctx.fillStyle='#cf2b2b'; ctx.font='bold 14px "Courier New",monospace';
    ctx.fillText('$$$',ox,GROUND_Y-oh+30);
  }

  // Title text — animated wave
  const chars=[...'MAD PATROL 4'];
  const palette=['#ffb347','#ffd66a','#ff8a5a','#fff0a6','#f7a35d'];
  const xStart=60, xEnd=W-60;
  ctx.save();
  ctx.font='bold 90px "Courier New",monospace';
  ctx.textAlign='center';
  for(let i=0;i<chars.length;i++){
    const tt=chars.length<=1?0:i/(chars.length-1);
    const cx=xStart+(xEnd-xStart)*tt;
    const cy=150+Math.sin((tt-0.5)*Math.PI)*28+Math.sin(t*0.08+i*0.9)*5;
    const rot=Math.sin(t*0.04+i*0.6)*0.06;
    ctx.fillStyle='#1c1102';
    ctx.save(); ctx.translate(cx+3,cy+3); ctx.rotate(rot); ctx.fillText(chars[i],0,0); ctx.restore();
    ctx.fillStyle=palette[(i+Math.floor(t/18))%palette.length];
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(rot); ctx.fillText(chars[i],0,0); ctx.restore();
  }
  ctx.restore();

  // Bitcoin coin spin
  const coinA=t*0.04;
  ctx.save(); ctx.translate(W/2,220);
  ctx.scale(Math.cos(coinA)*0.6+0.4,1);
  ctx.fillStyle='#6b3d00'; ctx.beginPath(); ctx.arc(0,0,28,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#f7931a'; ctx.beginPath(); ctx.arc(0,0,24,0,Math.PI*2); ctx.fill();
  drawBTC(-8,-14,2.2,'#fff1c9','#b26e12');
  ctx.restore();

  const ta1=clamp((t-60)/60,0,1);
  const ta2=(clamp((t-120)/80,0,1))*(0.7+Math.sin(t*0.12)*0.3);
  const ta3=clamp((t-180)/80,0,1);

  ctx.globalAlpha=ta1;
  ptext('PRESS SPACE TO START',W/2,310,30,'#ffe08f','#000');
  ptext('— Contra · Mega Man · Ninja Gaiden · Moon Patrol · R-Type —',W/2,350,16,'#9ee0ff','#000');
  ctx.globalAlpha=ta2;
  ptext('↑ JUMP   SPACE FIRE   ↓ DUCK   G GRAPPLE',W/2,382,18,'#d7ebff','#12223a');

  // Expert panel
  ctx.globalAlpha=ta3;
  const experts=[
    {name:'CONTRA ENG.',tip:'Contra: twin-shot + duck cover',col:'#ff5a5a'},
    {name:'MEGA DESIGNER',tip:'Mega Man: platform + upshot',col:'#4a8fff'},
    {name:'NINJA MASTER',tip:'Ninja Gaiden: sword combo FX',col:'#9955ee'},
    {name:'MOON VET',tip:'Moon Patrol: buggy + rear gun',col:'#f7931a'},
    {name:'R-TYPE TACT.',tip:'R-Type: charge shot + swarm',col:'#44ddff'},
  ];
  const ew=168, eh=56, gap=8, totalW=(ew+gap)*experts.length-gap;
  const ex0=(W-totalW)/2;
  for(let i=0;i<experts.length;i++){
    const ex2=ex0+i*(ew+gap), ey2=420;
    ctx.fillStyle='#0e1828'; ctx.fillRect(ex2,ey2,ew,eh);
    ctx.fillStyle=experts[i].col; ctx.fillRect(ex2,ey2,ew,3);
    ctx.strokeStyle='rgba(150,180,220,0.4)'; ctx.lineWidth=1;
    ctx.strokeRect(ex2+1,ey2+1,ew-2,eh-2);
    ctx.fillStyle=experts[i].col; ctx.font='bold 11px "Courier New",monospace';
    ctx.textAlign='left'; ctx.fillText(experts[i].name,ex2+6,ey2+18);
    ctx.fillStyle='#c8ddf0'; ctx.font='9px "Courier New",monospace';
    ctx.fillText(experts[i].tip,ex2+6,ey2+36);
  }
  ctx.globalAlpha=clamp((t-220)/80,0,1);
  ctx.fillStyle='#9fdcff'; ctx.font='bold 13px "Courier New",monospace'; ctx.textAlign='center';
  ctx.fillText('Created by 1n2.org — Thomas Hunt · Mad Patrol 4',W/2,510);
  ctx.globalAlpha=1;
}

// ─── BRIEFING SCREEN ─────────────────────────────────────────────────────────
function drawBriefing(){
  const idx=game.briefStage, s=STAGES[idx];
  ctx.fillStyle='#070a14'; ctx.fillRect(0,0,W,H);
  ptext(`STAGE ${idx+1}`,W/2,100,52,'#ffd86b','#000');
  ptext(s.name.toUpperCase(),W/2,160,28,'#9ee0ff','#000');
  const ctrlY=220;
  ptext(s.controls,W/2,ctrlY,18,'#d7ebff','#000');
  ptext('PRESS SPACE TO BEGIN',W/2,H/2+60,26,'#ffe08f','#000');
  // Expert tip for the stage
  const tips=[
    'Contra Engineer: Watch for enemy patterns — dodge before firing!',
    'Moon Patrol Vet: Rear gun clears obstacles — use it!',
    'Mega Man Designer: Platforms reward exploration — find all pickups!',
    'Ninja Master: Sword combos deal triple damage — get in close!',
    'Moon Patrol Vet: Vehicle speed beats all — keep the throttle up!',
    'R-Type Tactician: Charge your shot to level-clear formation ships!',
    'Bionic Engineer: Grapple anchors let you swing over fire — use G!',
    'All Experts: This is the final battle — drain the shield first!'
  ];
  ctx.fillStyle='rgba(14,24,44,0.9)'; ctx.fillRect(60,H-110,W-120,80);
  ctx.strokeStyle='rgba(140,180,220,0.5)'; ctx.lineWidth=1.5; ctx.strokeRect(60,H-110,W-120,80);
  ctx.fillStyle='#f7931a'; ctx.font='bold 12px "Courier New",monospace'; ctx.textAlign='center';
  ctx.fillText('★ EXPERT BRIEFING ★',W/2,H-94);
  ctx.fillStyle='#c8ddf0'; ctx.font='13px "Courier New",monospace';
  ctx.fillText(tips[idx]||'',W/2,H-72);
}

// ─── GAME OVER / WIN ─────────────────────────────────────────────────────────
function drawGameOver(){
  game.stageIdx=Math.min(game.stageIdx,STAGES.length-1);
  drawBackground();
  ptext('GAME OVER',W/2,200,76,'#ff8a8a','#000');
  ptext(`SCORE ${String(game.score).padStart(7,'0')}`,W/2,285,34,'#fff','#000');
  ptext('PRESS ENTER TO RETRY',W/2,370,26,'#ffd57d','#000');
}

function drawWin(){
  game.stageIdx=7;
  drawBackground();
  ptext('YOU DEFEATED SATOSHI!',W/2,160,42,'#ffe08b','#000');
  ptext('ALL 8 STAGES CLEARED',W/2,220,30,'#9fdcff','#000');
  ptext(`FINAL SCORE ${String(game.score).padStart(7,'0')}`,W/2,290,34,'#fff','#000');
  ptext('Created by 1n2.org — Thomas Hunt · Mad Patrol 4',W/2,360,16,'#9fdcff','#000');
  ptext('PRESS ENTER TO PLAY AGAIN',W/2,420,24,'#f7b34e','#000');
}


// ─── MAIN GAME LOOP ──────────────────────────────────────────────────────────
let lastTime=performance.now(), accumulator=0;

function loop(now){
  requestAnimationFrame(loop);
  const dt=Math.min((now-lastTime)/1000, 0.05);
  lastTime=now;
  accumulator+=dt;

  // Fixed-step update
  while(accumulator>=FIXED_DT){
    if(game.state==='playing') updatePlaying(FIXED_DT);
    else if(game.state==='title'){ game.titleTimer++; tickMusic(); }
    else if(game.state==='briefing'){
      game.stageTimer--; tickMusic();
      if(game.stageTimer<=0&&wasPressed('Space')){ initStage(game.briefStage); game.state='playing'; }
    }
    accumulator-=FIXED_DT;
  }

  // Render
  ctx.clearRect(0,0,W,H);
  if(game.state==='title')    drawTitle();
  else if(game.state==='briefing') drawBriefing();
  else if(game.state==='playing'||game.state==='paused') drawPlaying();
  else if(game.state==='gameover') drawGameOver();
  else if(game.state==='win')      drawWin();

  clearPressed();
}

// ─── KEY HANDLERS (game-level) ────────────────────────────────────────────────
window.addEventListener('keydown', ev=>{
  const k=ev.code;

  if(game.state==='title'&&k==='Space'){
    ensureAudio(); startGame(); return;
  }
  if(game.state==='briefing'&&k==='Space'){
    ensureAudio(); initStage(game.briefStage); game.state='playing'; return;
  }
  if((game.state==='gameover'||game.state==='win')&&k==='Enter'){
    game=createGame(); setMusicTrack('title'); return;
  }
  if(game.state==='playing'&&k==='Escape'){
    game.paused=!game.paused;
    beep(game.paused?190:400,0.08,'square',0.04,20);
  }
});

// ─── KICK OFF ────────────────────────────────────────────────────────────────
setMusicTrack('title');
requestAnimationFrame(loop);

})(); // end IIFE
