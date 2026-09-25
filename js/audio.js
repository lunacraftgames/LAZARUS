'use strict';
// ============================================================
//  音频：全部由 WebAudio 实时合成（无外部素材）
//  Sound.sfx.xxx()  音效      Sound.music(name)  切换音乐
// ============================================================
const Sound = (() => {
  let ctx = null, master, musicBus, sfxBus, delayIn, noiseBuf;
  // 音量（0~1，保存在本地）：主音量 / 音乐 / 音效
  const BASE = { master: 0.9, music: 0.5, sfx: 0.8 };
  const vol = { master: 1, music: 1, sfx: 1 };
  try { Object.assign(vol, JSON.parse(localStorage.getItem('lazarus_audio') || '{}')); } catch (e) { /* */ }
  for (const k in vol) vol[k] = Math.max(0, Math.min(1, +vol[k] || 0));
  let muted = false, curName = null, cur = null, trackGain = null, nextTime = 0, step = 0, pending = null;
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : BASE.master * vol.master;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = BASE.music * vol.music; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = BASE.sfx * vol.sfx; sfxBus.connect(master);
    // 回声（用于音乐盒与琶音）
    delayIn = ctx.createGain();
    const dly = ctx.createDelay(1.5); dly.delayTime.value = 0.375;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    delayIn.connect(dly); dly.connect(lp); lp.connect(fb); fb.connect(dly);
    const wet = ctx.createGain(); wet.gain.value = 0.55; lp.connect(wet); wet.connect(musicBus);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    setInterval(schedule, 25);
    if (pending !== null) { const p = pending; pending = null; music(p); }
  }

  function env(g, at, vol, atk, dur) {
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + Math.min(atk, dur * 0.9));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  }
  function tone(o) {
    if (!ctx) return null;
    const at = o.at != null ? o.at : ctx.currentTime + (o.t || 0);
    const dur = o.dur || 0.1, vol = o.vol == null ? 0.2 : o.vol;
    const osc = ctx.createOscillator(); osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, at);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), at + (o.glide || dur));
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain(); env(g, at, vol, o.attack || 0.004, dur);
    let node = osc;
    if (o.filter) {
      const f = ctx.createBiquadFilter(); f.type = o.filter; f.frequency.setValueAtTime(o.ff || 1000, at);
      if (o.ff2) f.frequency.exponentialRampToValueAtTime(o.ff2, at + dur);
      f.Q.value = o.q || 1; node.connect(f); node = f;
    }
    node.connect(g); g.connect(o.bus || sfxBus);
    if (o.send) { const s = ctx.createGain(); s.gain.value = o.send; g.connect(s); s.connect(delayIn); }
    if (o.vib) {
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = o.vib; lg.gain.value = o.vibAmt || 10; l.connect(lg); lg.connect(osc.frequency);
      l.start(at); l.stop(at + dur + 0.1);
    }
    osc.start(at); osc.stop(at + dur + 0.05);
    return osc;
  }
  function noise(o) {
    if (!ctx) return;
    const at = o.at != null ? o.at : ctx.currentTime + (o.t || 0);
    const dur = o.dur || 0.2, vol = o.vol == null ? 0.2 : o.vol;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.f || 2000, at);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, at + dur);
    f.Q.value = o.q || 0.8;
    const g = ctx.createGain(); env(g, at, vol, o.attack || 0.002, dur);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    if (o.send) { const s = ctx.createGain(); s.gain.value = o.send; g.connect(s); s.connect(delayIn); }
    src.start(at, Math.random() * 1.5); src.stop(at + dur + 0.05);
  }

  // ---------------- 音效 ----------------
  const sfx = {
    jump() { tone({ type: 'square', f: 240, f2: 520, dur: 0.12, vol: 0.08, filter: 'lowpass', ff: 2400 }); },
    land() { noise({ f: 500, f2: 120, dur: 0.09, vol: 0.2 }); },
    dash() { noise({ filter: 'bandpass', f: 3200, f2: 400, dur: 0.22, vol: 0.4, q: 1.4 }); tone({ type: 'sawtooth', f: 520, f2: 110, dur: 0.18, vol: 0.06 }); },
    denied() { tone({ type: 'square', f: 190, dur: 0.07, vol: 0.1 }); tone({ type: 'square', f: 140, dur: 0.12, vol: 0.1, t: 0.08 }); },
    stomp() { tone({ type: 'square', f: 720, f2: 110, dur: 0.15, vol: 0.13 }); noise({ f: 1600, f2: 200, dur: 0.12, vol: 0.22 }); },
    clang() { [520, 1340, 2210, 3170].forEach((f, i) => tone({ type: 'sine', f, dur: 0.55 - i * 0.1, vol: 0.07 })); noise({ filter: 'highpass', f: 3000, dur: 0.05, vol: 0.18 }); },
    heavyClang() { sfx.clang(); noise({ f: 600, f2: 60, dur: 0.4, vol: 0.4 }); tone({ type: 'sine', f: 110, f2: 45, dur: 0.35, vol: 0.3 }); },
    death() {
      for (let i = 0; i < 9; i++) tone({ type: 'square', f: rand(90, 1500), dur: 0.05, vol: 0.07, t: i * 0.035 });
      noise({ f: 5000, f2: 100, dur: 0.6, vol: 0.35 }); tone({ type: 'sawtooth', f: 420, f2: 40, dur: 0.6, vol: 0.11 });
    },
    rebuild() { for (let i = 0; i < 6; i++) tone({ type: 'square', f: 300 + i * 160, dur: 0.04, vol: 0.035, t: i * 0.06, filter: 'lowpass', ff: 3000 }); },
    respawn() {
      [0, 4, 7, 12, 16].forEach((s, i) => tone({ type: 'square', f: N(60 + s), dur: 0.09, vol: 0.055, t: i * 0.045, filter: 'lowpass', ff: 3000 }));
      tone({ type: 'sine', f: 200, f2: 1200, dur: 0.35, vol: 0.06 });
    },
    checkpoint() {
      tone({ type: 'triangle', f: N(76), dur: 0.3, vol: 0.12 }); tone({ type: 'triangle', f: N(83), dur: 0.5, vol: 0.12, t: 0.1 });
      tone({ type: 'sine', f: N(88), dur: 0.9, vol: 0.06, t: 0.2, send: 0.5 });
    },
    crack() { noise({ filter: 'bandpass', f: 1300, dur: 0.07, vol: 0.18, q: 3 }); noise({ filter: 'bandpass', f: 800, dur: 0.09, vol: 0.14, q: 3, t: 0.1 }); },
    crumble() { noise({ f: 900, f2: 80, dur: 0.45, vol: 0.28 }); },
    alarm() { for (let i = 0; i < 4; i++) tone({ type: 'square', f: i % 2 ? 660 : 990, dur: 0.17, vol: 0.075, t: i * 0.17, filter: 'lowpass', ff: 2600 }); },
    throw() { tone({ type: 'sine', f: 1300, f2: 480, dur: 0.25, vol: 0.06 }); },
    explode() { noise({ f: 3200, f2: 60, dur: 0.55, vol: 0.45 }); tone({ type: 'sine', f: 120, f2: 35, dur: 0.45, vol: 0.35 }); },
    bigExplode() { noise({ f: 2600, f2: 40, dur: 1.4, vol: 0.6 }); tone({ type: 'sine', f: 90, f2: 25, dur: 1.3, vol: 0.5 }); },
    spring() { tone({ type: 'sine', f: 170, f2: 900, dur: 0.28, vol: 0.2, vib: 28, vibAmt: 40 }); },
    pickup() {
      tone({ type: 'square', f: N(84), dur: 0.07, vol: 0.06 }); tone({ type: 'square', f: N(91), dur: 0.14, vol: 0.06, t: 0.07 });
      tone({ type: 'sine', f: N(96), dur: 0.5, vol: 0.05, t: 0.12, send: 0.5 });
    },
    blip() { tone({ type: 'square', f: rand(900, 1300), dur: 0.022, vol: 0.022 }); },
    radioOn() { noise({ filter: 'bandpass', f: 2200, dur: 0.28, vol: 0.12, q: 2 }); tone({ type: 'sine', f: 1000, dur: 0.06, vol: 0.05, t: 0.28 }); },
    shatter() {
      for (let i = 0; i < 10; i++) tone({ type: 'sine', f: rand(2500, 6000), dur: rand(0.1, 0.35), vol: 0.04, t: rand(0, 0.15) });
      noise({ filter: 'highpass', f: 4000, dur: 0.3, vol: 0.25 });
    },
    bite() { noise({ f: 2000, f2: 300, dur: 0.08, vol: 0.3 }); tone({ type: 'square', f: 200, f2: 80, dur: 0.1, vol: 0.1 }); },
    reveal() { tone({ type: 'sawtooth', f: 110, f2: 320, dur: 0.25, vol: 0.1 }); noise({ filter: 'highpass', f: 5000, dur: 0.1, vol: 0.08 }); },
    hop() { tone({ type: 'square', f: 160, f2: 320, dur: 0.08, vol: 0.05 }); },
    growl() { tone({ type: 'sawtooth', f: 70, dur: 0.5, vol: 0.13, vib: 12, vibAmt: 8, filter: 'lowpass', ff: 700 }); },
    slam() { noise({ f: 1800, f2: 50, dur: 0.9, vol: 0.6 }); tone({ type: 'sine', f: 70, f2: 28, dur: 0.8, vol: 0.6 }); },
    rock() { noise({ f: 700, f2: 100, dur: 0.25, vol: 0.25 }); },
    laserCharge(d) { tone({ type: 'sawtooth', f: 150, f2: 1400, dur: d, glide: d, vol: 0.06, attack: d * 0.8, filter: 'lowpass', ff: 3000 }); },
    electric() {
      for (let i = 0; i < 16; i++) tone({ type: 'square', f: rand(60, 320), dur: 0.05, vol: 0.1, t: i * 0.035 });
      noise({ filter: 'bandpass', f: 5000, dur: 0.9, vol: 0.4, q: 0.7 });
    },
    roar() {
      [55, 58, 82].forEach((f) => tone({ type: 'sawtooth', f, f2: f * 0.7, dur: 1.6, vol: 0.12, attack: 0.1, vib: 7, vibAmt: 6, filter: 'lowpass', ff: 900 }));
      noise({ f: 600, dur: 1.4, vol: 0.22, attack: 0.1 });
    },
    cannon() { noise({ f: 1500, f2: 100, dur: 0.3, vol: 0.4 }); tone({ type: 'sine', f: 160, f2: 50, dur: 0.25, vol: 0.3 }); },
    // 武器
    gunshot() { noise({ f: 4000, f2: 300, dur: 0.16, vol: 0.4 }); tone({ type: 'square', f: 220, f2: 60, dur: 0.12, vol: 0.18 }); noise({ filter: 'highpass', f: 5000, dur: 0.03, vol: 0.25 }); },
    reload() { tone({ type: 'square', f: 1400, dur: 0.03, vol: 0.05 }); tone({ type: 'square', f: 900, dur: 0.04, vol: 0.05, t: 0.07 }); },
    sporeShot() { noise({ f: 1800, f2: 400, dur: 0.12, vol: 0.14 }); tone({ type: 'sine', f: 520, f2: 180, dur: 0.14, vol: 0.12 }); },
    sporeBurst() { noise({ f: 700, f2: 200, dur: 0.25, vol: 0.12 }); },
    heavy() { noise({ f: 900, f2: 60, dur: 0.4, vol: 0.4 }); tone({ type: 'sine', f: 110, f2: 35, dur: 0.35, vol: 0.35 }); },
    parry() { [880, 1760, 2640].forEach((f, i) => tone({ type: 'sine', f, dur: 0.3 - i * 0.07, vol: 0.09 })); noise({ filter: 'highpass', f: 4000, dur: 0.06, vol: 0.2 }); },
    ricochet() { tone({ type: 'sine', f: 2600, f2: 900, dur: 0.18, vol: 0.07 }); },
    swap() { tone({ type: 'square', f: N(76), dur: 0.04, vol: 0.05 }); noise({ filter: 'highpass', f: 2500, dur: 0.05, vol: 0.12, t: 0.04 }); },
    zap() { tone({ type: 'sawtooth', f: 1800, f2: 200, dur: 0.12, vol: 0.035 }); },
    select() { tone({ type: 'square', f: N(79), dur: 0.06, vol: 0.06 }); },
    confirm() { tone({ type: 'square', f: N(72), dur: 0.08, vol: 0.07 }); tone({ type: 'square', f: N(79), dur: 0.16, vol: 0.07, t: 0.08 }); },
    hit() { tone({ type: 'square', f: 320, f2: 70, dur: 0.3, vol: 0.18 }); noise({ f: 2500, f2: 200, dur: 0.3, vol: 0.3 }); },
    recharge() { tone({ type: 'sawtooth', f: 200, f2: 1600, dur: 0.5, vol: 0.05, filter: 'lowpass', ff: 3000 }); tone({ type: 'sine', f: N(88), dur: 0.4, vol: 0.05, t: 0.45 }); },
    slash() { noise({ filter: 'bandpass', f: 4200, f2: 1200, dur: 0.12, vol: 0.28, q: 1.2 }); tone({ type: 'triangle', f: 900, f2: 300, dur: 0.1, vol: 0.05 }); },
    slashHit() { noise({ f: 3000, f2: 300, dur: 0.12, vol: 0.3 }); tone({ type: 'square', f: 500, f2: 120, dur: 0.12, vol: 0.1 }); },
    block() { [880, 1760, 2640].forEach((f, i) => tone({ type: 'sine', f, dur: 0.3 - i * 0.07, vol: 0.08 })); noise({ filter: 'highpass', f: 5000, dur: 0.04, vol: 0.2 }); },
    equip() { tone({ type: 'square', f: N(76), dur: 0.05, vol: 0.05 }); tone({ type: 'square', f: N(83), dur: 0.08, vol: 0.05, t: 0.05 }); },
    drop(r) {
      const seq = r === 'legendary' ? [72, 76, 79, 84, 88, 91] : r === 'rare' ? [72, 76, 79, 84] : [76, 83];
      seq.forEach((n, i) => tone({ type: 'triangle', f: N(n), dur: 0.25, vol: 0.08, t: i * 0.07, send: 0.4 }));
      if (r === 'legendary') { noise({ filter: 'highpass', f: 6000, dur: 1.2, vol: 0.08, t: 0.3 }); tone({ type: 'sine', f: N(96), dur: 1.5, vol: 0.05, t: 0.45, send: 0.7 }); }
    },
    unlock() {
      [60, 67, 72, 76, 79, 84].forEach((n, i) => tone({ type: 'sawtooth', f: N(n), dur: 0.5, vol: 0.05, t: i * 0.09, filter: 'lowpass', ff: 2500, send: 0.4 }));
      tone({ type: 'sine', f: 60, f2: 30, dur: 1.0, vol: 0.3 });
    },
    // ---- 第二章 ----
    splash() { noise({ f: 1800, f2: 300, dur: 0.35, vol: 0.3 }); tone({ type: 'sine', f: 300, f2: 120, dur: 0.2, vol: 0.08 }); },
    swim() { tone({ type: 'sine', f: 220, f2: 520, dur: 0.14, vol: 0.06 }); noise({ filter: 'bandpass', f: 900, dur: 0.1, vol: 0.06, q: 2 }); },
    djump() { tone({ type: 'triangle', f: 420, f2: 900, dur: 0.14, vol: 0.08 }); noise({ filter: 'highpass', f: 3000, dur: 0.08, vol: 0.08 }); },
    slime() { tone({ type: 'sine', f: 160, f2: 60, dur: 0.25, vol: 0.14, vib: 30, vibAmt: 25 }); noise({ f: 700, f2: 150, dur: 0.2, vol: 0.12 }); },
    splat() { noise({ f: 900, f2: 120, dur: 0.18, vol: 0.14 }); },
    pop() { noise({ f: 2500, f2: 200, dur: 0.3, vol: 0.35 }); tone({ type: 'sine', f: 240, f2: 60, dur: 0.25, vol: 0.2 }); },
    throb() { tone({ type: 'sine', f: 90, f2: 55, dur: 0.14, vol: 0.2 }); },
    bounce() { tone({ type: 'sine', f: 140, f2: 700, dur: 0.3, vol: 0.18, vib: 18, vibAmt: 60 }); },
    wobble() { tone({ type: 'sine', f: 300, f2: 120, dur: 0.25, vol: 0.12, vib: 22, vibAmt: 40 }); },
    saw() { tone({ type: 'sawtooth', f: 900, f2: 700, dur: 0.12, vol: 0.02, filter: 'highpass', ff: 1200 }); },
    heartbeat() { tone({ type: 'sine', f: 70, f2: 40, dur: 0.16, vol: 0.35 }); tone({ type: 'sine', f: 60, f2: 35, dur: 0.18, vol: 0.28, t: 0.2 }); },
    hatch() { noise({ f: 1200, f2: 200, dur: 0.3, vol: 0.2 }); tone({ type: 'square', f: 180, f2: 90, dur: 0.2, vol: 0.06 }); },
    // 第三章
    echo() { tone({ type: 'square', f: 1600, f2: 400, dur: 0.16, vol: 0.035, filter: 'bandpass', ff: 1800, q: 3 }); tone({ type: 'sine', f: 880, dur: 0.3, vol: 0.03, t: 0.05, send: 0.6 }); },
    plate() { tone({ type: 'square', f: N(72), dur: 0.05, vol: 0.05 }); tone({ type: 'square', f: N(79), dur: 0.08, vol: 0.04, t: 0.05 }); },
    gateOpen() { [60, 64, 67, 72].forEach((n, i) => tone({ type: 'square', f: N(n + 12), dur: 0.1, vol: 0.045, t: i * 0.06, filter: 'lowpass', ff: 3000 })); noise({ filter: 'highpass', f: 3000, dur: 0.3, vol: 0.08 }); },
    gateClose() { tone({ type: 'square', f: N(67), f2: N(55), dur: 0.14, vol: 0.05, filter: 'lowpass', ff: 2000 }); },
    lock() { for (let i = 0; i < 3; i++) tone({ type: 'square', f: 140 - i * 20, dur: 0.1, vol: 0.12, t: i * 0.09, filter: 'lowpass', ff: 1200 }); noise({ filter: 'bandpass', f: 600, dur: 0.3, vol: 0.2, q: 4 }); },
    glitch() { for (let i = 0; i < 4; i++) tone({ type: 'square', f: rand(200, 2400), dur: 0.03, vol: 0.03, t: i * 0.035 }); },
    lagField() { tone({ type: 'sine', f: 900, f2: 110, dur: 1.1, vol: 0.12, glide: 1.1, send: 0.6 }); noise({ filter: 'lowpass', f: 1500, f2: 200, dur: 0.8, vol: 0.12 }); },
    bubble() { tone({ type: 'sine', f: 500, f2: 1400, dur: 0.12, vol: 0.14 }); noise({ filter: 'highpass', f: 3000, dur: 0.12, vol: 0.12 }); },
    screech() { noise({ filter: 'bandpass', f: 3400, f2: 5200, dur: 0.5, vol: 0.28, q: 6 }); tone({ type: 'sawtooth', f: 1900, f2: 2600, dur: 0.45, vol: 0.05, vib: 40, vibAmt: 300 }); },
    mineArm() { tone({ type: 'square', f: 1200, dur: 0.06, vol: 0.07 }); tone({ type: 'square', f: 600, dur: 0.12, vol: 0.07, t: 0.07 }); },
    mineBeep() { tone({ type: 'square', f: 1500, dur: 0.035, vol: 0.045 }); },
    erase() { noise({ filter: 'bandpass', f: 4000, f2: 200, dur: 0.45, vol: 0.3, q: 1.5 }); tone({ type: 'sawtooth', f: 800, f2: 60, dur: 0.4, vol: 0.08 }); },
    ir() { tone({ type: 'sawtooth', f: 2200, f2: 400, dur: 0.1, vol: 0.03 }); },
    mirrorWake() { tone({ type: 'sawtooth', f: 220, f2: 110, dur: 0.35, vol: 0.08, filter: 'lowpass', ff: 1500 }); tone({ type: 'sawtooth', f: 110, f2: 220, dur: 0.35, vol: 0.08, filter: 'lowpass', ff: 1500 }); },
    mirrorHit() { noise({ filter: 'highpass', f: 2500, dur: 0.25, vol: 0.25 }); for (let i = 0; i < 5; i++) tone({ type: 'square', f: rand(300, 3000), dur: 0.04, vol: 0.05, t: i * 0.04 }); },
    bossForm() { for (let i = 0; i < 8; i++) tone({ type: 'square', f: 200 + i * 90, dur: 0.05, vol: 0.04, t: i * 0.07, filter: 'lowpass', ff: 2500 }); tone({ type: 'sine', f: 60, f2: 120, dur: 1.2, vol: 0.2, attack: 0.6 }); },
    clear() {
      [69, 72, 76, 81, 84].forEach((n, i) => tone({ type: 'square', f: N(n), dur: 0.14, vol: 0.06, t: i * 0.09, filter: 'lowpass', ff: 3500 }));
      [69, 72, 76].forEach((n) => tone({ type: 'triangle', f: N(n + 12), dur: 1.2, vol: 0.06, t: 0.45, send: 0.5 }));
    },
  };
  // 包一层：音频未初始化时静默
  for (const k in sfx) { const fn = sfx[k]; sfx[k] = (...a) => { if (ctx && !muted) fn(...a); }; }

  function laserLoop() {
    if (!ctx || muted) return { stop() {} };
    const at = ctx.currentTime;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.12, at + 0.05); g.connect(sfxBus);
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 85;
    const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 171;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 22;
    const lg = ctx.createGain(); lg.gain.value = 500; lfo.connect(lg); lg.connect(f.frequency);
    const ns = ctx.createBufferSource(); ns.buffer = noiseBuf; ns.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 3000;
    const ng = ctx.createGain(); ng.gain.value = 0.3;
    o1.connect(f); o2.connect(f); f.connect(g); ns.connect(nf); nf.connect(ng); ng.connect(g);
    const nodes = [o1, o2, lfo, ns]; nodes.forEach((n) => n.start(at));
    let stopped = false;
    return {
      stop() {
        if (stopped) return; stopped = true;
        const t = ctx.currentTime;
        g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.12, t); g.gain.linearRampToValueAtTime(0.0001, t + 0.12);
        nodes.forEach((n) => n.stop(t + 0.15));
      },
    };
  }

  // ---------------- 音乐 ----------------
  function makeMuseum(bpm, drums) {
    const chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]];
    const mel = {
      0: 76, 6: 74, 8: 72, 12: 71,
      16: 72, 24: 69, 28: 72,
      32: 67, 36: 72, 40: 76, 46: 74,
      48: 74, 54: 71, 56: 67,
      64: 76, 68: 79, 72: 81, 76: 79,
      80: 77, 88: 76, 92: 72,
      96: 74, 100: 77, 104: 81, 108: 77,
      112: 80, 120: 76, 124: 71,
    };
    const arpIdx = [0, 1, 2, 1, 0, 2, 1, 2];
    return {
      bpm,
      step(s, at, bus, spb) {
        const bar = Math.floor(s / 16) % 8, st = s % 16, ch = chords[bar], loop = Math.floor(s / 128);
        if (st === 0) {
          for (const n of ch) tone({ type: 'sawtooth', f: N(n), at, dur: spb * 17, vol: 0.022, attack: spb * 5, filter: 'lowpass', ff: 800, bus });
          tone({ type: 'sine', f: N(ch[0] - 12), at, dur: spb * 16, vol: 0.05, attack: spb * 3, bus });
        }
        if (st === 0 || st === 10) tone({ type: 'triangle', f: N(ch[0] - 24), at, dur: spb * 6, vol: 0.16, bus });
        if (st % 2 === 0 && (loop > 0 || bar >= 2)) {
          const n = ch[arpIdx[st / 2]] + 12;
          tone({ type: 'triangle', f: N(n), at, dur: spb * 1.6, vol: 0.035, bus, send: 0.45 });
        }
        const m = mel[s % 128];
        if (m && (loop % 2 === 0 || bar % 2 === 0)) {
          tone({ type: 'sine', f: N(m), at, dur: 1.4, vol: 0.06, bus, send: 0.6 });
          tone({ type: 'sine', f: N(m + 12), at, dur: 0.5, vol: 0.02, bus });
        }
        if (drums) {
          if (st === 4 || st === 12) noise({ filter: 'highpass', f: 7000, dur: 0.04, vol: 0.025, at, bus });
          if (st === 0 && bar % 2 === 0) tone({ type: 'sine', f: 90, f2: 40, at, dur: 0.2, vol: 0.12, bus });
        }
      },
    };
  }
  const TRACKS = {
    // 第二章：进化育婴室——冷色、湿润、带气泡感的琶音
    hive: {
      bpm: 92,
      step(s, at, bus, spb) {
        const chords = [[50, 53, 57], [46, 50, 53], [48, 51, 55], [45, 49, 52]];
        const bar = Math.floor(s / 16) % 4, st = s % 16, ch = chords[bar];
        if (st === 0) for (const n of ch) tone({ type: 'sawtooth', f: N(n), at, dur: spb * 16, vol: 0.02, attack: spb * 6, filter: 'lowpass', ff: 700, bus });
        if (st === 0 || st === 6 || st === 10) tone({ type: 'triangle', f: N(ch[0] - 24), at, dur: spb * 4, vol: 0.15, bus });
        if (st % 2 === 0) { const n = ch[[0, 2, 1, 2, 0, 1, 2, 1][st / 2]] + 24; tone({ type: 'sine', f: N(n), f2: N(n) * 1.02, at, dur: spb * 1.4, vol: 0.03, bus, send: 0.55 }); }
        if (st === 4 || st === 12) noise({ filter: 'bandpass', f: 1500, dur: 0.05, vol: 0.03, at, bus });
        if (Math.random() < 0.08) tone({ type: 'sine', f: rand(600, 1400), f2: rand(1500, 2500), at, dur: 0.08, vol: 0.02, bus });
        if (st === 0 && bar % 2 === 0) tone({ type: 'sine', f: 70, f2: 38, at, dur: 0.2, vol: 0.14, bus });
      },
    },
    // 繁育者：心跳贯穿全曲
    incubator: {
      bpm: 132,
      step(s, at, bus, spb) {
        const roots = [45, 45, 41, 43], bar = Math.floor(s / 16) % 4, st = s % 16, r = roots[bar];
        if (st === 0 || st === 3) tone({ type: 'sine', f: 80, f2: 38, at, dur: 0.2, vol: 0.45, bus });
        if (st === 8 || st === 11) tone({ type: 'sine', f: 70, f2: 35, at, dur: 0.2, vol: 0.3, bus });
        if (st === 4 || st === 12) noise({ filter: 'bandpass', f: 2200, dur: 0.1, vol: 0.14, at, bus });
        if (st % 2 === 1) noise({ filter: 'highpass', f: 9000, dur: 0.02, vol: 0.03, at, bus });
        tone({ type: 'sawtooth', f: N(r - 12 + (st % 4 === 2 ? 12 : 0)), at, dur: spb * 0.8, vol: 0.07, filter: 'lowpass', ff: 700, bus });
        if (Math.floor(s / 64) % 2 === 1 && st % 4 === 0) {
          const mel = [69, 72, 71, 67, 69, 76, 74, 72, 65, 69, 67, 64, 67, 71, 74, 71];
          tone({ type: 'square', f: N(mel[(Math.floor(s / 4)) % 16]), at, dur: spb * 3, vol: 0.035, filter: 'lowpass', ff: 2500, bus, send: 0.3 });
        }
      },
    },
    // 第三章：幽灵因特网——冰冷的方波琶音、错拍的数字噪声
    matrix: {
      bpm: 112,
      step(s, at, bus, spb) {
        const chords = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]];
        const bar = Math.floor(s / 16) % 4, st = s % 16, ch = chords[bar];
        if (st === 0) for (const n of ch) tone({ type: 'sawtooth', f: N(n - 12), at, dur: spb * 16, vol: 0.016, attack: spb * 4, filter: 'lowpass', ff: 900, bus });
        if (st % 4 === 0) tone({ type: 'triangle', f: N(ch[0] - 24), at, dur: spb * 2, vol: 0.14, bus });
        const seq = [0, 1, 2, 1, 2, 0, 1, 2, 0, 2, 1, 2, 0, 1, 2, 1];
        tone({ type: 'square', f: N(ch[seq[st]] + 12 + (st === 14 ? 12 : 0)), at, dur: spb * 0.6, vol: 0.02, filter: 'lowpass', ff: 2400, bus, send: 0.35 });
        if (st === 0 || st === 10) tone({ type: 'sine', f: 100, f2: 40, at, dur: 0.18, vol: 0.16, bus });
        if (st === 4 || st === 12) noise({ filter: 'highpass', f: 5000, dur: 0.05, vol: 0.05, at, bus });
        if (st % 2 === 1 && Math.random() < 0.3) tone({ type: 'square', f: rand(1500, 4000), at, dur: 0.02, vol: 0.012, bus });
        if (Math.floor(s / 64) % 2 === 1 && st === 8) tone({ type: 'sine', f: N(ch[2] + 24), at, dur: 1.4, vol: 0.04, bus, send: 0.7 });
      },
    },
    // 镜像拉撒路：主旋律正着弹一遍，再倒着弹一遍
    mirror: {
      bpm: 140,
      step(s, at, bus, spb) {
        const roots = [45, 41, 43, 40], bar = Math.floor(s / 16) % 4, st = s % 16, r = roots[bar];
        if (st % 4 === 0) tone({ type: 'sine', f: 140, f2: 42, at, dur: 0.2, vol: 0.4, bus });
        if (st === 4 || st === 12) noise({ filter: 'bandpass', f: 2600, dur: 0.1, vol: 0.18, at, bus });
        if (st % 2 === 1) noise({ filter: 'highpass', f: 9000, dur: 0.02, vol: 0.04, at, bus });
        tone({ type: 'square', f: N(r - 12 + (st % 8 < 4 ? 0 : 12)), at, dur: spb * 0.8, vol: 0.05, filter: 'lowpass', ff: 1100, bus });
        const mel = [69, 72, 76, 74, 72, 71, 67, 69], k = Math.floor(s / 2) % 16, idx = k < 8 ? k : 15 - k;
        if (st % 2 === 0 && Math.floor(s / 64) % 4 > 0) tone({ type: 'square', f: N(mel[idx] + (bar % 2 ? 0 : 12)), at, dur: spb * 1.6, vol: 0.03, filter: 'lowpass', ff: 3200, bus, send: 0.3 });
        if (Math.random() < 0.06) tone({ type: 'square', f: rand(200, 3000), at, dur: 0.03, vol: 0.02, bus });
      },
    },
    museum: makeMuseum(80, true),
    ending: makeMuseum(62, false),
    gallery: (() => { // 1-2 机械展区：更机械化
      const chords = [[57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 56, 59]];
      return {
        bpm: 100,
        step(s, at, bus, spb) {
          const bar = Math.floor(s / 16) % 4, st = s % 16, ch = chords[bar];
          if (st === 0) for (const n of ch) tone({ type: 'sawtooth', f: N(n), at, dur: spb * 16, vol: 0.018, attack: spb * 4, filter: 'lowpass', ff: 900, bus });
          if (st % 4 === 0) tone({ type: 'triangle', f: N(ch[0] - 24), at, dur: spb * 3, vol: 0.14, bus });
          if (st % 4 === 2) tone({ type: 'triangle', f: N(ch[0] - 12), at, dur: spb * 1.5, vol: 0.08, bus });
          const seq = [0, 2, 1, 2, 0, 2, 1, 2, 0, 1, 2, 1, 0, 2, 1, 2];
          if (st % 1 === 0 && Math.floor(s / 64) % 2 === 1) tone({ type: 'square', f: N(ch[seq[st]] + 12), at, dur: spb * 0.8, vol: 0.018, filter: 'lowpass', ff: 1800, bus, send: 0.3 });
          if (st === 0 || st === 8) tone({ type: 'sine', f: 110, f2: 40, at, dur: 0.18, vol: 0.18, bus });
          if (st === 4 || st === 12) noise({ filter: 'bandpass', f: 2500, dur: 0.06, vol: 0.05, at, bus });
          if (st % 2 === 1) noise({ filter: 'highpass', f: 8000, dur: 0.02, vol: 0.02, at, bus });
          if (st === 14 && bar === 3) tone({ type: 'sine', f: N(81), at, dur: 1.2, vol: 0.05, bus, send: 0.6 });
        },
      };
    })(),
    dome: makeMuseum(72, false),
    boss: (() => {
      const roots = [50, 46, 48, 45];
      const lead = [
        [74, 0, 72, 74, 77, 0, 76, 74], [70, 0, 74, 77, 74, 72, 70, 69],
        [72, 0, 76, 79, 76, 74, 72, 0], [73, 76, 81, 76, 73, 0, 69, 73],
      ];
      const oct = [0, 0, 12, 0, 0, 12, 0, 12, 0, 0, 12, 0, 7, 12, 0, 12];
      return {
        bpm: 150,
        step(s, at, bus, spb) {
          const bar = Math.floor(s / 16) % 4, st = s % 16, r = roots[bar], sect = Math.floor(s / 64) % 4;
          if (st % 4 === 0) tone({ type: 'sine', f: 150, f2: 42, at, dur: 0.22, vol: 0.45, bus });
          if (st === 4 || st === 12) { noise({ filter: 'bandpass', f: 1800, dur: 0.14, vol: 0.22, at, bus }); tone({ type: 'triangle', f: 210, f2: 120, at, dur: 0.08, vol: 0.1, bus }); }
          if (st % 2 === 1) noise({ filter: 'highpass', f: 8000, dur: 0.03, vol: 0.045, at, bus });
          tone({ type: 'sawtooth', f: N(r - 12 + oct[st]), at, dur: spb * 0.9, vol: 0.09, filter: 'lowpass', ff: 900, bus });
          if (sect > 0 && st % 2 === 0) {
            const n = lead[bar][st / 2];
            if (n) tone({ type: 'square', f: N(n + (sect === 3 ? 12 : 0)), at, dur: spb * 1.8, vol: 0.045, filter: 'lowpass', ff: 3000, bus, send: 0.25 });
          }
          if (st === 0) for (const n of [r + 12, r + 15, r + 19]) tone({ type: 'sawtooth', f: N(n), at, dur: spb * 3, vol: 0.03, filter: 'lowpass', ff: 1600, bus });
        },
      };
    })(),
    radio: {
      bpm: 70,
      step(s, at, bus, spb) {
        if (s % 64 === 0) {
          tone({ type: 'sawtooth', f: N(38), dur: spb * 66, vol: 0.05, attack: 2, filter: 'lowpass', ff: 380, at, bus });
          tone({ type: 'sine', f: N(50), dur: spb * 66, vol: 0.05, attack: 2, at, bus });
          tone({ type: 'triangle', f: N(57), dur: spb * 66, vol: 0.025, attack: 3, at, bus });
        }
        if (Math.random() < 0.05) noise({ filter: 'bandpass', f: rand(800, 3000), dur: rand(0.05, 0.3), vol: 0.025, at, bus });
        const motif = { 32: 69, 36: 72, 40: 76, 42: 74, 48: 64, 52: 67, 56: 69 };
        const m = motif[s % 64];
        if (m) tone({ type: 'sine', f: N(m + 12), at, dur: 1.6, vol: 0.05, bus, send: 0.7 });
      },
    },
  };

  function music(name) {
    if (!ctx) { pending = name; return; }
    if (name === curName) return;
    const t = ctx.currentTime;
    if (trackGain) {
      const old = trackGain;
      old.gain.cancelScheduledValues(t); old.gain.setValueAtTime(old.gain.value, t); old.gain.linearRampToValueAtTime(0.0001, t + 0.8);
      setTimeout(() => { try { old.disconnect(); } catch (e) { /* */ } }, 1300);
    }
    curName = name; cur = name ? TRACKS[name] : null;
    if (!cur) { trackGain = null; return; }
    trackGain = ctx.createGain(); trackGain.gain.setValueAtTime(0.0001, t); trackGain.gain.linearRampToValueAtTime(1, t + 0.7);
    trackGain.connect(musicBus);
    step = 0; nextTime = t + 0.08;
  }
  function schedule() {
    if (!ctx || !cur) return;
    const spb = 60 / cur.bpm / 4;
    if (nextTime < ctx.currentTime - 0.3) nextTime = ctx.currentTime + 0.05;
    while (nextTime < ctx.currentTime + 0.2) { cur.step(step, nextTime, trackGain, spb); step++; nextTime += spb; }
  }
  function toggleMute() {
    muted = !muted;
    if (master) master.gain.setTargetAtTime(muted ? 0 : BASE.master * vol.master, ctx.currentTime, 0.05);
    return muted;
  }
  function setVolume(k, v) {
    vol[k] = Math.round(Math.max(0, Math.min(1, v)) * 20) / 20;
    try { localStorage.setItem('lazarus_audio', JSON.stringify(vol)); } catch (e) { /* */ }
    if (!ctx) return;
    const node = { master, music: musicBus, sfx: sfxBus }[k];
    const target = k === 'master' && muted ? 0 : BASE[k] * vol[k];
    node.gain.setTargetAtTime(target, ctx.currentTime, 0.03);
  }
  return { init, sfx, music, laserLoop, toggleMute, setVolume, get volumes() { return vol; }, get muted() { return muted; }, get ready() { return !!ctx; } };
})();
