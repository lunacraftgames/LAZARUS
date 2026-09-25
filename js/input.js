'use strict';
// ============================================================
//  输入：键盘 / 手柄 / 触屏
//  手柄：Xbox（One / Series / 360）、PlayStation（DualShock 4 / DualSense）、Switch Pro、其他标准布局手柄
//  · 浏览器报告 "standard" 布局时直接使用；否则对 PS / Switch Pro 的 DirectInput 布局做重映射
//  · 自动识别最近使用的设备，界面按键提示随之切换
//  · 支持震动（Chrome / Edge 的 vibrationActuator，Firefox 的 hapticActuators）
// ============================================================

// 标准布局按钮编号：0 下  1 右  2 左  3 上  4 LB  5 RB  6 LT  7 RT  8 Select  9 Start  10 L3  11 R3  12-15 十字键 上下左右  16 Home
const PAD_BIND = {
  left: [14], right: [15], up: [12], down: [13],
  jump: [0], dash: [2, 5, 7], attack: [3, 1, 4, 6], swap: [11],
  confirm: [0], back: [1], skip: [9], pause: [9], inv: [8],
};
// 任天堂习惯：菜单里右侧 A 确认、下方 B 返回
const bindsFor = (t) => (t === 'switch' ? Object.assign({}, PAD_BIND, { confirm: [1], back: [0] }) : PAD_BIND);

