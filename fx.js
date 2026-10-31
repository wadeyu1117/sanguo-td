// ============================================================
//  戰鬥演出：音樂音效、傷害數字、鏡頭震動、無雙技
// ============================================================
import * as THREE from 'three';

// ---------- 背景音樂 + 音效（WebAudio 即時合成，無需音檔） ----------
export const Sound = (() => {
  let ctx, master, music, sfx, on = true, started = false, intense = false, nextBar = 0, bar = 0;
  const last = {};
  const SCALE = [293.66, 329.63, 369.99, 440, 493.88]; // D 宮調五聲音階
  const MELODIES = [[0, 2, 4, 3, 2, 1, 0, 1], [4, 5, 7, 5, 4, 2, 3, 2], [2, 4, 5, 7, 9, 7, 5, 4], [3, 2, 1, 2, 0, -1, 0, 0]];
  const note = (i) => SCALE[((i % 5) + 5) % 5] * Math.pow(2, Math.floor(i / 5));
  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
    music = ctx.createGain(); music.gain.value = 0.32; music.connect(master);
    sfx = ctx.createGain(); sfx.gain.value = 0.45; sfx.connect(master);
  }
  // 古箏撥弦
  function pluck(freq, t, dur = 1.2, gain = 0.3, dest = music) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    for (const [type, mul, v] of [['triangle', 1, 1], ['sine', 2, 0.4], ['sine', 3, 0.15]]) {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = type; o.frequency.value = freq * mul; og.gain.value = v;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + dur);
    }
    g.connect(dest);
  }
  // 戰鼓
  function drum(t, gain = 0.6, freq = 80, dest = music) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(freq * 1.8, t); o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.35);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.55);
  }
  function noise(t, dur, gain, freq, dest = sfx, type = 'bandpass') {
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = gain;
    s.connect(f); f.connect(g); g.connect(dest); s.start(t);
  }
  function schedule() {
    if (!ctx || !on || !started) return;
    const beat = intense ? 0.27 : 0.42;
    while (nextBar < ctx.currentTime + 1.2) {
      const t0 = nextBar, mel = MELODIES[bar % 4];
      mel.forEach((n, i) => pluck(note(n), t0 + i * beat, 1.5, 0.16));
      if (intense) mel.forEach((n, i) => i % 2 && pluck(note(n + 2), t0 + i * beat + beat / 2, 0.6, 0.07));
      pluck(note(mel[0]) / 4, t0, beat * 4, 0.28); pluck(note(mel[4]) / 4, t0 + beat * 4, beat * 4, 0.28);
      for (let i = 0; i < 8; i++) {
        if (i % 4 === 0) drum(t0 + i * beat, 0.75);
        else if (intense && i % 2 === 0) drum(t0 + i * beat, 0.4, 120);
        if (intense) noise(t0 + i * beat + beat / 2, 0.04, 0.06, 7000, music, 'highpass');
      }
      nextBar += beat * 8; bar++;
    }
  }
  setInterval(schedule, 250);
  const throttle = (n, ms) => { const now = performance.now(); if (last[n] && now - last[n] < ms) return true; last[n] = now; return false; };
  return {
    start() { init(); if (ctx.state === 'suspended') ctx.resume(); if (!started) { started = true; nextBar = ctx.currentTime + 0.1; } },
    toggle() { on = !on; if (ctx) { master.gain.value = on ? 0.7 : 0; nextBar = Math.max(nextBar, ctx.currentTime + 0.1); } return on; },
    setIntense(v) { intense = v; },
    play(name) {
      if (!ctx || !on) return;
      const t = ctx.currentTime;
      switch (name) {
        case 'slash': if (throttle(name, 70)) return; noise(t, 0.2, 0.55, 2200); noise(t, 0.12, 0.25, 5000, sfx, 'highpass'); break;
        case 'stab': if (throttle(name, 90)) return; noise(t, 0.07, 0.3, 4200); break;
        case 'bow': if (throttle(name, 80)) return; pluck(196, t, 0.25, 0.3, sfx); noise(t, 0.1, 0.15, 3000); break;
        case 'magic': if (throttle(name, 100)) return; pluck(880, t, 0.5, 0.12, sfx); pluck(1318, t + 0.05, 0.5, 0.09, sfx); break;
        case 'boom': if (throttle(name, 60)) return; drum(t, 0.9, 55, sfx); noise(t, 0.6, 0.5, 700, sfx, 'lowpass'); break;
        case 'coin': if (throttle(name, 60)) return; pluck(1568, t, 0.15, 0.1, sfx); pluck(2093, t + 0.06, 0.2, 0.08, sfx); break;
        case 'ult': drum(t, 1, 45, sfx); drum(t + 0.14, 0.9, 65, sfx); [587, 740, 880].forEach((f, i) => pluck(f, t + i * 0.06, 1.2, 0.25, sfx)); noise(t, 0.5, 0.3, 1200); break;
        case 'gong': [131, 165, 196, 262].forEach(f => pluck(f, t, 3, 0.22, sfx)); noise(t, 1.5, 0.25, 400, sfx, 'lowpass'); drum(t, 1, 40, sfx); break;
        case 'hurt': drum(t, 0.7, 110, sfx); break;
        case 'build': drum(t, 0.5, 150, sfx); pluck(587, t, 0.4, 0.15, sfx); break;
        case 'win': [0, 2, 4, 7, 9].forEach((n, i) => pluck(note(n + 5), t + i * 0.15, 1.5, 0.25, sfx)); break;
        case 'lose': [4, 2, 1, 0].forEach((n, i) => pluck(note(n), t + i * 0.35, 1.8, 0.25, sfx)); break;
      }
    },
  };
})();

