/* ============================================================
   JOAQUIN'S ADVICE — title card
   Retro pixel menu: black bg, white text, yellow selection.
   Navigate with arrow keys / mouse. Confirm with Enter or Z.
   ============================================================ */

const settings = { textSpeed:'Normal', sound:true, scanlines:false };

/* ---------- tiny chiptune blips (Web Audio) ---------- */
let actx=null;
function audio(){ if(!actx){ try{ actx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return actx; }
function beep(freq, dur=0.06, type='square', vol=0.06){
  if(!settings.sound) return;
  const a=audio(); if(!a) return;
  const o=a.createOscillator(), g=a.createGain();
  o.type=type; o.frequency.value=freq;
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime+dur);
  o.connect(g).connect(a.destination);
  o.start(); o.stop(a.currentTime+dur);
}
const sMove   = ()=>beep(520,0.05,'square',0.05);
const sConfirm= ()=>{ beep(740,0.05,'square',0.06); setTimeout(()=>beep(990,0.07,'square',0.06),55); };
const sBack   = ()=>beep(300,0.07,'square',0.05);
const sToggle = ()=>beep(660,0.04,'square',0.05);

/* ---------- generic menu controller ---------- */
function Menu(el, items){
  this.el=el; this.items=items; this.index=0;
  this.draw=function(){
    el.innerHTML = items.map((it,i)=>{
      const sel = i===this.index ? 'sel':'';
      const opt = it.type==='option' ? 'option':'';
      let body = it.label;
      if(it.type==='option'){
        body = `<span class="opt-label">${it.label}</span><span class="val">${it.value()}</span>`;
      }
      return `<div class="item ${sel} ${opt}" data-i="${i}">
                <span class="pointer">&#9654;</span>${body}
              </div>`;
    }).join('');
    el.querySelectorAll('.item').forEach(node=>{
      const i=+node.dataset.i;
      node.addEventListener('mousemove',()=>{ if(this.index!==i){ this.index=i; this.draw(); sMove(); } });
      node.addEventListener('click',()=>{ this.index=i; this.activate(); });
    });
  };
  this.move=function(d){
    this.index=(this.index+d+items.length)%items.length;
    this.draw(); sMove();
  };
  this.horizontal=function(d){
    const it=items[this.index];
    if(it.type==='option' && it.change){ it.change(d); this.draw(); sToggle(); }
  };
  this.activate=function(){
    const it=items[this.index];
    if(it.type==='option'){ if(it.change){ it.change(1); this.draw(); sToggle(); } return; }
    sConfirm(); if(it.onSelect) it.onSelect();
  };
  this.draw();
}

/* ---------- screen management ---------- */
const screens={
  title:document.getElementById('titleScreen'),
  settings:document.getElementById('settingsScreen'),
  start:document.getElementById('startScreen'),
  game:document.getElementById('gameScreen'),
};
let current='title';
let activeMenu=null;

function show(name){
  Object.values(screens).forEach(s=>s.classList.add('hide'));
  screens[name].classList.remove('hide');
  current=name;
  if(name==='title'){ activeMenu=titleMenu; }
  if(name==='settings'){ activeMenu=settingsMenu; }
  if(name==='start'){ activeMenu=startMenu; }
  if(name!=='game'){ activeMenu.index=0; activeMenu.draw(); }
  updateHints();
}

/* ---------- the menus ---------- */
const titleMenu = new Menu(document.getElementById('titleMenu'), [
  { label:'Start',    onSelect:()=>show('start') },
  { label:'Settings', onSelect:()=>show('settings') },
  { label:'Quit',     onSelect:quit },
]);

const settingsMenu = new Menu(document.getElementById('settingsMenu'), [
  { label:'Text Speed', type:'option',
    value:()=>settings.textSpeed,
    change:(d)=>{ const o=['Slow','Normal','Fast']; let i=o.indexOf(settings.textSpeed); settings.textSpeed=o[(i+d+o.length)%o.length]; } },
  { label:'Sound', type:'option',
    value:()=>settings.sound?'On':'Off',
    change:(d)=>{ settings.sound=!settings.sound; } },
  { label:'Scanlines', type:'option',
    value:()=>settings.scanlines?'On':'Off',
    change:(d)=>{ settings.scanlines=!settings.scanlines; document.body.classList.toggle('scan',settings.scanlines); } },
  { label:'Back', onSelect:()=>{ sBack(); show('title'); } },
]);

const startMenu = new Menu(document.getElementById('startMenu'), [
  { label:'Continue', onSelect:()=>startGame() },
  { label:'Back',     onSelect:()=>{ sBack(); show('title'); } },
]);

/* ---------- quit ---------- */
let quitting=false;
function quit(){
  quitting=true;
  document.getElementById('blackout').classList.add('show');
  document.getElementById('hints').style.opacity=0;
}
function unquit(){
  quitting=false;
  document.getElementById('blackout').classList.remove('show');
  document.getElementById('hints').style.opacity=1;
}

/* ============================================================
   THE GAME — a client comes to Joaquin for advice.
   A scene plays in three phases:
     'intro'    — the client's problem types out
     'choosing' — the player picks a piece of advice
     'result'   — the consequence is revealed
   ============================================================ */

/* pixel portraits: '#' = lit pixel, anything else = empty. */
const FACE_MARA = [
  "..#####..",
  ".#######.",
  "#########",
  "#########",
  "##.###.##",
  "#########",
  "#########",
  "##.....##",
  ".#######.",
  "..#####..",
];

const scenes = [
  {
    name:"Mara",
    title:"first client",
    face:FACE_MARA,
    problem:"They offered me the job. Real money, another city. "+
            "But my father can't climb his own stairs anymore. "+
            "If I go, there's no one. Tell me what to do.",
    options:[
      { label:"Take the job. You can't pour from an empty cup.",
        result:"Mara takes the offer. Months later she sends money home, "+
               "and a nurse she could never have afforded otherwise. "+
               "She still flinches when the phone rings at night." },
      { label:"Stay. Some things you don't get a second chance at.",
        result:"Mara stays. Her father's last good year is spent with her. "+
               "The job goes to someone else, and some quiet evenings "+
               "she wonders who that someone became." },
      { label:"Don't decide for him. Ask your father first.",
        result:"She does. \"Go,\" he says, almost angry. \"I didn't raise you "+
               "to sit by my bed.\" Mara goes — and forgives herself a little, "+
               "because the choice was finally his too." },
    ],
  },
];

let sceneIndex=0;
let gamePhase='intro';          // 'intro' | 'choosing' | 'result'
let typeTimer=null;
let chosenOption=null;
let adviceMenu=null;

const $ = id => document.getElementById(id);

function renderPortrait(matrix){
  const cols = matrix[0].length;
  const host = $('portrait');
  host.style.gridTemplateColumns = `repeat(${cols},1fr)`;
  host.innerHTML = matrix.join('').split('')
    .map(ch => `<div class="px ${ch==='#'?'on':''}"></div>`).join('');
}

function typeProblem(text, done){
  const el = $('dialogue');
  const speed = settings.textSpeed==='Fast'?14 : settings.textSpeed==='Slow'?52 : 28;
  let i=0;
  el.innerHTML='<span class="caret">&nbsp;</span>';
  clearInterval(typeTimer);
  typeTimer=setInterval(()=>{
    i++;
    el.innerHTML = text.slice(0,i)+'<span class="caret">&nbsp;</span>';
    if(i%3===0) beep(420,0.012,'square',0.02);
    if(i>=text.length){ clearInterval(typeTimer); el.innerHTML=text; if(done) done(); }
  }, speed);
}

function finishTyping(scene){
  clearInterval(typeTimer);
  $('dialogue').innerHTML = scene.problem;
}

function startGame(){
  sceneIndex=0;
  show('game');
  loadScene(scenes[sceneIndex]);
}

function loadScene(scene){
  gamePhase='intro';
  chosenOption=null;
  $('dayHud').textContent = scene.title.toUpperCase();
  $('clientName').innerHTML = scene.name+`<span class="sub">${scene.title}</span>`;
  renderPortrait(scene.face);
  $('advicePrompt').classList.remove('show');
  $('adviceMenu').classList.add('hide');
  $('result').classList.add('hide');
  updateHints();
  typeProblem(scene.problem, ()=>toChoosing(scene));
}

function toChoosing(scene){
  gamePhase='choosing';
  $('advicePrompt').classList.add('show');
  const host=$('adviceMenu');
  host.classList.remove('hide');
  adviceMenu = new Menu(host, scene.options.map(opt=>({
    label:opt.label,
    onSelect:()=>chooseAdvice(scene,opt),
  })));
  activeMenu = adviceMenu;
  updateHints();
}

function chooseAdvice(scene,opt){
  chosenOption=opt;
  gamePhase='result';
  $('advicePrompt').classList.remove('show');
  $('adviceMenu').classList.add('hide');
  $('resultText').textContent = opt.result;
  $('result').classList.remove('hide');
  updateHints();
}

function advanceResult(){
  sConfirm();
  // single scene for now — return to the title.
  show('title');
}

function handleGameKey(e){
  if(gamePhase==='intro'){
    if(e.key==='Enter'||e.key==='z'||e.key==='Z'){ finishTyping(scenes[sceneIndex]); toChoosing(scenes[sceneIndex]); }
    e.preventDefault(); return;
  }
  if(gamePhase==='choosing'){
    switch(e.key){
      case 'ArrowUp': case 'w': case 'W': activeMenu.move(-1); break;
      case 'ArrowDown': case 's': case 'S': activeMenu.move(1); break;
      case 'Enter': case 'z': case 'Z': activeMenu.activate(); break;
    }
    e.preventDefault(); return;
  }
  if(gamePhase==='result'){
    if(e.key==='Enter'||e.key==='z'||e.key==='Z'){ advanceResult(); }
    e.preventDefault(); return;
  }
}

/* ---------- input ---------- */
window.addEventListener('keydown',(e)=>{
  if(quitting){
    if(e.key==='Enter'||e.key==='z'||e.key==='Z'||e.key==='x'||e.key==='X'){ unquit(); }
    e.preventDefault(); return;
  }
  if(current==='game'){ handleGameKey(e); return; }
  switch(e.key){
    case 'ArrowUp': case 'w': case 'W': activeMenu.move(-1); e.preventDefault(); break;
    case 'ArrowDown': case 's': case 'S': activeMenu.move(1); e.preventDefault(); break;
    case 'ArrowLeft': case 'a': case 'A': activeMenu.horizontal(-1); e.preventDefault(); break;
    case 'ArrowRight': case 'd': case 'D': activeMenu.horizontal(1); e.preventDefault(); break;
    case 'Enter': case 'z': case 'Z': activeMenu.activate(); e.preventDefault(); break;
    case 'x': case 'X': case 'Escape':
      if(current!=='title'){ sBack(); show('title'); } e.preventDefault(); break;
  }
});

/* ---------- footer hints ---------- */
function updateHints(){
  const h=document.getElementById('hints');
  const touch = matchMedia('(hover:none)').matches;
  if(touch){ h.innerHTML = `<b>tap</b> to choose`; return; }
  if(current==='game'){
    if(gamePhase==='intro')      h.innerHTML = `<b>Z / Enter</b> skip`;
    else if(gamePhase==='result')h.innerHTML = `<b>Z / Enter</b> continue`;
    else                         h.innerHTML = `<b>&#8597;</b> move &nbsp;&nbsp; <b>Z / Enter</b> give advice`;
    return;
  }
  if(current==='settings')
    h.innerHTML = `<b>&#8597;</b> move &nbsp;&nbsp; <b>&#8596;</b> change &nbsp;&nbsp; <b>Z</b> select &nbsp;&nbsp; <b>X</b> back`;
  else
    h.innerHTML = `<b>&#8597;</b> move &nbsp;&nbsp; <b>Z / Enter</b> select`;
}

/* ---------- typewriter tagline on title ---------- */
const taglineText = "an honest game about giving advice";
(function typeTag(){
  const el=document.getElementById('tagline');
  let i=0;
  el.innerHTML='<span class="caret">&nbsp;</span>';
  const speed=55;
  const t=setInterval(()=>{
    i++;
    el.innerHTML = taglineText.slice(0,i)+'<span class="caret">&nbsp;</span>';
    if(i>=taglineText.length){ clearInterval(t); }
  },speed);
})();

show('title');

/* ============================================================
   BREAKABLE TITLE — click a word to crack it like a block;
   keep clicking and it pops into a shower of pixels.
   ============================================================ */

/* white-noise burst for the explosion */
function noise(dur=0.2, vol=0.18){
  if(!settings.sound) return;
  const a=audio(); if(!a) return;
  const n=Math.floor(a.sampleRate*dur);
  const buf=a.createBuffer(1,n,a.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<n;i++){ d[i]=(Math.random()*2-1)*(1-i/n); }
  const src=a.createBufferSource(); src.buffer=buf;
  const g=a.createGain(); g.gain.setValueAtTime(vol,a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001,a.currentTime+dur);
  const f=a.createBiquadFilter(); f.type='lowpass';
  f.frequency.setValueAtTime(2400,a.currentTime);
  f.frequency.exponentialRampToValueAtTime(380,a.currentTime+dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(); src.stop(a.currentTime+dur);
}
const sHit = (stage)=>beep(Math.max(80,190-stage*16),0.07,'square',0.07);

/* ---- pixel particle system ---- */
const fxLayer = document.getElementById('fx');
let frags=[], fragRaf=null;
function spawnFrag(x,y,o={}){
  const el=document.createElement('div');
  el.className='frag';
  const size=o.size || (3+(Math.random()*5|0));
  el.style.width=size+'px'; el.style.height=size+'px';
  el.style.background=o.color||'#fff';
  fxLayer.appendChild(el);
  const ang=o.ang!==undefined?o.ang:Math.random()*Math.PI*2;
  const spd=o.spd!==undefined?o.spd:2+Math.random()*4;
  frags.push({el,x,y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd-(o.up||0),
              life:1,decay:o.decay||0.012});
  if(!fragRaf) fragRaf=requestAnimationFrame(tickFrags);
}
function tickFrags(){
  const g=0.22;
  for(let i=frags.length-1;i>=0;i--){
    const f=frags[i];
    f.vy+=g; f.x+=f.vx; f.y+=f.vy; f.life-=f.decay;
    if(f.life<=0 || f.y>innerHeight+40){ f.el.remove(); frags.splice(i,1); continue; }
    f.el.style.transform=`translate(${f.x}px,${f.y}px)`;
    f.el.style.opacity=Math.max(0,Math.min(1,f.life));
  }
  fragRaf = frags.length ? requestAnimationFrame(tickFrags) : null;
}

/* ---- crack texture (jagged SVG that spreads with each hit) ---- */
function makeCrack(w,h){
  let x=w*(0.3+Math.random()*0.4), y=h*(0.3+Math.random()*0.4), ang=Math.random()*Math.PI*2;
  const pts=[[x,y]], steps=4+(Math.random()*4|0);
  for(let i=0;i<steps;i++){
    ang+=(Math.random()-0.5)*1.3;
    x+=Math.cos(ang)*(w*0.18); y+=Math.sin(ang)*(h*0.32);
    pts.push([x,y]);
  }
  return pts.map(p=>p.map(Math.round).join(',')).join(' ');
}
function crackSVG(w,h,segs){
  const lines=segs.map(s=>`<polyline points='${s}' fill='none' stroke='black' stroke-width='2' stroke-linecap='square'/>`).join('');
  const svg=`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${Math.round(w)} ${Math.round(h)}' preserveAspectRatio='none'>${lines}</svg>`;
  return 'data:image/svg+xml;utf8,'+encodeURIComponent(svg);
}

/* ---- wire up each word ---- */
[...document.querySelectorAll('#title .word')].forEach(el=>{
  const crack=document.createElement('span');
  crack.className='crack';
  el.appendChild(crack);
  const w={ el, crackEl:crack, hits:0, max:6, cracks:[], gone:false };
  el.addEventListener('click', e=>hitWord(w,e));
});

function hitWord(w,e){
  if(w.gone) return;
  w.hits++;
  w.el.classList.remove('hit'); void w.el.offsetWidth; w.el.classList.add('hit');
  for(let i=0;i<5;i++)
    spawnFrag(e.clientX, e.clientY,
      {color:Math.random()<0.2?'#ffe900':'#fff', spd:1+Math.random()*3, up:2});
  const r=w.el.getBoundingClientRect();
  w.cracks.push(makeCrack(r.width,r.height), makeCrack(r.width,r.height));
  w.crackEl.style.backgroundImage=`url("${crackSVG(r.width,r.height,w.cracks)}")`;
  w.crackEl.style.opacity=Math.min(0.85, 0.18+w.hits*0.13);
  sHit(w.hits);
  if(w.hits>=w.max) explodeWord(w);
}

function explodeWord(w){
  w.gone=true;
  const r=w.el.getBoundingClientRect();
  for(let i=0;i<48;i++)
    spawnFrag(r.left+Math.random()*r.width, r.top+Math.random()*r.height,
      {color:Math.random()<0.25?'#ffe900':'#fff', size:3+(Math.random()*6|0),
       spd:3+Math.random()*6, up:3, decay:0.008});
  noise(0.22,0.2); beep(120,0.18,'square',0.08);
  w.el.classList.add('gone');
  setTimeout(()=>{
    w.hits=0; w.cracks=[]; w.gone=false;
    w.crackEl.style.opacity=0; w.crackEl.style.backgroundImage='';
    w.el.classList.remove('gone');
    w.el.classList.remove('hit'); void w.el.offsetWidth;
    w.el.classList.add('respawn');
    setTimeout(()=>w.el.classList.remove('respawn'),420);
  },1200);
}