// ---------------- 可自定义键位 ----------------
// 键盘每个动作最多 3 个键；手柄可改 跳跃 / 冲刺 / 攻击 / 仓库（移动固定为摇杆 + 十字键，Start 固定为暂停）
const DEFAULT_KEYS = {
  left: ['ArrowLeft', 'KeyA', null], right: ['ArrowRight', 'KeyD', null], up: ['ArrowUp', 'KeyW', null], down: ['ArrowDown', 'KeyS', null],
  jump: ['Space', 'KeyZ', 'KeyK'], dash: ['ShiftLeft', 'KeyX', 'KeyJ'], attack: ['KeyC', 'KeyU', 'KeyH'],
  swap: ['KeyQ', null, null], inv: ['KeyI', 'Tab', null], restart: ['KeyR', null, null], mute: ['KeyM', null, null],
};
const DEFAULT_PAD = { jump: [0], dash: [2, 5, 7], attack: [3, 1, 4, 6], swap: [11], inv: [8] };
const PAD_REBINDABLE = ['jump', 'dash', 'attack', 'swap', 'inv'];
// 这些键固定用于菜单 / 暂停，不能被改绑
const RESERVED_KEYS = ['Escape', 'Enter', 'NumpadEnter', 'Backspace', 'MetaLeft', 'MetaRight', 'ContextMenu', 'F5', 'F11', 'F12'];
const KEY_NAMES = {
  Space: '空格', ShiftLeft: '左Shift', ShiftRight: '右Shift', ControlLeft: '左Ctrl', ControlRight: '右Ctrl', AltLeft: '左Alt', AltRight: '右Alt',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Tab: 'Tab', CapsLock: 'Caps', Enter: 'Enter', Escape: 'Esc', Backspace: '退格',
  Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '`',
  Insert: 'Ins', Delete: 'Del', Home: 'Home', End: 'End', PageUp: 'PgUp', PageDown: 'PgDn',
};
function keyName(code) {
  if (!code) return '—';
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad/.test(code)) return '小键盘' + code.slice(6);
  return code;
}
const uniq = (a) => [...new Set(a.filter(Boolean))];
// 非标准布局（DirectInput）→ 标准编号
const PAD_REMAP = {
  ps: { 0: 2, 1: 0, 2: 1, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 16 },
  switch: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 16 },
};
// 按键提示文字（按标准编号）
const PAD_GLYPHS = {
  xbox: { 0: 'A', 1: 'B', 2: 'X', 3: 'Y', 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'View', 9: 'Menu', 10: 'LS', 11: 'RS' },
  ps: { 0: '✕', 1: '○', 2: '□', 3: '△', 4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2', 8: 'Share', 9: 'Options', 10: 'L3', 11: 'R3' },
  switch: { 0: 'B', 1: 'A', 2: 'Y', 3: 'X', 4: 'L', 5: 'R', 6: 'ZL', 7: 'ZR', 8: '−', 9: '+', 10: 'LS', 11: 'RS' },
  generic: { 0: '1', 1: '2', 2: '3', 3: '4', 4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2', 8: 'Select', 9: 'Start', 10: 'L3', 11: 'R3' },
};
const PAD_COLORS = {
  xbox: { 0: '#5c5', 1: '#e44', 2: '#48f', 3: '#ec3' },
  ps: { 0: '#8ab4ff', 1: '#ff6b7a', 2: '#e58ad8', 3: '#4fd6b4' },
};
const KEY_GLYPHS_FIXED = { pause: 'Esc', confirm: 'Enter', back: 'Esc', skip: 'Enter', select: '↑ ↓', tab: '← →' };

function padType(id) {
  const s = (id || '').toLowerCase();
  if (/045e|xbox|xinput/.test(s)) return 'xbox';
  if (/054c|dualsense|dualshock|playstation|ps4|ps5|wireless controller/.test(s)) return 'ps';
  if (/057e|(^|[^0-9a-f])57e-|nintendo|pro controller|joy-con/.test(s)) return 'switch';
  return 'generic';
}
function padName(id, type) {
  const s = (id || '').toLowerCase();
  if (type === 'xbox') return /360/.test(s) ? 'Xbox 360 手柄' : 'Xbox 手柄';
  if (type === 'ps') return /dualsense|0ce6|0df2/.test(s) ? 'PS5 DualSense 手柄' : 'PS4 DualShock 4 手柄';
  if (type === 'switch') return 'Switch Pro 手柄';
  return '通用手柄';
}

const Input = {
  raw: {}, latch: {}, state: {}, prev: {}, hits: {}, virt: {}, codes: [], pendingCodes: [],
  device: 'kb',            // 'kb' | 'xbox' | 'ps' | 'switch' | 'generic'
  padName: '', padIndex: -1, padPrev: {}, padBtnPrev: {}, rumbleOn: true, onPadChange: null,
  binds: null, capture: null, padHoldLock: false, map: {},
  // ---------- 键位存取 ----------
  loadBinds() {
    let b = null;
    try { b = JSON.parse(localStorage.getItem('lazarus_binds') || 'null'); } catch (e) { /* ignore */ }
    const keys = JSON.parse(JSON.stringify(DEFAULT_KEYS)), pad = JSON.parse(JSON.stringify(DEFAULT_PAD));
    if (b && b.keys) for (const a in keys) if (Array.isArray(b.keys[a])) keys[a] = [0, 1, 2].map((i) => b.keys[a][i] || null);
    if (b && b.pad) for (const a of PAD_REBINDABLE) if (Array.isArray(b.pad[a]) && b.pad[a].length) pad[a] = b.pad[a].slice();
    // 旧存档里没有「切换武器」：如果默认键已被玩家用在别处，就先留空，避免一个键触发两个动作
    if (b && b.keys && !b.keys.swap) keys.swap = keys.swap.map((c) => (c && Object.keys(keys).some((x) => x !== 'swap' && keys[x].includes(c)) ? null : c));
    if (b && b.pad && !b.pad.swap) pad.swap = pad.swap.filter((btn) => !PAD_REBINDABLE.some((x) => x !== 'swap' && pad[x].includes(btn)));
    if (!pad.swap.length) pad.swap = [11];
    // 「向上」键默认只用来瞄准，不再兼作跳跃；v2 之前的存档里这个开关是旧默认值（开），统一改回关
    this.binds = { v: 2, keys, pad, upJump: b && b.v >= 2 && typeof b.upJump === 'boolean' ? b.upJump : false };
    this.rebuild();
  },
  saveBinds() { try { localStorage.setItem('lazarus_binds', JSON.stringify(this.binds)); } catch (e) { /* ignore */ } this.rebuild(); },
  resetBinds() { try { localStorage.removeItem('lazarus_binds'); } catch (e) { /* ignore */ } this.loadBinds(); },
  rebuild() {
    const k = this.binds.keys, arrows = { mu: 'ArrowUp', md: 'ArrowDown', ml: 'ArrowLeft', mr: 'ArrowRight' };
    this.map = {
      left: uniq(k.left), right: uniq(k.right), up: uniq(k.up), down: uniq(k.down),
      jump: uniq([...k.jump, ...(this.binds.upJump ? k.up : [])]), dash: uniq(k.dash), attack: uniq(k.attack), swap: uniq(k.swap), inv: uniq(k.inv),
      confirm: uniq(['Enter', 'NumpadEnter', ...k.jump]), back: ['Escape', 'Backspace'], skip: ['Enter', 'NumpadEnter'], pause: ['Escape'],
      mute: uniq(k.mute), restart: uniq(k.restart),
      // 菜单导航：方向键永远可用 + 玩家自定义的方向键
      mu: uniq([arrows.mu, ...k.up]), md: uniq([arrows.md, ...k.down]), ml: uniq([arrows.ml, ...k.left]), mr: uniq([arrows.mr, ...k.right]),
    };
    for (const a of PAD_REBINDABLE) PAD_BIND[a] = this.binds.pad[a].slice();
    PAD_BIND.mu = [12]; PAD_BIND.md = [13]; PAD_BIND.ml = [14]; PAD_BIND.mr = [15];
  },
  // 把 code 绑定到 action 的第 slot 个键位；返回被挤掉的动作名（若有）
  bindKey(action, slot, code) {
    let moved = null;
    for (const a in this.binds.keys) {
      const arr = this.binds.keys[a];
      for (let i = 0; i < arr.length; i++) if (arr[i] === code && !(a === action && i === slot)) { arr[i] = null; if (a !== action) moved = a; }
    }
    this.binds.keys[action][slot] = code; this.saveBinds();
    return moved;
  },
  clearKey(action, slot) { this.binds.keys[action][slot] = null; this.saveBinds(); },
  bindPad(action, btn) {
    let moved = null;
    for (const a of PAD_REBINDABLE) if (a !== action && this.binds.pad[a].includes(btn)) {
      this.binds.pad[a] = this.binds.pad[a].filter((x) => x !== btn); moved = a;
    }
    this.binds.pad[action] = [btn]; this.saveBinds();
    return moved;
  },
  // 进入改键捕获：kind = 'key' | 'pad'；cb(code / 按钮编号 / null=取消)
  startCapture(kind, cb) { this.capture = { kind, cb, t: performance.now() }; },
  init() {
    this.loadBinds();
    const block = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Backspace'];
    addEventListener('keydown', (e) => {
      if (block.includes(e.code) || (e.altKey && /^Digit\d$/.test(e.code))) e.preventDefault(); // Alt + 数字：标题界面跳第三章（测试用）
      if (this.capture && this.capture.kind === 'key') {
        e.preventDefault(); if (e.repeat) return;
        const c = this.capture;
        if (e.code === 'Escape') { this.capture = null; c.cb(null); return; }
        if (RESERVED_KEYS.includes(e.code)) { c.cb('reserved:' + e.code); return; }
        this.capture = null; c.cb(e.code); return;   // 被捕获的键不参与本次游戏输入
      }
      this.raw[e.code] = true; this.device = 'kb';
      if (e.repeat) return;
      for (const a in this.map) if (this.map[a].includes(e.code)) this.latch[a] = true;
      this.pendingCodes.push(e.code);
      if (window.Sound) Sound.init();
    });
    addEventListener('keyup', (e) => { this.raw[e.code] = false; });
    addEventListener('blur', () => { this.raw = {}; this.virt = {}; });
    addEventListener('gamepadconnected', (e) => { this.padIndex = e.gamepad.index; this.setPad(e.gamepad); if (this.onPadChange) this.onPadChange(true, this.padName); });
    addEventListener('gamepaddisconnected', (e) => {
      if (e.gamepad.index === this.padIndex) { this.padIndex = -1; if (this.device !== 'kb') this.device = 'kb'; }
      if (this.onPadChange) this.onPadChange(false, padName(e.gamepad.id, padType(e.gamepad.id)));
    });
    try { this.rumbleOn = localStorage.getItem('lazarus_rumble') !== '0'; } catch (e) { /* ignore */ }
  },
  setPad(gp) { const t = padType(gp.id); this.padType = t; this.padName = padName(gp.id, t); },
  setVirt(a, v) { this.virt[a] = v; if (v) this.latch[a] = true; },
  // 读取一个手柄 → 标准编号的按钮数组 + 摇杆
  readPad(gp) {
    const t = padType(gp.id), std = gp.mapping === 'standard';
    const btn = [];
    const pressed = (b) => !!b && (b.pressed || b.value > 0.5);
    if (std || !PAD_REMAP[t]) gp.buttons.forEach((b, i) => { btn[i] = pressed(b); });
    else {
      const rm = PAD_REMAP[t];
      gp.buttons.forEach((b, i) => { if (rm[i] != null) btn[rm[i]] = btn[rm[i]] || pressed(b); });
      // DirectInput 十字键常作为「帽子」轴报告（通常是 axes[9]）
      const hat = gp.axes.length > 9 ? gp.axes[9] : null;
      if (hat != null && hat >= -1.05 && hat <= 1.05) {
        const dir = Math.round((hat + 1) / (2 / 7)); // 0 上 1 右上 2 右 3 右下 4 下 5 左下 6 左 7 左上
        btn[12] = btn[12] || dir === 0 || dir === 1 || dir === 7;
        btn[15] = btn[15] || dir === 1 || dir === 2 || dir === 3;
        btn[13] = btn[13] || dir === 3 || dir === 4 || dir === 5;
        btn[14] = btn[14] || dir === 5 || dir === 6 || dir === 7;
      }
    }
    return { t, btn, ax: gp.axes[0] || 0, ay: gp.axes[1] || 0 };
  },
  pad() {
    const s = {};
    let pads = [];
    try { pads = navigator.getGamepads ? [...navigator.getGamepads()].filter((p) => p && p.connected) : []; } catch (e) { return s; }
    for (const gp of pads) {
      const r = this.readPad(gp);
      // 手柄改键捕获
      const prevBtn = this.padBtnPrev[gp.index] || [];
      this.padBtnPrev[gp.index] = r.btn.slice();
      if (this.capture && this.capture.kind === 'pad') {
        for (let i = 0; i <= 11; i++) if (r.btn[i] && !prevBtn[i]) {
          const c = this.capture; this.capture = null; this.padHoldLock = true; this.device = r.t; this.setPad(gp);
          c.cb(i === 9 ? null : i); break;
        }
        return {};
      }
      if (this.padHoldLock) { if (r.btn.some(Boolean)) { this.padPrev[gp.index] = {}; return {}; } this.padHoldLock = false; }
      const b = (i) => !!r.btn[i];
      const stick = { left: r.ax < -0.45, right: r.ax > 0.45, up: r.ay < -0.55, down: r.ay > 0.55, ml: r.ax < -0.45, mr: r.ax > 0.45, mu: r.ay < -0.55, md: r.ay > 0.55 };
      let active = false;
      const BIND = bindsFor(r.t);
      for (const a in BIND) {
        const v = BIND[a].some(b) || !!stick[a];
        if (v) s[a] = true;
        if (v && !(this.padPrev[gp.index] || {})[a]) active = true;
      }
      this.padPrev[gp.index] = Object.fromEntries(Object.keys(BIND).map((a) => [a, BIND[a].some(b) || !!stick[a]]));
      if (active) { this.device = r.t; this.padIndex = gp.index; this.setPad(gp); }
    }
    return s;
  },
  update() {
    this.prev = this.state;
    const s = {}, gp = this.pad();
    for (const a in this.map) s[a] = this.map[a].some((c) => this.raw[c]) || !!this.virt[a] || !!gp[a];
    this.state = s;
    this.hits = {};
    for (const a in this.map) this.hits[a] = (s[a] && !this.prev[a]) || !!this.latch[a];
    this.latch = {};
    this.codes = this.pendingCodes; this.pendingCodes = [];
  },
  down(a) { return !!this.state[a]; },
  hit(a) { return !!this.hits[a]; },
  code(c) { return this.codes.includes(c); },

  // ---------------- 按键提示 ----------------
  get usingPad() { return this.device !== 'kb'; },
  glyph(action) {
    if (!this.usingPad) {
      if (KEY_GLYPHS_FIXED[action]) return KEY_GLYPHS_FIXED[action];
      const k = this.binds.keys;
      if (action === 'move') {
        const a = `${keyName(k.left[0])} ${keyName(k.right[0])}`, b2 = k.left[1] && k.right[1] ? ` / ${keyName(k.left[1])} ${keyName(k.right[1])}` : '';
        return a + b2;
      }
      if (k[action]) { const first = k[action].find(Boolean); return first ? keyName(first) : '未绑定'; }
      return action;
    }
    const g = PAD_GLYPHS[this.device] || PAD_GLYPHS.generic;
    switch (action) {
      case 'move': return '左摇杆 / 十字键';
      case 'select': return '十字键 ↑↓';
      case 'tab': return '十字键 ←→';
      case 'down': return '↓';
      case 'up': return '↑';
      case 'restart': return '—';
      case 'mute': return '—';
      default: { const B = bindsFor(this.device); return g[B[action] ? B[action][0] : 0]; }
    }
  },
  glyphColor(action) {
    if (!this.usingPad) return null;
    const B = bindsFor(this.device); const c = PAD_COLORS[this.device]; const i = B[action] && B[action][0];
    return c && c[i] ? c[i] : null;
  },
  // 把文本中的 {jump} {dash} {attack} {move} {down} {inv} {pause} {confirm} {back} {skip} 替换为当前设备的按键
  fmt(text) { return text.replace(/\{(\w+)\}/g, (m, a) => '[' + this.glyph(a) + ']'); },

  // ---------------- 震动 ----------------
  rumble(strong, weak, ms) {
    if (!this.rumbleOn || !this.usingPad || this.padIndex < 0) return;
    try {
      const gp = navigator.getGamepads()[this.padIndex]; if (!gp) return;
      if (gp.vibrationActuator && gp.vibrationActuator.playEffect) {
        gp.vibrationActuator.playEffect('dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: clamp(strong, 0, 1), weakMagnitude: clamp(weak, 0, 1) }).catch(() => {});
      } else if (gp.hapticActuators && gp.hapticActuators[0]) {
        gp.hapticActuators[0].pulse(clamp(Math.max(strong, weak), 0, 1), ms);
      }
    } catch (e) { /* ignore */ }
  },
  setRumble(on) { this.rumbleOn = on; try { localStorage.setItem('lazarus_rumble', on ? '1' : '0'); } catch (e) { /* ignore */ } if (on) this.rumble(0.4, 0.4, 150); },
};

// 在画布上绘制一个按键徽章，返回宽度
function drawKey(ctx, x, y, action, opts) {
  const o = opts || {}, label = typeof action === 'string' && action.startsWith('=') ? action.slice(1) : Input.glyph(action);
  const size = o.size || 12;
  ctx.save();
  ctx.font = 'bold ' + size + 'px ' + FONT;
  const tw = ctx.measureText(label).width, h = size + 8, round = Input.usingPad && label.length <= 1;
  const w = round ? h : tw + 12;
  const col = Input.glyphColor(action) || o.color || '#e8f4f0';
  ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.strokeStyle = col; ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (round) ctx.arc(x + w / 2, y - size / 2 + 1, h / 2, 0, Math.PI * 2);
  else if (ctx.roundRect) ctx.roundRect(x, y - size - 2, w, h, 4);
  else ctx.rect(x, y - size - 2, w, h);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.fillText(label, x + w / 2, y);
  ctx.restore();
  return w;
}
// 绘制一行提示：parts = ['文字', {k:'jump'}, '文字', ...]；align 'left' | 'center' | 'right'
function drawHintLine(ctx, x, y, parts, opts) {
  const o = Object.assign({ size: 12, color: 'rgba(200,200,200,0.6)', align: 'left', gap: 6 }, opts || {});
  ctx.save(); ctx.font = o.size + 'px ' + FONT;
  const widths = parts.map((p) => {
    if (typeof p === 'string') return ctx.measureText(p).width;
    ctx.font = 'bold ' + o.size + 'px ' + FONT; const l = Input.glyph(p.k); const tw = ctx.measureText(l).width; ctx.font = o.size + 'px ' + FONT;
    return (Input.usingPad && l.length <= 1 ? o.size + 8 : tw + 12);
  });
  const total = widths.reduce((s, w) => s + w + o.gap, -o.gap);
  let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  parts.forEach((p, i) => {
    if (typeof p === 'string') { ctx.fillStyle = o.color; ctx.textAlign = 'left'; ctx.font = o.size + 'px ' + FONT; ctx.fillText(p, cx, y); }
    else drawKey(ctx, cx, y, p.k, { size: o.size });
    cx += widths[i] + o.gap;
  });
  ctx.restore();
}