// ---------- 浮動傷害數字 ----------
const layer = document.createElement('div');
layer.id = 'dmg-layer';
document.body.appendChild(layer);
let floaters = [];
export function floatText(pos, text, cls = '') {
  const el = document.createElement('div');
  el.className = 'dmg ' + cls; el.textContent = text;
  layer.appendChild(el);
  floaters.push({ el, pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 1.6, (Math.random() - 0.5) * 0.4)), life: 0.9, max: 0.9, vy: cls.includes('ult') ? 2.2 : 1.6 });
  if (floaters.length > 90) floaters.shift().el.remove();
}
const v3 = new THREE.Vector3();
export function updateFloaters(dt, camera) {
  for (const f of floaters) {
    f.life -= dt; f.pos.y += dt * f.vy;
    v3.copy(f.pos).project(camera);
    const pop = 1 + 0.5 * Math.max(0, (f.life - f.max + 0.15) / 0.15);
    f.el.style.transform = `translate(${(v3.x + 1) / 2 * innerWidth}px, ${(1 - v3.y) / 2 * innerHeight}px) translate(-50%, -50%) scale(${pop})`;
    f.el.style.opacity = Math.min(1, f.life / 0.3);
    if (f.life <= 0) f.el.remove();
  }
  floaters = floaters.filter(f => f.life > 0);
}

// ---------- 無雙技切入畫面 ----------
const cut = document.createElement('div');
cut.id = 'cutin';
cut.innerHTML = '<div class="band"></div><img alt="" /><div class="txt"><small></small><b></b><q></q></div>';
document.body.appendChild(cut);
let lastCut = 0;
export function cutIn(img, name, ult, color, quote = '') {
  const now = performance.now();
  if (now - lastCut < 1600) return false;
  lastCut = now;
  cut.querySelector('q').textContent = quote;
  cut.querySelector('img').src = img;
  cut.querySelector('small').textContent = name;
  cut.querySelector('b').textContent = ult;
  cut.style.setProperty('--c', color);
  cut.classList.remove('show'); void cut.offsetWidth; cut.classList.add('show');
  return true;
}
