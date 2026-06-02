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
      let right='';
      if(it.type==='option'){
        right = `<span class="arrows">&#9664;</span><span class="val">${it.value()}</span><span class="arrows">&#9654;</span>`;
      }
      return `<div class="item ${sel} ${opt}" data-i="${i}">
                <span class="pointer">&#9654;</span>${it.label}${right}
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
  activeMenu.index=0; activeMenu.draw();
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
  { label:'Continue', onSelect:()=>{ /* next scene goes here */ } },
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

/* ---------- input ---------- */
window.addEventListener('keydown',(e)=>{
  if(quitting){
    if(e.key==='Enter'||e.key==='z'||e.key==='Z'||e.key==='x'||e.key==='X'){ unquit(); }
    e.preventDefault(); return;
  }
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