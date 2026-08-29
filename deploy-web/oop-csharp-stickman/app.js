'use strict';
/* ============================================================
   OOP GAME LAB - 4 tính chất & 6 quan hệ hướng đối tượng
   Code C# tự gõ => nhân vật canvas sinh ra & hành động
   ============================================================ */
const $ = s => document.querySelector(s);
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const lerp = (a,b,t)=>a+(b-a)*t;
const rnd = (a=1,b=0)=>b+Math.random()*(a-b);
const easeOutBack = t=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2);};
const easeInQuad = x=>x*x;
const easeOutQuad = x=>1-(1-x)*(1-x);
const easeInOutQuad = x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
const easeOutCubic = x=>1-Math.pow(1-x,3);
// Dao: giup - chém - thu (t=0..1, dich chi dem ~44% la mo hinh dinh)
const SLASH_HIT=.44;
function slashArm(p){
  // Quat tu TREN XUONG: giuong len dinh dau (a=-2.8 ~ thang doc phia sau),
  // ham xuong den dep tren diem muc (a=0.35 ~ thang doc phia truen)
  if(p<SLASH_HIT*.75) return lerp(.55,-2.8,easeOutQuad(p/(SLASH_HIT*.75)));
  if(p<SLASH_HIT+.16) return lerp(-2.8,0.35,easeInQuad((p-SLASH_HIT*.75)/(SLASH_HIT*.25+.16)));
  return lerp(0.35,.55,easeOutCubic((p-SLASH_HIT-.16)/(1-SLASH_HIT-.16)));
}
function slashTilt(p){
  // Ung voi dam tu tren xuong: dung phia sau khi giuong, dung truoc khi ham
  if(p<.33) return -0.14*easeOutQuad(p/.33);
  if(p<.58) return lerp(-0.14,0.24,easeInOutQuad((p-.33)/.25));
  return 0.24*easeOutCubic((p-.58)/.42)*.35;
}
// Cung: giuong - phong - dao dao (t=0..1, ~44% la thoi diem danh cung)
function bowPose(p){
  const f=.44;
  if(p<f) return {pull:easeInOutQuad(p/f), recoil:0, vib:0};
  if(p<f+.15) return {pull:0, recoil:1-(p-f)/.15, vib:Math.sin((p-f)*55)*(1-(p-f)/.15)};
  return {pull:0, recoil:0, vib:0};
}
const esc = s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

let paused = false;
function sleep(ms){
  return new Promise(res=>{
    let rem = ms;
    (function tick(){
      if(rem<=0) return res();
      if(paused){ setTimeout(tick,120); return; }
      const d=Math.min(rem,50); rem-=d; setTimeout(tick,d);
    })();
  });
}

/* ---------------- Canvas setup ---------------- */
const canvas = $('#game'), ctx = canvas.getContext('2d');
const W=960, H=570, GROUND=460;
function fitCanvas(){
  const dpr = Math.min(2, window.devicePixelRatio||1);
  const w = canvas.parentElement.clientWidth - 24;
  const h = w * H / W;
  canvas.style.width = w+'px';
  canvas.style.height = h+'px';
  canvas.width = W*dpr; canvas.height = H*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize', fitCanvas);

/* ---------------- World state ---------------- */
let entities=[], projectiles=[], particles=[], popups=[], slashes=[], shields=[], links=[];
let shakeMag=0, trans=0, transTarget=0, victoryT=0;
let finished=false, depLinkRef=null;
let time=0, currentStage=0;

const STAGE_COLORS=['#4dd0e1','#ffd166','#ff9f43','#b388ff','#ff5c8a','#2ec4b6','#69db7c','#d8b4fe','#f87171'];

/* ---------------- Background (precomputed) ---------------- */
const stars=[], grass=[], mountains=[];
for(let i=0;i<46;i++) stars.push({x:rnd(W),y:rnd(300,15),r:rnd(1.4,.4),p:rnd(7)});
for(let i=0;i<30;i++) grass.push({x:rnd(W,95),h:rnd(9,4),s:rnd(1.4)});
function ridge(base,amp,n){
  const pts=[]; for(let i=0;i<=n;i++) pts.push([W*i/n, base - Math.abs(Math.sin(i*1.7+base))*amp - Math.sin(i*.6)*amp*.4]);
  return pts;
}
mountains.push({pts:ridge(430,70,7),col:'#111a33'});
mountains.push({pts:ridge(452,40,5),col:'#0d1426'});

/* ---------------- Audio (WebAudio, tu bat khi co tuong tac dau tien) ---------------- */
let actx=null, soundOn=false;
function initAudio(){
  if(!actx) actx=new (window.AudioContext||window.webkitAudioContext)();
  if(actx.state==='suspended') actx.resume();
}
function enableAudioOnce(){
  if(soundOn) return;
  initAudio(); soundOn=true;
  window.removeEventListener('pointerdown',enableAudioOnce);
  window.removeEventListener('keydown',enableAudioOnce);
}
window.addEventListener('pointerdown',enableAudioOnce);
window.addEventListener('keydown',enableAudioOnce);
function tone(freq,dur,type='sine',vol=.14,slide=0){
  if(!soundOn||!actx) return;
  const o=actx.createOscillator(),g=actx.createGain();
  o.type=type; o.frequency.setValueAtTime(freq,actx.currentTime);
  if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),actx.currentTime+dur);
  g.gain.setValueAtTime(vol,actx.currentTime);
  g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+dur);
  o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime+dur);
}
function noise(dur,vol,freq){
  if(!soundOn||!actx) return;
  const n=actx.sampleRate*dur, buf=actx.createBuffer(1,n,actx.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
  const src=actx.createBufferSource(); src.buffer=buf;
  const f=actx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=freq; f.Q.value=1.2;
  const g=actx.createGain(); g.gain.value=vol;
  src.connect(f).connect(g).connect(actx.destination); src.start();
}
const sfx={
  slash(){ noise(.09,.3,1800); tone(200,.1,'triangle',.07,-110); },
  arrow(){ noise(.14,.16,900); tone(700,.12,'sine',.05,-300); },
  hit(){ tone(130,.14,'square',.1,-60); },
  palm(){ noise(.16,.22,650); tone(150,.24,'sawtooth',.13,-80); },
  boom(){ noise(.32,.3,320); tone(55,.45,'sawtooth',.2,-35); },
  thud(){ tone(75,.2,'sine',.26,-35); },
  err(){ tone(110,.32,'sawtooth',.09,-45); },
  pop(){ tone(340,.09,'sine',.09,140); },
  heal(){ tone(520,.14,'sine',.1,120); setTimeout(()=>tone(660,.2,'sine',.1,140),110); },
  boss(){ tone(60,.5,'sawtooth',.16,-20); },
  chime(){ tone(523,.16,'sine',.11); setTimeout(()=>tone(659,.2,'sine',.11),130); setTimeout(()=>tone(784,.4,'sine',.11),260); },
};

/* ---------------- FX helpers ---------------- */
function burst(x,y,col,n=10,sp=120){
  for(let i=0;i<n;i++){
    const a=rnd(Math.PI*2), v=rnd(sp,30);
    particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,life:rnd(.7,.3),t:0,col,sz:rnd(3,1.5),g:220});
  }
}
function ringFx(x,y,col){ particles.push({x,y,vx:0,vy:0,life:.5,t:0,col,sz:6,g:0,ring:true}); }
function popup(x,y,txt,col='#ff8fa3'){ popups.push({x,y,txt,col,t:0}); }
function slashFx(x,y,f,col='#bfe9ff'){ slashes.push({x,y,f,t:0,col}); }
function shieldFx(x,y){ shields.push({x,y,t:0}); }
function confetti(){
  const cols=['#ffd166','#4dd0e1','#b388ff','#ff5c8a','#69db7c','#fff'];
  for(let i=0;i<9;i++) particles.push({
    x:rnd(W),y:-12,vx:rnd(50,-50),vy:rnd(150,60),life:rnd(5,3),t:0,
    col:cols[(Math.random()*cols.length)|0],sz:rnd(7,4),g:60,conf:true,rot:rnd(6.3),vr:rnd(7,-7)
  });
}

/* ---------------- Console ---------------- */
const cEl=$('#console');
function clog(msg,cls=''){
  const d=document.createElement('div');
  d.className='clog '+cls; d.textContent=msg;
  cEl.appendChild(d);
  while(cEl.children.length>5) cEl.removeChild(cEl.children[1]);
}

/* ---------------- Caption ---------------- */
const capText=$('#cap-text'), capDot=$('#cap-dot'), capIco=$('#cap-ico');
function setCaption(icon,text){
  capIco.innerHTML = icon ? `<i class="fa-solid ${icon}"></i>` : '';
  capText.textContent=text;
  capText.classList.remove('bump'); void capText.offsetWidth; capText.classList.add('bump');
}

