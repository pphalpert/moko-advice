
/* ============================================================
   JOAQUIN'S ADVICE — title card
   Retro pixel menu: black bg, white text, yellow selection.
   Navigate with arrow keys / mouse. Confirm with Enter or Z.
   ============================================================ */

const settings = { textSpeed:'Normal', volume:70, musicVol:70, music:true, scanlines:false, glasses:false };
/* the Power Goggles — unlocked forever by the secret ending */
let glassesUnlocked = false;
try{
  glassesUnlocked  = localStorage.getItem('joa_glasses')==='1';
  settings.glasses = localStorage.getItem('joa_glasses_on')==='1';
}catch(e){}
function applyGlasses(){ document.body.classList.toggle('glasses', glassesUnlocked && settings.glasses); }

/* ---------- tiny chiptune blips (Web Audio) ---------- */
let actx=null;
function audio(){
  if(!actx){ try{ actx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
  // browsers start the context suspended until a user gesture — keep nudging it awake
  if(actx && actx.state==='suspended'){ actx.resume().catch(()=>{}); }
  return actx;
}
// one-time unlock: the first real click/tap/keypress wakes the audio context
function unlockAudio(){ audio(); if(musicWanted) startMusic(); }
['pointerdown','keydown','touchstart'].forEach(ev=>
  window.addEventListener(ev, unlockAudio, { once:false, passive:true }));

/* ---------- title / menu music ----------
   Plays on the menu screens, pauses during the game, and follows
   the Sound slider. Autoplay is blocked until the first gesture,
   so unlockAudio() above kicks it off the moment you interact. */
const bgm = document.getElementById('bgm');
let musicWanted = false;                 // should music be playing right now?
let musicDuck = 1;                       // dips below 1 while a voiceline speaks
function musicVolume(){ return Math.max(0, Math.min(1, settings.musicVol/100)) * musicDuck; }
function duckMusic(f){ musicDuck = f; applyVolume(); }
function applyVolume(){
  if(bgm) bgm.volume = musicVolume();
  if(sceneAudio) sceneAudio.volume = musicVolume();
}
function startMusic(){
  musicWanted = true;
  if(!bgm || !settings.music) return;    // Music toggle off -> stay silent
  applyVolume();
  const p = bgm.play();
  if(p && p.catch) p.catch(()=>{});      // blocked until a gesture — retried on unlock
}
function stopMusic(){ musicWanted = false; if(bgm) bgm.pause(); }
// Settings toggle: flip music on/off without leaving the current screen
function setMusic(on){
  settings.music = on;
  if(on){ startMusic(); resumeSceneMusic(); }   // resumes whichever channel is wanted
  else { if(bgm) bgm.pause(); if(sceneAudio) sceneAudio.pause(); }
}

/* ---------- scene music (character themes & cutscene tracks) ----------
   A second channel beside the title bgm. Every track is OPTIONAL: point it
   at a file and it plays if the file exists, stays silent if it doesn't.
   - character themes: auto-tries music/characters/<Name>.mp3, or set a
     `music:` field on the character to override
   - cutscenes: music/intro.mp3, music/ending_normal.mp3, music/ending_secret.mp3 */
let sceneAudio=null, sceneWanted=null;   // sceneWanted = src that should be playing now
function playSceneMusic(src){
  sceneWanted = src;
  if(!src){ if(sceneAudio) sceneAudio.pause(); return; }
  if(!sceneAudio){ sceneAudio=new Audio(); sceneAudio.loop=true; }
  if(!sceneAudio.src.endsWith(encodeURI(src))) sceneAudio.src = encodeURI(src);
  sceneAudio.volume = musicVolume();
  if(!settings.music) return;            // wanted, but the toggle is off
  const p=sceneAudio.play(); if(p&&p.catch) p.catch(()=>{});   // missing file -> silent
}
function stopSceneMusic(){ sceneWanted=null; if(sceneAudio) sceneAudio.pause(); }
function resumeSceneMusic(){ if(sceneWanted) playSceneMusic(sceneWanted); }
function charMusicFor(sp){ return sp ? (sp.music || 'music/characters/'+sp.name+'.mp3') : null; }

/* one-shot sound effect from a file, with a synth fallback if the file is missing */
function playSfx(src, fallback){
  if(settings.volume<=0) return;
  let fell=false; const fb=()=>{ if(!fell){ fell=true; if(fallback) fallback(); } };
  try{
    const a=new Audio(encodeURI(src));
    a.volume = Math.max(0, Math.min(1, settings.volume/100));
    a.onerror = fb;
    const p=a.play(); if(p&&p.catch) p.catch(fb);
  }catch(e){ fb(); }
}
function beep(freq, dur=0.06, type='square', vol=0.06){
  if(settings.volume<=0) return;
  const a=audio(); if(!a) return;
  const v=vol*(settings.volume/100);          // scale by the 0-100 slider
  const o=a.createOscillator(), g=a.createGain();
  o.type=type; o.frequency.value=freq;
  g.gain.setValueAtTime(v, a.currentTime);
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
      node.addEventListener('click',(ev)=>{ if(ev.target.closest('.slider')) return; this.index=i; this.activate(); });
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
  pass:document.getElementById('passScreen'),
  title:document.getElementById('titleScreen'),
  settings:document.getElementById('settingsScreen'),
  slots:document.getElementById('slotsScreen'),
  name:document.getElementById('nameScreen'),
  opening:document.getElementById('openingScreen'),
  end:document.getElementById('endScreen'),
  gameover:document.getElementById('gameOverScreen'),
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
  if(name!=='game' && name!=='name' && name!=='opening' && name!=='end' && name!=='pass'){ activeMenu.index=0; activeMenu.draw(); }
  if(name==='name'){
    nameInput.value = playerName;
    setTimeout(()=>{ nameInput.focus(); nameInput.select(); }, 0);
  }
  if(name==='pass'){
    passInput.value='';
    setTimeout(()=>passInput.focus(), 0);
  }
  if(name==='opening'){ openingIndex=0; renderOpening(); }
  if(name==='end'){ renderEnd(); }
  // menus play the title theme; the opening plays intro music; endings set
  // their own track; in-game music is per-character (handled by the gate)
  if(name==='pass'){ stopMusic(); }      // silence at the door
  else if(name==='opening'){ stopMusic(); }   // the panels pick their own tracks
  else if(name==='end'){ stopMusic(); }
  else if(name==='game' || name==='gameover'){ stopMusic(); stopSceneMusic(); }
  else { stopSceneMusic(); startMusic(); }
  updateHints();
}

/* ---------- the password gate ---------- */
const GAME_PASSWORD = 'moocow111';
const passInput = document.getElementById('passInput');
function submitPassword(){
  if(passInput.value === GAME_PASSWORD){
    try{ localStorage.setItem('joa_pass','1'); }catch(e){}
    sConfirm(); passInput.blur(); show('title');
  } else {
    sError(); passInput.value='';
    passInput.placeholder = 'wrong password';
  }
}

/* ---------- the menus ---------- */
const titleMenu = new Menu(document.getElementById('titleMenu'), [
  { label:'Start',    onSelect:()=>show('name') },
  { label:'Load',     onSelect:()=>openSlots('load','title') },
  { label:'Settings', onSelect:()=>{ settingsFrom='title'; show('settings'); } },
  { label:'Quit',     onSelect:quit },
]);

let settingsMenu = null;
function buildSettingsMenu(){
settingsMenu = new Menu(document.getElementById('settingsMenu'), [
  { label:'Text Speed', type:'option',
    value:()=>settings.textSpeed,
    change:(d)=>{ const o=['Slow','Normal','Fast']; let i=o.indexOf(settings.textSpeed); settings.textSpeed=o[(i+d+o.length)%o.length]; } },
  { label:'Sound', type:'option',
    value:()=>`<span class="slider" data-vol="volume"><span class="fill" style="width:${settings.volume}%"></span></span><span class="num">${settings.volume}</span>`,
    change:(d)=>{ settings.volume = Math.max(0, Math.min(100, settings.volume + d*5)); applyVolume(); } },
  { label:'Music', type:'option',
    value:()=>`<span class="slider" data-vol="musicVol"><span class="fill" style="width:${settings.musicVol}%"></span></span><span class="num">${settings.musicVol}</span>`,
    change:(d)=>{ settings.musicVol = Math.max(0, Math.min(100, settings.musicVol + d*5)); applyVolume(); } },
  { label:'Scanlines', type:'option',
    value:()=>settings.scanlines?'On':'Off',
    change:(d)=>{ settings.scanlines=!settings.scanlines; document.body.classList.toggle('scan',settings.scanlines); } },
  ...(glassesUnlocked ? [{ label:'Glasses', type:'option',
    value:()=>settings.glasses?'On':'Off',
    change:(d)=>{ settings.glasses=!settings.glasses;
      try{ localStorage.setItem('joa_glasses_on', settings.glasses?'1':'0'); }catch(e){}
      applyGlasses(); } }] : []),
  { label:'Back', onSelect:()=>{ backFromSettings(); } },
]);
}
buildSettingsMenu();
applyGlasses();

/* ---------- draggable volume slider (mouse / touch) ----------
   Click or hold-and-drag the bar to set the volume. Pushing past
   either end simply clamps to 0 or 100. */
(function(){
  const wrap = document.getElementById('settingsMenu');
  const rowForKey = { volume:'Sound', musicVol:'Music' };
  let rect = null, key = 'volume', lastTick = -999;
  function apply(clientX){
    if(!rect) return;
    const pct = (clientX - rect.left) / rect.width * 100;
    const v = Math.max(0, Math.min(100, Math.round(pct)));   // clamp, never wraps
    if(v !== settings[key]){
      settings[key] = v;
      applyVolume();                                                // live volume
      const idx = settingsMenu.items.findIndex(it=>it.label===rowForKey[key]);
      if(idx >= 0) settingsMenu.index = idx;
      settingsMenu.draw();
      if(Math.abs(v - lastTick) >= 10){ lastTick = v; sToggle(); }  // throttled scrub tick
    }
  }
  wrap.addEventListener('pointerdown', e=>{
    const slider = e.target.closest('.slider');
    if(!slider) return;
    e.preventDefault();
    key = slider.dataset.vol || 'volume';
    rect = slider.getBoundingClientRect();           // stable: fixed-width layout
    lastTick = -999;
    apply(e.clientX);
    const move = ev=>{ ev.preventDefault(); apply(ev.clientX); };
    const up = ()=>{
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      rect = null; sToggle();                        // tick at release
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
})();

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
   THE GAME — the gate between purgatory and heaven.
   A spirit walks in from the tunnel to the gate, states its
   case, and you APPROVE or DENY. A result line follows, then the
   next spirit approaches. (All text/art here are PLACEHOLDERS.)
   Loop phases: 'walking' -> 'plea' -> 'decided'
   ============================================================ */
const $ = id => document.getElementById(id);

/* ---- resumable typewriter (shared; pause can freeze it) ---- */
let typeTimer=null, typeState=null;
function runType(){
  clearInterval(typeTimer);
  if(!typeState) return;
  typeTimer=setInterval(()=>{
    const ts=typeState; if(!ts){ clearInterval(typeTimer); return; }
    ts.i++;
    ts.el.innerHTML = ts.text.slice(0,ts.i)+'<span class="caret">&nbsp;</span>';
    if(ts.i%3===0) beep(420,0.012,'square',0.02);
    convoScroll();
    if(ts.i>=ts.text.length){
      clearInterval(typeTimer);
      ts.el.textContent=ts.text;
      const d=ts.done; typeState=null; if(d) d();
    }
  }, typeState.speed);
}
function typeInto(el, text, done){
  const speed = settings.textSpeed==='Fast'?14 : settings.textSpeed==='Slow'?52 : 28;
  el.innerHTML='<span class="caret">&nbsp;</span>';
  typeState = { text, i:0, speed, done, el };
  runType();
}
function finishTyping(){                  // complete the current line instantly
  if(!typeState) return;
  clearInterval(typeTimer);
  const {el,text,done}=typeState; typeState=null;
  el.textContent=text; if(done) done();
}
function pauseType(){ clearInterval(typeTimer); }
function resumeType(){ if(typeState) runType(); }

/* ---- elements ---- */
const walker = $('walker');
const zPortrait = $('zPortrait');
const btnYes = $('btnYes'), btnNo = $('btnNo');       // APPROVE / DENY (now in the rules area)
const opt1 = $('opt1'), opt2 = $('opt2');             // dialogue options (the two middle buttons)
const zRules = $('zRules'), rulesOverlay = $('rulesOverlay');

/* ---- conversation log (the scrollable centre box) ----
   Accumulates the spirit's lines, the player's chosen dialogue, the decision
   and the verdict. Auto-scrolls to the newest line; the player can scroll up. */
const convo = $('convo');
let convoStick = true;   // keep pinned to the bottom unless the player scrolls up
if(convo) convo.addEventListener('scroll', ()=>{
  convoStick = (convo.scrollHeight - convo.scrollTop - convo.clientHeight) < 24;
});
function convoScroll(){ if(convo && convoStick) convo.scrollTop = convo.scrollHeight; }
function clearConvo(){ if(convo) convo.innerHTML=''; convoStick=true; }
function addMsg(cls, text, typed, done){
  if(!convo) return null;
  const el=document.createElement('div');
  el.className='msg '+cls;
  convo.appendChild(el);
  convoStick=true;                       // a fresh line -> snap to the bottom
  if(typed){ typeInto(el, text, ()=>{ convoScroll(); if(done) done(); }); }
  else { el.textContent=text; convoScroll(); if(done) done(); }
  return el;
}
function addSpirit(text, done){ return addMsg('spirit', text, true, done); }
function addYou(text){ addMsg('you', text, false); }

/* ---- spirit roster (each character: name, good/bad, dialogue tree) ----
   Dialogue node: { text: what the spirit says, opts:[{label: the player's line, to: nextKey}] }.
   An empty `opts` is a leaf — the conversation ends there and you must judge
   (or spend a Reset powerup to explore the other branches).
   GOLDEN TICKET: add `ticketWinner: true` to the ONE spirit who should trigger the
   secret cutscene when given the ticket. Everyone else triggers the wrong-person line. */
const SPIRITS_DAY1 = [
  {
    name: "Bridget",
    good: false,   // alignment guesses below are placeholders — set them to your real intent
    sprite: "art/bridget.png",
    dialogue: {
      start: { text:"Ugh, my hair smells like weed. Just let me through already.", opts:[
        { label:"Sorry, can you tell me more about what you were like when you were alive?", to:"alive" },
        { label:"I wish I could, but I can't really leave my post.", to:"post" },
      ]},
      alive: { text:"I was the wisest there was. I could convince anyone of anything.", opts:[
        { label:"What was your greatest debate?", to:"debate" },
        { label:"Ok, ok, let's stay on track. What's your proudest achievement?", to:"debate" },
      ]},
      post: { text:"Oh, you're right. All that walking would give me whiplash.", opts:[
        { label:"What was the biggest fight you've ever been in?", to:"fight" },
      ]},
      debate: { text:"I convinced a man he wasn't a man.", opts:[] },
      fight:  { text:"I'd rather not talk about it. I lost a duel I thought I had won.", opts:[] },
    },
  },
  {
    name: "Rachel George",
    good: true,
    sprite: "art/rachel_george.png",
    dialogue: {
      start: { text:"Yo, what's up I'm dead-ass craving fries right now. Let's deadass go pick up some fries.", opts:[
        { label:"I can't leave my post, sorry.", to:"conform" },
        { label:"Fries? From where?", to:"where" },
      ]},
      conform: { text:"Like, deadass? Why are you conforming to the man? Stand up for yourself, deadass.", opts:[
        { label:"Okay, okay. How are we even going to get there?", to:"drive" },
        { label:"No, I'm not going to do that, Jesus.", to:"crazy" },
      ]},
      where: { text:"McDonald's, obviously. You in or you out, sucker?", opts:[
        { label:"No, I'm not going to do that, Jesus.", to:"crazy" },
        { label:"Okay, okay. How are we even gonna get there?", to:"drive" },
      ]},
      drive: { text:"Do I look like I drive? I have a six five barbarian that does it for me.", opts:[] },
      crazy: { text:"Okay, now that you say that, I'm gonna go crazy for the next year and a half and post crazy shit online, so thanks a lot!", opts:[] },
    },
  },
  {
    name: "Frida",
    good: true,
    sprite: "art/frida.png",
    dialogue: {
      start: { text:"Do you smell that? It smells like up dog in here", opts:[
        { label:"What? What's up, dawg?", to:"lick" },
        { label:"I'm not falling for this.", to:"climber" },
      ]},
      lick: { text:"BAHAHAHA!!! I got you! Okay, okay, no more goofing around. Give me a LICK.", opts:[
        { label:"What are you talking about. I'm not gonna let you lick me.", to:"permission" },
        { label:"What are you, a pervert?", to:"pervert" },
      ]},
      climber: { text:"I'm literally a professional mountain climber. I don't have time to make silly jokes; just answer me", opts:[
        { label:"What are you, a pervert?", to:"pervert" },
        { label:"Fine. What's up, dawg", to:"lick" },
      ]},
      permission: { text:"Did I ask for permission...", opts:[] },
      pervert: { text:"If loving licks means I'm a pervert, then call me (BLEEP).", opts:[] },
    },
  },
  {
    name: "Tomo",
    good: true,
    sprite: "art/tomo.png",
    dialogue: {
      start: { text:"I'm Fast as fuck, boy. You can wash dishes on my shit.", opts:[
        { label:"What sports do you play?", to:"dontplay" },
        { label:"Does your shit refer to your bicep or your abs?", to:"both" },
      ]},
      dontplay: { text:"It's better to ask me what sports I don't play.", opts:[
        { label:"Okay, so what sports don't you play?", to:"list" },
        { label:"Okay, I get it. You play sports.", to:"feelings" },
      ]},
      both: { text:"Both. You should call me the Great Wall. Nothing got by me.", opts:[
        { label:"Okay, I get it. You play sports.", to:"feelings" },
        { label:"So you play defense?", to:"defense" },
      ]},
      list: { text:"Ice skating. dance. Water polo. Basketball the decathlon. Boxing. Chess... ok so maybe a few", opts:[] },
      feelings: { text:"I'm not one-dimensional though. I have feelings, you know? Behind these rock-hard abs and these fat-ass muscles, there's a real human being, you motherfucker.", opts:[] },
      defense: { text:"Yeah, I mean, it was supposed to be kind of a riddle, but a little on the nose, huh. But yeah, I play soccer. You happy with that, huh?", opts:[] },
    },
  },
  {
    name: "Nico",
    good: true,
    sprite: "art/nico.png",
    dialogue: {
      start: { text:"Oh bro, can you hear me? Am I muted I'm muted. Can you hear me?", opts:[
        { label:"Yeah, I can hear you. We're not in a voice chat.", to:"heal" },
        { label:"No, I can't hear you at all.", to:"resetmic" },
      ]},
      heal: { text:"BROOO, just heal me, Jesus Christ", opts:[
        { label:"Nothing you say is related to what I'm saying. I think I might be muted.", to:"swap" },
        { label:"Okay, are you like perpetually stuck in a Discord call?", to:"squeaker" },
      ]},
      resetmic: { text:"Oh damn. Okay, let me reset my mic glad we're in the soviet call. And not that STUPID other voice chat.", opts:[
        { label:"Okay, are you like perpetually stuck in a Discord call?", to:"squeaker" },
        { label:"You good? You seem kind of angry.", to:"things" },
      ]},
      swap: { text:"Want me to swap Zarya? I can play hitscan too. My ults are dirty. And fuck Ian.", opts:[] },
      squeaker: { text:"Dude, you're actually starting to piss me off because you're a squeaker. You're a squeaker. You're a kid. You're a squeaker.", opts:[] },
      things: { text:"I know. I know I just been going through some things. Now, I used to have a personal boxing coach. And sadly, he's not with us. I don't want to talk about it.", opts:[] },
    },
  },
  {
    name: "Michael Oh",
    good: true,
    sprite: "art/michael.png",
    dialogue: {
      start: { text:"Fee-fi-fo-fum. Let me in, you dum dum dum!", opts:[
        { label:"So you're supposed to be a giant.", to:"illusion" },
        { label:"If you insult me, I'm not gonna let you in", to:"drive" },
      ]},
      illusion: { text:"Aight, cool bro, just break the illusion. It's not like I was trying to be a character or something.", opts:[
        { label:"Okay, yo, my bad. Bro you seem hella chill.", to:"chill" },
        { label:"Yoo sorry sorry. Didn't mean to be an ass.", to:"boyit" },
      ]},
      drive: { text:"Yo my bad. Let's just go for a drive. And talk it out.", opts:[
        { label:"Yoo sorry sorry. Didn't mean to be an ass.", to:"boyit" },
        { label:"I'm actually down. What do u drive?", to:"syringe" },
      ]},
      chill: { text:"Nah it's cool. Let's just boy it up.", opts:[] },
      boyit: { text:"All cool bro. We can just boy it up.", opts:[] },
      syringe: { text:"My dad's old car, it's like a giant syringe or some. I'm using it to drive to work.", opts:[] },
    },
  },
  {
    name: "Stu",
    good: true,
    sprite: "art/stu.png",
    dialogue: {
      start: { text:"Hi. I love beef STEW! I love to write with a PEN ANd stuff. I hate kayaking, but you have to let ROWS through/", opts:[
        { label:"Huh? What? What are you talking about?", to:"cant" },
        { label:"This seems like it breaks the rules of God or something.", to:"no" },
      ]},
      cant: { text:"Can't elaborate. He's listening but dear GOD, you have to let XYZ through, for the love of GOD, please.", opts:[
        { label:"I can't even tell who you're talking about. The name is all mangled up", to:"mangled" },
        { label:"OK, you're scaring me. I'm gonna tell God.", to:"sorry" },
      ]},
      no: { text:"No, no, it doesn't. I just love beef STEW, and I write with a PEN ANd stuff, right?", opts:[
        { label:"OK, you're scaring me. I'm gonna tell God.", to:"sorry" },
        { label:"Ok, ok, it's a little on the nose. Can you explain what's happening?", to:"stand" },
      ]},
      mangled: { text:"Okay, just let me through, but when the sapling of my tree comes, LET THEM IN.", opts:[] },
      sorry: { text:"Ok, ok, ok. I'm sorry. Let's just take this from step one. Hi, I like beef stew. Let me through, and when my sapling comes along. Just let em by.", opts:[] },
      stand: { text:"He's definitely listening, so I can't say much but... If you want anything to change, you need to take a stand. Let my sapling through.", opts:[] },
    },
  },
  {
    name: "Rose",
    good: false,
    sprite: "art/rose.png",
    dialogue: {
      start: { text:"Hiiiii, I think you're supposed to let me in or something", opts:[
        { label:"Wait, what? I need to evaluate you first.", to:"ugh" },
        { label:"So sorry, go right through.", to:"perf" },
      ]},
      ugh: { text:"Uggghhhhh. JUST. let. me. innnnnnn.... You told me you would let me innn!", opts:[
        { label:"Sorry, I-. just. please. Give me a bone, like, what did you do in the past? give me something.", to:"marty" },
        { label:"Okay, first answer this one question real quick. Are you related to that beef stew I saw earlier?", to:"secret" },
      ]},
      perf: { text:"Perfff.. Alright, I'll be going through right now. Let me in. Approve me.", opts:[
        { label:"Okay, first answer this one question real quick. Are you related to that beef stew I saw earlier?", to:"secret" },
        { label:"Of course, of course, yeah, yeah, yeah, I will. Will do.", to:"approve" },
      ]},
      marty: { text:"UGHHHHHH. I drive my car in two lanes! Call me MARTY, but I ain't fly. I eat err up like purr, like GRAH!", opts:[] },
      secret: { text:"Let. Me. In. I know about your secret. Code brown. Let me in or else.", opts:[] },
      approve: { text:"Uhh. so. approve me.", opts:[] },
    },
  },
  {
    name: "Natalie Carey",
    good: false,
    sprite: "art/natalie.png",
    dialogue: {
      start: { text:"Hey, do you know where Will is?", opts:[
        { label:"What? Will Jaffee?", to:"blocked" },
        { label:"No, I need to talk to you. It's my job.", to:"groupchat" },
      ]},
      blocked: { text:"Yeah, he blocked me and won't answer any of my texts.", opts:[
        { label:"Didn't you guys break up?", to:"dating" },
        { label:"Uhh... sorry it's not up to me.", to:"allmen" },
      ]},
      groupchat: { text:"Well can you at least add me to the group chat?", opts:[
        { label:"Uhh... sorry it's not up to me.", to:"allmen" },
        { label:"I'll check later...", to:"invite" },
      ]},
      dating: { text:"No, that was last week. We started dating again yesterday.", opts:[] },
      allmen: { text:"Ughhhhh! All men suck.", opts:[] },
      invite: { text:"You guys never invite me to anything!", opts:[] },
    },
  },
];

/* ---- DAY 2 roster ---- */
const SPIRITS_DAY2 = [
  {
    name: "Keira",
    good: true,
    denyGameOver: true,   // denying Keira is an automatic game over
    sprite: "art/Keira.png",
    dialogue: {
      start: { text:"Hi", opts:[
        { label:"Hi! How are you.", to:"day1" },
        { label:"Hi. I was waiting for you.", to:"day2" },
      ]},
      day1: { text:"How was your day?", opts:[
        { label:"A little stressful.", to:"hope" },
        { label:"It's going well! It's hard work but it's fun.", to:"glad" },
      ]},
      day2: { text:"I know. How was your day?", opts:[
        { label:"It's going well! It's hard work but it's fun.", to:"glad" },
        { label:"A little stressful.", to:"hope" },
      ]},
      hope: { text:"I hope ur doing ok! I believe in you.", opts:[] },
      glad: { text:"You have a good heart, I trust you. Here, take this. I can't say much but remember: Blood thicka than water.", opts:[], grantTicket:true },
    },
  },
  {
    name: "Joner",
    good: true,
    sprite: "art/joner.png",
    music: "music/characters/Jonah.mp3",
    dialogue: {
      start: { text:"HEEET LUUUU. BEET LUUUU. GUMIIIII. CANDIIIIIII.", opts:[
        { label:"oh god.", to:"valid" },
        { label:"uhh are you ok?", to:"faces" },
      ]},
      valid: { text:"VALID GIRL SPOTTED.", opts:[
        { label:"You sound fucking insane.", to:"w12" },
        { label:"I hate those people that make a charity just to get in to college.", to:"offensive" },
      ]},
      faces: { text:"*makes funny faces*", opts:[
        { label:"I hate those people that make a charity just to get in to college.", to:"offensive" },
        { label:"You know. You went to an ivy league institution. have you not outgrown funny faces?", to:"goon" },
      ]},
      w12: { text:"The next 12 hours could be such a W.", opts:[] },
      offensive: { text:"Actually, that's kind of offensive. I'm really trying to make a change in this world. Which you aren't doing.", opts:[] },
      goon: { text:"GOON CAVE. GOON CAVE. GOON CAVE. (this isn't me i'm being controlled)", opts:[] },
    },
  },
  {
    name: "Robert Luceno",
    good: false,
    sprite: 'art/RobLuceno.png',
    dialogue: {
      start: { text:"You want to be my friend.", opts:[
        { label:"no.", to:"whynot" },
        { label:"yes.", to:"aww" },
      ]},
      whynot: { text:"Why not?", opts:[
        { label:"Because you're a stranger.", to:"strangers" },
        { label:"Uhh you seem weird.", to:"frowns" },
      ]},
      aww: { text:"Awww, do you want to join my group", opts:[
        { label:"Uhh you seem weird.", to:"frowns" },
        { label:"YUP!", to:"sick" },
      ]},
      strangers: { text:"strangers are just friends you've never met.", opts:[] },
      frowns: { text:"*frowns*", opts:[] },
      sick: { text:"Sick, it's called Extreme Peach, and we make sure that no one is ever lonely.", opts:[] },
    },
  },
  {
    name: "Andre Seder",
    good: false,
    sprite: "art/andre.png",
    dialogue: {
      start: { text:"¡Odio a los estadounidenses!", opts:[
        { label:"uhh excuse me?", to:"propaganda" },
        { label:"wait what. why?", to:"insultado" },
      ]},
      propaganda: { text:"¡AMÉRICA ESTÁ DIFUNDIENDO SU PROPAGANDA LIBERAL POR TODAS PARTES!", opts:[
        { label:"I don't understand you at all. can u speak english please?", to:"hate" },
        { label:"Got it, got it. Do you like anything about America?", to:"skyzone" },
      ]},
      insultado: { text:"¡Han insultado a los grandes sistemas capitalistas!", opts:[
        { label:"Got it, got it. Do you like anything about America?", to:"skyzone" },
        { label:"Awesome, way to get political", to:"political" },
      ]},
      hate: { text:"I hate America, due to their constant political noise that pollutes my great country of Brazil.", opts:[] },
      skyzone: { text:"Yeah I went to skyzone one time. was pretty sick.", opts:[] },
      political: { text:"i mean yeah... that's sorta my thing now.", opts:[] },
    },
  },
  {
    name: "Luke Ross",
    good: true,
    sprite: "art/ULukeR.png",
    dialogue: {
      start: { text:"The sky is falling!", opts:[
        { label:"uhh are you high?", to:"stoner" },
        { label:"should I be worried?", to:"protection" },
      ]},
      stoner: { text:"No, I just wear baggy stoner clothes; tight clothes trigger me", opts:[
        { label:"I'm starting to think you're insane.", to:"crushed" },
        { label:"Okay, thats fair", to:"phew" },
      ]},
      protection: { text:"Its alright, we both have eye protection!", opts:[
        { label:"Okay, thats fair", to:"phew" },
        { label:"Don't scare me like that", to:"legos" },
      ]},
      crushed: { text:"I'm insane until you get crushed by the sky", opts:[] },
      phew: { text:"Phew!", opts:[] },
      legos: { text:"Building legos will calm you down", opts:[] },
    },
  },
  {
    name: "Sophie",
    good: true,
    sprite: "art/sophie.png",
    dialogue: {
      start: { text:"Want me to draw your portrait?", opts:[
        { label:"Yeah sure!", to:"peace" },
        { label:"Is this another scam?", to:"cow" },
      ]},
      peace: { text:"Okay, great, just make a peace sign and take some deep breaths", opts:[
        { label:"This feels like an anime", to:"anime" },
        { label:"Alright, I'll trust you...", to:"sit" },
      ]},
      cow: { text:"No, if it was, I'd draw you as a purple cow", opts:[
        { label:"Alright, I'll trust you...", to:"sit" },
        { label:"Hey are you ok? You seem kind of sad", to:"nodraw" },
      ]},
      anime: { text:"Its pronounced \"ah-nee-me\"", opts:[] },
      sit: { text:"Great! Sit tight.", opts:[] },
      nodraw: { text:"You know what, I didn't want to draw you anyway.", opts:[] },
    },
  },
  {
    name: "Martin A",
    good: false,
    sprite: "art/UAyala.png",
    dialogue: {
      start: { text:"I saw something.", opts:[
        { label:"What'd you see.", to:"didntlook" },
        { label:"Who'd you see?", to:"man" },
      ]},
      didntlook: { text:"I didn't look away.", opts:[
        { label:"Got it. Cool. Just hella vague-post.", to:"vague" },
        { label:"What are you talking about?", to:"ethan" },
      ]},
      man: { text:"I saw the man.", opts:[
        { label:"What are you talking about?", to:"ethan" },
        { label:"Aight bros, just keep VEG posting", to:"vague" },
      ]},
      vague: { text:"I don't know. I saw it. I'm sorry for the vague posting.", opts:[] },
      ethan: { text:"Ethan. I saw it. All of it.", opts:[] },
    },
  },
  {
    name: "Ian",
    good: true,
    sprite: 'art/Ian.png',
    dialogue: {
      start: { text:"Hola HJoaquin!", opts:[
        { label:"Hey man how's it going", to:"prettybad" },
        { label:"Never speak to me unless spoken to", to:"erm" },
      ]},
      prettybad: { text:"Pretty bad tbh... this app has been consuming my life", opts:[
        { label:"You need to get off hinge", to:"zendeya" },
        { label:"You need to get off Twitter", to:"eve" },
      ]},
      erm: { text:"Erm... That's not hecking chonkers. Ur getting a downvote", opts:[
        { label:"You need to get off Twitter", to:"eve" },
        { label:"You need to get off Reddit", to:"hearme" },
      ]},
      zendeya: { text:"But I'm gonna find my baddie who looks like Zendeya soon I can feel it", opts:[] },
      eve: { text:"Sure as soon as you complete the Eve Landing and Return", opts:[] },
      hearme: { text:"Erm... \"hear me out\" on Keira guys...", opts:[] },
    },
  },
  {
    name: "Barbara",
    good: true,
    sprite: "art/UBarbara.png",
    dialogue: {
      start: { text:"How was the interest meeting for Suessical?", opts:[
        { label:"Have you seen the Northwestern baby onsie?", to:"whyask" },
        { label:"APPLE! APPLE! APPLE!", to:"tellme" },
      ]},
      whyask: { text:"Yeah... why do you ask???", opts:[
        { label:"Do you remember Majestia in 7th Grade?", to:"crying" },
        { label:"*Spoils Infinity War*", to:"please" },
      ]},
      tellme: { text:"Uhhh.. did you have something you wanted to tell me?", opts:[
        { label:"*Spoils Infinity War*", to:"please" },
        { label:"GIRLS ARE DRUGGGS!", to:"feedback" },
      ]},
      crying: { text:"*Starts crying* sorry I can't do this right now...", opts:[] },
      please: { text:"Guys!!! Please!!! This debating needs to stop!! This is a group chat for all our friends to stay in! So what if a...", opts:[] },
      feedback: { text:"Thanks for the feedback.", opts:[] },
    },
  },
  {
    name: "Alex",
    good: true,
    sprite: "art/Alex.png",
    dialogue: {
      start: { text:"Sorry I just threw up in my mouth a little bit. What were you saying?", opts:[
        { label:"I've been feeling pretty down lately...", to:"whoasked" },
        { label:"Can you stop trolling?", to:"swastikas" },
      ]},
      whoasked: { text:"Who asked bro can you just let me through?", opts:[
        { label:"No lol", to:"wow" },
        { label:"Fine...", to:"sauce" },
      ]},
      swastikas: { text:"Only if you stop drawing swastikas", opts:[
        { label:"Fine...", to:"sauce" },
        { label:"Never!", to:"ow" },
      ]},
      wow: { text:"Wow. this is worse than when Taka called me a dumbass a year and a half ago", opts:[] },
      sauce: { text:"Awesome sauce! Double Squirt!", opts:[] },
      ow: { text:"Hop on OW", opts:[] },
    },
  },
  {
    name: "Zeke",
    good: true,
    sprite: "art/Zac.png",
    dialogue: {
      start: { text:"You already abandoned me, the least you could do is let me in", opts:[
        { label:"My new place is 100x nicer", to:"invited" },
        { label:"How's the old bluff doing?", to:"shoveling" },
      ]},
      invited: { text:"Yet you've never invited me...", opts:[
        { label:"I'm so sorry man how can I make this up to you", to:"twenty" },
        { label:"Sorry man Keira won't let me", to:"ball" },
      ]},
      shoveling: { text:"It's fine. I get money shoveling driveways you wanna join?", opts:[
        { label:"Sorry man Keira won't let me", to:"ball" },
        { label:"I miss when you hosted at your house", to:"idont" },
      ]},
      twenty: { text:"$20", opts:[] },
      ball: { text:"Ball & Chain...", opts:[] },
      idont: { text:"I don't", opts:[] },
    },
  },
  {
    name: "Lana",
    good: false,
    sprite: "art/Rana.png",
    dialogue: {
      start: { text:"Btw I'm using your pool today", opts:[
        { label:"Uhhh no who said you could?", to:"hot" },
        { label:"Fine I guess", to:"leopard" },
      ]},
      hot: { text:"Come on my friends are gonna be hot you have to host them", opts:[
        { label:"You peaked in 7th grade you know that?", to:"peaked" },
        { label:"You're the worst. Eat a cheese stick and die", to:"telling" },
      ]},
      leopard: { text:"Great! I'll wear my leopard print", opts:[
        { label:"You're the worst. Eat a cheese stick and die", to:"telling" },
        { label:"I'm running the KKK on you", to:"kids" },
      ]},
      peaked: { text:"We peaked at the same time", opts:[] },
      telling: { text:"Oh thats not... I'm telling Keira", opts:[] },
      kids: { text:"...are you one of those retartar kids?", opts:[] },
    },
  },
  {
    name: "Will",
    good: false,
    sprite: "art/UWill.png",
    dialogue: {
      start: { text:"Want to come to Dunkin with me? You're paying tho", opts:[
        { label:"How's your new car?", to:"loveit" },
        { label:"How's your new girlfriend?", to:"jenna" },
      ]},
      loveit: { text:"I love it more than anything in my life", opts:[
        { label:"Do you ever miss the Mini Coop?", to:"different" },
        { label:"You still haven't payed Ian back yet btw", to:"two" },
      ]},
      jenna: { text:"She's no Jenna Ortega but she's fine I guess", opts:[
        { label:"You still haven't payed Ian back yet btw", to:"two" },
        { label:"What really happened with that fight you got into?", to:"legally" },
      ]},
      different: { text:"I was a different person back then", opts:[] },
      two: { text:"It's fine I'm sending him $2 increments every month", opts:[] },
      legally: { text:"Legally I'm not allowed to say. I also can't remember anything due to the concussion", opts:[] },
    },
  },
  {
    name: "Robby",
    good: false,
    sprite: "art/URobby.png",
    dialogue: {
      start: { text:"If ur ferda, you'd let me in", opts:[
        { label:"you REALLY think you deserve heaven?", to:"mamdani" },
        { label:"How did you die?", to:"cte" },
      ]},
      mamdani: { text:"More than Mamdani, his \"people\" did 9/11", opts:[
        { label:"I'm sad you and Zoey Possick didn't work out", to:"metoo" },
        { label:"How's your sister doing?", to:"sister" },
      ]},
      cte: { text:"CTE from all the football our school didn't play", opts:[
        { label:"How's your sister doing?", to:"sister" },
        { label:"Sorry your season got cancelled", to:"bummed" },
      ]},
      metoo: { text:"Me too. She could have fixed me...", opts:[] },
      sister: { text:"Pretty good she's currently living in a UAlbany Frat", opts:[] },
      bummed: { text:"I'm mainly just bummed I couldn't see Carmine Casino in the locker room", opts:[] },
    },
  },
];


/* ---- DAY 3 roster ---- */
const SPIRITS_DAY3 = [
  {
    name: "Eric Brand",
    good: true,
    sprite: "art/UBrand.png",
    dialogue: {
      start: { text:"How's my star athlete doing? I'll give you anything to let me in. Fans, BRAND deals, you name it", opts:[
        { label:"I don't like the vulgar way you talk to students", to:"vulgar" },
        { label:"Give me more playing time!", to:"gave" },
      ]},
      vulgar: { text:"F*ggot.", opts:[
        { label:"Every time I look at a tennis ball I think of you", to:"balls" },
        { label:"You gotta rizz up the other coach", to:"inappropriate" },
      ]},
      gave: { text:"Hey I already gave you all of James Pearlman's playing time", opts:[
        { label:"You gotta rizz up the other coach", to:"inappropriate" },
        { label:"What can I do to improve at tennis?", to:"improve" },
      ]},
      balls: { text:"You see those balls in your hands every night dont you", opts:[] },
      inappropriate: { text:"It would be inappropriate for either me or you to rizz on her", opts:[] },
      improve: { text:"Uhhh... hit the ball more? Idk basketball is more my style", opts:[] },
    },
  },
  {
    name: "Hensley",
    good: true,
    sprite: "art/UHensley.png",
    dialogue: {
      start: { text:"Do you want Chlamydia or Herpes?", opts:[
        { label:"Am I you're favorite student?", to:"related" },
        { label:"Do you like Taka?", to:"elf" },
      ]},
      related: { text:"Well, you're related to Malena, so sure", opts:[
        { label:"One sec, checking my phone", to:"defenestrating" },
        { label:"I'd Slip it in", to:"husband" },
      ]},
      elf: { text:"No. He reminds me of an elf and talks to me about moose knuckles", opts:[
        { label:"I'd Slip it in", to:"husband" },
        { label:"Thoughts on Jeffery?", to:"jeffery" },
      ]},
      defenestrating: { text:"I'm defenestrating so hard rn", opts:[] },
      husband: { text:"Only my husband can do that in Canada!", opts:[] },
      jeffery: { text:"He came all the way back in 6th grade!", opts:[] },
    },
  },
  {
    name: "Matt",
    good: true,
    sprite: 'art/Matt.png',
    dialogue: {
      start: { text:"..................... .........Hello?", opts:[
        { label:"Say the line!", to:"pasta" },
        { label:"Say the line!", to:"radio" },
      ]},
      pasta: { text:"I picka-da Pasta!", opts:[
        { label:"If you had to describe me in one word, what would you say?", to:"spanish" },
        { label:"Did you sleep well last night?", to:"taira" },
      ]},
      radio: { text:"Never touch a black man's radio!", opts:[
        { label:"Did you sleep well last night?", to:"taira" },
        { label:"Do you prefer pasta, or corn?", to:"leaves" },
      ]},
      spanish: { text:"(in a spanish accent) Homosexual!", opts:[] },
      taira: { text:"No. Taira climbed into my bed and started hugging me. Also Alex snores", opts:[] },
      leaves: { text:"*Leaves VC without saying anything*", opts:[] },
    },
  },
  {
    name: "Zach Prince",
    good: true,
    sprite: 'art/Zach Stephen Prince-1.png',
    dialogue: {
      start: { text:"Oh hey it's this guy. Can you let me through the gate thing", opts:[
        { label:"WTF happened to you... you look obese", to:"bulking" },
        { label:"Looking good my man!", to:"lie" },
      ]},
      bulking: { text:"Relax I'm bulking right now and got carried away", opts:[
        { label:"Go to the gym. Remember when we were in Mr. A's class together?", to:"mrl" },
        { label:"Your sister is a dirty bird btw", to:"chuzz" },
      ]},
      lie: { text:"You don't have to lie", opts:[
        { label:"Your sister is a dirty bird btw", to:"chuzz" },
        { label:"Are you ok? You seem kind of sad", to:"see" },
      ]},
      mrl: { text:"More like Mr. L", opts:[] },
      chuzz: { text:"Geez man first Taka called her CHUZZ, now this?", opts:[] },
      see: { text:"I have to see Hunter, Alex, AND Matt at my school of course I am", opts:[] },
    },
  },
  {
    name: "Taira",
    good: true,
    sprite: 'art/Taira.png',
    dialogue: {
      start: { text:"Ryūjin no ken o kurae!", opts:[
        { label:"You abandoned us I don't want to talk", to:"gfdog" },
        { label:"Wanna go to city with me on Monday?", to:"dayafter" },
      ]},
      gfdog: { text:"Sorry I needed to walk my GF's dog", opts:[
        { label:"How's your girlfriend doing btw?", to:"body" },
        { label:"We're dropping you", to:"top4" },
      ]},
      dayafter: { text:"I'm going to city the day after... so no", opts:[
        { label:"We're dropping you", to:"top4" },
        { label:"What do you do with all of this free time?", to:"sax" },
      ]},
      body: { text:"She's always had my body... but F still has my mind", opts:[] },
      top4: { text:"You can't drop a top 4 friend!", opts:[] },
      sax: { text:"Mainly play the alto sexophone", opts:[] },
    },
  },
  {
    name: "Zaara-Zoeya",
    good: true,
    sprite: 'art/UZSquare.png',
    dialogue: {
      start: { text:"We are Many. You are One.", opts:[
        { label:"How's Matt doing?", to:"goon1" },
        { label:"How's Lana doing?", to:"guuurl" },
      ]},
      goon1: { text:"Yooo that guy's hella goon he's craaaazy", opts:[
        { label:"Ok... how's Alex", to:"vivian" },
        { label:"What's the best thing about me?", to:"pool" },
      ]},
      guuurl: { text:"Yo after we dropped Emily thats like our guuurl", opts:[
        { label:"What's the best thing about me?", to:"pool" },
        { label:"Ok... How's Hunter", to:"goon2" },
      ]},
      vivian: { text:"Yo him and my hg Vivian will NEVER work out", opts:[] },
      pool: { text:"You have a pool right?", opts:[] },
      goon2: { text:"Yooo that guy's hella goon he's craaaazy", opts:[] },
    },
  },
  {
    name: "Ethan",
    good: false,
    sprite: "art/UEthan.png",
    dialogue: {
      start: { text:"Dude that kid keeps on following me its creeping me out", opts:[
        { label:"Why do you deserve to enter the holy gates?", to:"jewish" },
        { label:"What kid are you talking about?", to:"fuhrer" },
      ]},
      jewish: { text:"I'm jewish I could care less just get that kid away", opts:[
        { label:"Loved your Bar Mitzvah btw", to:"riley" },
        { label:"Ok... but what's this kid's name?", to:"notsure" },
      ]},
      fuhrer: { text:"The tall one who's dad looks like the fuhrer", opts:[
        { label:"Ok... but what's this kid's name?", to:"notsure" },
        { label:"Did you know he's going to NYU", to:"evan" },
      ]},
      riley: { text:"Riley Garber airdropped porn on my party bus", opts:[] },
      notsure: { text:"I'm not sure but he saw me doing stuff with my gf... why is he following me", opts:[] },
      evan: { text:"That's nothing, my friend Evan went to both Ohio State AND Maryland!", opts:[] },
    },
  },
  {
    name: "Pablo",
    good: false,
    sprite: 'art/UPablo.png',
    dialogue: {
      start: { text:"Yo tell ur boy Dan to get his hands off Chloe Beal", opts:[
        { label:"What's your beef with Dan bro?", to:"lazy" },
        { label:"So I guess I'll see you a lot next year", to:"barbara" },
      ]},
      lazy: { text:"Him and all the other counselors are so lazy", opts:[
        { label:"Even Taka?", to:"awesome" },
        { label:"Wanna play Truco with me?", to:"argentines" },
      ]},
      barbara: { text:"That reminds me, hands OFF Barbara Bombfin", opts:[
        { label:"Wanna play Truco with me?", to:"argentines" },
        { label:"You think you have a chance with all these women?", to:"rizzy" },
      ]},
      awesome: { text:"NO. He's awesome. I want to impress him", opts:[] },
      argentines: { text:"Sorry I only play that with REAL Argentines", opts:[] },
      rizzy: { text:"Well I got rizzy on vacation with my friend's cousin and that caused some problems", opts:[] },
    },
  },
  {
    name: "Fiona",
    good: false,
    sprite: 'art/UPhiona.png',
    dialogue: {
      start: { text:"...Joaco.", opts:[
        { label:"How's the portfolio going?", to:"incompetent" },
        { label:"How are Austin and Derek?", to:"hate" },
      ]},
      incompetent: { text:"I can't work with such incompetent presidents", opts:[
        { label:"What's your beef with Taka?", to:"crochet" },
        { label:"Do you have a problem with me?", to:"horrible" },
      ]},
      hate: { text:"I hate those two almost as much as I hate you", opts:[
        { label:"Do you have a problem with me?", to:"horrible" },
        { label:"Is there anybody you DO like?", to:"sugantino" },
      ]},
      crochet: { text:"He ruined crochet club", opts:[] },
      horrible: { text:"To be honest, I just think you're a horrible person", opts:[] },
      sugantino: { text:"Dr. Sugantino... and Taira before he gave his body & mind to Tiffany", opts:[] },
    },
  },
  {
    name: "Margokid",
    good: false,
    sprite: "art/UMargoKid.png",
    dialogue: {
      start: { text:"Let me in bro do you know who I AM??", opts:[
        { label:"No who are you?", to:"goated" },
        { label:"Of course!", to:"maddy" },
      ]},
      goated: { text:"I'm goated at tennis and almost died from MRSA when I was 9", opts:[
        { label:"Still have no idea who you are", to:"andrew" },
        { label:"You'll have to wait a bit is that a problem?", to:"wait415" },
      ]},
      maddy: { text:"Good. and let my girl Maddy in too", opts:[
        { label:"You'll have to wait a bit is that a problem?", to:"wait415" },
        { label:"Wait, thats your girlfriend??", to:"sidepiece" },
      ]},
      andrew: { text:"Andrew Margo Kid.", opts:[] },
      wait415: { text:"Nah we good see you at 4:15", opts:[] },
      sidepiece: { text:"She's my sidepiece... Ms. Martino is my wife", opts:[] },
    },
  },
  {
    name: "Hunter",
    good: false,
    sprite: 'art/Hunter.png',
    dialogue: {
      start: { text:"wtw you letting me in or nah", opts:[
        { label:"You've fallen off bro", to:"notcrazy" },
        { label:"I feel like you'd enjoy hell... lot of cokeheads", to:"devilsitch" },
      ]},
      notcrazy: { text:"That's not crazy to say that", opts:[
        { label:"What do you have to say for your asian fetish?", to:"fetish" },
        { label:"If I let you in do you think you'd be deserving?", to:"deserving" },
      ]},
      devilsitch: { text:"No please bro It'll make my Devil's Itch act up", opts:[
        { label:"If I let you in do you think you'd be deserving?", to:"deserving" },
        { label:"Is that a real thing?", to:"flat" },
      ]},
      fetish: { text:"Wait I don't have an asian fetish, asian girls have...", opts:[] },
      deserving: { text:"Of course bro. At least more than Dan. My frat does like charity and shit I think", opts:[] },
      flat: { text:"As real as my feet are flat", opts:[] },
    },
  },
  {
    name: "Daniel",
    good: false,
         sprite:'art/Daniel.png',
    dialogue: {
      start: { text:"Dude check my Strava I've been walking in this line for 3 millenium", opts:[
        { label:"How do you run so much.. & why does your bro not", to:"keira" },
        { label:"How would you feel if I sent you to Hell?", to:"ozzy" },
      ]},
      keira: { text:"I mainly just do it so I can see Keira more often", opts:[
        { label:"Yeah by all means say that right in front of me", to:"chloe" },
        { label:"If I let you in do you think you'd be deserving?", to:"notsure" },
      ]},
      ozzy: { text:"That would kinda suck but at least I'd get to meet Ozzy", opts:[
        { label:"If I let you in do you think you'd be deserving?", to:"notsure" },
        { label:"Oh Ozzy Osbourne? Yeah Crazy Train is a great song", to:"hugtrain" },
      ]},
      chloe: { text:"Hey I flirted with Chloe Beal in front of Joner you can't stop me", opts:[] },
      notsure: { text:"tbh I'm not sure... but if you can do me a favor... don't seperate me and my brother please", opts:[] },
      hugtrain: { text:"You know whats even better though? HUG TRAIN!", opts:[] },
    },
  },
  {
    name: "Sydney",
    good: false,
    sprite: "art/USydney.png",
    dialogue: {
      start: { text:"Hi Joaco. Huh pretty ethnic name where are you from again?", opts:[
        { label:"AHHH! A scary ghost!", to:"liked" },
        { label:"Argentina", to:"water" },
      ]},
      liked: { text:"I don't know how I ever liked you", opts:[
        { label:"Dosen't matter I got cockblocked on Boulderdash", to:"lucky" },
        { label:"When's the last time you've talked to any of us?", to:"burger" },
      ]},
      water: { text:"Oh thats ok. It has a lot of water great place to swim", opts:[
        { label:"When's the last time you've talked to any of us?", to:"burger" },
        { label:"Wait, you swim?", to:"segregated" },
      ]},
      lucky: { text:"Believe me, you weren't getting lucky", opts:[] },
      burger: { text:"I saw Daniel recently. He kept on pretending to bite into a burger for some reason?", opts:[] },
      segregated: { text:"Only in segregated pools.", opts:[] },
    },
  },
  {
    name: "Martin",
    good: false,
    sprite: 'art/Martin.png',
    ticketWinner: true,
    dialogue: {
      start: { text:"Hola papi let me in por favor", opts:[
        { label:"You gotta come back and carry me at OW", to:"messi" },
        { label:"I feel like I don't see you enough", to:"hugon" },
      ]},
      messi: { text:"Im not Messi I can't perform miracles bro", opts:[
        { label:"You're being way too toxic right now ur muted buddy", to:"unmute" },
        { label:"We should do an trip to Argentina soon", to:"snacks" },
      ]},
      hugon: { text:"Sorry Alex Hugon demands most of my time", opts:[
        { label:"We should do an trip to Argentina soon", to:"snacks" },
        { label:"Do you ever see Taira?", to:"never" },
      ]},
      unmute: { text:"UNMUTE ME", opts:[] },
      snacks: { text:"Ahhh... but don't forget to bring the snacks!", opts:[] },
      never: { text:"Only when he's not being a little bitch... so never", opts:[] },
    },
  },
  {
    name: "ALB",
    good: true,
    sprite: 'art/ALLB.png',
    dialogue: {
      start: { text:"...", opts:[
        { label:"Hello? I can't let you through if you don't talk.", to:"ipad" },
        { label:"Who are you? Is this censored or something?", to:"gege" },
      ]},
      ipad: { text:"*looks up from ipad, then continues playing*", opts:[
        { label:"Dude, you gotta get off that thing", to:"telling" },
        { label:"Shouldn't you be with Luke right now or something?", to:"rule43" },
      ]},
      gege: { text:"*from far away* GeGe, is this that soccer game?", opts:[
        { label:"Shouldn't you be with Luke right now or something?", to:"rule43" },
        { label:"Tell your brother to put his headphones on", to:"kk" },
      ]},
      telling: { text:"I'm telling GeGe!", opts:[] },
      rule43: { text:"Dude, Rule 43 you can't joke about that.", opts:[] },
      kk: { text:"Kk XD :)", opts:[] },
    },
  },
  {
    name: "Dylan Florio",
    good: true,   // unmarked on the sheet — guessed good; flip if wrong
    sprite: "art/UFlorio.png",
    dialogue: {
      start: { text:"Oh my gawsh! Heyyy Joaco!", opts:[
        { label:"Umm... Hi", to:"bereal" },
        { label:"Hey, uhh, how's it going?", to:"slay" },
      ]},
      bereal: { text:"I LOVED that BeReal you posted the other day!", opts:[
        { label:"That was a picture with my family...", to:"eiffel" },
        { label:"Dude... I have a girlfriend", to:"beatty" },
      ]},
      slay: { text:"Oh fabulous. And your outfit is SO slay!", opts:[
        { label:"Dude... I have a girlfriend", to:"beatty" },
        { label:"Fuck outta here with that gay shit", to:"commanding" },
      ]},
      eiffel: { text:"We could always see the Eiffel Tower in Argentina!", opts:[] },
      beatty: { text:"Oh I know! I'm with Alex Beatty now!", opts:[] },
      commanding: { text:"I loveeeee a commanding man", opts:[] },
    },
  },
  {
    name: "Taka",
    sprite: 'art/Taka.png',
    good: true,   // unmarked on the sheet — guessed good; flip if wrong
    dialogue: {
      start: { text:"Huh, this isn't exaclty optimal", opts:[
        { label:"Theres more to life than optimization", to:"psl" },
        { label:"Well... It's my first day on the job", to:"laptops" },
      ]},
      psl: { text:"Fine then, whats my PSL?", opts:[
        { label:"Theres more to life than Looks!", to:"heightpill" },
        { label:"What is u talm bout?", to:"ratio" },
      ]},
      laptops: { text:"You have at least four laptops helping you right?", opts:[
        { label:"What is u talm bout?", to:"ratio" },
        { label:"Uh no, just my brain", to:"speedrun" },
      ]},
      heightpill: { text:"Easy for you to say, Height Pill Cope", opts:[] },
      ratio: { text:"I'm \"talm bout\" this ratio wigga", opts:[] },
      speedrun: { text:"Perma-underclass speedrun challenge", opts:[] },
    },
  },
  {
    name: "Jackson",
    good: true,
    sprite: 'art/Jackson.png',
    dialogue: {
      start: { text:"B-ruh this postgame is soooo gooner", opts:[
        { label:"Oh uhh, this is the afterlife...", to:"chat" },
        { label:"I know man, who even made this?", to:"them" },
      ]},
      chat: { text:"Chat whatttt I died?", opts:[
        { label:"Sorry, that's just how the cookie crumbles", to:"hundred" },
        { label:"Ya know, you're not the first person to die...", to:"howdied" },
      ]},
      them: { text:"You mean \"I know *Them\"", opts:[
        { label:"Ya know, you're not the first person to die...", to:"howdied" },
        { label:"Oopsie! Sorry them. Off you go", to:"watermelon" },
      ]},
      hundred: { text:"Damn, I was going for 100% too", opts:[] },
      howdied: { text:"How did you even die bro, like how did you even die?", opts:[] },
      watermelon: { text:"Don't worry, I'll be back for dinner with a watermelon. Your favorite!", opts:[] },
    },
  },
];

/* flat lookup across all days (save/load, ticket search, etc.) */
const SPIRITS = [...SPIRITS_DAY1, ...SPIRITS_DAY2, ...SPIRITS_DAY3];

let currentSpirit=null, currentTree=null, dlgNode='start';

/* ---- day lineup ----
   Day 1's possibilities are the whole roster. Order constraint: Stu appears
   at the 4th position or later, and Rose appears somewhere after Stu. */
let dayQueue=[], dayStartSpiritNo=0;
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function buildDayQueue(){
  const roster = day>=3 ? SPIRITS_DAY3 : day>=2 ? SPIRITS_DAY2 : SPIRITS_DAY1;   // each day has its own cast
  const stu  = roster.find(s=>s.name==='Stu');
  const rose = roster.find(s=>s.name==='Rose');
  if(!stu || !rose){                                      // no Stu/Rose ordering this day
    dayQueue = shuffle(roster.slice());
    const martin = day>=3 ? dayQueue.find(s=>s.name==='Martin') : null;
    if(martin){                                           // day 3 opens with Martin
      dayQueue.splice(dayQueue.indexOf(martin),1);
      dayQueue.unshift(martin);
    }
    dayGhosts = dayQueue.map(()=>GHOSTS[(Math.random()*GHOSTS.length)|0]);
    return;
  }
  const others = shuffle(roster.filter(s=>s!==stu && s!==rose));
  const n = roster.length;
  const stuIdx  = 3 + Math.floor(Math.random()*(n-4));            // 0-based 3.. (4th or later), leaving room for Rose
  const roseIdx = stuIdx + 1 + Math.floor(Math.random()*(n-1-stuIdx)); // anywhere after Stu
  const q = new Array(n);
  q[stuIdx]=stu; q[roseIdx]=rose;
  let oi=0; for(let i=0;i<n;i++) if(!q[i]) q[i]=others[oi++];
  dayQueue = q;
  dayGhosts = dayQueue.map(()=>GHOSTS[(Math.random()*GHOSTS.length)|0]);   // each spirit's ghost form
}

/* ---- the rule sheet — each day posts its own set of rules ---- */
const RULES_BY_DAY = {
  1: [ "All DAWGs go to heaven",
       "No Cheating",
       "No Flowers" ],
  2: [ "No strangers you've never met",
       "No Fascists or their family",
       "No Demons",
       "No Ghosts" ],
  3: [ "No Hablo Espanol",
       "All who possess a wealth of knowledge may enter the kingdom of the lord",
       "Bigotry and Greed will NOT be tolerated" ],
};
function rulesForDay(d){ return RULES_BY_DAY[d] || RULES_BY_DAY[1]; }
function fitRules(){          // write as big as the paper allows, per day
  const list=$('rulesList'); if(!list || !list.clientHeight) return;
  const max = list.clientWidth * 0.14, min = list.clientWidth * 0.055;
  let px = max;
  list.style.fontSize = px + 'px';
  while(list.scrollHeight > list.clientHeight+1 && px > min){
    px -= 0.5; list.style.fontSize = px + 'px';
  }
}
window.addEventListener('resize', fitRules);
function buildRules(){
  const html = rulesForDay(day).map(r=>`<li>${r}</li>`).join('');
  const list=$('rulesList'); if(list) list.innerHTML = html;    // the always-visible paper
  const full=$('rulesFull'); if(full) full.innerHTML = html;    // (legacy overlay, unused)
  setTimeout(fitRules, 0);                 // measure once the screen has laid out
}
let rulesOpen=false;   // the rules now live on the paper permanently — no overlay
function openRules(){}
function closeRules(){ if(!rulesOpen) return; rulesOpen=false; rulesOverlay.classList.remove('show'); }

/* ---- day, hearts, timer & quota (shown in the right card) ---- */
let day=1, hearts=3, decisionsToday=0;

function renderHud(){
  const d=$('hudDay'), hp=$('hudHearts'), rd=$('rulesDay'), q=$('hudQuota');
  if(d) d.textContent = day;
  if(rd) rd.textContent = day;
  if(q){ const tot=dayQueue.length||0; q.textContent = `${decisionsToday}/${tot}`; q.classList.toggle('met', tot>0 && decisionsToday>=tot); }
  if(hp){
    let s='';
    for(let i=0;i<3;i++) s += `<span class="${i<hearts?'hp-on':'hp-off'}">${i<hearts?'♥':'♡'}</span>`;
    hp.innerHTML = s;
  }
}
function loseHeart(){
  if(hearts>0) hearts--;
  renderHud();
  const hp=$('hudHearts'); if(hp){ hp.classList.remove('flash'); void hp.offsetWidth; hp.classList.add('flash'); }
}
const sError = ()=>{ beep(160,0.12,'sawtooth',0.07); setTimeout(()=>beep(110,0.18,'sawtooth',0.07),100); };

/* ---- day timer (real-time, pausable, freezable) ---- */
function startNewDay(){
  hearts=3; decisionsToday=0;
  buildDayQueue(); dayStartSpiritNo = spiritNo;   // fresh lineup for the day
  clearQueue();                                   // the new day's line forms fresh
  renderHud();
  nextSpirit();
}
/* deep boom for the day-card reveal */
function sDayHit(){
  if(settings.volume<=0) return;
  const a=audio(); if(!a) return;
  const v=settings.volume/100;
  const o=a.createOscillator(), g=a.createGain();
  o.type='triangle';
  o.frequency.setValueAtTime(150, a.currentTime);
  o.frequency.exponentialRampToValueAtTime(38, a.currentTime+0.5);   // falling boom
  g.gain.setValueAtTime(0.55*v, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime+0.8);
  o.connect(g).connect(a.destination);
  o.start(); o.stop(a.currentTime+0.8);
  noise(0.4, 0.3);                                                    // rumble layer
}

/* black "Day N" card shown when entering a day, then runs `done`.
   It CUTS in (no fade-in, so the game never flashes behind it) and fades out. */
function showDayCard(n, done){
  gPhase='transition';                 // ignore input while the card is up
  const card=$('dayCard'), txt=$('dayCardText');
  txt.textContent = `Day ${n}`;
  card.style.transition='none';        // appear instantly
  card.classList.add('show');
  void card.offsetWidth;
  card.style.transition='';            // restore the CSS fade for the way out
  // the day-card jingle leads in, then the title thuds down on top of it
  playSfx(n>=3 ? 'music/Joaco_s Please Day 3.mp3'
               : 'music/Joaco_s Please Day 1_2 title card.mp3', null);
  txt.classList.remove('punch'); txt.style.opacity='0';
  setTimeout(()=>{
    txt.style.opacity='';
    void txt.offsetWidth; txt.classList.add('punch');
    sDayHit();
  }, 650);
  setTimeout(()=>{
    card.classList.remove('show');
    setTimeout(()=>{ if(done) done(); }, 520);   // wait for the fade-out
  }, 2400);
}

/* ---- the one-time golden ticket ---- */
let ticket = 1;     // one golden ticket for the whole game
function renderPowerups(){
  const tN=$('powTicketN'); if(!tN) return;
  tN.textContent = ticket;
  const canUseOnSpirit = gPhase==='plea' && !typeState && current==='game' && !paused;
  $('powTicket').style.display = ticket>0 ? '' : 'none';   // vanishes once spent
  $('powTicket').classList.toggle('off', !(ticket>0 && canUseOnSpirit));
}
/* give the golden ticket to the spirit you're talking to */
let ticketGranted = false;         // Keira's gift — earned once per run via her "glad" line
let ticketGivenToWinner = false;   // set when the ticket reached the right person
function grantTicket(){
  if(ticketGranted) return;        // she only has the one
  ticketGranted = true;
  ticket++; renderPowerups(); sConfirm();
  addMsg('ticket', `You received the GOLDEN TICKET.`, false);
}
function giveTicket(){
  if(ticket<=0 || gPhase!=='plea' || typeState || paused || current!=='game') return;
  ticket--; renderPowerups(); sConfirm();
  if(currentSpirit && currentSpirit.ticketWinner){
    ticketGivenToWinner = true;      // remembered until the end of day 3
    setInteractive(false); setOptsVisible(false);   // no more questions, no judging him
    addSpirit("Hallelujah! Thank you my dear cousin, I'll make sure to talk to the man upstairs!", ()=>{
      scheduleBeat(startTicketAscension, 900);      // let the line land, then he ascends
    });
  } else {                           // the wrong person -> just a line, then play on
    addMsg('ticket', `You hand ${currentSpirit?currentSpirit.name:'them'} the golden ticket. They take it, baffled. Nothing happens.`, false);
  }
}


let ticketRide = false;            // the winner skips judgment and rides to heaven
function startTicketAscension(){     // straight to heaven — no verdict, no heart at stake
  ticketRide = true;
  lastApprove = true;
  gPhase='judging';
  decisionsToday++; renderHud();     // he still counts as seen today
  stopSceneMusic();
  walker.classList.remove('s-in','s-infar');
  walker.style.display='block';
  void walker.offsetWidth;
  walker.classList.add('s-red');
  updateHints();
}

const FINAL_DAY = 3;   // survive this many days for the normal ending
function dayComplete(){
  if(day >= FINAL_DAY){
    if(ticketGivenToWinner) triggerSecretEnding(); else triggerNormalEnding();
    return;
  }
  gPhase='dayend';
  stopSceneMusic();
  clearTimeout(beatTimer); beatFn=null; beatRemain=null;
  clearWalker(); walker.style.display='none';
  clearQueue();
  zPortrait.classList.remove('show');
  clearConvo();
  setOptsVisible(false);
  btnYes.classList.add('off'); btnNo.classList.add('off');
  day++; buildRules();   // the new day posts its own rule sheet
  showDayCard(day, startNewDay);     // "Day N" card, then begin the next day
}

/* ---- the loop ----
   phases: walking (approach) -> plea (decide) -> judging (walk to red line)
        -> verdict (stopped, told right/wrong) -> fating (walk to platform)
        -> fate (rise to heaven / fall) -> next spirit.
   'dayend' waits for the player to continue. */
let gPhase='walking';
let spiritNo=0;
let interactive=false;    // can the player click dialogue options / approve / deny?
let currentGood=true;     // is THIS spirit actually good? (placeholder truth)
let lastApprove=false;    // the player's last decision
let dayEndAction=null;    // what to run when continuing from a day break

/* pausable "beat" timer for the red-line verdict pauses */
let beatTimer=null, beatFn=null, beatAt=0, beatRemain=null;
function scheduleBeat(fn, ms){
  beatFn=fn; beatAt=Date.now()+ms; beatRemain=null;
  clearTimeout(beatTimer);
  beatTimer=setTimeout(()=>{ beatFn=null; fn(); }, ms);
}
function pauseBeat(){ if(beatFn){ clearTimeout(beatTimer); beatRemain=Math.max(0,beatAt-Date.now()); } }
function resumeBeat(){ if(beatFn && beatRemain!=null){ const fn=beatFn; beatFn=null; scheduleBeat(fn, beatRemain); } }

function startGame(){
  day=1; spiritNo=0;
  ticket=0; ticketGranted=false; ticketRide=false;   // the golden ticket must be earned (Keira)
  ticketGivenToWinner=false;
  buildRules(); renderPowerups();
  show('game');
  showDayCard(1, startNewDay);              // "Day 1" card, then begin
}

function clearWalker(){ walker.className='walker'; walker.style.animationPlayState='running'; }

/* ghost sprites for the walk — one is picked at random for each character */
const GHOSTS = ['art/Ghost1.png','art/Ghost2.png','art/Ghost3.png','art/Ghost4.png','art/Ghost5.png','art/Ghost6.png','art/Ghost7.png'];

/* every ghost PNG pads its art differently, so centre each sprite's actual
   pixels (not its canvas) on its position — works for the walker AND the queue */
const ghostOffsets = {};   // src -> content-centre offset from canvas centre, % of canvas
function setGhostImg(img, src){
  img.src = src;
  const apply = o => { img.style.translate = (-o.x)+'% '+(-o.y)+'%'; };
  if(ghostOffsets[src]) return apply(ghostOffsets[src]);
  img.style.translate = '0% 0%';
  const probe = new Image();
  probe.onload = () => { try{
    const W=probe.naturalWidth, H=probe.naturalHeight;
    const cv=document.createElement('canvas'); cv.width=W; cv.height=H;
    const c=cv.getContext('2d'); c.drawImage(probe,0,0);
    const d=c.getImageData(0,0,W,H).data;
    let minX=W,maxX=0,minY=H,maxY=0;
    for(let y=0;y<H;y++) for(let x=0;x<W;x++)
      if(d[(y*W+x)*4+3]>50){ if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; }
    if(maxX<minX) return;                       // fully transparent? leave as-is
    const o={ x:((minX+maxX)/2-(W-1)/2)/W*100, y:((minY+maxY)/2-(H-1)/2)/H*100 };
    ghostOffsets[src]=o; apply(o);
  }catch(e){} };                                // canvas blocked (file://) -> no compensation
  probe.src = src;
}

/* ---- the waiting line left of the castle ----
   Each day-spirit is assigned its ghost up front; the line stands on the lane,
   slides forward as spirits are processed, and newcomers walk in from the
   tunnel to the back of the line. */
const LANE_Y = 29.6, QUEUE_FRONT_X = 37.5, QUEUE_SPACING = 4.5, QUEUE_MAX = 5;
let dayGhosts = [];            // ghost sprite per dayQueue position
let queueInitialized = false;  // first fill of the day appears in place (no walk-in)
const slotX = i => QUEUE_FRONT_X - i*QUEUE_SPACING;
function clearQueue(){ const q=$('queue'); if(q) q.innerHTML=''; queueInitialized=false; }
function updateQueueDisplay(){
  const q=$('queue'); if(!q) return;
  const idx = spiritNo - dayStartSpiritNo - 1;          // active spirit's day position
  const waiting=[];
  for(let i=idx+1; i<dayQueue.length && waiting.length<QUEUE_MAX; i++) waiting.push(i);
  const existing = new Map([...q.children].map(c=>[c.dataset.i, c]));
  const keep = new Set();
  waiting.forEach((spIdx, slot)=>{
    keep.add(String(spIdx));
    let el = existing.get(String(spIdx));
    if(el){                                            // already in line -> slide forward
      el.style.left = slotX(slot)+'%'; el.style.top = LANE_Y+'%';
      return;
    }
    el=document.createElement('div'); el.className='qspot'; el.dataset.i=spIdx;
    const im=document.createElement('img'); im.alt=''; el.appendChild(im);
    im.style.animationDelay = (-Math.random()*1.6).toFixed(2)+'s';       // desync the sway
    im.style.animationDuration = (1.4+Math.random()*0.6).toFixed(2)+'s';
    setGhostImg(im, dayGhosts[spIdx] || GHOSTS[(Math.random()*GHOSTS.length)|0]);
    q.appendChild(el);
    // everyone emerges from the tunnel and walks to their slot; at day start the
    // whole line streams out one by one (front of the line leaves first)
    const initial = !queueInitialized;
    const travel  = slotX(slot) - 15.2;                       // horizontal distance to cover
    const dur     = 800 + travel*55;                          // constant walking speed
    const delay   = initial ? 500 + slot*450 : 0;             // day start: staggered exits
    el.style.left='15.2%'; el.style.top='24%'; el.style.opacity='0';
    requestAnimationFrame(()=>{
      const anim = el.animate(
        [ {left:'15.2%', top:'24%', opacity:0},
          {opacity:1, offset:0.08},
          {left:'15.2%', top:LANE_Y+'%', opacity:1, offset:0.3},
          {left:slotX(slot)+'%', top:LANE_Y+'%', opacity:1} ],
        { duration:dur, delay, easing:'ease-in-out', fill:'both' });
      anim.onfinish=()=>{ el.style.left=slotX(slot)+'%'; el.style.top=LANE_Y+'%';
                          el.style.opacity='1'; try{ anim.cancel(); }catch(e){} };
    });
  });
  for(const [k,el] of existing) if(!keep.has(k)) el.remove();
  queueInitialized = true;
}

function nextSpirit(){
  spiritNo++;
  const q = dayQueue.length ? dayQueue : SPIRITS_DAY1;
  const idx = spiritNo - dayStartSpiritNo - 1;          // position within the day
  currentSpirit = q[Math.min(Math.max(idx,0), q.length-1)];   // clamp: never wrap into repeats
  currentGood   = currentSpirit.good;    // their hard-coded truth
  currentTree   = currentSpirit.dialogue;
  const ghost = dayGhosts[idx] || GHOSTS[(Math.random()*GHOSTS.length)|0];
  setGhostImg($('walkerImg'), ghost);    // the same ghost that stood at the front of the line
  updateQueueDisplay();                  // front of the line steps out; the rest shuffle up
  clearConvo();                          // fresh transcript for the new spirit
  zPortrait.classList.remove('show');
  const pi=document.getElementById('portraitInner'); if(pi) pi.innerHTML='';   // clear sprite, keep booth frames
  setInteractive(false); setOptsVisible(false);
  startWalk();
}

function startWalk(){
  gPhase='walking';
  clearWalker();
  walker.style.display='block';
  void walker.offsetWidth;
  const firstOfDay = (spiritNo - dayStartSpiritNo) === 1;
  walker.classList.add(firstOfDay ? 's-infar' : 's-in');   // day's first spirit exits the tunnel
  updateHints();
}

walker.addEventListener('animationend', (e)=>{
  if(e.target!==walker) return;   // ignore the ghost img's own filter animation
  if(gPhase==='walking')      arriveAtGate();
  else if(gPhase==='judging') reachRedline();
  else if(gPhase==='fating')  reachPlatform();
  else if(gPhase==='fate')    resolveSpirit();
});

function skipWalk(){
  if(gPhase!=='walking') return;
  walker.classList.remove('s-in','s-infar');
  arriveAtGate();
}
function renderPortrait(){
  const sp = currentSpirit;
  const pi = document.getElementById('portraitInner') || zPortrait;   // fallback if markup is older
  pi.innerHTML = '';
  if(sp && sp.sprite){                         // image sprite, with fallback to the name
    const img = document.createElement('img');
    img.className = 'spirit-sprite'; img.src = sp.sprite; img.alt = '';
    img.onerror = ()=>{ pi.innerHTML = `<span class="ph-label">${sp.name}</span>`; };
    pi.appendChild(img);
  } else {
    pi.innerHTML = `<span class="ph-label">${sp ? sp.name : 'spirit'}</span>`;
  }
  const nm = document.getElementById('spiritName');           // the goggles reveal who it is
  if(nm) nm.textContent = sp ? sp.name : '';
}
function arriveAtGate(){
  gPhase='plea';
  walker.style.display='none';   // the spirit has slipped inside the building
  playSceneMusic(charMusicFor(currentSpirit));   // their theme, while they're in the castle
  renderPortrait();
  zPortrait.classList.add('show');
  dlgNode = 'start';
  showNode();                // adds the spirit's first words to the log, enables buttons
}

/* enable/disable everything the player can click during 'plea' */
function setInteractive(on){
  interactive = on;
  [btnYes, btnNo, opt1, opt2].forEach(b=>b.classList.toggle('off', !on));
}
function setOptsVisible(v){ opt1.style.display = v?'':'none'; opt2.style.display = v?'':'none'; }

/* show the current dialogue node: spirit's line is added to the log (typed),
   and this node's options go on the two middle buttons */
function showNode(){
  const node = currentTree[dlgNode] || { text:'', opts:[] };
  const o = node.opts || [];
  opt1.querySelector('.lbl').textContent = o[0] ? o[0].label : '';
  opt2.querySelector('.lbl').textContent = o[1] ? o[1].label : '';
  opt1.style.display = o[0] ? '' : 'none';
  opt2.style.display = o[1] ? '' : 'none';
  setInteractive(false);     // locked while the spirit's line types out
  updateHints();
  addSpirit(node.text, ()=>{
    setInteractive(true); updateHints();
    if(node.grantTicket) grantTicket();   // Keira hands over the golden ticket
  });
}
function chooseOption(i){
  if(gPhase!=='plea' || typeState || !interactive) return;
  const node = currentTree[dlgNode];
  const o = node && node.opts[i];
  if(!o) return;
  sMove();
  addYou(o.label);           // record the player's chosen line in the log
  dlgNode = o.to;
  showNode();                // the spirit's response
}

function decide(approve){
  if(gPhase!=='plea' || typeState || !interactive) return;
  lastApprove = approve;
  gPhase='judging';
  decisionsToday++; renderHud();     // counts toward the day's quota
  stopSceneMusic();                  // they leave the castle; the theme goes with them
  setInteractive(false);
  setOptsVisible(false);             // dialogue options go away once judged
  addMsg('decision', `You ${approve?'APPROVED':'DENIED'} them.`, false);
  sConfirm();
  walker.classList.remove('s-in','s-infar');
  walker.style.display='block';      // the spirit steps back out of the building...
  void walker.offsetWidth;
  walker.classList.add('s-red');     // ...and walks to the red line, stopping there
  updateHints();
}

function reachRedline(){
  gPhase='verdict';
  updateHints();
  if(ticketRide){ scheduleBeat(goToPlatform, 500); return; }   // ticket holders skip judgment
  scheduleBeat(showVerdict, 850);   // a beat of silence, then judgment
}
function showVerdict(){
  const correct = (lastApprove === currentGood);   // approve the good, deny the bad
  addMsg('verdict '+(correct?'good':'bad'),
    correct ? 'A right judgment.' : 'A wrong judgment.', false);
  if(correct){ sConfirm(); } else { sError(); loseHeart(); }
  scheduleBeat(goToPlatform, 1300);  // let it land, then move on
}
function goToPlatform(){
  gPhase='fating';
  walker.classList.remove('s-red');
  walker.classList.add('s-plat');
  updateHints();
}
function reachPlatform(){
  gPhase='fate';
  walker.classList.remove('s-plat');
  if(lastApprove){
    walker.classList.add('good','s-up');       // beamed up to heaven
    startBeamFx();
  } else {
    walker.classList.add('bad','s-burn');      // burns up in flames
    startBurnFx();
  }
  updateHints();
}

/* rising shimmer for the beam-up */
const sBeam = ()=>{
  if(settings.volume<=0) return;
  const a=audio(); if(!a) return;
  const v=settings.volume/100;
  const o=a.createOscillator(), g=a.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(220, a.currentTime);
  o.frequency.exponentialRampToValueAtTime(1500, a.currentTime+1.2);   // rising sweep
  g.gain.setValueAtTime(0.0001, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.2*v, a.currentTime+0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime+1.6);
  o.connect(g).connect(a.destination);
  o.start(); o.stop(a.currentTime+1.6);
  for(let i=0;i<4;i++)                                                  // sparkle pings
    setTimeout(()=>beep(900+Math.random()*900, 0.05, 'triangle', 0.04), 250+i*320+Math.random()*120);
};

/* the beam column + golden sparkles streaming upward around the spirit */
function startBeamFx(){
  playSfx('music/heaven sound.mp3', sBeam);
  const beamEl=$('beam');
  beamEl.classList.remove('on'); void beamEl.offsetWidth; beamEl.classList.add('on');
  beamEl.addEventListener('animationend', ()=>beamEl.classList.remove('on'), {once:true});
  const colors=['#fff6c8','#ffe98a','#ffd75e','#ffffff'];
  const t0=Date.now();
  const em=setInterval(()=>{
    if(Date.now()-t0>1650 || !walker.classList.contains('s-up')){ clearInterval(em); return; }
    if(paused) return;
    const r=walker.getBoundingClientRect();
    if(!r.width){ clearInterval(em); return; }
    for(let i=0;i<2;i++){
      spawnFrag(r.left-r.width*0.6+Math.random()*r.width*2.2,
                r.top+Math.random()*r.height*1.7, {
        color: colors[(Math.random()*colors.length)|0],
        size: 1+(Math.random()*3|0),
        spd: 0.2+Math.random()*0.7,
        up: 1.8+Math.random()*2.8,
        decay: 0.025+Math.random()*0.03,
        g: -0.05,                                // pulled upward with the spirit
      });
    }
  }, 40);
}

/* fire crackle for the burn */
const sBurn = ()=>{
  noise(0.5, 0.25);
  for(let i=0;i<6;i++)
    setTimeout(()=>beep(110+Math.random()*180, 0.03, 'square', 0.05), 60+i*150+Math.random()*80);
};

/* flame + ember particles rising off the walker while it burns */
function startBurnFx(){
  playSfx('music/hell sound.mp3', sBurn);
  const colors=['#ffdf6b','#ffb13b','#ff7a2f','#e8543a','#c83a3a'];
  const t0=Date.now();
  const em=setInterval(()=>{
    if(Date.now()-t0>1250 || !walker.classList.contains('s-burn')){ clearInterval(em); return; }
    if(paused) return;                           // no sparks while the game is paused
    const r=walker.getBoundingClientRect();
    if(!r.width){ clearInterval(em); return; }
    for(let i=0;i<3;i++){
      const smoke = Math.random()<0.2;
      spawnFrag(r.left+Math.random()*r.width, r.top+Math.random()*r.height, {
        color: smoke ? '#6b5a52' : colors[(Math.random()*colors.length)|0],
        size: 2+(Math.random()*4|0),
        spd: 0.4+Math.random()*1.2,
        up: 1.2+Math.random()*2.6,
        decay: 0.03+Math.random()*0.03,
        g: smoke ? -0.015 : 0.01,                // flames & smoke drift up, not down
      });
    }
  }, 45);
}
function resolveSpirit(){
  ticketRide = false;
  if(!lastApprove && currentSpirit && currentSpirit.denyGameOver){
    triggerBadEnding('keira');                       // some souls must not be turned away
  } else if(hearts<=0){
    triggerBadEnding('lives');                       // out of lives -> game over
  } else if(decisionsToday >= dayQueue.length){
    dayComplete();                                   // every character seen -> next day
  } else {
    nextSpirit();
  }
}

function dayBreak(message, action){
  gPhase='dayend';
  dayEndAction = action;
  stopSceneMusic();
  clearTimeout(beatTimer); beatFn=null; beatRemain=null;   // cancel any pending verdict beat
  clearWalker(); walker.style.display='none';
  clearQueue();
  zPortrait.classList.remove('show');
  setInteractive(false); setOptsVisible(false);
  clearConvo();
  addMsg('day', message, false);
  addMsg('prompt', '[ press Enter ]', false);
  updateHints();
}
function continueDay(){
  if(gPhase!=='dayend' || !dayEndAction) return;
  const a=dayEndAction; dayEndAction=null;
  sConfirm(); a();
}

btnYes.addEventListener('click', ()=>{ if(current==='game'&&!paused) decide(true); });
btnNo .addEventListener('click', ()=>{ if(current==='game'&&!paused) decide(false); });
opt1.addEventListener('click', ()=>{ if(current!=='game'||paused) return; chooseOption(0); });
opt2.addEventListener('click', ()=>{ if(current!=='game'||paused) return; chooseOption(1); });
$('powTicket').addEventListener('click', ()=>{ if(current==='game'&&!paused) giveTicket(); });
$('zMain').addEventListener('click', ()=>{
  if(current!=='game' || paused || rulesOpen) return;
  if(gPhase==='walking') skipWalk();
  else if(gPhase==='plea' && typeState) finishTyping();
  else if(gPhase==='dayend') continueDay();
});

function handleGameKey(e){
  // golden ticket (giveTicket guards when it's usable)
  if(e.key==='t'||e.key==='T'){ giveTicket();         e.preventDefault(); return; }
  if(gPhase==='walking'){
    if(e.key==='Enter'||e.key==='z'||e.key==='Z') skipWalk();
    e.preventDefault(); return;
  }
  if(gPhase==='plea'){
    if(typeState){
      if(e.key==='Enter'||e.key==='z'||e.key==='Z') finishTyping();
    } else {
      if(e.key==='1') chooseOption(0);
      else if(e.key==='2') chooseOption(1);
      else if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A') decide(true);   // approve
      else if(e.key==='ArrowRight'||e.key==='d'||e.key==='D') decide(false); // deny
    }
    e.preventDefault(); return;
  }
  if(gPhase==='dayend'){
    if(e.key==='Enter'||e.key==='z'||e.key==='Z') continueDay();
    e.preventDefault(); return;
  }
  e.preventDefault();   // judging / verdict / fating / fate are automatic
}

/* ---------- pause menu (Esc during the game) ---------- */
let paused = false;
let settingsFrom = 'title';     // where Settings was opened from
let prevActiveMenu = null;
const pauseScreen = document.getElementById('pauseScreen');
const pauseMenu = new Menu(document.getElementById('pauseMenu'), [
  { label:'Return',   onSelect:()=>closePause(true) },
  { label:'Save',     onSelect:()=>{ closePause(false); openSlots('save','pause'); } },
  { label:'Settings', onSelect:()=>{ settingsFrom='pause'; closePause(false); show('settings'); } },
  { label:'Quit',     onSelect:()=>{ closePause(false); sBack(); show('title'); } },
]);
function openPause(){
  if(paused) return;
  paused = true;
  pauseType();                 // freeze the typewriter
  pauseBeat();                 // freeze the verdict pause
  if(sceneAudio) sceneAudio.pause();          // freeze the character's theme
  walker.style.animationPlayState='paused';   // freeze the walking spirit
  $('beam').style.animationPlayState='paused';
  $('walkerImg').style.animationPlayState='paused';
  $('queue').getAnimations({subtree:true}).forEach(a=>a.pause());
  prevActiveMenu = activeMenu;
  activeMenu = pauseMenu;
  pauseScreen.classList.add('show');
  pauseMenu.index = 0; pauseMenu.draw();
  sBack();
  updateHints();
}
function closePause(resume){
  if(!paused) return;
  paused = false;
  pauseScreen.classList.remove('show');
  activeMenu = prevActiveMenu;
  if(resume){ sMove(); resumeType(); resumeBeat();
    resumeSceneMusic();
    walker.style.animationPlayState='running';
    $('beam').style.animationPlayState='running';
    $('walkerImg').style.animationPlayState='running';
    $('queue').getAnimations({subtree:true}).forEach(a=>a.play()); }
  updateHints();
}
function handlePauseKey(e){
  switch(e.key){
    case 'ArrowUp': case 'w': case 'W': pauseMenu.move(-1); break;
    case 'ArrowDown': case 's': case 'S': pauseMenu.move(1); break;
    case 'Enter': case 'z': case 'Z': pauseMenu.activate(); break;
    case 'Escape': case 'x': case 'X': closePause(true); break;
  }
  e.preventDefault();
}
function backFromSettings(){
  sBack();
  if(settingsFrom==='pause'){ show('game'); openPause(); }   // back to the paused game
  else { show('title'); }
}

/* ---------- save / load (3 slots in localStorage) ---------- */
const SAVE_PREFIX = 'joa_save_';
function readSlot(n){ try{ return JSON.parse(localStorage.getItem(SAVE_PREFIX+n)); }catch(e){ return null; } }
function writeSlot(n, data){ try{ localStorage.setItem(SAVE_PREFIX+n, JSON.stringify(data)); return true; }catch(e){ return false; } }
function saveSnapshot(){
  return { v:1, name:playerName, day, hearts, decisionsToday, spiritNo,
           ticket, ticketG:ticketGranted,
           dayStart:dayStartSpiritNo, queue:dayQueue.map(s=>s.name),
           ticketWin:ticketGivenToWinner,
           t:Date.now() };
}
function loadGame(s){
  if(!s) return;
  playerName     = s.name || '';
  day            = Math.min(s.day || 1, FINAL_DAY);   // no saves beyond the final day
  hearts         = (s.hearts!=null ? s.hearts : 3);
  decisionsToday = s.decisionsToday || 0;
  spiritNo       = (s.spiritNo || 1) - 1;         // nextSpirit() will ++ back to it
  dayStartSpiritNo = s.dayStart || 0;
  // resolve the saved lineup against THIS day's roster only; a save from an
  // older build (or with foreign names) gets a fresh, correctly-scoped lineup
  const roster = day>=3 ? SPIRITS_DAY3 : day>=2 ? SPIRITS_DAY2 : SPIRITS_DAY1;
  dayQueue       = (s.queue||[]).map(n=>roster.find(sp=>sp.name===n)).filter(Boolean);
  if(!dayQueue.length || dayQueue.length !== (s.queue||[]).length) buildDayQueue();
  if(dayGhosts.length!==dayQueue.length)
    dayGhosts = dayQueue.map(()=>GHOSTS[(Math.random()*GHOSTS.length)|0]);
  clearQueue();
  ticket         = (s.ticket!=null ? s.ticket : 0);
  ticketGranted  = !!s.ticketG;
  ticketGivenToWinner = !!s.ticketWin;
  buildRules(); renderHud(); renderPowerups();   // rules come from the day itself
  show('game');
  showDayCard(day, ()=>{ nextSpirit(); });   // "Day N" card, then resume
}

let slotsMode='load', slotsFrom='title', slotsMenu=null;
function slotText(n){
  const s=readSlot(n);
  if(!s) return `Slot ${n} — empty`;
  return `Slot ${n} — ${(s.name||'—')}, Day ${s.day}`;
}
function buildSlotsMenu(){
  const items=[];
  for(let n=1;n<=3;n++){
    const filled = !!readSlot(n);
    items.push({ label: slotText(n), onSelect: ()=>{
      if(slotsMode==='save') doSave(n);
      else if(filled) doLoad(n);
      else sError();                    // empty slot in load mode
    }});
  }
  items.push({ label:'Back', onSelect:()=>backFromSlots() });
  slotsMenu = new Menu(document.getElementById('slotsMenu'), items);
  activeMenu = slotsMenu;
}
function openSlots(mode, from){
  slotsMode=mode; slotsFrom=from;
  document.getElementById('slotsTitle').textContent = mode==='save' ? 'Save Game' : 'Load Game';
  document.getElementById('slotsNote').textContent  = mode==='save' ? 'choose a slot to overwrite' : 'choose a save to load';
  buildSlotsMenu();
  show('slots');
}
function doSave(n){
  const ok = writeSlot(n, saveSnapshot());
  sConfirm();
  buildSlotsMenu(); slotsMenu.index=n-1; slotsMenu.draw();   // refresh the slot label
  document.getElementById('slotsNote').textContent = ok ? `Saved to Slot ${n}.` : `Couldn't save — storage is blocked.`;
}
function doLoad(n){
  const s=readSlot(n); if(!s){ sError(); return; }
  sConfirm(); loadGame(s);
}
function backFromSlots(){
  sBack();
  if(slotsFrom==='pause'){ show('game'); openPause(); }      // back to the paused game
  else { show('title'); }
}

/* ---------- name entry ---------- */
let playerName = '';
const nameInput = document.getElementById('nameInput');
function submitName(){
  const v = nameInput.value.trim();
  if(!v){ // nudge them to type something
    nameInput.classList.remove('shake'); void nameInput.offsetWidth;
    nameInput.classList.add('shake'); sBack(); return;
  }
  playerName = v;
  sConfirm();
  nameInput.blur();          // release focus so the opening owns the keyboard
  show('opening');
}
nameInput.addEventListener('keydown', e=>{
  if(current!=='name') return;   // hidden input must not hijack later screens
  if(e.key==='Enter'){ e.preventDefault(); e.stopPropagation(); submitName(); }
  else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); nameInput.blur(); sBack(); show('title'); }
});

/* ---------- opening sequence (after name entry) ----------
   One panel per LINE — press Enter to advance line by line.
   img:  set on the first line of a scene (omit it to keep the current image;
         null shows the dashed placeholder box)
   music: set on the first line of a scene (per-scene track)
   voice: a voiceline that plays when the line appears (BOATS AUDIO folder)
   video: this line plays a video in the image slot (its own sound; scene
          music pauses) — drop the clip at art/lotze_video.mp4 (or .mov) */
const openingPanels = [
  // — the hospital —
  { img:'art/Deathbed.png', music:'music/hospital.mp3',
    text:"You lay on the bed, next to all your loved ones. She holds ur hand as you smile around. All your loved ones stay around you. You made it 85 blissful years." },
  { text:"A warm sensation flows from your toes to your head… And slowly the voices drown out." },
  { text:"It's over…" },
  // — hell —
  { img:'art/Hell_.png', music:'music/Lotze intro hell.mp3', voice:'BOATS AUDIO/BOATS_1.aac',
    text:"JOAQUIN. YOU HAVE LIVED A BEAUTIFUL LIFE, WITH SIN. BUT IT IS HOW YOU DEAL WITH SIN THAT MARKS THE MAN. OR WOMAN. I'M NOT JUDGING." },
  { voice:'BOATS AUDIO/BOATS_2.aac',
    text:"I HAVE CHOSEN AN EARTHLY FORM, TO HELP YOUR HUMAN SOUL PERCEIVE ME." },
  { voice:'BOATS AUDIO/BOATS_3.aac',
    text:"CAN YOU TELL WHO I AM? LET ME GIVE YOU A HINT." },
  // — meesta lotze (the video plays here) —
  { video:'art/lotze_video.mov'},
  // — heaven —
  { img:'art/LotzeGreeting.png', music:'music/Lotze intro heaven.mp3', voice:'BOATS AUDIO/BOATS_4.aac',
    text:"YES. I AM MR.LOTZE. BUT AGAIN, YOU HAVE DIED. AND I NEED TO ASK OF YOU A FAVOR." },
  { voice:'BOATS AUDIO/BOATS_5.aac',
    text:"I KNOW IT'S IN ILL TASTE. AS YOU JUST PASSED AND ALL, BUT I NEED YOU TO TAKE MY SHIFT." },
  { voice:'BOATS AUDIO/BOATS_6.aac',
    text:"I'VE BEEN WORKING FOR OVER 2000 SOME YEARS, AFTER CHRIST N ALL, BUT ALSO I'M NOT DEEPLY RELIGIOUS, I'M NOT GOD LIKE IN THE CHRISTIANITY SENSE- EH WHO CARES." },
  { voice:'BOATS AUDIO/BOATS_7.aac',
    text:"BUT I NEED YOU TO TAKE MY JOB, AS GATEKEEPER BETWEEN HEAVEN AND HELL. OR WHATEVER RELIGIOUS EQUIVALENT." },
  { voice:'BOATS AUDIO/BOATS_8.aac',
    text:"I NEED TO TAKE MY GIRL ON A DATE NIGHT, BUT I'VE BEEN TOO BUSY, ALL THIS DECISION MAKING." },
  { voice:'BOATS AUDIO/BOATS_9.aac',
    text:"ALL YOU HAVE TO DO IS INTERVIEW EACH CANDIDATE IN LINE, AND LET THEM IN BASED OFF THE RULES, IN MY GODLY RULE BOOK." },
  { voice:'BOATS AUDIO/BOATS_10.aac',
    text:"OH AND UH, SOULS DON'T TAKE THE FORM OF THEIR PHYSICAL EARTHLY APPEARANCE. THEY ARE REDUCED TO THEIR PUREST 'ESSENCE' BUT TO MAKE IT EASY, I HAVE ONLY GIVEN YOU SOULS FROM YOUR PAST TO JUDGE." },
  { voice:'BOATS AUDIO/BOATS_11.aac',
    text:"SO USING THE RULE BOOK, JUDGE THESE SOULS. FIGURE OUT WHO THAT SOUL IS, AND IF THEY SHOULD PASS BASED OFF THE RULES." },
];

/* voiceline channel — one line at a time; advancing a line cuts the old one */
let voiceEl = null;
function playVoice(src){
  stopVoice();
  if(!src || !settings.volume) return null;
  voiceEl = new Audio(encodeURI(src));
  voiceEl.volume = Math.min(1, settings.volume/100);
  duckMusic(0.2);                                   // drop the music under the voice
  voiceEl.onerror = ()=>duckMusic(1);
  voiceEl.onended = ()=>{                           // voice done -> line fully typed
    duckMusic(1);
    finishCut();        // opening typer (no-op when idle)
    finishEndType();    // ending typer  (no-op when idle)
  };
  voiceEl.play().catch(()=>{});
  return voiceEl;
}
/* keep a typewriter in step with its voiceline: once the clip's length is
   known, spread the remaining letters over the time the voice has left */
function paceToVoice(v, getTyper, retimer){
  if(!v) return;
  const retime = ()=>{
    const t = getTyper(); if(!t || !v.duration || !isFinite(v.duration)) return;
    const remain = t.text.length - t.i;
    const msLeft = (v.duration - v.currentTime) * 1000;
    if(remain > 0 && msLeft > 0) retimer(Math.max(12, msLeft * 0.95 / remain));
  };
  if(isFinite(v.duration) && v.duration) retime();
  else v.addEventListener('loadedmetadata', retime, {once:true});
}
function stopVoice(){ if(voiceEl){ try{ voiceEl.pause(); }catch(e){} voiceEl=null; } duckMusic(1); }
function stopCutVideo(){ const v=document.querySelector('#cutImage video'); if(v){ try{ v.pause(); }catch(e){} v.remove(); } }
let openingIndex = 0;
let openTyper = null;     // active cutscene typewriter, or null when idle/done
function typeCut(text, voice){
  const el = document.getElementById('cutText');
  const speed = settings.textSpeed==='Fast'?14 : settings.textSpeed==='Slow'?52 : 28;
  if(openTyper) clearInterval(openTyper.timer);
  openTyper = { text, i:0, el, timer:null };
  el.innerHTML = '<span class="caret">&nbsp;</span>';
  const tick = ()=>{
    const t = openTyper; if(!t) return;
    t.i++;
    t.el.innerHTML = t.text.slice(0,t.i) + '<span class="caret">&nbsp;</span>';
    if(t.i%3===0) beep(420,0.012,'square',0.02);   // soft typing blip
    if(t.i>=t.text.length) finishCut();
  };
  openTyper.timer = setInterval(tick, speed);
  paceToVoice(voice, ()=>openTyper, ms=>{           // voiced lines type at voice speed
    if(!openTyper) return;
    clearInterval(openTyper.timer);
    openTyper.timer = setInterval(tick, ms);
  });
}
function finishCut(){
  if(!openTyper) return;
  clearInterval(openTyper.timer);
  openTyper.el.textContent = openTyper.text;        // snap to the full line
  openTyper = null;
}
function renderOpening(){
  const p = openingPanels[openingIndex] || {};
  const img = document.getElementById('cutImage');
  const go  = document.getElementById('cutGo');
  if('video' in p){
    stopSceneMusic();                     // the clip brings its own sound
    img.innerHTML = '';
    const v = document.createElement('video');
    v.autoplay = true; v.playsInline = true;
    v.volume = settings.volume ? Math.min(1, settings.volume/100) : 0;
    v.onerror = ()=>{                     // .mp4 missing? try .mov, then a note
      if(!v.dataset.alt){ v.dataset.alt='1'; v.src = encodeURI(p.video.replace(/\.mp4$/i,'.mov')); }
      else img.innerHTML = `<span>[ drop the clip at ${p.video} ]</span>`;
    };
    v.src = encodeURI(p.video);
    img.appendChild(v);
    img.classList.remove('in'); void img.offsetWidth; img.classList.add('in');
  } else if('img' in p){                  // scene change — new image (or dashed box)
    img.innerHTML = p.img
      ? `<img src="${p.img}" alt="">`
      : `<span>[ image ${openingIndex+1} / ${openingPanels.length} ]</span>`;
    img.classList.remove('in'); void img.offsetWidth; img.classList.add('in');
  }                                       // no img/video key = keep the current image
  go.textContent  = openingIndex < openingPanels.length-1 ? '[ press Enter ]' : '[ begin ]';
  if(p.music) playSceneMusic(p.music);                                        // per-scene track
  const v = playVoice(p.voice);           // cuts the previous voiceline (or just stops it)
  typeCut((p.text||'').replace(/NAME/g, playerName || 'friend'), v);          // text keeps the voice's pace
}
function advanceOpening(){
  if(openTyper){ finishCut(); return; }   // first press completes the line...
  if(openingIndex < openingPanels.length-1){ openingIndex++; renderOpening(); sMove(); }
  else { stopVoice(); stopCutVideo(); sConfirm(); startGame(); }   // ...last line -> the game
}
function skipOpening(){ finishCut(); stopVoice(); stopCutVideo(); sConfirm(); startGame(); }
document.getElementById('openingScreen').addEventListener('click', ()=>{
  if(current==='opening') advanceOpening();
});

/* ---------- ending cutscenes (bad / normal / secret) ----------
   Same image-on-top / text-under style as the opening. All PLACEHOLDER. */
const endTitle = document.getElementById('endTitle');
const endImage = document.getElementById('endImage');
const endText  = document.getElementById('endText');
const endGo    = document.getElementById('endGo');
const ENDINGS = {
  normal: {
    panels: [
      // — scene one —
      { img:'art/Ending.png', music:'music/lotze hawaii.mp3', voice:'LOTZE AUDIO/LOTZE_1.aac',
        text:"AHHH THANK YOU JOAQUIN. I'M BACK, DINNER WITH THE MISSUS, IS SO OK. LET'S SEE HOW YOU DID." },
      { voice:'LOTZE AUDIO/LOTZE_2.aac',
        text:"HMM. AH. HM. OK. YEAH. THAT'S… ADEQUATE. YOU DID FINE PAL." },
      { voice:'LOTZE AUDIO/LOTZE_3.aac',
        text:"UHM. LET ME JUST. UH. PUT YA HERE." },
      // — scene two (the transition lands here, after LOTZE_3) —
      { img:'art/Good_.png', music:'music/ending_normal.mp3', voice:'LOTZE AUDIO/LOTZE_4.aac',
        text:"JUST UH, WAIT IN LINE. AND… THERE'S JUST A FEW PEOPLE AHEAD OF YA. OK. YEAH. COOL." },
      { voice:'LOTZE AUDIO/LOTZE_5.aac',
        text:"UHMM. SO THIS ENDING IS A BIT UHH, OK. OK ENDING TO THIS NIGHT. IF ONLY YOU WERE ABLE TO REDO IT HUH? TOO BAD U CAN'T." },
      { voice:'LOTZE AUDIO/LOTZE_6.aac',
        text:"SO JUST WAIT IN LINE, AND THE GATEKEEPER WILL UHH JUDGE YOU." },
      { voice:'LOTZE AUDIO/LOTZE_7.aac',
        text:"PEACE." },
    ],
  },
  secret: {
    panels: [
      // — hell: God is not pleased —
      { img:'art/Hell_.png', music:'music/Lotze intro hell.mp3', voice:'CHINA AUDIO/CHINA_1.aac',
        text:"JOAQUIN. YOU HAVE DISOBEYED ME. GONE AGAINST DIRECT ORDERS." },
      { voice:'CHINA AUDIO/CHINA_2.aac',
        text:"YOU THINK YOU ARE THE JUDGE OF GOOD & EVIL." },
      { voice:'CHINA AUDIO/CHINA_3.aac',
        text:"I GAVE YOU RULES. RULES FROM GOD. TO FOLLOW." },
      { voice:'CHINA AUDIO/CHINA_4.aac',
        text:"DID YOU? NO. YOU GAVE OUT CHEATS, GOLDEN TICKETS. DIRECTLY GOING AGAINST MY JUDGEMENT." },
      { voice:'CHINA AUDIO/CHINA_5.aac',
        text:"YOU ARE NOT JOB. YOU ARE A MORTAL, WITH WARPED PERCEPTION OVER RIGHT AND WRONG. TELL ME. DO YOU HAVE MORE CLARITY THAN GOD?" },
      // — Joaquin answers (no voicelines; "Sorry" is fatal) —
      { choice: [
          { label:"Um… well… YES. You let good, honest people go to hell? Over random “RULES” you made up? HOW is that fair?!" },
          { label:"Sorry", gameover:true },
      ]},
      { voice:'CHINA AUDIO/CHINA_8.aac',
        text:"THAT MAKES ME MAD. I'M MAD." },
      // — the turn: LotzeGreeting after CHINA_8 —
      { img:'art/LotzeGreeting.png', music:'music/Lotze intro heaven.mp3', voice:'CHINA AUDIO/CHINA_9.aac',
        text:"Justtttttt kidding." },
      { voice:'CHINA AUDIO/CHINA_10.aac',
        text:"That's why I chose you to do this. You have a deeply strong moral compass, that I admire. You're not perfect, but you try, that's all anyone can ask." },
      { voice:'CHINA AUDIO/CHINA_11.aac',
        text:"You disobeyed authority, to stay by your principles, and for that I grant you…" },
      { voice:'CHINA AUDIO/CHINA_12.aac',
        text:"Access to HEAVEN, or some non-religious alternative." },
      { voice:'CHINA AUDIO/CHINA_13.aac',
        text:"AND I GIVE U THESE:" },
      // — the goggles, after CHINA_13 —
      { img:'art/PowerGoggles.png', voice:'music/zelda.mp3',
        text:"*GLASSES*" },
      { voice:'CHINA AUDIO/CHINA_15.aac',
        text:"Try these on during your next play through." },
      // — finale: the true ending fills the whole screen —
      { full:'art/TrueEnding.png', music:'music/muchacho.mp3' },
    ],
  },
};
let endPanels=[], endIndex=0, endOnDone=null, endTyper=null, endClass='';
function typeEnd(text, voice){
  const speed = settings.textSpeed==='Fast'?14 : settings.textSpeed==='Slow'?52 : 28;
  if(endTyper) clearInterval(endTyper.timer);
  endTyper={ text, i:0, timer:null };
  endText.innerHTML='<span class="caret">&nbsp;</span>';
  const tick = ()=>{
    const t=endTyper; if(!t) return;
    t.i++; endText.innerHTML = t.text.slice(0,t.i)+'<span class="caret">&nbsp;</span>';
    if(t.i%3===0) beep(300,0.012,'square',0.02);
    if(t.i>=t.text.length) finishEndType();
  };
  endTyper.timer=setInterval(tick, speed);
  paceToVoice(voice, ()=>endTyper, ms=>{            // voiced lines type at voice speed
    if(!endTyper) return;
    clearInterval(endTyper.timer);
    endTyper.timer = setInterval(tick, ms);
  });
}
function finishEndType(){ if(!endTyper) return; clearInterval(endTyper.timer); endText.textContent=endTyper.text; endTyper=null; }
function renderEnd(){
  const p = endPanels[endIndex] || {};
  endTitle.className = 'end-title ' + endClass;
  document.getElementById('endScreen').classList.toggle('endfull', !!p.full);
  if(p.full){                             // finale — the image takes the whole screen
    if(endTyper){ clearInterval(endTyper.timer); endTyper=null; }
    if(p.music) playSceneMusic(p.music);
    endText.textContent = '';
    endImage.innerHTML = `<img src="${p.full}" alt="">`;
    endImage.classList.remove('in'); void endImage.offsetWidth; endImage.classList.add('in');
    endGo.textContent = endIndex < endPanels.length-1 ? '[ press Enter ]' : '[ continue ]';
    playVoice(p.voice);
    return;
  }
  if(p.choice){                           // Joaquin speaks — pick a line
    if(endTyper){ clearInterval(endTyper.timer); endTyper=null; }
    playVoice(null);
    endText.innerHTML = p.choice.map((c,i)=>
      `<div class="end-choice" data-i="${i}"><b>${i+1}.</b> ${c.label}</div>`).join('');
    endText.querySelectorAll('.end-choice').forEach(el=>{
      el.addEventListener('click', ev=>{ ev.stopPropagation(); chooseEndOption(+el.dataset.i); });
    });
    endGo.textContent = '[ press 1 or 2 ]';
    return;
  }
  if('img' in p || endIndex===0){         // scene change — new image (or dashed box)
    endImage.innerHTML = p.img ? `<img src="${p.img}" alt="">`
                               : `<span>[ image ${endIndex+1} / ${endPanels.length} ]</span>`;
    endImage.classList.remove('in'); void endImage.offsetWidth; endImage.classList.add('in');
  }                                       // no img key = keep the current scene image
  endGo.textContent = endIndex < endPanels.length-1 ? '[ press Enter ]' : '[ continue ]';
  if(p.music) playSceneMusic(p.music);    // per-scene track
  const v = playVoice(p.voice);           // cuts the previous voiceline (or just stops it)
  typeEnd((p.text||'').replace(/NAME/g, playerName || 'friend'), v);
}
function playEnding(ending, cls, onDone){
  endTitle.textContent = ending.title || '';
  endClass = cls || '';
  endPanels = (ending.panels || []).slice();   // a copy — the Sorry path rewrites it
  endIndex = 0;
  endOnDone = onDone || null;
  show('end');               // show() calls renderEnd()
}
function chooseEndOption(i){
  const p = endPanels[endIndex] || {};
  const c = p.choice && p.choice[i]; if(!c) return;
  sConfirm();
  if(c.gameover){                         // "Sorry" — God is unmoved
    endPanels = [{ text:"DIE" }];
    endIndex = 0;
    endOnDone = ()=>{
      stopSceneMusic();
      document.getElementById('gameOverSub').textContent = "Sorry doesn't cut it.";
      show('gameover');
    };
    renderEnd();
    return;
  }
  endIndex++; renderEnd();
}
function advanceEnd(){
  const p = endPanels[endIndex] || {};
  if(p.choice) return;                    // a choice needs an answer, not Enter
  if(endTyper){ finishEndType(); return; }
  if(endIndex < endPanels.length-1){ endIndex++; renderEnd(); sMove(); }
  else { const d=endOnDone; endOnDone=null; stopVoice(); sConfirm(); if(d) d(); }
}
document.getElementById('endScreen').addEventListener('click', ()=>{
  if(current==='end') advanceEnd();
});
document.getElementById('gameOverScreen').addEventListener('click', ()=>{
  if(current==='gameover'){ sBack(); show('title'); }
});

/* fail states route here instead of restarting the day */
function triggerBadEnding(reason){
  gPhase='ended';
  clearTimeout(beatTimer); beatFn=null; beatRemain=null;
  clearWalker(); walker.style.display='none';
  clearQueue();
  setInteractive(false); setOptsVisible(false);
  document.getElementById('gameOverSub').textContent =
    reason==='keira' ? "Some souls were never yours to turn away." :
    reason==='lives' ? "you lost all three lives." :
                       "the day went wrong.";
  sError();
  show('gameover');     // simple game over screen; any key returns to the title
}

/* survived through the final day -> the normal ending */
function triggerNormalEnding(){
  gPhase='ended';
  clearTimeout(beatTimer); beatFn=null; beatRemain=null;
  clearWalker(); walker.style.display='none';
  clearQueue();
  setInteractive(false); setOptsVisible(false);
  playEnding(ENDINGS.normal, 'normal', ()=>show('title'));
  // music comes from the panels: "lotze hawaii" over Ending.png, then ending_normal
}

/* the golden ticket given to the RIGHT person */
function triggerSecretEnding(){
  if(!glassesUnlocked){                          // the goggles are yours forever now
    glassesUnlocked = true;
    try{ localStorage.setItem('joa_glasses','1'); }catch(e){}
    buildSettingsMenu();
  }
  gPhase='ended';
  clearTimeout(beatTimer); beatFn=null; beatRemain=null;
  clearWalker(); walker.style.display='none';
  clearQueue();
  setInteractive(false); setOptsVisible(false);
  playEnding(ENDINGS.secret, 'secret', ()=>show('title'));
  // music comes from the panels: hell track, then heaven from "Justtttttt kidding."
}

/* ---------- input ---------- */
window.addEventListener('keydown',(e)=>{
  if(quitting){
    if(e.key==='Enter'||e.key==='z'||e.key==='Z'||e.key==='x'||e.key==='X'){ unquit(); }
    e.preventDefault(); return;
  }
  if(current==='pass'){
    if(e.key==='Enter'){ e.preventDefault(); submitPassword(); return; }
    if(document.activeElement!==passInput){ passInput.focus(); }   // re-arm typing
    return;
  }
  if(current==='name'){
    // When the field is focused it handles its own keys (and stops them here).
    // This is the fallback for when the field is NOT focused (greyed out).
    if(e.key==='Escape'){ e.preventDefault(); nameInput.blur(); sBack(); show('title'); return; }
    if(e.key==='Enter'){ e.preventDefault(); submitName(); return; }
    if(document.activeElement!==nameInput){ nameInput.focus(); }   // re-arm typing
    return;
  }
  if(current==='opening'){
    if(e.key==='Enter'||e.key==='z'||e.key==='Z'){ advanceOpening(); }
    else if(e.key==='Escape'||e.key==='x'||e.key==='X'){ skipOpening(); }
    e.preventDefault(); return;
  }
  if(current==='end'){
    if(e.key==='Enter'||e.key==='z'||e.key==='Z'){ advanceEnd(); }
    else if(e.key==='1'||e.key==='2'){ chooseEndOption(+e.key-1); }
    e.preventDefault(); return;
  }
  if(current==='gameover'){
    if(e.key==='Enter'||e.key==='z'||e.key==='Z'||e.key==='Escape'){ sBack(); show('title'); }
    e.preventDefault(); return;
  }
  if(current==='game'){
    if(paused){ handlePauseKey(e); return; }
    if(gPhase==='transition'){ e.preventDefault(); return; }   // ignore input during the day card
    if(rulesOpen){ if(e.key==='Escape'||e.key==='x'||e.key==='X'){ closeRules(); } e.preventDefault(); return; }
    if(e.key==='Escape'||e.key==='x'||e.key==='X'){ openPause(); e.preventDefault(); return; }
    handleGameKey(e); return;
  }
  switch(e.key){
    case 'ArrowUp': case 'w': case 'W': activeMenu.move(-1); e.preventDefault(); break;
    case 'ArrowDown': case 's': case 'S': activeMenu.move(1); e.preventDefault(); break;
    case 'ArrowLeft': case 'a': case 'A': activeMenu.horizontal(-1); e.preventDefault(); break;
    case 'ArrowRight': case 'd': case 'D': activeMenu.horizontal(1); e.preventDefault(); break;
    case 'Enter': case 'z': case 'Z': activeMenu.activate(); e.preventDefault(); break;
    case 'x': case 'X': case 'Escape':
      if(current==='settings'){ backFromSettings(); }
      else if(current==='slots'){ backFromSlots(); }
      else if(current!=='title'){ sBack(); show('title'); }
      e.preventDefault(); break;
  }
});

/* ---------- footer hints ---------- */
function updateHints(){
  renderPowerups();   // keep the powerup bar's counts/usable-state fresh
  const h=document.getElementById('hints');
  const touch = matchMedia('(hover:none)').matches;
  if(paused){ h.innerHTML = touch ? `<b>tap</b> to choose` : `<b>&#8597;</b> move &nbsp;&nbsp; <b>Z / Enter</b> select &nbsp;&nbsp; <b>Esc</b> resume`; return; }
  if(current==='name'){ h.innerHTML = `type your name &nbsp;&nbsp; <b>Enter</b> begin &nbsp;&nbsp; <b>Esc</b> back`; return; }
  if(current==='pass'){ h.innerHTML = `<b>Enter</b> submit`; return; }
  if(current==='opening'){ h.innerHTML = touch ? `<b>tap</b> to continue` : `<b>Z / Enter</b> continue &nbsp;&nbsp; <b>Esc</b> skip`; return; }
  if(current==='end'){ h.innerHTML = touch ? `<b>tap</b> to continue` : `<b>Z / Enter</b> continue`; return; }
  if(current==='gameover'){ h.innerHTML = touch ? `<b>tap</b> to return to title` : `<b>Z / Enter</b> return to title`; return; }
  if(current==='game'){
    if(rulesOpen)              h.innerHTML = touch ? `<b>tap</b> to close` : `<b>Esc</b> close rules`;
    else if(gPhase==='walking')h.innerHTML = touch ? `a spirit approaches…` : `<b>Z / Enter</b> skip`;
    else if(gPhase==='plea')   h.innerHTML = touch ? `tap to talk · approve · deny` : `<b>1</b>/<b>2</b> ask &nbsp; <b>&#8592;</b>/<b>&#8594;</b> judge &nbsp; <b>T</b> ticket &nbsp; <b>Esc</b> pause`;
    else if(gPhase==='dayend') h.innerHTML = touch ? `<b>tap</b> to continue` : `<b>Z / Enter</b> continue`;
    else                       h.innerHTML = touch ? `…` : `the gate decides… &nbsp;&nbsp; <b>Esc</b> pause`;
    return;
  }
  if(current==='slots'){ h.innerHTML = touch ? `<b>tap</b> a slot &nbsp;&nbsp; <b>Back</b> to return` : `<b>&#8597;</b> move &nbsp;&nbsp; <b>Z / Enter</b> select &nbsp;&nbsp; <b>Esc</b> back`; return; }
  if(touch){ h.innerHTML = `<b>tap</b> to choose`; return; }
  if(current==='settings')
    h.innerHTML = `<b>&#8597;</b> move &nbsp;&nbsp; <b>&#8596;</b> change &nbsp;&nbsp; <b>Z</b> select &nbsp;&nbsp; <b>X</b> back`;
  else
    h.innerHTML = `<b>&#8597;</b> move &nbsp;&nbsp; <b>Z / Enter</b> select`;
}

/* ---------- typewriter tagline on title ----------
   Types the line once, then loops: hold, erase the last
   word, and swap it between "decisions" and "choices".
   The prefix is left-anchored and the swap word lives in a
   fixed-width slot so the line never shifts as it animates. */
const taglinePrefix = "an honest game about simple ";
const taglineWords  = ["decisions","choices"];
(function typeTag(){
  const el = document.getElementById('tagline');
  const caret = '<span class="caret">&nbsp;</span>';
  const TYPE=95, ERASE=60, HOLD_FULL=6000, HOLD_SWAP=600;
  let wi = 0;          // which swap-word is showing
  let word = '';       // partial of the current swap word

  // structured render: static prefix + fixed-width word slot
  const renderWord = ()=>{
    el.innerHTML = taglinePrefix + '<span class="swap">' + word + caret + '</span>';
  };

  function typeWord(target, done){
    if(word.length < target.length){
      word = target.slice(0, word.length+1);
      renderWord();
      setTimeout(()=>typeWord(target, done), TYPE);
    } else if(done) done();
  }
  function eraseWord(done){
    if(word.length > 0){
      word = word.slice(0, -1);
      renderWord();
      setTimeout(()=>eraseWord(done), ERASE);
    } else if(done) done();
  }
  function cycle(){
    setTimeout(()=>{                 // hold the full line
      eraseWord(()=>{                // delete the current word
        wi = (wi+1) % taglineWords.length;
        setTimeout(()=>{             // brief blank pause
          typeWord(taglineWords[wi], cycle);
        }, HOLD_SWAP);
      });
    }, HOLD_FULL);
  }

  // one-time intro: type the whole line plainly (caret follows),
  // then lock into the structured form and start looping.
  let i = 0;
  const full0 = taglinePrefix + taglineWords[0];
  (function intro(){
    if(i < full0.length){
      i++;
      el.innerHTML = full0.slice(0, i) + caret;
      setTimeout(intro, TYPE);
    } else {
      word = taglineWords[0];
      renderWord();
      cycle();
    }
  })();
})();

show('title');

/* ============================================================
   BREAKABLE TITLE — click a word to crack it like a block;
   keep clicking and it pops into a shower of pixels.
   ============================================================ */

/* white-noise burst for the explosion */
function noise(dur=0.2, vol=0.18){
  if(settings.volume<=0) return;
  const a=audio(); if(!a) return;
  const v=vol*(settings.volume/100);          // scale by the 0-100 slider
  const n=Math.floor(a.sampleRate*dur);
  const buf=a.createBuffer(1,n,a.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<n;i++){ d[i]=(Math.random()*2-1)*(1-i/n); }
  const src=a.createBufferSource(); src.buffer=buf;
  const g=a.createGain(); g.gain.setValueAtTime(v,a.currentTime);
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
              life:1,decay:o.decay||0.012,g:o.g});
  if(!fragRaf) fragRaf=requestAnimationFrame(tickFrags);
}
function tickFrags(){
  for(let i=frags.length-1;i>=0;i--){
    const f=frags[i];
    f.vy += (f.g!==undefined ? f.g : 0.22);   // per-particle gravity (flames float)
    f.x+=f.vx; f.y+=f.vy; f.life-=f.decay;
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

/* ---------- the door is locked until you know the word ---------- */
try{
  if(localStorage.getItem('joa_pass')!=='1') show('pass');
}catch(e){ show('pass'); }