/* ---------------- Entities ---------------- */
function spawn(o){
  const e=Object.assign({
    age:0,seed:Math.random()*10,state:'idle',face:1,
    hp:100,maxHp:100,hpD:100,showHp:false,ghost:false,
    fly:false,flyH:0,flyTarget:0,
  },o);
  e.x0=e.x; e.maxHp=e.maxHp??e.hp; e.hpD=e.hp;
  entities.push(e);
  return e;
}
function walkTo(e,x,spd=40){
  if(e.state==='die') return;
  e.state='walk'; e.targetX=x; e.vx=(x>=e.x?1:-1)*spd;
}
function materialize(e,col){
  e.ghost=false; e.showHp=true;
  burst(e.x,e.y-40,col||'#bfe9ff',14,150);
  ringFx(e.x,e.y-40,col||'#bfe9ff');
  sfx.pop();
}
function die(e){
  if(e.state==='die') return;
  e.state='die'; e.dieT=0;
  sfx.thud(); shakeMag=Math.max(shakeMag,6);
}
function atk(e,kind,dmg,target,dur=.75,hitAt=.32,power=false){
  if(e.state==='die') return;
  e.state='attack';
  e.atk={kind,dmg,target,t:0,dur,hitAt,done:false,power:!!power};
}
function doHit(e){
  const a=e.atk, T=a.target;
  if(a.kind==='swing'){
    burst(e.x+e.face*22,e.y-42,'#ffd166',8);
    sfx.slash();
    return;
  }
  if(!T||T.dead) return;
  if(a.kind==='slash'){
    const ty=T.y-(T.fly?(T.flyH||0):0);
    slashFx(T.x,ty-38,e.face);
    T.hp=Math.max(0,T.hp-a.dmg); T.flinch=1;
    popup(T.x,ty-84,'-'+a.dmg);
    burst(T.x,ty-40,'#bfe9ff',10);
    sfx.slash(); sfx.hit();
    if(T.hp<=0) die(T);
  }else if(a.kind==='arrow'){
    fireArrow(e,T,a.dmg,false,a.power);
  }else if(a.kind==='punch'){
    if(e.big){ // Boss danh tra: ban CHUONG (song neng luong) thay vi danh thuong
      firePalm(e,T,a.dmg);
    }else{
      const ty=T.y-(T.fly?(T.flyH||0):0);
      T.hurt=1; T.hp=Math.max(0,T.hp-a.dmg);
      popup(T.x,ty-84,'-'+a.dmg);
      burst(T.x - e.face*10,ty-42,'#ff8fa3',9);
      shakeMag=Math.max(shakeMag,5);
      sfx.thud();
      if(T.hp<=0) die(T);
    }
  }
}
function fireArrow(from,T,dmg,loft,power=false){
  const fy=from.y-(from.fly?(from.flyH||0):0)-44;
  const fx0=from.x+from.face*16;
  const ty=T.y-(T.fly?(T.flyH||0):0)-42;
  let vx,vy,g;
  if(loft){ g=420; const tHit=1.0; vx=(T.x-fx0)/tHit; vy=-230; }
  else{ g=90; vx=power?from.face*720:from.face*560; vy=-30; }
  projectiles.push({x:fx0,y:fy,vx,vy,g,dmg,T,trail:[],loft,power});
  if(power){ sfx.boom(); shakeMag=Math.max(shakeMag,6); }   // rung man hinh khi phuong
  else sfx.arrow();
}
// Chuong: song neng luong hinh nam van bay thang tu ban tay boss den muc tieu
function firePalm(from,T,dmg){
  const fy=from.y-(from.fly?(from.flyH||0):0)-44;
  const fx0=from.x+from.face*26;
  const ty=T.y-(T.fly?(T.flyH||0):0)-42;
  const tHit=.5;
  projectiles.push({x:fx0,y:fy,vx:(T.x-fx0)/tHit,vy:(ty-fy)/tHit,g:0,dmg,T,palm:true,trail:[]});
  sfx.palm();
}
function drawPalmProj(p){
  ctx.save(); ctx.translate(p.x,p.y);
  // voang neng luong keo theo
  for(let i=0;i<p.trail.length;i++){
    ctx.fillStyle=`rgba(255,170,60,${((i+1)/p.trail.length*.4).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(p.trail[i][0]-p.x,p.trail[i][1]-p.y,5*(i/p.trail.length)+1,0,7); ctx.fill();
  }
  ctx.rotate(Math.atan2(p.vy,p.vx));
  ctx.shadowColor='#ff9f43'; ctx.shadowBlur=16;
  const g=ctx.createLinearGradient(-16,0,15,0);
  g.addColorStop(0,'rgba(255,140,50,0)'); g.addColorStop(.55,'#ffb45e'); g.addColorStop(1,'#fff3d6');
  ctx.fillStyle=g;
  ctx.beginPath();
  ctx.moveTo(-14,-13);
  ctx.quadraticCurveTo(10,-8,16,0);
  ctx.quadraticCurveTo(10,8,-14,13);
  ctx.quadraticCurveTo(-2,0,-14,-13);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(255,240,210,.9)'; ctx.lineWidth=2; ctx.stroke();
  ctx.restore();
}

/* ---------------- Update ---------------- */
function updateEntity(e,dt){
  e.age+=dt;
  e.hpD=lerp(e.hpD,e.hp,Math.min(1,dt*8));
  e.hurt=Math.max(0,(e.hurt||0)-dt*2.2);
  e.flinch=Math.max(0,(e.flinch||0)-dt*3);
  e.pulse=Math.max(0,(e.pulse||0)-dt*1.6);
  if(e.fly) e.flyH=lerp(e.flyH,e.flyTarget,Math.min(1,dt*2.6));
  if(e.zreach){ e.zreachT+=dt; if(e.zreachT>1.1) e.zreach=0; }
  if(e.stampT!==undefined){ e.stampT+=dt; if(e.stampT>.6) delete e.stampT; }
  if(e.dying){ e.fadeOut+=dt; if(e.fadeOut>1) e.dead=true; }
  if(e.fall){
    e.x+=(e.vx||0)*dt;
    e.y+=260*dt;
    if(e.spin){ e.spinA=(e.spinA||0)+e.spin*dt; }   // lan long loc khi roi
    if(e.y>=GROUND){ e.y=GROUND; e.fall=false; e.spin=0; e.spinA=0; e.vx=0; burst(e.x,e.y-8,'#f5813c',5,60); sfx.thud(); }
  }
  if(e.fixed){ e.x=e.fixed.e.x+e.fixed.ox; e.y=e.fixed.e.y+e.fixed.oy; }  // kem theo chinh chu
  if(e.driftY){ e.y=Math.min(GROUND-4,e.y+e.driftY*dt); }                 // rat xuong khi tan bien
  if(e.state==='walk'){
    e.x+=e.vx*dt;
    if((e.vx>0&&e.x>=e.targetX)||(e.vx<0&&e.x<=e.targetX)){
      e.x=e.targetX; e.state='idle';
      if(e.returnHome){ e.returnHome=false; walkTo(e,e.x0); }
    }
  }
  if(e.atk){
    e.atk.t+=dt;
    if(!e.atk.done&&e.atk.t>=e.atk.hitAt){ e.atk.done=true; doHit(e); }
    if(e.atk.t>=e.atk.dur){
      e.atk=null; if(e.state==='attack') e.state='idle';
      if(e.swTrail){ e.swTrail.shift(); if(!e.swTrail.length) e.swTrail=null; }
    }
  }
  if(e.state==='die'){
    e.dieT+=dt;
    if(e.dieT>.55&&!e.crumbled){ e.crumbled=true; burst(e.x,e.y-30,'#9fb0cc',16,140); }
    if(e.dieT>1.5) e.dead=true;
  }
  if(e.to){ // part snapping to owner (theo doi tuong duoc chi den boi e.to.e)
    const off=e.to, o=off.e||off, tx=o.x+off.ox, ty=o.y+off.oy;
    if(!o||!isFinite(tx)){ e.to=null; }
    else{
      e.x=lerp(e.x,tx,Math.min(1,dt*9));
      e.y=lerp(e.y,ty,Math.min(1,dt*9));
      if(Math.abs(e.x-tx)<2.5&&Math.abs(e.y-ty)<2.5){
        if(!e.keep){ e.dead=true; burst(e.x,e.y-40,'#ffd166',10); sfx.pop(); }
        if(e.onArrive) e.onArrive();
        e.to=null;
      }
    }
  }
}
function update(dt){
  time+=dt;
  shakeMag=Math.max(0,shakeMag-dt*22);
  trans=lerp(trans,transTarget,Math.min(1,dt*8));
  if(victoryT>0){
    victoryT+=dt;
    if(victoryT<1.3) confetti();
  }
  for(const e of entities) updateEntity(e,dt);
  entities=entities.filter(e=>!e.dead);
  for(const p of projectiles){
    p.vy+=p.g*dt; p.x+=p.vx*dt; p.y+=p.vy*dt;
    p.trail.push([p.x,p.y]); if(p.trail.length>9) p.trail.shift();
    const T=p.T;
    if(T&&!T.dead){
      const ty=T.y-(T.fly?(T.flyH||0):0)-42;
      const crossed = p.vx>0 ? p.x>=T.x-4 : p.x<=T.x+4;
      if(crossed && p.y>ty-75 && p.y<ty+40){
        p.dead=true;
        T.hp=Math.max(0,T.hp-p.dmg); T.flinch=1;
        popup(T.x,ty-84,'-'+p.dmg);
        if(p.palm){
          burst(T.x,ty-42,'#ff9f43',16,160); ringFx(T.x,ty-42,'#ff9f43');
          shakeMag=Math.max(shakeMag,8); sfx.palm();
        }else if(p.power){
          burst(T.x,ty-42,'#ffd166',24,230); burst(T.x,ty-42,'#ff9f43',14,120);
          ringFx(T.x,ty-42,'#ffd166');
          shakeMag=Math.max(shakeMag,12); sfx.boom();
        }else{
          burst(T.x,ty-40,'#ffd166',12);
          sfx.hit();
        }
        if(T.hp<=0) die(T);
      }
    }
    if(p.x<-30||p.x>W+30||p.y>H+30) p.dead=true;
  }
  projectiles=projectiles.filter(p=>!p.dead);
  for(const p of particles){
    p.t+=dt;
    if(!p.ring){ p.vy+=(p.g||0)*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; if(p.conf)p.rot+=p.vr*dt; }
  }
  particles=particles.filter(p=>p.t<p.life);
  for(const q of popups){ q.t+=dt; q.y-=26*dt; }
  popups=popups.filter(q=>q.t<1.25);
  for(const s of slashes) s.t+=dt;
  slashes=slashes.filter(s=>s.t<.35);
  for(const s of shields) s.t+=dt;
  shields=shields.filter(s=>s.t<.8);
  for(const l of links){ l.t+=dt; l.glow=Math.max(0,(l.glow||0)-dt*.8); }
  links=links.filter(l=>!l.ttl || l.t<l.ttl);
}

/* ---------------- Draw: primitives ---------------- */
function line(x1,y1,x2,y2){ ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
function circle(x,y,r,fill){ ctx.beginPath(); ctx.arc(x,y,r,0,7); if(fill)ctx.fill(); else ctx.stroke(); }
function rr(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}
// Font stack co du tieng Viet de tranh loi font
const FONT_SANS="'Segoe UI','Helvetica Neue',Arial,sans-serif";
const FONT_MONO="'Consolas','Cascadia Code','Courier New',monospace";

/* ---------------- Draw: scene ---------------- */
function drawScene(){
  const sky=ctx.createLinearGradient(0,0,0,GROUND);
  sky.addColorStop(0,'#080d1f'); sky.addColorStop(.65,'#101832'); sky.addColorStop(1,'#1c1a3e');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,GROUND);
  for(const s of stars){
    ctx.globalAlpha=.35+.5*Math.abs(Math.sin(time*1.4+s.p));
    ctx.fillStyle='#cdd7ea'; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,7); ctx.fill();
  }
  ctx.globalAlpha=1;
  ctx.save();
  const mg=ctx.createRadialGradient(830,74,8,830,74,70);
  mg.addColorStop(0,'rgba(210,225,255,.5)'); mg.addColorStop(1,'rgba(210,225,255,0)');
  ctx.fillStyle=mg; ctx.beginPath(); ctx.arc(830,74,70,0,7); ctx.fill();
  ctx.fillStyle='#dfe8ff'; ctx.beginPath(); ctx.arc(830,74,24,0,7); ctx.fill();
  ctx.fillStyle='rgba(140,160,210,.35)';
  ctx.beginPath(); ctx.arc(822,68,5,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(838,82,4,0,7); ctx.fill();
  ctx.restore();
  for(const m of mountains){
    ctx.fillStyle=m.col; ctx.beginPath(); ctx.moveTo(0,H);
    for(const p of m.pts) ctx.lineTo(p[0],p[1]);
    ctx.lineTo(W,H); ctx.closePath(); ctx.fill();
  }
  const gg=ctx.createLinearGradient(0,GROUND,0,H);
  gg.addColorStop(0,'#101a30'); gg.addColorStop(1,'#0a0f1e');
  ctx.fillStyle=gg; ctx.fillRect(0,GROUND,W,H-GROUND);
  ctx.strokeStyle='rgba(120,150,255,.25)'; ctx.lineWidth=2; line(0,GROUND,W,GROUND);
  ctx.strokeStyle='rgba(90,120,200,.28)'; ctx.lineWidth=1.5;
  for(const g of grass){
    ctx.beginPath(); ctx.moveTo(g.x,GROUND);
    ctx.quadraticCurveTo(g.x+2,GROUND-g.h,g.x+g.s,GROUND-g.h-2);
    ctx.stroke();
  }
  drawCastle();
}
function drawCastle(){
  const x=0,w=74,top=326;
  ctx.fillStyle='#141d38'; ctx.fillRect(x,top,w,GROUND-top);
  ctx.fillStyle='#1b2646';
  for(let i=0;i<5;i++) ctx.fillRect(x+i*16,top-14,10,14);
  ctx.strokeStyle='rgba(120,150,255,.18)'; ctx.lineWidth=1;
  for(let y=top+16;y<GROUND;y+=18) line(x,y,x+w,y);
  ctx.fillStyle='#0a0f1e';
  ctx.beginPath(); ctx.arc(x+w/2-2,GROUND-24,13,Math.PI,0); ctx.fill();
  ctx.fillRect(x+w/2-15,GROUND-24,26,24);
  ctx.strokeStyle='#39466e'; ctx.lineWidth=3; line(x+w/2-2,top-14,x+w/2-2,top-52);
  ctx.fillStyle='#4dd0e1';
  ctx.beginPath(); ctx.moveTo(x+w/2-2,top-52);
  ctx.quadraticCurveTo(x+w/2+16,top-48+Math.sin(time*5)*3,x+w/2-2,top-38);
  ctx.closePath(); ctx.fill();
}

/* ---------------- Draw: characters ---------------- */
function armFrom(sx,sy,f,ang,len){
  const hx=sx+f*Math.sin(ang)*len, hy=sy+Math.cos(ang)*len;
  line(sx,sy,hx,hy);
  return [hx,hy];
}
function drawClubAt(x,y,f){
  ctx.save();
  ctx.strokeStyle='#a9744f'; ctx.lineWidth=4;
  line(x,y,x+f*15,y-3);
  ctx.translate(x+f*15,y-3); ctx.rotate(-.15);
  ctx.fillStyle='#6b4a2f';
  rr(-4,-6,14,12,3); ctx.fill();
  ctx.restore();
}
function drawChar(e){
  const f=e.face;
  const flyH=e.fly?(e.flyH||0):0;
  let baseCol;
  if(e.kind==='boss') baseCol='#7d9c3f';
  else if(e.kind==='zombie') baseCol='#94c94e';
  else if(e.kind==='warrior') baseCol='#4dd0e1';
  else if(e.kind==='archer') baseCol='#b388ff';
  else baseCol='#7f8ca6';
  const col = e.hurt>0 ? mix(baseCol,'#ff5470',e.hurt) : baseCol;

  ctx.save();
  ctx.globalAlpha=.28*(1-Math.min(1,flyH/170));
  ctx.fillStyle='#000';
  ctx.beginPath(); ctx.ellipse(e.x,e.y+5,15,4.5,0,0,7); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(e.x,e.y-flyH);
  if(e.big) ctx.scale(1.3,1.3);
  let alpha = e.age<.4 ? e.age/.4 : 1;
  if(e.dying) alpha*=Math.max(0,1-e.fadeOut);
  if(e.ghost) alpha*=.55;
  ctx.globalAlpha=alpha;
  if(e.ghost) ctx.setLineDash([5,5]);
  if(e.stampT!==undefined){
    const s=easeOutBack(Math.min(1,e.stampT/.55));
    ctx.scale(s, s-(1-s)*.25);
  }
  if(e.state==='die'){
    const p=Math.min(1,(e.dieT||0)/.55);
    ctx.rotate(-f*p*1.35);
  }
  if(e.buff>0){
    ctx.globalAlpha=alpha*(.35+.3*Math.sin(time*8));
    ctx.strokeStyle='#ffd166'; ctx.lineWidth=3;
    circle(0,-38,32);
    ctx.globalAlpha=alpha;
  }
  const t=e.age;
  const bob=(e.state==='walk'||e.state==='attack')?0:Math.sin(t*3+e.seed)*1.6;
  const hunch=(e.kind==='zombie'||e.kind==='boss')?3:0;
  const sway=(e.kind==='zombie'||e.kind==='boss')?Math.sin(t*2.4+e.seed)*2.5:0;
  const hipY=-26+bob, neckY=-47+bob+hunch*.6, shY=neckY+4;
  ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.strokeStyle=col; ctx.fillStyle=col; ctx.lineWidth=3.4;

  if(e.fly){
    line(0,hipY,f*7,hipY+10); line(f*7,hipY+10,f*3,hipY+18);
    line(0,hipY,-f*3,hipY+12); line(-f*3,hipY+12,f*2,hipY+20);
  }else{
    let sw=0,sw2=0;
    if(e.state==='walk'){ sw=Math.sin(t*9+e.seed)*7; sw2=-sw; }
    else if(e.kind==='zombie'||e.kind==='boss'){ sw=Math.sin(t*5+e.seed)*5; sw2=Math.sin(t*5+e.seed+Math.PI)*4; }
    line(0,hipY,sw,0); line(0,hipY,sw2,0);
  }
  // Le vung thể khi tấn công để động tác được tự nhiên
  let tilt=0;
  if(e.kind==='warrior'&&e.atk&&e.atk.kind==='slash') tilt=slashTilt(clamp(e.atk.t/e.atk.dur,0,1));
  if(e.kind==='archer'&&e.atk&&e.atk.kind==='arrow') tilt=-0.1*bowPose(clamp(e.atk.t/e.atk.dur,0,1)).pull;
  if(tilt){ ctx.save(); ctx.translate(0,hipY); ctx.rotate(f*tilt); ctx.translate(0,-hipY); }

  line(0,hipY,f*hunch,neckY);
  const hx0=f*hunch+sway*.4, hy0=neckY-10;
  circle(hx0,hy0,8.5,true);
  if(e.kind==='zombie'||e.kind==='boss'){
    ctx.strokeStyle=e.kind==='boss'?'#ff5470':'#0a0f1e'; ctx.lineWidth=1.8;
    line(hx0+f*2,hy0-1.5,hx0+f*5,hy0+1.5); line(hx0+f*5,hy0-1.5,hx0+f*2,hy0+1.5);
    if(e.kind==='boss'){ // roi gai
      ctx.strokeStyle=col; ctx.lineWidth=2;
      line(hx0-5,hy0-8,hx0-8,hy0-13); line(hx0,hy0-9,hx0,hy0-15); line(hx0+5,hy0-8,hx0+8,hy0-13);
    }
    if(e.hasCone) drawConeOnHead(hx0,hy0-8,f);   // no giao thong doi tren dau
    ctx.strokeStyle=col; ctx.lineWidth=3.4;
  }else{
    ctx.fillStyle='#0a0f1e'; circle(hx0+f*3.5,hy0-1,1.5,true);
  }

  const reach=e.zreach?Math.sin(Math.min(1,e.zreachT/.7)*Math.PI):0;
  if(e.kind==='zombie'||e.kind==='boss'){
    if(e.atk&&(e.atk.kind==='punch'||e.atk.kind==='swing')){
      const p=clamp(e.atk.t/e.atk.dur,0,1);
      let a;
      if(p<.42) a=lerp(.9,.5,easeOutQuad(p/.42));            // thu lai
      else if(p<.6) a=lerp(.5,1.4,easeInQuad((p-.42)/.18));  // dam ra
      else a=lerp(1.4,.9,easeOutCubic((p-.6)/.4));           // thu ve
      const h=armFrom(f*hunch,shY,f,a,16);
      armFrom(f*hunch,shY,f,.9+Math.sin(t*3)*.08,15);
      circle(h[0],h[1],4,true);
      if(e.hasClub) drawClubAt(h[0],h[1],f);
    }else{
      const h1=armFrom(f*hunch,shY,f,1.15+Math.sin(t*3)*.08+reach*.5,15+reach*5);
      armFrom(f*hunch,shY,f,.95+Math.cos(t*3)*.08+reach*.5,15+reach*5);
      if(e.hasClub) drawClubAt(h1[0],h1[1],f);
    }
  }else if(e.kind==='warrior'){
    let a1=-.5,a2=.55;
    if(e.atk&&e.atk.kind==='slash'){
      const p=clamp(e.atk.t/e.atk.dur,0,1);
      a2=slashArm(p);
      a1=lerp(-.5,-1.0,clamp(p*2.2,0,1));
    }
    armFrom(f*hunch,shY,f,a1,15);
    const h=armFrom(f*hunch,shY,f,a2,15);
    // Kiem: co cay + ngan + lam, goc co dinh theo tay (ngom nhu nam that)
    const dx=Math.sin(a2)*f, dy=Math.cos(a2);
    let bx=dx+.38*f, by=dy-.18;
    const L2=Math.hypot(bx,by)||1; bx/=L2; by/=L2;
    const px=-by, py=bx;
    ctx.strokeStyle='#6b4a2f'; ctx.lineWidth=3;
    line(h[0]-bx*4,h[1]-by*4,h[0]+bx*3,h[1]+by*3);
    ctx.strokeStyle='#c9a24a'; ctx.lineWidth=2.5;
    line(h[0]+bx*3-px*4.5,h[1]+by*3-py*4.5,h[0]+bx*3+px*4.5,h[1]+by*3+py*4.5);
    ctx.strokeStyle=e.buff>0?'#ffe9b0':'#d7e3f5'; ctx.lineWidth=3;
    line(h[0]+bx*3,h[1]+by*3,h[0]+bx*21,h[1]+by*21);
    ctx.strokeStyle='#f2f7ff'; ctx.lineWidth=1.6;
    line(h[0]+bx*17,h[1]+by*17,h[0]+bx*21,h[1]+by*21);
    // Vet dao khi dam (theo dau mat kim)
    const pS=e.atk&&e.atk.kind==='slash'?clamp(e.atk.t/e.atk.dur,0,1):0;
    if(pS>.3&&pS<.62){
      if(!e.swTrail) e.swTrail=[];
      e.swTrail.push([e.x+h[0]+bx*21, e.y-flyH+h[1]+by*21]);
      if(e.swTrail.length>8) e.swTrail.shift();
    }
  }else if(e.kind==='archer'){
    if(e.atk&&e.atk.kind==='arrow'){
      const p=clamp(e.atk.t/e.atk.dur,0,1);
      const bp=bowPose(p);
      const bx=f*13, by=shY+4;
      line(f*hunch,shY,bx,by);   // tay sau: ban tay dat duong ngay can cung
      ctx.save();
      ctx.translate(bx,by);
      if(bp.recoil>0) ctx.rotate(f*bp.recoil*.5);   // cung phan loi khi phong
      ctx.lineWidth=3.2; ctx.strokeStyle='#c58b52';              // cung GO - khaac rỏ voi mau dau
      ctx.beginPath();
      if(f===1) ctx.arc(0,0,12.5,-1.25,1.25); else ctx.arc(0,0,12.5,Math.PI-1.25,Math.PI+1.25);
      ctx.stroke();
      ctx.strokeStyle='rgba(240,244,255,.8)'; ctx.lineWidth=1.2;
      if(bp.pull>0.02){
        const nox=-f*7.5*bp.pull, noy=0;
        line(f*3.9,-11.9,nox,noy); line(f*3.9,11.9,nox,noy);
        if(e.hasArrow!==false){
          ctx.strokeStyle='#ffd166'; ctx.lineWidth=2;
          line(nox,noy,f*17,noy);
          ctx.beginPath(); ctx.moveTo(f*17,noy); ctx.lineTo(f*11,noy-3.4); ctx.moveTo(f*17,noy); ctx.lineTo(f*11,noy+3.4); ctx.stroke();
          ctx.strokeStyle='#b388ff'; ctx.lineWidth=1.4;
          line(nox,noy,nox-f*4,noy-3); line(nox,noy,nox-f*4,noy+3);
        }
      }else{
        const wob=(bp.vib||0)*2.5;   // day cung dao dao sau khi phong
        ctx.beginPath(); ctx.moveTo(f*4.5,-10);
        ctx.quadraticCurveTo(-f*1.5+wob*f,0,f*4.5,10);
        ctx.stroke();
      }
      ctx.restore();
      // tay truoc: ban tay dat ngay diem nock (noi day bi keo ve)
      if(bp.pull>0.02) line(f*hunch,shY, bx-f*(7.5*bp.pull+1), by+1);
      else line(f*hunch,shY, bx-f*2, by+2);
    }else if(e.hasBow){
      // Tam cung lúc ranh: cung GO dung, tay nam duong can cung, do xa dau de k tra loi la toc
      const bx=f*12, by=shY+13;
      line(f*hunch,shY,bx,by);          // tay nam cung
      armFrom(f*hunch,shY,f,.85,13);    // tay kia tu nhien
      ctx.save(); ctx.translate(bx,by); ctx.rotate(f*.35);
      ctx.lineWidth=3.2; ctx.strokeStyle='#c58b52';
      ctx.beginPath();
      if(f===1) ctx.arc(0,0,13,-1.3,1.3); else ctx.arc(0,0,13,Math.PI-1.3,Math.PI+1.3);
      ctx.stroke();
      ctx.strokeStyle='rgba(240,244,255,.7)'; ctx.lineWidth=1.1;
      line(f*4.1,-12.2,f*4.1,12.2);
      ctx.restore();
      if(e.hasArrow){
        // BALO ĐỰNG TÊN sau lung (thay cho ten dep sau gay - k tra loi la toc)
        const qx=-f*11, qy=shY+9;
        // dai ngang nguc
        ctx.strokeStyle='rgba(74,50,26,.9)'; ctx.lineWidth=2.6;
        line(qx+f*2,qy-5,f*6,hipY+1);
        // 3 canh ten noi len tren bao
        for(let i=-1;i<=1;i++){
          const ax=qx+f*i*2.2, ay=qy-6;
          ctx.strokeStyle='#c58b52'; ctx.lineWidth=2;
          line(ax,ay,ax-f*i*3.2,ay-13);
          ctx.strokeStyle='#ffd166'; ctx.lineWidth=1.6;
          line(ax-f*i*3.2,ay-13,ax-f*i*3.2-2.6,ay-16.4);
          line(ax-f*i*3.2,ay-13,ax-f*i*3.2+2.6,ay-16.4);
        }
        // bao da
        ctx.save(); ctx.translate(qx,qy); ctx.rotate(-f*.4);
        ctx.fillStyle='#8a5a2b'; rr(-5,-7,10,15,3.5); ctx.fill();
        ctx.strokeStyle='#5f3d1d'; ctx.lineWidth=1.4; rr(-5,-7,10,15,3.5); ctx.stroke();
        ctx.strokeStyle='rgba(255,235,200,.35)'; ctx.lineWidth=1;
        line(-5,0,5,0);
        ctx.restore();
      }
    }else{
      armFrom(f*hunch,shY,f,-.5,15); armFrom(f*hunch,shY,f,.5,15);
    }
  }else{
    armFrom(f*hunch,shY,f,-.5,15); armFrom(f*hunch,shY,f,.5,15);
  }
  // Canh chim (chung cho moi loai bay): 5 lon vu xoa ra tu vai nhuoc, 2 lop, chap nhuong theo nhac
  if(e.fly){
    const flap=Math.sin(t*9)*.45;
    const layers=[{sc:.78,al:.5,ox:-7,ph:.35},{sc:1,al:.97,ox:0,ph:0}];
    for(const L of layers){
      ctx.save();
      ctx.globalAlpha=alpha*L.al;
      ctx.translate(f*hunch+f*L.ox*L.sc, shY+2);   // bam dung nhip nhip nho cua nguoi (shY da chua bob)
      ctx.scale(f*L.sc,L.sc);
      ctx.rotate(.55+flap*(1-L.ph*.45));      // hoi canh len ben sau + chap
      for(let i=0;i<5;i++){                    // lon dai nhat o day, ngan dan len tren
        const fan=-i*.24, Lf=44-i*6;           // lon hon nua lan nua
        ctx.save();
        ctx.rotate(fan);
        ctx.beginPath();
        ctx.moveTo(0,1.5);
        ctx.quadraticCurveTo(-Lf*.45,-Lf*.26,-Lf,-Lf*.05);
        ctx.quadraticCurveTo(-Lf*.45,Lf*.22,0,Lf*.04);
        ctx.closePath();
        ctx.fillStyle=i%2===0?'#b79bf7':'#8f6ce8';
        ctx.globalAlpha=alpha*L.al*(.97-.08*i);
        ctx.fill();
        ctx.strokeStyle='rgba(28,18,66,.4)'; ctx.lineWidth=.9; ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  }
  if(tilt) ctx.restore();
  if(e.pulse>0){
    ctx.globalAlpha=alpha*e.pulse*.8;
    ctx.strokeStyle='#ffd166'; ctx.lineWidth=2;
    circle(0,-40,40*(1.3-e.pulse*.3));
  }
  ctx.restore();

  if(e.locked) drawLock(e);
  if(e.showHp&&(e.kind==='template'||!e.ghost)) drawHpBar(e);
  if(e.label) drawLabel(e);
}
function mix(c1,c2,t){
  const p=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  const a=p(c1),b=p(c2);
  return `rgb(${a.map((v,i)=>Math.round(lerp(v,b[i],t))).join(',')})`;
}
function drawHpBar(e){
  // Geometry: thanh o -80..-74.5, so HP ben phai (+26), khoa ben trai (-28) - khong che nhau
  const w=40,h=5.5;
  const x=e.x-w/2, y=e.y-(e.fly?(e.flyH||0):0)-(e.big?102:88);
  ctx.fillStyle='rgba(0,0,0,.55)'; rr(x-1,y-1,w+2,h+2,3); ctx.fill();
  const r=clamp(e.hpD/e.maxHp,0,1);
  ctx.fillStyle=r>.5?'#43e97b':r>.25?'#ffd166':'#ff5470';
  if(r>0){ rr(x,y,w*r,h,2.5); ctx.fill(); }
  ctx.fillStyle='rgba(255,255,255,.85)';
  ctx.font=`700 11px ${FONT_MONO}`;
  ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillText(String(Math.round(e.hpD)),x+w+7,y+h/2);
}
function drawLock(e){
  const x=e.x-28, y=e.y-(e.fly?(e.flyH||0):0)-(e.big?101:85);
  ctx.strokeStyle='#ffd166'; ctx.lineWidth=1.6;
  ctx.strokeRect(x-5,y-2,10,8);
  ctx.beginPath(); ctx.arc(x,y-2,3.4,Math.PI,0); ctx.stroke();
  ctx.fillStyle='#ffd166'; ctx.fillRect(x-1,y+0,2,3);
}
function drawLabel(e){
  const y=e.y-(e.fly?(e.flyH||0):0)-104;
  ctx.font=`700 12px ${FONT_MONO}`;
  const w=ctx.measureText(e.label).width+16;
  ctx.fillStyle='rgba(5,8,16,.78)'; rr(e.x-w/2,y-9,w,18,9); ctx.fill();
  ctx.strokeStyle=e.labelCol||'#ffd166'; ctx.lineWidth=1.2; rr(e.x-w/2,y-9,w,18,9); ctx.stroke();
  ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(e.label,e.x,y);
}

/* ---------------- Draw: specials ---------------- */
function drawTemplateLabel(e){
  ctx.font=`700 13px ${FONT_SANS}`;
  const txt=e.label2||'Unit';
  const w=ctx.measureText(txt).width+18;
  const x=e.x, y=e.y-(e.fly?(e.flyH||0):0)+16;
  ctx.fillStyle='rgba(10,14,26,.8)'; rr(x-w/2,y-10,w,20,6); ctx.fill();
  ctx.strokeStyle='#7f8ca6'; ctx.lineWidth=1; rr(x-w/2,y-10,w,20,6); ctx.stroke();
  ctx.fillStyle='#cdd7ea'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(txt,x,y);
}
function drawMold(e){
  const a=e.dying?Math.max(0,1-e.fadeOut):Math.min(1,e.age/.4);
  ctx.save(); ctx.globalAlpha=a;
  const x=e.x-88, y=e.y-128, w=176, h=112;
  ctx.setLineDash([7,5]); ctx.lineDashOffset=-time*20;
  ctx.strokeStyle='#b388ff'; ctx.lineWidth=2;
  rr(x,y,w,h,12); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle='rgba(120,80,220,.08)'; rr(x,y,w,h,12); ctx.fill();
  ctx.font=`700 13px ${FONT_MONO}`; ctx.fillStyle='#d9c8ff'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('abstract class Unit',e.x,y+16);
  const slots=[['Attack()',e.slot===1],['Die()',e.slot===2]];
  slots.forEach((s,i)=>{
    const sx=e.x-66+i*70, sy=y+42;
    ctx.strokeStyle=s[1]?'#ffd166':'#8b7bb8'; ctx.lineWidth=s[1]?2:1.2;
    rr(sx,sy,62,24,6); ctx.stroke();
    ctx.fillStyle=s[1]?'#ffe9b3':'#a99bd4'; ctx.font=`600 12px ${FONT_MONO}`;
    ctx.fillText(s[0],sx+31,sy+12);
  });
  ctx.restore();
}
function drawContract(e){
  const yy=e.y+(e.airY||-150)+Math.sin(e.age*2)*6;
  ctx.save();
  const x=e.x-64, y=yy-26, w=128, h=52;
  ctx.globalAlpha=Math.min(1,e.age/.4);
  ctx.setLineDash([5,4]); ctx.lineDashOffset=-time*14;
  ctx.strokeStyle=e.realized?'#69db7c':'#8b98b3'; ctx.lineWidth=e.realized?2:1.5;
  if(e.realized){ ctx.shadowColor='#69db7c'; ctx.shadowBlur=10; }
  rr(x,y,w,h,10); ctx.stroke();
  ctx.setLineDash([]); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(20,26,48,.85)'; rr(x,y,w,h,10); ctx.fill();
  ctx.font=`700 13px ${FONT_MONO}`; ctx.fillStyle=e.realized?'#9be8ac':'#cdd7ea';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(e.name,e.x,yy-10);
  ctx.font=`600 11px ${FONT_MONO}`; ctx.fillStyle='#8b98b3';
  ctx.fillText(e.method,e.x,yy+8);
  if(e.realized){
    ctx.strokeStyle='#69db7c'; ctx.lineWidth=2.4;
    const cx=x+w-16, cy=yy-12;
    ctx.beginPath(); ctx.moveTo(cx-5,cy); ctx.lineTo(cx-1.5,cy+3.5); ctx.lineTo(cx+6,cy-4.5); ctx.stroke();
  }
  ctx.restore();
}
function drawStar(cx,cy,R,r,col){
  ctx.save();
  ctx.fillStyle=col;
  ctx.beginPath();
  for(let i=0;i<10;i++){
    const rad=i%2===0?R:r;
    const a=-Math.PI/2+i*Math.PI/5;
    const px=cx+Math.cos(a)*rad, py=cy+Math.sin(a)*rad;
    if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(120,80,0,.4)'; ctx.lineWidth=1; ctx.stroke();
  ctx.restore();
}
function drawFlag(e){
  const x=e.x, gy=e.y;
  const top=gy-134, h=44;   // cot DAI (134), vai co CAO (44px)
  ctx.strokeStyle='#8b98b3'; ctx.lineWidth=4; line(x,gy,x,top);
  // Vai co DO vang - chi co sao vang o giua (khong co chu tren vai)
  ctx.fillStyle='#d81e2c';
  ctx.beginPath(); ctx.moveTo(x,top);
  for(let i=0;i<=30;i+=2){ ctx.lineTo(x+i*2.5, top+Math.sin(time*6+i*.35)*3+i*.08); }
  for(let i=30;i>=0;i-=2){ ctx.lineTo(x+i*2.5, top+h+Math.sin(time*6+i*.35+.6)*3+i*.08); }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.3)'; ctx.lineWidth=1; ctx.stroke();
  // Sao vang 5 can o giua vai co
  drawStar(x+37, top+h/2+Math.sin(time*6+2)*1.5, 15, 6.3, '#ffd700');
  // Chu TEAM mau do tren cot, hien thi voi hieu ung pop-in + glow
  const pop=e.age<.5?easeOutBack(clamp(e.age/.5,0,1)):1;
  ctx.save();
  ctx.translate(x,top-16);
  ctx.scale(pop,pop);
  ctx.font=`800 15px ${FONT_SANS}`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.lineWidth=4; ctx.strokeStyle='rgba(0,0,0,.65)';
  ctx.strokeText('TEAM',0,0);
  ctx.fillStyle='#ff4d5e';
  ctx.shadowColor='#ff4d5e'; ctx.shadowBlur=8+4*Math.sin(time*4);
  ctx.fillText('TEAM',0,0);
  ctx.restore();
  ctx.fillStyle='#ffd166'; circle(x,top-3,4.5,true);
}
function drawConeOnHead(hx,hy,f){
  ctx.save(); ctx.translate(hx,hy); ctx.rotate(f*.15);
  ctx.fillStyle='#f5813c';
  ctx.beginPath(); ctx.moveTo(-9,2); ctx.lineTo(-2.5,-20); ctx.lineTo(2.5,-20); ctx.lineTo(9,2); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.moveTo(-7,-4); ctx.lineTo(-5,-10); ctx.lineTo(5,-10); ctx.lineTo(7,-4); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function partAlpha(e){ return e.dying?Math.max(0,1-e.fadeOut):1; }
function drawBowPart(e){
  const y=e.y-46+Math.sin(e.age*2.2)*5;
  ctx.save(); ctx.globalAlpha=partAlpha(e);
  if(e.ghost){ ctx.globalAlpha*=.55; ctx.setLineDash([5,5]); }
  ctx.save(); ctx.translate(e.x,y); ctx.rotate(Math.sin(e.age*1.5)*.08);
  ctx.strokeStyle='#c58b52'; ctx.lineWidth=3.4;
  ctx.beginPath(); ctx.arc(0,0,17,-1.25,1.25); ctx.stroke();
  ctx.strokeStyle='rgba(230,238,255,.7)'; ctx.lineWidth=1.2;
  line(6.9,-15,6.9,15);
  ctx.restore();
  ctx.font=`700 12.5px ${FONT_SANS}`; ctx.textAlign='center';
  if(!e.ghost&&!e.noLabel){
    ctx.fillStyle='#e8c9a0'; ctx.fillText('Bow',e.x,y+32);
  }
  if(e.pulse>0){ ctx.strokeStyle=`rgba(255,209,102,${e.pulse})`; ctx.lineWidth=2; circle(e.x,y,26*(1.4-e.pulse*.4)); }
  ctx.setLineDash([]);
  ctx.restore();
}
function drawConePart(e){
  const y=e.y-4+(e.fall?0:Math.sin(e.age*2.2)*3);
  ctx.save(); ctx.globalAlpha=partAlpha(e);
  if(e.ghost){ ctx.globalAlpha*=.55; }
  ctx.save(); ctx.translate(e.x,y);
  if(e.spinA){ ctx.translate(0,-11); ctx.rotate(e.spinA); ctx.translate(0,11); }
  ctx.fillStyle='#e8722a'; rr(-14,-4,28,5,2); ctx.fill();
  ctx.fillStyle='#f5813c';
  ctx.beginPath(); ctx.moveTo(-11,-4); ctx.lineTo(-3,-26); ctx.lineTo(3,-26); ctx.lineTo(11,-4); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.moveTo(-8.5,-10); ctx.lineTo(-6.5,-16); ctx.lineTo(6.5,-16); ctx.lineTo(8.5,-10); ctx.closePath(); ctx.fill();
  if(e.ghost){ ctx.setLineDash([4,4]); ctx.strokeStyle='#f5813c'; ctx.lineWidth=1.5;
    ctx.strokeRect(-14,-4,28,5);
  }
  ctx.restore();
  if(!e.ghost&&!e.noLabel){
    ctx.font=`700 12.5px ${FONT_SANS}`; ctx.textAlign='center';
    ctx.fillStyle='#f5a06a'; ctx.fillText('Cone',e.x,y-32);
  }
  if(e.pulse>0){ ctx.strokeStyle=`rgba(255,209,102,${e.pulse})`; ctx.lineWidth=2; circle(e.x,y-14,24*(1.4-e.pulse*.4)); }
  ctx.setLineDash([]);
  ctx.restore();
}
function drawArrowPart(e){
  const y=e.y-58+Math.sin(e.age*2.2+1)*5;
  ctx.save(); ctx.globalAlpha=partAlpha(e);
  if(e.ghost){ ctx.globalAlpha*=.55; ctx.setLineDash([5,5]); }
  ctx.save(); ctx.translate(e.x,y);
  ctx.strokeStyle='#ffd166'; ctx.lineWidth=2.4;
  line(-20,0,16,0);
  ctx.beginPath(); ctx.moveTo(16,0); ctx.lineTo(9,-4); ctx.moveTo(16,0); ctx.lineTo(9,4); ctx.stroke();
  ctx.strokeStyle='#b388ff'; ctx.lineWidth=1.8;
  line(-20,0,-25,-4); line(-20,0,-25,4); line(-16,0,-21,-4); line(-16,0,-21,4);
  ctx.restore();
  ctx.font=`700 12.5px ${FONT_SANS}`; ctx.textAlign='center';
  if(!e.ghost&&!e.noLabel){
    ctx.fillStyle='#ffe3a0'; ctx.fillText('Arrow',e.x,y+26);
  }
  ctx.setLineDash([]);
  ctx.restore();
}
function drawClubPart(e){
  const y=e.y-10+(e.fall?0:Math.sin(e.age*2.2)*4);
  ctx.save(); ctx.globalAlpha=partAlpha(e);
  ctx.save(); ctx.translate(e.x,y); ctx.rotate(-1.2);
  ctx.strokeStyle='#a9744f'; ctx.lineWidth=4;
  line(0,12,0,-10);
  ctx.translate(0,-10); ctx.rotate(-.15);
  ctx.fillStyle='#6b4a2f'; rr(-5,-7,15,13,3); ctx.fill();
  ctx.restore();
  ctx.font=`700 12.5px ${FONT_SANS}`; ctx.textAlign='center';
  ctx.fillStyle='#e8c9a0'; ctx.fillText('Club',e.x,y+22);
  if(e.pulse>0){ ctx.strokeStyle=`rgba(255,209,102,${e.pulse})`; ctx.lineWidth=2; circle(e.x,y,24*(1.4-e.pulse*.4)); }
  ctx.restore();
}
function drawPotionPart(e){
  const y=e.y-46+Math.sin(e.age*2.4)*5;
  ctx.save(); ctx.globalAlpha=partAlpha(e);
  if(e.ghost){ ctx.globalAlpha*=.55; ctx.setLineDash([5,5]); }
  ctx.save(); ctx.translate(e.x,y);
  ctx.fillStyle='rgba(255,209,102,.22)'; circle(0,0,11);
  ctx.strokeStyle='#ffd166'; ctx.lineWidth=2; circle(0,0,11);
  ctx.fillRect(-3,-19,6,9);
  ctx.strokeStyle='#ffd166'; ctx.strokeRect(-3,-19,6,9);
  ctx.fillStyle='#ffe9b0';
  circle(-3,-2,1.6,true); circle(3,3,1.2,true);
  ctx.restore();
  ctx.font=`700 12.5px ${FONT_SANS}`; ctx.textAlign='center';
  if(!e.ghost&&!e.noLabel){
    ctx.fillStyle='#ffe9b0'; ctx.fillText('PowerBuff',e.x,y+30);
  }
  if(e.pulse>0){ ctx.strokeStyle=`rgba(255,209,102,${e.pulse})`; ctx.lineWidth=2; circle(e.x,y,24*(1.4-e.pulse*.4)); }
  ctx.setLineDash([]);
  ctx.restore();
}
function drawLink(l){
  let x1,y1,x2,y2;
  if(l.a){
    if(l.a.dead) return;
    x1=l.a.x; y1=l.a.y-(l.a.fly?(l.a.flyH||0):0)-(l.a.kind==='flag'?150:62);   // theo nhan vat khi bay, cot cai tu dinh cot
  }else{ x1=l.p1[0]; y1=l.p1[1]; }
  if(l.b){
    if(l.b.dead) return;
    x2=l.b.x;
    if(l.b.kind==='contract') y2=l.b.y+(l.b.airY||0);
    else y2=l.b.y-(l.b.fly?(l.b.flyH||0):0)-62;
  }else{ x2=l.p2[0]; y2=l.p2[1]; }
  const mx=(x1+x2)/2+(l.textShift||0)*(x2-x1)+(l.textOffX||0), my=Math.min(y1,y2)-36;
  ctx.save();
  ctx.globalAlpha=Math.min(1,l.t*2);
  ctx.strokeStyle=l.col||'#ff5c8a';
  ctx.lineWidth=l.glow>0?2.5:1.5;
  if(l.glow>0){ ctx.shadowColor=l.col||'#ff5c8a'; ctx.shadowBlur=14*l.glow+6; }
  ctx.setLineDash(l.dotted?[3,5]:[6,6]); ctx.lineDashOffset=-time*40;
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.quadraticCurveTo(mx,my,x2,y2); ctx.stroke();
  ctx.setLineDash([]);
  const dx=x2-mx, dy=y2-my, L=Math.hypot(dx,dy)||1;
  const ux=dx/L, uy=dy/L;
  if(l.diamond){ // hinh thoi tai dau "a" (aggregation/composition)
    const ax=x1+(mx-x1)*.18, ay=y1+(my-y1)*.18;
    ctx.save(); ctx.translate(ax,ay); ctx.rotate(Math.atan2(my-y1,mx-x1));
    ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(0,-6); ctx.lineTo(-8,0); ctx.lineTo(0,6); ctx.closePath();
    if(l.diamond==='fill'){ ctx.fillStyle=l.col||'#ff5c8a'; ctx.fill(); }
    else{ ctx.fillStyle='#0a0f1e'; ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
  if(l.openArrow){ // tam giac rong tai dau "b" (realization)
    ctx.fillStyle=l.col||'#ff5c8a';
    ctx.beginPath();
    ctx.moveTo(x2,y2);
    ctx.lineTo(x2-ux*11-uy*5,y2-uy*11+ux*5);
    ctx.lineTo(x2-ux*11+uy*5,y2-uy*11-ux*5);
    ctx.closePath(); ctx.stroke();
  }else{
    ctx.fillStyle=l.col||'#ff5c8a';
    ctx.beginPath();
    ctx.moveTo(x2,y2);
    ctx.lineTo(x2-ux*10-uy*4,y2-uy*10+ux*4);
    ctx.lineTo(x2-ux*10+uy*4,y2-uy*10-ux*4);
    ctx.closePath(); ctx.fill();
  }
  if(l.text){
    ctx.font=`700 12.5px ${FONT_MONO}`; ctx.textAlign='center'; ctx.textBaseline='middle';
    const w=ctx.measureText(l.text).width+14;
    ctx.fillStyle='rgba(5,8,16,.85)'; rr(mx-w/2,my-11,w,22,10); ctx.fill();
    ctx.fillStyle=l.col||'#ff5c8a';
    ctx.fillText(l.text,mx,my);
  }
  ctx.restore();
}
function drawShield(s){
  const p=s.t/.8, x=s.x, y=s.y;
  ctx.save(); ctx.globalAlpha=1-p;
  ctx.strokeStyle='#ff5470'; ctx.lineWidth=3;
  circle(x,y,20+p*26);
  ctx.lineWidth=4;
  const r=13;
  line(x-r,y-r,x+r,y+r); line(x-r,y+r,x+r,y-r);
  ctx.restore();
}
function drawSlash(s){
  const p=s.t/.35;
  ctx.save(); ctx.globalAlpha=(1-p)*.9;
  ctx.strokeStyle=s.col; ctx.lineWidth=5*(1-p)+1.5;
  ctx.shadowColor=s.col; ctx.shadowBlur=12;
  const a0=s.f===1?-2.1:Math.PI+.1, a1=s.f===1?-.1:Math.PI+2.1;
  ctx.beginPath(); ctx.arc(s.x,s.y,24+p*18,a0,a1); ctx.stroke();
  ctx.restore();
}
function drawVictory(){
  if(victoryT<=0) return;
  const v=Math.min(1,victoryT*1.4);
  ctx.save();
  const vg=ctx.createRadialGradient(W/2,H/2,120,W/2,H/2,520);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.55)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
  const sc=easeOutBack(v);
  ctx.translate(W/2,H/2-40); ctx.scale(sc,sc);
  const g=ctx.createLinearGradient(-160,0,160,0);
  g.addColorStop(0,'#ffd166'); g.addColorStop(.5,'#fff'); g.addColorStop(1,'#ffd166');
  ctx.fillStyle=g; ctx.font=`800 52px ${FONT_SANS}`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.shadowColor='#ffd166'; ctx.shadowBlur=26;
  ctx.fillText('VICTORY!',0,0);
  ctx.restore();
}

/* ---------------- Main draw ---------------- */
function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.save();
  if(shakeMag>0) ctx.translate(rnd(shakeMag,-shakeMag),rnd(shakeMag,-shakeMag));
  drawScene();
  for(const l of links) drawLink(l);
  const sorted=[...entities].sort((a,b)=>(a.y-((a.fly?(a.flyH||0):0)))-(b.y-((b.fly?(b.flyH||0):0))));
  for(const e of sorted){
    if(e.kind==='template') drawChar(e);
    else if(e.kind==='zombie'||e.kind==='warrior'||e.kind==='archer'||e.kind==='boss') drawChar(e);
    else if(e.kind==='mold') drawMold(e);
    else if(e.kind==='contract') drawContract(e);
    else if(e.kind==='flag') drawFlag(e);
    else if(e.kind==='bowpart') drawBowPart(e);
    else if(e.kind==='arrowpart') drawArrowPart(e);
    else if(e.kind==='clubpart') drawClubPart(e);
    else if(e.kind==='cone') drawConePart(e);
    else if(e.kind==='potionpart') drawPotionPart(e);
  }
  for(const e of entities) if(e.label2) drawTemplateLabel(e);
  // Vet dao (motion streak) theo mat kim
  for(const e of entities){
    if(e.swTrail&&e.swTrail.length>1){
      ctx.save();
      for(let i=1;i<e.swTrail.length;i++){
        const a=i/e.swTrail.length;
        ctx.strokeStyle=`rgba(191,233,255,${(a*.5).toFixed(3)})`;
        ctx.lineWidth=.5+a*4;
        line(e.swTrail[i-1][0],e.swTrail[i-1][1],e.swTrail[i][0],e.swTrail[i][1]);
      }
      ctx.restore();
    }
  }
  for(const p of projectiles){
    if(p.palm){ drawPalmProj(p); continue; }
    const ang=Math.atan2(p.vy,p.vx);
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(ang);
    if(p.power){ // TEN QUYEN: lon hon, pha sang, vet dai
      ctx.shadowColor='#ffd166'; ctx.shadowBlur=18;
      ctx.strokeStyle='rgba(255,209,102,.45)'; ctx.lineWidth=7;
      line(-30,0,4,0);
      ctx.strokeStyle='#ffe9b0'; ctx.lineWidth=4;
      line(-14,0,12,0);
      ctx.beginPath(); ctx.moveTo(18,0); ctx.lineTo(8,-5.5); ctx.moveTo(18,0); ctx.lineTo(8,5.5); ctx.stroke();
      ctx.strokeStyle='#ff9f43'; ctx.lineWidth=2.6;
      line(-14,0,-21,-5); line(-14,0,-21,5); line(-9,0,-16,-4.4); line(-9,0,-16,4.4);
      ctx.restore(); continue;
    }
    ctx.strokeStyle='rgba(255,209,102,.25)'; ctx.lineWidth=1.4;
    if(p.trail.length>1){ ctx.beginPath(); ctx.moveTo(0,0); for(const tp of p.trail) ctx.lineTo(tp[0]-p.x,tp[1]-p.y); ctx.stroke(); }
    ctx.strokeStyle='#ffd166'; ctx.lineWidth=2.4;
    line(-9,0,8,0);
    ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(2,-3.4); ctx.moveTo(8,0); ctx.lineTo(2,3.4); ctx.stroke();
    ctx.strokeStyle='#b388ff'; ctx.lineWidth=1.6;
    line(-9,0,-13,-3); line(-9,0,-13,3);
    ctx.restore();
  }
  for(const s of slashes) drawSlash(s);
  for(const s of shields) drawShield(s);
  for(const p of particles){
    const a=1-p.t/p.life;
    if(p.ring){
      ctx.save(); ctx.globalAlpha=a;
      ctx.strokeStyle=p.col; ctx.lineWidth=2.5;
      circle(p.x,p.y,p.sz+p.t*90);
      ctx.restore();
    }else if(p.conf){
      ctx.save(); ctx.globalAlpha=Math.min(1,a*2);
      ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.fillStyle=p.col; ctx.fillRect(-p.sz/2,-p.sz/2,p.sz,p.sz*.62);
      ctx.restore();
    }else{
      ctx.save(); ctx.globalAlpha=a;
      ctx.fillStyle=p.col;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.sz*a+.6,0,7); ctx.fill();
      ctx.restore();
    }
  }
  for(const q of popups){
    ctx.save(); ctx.globalAlpha=clamp(1.25-q.t,0,1);
    ctx.font=`800 18px ${FONT_SANS}`; ctx.textAlign='center';
    ctx.lineWidth=4; ctx.strokeStyle='rgba(0,0,0,.6)';
    ctx.strokeText(q.txt,q.x,q.y);
    ctx.fillStyle=q.col; ctx.fillText(q.txt,q.x,q.y);
    ctx.restore();
  }
  drawVictory();
  ctx.restore();
  if(currentStage>=0&&currentStage<STAGES.length){
    ctx.save(); ctx.globalAlpha=.85;
    ctx.font=`700 14px ${FONT_MONO}`; ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillStyle=STAGE_COLORS[currentStage];
    ctx.fillText('0'+(currentStage+1)+' - '+STAGES[currentStage].name,16,14);
    ctx.restore();
  }
  if(trans>.01){
    ctx.fillStyle=`rgba(4,6,12,${trans*.96})`;
    ctx.fillRect(0,0,W,H);
  }
}
let lastTs2=0;
function frame(ts){
  const dt=Math.min(.05,(ts-lastTs2)/1000||.016);
  lastTs2=ts;
  if(!paused){ update(dt); }
  draw();
  requestAnimationFrame(frame);
}

/* ============================================================
   CODE PANEL - tokenizer + typing
   ============================================================ */
const KW=new Set(['public','private','class','interface','abstract','virtual','override','new','foreach','var','void','int','float','string','get','set','in','List','true','false','null']);
function tokenize(line){
  const toks=[];
  const re=/(\/\/.*$)|(\/\*.*?\*\/)|("(?:[^"\\]|\\.)*")|(\b\d+\.?\d*f?\b)|([A-Za-z_][A-Za-z0-9_]*)|(\s+)|(.)/g;
  let m;
  while((m=re.exec(line))){
    if(m[1]) toks.push({t:m[1],c:'cm'});
    else if(m[2]) toks.push({t:m[2],c:'cm'});
    else if(m[3]) toks.push({t:m[3],c:'st'});
    else if(m[4]) toks.push({t:m[4],c:'num'});
    else if(m[5]){
      const rest=line.slice(re.lastIndex);
      let c='pl';
      if(KW.has(m[5])) c='kw';
      else if(/^[A-Z]/.test(m[5])) c='tp';
      else if(/^\s*\(/.test(rest)) c='fn';
      toks.push({t:m[5],c});
    }
    else if(m[6]) toks.push({t:m[6],c:'w'});
    else toks.push({t:m[7],c:'op'});
  }
  return toks;
}
function renderTokens(toks){
  return toks.map(t=>`<span class="${t.c}">${esc(t.t)}</span>`).join('');
}

const codeEl=$('#code');
let lineEls=[];
function buildCodeLines(S){
  codeEl.innerHTML='';
  lineEls=[];
  S.toks=S.lines.map(tokenize);
  S.lines.forEach((ln,i)=>{
    const d=document.createElement('div');
    d.className='cl todo';
    d.innerHTML=`<span class="ln">${i+1}</span><code></code>`;
    codeEl.appendChild(d); lineEls.push(d);
  });
  codeEl.scrollTop=0;
}
function scrollLine(i){
  const el=lineEls[i];
  codeEl.scrollTop=Math.max(0,el.offsetTop-110);
}
async function typeLine(i,spd){
  const S=curStage, el=lineEls[i];
  el.classList.remove('todo'); el.classList.add('typing');
  const toks=S.toks[i];
  const total=toks.reduce((a,t)=>a+t.t.length,0);
  let shown=0;
  const codeEl2=el.querySelector('code');
  while(shown<=total){
    if(activeGen!==loopGen) return;
    let html='',rem=shown;
    for(const t of toks){
      if(rem<=0) break;
      const take=t.t.slice(0,rem); rem-=t.t.length;
      html+=`<span class="${t.c}">${esc(take)}</span>`;
    }
    codeEl2.innerHTML=html+'<span class="caret"></span>';
    scrollLine(i);
    shown+=1+(Math.random()<.3?1:0);
    await sleep(spd+Math.random()*10);
  }
  el.classList.remove('typing');
  if(!el.classList.contains('err')) el.classList.add('done');
  codeEl2.innerHTML=renderTokens(toks);
  scrollLine(i);
  progressDone+=S.lines[i].length;
  updateProgress();
}

/* ============================================================
   STAGES - 4 tính chất & 6 quan hệ OOP (mỗi quan hệ 1 file riêng)
   01 Kế thừa | 02 Đóng gói | 03 Đa hình | 04 Trừu tượng
   05 Association | 06 Aggregation | 07 Composition
   08 Realization | 09 Dependency
   ============================================================ */
let curStage=null, activeGen=0, loopGen=0;
let progressDone=0, progressTotal=0;

const STAGES=[
/* ============ 01 - KẾ THỪA ============ */
{
  name:'Inheritance', file:'Inheritance.cs', color:STAGE_COLORS[0], icon:'fa-sitemap',
  lines:[
'// 01 - Kế thừa (Inheritance) - quan hệ "is-a"',
'public class Unit {',
'    public int Hp = 100;',
'    public float X = 0f;',
'',
'    public void Move(float dx) {',
'        X += dx;',
'    }',
'}',
'',
'public class Zombie  : Unit { }   // Zombie là một Unit',
'public class Warrior : Unit { }   // Warrior là một Unit',
'',
'Zombie  z = new Zombie();   // tạo zombie',
'Warrior w = new Warrior();  // tạo chiến sĩ',
'w.Move(-40);                // di chuyển kế thừa',
  '// Made by @tirumisaa',
  ],
  script:[
    {l:1, cap:'Class gốc Unit - "khuôn mẫu" của mọi đơn vị chiến đấu.', fx(){
      return spawn({kind:'template',x:440,y:GROUND,label2:'Unit'}); }},
    {l:2, cap:'Thành viên Hp = 100 - máu mà mọi class con sẽ kế thừa.', hold:500, fx(){
      const tpl=entities.find(e=>e.kind==='template');
      tpl.pulse=1; tpl.showHp=true; }},
    {l:5, cap:'Method Move(dx) - phương thức di chuyển của Unit.', hold:1300, fx(){
      const tpl=entities.find(e=>e.kind==='template');
      tpl.baseX=tpl.x; tpl.returnHome=true; walkTo(tpl,tpl.x-34,42); }},
    {l:8, cap:'Đóng class Unit lại - sẵn sàng để kế thừa.', hold:350, fx(){
      const tpl=entities.find(e=>e.kind==='template'); tpl.pulse=.6; }},
    {l:10, cap:'Zombie : Unit => zombie kế thừa luôn Hp và Move.', hold:600, fx(){
      const tpl=entities.find(e=>e.kind==='template');
      const z=spawn({kind:'zombie',x:700,y:GROUND,ghost:true,face:-1});
      links.push({a:tpl,b:z,t:0,col:'#4dd0e1',text:'kế thừa'});
      sfx.pop(); }},
    {l:11, cap:'Warrior : Unit => chiến sĩ cũng kế thừa y hệt.', hold:600, fx(){
      const tpl=entities.find(e=>e.kind==='template');
      const w=spawn({kind:'warrior',x:280,y:GROUND,ghost:true,face:1});
      links.push({a:tpl,b:w,t:0,col:'#4dd0e1',text:'kế thừa'});
      sfx.pop(); }},
    {l:13, cap:'new Zombie() => một zombie THẬT được sinh ra!', hold:900, fx(){
      const z=entities.find(e=>e.kind==='zombie');
      materialize(z,'#94c94e');
      walkTo(z,600,16);
      clog('new Zombie() => Zombie1, HP: 100','ok'); }},
    {l:14, cap:'new Warrior() => chiến sĩ xuất trận.', hold:900, fx(){
      const w=entities.find(e=>e.kind==='warrior');
      materialize(w,'#4dd0e1');
      clog('new Warrior() => Warrior1, HP: 100','ok'); }},
    {l:15, cap:'w.Move(-40): chiến sĩ dùng ngay method kế thừa từ Unit.', hold:1400, fx(){
      const w=entities.find(e=>e.kind==='warrior');
      walkTo(w,215,45); }},
  ],
  demo(){ return sleep(1400); }
},
/* ============ 02 - ĐÓNG GÓI ============ */
{
  name:'Encapsulation', file:'Encapsulation.cs', color:STAGE_COLORS[1], icon:'fa-lock',
  lines:[
'// 02 - Đóng gói (Encapsulation)',
'public class Unit {',
'    private int _hp = 100;       // ẩn bên trong',
'',
'    public int HP {',
'        get => _hp;',
'        private set => _hp = value;  // chỉ sửa trong class',
'    }',
'',
'    public void TakeDamage(int dmg) {',
'        _hp -= dmg;              // chỉ qua "cổng"',
'    }',
'}',
'',
'Warrior w = new Warrior();',
'w.HP = 50;          // ERROR CS0120: set là private!',
'w.TakeDamage(30);   // OK: HP 100 => 70',
  '// Made by @tirumisaa',
  ],
  script:[
    {l:1, cap:'Class Unit - "khuôn mẫu" với dữ liệu được giữ kín bên trong.', fx(){
      return spawn({kind:'template',x:330,y:GROUND,label2:'Unit'}); }},
    {l:2, cap:'private int _hp = 100 - từ khóa private: dữ liệu bị ẨN (có ổ khóa).', hold:700, fx(){
      const t=entities.find(e=>e.kind==='template');
      t.locked=true; t.showHp=true; sfx.pop();
      clog('private _hp - không ai bên ngoài đụng được'); }},
    {l:6, cap:'private set: HP chỉ đọc được, KHÔNG gán trực tiếp.', hold:500, fx(){
      clog('HP.get được, HP.set từ chối (private)'); }},
    {l:9, cap:'TakeDamage(int) - "cổng" kiểm soát việc đổi _hp.', hold:500, fx(){
      clog('public TakeDamage(int dmg) - cổng hợp lệ'); }},
    {l:14, cap:'new Warrior() => Warrior ra đời với HP = 100, dữ liệu vẫn bị khóa.', hold:900, fx(){
      const t=entities.find(e=>e.kind==='template');
      t.kind='warrior'; t.label2=null;
      materialize(t,'#4dd0e1');
      clog('new Warrior() => Warrior1, HP: 100','ok'); }},
    {l:15, err:true, cap:'Zombie xuất hiện, cố gán w.HP = 50 trực tiếp => BỊ CHẶN bởi private set!', hold:500, fx:async function(){
      const z=spawn({kind:'zombie',x:590,y:GROUND,face:-1,showHp:true});
      materialize(z,'#94c94e');
      clog("ERROR CS0120: 'Unit.HP.set' là private",'bad');
      sfx.err();
      z.zreach=1; z.zreachT=0.0001;
      shieldFx(460,GROUND-44);
      popup(460,GROUND-96,'CHẶN!','#ff5470');
      await sleep(1300); }},
    {l:16, cap:'Cách đúng: w.TakeDamage(30) - tổn thương qua cổng hợp lệ.', hold:500, fx:async function(){
      const z=entities.find(e=>e.kind==='zombie');
      const w=entities.find(e=>e.kind==='warrior');
      atk(z,'punch',30,w,.85,.45);
      clog('TakeDamage(30) => HP: 100 => 70','ok');
      await sleep(1600); }},
  ],
  demo(){ return sleep(1000); }
},
/* ============ 03 - ĐA HÌNH ============ */
{
  name:'Polymorphism', file:'Polymorphism.cs', color:STAGE_COLORS[2], icon:'fa-clone',
  lines:[
'// 03 - Đa hình (Polymorphism)',
'public class Unit {',
'    public int Hp = 100;',
'    public virtual void Attack() {',
'        Console.WriteLine("Tấn công cơ bản...");',
'    }',
'}',
'',
'public class Warrior : Unit {',
'    public override void Attack() => SwordSlash();   // kiếm chém',
'}',
'',
'public class Archer : Unit {',
'    public override void Attack() => ShootArrow();   // bắn tên',
'}',
'',
'Unit[] team = { new Warrior(), new Archer() };',
'foreach (Unit u in team) {',
'    u.Attack();   // Attack nào? Quyết định lúc chạy!',
'}',
  '// Made by @tirumisaa',
  ],
  script:[
    {l:3, cap:'virtual Attack() - method "mở cửa" cho class con ghi đè.', hold:500, fx(){
      clog('virtual Attack() => sẵn sàng override'); }},
    {l:9, cap:'Warrior ghi đè: Attack() = kiếm chém.', hold:500, fx(){
      clog('Warrior.Attack() => SwordSlash()'); }},
    {l:13, cap:'Archer ghi đè: Attack() = bắn tên.', hold:500, fx(){
      clog('Archer.Attack() => ShootArrow()'); }},
    {l:16, cap:'Mảng Unit chứa 2 kiểu khác nhau - đa hình bắt đầu!', hold:800, fx(){
      spawn({kind:'warrior',x:270,y:GROUND,face:1,showHp:true});
      spawn({kind:'archer',x:150,y:GROUND,face:1,showHp:true,hasBow:true,hasArrow:true});
      const z=spawn({kind:'zombie',x:680,y:GROUND,face:-1,showHp:true});
      walkTo(z,615,14);
      clog('team = [Warrior, Archer]'); }},
    {l:17, cap:'foreach: lần lượt lấy mỗi đối tượng u ra xử lý.', hold:450, fx(){}},
    {l:18, cap:'u.Attack() => lúc chạy mới biết gọi Attack của AI!', hold:500, fx:async function(){
      const w=entities.find(e=>e.kind==='warrior');
      const a=entities.find(e=>e.kind==='archer');
      const z=entities.find(e=>e.kind==='zombie');
      w.label='Warrior.Attack()'; w.labelCol='#4dd0e1';
      atk(w,'slash',10,z);
      clog('u[0].Attack() => Warrior: chém! (-10)','ok');
      await sleep(1500); w.label=null;
      a.label='Archer.Attack()'; a.labelCol='#b388ff';
      atk(a,'arrow',15,z);
      clog('u[1].Attack() => Archer: bắn tên! (-15)','ok');
      await sleep(1800); a.label=null; }},
    {l:19, cap:'Một dòng lệnh u.Attack() - hai hành động HOÀN TOÀN khác nhau.', hold:600, fx(){}},
  ],
  demo(){ return sleep(1200); }
},
/* ============ 04 - TRỪU TƯỢNG HÓA ============ */
{
  name:'Abstraction', file:'Abstraction.cs', color:STAGE_COLORS[3], icon:'fa-cube',
  lines:[
'// 04 - Trừu tượng hóa (Abstraction)',
'public abstract class Unit {',
'    public abstract void Attack();',
'    public abstract void Die();',
'}',
'',
'public class Warrior : Unit {',
'    public override void Attack() => SwordSlash();',
'    public override void Die() => FallDown();',
'}',
'',
'Unit w = new Warrior();   // tham chiếu trừu tượng, vật thể cụ thể',
'// Unit b = new Unit();   // ERROR: không thể sinh class trừu tượng',
'w.Attack();               // chạy đúng phương thức đã cài đặt',
  '// Made by @tirumisaa',
  ],
  script:[
    {l:1, cap:'Class trừu tượng Unit - chỉ định nghĩa khung, chưa có thân.', hold:700, fx(){
      spawn({kind:'mold',x:330,y:GROUND}); sfx.pop(); }},
    {l:2, cap:'abstract Attack() - buộc class con phải cài đặt.', hold:500, fx(){
      const m=entities.find(e=>e.kind==='mold'); m.slot=1; m.pulse=1; }},
    {l:3, cap:'abstract Die() - thêm một ràng buộc nữa.', hold:500, fx(){
      const m=entities.find(e=>e.kind==='mold'); m.slot=2; m.pulse=1; }},
    {l:7, cap:'Warrior thực hiện đầy đủ các phương thức trừu tượng.', hold:500, fx(){
      clog('class Warrior : Unit - cài đặt Attack(), Die()'); }},
    {l:11, cap:'Unit w = new Warrior(): tham chiếu trừu tượng, vật thể cụ thể.', hold:600, fx:async function(){
      const w=spawn({kind:'warrior',x:480,y:GROUND,face:1,showHp:true,stampT:0.0001});
      w.label='Unit => Warrior'; w.labelCol='#b388ff';
      const m=entities.find(e=>e.kind==='mold'); m.dying=1;
      clog('w có kiểu Unit nhưng thực chất là Warrior','ok');
      await sleep(1000); w.label=null; }},
    {l:12, cap:'new Unit() => KHÔNG THỂ! class trừu tượng không sinh trực tiếp.', hold:700, fx(){
      clog('ERROR: new Unit() => lỗi biên dịch','bad');
      sfx.err();
      popup(330,GROUND-150,'KHÔNG THỂ!','#ff5470'); }},
    {l:13, cap:'w.Attack() => chạy đúng Warrior.Attack() đã cài đặt.', hold:600, fx:async function(){
      const w=entities.find(e=>e.kind==='warrior');
      const z=spawn({kind:'zombie',x:700,y:GROUND,face:-1,showHp:true,hp:40,maxHp:40});
      atk(w,'slash',40,z);
      clog('w.Attack() => Warrior: chém! (-40)','ok');
      await sleep(1700); }},
  ],
  demo(){ return sleep(1300); }
},
/* ============ 05 - ASSOCIATION ============ */
{
  name:'Association', file:'Association.cs', color:STAGE_COLORS[4], icon:'fa-diagram-project',
  lines:[
'// 05 - Association (Liên kết) - object với object',
'public class Team {',
'    private List<Unit> _units = new();',
'',
'    public void Add(Unit u) => _units.Add(u);',
'',
'    public void AttackAll() {',
'        foreach (var u in _units)',
'            u.Attack();      // mỗi người theo cách riêng',
'    }',
'}',
'',
'Team team = new Team();',
'team.Add(new Warrior());    // Liên kết 1',
'team.Add(new Archer());     // Liên kết 2',
'team.AttackAll();           // Team ra lệnh cho tất cả',
  '// Made by @tirumisaa',
  ],
  script:[
    {l:1, cap:'Class Team - nhóm gắn kết các đơn vị chiến đấu với nhau.', hold:600, fx(){
      spawn({kind:'flag',x:95,y:GROUND});
      sfx.pop(); }},
    {l:4, cap:'Add(u) - liên kết một đơn vị vào đội.', hold:500, fx(){
      clog('Team.Add(Unit) - tạo liên kết'); }},
    {l:6, cap:'AttackAll() - lệnh tập kích: cả đội cùng tấn công.', hold:500, fx(){
      clog('Team.AttackAll() => phát lệnh cho mọi thành viên'); }},
    {l:12, cap:'Cờ Team xuất hiện - người chỉ huy của nhóm.', hold:600, fx(){
      const f=entities.find(e=>e.kind==='flag'); f.pulse=1;
      clog('new Team() => Team1','ok'); }},
    {l:13, cap:'Liên kết 1: Team - Warrior.', hold:700, fx(){
      const f=entities.find(e=>e.kind==='flag');
      const w=spawn({kind:'warrior',x:320,y:GROUND,face:1,showHp:true});
      links.push({a:f,b:w,t:0,col:'#ff5c8a',text:'Add()'});
      clog('Add(new Warrior()) OK','ok'); }},
    {l:14, cap:'Liên kết 2: Team - Archer.', hold:900, fx(){
      const f=entities.find(e=>e.kind==='flag');
      const a=spawn({kind:'archer',x:215,y:GROUND,face:1,showHp:true,hasBow:true,hasArrow:true});
      links.push({a:f,b:a,t:0,col:'#ff5c8a',text:'Add()'});
      clog('Add(new Archer()) OK','ok'); }},
    {l:15, cap:'team.AttackAll(): hai zombie áp sát - mọi thành viên tấn công ĐỒNG THỜI!', hold:500, fx:async function(){
      const z1=spawn({kind:'zombie',x:620,y:GROUND,face:-1,showHp:true,hp:50,maxHp:50});
      const z2=spawn({kind:'zombie',x:780,y:GROUND,face:-1,showHp:true,hp:50,maxHp:50});
      walkTo(z1,540,16); walkTo(z2,700,16);
      setCaption(STAGES[4].icon,'Hai zombie áp sát thành - Team, tấn công!');
      await sleep(700);
      links.forEach(l=>l.glow=1);
      const w=entities.find(e=>e.kind==='warrior');
      const a=entities.find(e=>e.kind==='archer');
      atk(w,'slash',50,z1);
      atk(a,'arrow',50,z2,.95,.5);
      clog('AttackAll() => 2 thành viên cùng tấn công','ok');
      await sleep(2400); }},
  ],
  demo(){ return sleep(800); }
},
/* ============ 06 - AGGREGATION ============ */
{
  name:'Aggregation', file:'Aggregation.cs', color:STAGE_COLORS[5], icon:'fa-link',
  lines:[
'// 06 - Aggregation (Tập hợp) - "có" yếu: bộ phận có thể tồn tại riêng',
'public class TrafficCone {',
'    public int Armor = 50;',
'}',
'',
'public class ZombieBoss {',
'    private TrafficCone _cone;',
'',
'    public void WearCone() {',
'        _cone = new TrafficCone();   // đội lên đầu, không sở hữu',
'    }',
'',
'    public void DropCone() {',
'        _cone = null;                // cone rơi xuống, vẫn tồn tại',
'    }',
'}',
'',
'ZombieBoss zb = new ZombieBoss();',
'zb.WearCone();',
'zb.DropCone();                       // cone rơi xuống đất, vẫn dùng',
  '// Made by @tirumisaa',
  ],
  script:[
    {l:1, cap:'Class TrafficCone - chiếc nón giao thông, có thể tồn tại độc lập.', hold:600, fx(){
      spawn({kind:'cone',x:680,y:GROUND,ghost:true}); sfx.pop(); }},
    {l:2, cap:'Armor = 50 - giáp bảo vệ của chiếc nón.', hold:500, fx(){
      const c=entities.find(e=>e.kind==='cone'); c.pulse=1; }},
    {l:6, cap:'Class ZombieBoss - boss có thể ĐỘI nón (liên kết yếu).', hold:600, fx(){
      spawn({kind:'zombie',x:480,y:GROUND,face:-1,ghost:true,big:true,label2:'ZombieBoss'});
      clog('class ZombieBoss: đội cone bằng liên kết yếu'); }},
    {l:9, cap:'WearCone() - phương thức đội nón lên đầu.', hold:500, fx(){
      clog('void WearCone(): _cone = new TrafficCone()'); }},
    {l:13, cap:'DropCone() - phương thức bỏ nón xuống.', hold:500, fx(){
      clog('void DropCone(): _cone = null'); }},
    {l:16, cap:'new ZombieBoss() => boss THẬT xuất trận.', hold:900, fx(){
      const b=entities.find(e=>e.kind==='zombie');
      b.label2=null;
      materialize(b,'#7d9c3f');
      clog('new ZombieBoss() => Boss1, HP: 100','ok'); }},
    {l:17, cap:'zb.WearCone() => nón được TẠO RA và ĐỘI LÊN ĐẦU boss!', hold:1500, fx(){
      const c=entities.find(e=>e.kind==='cone');
      const b=entities.find(e=>e.kind==='zombie');
      c.ghost=false; c.pulse=1;
      c.to={e:b,ox:0,oy:-80};
      c.onArrive=()=>{
        b.hasCone=true;
        clog('zb._cone = TrafficCone (liên kết yếu)','ok');
        b.atk={kind:'swing',t:0,dur:.7,hitAt:.4,done:false,target:null}; b.state='attack';
        links.push({a:b,p2:[b.x,b.y-104],t:0,col:'#2ec4b6',text:'đội (yếu)',dotted:true,diamond:'hollow',ttl:2.6});
      }; }},
    {l:18, cap:'zb.DropCone() => nón rơi xuống đất - VẪN TỒN TẠI, không bị hủy!', hold:1500, fx:async function(){
      const b=entities.find(e=>e.kind==='zombie');
      b.hasCone=false;
      const infl=entities.find(e=>e.kind==='cone'&&e.to);
      if(infl){ infl.to=null; infl.fall=true; infl.spin=9; infl.vx=-b.face*80; }   // tua nhanh: no con dang bay => roi xuong
      // Lan long loc ra DANG SAU zombie: di chuyen sau + xuan day du 1 vong khi roi
      const c=spawn({kind:'cone',x:b.x,y:b.y-80,fall:true,spin:20.4,vx:-b.face*110});
      clog('Cone rơi xuống - vẫn tồn tại, không bị hủy đi','ok');
      await sleep(1200); }},
  ],
  demo(){ return sleep(1200); }
},
/* ============ 07 - COMPOSITION ============ */
{
  name:'Composition', file:'Composition.cs', color:STAGE_COLORS[6], icon:'fa-puzzle-piece',
  lines:[
'// 07 - Composition (Hợp thành) - "có" mạnh: bộ phận chỉ sống cùng chủ',
'public class Bow {',
'    public void Fire() { /* kéo dây cung */ }',
'}',
'',
'public class Arrow {',
'    public void Fly() { /* bay về phía trước */ }',
'}',
'',
'public class Archer {',
'    private Bow _bow   = new Bow();     // tạo cùng Archer sinh ra',
'    private Arrow _arrow = new Arrow(); // hủy đi khi Archer mất',
'',
'    public void Attack() {',
'        _bow.Fire();',
'        _arrow.Fly();',
'    }',
'}',
'',
'Archer a = new Archer();',
'a.Attack();              // bắn tên, bị zombie đánh trả',
'a.Die();                 // Archer mất: Bow + Arrow mất theo',
  '// Made by @tirumisaa',
  ],
  script:[
    {l:1, cap:'Bộ phận 1: class Bow - định nghĩa cây cung (chưa phải vật thể).', hold:600, fx(){
      spawn({kind:'bowpart',x:560,y:GROUND,ghost:true}); sfx.pop(); }},
    {l:2, cap:'Fire() - method của riêng cây cung.', hold:500, fx(){
      const b=entities.find(e=>e.kind==='bowpart'); b.pulse=1; }},
    {l:6, cap:'Bộ phận 2: class Arrow - định nghĩa mũi tên.', hold:600, fx(){
      spawn({kind:'arrowpart',x:670,y:GROUND,ghost:true}); sfx.pop(); }},
    {l:9, cap:'Class Archer - "xác" của Archer, bộ phận được tạo KHI CÓ NEW.', hold:600, fx(){
      spawn({kind:'archer',x:300,y:GROUND,face:1,ghost:true,label2:'Archer'});
      clog('class Archer: chờ new Archer() để lắp ráp bộ phận'); }},
    {l:10, cap:'_bow = new Bow() => Bow được TẠO RA và lắp vào Archer ngay trong constructor.', hold:1500, fx(){
      const b=entities.find(e=>e.kind==='bowpart');
      const a=entities.find(e=>e.kind==='archer');
      b.ghost=false; b.pulse=1;
      b.to={e:a,ox:14,oy:-43};
      b.onArrive=()=>{
        a.hasBow=true;
        clog('new Bow() => lắp vào Archer._bow (hợp thành)','ok');
        links.push({a:a,b:null,p1:[a.x+14,a.y-43],p2:[a.x+36,a.y-74],t:0,col:'#69db7c',text:'có (mạnh)',dotted:true,diamond:'fill',ttl:2.6});
      }; }},
    {l:11, cap:'_arrow = new Arrow() => Arrow được TẠO RA và lắp vào Archer.', hold:1500, fx(){
      const b=entities.find(e=>e.kind==='arrowpart');
      const a=entities.find(e=>e.kind==='archer');
      b.ghost=false; b.pulse=1;
      b.to={e:a,ox:-10,oy:-56};
      b.onArrive=()=>{ a.hasArrow=true; clog('new Arrow() => lắp vào Archer._arrow (hợp thành)','ok'); }; }},
    {l:17, cap:'new Archer() => Archer HOÀN CHỈNH xuất trận (Bow + Arrow đi kèm).', hold:700, fx(){
      const a=entities.find(e=>e.kind==='archer');
      a.label2=null;
      materialize(a,'#b388ff');
      const z=spawn({kind:'zombie',x:680,y:GROUND,face:-1,showHp:true});
      walkTo(z,620,14);
      clog('new Archer() => Archer1 (Bow + Arrow đi kèm)','ok'); }},
    {l:18, cap:'a.Attack() - Bow + Arrow làm việc cho chính chủ.', hold:500, fx:async function(){
      const a=entities.find(e=>e.kind==='archer');
      const z=entities.find(e=>e.kind==='zombie');
      atk(a,'arrow',20,z);
      clog('a.Attack() => _bow.Fire(), _arrow.Fly() (-20)','ok');
      await sleep(1700); }},
    {l:19, cap:'a.Die() - Archer mất: Bow + Arrow TAN BIẾN ngay tại chỗ (không sống riêng).', hold:500, fx:async function(){
      const a=entities.find(e=>e.kind==='archer');
      const z=entities.find(e=>e.kind==='zombie');
      atk(z,'punch',100,a,.8,.45);
      clog('Archer bị hủy đi => Bow + Arrow bị hủy theo','bad');
      await sleep(1500);
      // Bo phan tan bien NGAY VI TRI DANG GIU, rat xuong chan - khong di chuyen doc lap
      const b1=spawn({kind:'bowpart',x:a.x+14,y:a.y-43,dying:1,fadeOut:0,noLabel:true,driftY:30});
      const b2=spawn({kind:'arrowpart',x:a.x-10,y:a.y-56,dying:1,fadeOut:0,noLabel:true,driftY:30});
      burst(a.x+14,a.y-43,'#c58b52',8); burst(a.x-10,a.y-56,'#ffd166',8);
      await sleep(900); }},
  ],
  demo(){ return sleep(1200); }
},
/* ============ 08 - REALIZATION ============ */
{
  name:'Realization', file:'Realization.cs', color:STAGE_COLORS[7], icon:'fa-file-contract',
  lines:[
'// 08 - Realization (Thực hiện) - class thực hiện giao diện',
'public interface IFlyable {',
'    void Fly();',
'}',
'',
'public interface IAttackable {',
'    int Attack();',
'}',
'',
'public class Warrior : IAttackable, IFlyable {',
'    public int Attack() => 20;         // thực hiện IAttackable',
'    public void Fly() => FlyUp(120);   // thực hiện IFlyable',
'}',
'',
'Warrior w = new Warrior();',
'w.Attack();              // thực hiện IAttackable',
'w.Fly();                 // thực hiện IFlyable',
'// Made by @tirumisaa',
  ],
  script:[
    {l:1, cap:'Giao diện IFlyable - "hợp đồng": ai ký, ai phải bay được.', hold:600, fx(){
      spawn({kind:'contract',x:300,y:GROUND,airY:-150,name:'IFlyable',method:'Fly()'});
      sfx.pop(); }},
    {l:5, cap:'Giao diện IAttackable - hợp đồng thứ hai.', hold:600, fx(){
      spawn({kind:'contract',x:580,y:GROUND,airY:-150,name:'IAttackable',method:'Attack()'});
      sfx.pop(); }},
    {l:9, cap:'Warrior cam kết thực hiện cả hai giao diện.', hold:500, fx(){
      clog('class Warrior : IAttackable, IFlyable'); }},
    {l:10, cap:'Attack() => 20: Warrior THỰC HIỆN IAttackable.', hold:700, fx(){
      const c=entities.find(e=>e.kind==='contract'&&e.name==='IAttackable');
      c.realized=true; sfx.pop(); }},
    {l:11, cap:'Fly(): Warrior THỰC HIỆN IFlyable.', hold:700, fx(){
      const c=entities.find(e=>e.kind==='contract'&&e.name==='IFlyable');
      c.realized=true; sfx.pop(); }},
    {l:13, cap:'w = new Warrior() - Chiến sĩ CẦM KIẾM xuất hiện, đã ký hết hợp đồng.', hold:700, fx(){
      const a=spawn({kind:'warrior',x:440,y:GROUND,face:1,showHp:true,stampT:0.0001});
      const c1=entities.find(e=>e.kind==='contract'&&e.name==='IAttackable');
      const c2=entities.find(e=>e.kind==='contract'&&e.name==='IFlyable');
      links.push({a:a,b:c1,t:0,col:'#d8b4fe',text:'thực hiện',openArrow:true,textShift:.12});
      links.push({a:a,b:c2,t:0,col:'#d8b4fe',text:'thực hiện',openArrow:true,textShift:.12});
      clog('new Warrior() => Warrior thực hiện 2 interface','ok'); }},
    {l:14, cap:'w.Attack() => Warrior chiến đấu theo hợp đồng IAttackable.', hold:600, fx:async function(){
      const a=entities.find(e=>e.kind==='warrior');
      const z=spawn({kind:'zombie',x:740,y:GROUND,face:-1,showHp:true,hp:20,maxHp:20});
      a.label='IAttackable'; a.labelCol='#d8b4fe';
      atk(a,'slash',20,z);
      clog('w.Attack() => IAttackable: kiếm chém (-20)','ok');
      await sleep(1700); a.label=null; }},
    {l:15, cap:'w.Fly() => Warrior bay lên theo hợp đồng IFlyable.', hold:600, fx:async function(){
      const a=entities.find(e=>e.kind==='warrior');
      a.fly=true; a.flyTarget=110;
      a.label='IFlyable'; a.labelCol='#69db7c';
      sfx.chime();
      await sleep(1800); a.label=null; }},
  ],
  demo(){ return sleep(1300); }
},
/* ============ 09 - DEPENDENCY ============ */
{
  name:'Dependency', file:'Dependency.cs', color:STAGE_COLORS[8], icon:'fa-wand-magic-sparkles',
  lines:[
'// 09 - Dependency (Phụ thuộc) - "dùng" một object tạm thời',
'public class PowerBuff {',
'    public int Power = 50;',
'}',
'',
'public class Battle {',
'    public void Cast(PowerBuff s, Unit u) {',
'        u.Power = u.Power + s.Power;   // chỉ dùng s trong phương thức',
'    }',
'}',
'',
'Boss z = new Boss(100);          // boss cuối cùng',
'Archer a = new Archer();',
'a.Attack();                      // bắn tên -30',
'z.Attack();                      // boss đánh trả: a chỉ còn 30 HP',
'PowerBuff s = new PowerBuff();   // tạo buff sức mạnh',
'Battle b = new Battle();',
'b.Cast(s, a);                    // a nhận +50 POWER, s dùng xong tan biến',
'a.Attack();                      // cuối cùng: phát bắn MẠNH NHẤT (30+50=80)',
'// Made by @tirumisaa',
  ],
  script:[
    {l:1, cap:'PowerBuff - buff SỨC MẠNH, vật thể "phục vụ" tạm thời.', hold:500, fx(){
      clog('class PowerBuff: Power = 50'); }},
    {l:6, cap:'Battle.Cast(s, u) - PHỤ THUỘC vào s: chỉ dùng trong phương thức.', hold:600, fx(){
      clog('Battle.Cast(PowerBuff s, Unit u)'); }},
    {l:11, cap:'BOSS CUỐI CÙNG xuất hiện! HP = 100.', hold:800, fx(){
      spawn({kind:'boss',x:700,y:GROUND,face:-1,showHp:true,hp:100,maxHp:100,big:true});
      sfx.boss(); shakeMag=Math.max(shakeMag,7);
      ringFx(700,GROUND-40,'#f87171');
      clog('new Boss(100) => BOSS, HP: 100','bad'); }},
    {l:12, cap:'Archer xuất trận đối đầu boss (cung + balo tên).', hold:700, fx(){
      spawn({kind:'archer',x:300,y:GROUND,face:1,showHp:true,hasBow:true,hasArrow:true});
      clog('new Archer() => Archer, HP: 100, POWER: 30'); }},
    {l:13, cap:'a.Attack() - bắn tên vào boss (-30).', hold:1200, fx(){
      const a=entities.find(e=>e.kind==='archer');
      const z=entities.find(e=>e.kind==='boss');
      atk(a,'arrow',30,z);
      clog('a.Attack() => Boss: -30 (HP 70)','ok'); }},
    {l:14, cap:'z.Attack() - boss BẠN CHƯỞNG đánh trả! Archer chỉ còn 30 HP.', hold:1400, fx(){
      const a=entities.find(e=>e.kind==='archer');
      const z=entities.find(e=>e.kind==='boss');
      atk(z,'punch',70,a,.85,.45);
      clog('z.Attack() => Archer: -70 (HP 30) - nguy hiểm!','bad'); }},
    {l:15, cap:'new PowerBuff() - buff sức mạnh xuất hiện.', hold:700, fx(){
      spawn({kind:'potionpart',x:500,y:GROUND});
      sfx.pop();
      clog('new PowerBuff() => s, Power: 50'); }},
    {l:16, cap:'Battle b = new Battle() - sẵn sàng thi triển.', hold:400, fx(){}},
    {l:17, cap:'b.Cast(s, a): buff bay lên archer, TĂNG SỨC MẠNH ngay!', hold:500, fx:async function(){
      const p=entities.find(e=>e.kind==='potionpart');
      const a=entities.find(e=>e.kind==='archer');
      p.keep=true;   // buff KHONG tieu hao khi den: kem theo archer den khi tan bien
      p.to={e:a,ox:0,oy:-84};
      depLinkRef={a:p,b:a,t:0,col:'#f87171',text:'dùng tạm thời',openArrow:true,textOffX:-70};  // duong KEM THEO buff, tan bien DONG THOI
      links.push(depLinkRef);
      p.onArrive=()=>{
        // Buff hieu luc: POWER tang, vang vang vang KEM THEO archer
        a.power=50; a.buff=1;
        burst(a.x,a.y-50,'#ffd166',18,150);
        ringFx(a.x,a.y-50,'#ffd166');
        popup(a.x,a.y-110,'PWR +50','#ffd166');
        sfx.chime();
        clog('PowerBuff hieu luc: POWER 30 => 80, buff kem theo archer','ok');
        p.noLabel=true;
        p.fixed={e:a,ox:0,oy:-84};
      };
      await sleep(1600); }},
    {l:18, cap:'Cuối cùng: a BẮN PHÁT QUYỀN (POWER 80) - PowerBuff TẬN DIỆT cùng phát bắn, BOSS RƠI!', hold:500, fx:async function(){
      const a=entities.find(e=>e.kind==='archer');
      const z=entities.find(e=>e.kind==='boss');
      // Khoang chien si thanh cong: buff + duong dependency tan bien DONG THOI
      const p=entities.find(e=>e.kind==='potionpart');
      if(p){ burst(p.x,p.y-40,'#ffd166',10); p.dead=true; }
      if(depLinkRef&&links.indexOf(depLinkRef)>=0) links.splice(links.indexOf(depLinkRef),1);
      atk(a,'arrow',80,z,.9,.4,true);   // TEN QUYEN: phat ban manh nhat
      clog('PowerBuff tan bien het hieu luc, Boss: -80, BOSS DA ROI!','ok');
      await sleep(2200); }},
  ],
  demo(){ return sleep(1000); }
},

];
// Dong ky ten cuoi moi chuyen de: dong giu la 900ms de nguoi hoc nhan thay ro
STAGES.forEach(S=>{ S.script.push({l:S.lines.length-1, hold:900}); });
progressTotal=STAGES.reduce((a,S)=>a+S.lines.reduce((x,l)=>x+l.length,0),0);

/* ============================================================
   CHIPS / PROGRESS / DIRECTOR
   ============================================================ */
const chipsEl=$('#stage-chips'), badgeEl=$('#stage-badge');
function hexRgba(hex,a){
  const n=parseInt(hex.slice(1),16);
  return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;
}
STAGES.forEach((S,i)=>{
  const d=document.createElement('div');
  d.className='chip';
  d.style.setProperty('--sc',S.color);
  d.innerHTML=`<span class="num">0${i+1}</span>${S.name}`;
  d.addEventListener('click',()=>{ if(i!==currentStage) jumpToStage(i); });
  chipsEl.appendChild(d);
});
function setChips(idx){
  [...chipsEl.children].forEach((c,i)=>{
    c.classList.toggle('active',i===idx);
    c.classList.toggle('done',i<idx);
    c.querySelector('.num').innerHTML=i<idx?'<i class="fa-solid fa-check"></i>':'0'+(i+1);
  });
  badgeEl.textContent='0'+(idx+1)+' - '+STAGES[idx].name;
  badgeEl.style.background=hexRgba(STAGES[idx].color,.22);
  badgeEl.style.boxShadow='0 0 16px '+hexRgba(STAGES[idx].color,.5);
  capDot.style.background=STAGES[idx].color;
  capDot.style.color=STAGES[idx].color;
  capIco.style.color=STAGES[idx].color;
  $('#code-filename').textContent=STAGES[idx].file;
}
function resetChips(){
  [...chipsEl.children].forEach((c,i)=>{
    c.classList.remove('active','done');
    c.querySelector('.num').textContent='0'+(i+1);
  });
}
function updateProgress(){
  $('#progress-fill').style.width=clamp(progressDone/progressTotal*100,0,100)+'%';
}
function clearWorld(){
  entities=[]; projectiles=[]; particles=[]; popups=[]; slashes=[]; shields=[]; links=[];
  depLinkRef=null;
}
async function transition(gen){
  transTarget=1; await sleep(420);
  if(gen!==loopGen) return;
  clearWorld();
  transTarget=0; await sleep(420);
}
async function runStage(idx, fastLine=null){
  const gen=loopGen;
  const S=STAGES[idx];
  currentStage=idx;
  curStage=S;
  activeGen=gen;
  setChips(idx);
  buildCodeLines(S);
  setCaption('fa-file-code','Mở file '+S.file+' - quan hệ: '+S.name);
  clog('[ Mở file '+S.file+' ]');
  await sleep(750);
  if(gen!==loopGen) return;
  for(let i=0;i<S.lines.length;i++){
    if(gen!==loopGen) return;
    const step=S.script.find(s=>s.l===i);
    if(step&&step.cap) setCaption(S.icon,step.cap);
    if(step&&step.err) lineEls[i].classList.add('err');
    if(fastLine!=null && i<fastLine){
      // TUA (seek): hien dong ngay, chay hieu ung, khong go ky tu
      fastReveal(i);
      if(step&&step.fx){ const r=step.fx(); if(r&&r.then) await r; }
      await sleep(80);
    }else{
      await typeLine(i,step?26:16);
      if(gen!==loopGen) return;
      if(step){
        if(step.fx){ const r=step.fx(); if(r&&r.then) await r; }
        await sleep(step.hold??420);
      }
    }
  }
  if(gen!==loopGen) return;
  if(S.demo) await S.demo();
}
// Hien 1 dong code ngay lap tuc (khong go ky tu) - dung cho tua (seek) nhanh
function fastReveal(i){
  const el=lineEls[i];
  el.classList.remove('todo');
  if(!el.classList.contains('err')) el.classList.add('done');
  el.querySelector('code').innerHTML=renderTokens(curStage.toks[i]);
  progressDone+=curStage.lines[i].length;
  updateProgress();
}
// Chay tour tu stage startIdx. HET TOUR => DUNG LAI (ko tu dong replay),
// xoa het stickman, chi con man hinh VICTORY
async function runFrom(startIdx, fastToLine=null){
  const gen=loopGen;
  let idx=startIdx;
  for(;idx<STAGES.length;idx++){
    if(idx>startIdx) await transition(gen);
    if(gen!==loopGen) return;
    await runStage(idx, idx===startIdx?fastToLine:null);
    if(gen!==loopGen) return;
  }
  victoryT=0.0001;
  sfx.chime();
  await sleep(2800);
  if(gen!==loopGen) return;
  clearWorld();          // xoa het stickman canh cuoi
  victoryT=99;           // giu VICTORY dong gan
  finished=true;
}
function mainLoop(){
  const gen=++loopGen;
  finished=false;
  runFrom(0);
}
// Tua/nhay toi stage stageIdx, co the den den dong lineIdx (tuong tu keo timeline YouTube)
async function seekTo(stageIdx, lineIdx){
  const gen=++loopGen;
  paused=false; finished=false;
  $('#btn-pause i').className='fa-solid fa-pause';
  victoryT=0; shakeMag=0;
  resetChips();
  [...chipsEl.children].forEach((c,i)=>{
    c.classList.toggle('done',i<stageIdx);
    c.querySelector('.num').innerHTML=i<stageIdx?'<i class="fa-solid fa-check"></i>':'0'+(i+1);
  });
  progressDone=STAGES.slice(0,stageIdx).reduce((a,S)=>a+S.lines.reduce((x,l)=>x+l.length,0),0);
  if(lineIdx!=null) progressDone+=STAGES[stageIdx].lines.slice(0,lineIdx).reduce((a,l)=>a+l.length,0);
  updateProgress();
  setCaption('fa-forward','Đang tua tới 0'+(stageIdx+1)+' - '+STAGES[stageIdx].name+(lineIdx!=null?' (dòng '+(lineIdx+1)+'/'+STAGES[stageIdx].lines.length+')':''));
  transTarget=1;
  await sleep(240);
  if(gen!==loopGen) return;
  clearWorld();
  codeEl.innerHTML=''; lineEls=[];
  cEl.innerHTML='<div class="ttl">RUNTIME CONSOLE</div>';
  transTarget=0;
  await sleep(160);
  if(gen!==loopGen) return;
  runFrom(stageIdx, lineIdx!=null?lineIdx:null);
}
function jumpToStage(idx){ seekTo(idx,null); }
function restart(){
  loopGen++;
  paused=false; finished=false;
  $('#btn-pause i').className='fa-solid fa-pause';
  victoryT=0; transTarget=0; trans=0;
  shakeMag=0;
  clearWorld();
  resetChips();
  progressDone=0;
  updateProgress();
  codeEl.innerHTML='';
  lineEls=[];
  cEl.innerHTML='<div class="ttl">RUNTIME CONSOLE</div>';
  setCaption('fa-rotate-right','Đang khởi động lại từ đầu...');
  mainLoop();
}

/* ---------------- Controls ---------------- */
$('#btn-pause').addEventListener('click',()=>{
  paused=!paused;
  $('#btn-pause i').className='fa-solid '+(paused?'fa-play':'fa-pause');
});
$('#btn-restart').addEventListener('click',restart);
document.addEventListener('keydown',e=>{
  if(e.code==='Space'){ e.preventDefault(); $('#btn-pause').click(); }
});

/* ---------------- Timeline (kéo & nhảy như YouTube) ---------------- */
const progEl=$('#progress'), knobEl=$('#tl-knob'), bubEl=$('#tl-bubble');
let tlDragging=false, tlLastStage=-1;
function tlFrac(ev){
  const r=progEl.getBoundingClientRect();
  return clamp((ev.clientX-r.left)/r.width,0,1);
}
function tlStage(frac){ return clamp(Math.floor(frac*STAGES.length),0,STAGES.length-1); }
function tlPos(frac){
  const stage=tlStage(frac);
  const inStage=frac*STAGES.length-stage;
  const line=clamp(Math.floor(inStage*STAGES[stage].lines.length),0,STAGES[stage].lines.length-1);
  return {stage,line};
}
function tlShow(frac){
  const {stage,line}=tlPos(frac);
  knobEl.style.left=clamp(frac,0,1)*100+'%';
  bubEl.style.left=clamp(frac,.07,.93)*100+'%';
  bubEl.innerHTML='<b>0'+(stage+1)+'</b>'+STAGES[stage].name+' <span style="color:#93a0b8">dòng '+(line+1)+'/'+STAGES[stage].lines.length+'</span>';
  bubEl.classList.add('show');
}
function tlHide(){ bubEl.classList.remove('show'); }
progEl.addEventListener('pointerdown',ev=>{
  tlDragging=true; progEl.classList.add('drag');
  progEl.setPointerCapture(ev.pointerId);
  tlLastStage=-1;
  tlShow(tlFrac(ev));
});
progEl.addEventListener('pointermove',ev=>{
  if(!tlDragging) return;
  tlShow(tlFrac(ev));
  const {stage}=tlPos(tlFrac(ev));
  if(stage!==tlLastStage){   // keo qua ranh giới chuyen de => tua thuc theo
    tlLastStage=stage;
    seekTo(stage,null);
  }
});
progEl.addEventListener('pointerup',ev=>{
  if(!tlDragging) return;
  tlDragging=false; progEl.classList.remove('drag');
  const {stage,line}=tlPos(tlFrac(ev));
  if(stage!==currentStage||line>0) seekTo(stage,line);
  setTimeout(tlHide,400);
});
progEl.addEventListener('pointerleave',()=>{ if(!tlDragging) tlHide(); });
progEl.addEventListener('mouseenter',ev=>tlShow(tlFrac(ev)));

/* ---------------- Boot ---------------- */
fitCanvas();
requestAnimationFrame(frame);
mainLoop();
