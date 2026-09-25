'use strict';
// ============================================================
//  第四章：至高神座 · 中央核心（Omni-Mind Core）
//  章节机制：
//   1. 重力反转：背景的数据流在「深蓝」和「猩红」之间交替。猩红 = 重力反转，主角和小怪都会飞上天花板。
//      关卡可以用 gcycle: [蓝秒数, 红秒数] 让重力按时间交替，也可以放置重力开关 'G' 手动切换。
//   2. 维度重写：「降维扫描光束」之间的区域会切换画面与手感——
//      'cube' 一键模式（类 Geometry Dash：自动向右跑，只能跳；撞墙即死；按住跳跃会连续起跳）
//      'wire' 线框视界（纯线条画面，没有惯性、起跳高度固定）
//  新敌人：磁轨浮空姬 / 维度撕裂者 / 格式化追踪者 / 逻辑奇点 / 协议伪造者
//  最终 Boss：神性通用智能 · Omni-Mind（万脑）
//
//  地图新增字符：
//   'G' 重力开关（一键模式里就是重力传送门）  'R' 磁轨浮空姬（放在它所在列的空中即可，会自己吸附天花板/地面）
//   'J' 维度撕裂者  'P' 格式化追踪者  'O' 逻辑奇点
//   'Q' 协议伪造者（伪装成存档点）  'q' 协议伪造者（伪装成重力开关）
//  构建函数新增：B.shift(x0, x1, 'cube' | 'wire')  降维扫描区域（按列）
//  站立位置约定：地面站立行 13，天花板（反转）站立行 3（天花板为 0~2 行）
// ============================================================

const C4 = { OFFLINE: 5, TRACK_SPEED: 65, CUBE_RUN: 310, CUBE_JUMP: 760, CUBE_GRAV: 2600 };
SPEAKERS.OMNI = 'Ω-MIND · 万脑';

// ---------------- 主题与美术：极简黑白灰 + 悬浮的金色几何体 ----------------
Object.assign(THEMES, {
  core: { top: '#050506', bottom: '#131315', haze: 'rgba(20,20,24,0.18)', shaft: 'rgba(255,240,200,0.07)', tint: 'rgba(255,245,220,0.02)', dust: 'rgba(255,230,170,0.4)', back: () => Art.coreBack || (Art.coreBack = makeCoreBack()), mid: () => Art.coreMid || (Art.coreMid = makeCoreMid()), overlay: drawCoreFlow, tiles: 'core', backAlpha: 0.9 },
  coreTower: { top: '#050506', bottom: '#131315', haze: 'rgba(20,20,24,0.18)', shaft: 'rgba(255,240,200,0.07)', tint: 'rgba(255,245,220,0.02)', dust: 'rgba(255,230,170,0.4)', vtile: true, back: () => Art.coreBack || (Art.coreBack = makeCoreBack()), mid: () => Art.coreMid || (Art.coreMid = makeCoreMid()), overlay: drawCoreFlow, tiles: 'core', backAlpha: 0.9 },
  coreThrone: { top: '#08070a', bottom: '#1a1612', haze: 'rgba(40,30,10,0.18)', shaft: 'rgba(255,220,140,0.1)', tint: 'rgba(255,220,150,0.03)', dust: 'rgba(255,220,150,0.5)', back: () => Art.coreBack || (Art.coreBack = makeCoreBack()), mid: () => Art.coreMid || (Art.coreMid = makeCoreMid()), overlay: drawCoreFlow, tiles: 'core', backAlpha: 0.95 },
});

function isoCube(x, cx, cy, s, fill, line) {
  const h = s * 0.5;
  const top = [[cx, cy - s], [cx + s, cy - h], [cx, cy], [cx - s, cy - h]];
  const left = [[cx - s, cy - h], [cx, cy], [cx, cy + s], [cx - s, cy + h]];
  const right = [[cx + s, cy - h], [cx, cy], [cx, cy + s], [cx + s, cy + h]];
  for (const [pts, a] of [[top, 1], [left, 0.55], [right, 0.75]]) {
    x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.closePath();
    if (fill) { x.globalAlpha = a; x.fillStyle = fill; x.fill(); x.globalAlpha = 1; }
    if (line) { x.strokeStyle = line; x.stroke(); }
  }
}
// 远景：黑白灰的神殿空间、巨大的金色线框立方体与光环
function makeCoreBack() {
  const W = 1800, H = 620, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(4040);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#030304'); g.addColorStop(1, '#101012');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // 远处的白色石柱
  for (let i = 0; i < 14; i++) {
    const px = r() * W, pw = 20 + r() * 40, ph = 200 + r() * 380;
    const lg = x.createLinearGradient(px, 0, px + pw, 0); lg.addColorStop(0, 'rgba(120,120,126,0.16)'); lg.addColorStop(0.5, 'rgba(200,200,206,0.22)'); lg.addColorStop(1, 'rgba(90,90,96,0.12)');
    x.fillStyle = lg; x.fillRect(px, H - ph, pw, ph);
  }
  // 光环
  x.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const cx = r() * W, cy = 120 + r() * 260, rr = 60 + r() * 160;
    x.strokeStyle = `rgba(230,190,90,${0.12 + r() * 0.12})`; x.beginPath(); x.ellipse(cx, cy, rr, rr * 0.28, 0, 0, Math.PI * 2); x.stroke();
  }
  // 巨大的金色线框立方体
  x.lineWidth = 1.5;
  for (let i = 0; i < 7; i++) isoCube(x, r() * W, 120 + r() * 340, 40 + r() * 90, null, `rgba(230,190,90,${0.14 + r() * 0.16})`);
  return c;
}
// 中景：悬浮的实心金色几何体
function makeCoreMid() {
  const W = 1600, H = 620, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(5050);
  for (let i = 0; i < 9; i++) {
    const cx = r() * W, cy = 80 + r() * 420, s = 10 + r() * 28;
    isoCube(x, cx, cy, s, '#b8903a', 'rgba(255,230,160,0.6)');
    x.fillStyle = 'rgba(255,220,140,0.08)'; x.fillRect(cx - 1, cy + s, 2, 120); // 倒影光线
  }
  for (let i = 0; i < 6; i++) { // 细长的白色方尖碑
    const px = r() * W, ph = 60 + r() * 120, py = 150 + r() * 350;
    x.fillStyle = 'rgba(210,210,215,0.35)'; x.beginPath(); x.moveTo(px, py - ph); x.lineTo(px + 6, py - ph + 12); x.lineTo(px + 6, py); x.lineTo(px - 6, py); x.lineTo(px - 6, py - ph + 12); x.closePath(); x.fill();
  }
  return c;
}
// 交替闪烁的红蓝数据流（颜色 = 当前重力状态，流向 = 重力方向）
function drawCoreFlow(ctx, cam, t) {
  const core = typeof Game !== 'undefined' ? Game.core : null;
  const gd = core ? core.gd : 1, warn = core ? core.warn : 0;
  const red = gd < 0, blink = warn > 0 && (t * 8) % 2 < 1;
  const col = (red !== blink) ? '255,50,70' : '60,120,255';
  ctx.globalCompositeOperation = 'lighter';
  const tg = ctx.createLinearGradient(0, 0, 0, VH); tg.addColorStop(0, `rgba(${col},${red ? 0.1 : 0.06})`); tg.addColorStop(1, 'rgba(0,0,0,0)');
  if (red) { tg.addColorStop(0, `rgba(${col},0.02)`); }
  ctx.fillStyle = `rgba(${col},0.07)`; ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 26; i++) {
    const span = VW + 40, px = ((i * 97 - cam.x * 0.4) % span + span) % span - 20;
    const sp = 120 + (i * 53) % 160, len = 40 + (i * 31) % 90;
    let yy = ((t * sp + i * 173) % (VH + len)) - len;
    if (gd < 0) yy = VH - yy - len;
    ctx.fillStyle = `rgba(${col},0.22)`; ctx.fillRect(px, yy, 2, len);
    ctx.fillStyle = `rgba(${col},0.6)`; ctx.fillRect(px, gd < 0 ? yy : yy + len - 4, 2, 4);
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ---------------- 瓦片：极简的灰白石块，上下两面都能站 ----------------
TILESETS.core = {
  stone(x, px, py, r, cx, cy, oT, oB, oL, oR) {
    x.fillStyle = ['#18181b', '#1b1b1e', '#161619', '#1d1d20'][Math.floor(r() * 4)]; x.fillRect(px, py, TILE, TILE);
    x.fillStyle = 'rgba(255,255,255,0.03)'; x.fillRect(px, py, TILE, 1); x.fillRect(px, py, 1, TILE);
    if (r() < 0.12) { x.fillStyle = 'rgba(230,190,90,0.18)'; x.fillRect(px + 14, py + 14, 4, 4); }
    if (oL) { x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(px, py, 1, TILE); }
    if (oR) { x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(px + TILE - 1, py, 1, TILE); }
    if (oT) { x.fillStyle = '#3a3a3e'; x.fillRect(px, py, TILE, 3); x.fillStyle = '#f2f0ea'; x.fillRect(px, py, TILE, 1); x.fillStyle = 'rgba(230,190,90,0.6)'; if (r() < 0.25) x.fillRect(px + 6 + r() * 16, py + 1, 8, 1); }
    if (oB) { x.fillStyle = '#3a3a3e'; x.fillRect(px, py + TILE - 3, TILE, 3); x.fillStyle = '#f2f0ea'; x.fillRect(px, py + TILE - 1, TILE, 1); }
  },
  marble(x, px, py, r, oL, oR) {
    x.fillStyle = '#d8d6ce'; x.fillRect(px, py, TILE, TILE);
    x.fillStyle = '#f6f4ee'; x.fillRect(px, py, TILE, 3); x.fillStyle = '#a8a69e'; x.fillRect(px, py + TILE - 3, TILE, 3);
    x.fillStyle = 'rgba(230,190,90,0.7)'; x.fillRect(px, py + 14, TILE, 2);
    if (oL) { x.fillStyle = '#bab8b0'; x.fillRect(px, py, 2, TILE); } if (oR) { x.fillStyle = '#bab8b0'; x.fillRect(px + TILE - 2, py, 2, TILE); }
  },
  shelf(x, px, py, endL, endR) {
    x.fillStyle = '#e8e6de'; x.fillRect(px, py, TILE, 4); x.fillStyle = 'rgba(230,190,90,0.8)'; x.fillRect(px, py + 4, TILE, 1);
    if (endL) x.fillRect(px, py, 2, 6); if (endR) x.fillRect(px + TILE - 2, py, 2, 6);
  },
  shards(x, px, py, r, down) {
    x.save();
    if (down) { x.translate(px + 16, py + 16); x.scale(1, -1); x.translate(-px - 16, -py - 16); }
    x.fillStyle = '#2a2418'; x.fillRect(px, py + 28, TILE, 4);
    for (let k = 0; k < 4; k++) {
      const bx = px + 1 + k * 8, h = 16 + (k % 2) * 6;
      x.fillStyle = '#e6c56a'; x.beginPath(); x.moveTo(bx, py + 28); x.lineTo(bx + 3.5, py + 28 - h); x.lineTo(bx + 7, py + 28); x.fill();
      x.fillStyle = '#fff6d8'; x.fillRect(bx + 3, py + 28 - h * 0.85, 1, h * 0.5);
    }
    x.restore();
  },
  prop(x, cx, gy, type) {
    x.save();
    switch (type % 3) {
      case 0: isoCube(x, cx, gy - 10, 7, '#b8903a', 'rgba(255,230,160,0.7)'); break;
      case 1: x.fillStyle = '#cfcdc5'; x.beginPath(); x.moveTo(cx, gy - 26); x.lineTo(cx + 4, gy - 20); x.lineTo(cx + 4, gy); x.lineTo(cx - 4, gy); x.lineTo(cx - 4, gy - 20); x.closePath(); x.fill(); break;
      default: x.strokeStyle = 'rgba(230,190,90,0.7)'; x.lineWidth = 1.5; x.beginPath(); x.ellipse(cx, gy - 12, 9, 3, 0, 0, Math.PI * 2); x.stroke(); x.fillStyle = '#e8e6de'; x.fillRect(cx - 1, gy - 12, 2, 12);
    }
    x.restore();
  },
};

// ---------------- 构建函数扩展 ----------------
const _makeBuilderCh3 = makeBuilder;
makeBuilder = function (w, h) { // eslint-disable-line no-func-assign
  const B = _makeBuilderCh3(w, h);
  return Object.assign(B, { shift(x0, x1, mode, speed) { this.extra.push(() => new ShiftZone(x0, x1, mode, h, speed)); } });
};
// 第四章关卡的通用框架：左右墙、天花板 0~2 行、地面 14~17 行
function frame4(B, W, H) {
  const h = H || 18;
  B.fill(0, 0, 1, h - 1, '#'); B.fill(W - 2, 0, W - 1, h - 1, '#');
  B.fill(2, 0, W - 3, 2, '#'); B.fill(2, h - 4, W - 3, h - 1, '#');
}
const voidFloor = (B, x0, x1) => B.fill(x0, 14, x1, 17, ' ');
const voidCeil = (B, x0, x1) => B.fill(x0, 0, x1, 2, ' ');

// 第四章的踩踏判定：朝自己的「脚下」方向下落，并且上一帧还在敌人「上方」
function stomp4(p, e, tol) {
  const t = tol || 10;
  if ((p.gd || 1) > 0) return p.vy > 30 && p.prevBottom <= e.y + t;
  return p.vy < -30 && p.prevTop >= e.y + e.h - t;
}

// ============================================================
//  本章控制器：重力 / 维度重写 / 断网
// ============================================================
class CoreCtl {
  constructor(g, cycle) {
    g.core = this; this.cycle = cycle || null; this.gd = 1; this.manual = 1; this.forceGd = null; this.t = 0;
    this.mode = 'normal'; this.modeT = 9; this.flipT = 9; this.offlineT = 0; this.zones = null; this.spawn = null; this.hardReset = false; this.beep = 0;
    this.x = 0; this.y = 0; this.w = g.world.pw; this.h = g.world.ph;
  }
  toggle() { this.manual = -this.manual; }
  // 距离下一次重力切换的秒数（没有周期时为 Infinity）
  get left() {
    if (!this.cycle || this.forceGd != null) return Infinity;
    const [b, r] = this.cycle, ph = this.t % (b + r);
    return ph < b ? b - ph : b + r - ph;
  }
  get warn() { const l = this.left; return l < 1 ? l : 0; }
  onRespawn(g) {
    this.t = 0; this.manual = 1; this.offlineT = 0; this.mode = 'normal'; this.modeT = 9;
    if (this.hardReset) {
      // 断网期间死亡：拉撒路协议无法重构 → 从关卡起点重来
      this.hardReset = false;
      g.checkpoint = { x: this.spawn.x, y: this.spawn.y };
      for (const pr of g.props) if (pr instanceof Checkpoint) pr.active = false;
      g.permDead.clear();
      g.toast('重构失败', '拉撒路协议处于断网状态——备份无法读取，从关卡起点重新开始。');
    }
  }
  update(dt, g) {
    const p = g.player;
    if (!this.spawn) this.spawn = { x: g.checkpoint.x, y: g.checkpoint.y };
    if (g.state === 'play') { this.t += dt; if (this.offlineT > 0) this.offlineT -= dt; }
    if (this.offlineT > 0 && p) p.dashLock = Math.max(p.dashLock, this.offlineT); // 断网：冲刺（及各角色的冲刺键能力）失灵
    if (g.state === 'dead' && this.offlineT > 0) { this.hardReset = true; this.offlineT = 0; }
    // 重力
    let gd = this.manual;
    if (this.forceGd != null) gd = this.forceGd;
    else if (this.cycle) gd = this.left === Infinity ? 1 : ((this.t % (this.cycle[0] + this.cycle[1])) < this.cycle[0] ? 1 : -1);
    if (gd !== this.gd) {
      this.gd = gd; this.flipT = 0; Sound.sfx.gflip(); g.shake(4); g.flash(0.25, gd < 0 ? '#f35' : '#58f');
      if (p && !p.dead) g.particles.burst(p.cx, p.cy, 14, { color: gd < 0 ? ['#f35', '#fff'] : ['#58f', '#fff'], smin: 60, smax: 200, lmin: 0.2, lmax: 0.5, add: true });
      if (!g.gravHinted) { g.gravHinted = true; g.toastHint(gd < 0 ? '猩红 = 重力反转：你会飞上天花板，在天花板上照常奔跑和跳跃' : '深蓝 = 重力恢复正常'); }
    }
    if (this.warn > 0 && g.state === 'play' && this.offlineT <= 0) { this.beep -= dt; if (this.beep <= 0) { this.beep = 0.25; Sound.sfx.gwarn(); } } else this.beep = 0;
    // 维度重写
    if (!this.zones) this.zones = g.props.filter((pr) => pr instanceof ShiftZone);
    if (g.state === 'play' && p && !p.dead) {
      const z = this.zones.find((zz) => p.cx >= zz.x0 && p.cx < zz.x1);
      const mode = z ? z.mode : 'normal';
      p.cubeRun = (z && z.speed) || C4.CUBE_RUN; // 一键模式的后半段可以更快
      if (mode !== this.mode) {
        this.mode = mode; this.modeT = 0; Sound.sfx.shift(); g.flash(0.5, '#fff'); g.shake(3);
        if (mode === 'cube' && !g.cubeHinted) { g.cubeHinted = true; g.toastHint(Input.fmt('降维：一键模式——自动向前跑，只能按 {jump} 跳（按住会连续跳）。撞到墙面即死')); }
        if (mode === 'wire' && !g.wireHinted) { g.wireHinted = true; g.toastHint('降维：线框视界——没有惯性，起跳高度固定'); }
        if (mode === 'normal' && p) { p.vx = Math.min(p.vx, PL.RUN); p.cubeRot = 0; }
      }
    }
    this.modeT += dt; this.flipT += dt;
  }
  draw() {}
  drawOver(ctx, g) {
    const p = g.player; if (!p || p.dead) return;
    if (this.offlineT > 0) {
      const x = p.cx, y = (p.gd < 0 ? p.y + p.h + 18 : p.y - 16);
      ctx.fillStyle = `rgba(255,60,60,${0.6 + 0.4 * Math.sin(g.t * 18)})`; ctx.font = 'bold 10px ' + MONO; ctx.textAlign = 'center';
      ctx.fillText(`OFFLINE ${this.offlineT.toFixed(1)}`, x, y); ctx.textAlign = 'left';
    }
  }
  drawScreen(ctx, g) {
    if (this.mode === 'cube' || this.mode === 'wire') drawShiftView(ctx, g, this.mode);
    if (this.modeT < 0.35) { // 切换瞬间：撕裂横条
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 6; i++) ctx.fillRect(0, rand(0, VH), VW, rand(2, 10));
    }
    const p = g.player;
    if (g.boss && g.boss.drawScreen) g.boss.drawScreen(ctx, g); // 终局的黑暗在 HUD 类信息之下
    // 重力状态
    const hasGrav = this.cycle || this.forceGd != null || this.gd < 0 || (g.props && g.props.some((pr) => pr instanceof GravSwitch));
    if (hasGrav) {
      // 放在顶部 HUD 一排的空位里（武器 / 二段跳格子右边）
      const red = this.gd < 0, w = this.warn, x = 556, y = 12;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x, y, 170, 44);
      ctx.fillStyle = red ? '#ff4a5e' : '#6a9cff'; ctx.fillRect(x, y, 4, 44);
      ctx.font = '10px ' + MONO; ctx.fillStyle = 'rgba(200,200,200,0.7)'; ctx.fillText('GRAVITY', x + 12, y + 16);
      ctx.font = 'bold 13px ' + FONT; ctx.fillStyle = red ? '#ff6a7a' : '#8ab4ff'; ctx.fillText(red ? '▲ 反转' : '▼ 正常', x + 12, y + 36);
      if (this.left !== Infinity && this.offlineT > 0) { // 断网：倒计时丢失
        ctx.textAlign = 'right'; ctx.font = 'bold 12px ' + MONO; ctx.fillStyle = (g.t * 6) % 2 < 1 ? '#f55' : '#822'; ctx.fillText('--.-s', x + 158, y + 22); ctx.textAlign = 'left';
      } else if (this.left !== Infinity) {
        const k = this.left / (red ? this.cycle[1] : this.cycle[0]);
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x + 80, y + 30, 78, 5);
        ctx.fillStyle = w > 0 && (g.t * 8) % 2 < 1 ? '#fff' : red ? '#ff4a5e' : '#6a9cff'; ctx.fillRect(x + 80, y + 30, 78 * clamp(k, 0, 1), 5);
        ctx.textAlign = 'right'; ctx.font = 'bold 12px ' + MONO; ctx.fillText(this.left.toFixed(1) + 's', x + 158, y + 22); ctx.textAlign = 'left';
      }
      if (w > 0 && this.offlineT <= 0) { // 切换预警：屏幕边缘闪另一种颜色
        const a = (1 - w) * 0.35 * ((g.t * 8) % 2 < 1 ? 1 : 0.3);
        const gr = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.4, VW / 2, VH / 2, VW * 0.62);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, red ? `rgba(60,120,255,${a})` : `rgba(255,50,70,${a})`);
        ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
      }
    }
    if (this.offlineT > 0 && p) {
      ctx.fillStyle = `rgba(255,20,20,${0.1 + 0.06 * Math.sin(g.t * 12)})`; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(VW / 2 - 230, VH - 86, 460, 44);
      ctx.fillStyle = '#ff5a5a'; ctx.font = 'bold 15px ' + MONO; ctx.textAlign = 'center';
      ctx.fillText(`LAZARUS PROTOCOL · OFFLINE ${this.offlineT.toFixed(1)}s`, VW / 2, VH - 66);
      ctx.font = '12px ' + FONT; ctx.fillText(g.diff === 'easy' ? '拉撒路协议断网：冲刺失灵、重力倒计时丢失 · 此时被摧毁将无法在存档点重构' : '拉撒路协议断网：冲刺失灵、重力倒计时丢失', VW / 2, VH - 49); ctx.textAlign = 'left';
    }
  }
  // 画在 HUD 之后：攻击被剥夺时盖住武器格子
  drawHud(ctx, g) {
    if (g.noAttack && Inventory.weapon()) {
      ctx.fillStyle = 'rgba(40,0,6,0.8)'; ctx.fillRect(356, 12, 118, 44);
      ctx.strokeStyle = '#ff4a5e'; ctx.lineWidth = 2; ctx.strokeRect(357, 13, 116, 42);
      ctx.fillStyle = '#ff6a7a'; ctx.font = 'bold 12px ' + FONT; ctx.textAlign = 'center'; ctx.fillText('攻击已被剥夺', 415, 39); ctx.textAlign = 'left';
    }
  }
}

// 降维扫描区域
class ShiftZone {
  constructor(x0, x1, mode, h, speed) { this.mode = mode; this.speed = speed || 0; this.x0 = x0 * TILE; this.x1 = (x1 + 1) * TILE; this.x = this.x0 - 30; this.y = 0; this.w = this.x1 - this.x0 + 60; this.h = h * TILE; }
  update() {}
  draw(ctx, g) {
    const marks = this.speed ? [[this.x0, '维度压缩 · 加速']] : [[this.x0, this.mode === 'cube' ? '降维扫描 · 一键模式' : '降维扫描 · 线框视界'], [this.x1, '维度恢复']];
    for (const [xx, label] of marks) {
      ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createLinearGradient(xx - 24, 0, xx + 24, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,240,200,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(xx - 24, 0, 48, this.h);
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(xx - 1, 0, 2, this.h);
      const sy = (g.t * 260) % this.h; ctx.fillStyle = 'rgba(255,230,160,0.9)'; ctx.fillRect(xx - 12, sy, 24, 3);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255,240,210,0.85)'; ctx.font = 'bold 11px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText(label, xx, 7 * TILE + Math.sin(g.t * 3) * 3); ctx.textAlign = 'left';
    }
  }
}

// ---------------- 一键模式的物理（Player 的扩展） ----------------
Player.prototype.updateCube = function (dt, g, I, ctl) {
  const W = g.world, gd = this.gd;
  let vy = this.vy * gd;
  this.vx = this.cubeRun || C4.CUBE_RUN; this.facing = 1; this.dashT = 0; this.atkT = 0;
  vy = Math.min(vy + C4.CUBE_GRAV * dt, 900);
  if (this.onGround && I.down('jump')) { vy = -C4.CUBE_JUMP; this.onGround = false; Sound.sfx.cubeJump(); ctl.jumped = 'ground'; }
  const hx = W.moveX(this, this.vx * dt);
  if (hx) {
    // 差一点点就能站上去时，往上托一下（容错）；否则撞墙即死
    this.y -= 8 * gd;
    if (W.moveX(this, 1)) { this.y += 8 * gd; g.killPlayer('wall'); }
  }
  const ry = W.moveY(this, vy * dt * gd);
  this.onGround = !!ry && vy >= 0; if (ry) vy = 0;
  this.vy = vy * gd;
  if (this.onGround) this.cubeRot = Math.round(this.cubeRot / (Math.PI / 2)) * (Math.PI / 2);
  else this.cubeRot += dt * 7.5 * gd;
  this.airT = this.onGround ? 0 : this.airT + dt;
  this.trailT -= dt;
  if (this.trailT <= 0) { this.trailT = 0.03; this.trail.push({ x: this.x, y: this.y, f: 1, t: 0 }); }
  for (const t of this.trail) t.t += dt;
  this.trail = this.trail.filter((t) => t.t < 0.22);
};

// ---------------- 降维后的画面 ----------------
function drawShiftView(ctx, g, mode) {
  const W = g.world, cx = Math.round(g.cam.x), cy = Math.round(g.cam.y), t = g.t, cube = mode === 'cube';
  const line = cube ? '#ffffff' : '#39ff8e', dim = cube ? 'rgba(255,255,255,0.08)' : 'rgba(57,255,142,0.08)';
  // 背景
  if (cube) {
    const gr = ctx.createLinearGradient(0, 0, 0, VH); const beat = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 2);
    gr.addColorStop(0, '#0a0f3a'); gr.addColorStop(1, `rgb(${40 + beat * 30},10,${70 + beat * 20})`);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
  } else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH); }
  ctx.strokeStyle = dim; ctx.lineWidth = 1;
  const gs = cube ? 64 : 32;
  for (let x = -((cx * 0.5) % gs); x < VW; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VH); ctx.stroke(); }
  for (let y = -((cy * 0.5) % gs); y < VH; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VW, y); ctx.stroke(); }
  ctx.save(); ctx.translate(-cx, -cy);
  const tx0 = Math.max(0, Math.floor(cx / TILE) - 1), tx1 = Math.min(W.w - 1, Math.floor((cx + VW) / TILE) + 1);
  const ty0 = Math.max(0, Math.floor(cy / TILE) - 1), ty1 = Math.min(W.h - 1, Math.floor((cy + VH) / TILE) + 1);
  ctx.lineWidth = cube ? 2 : 1.5; ctx.strokeStyle = line;
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const c = W.tile(tx, ty), px = tx * TILE, py = ty * TILE;
    if (W.solidAt(tx, ty)) {
      if (cube) { ctx.fillStyle = '#05071c'; ctx.fillRect(px, py, TILE, TILE); }
      ctx.beginPath();
      if (!W.solidAt(tx, ty - 1)) { ctx.moveTo(px, py + 1); ctx.lineTo(px + TILE, py + 1); }
      if (!W.solidAt(tx, ty + 1)) { ctx.moveTo(px, py + TILE - 1); ctx.lineTo(px + TILE, py + TILE - 1); }
      if (!W.solidAt(tx - 1, ty)) { ctx.moveTo(px + 1, py); ctx.lineTo(px + 1, py + TILE); }
      if (!W.solidAt(tx + 1, ty)) { ctx.moveTo(px + TILE - 1, py); ctx.lineTo(px + TILE - 1, py + TILE); }
      ctx.stroke();
      if (cube && !W.solidAt(tx, ty - 1)) { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.strokeRect(px + 7, py + 7, TILE - 14, TILE - 14); ctx.strokeStyle = line; }
    } else if (c === '^' || c === 'v') {
      const up = c === '^', by = up ? py + TILE : py, ty2 = up ? py + 8 : py + TILE - 8;
      ctx.beginPath(); ctx.moveTo(px + 3, by); ctx.lineTo(px + 16, ty2); ctx.lineTo(px + 29, by); ctx.closePath();
      if (cube) { ctx.fillStyle = '#000'; ctx.fill(); }
      ctx.stroke();
    }
  }
  for (const s of W.solids) if (s.active && s.omni) ctx.strokeRect(s.x, s.y, s.w, s.h); // Boss 终局的阶梯平台
  // 物件与敌人：只画轮廓
  for (const pr of g.props) {
    if (pr instanceof ShiftZone) { ctx.strokeStyle = line; ctx.setLineDash([6, 6]); for (const xx of [pr.x0, pr.x1]) { ctx.beginPath(); ctx.moveTo(xx, cy); ctx.lineTo(xx, cy + VH); ctx.stroke(); } ctx.setLineDash([]); continue; }
    if (pr instanceof Chip && !pr.got) { ctx.strokeStyle = '#ffd24a'; ctx.beginPath(); const x = pr.x + 8, y = pr.y + 8 + Math.sin(pr.t * 3) * 3; ctx.moveTo(x, y - 8); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 7, y); ctx.closePath(); ctx.stroke(); continue; }
    if (pr instanceof GravSwitch) { pr.drawShape(ctx, g, line); continue; }
    if (pr instanceof Exit) { ctx.strokeStyle = line; ctx.strokeRect(pr.x + 2, pr.y, 44, 64); ctx.beginPath(); ctx.moveTo(pr.x + 24, pr.y); ctx.lineTo(pr.x + 24, pr.y + 64); ctx.stroke(); continue; }
    if (pr instanceof Checkpoint) { ctx.strokeStyle = line; ctx.strokeRect(pr.x + 4, pr.y + 10, 20, 40); }
  }
  ctx.strokeStyle = cube ? '#ff4a8a' : '#ff5a5a';
  for (const e of g.enemies) if (e.alive && e.w) ctx.strokeRect(e.x, e.y, e.w, e.h);
  // 主角
  const p = g.player;
  if (!p.dead && g.state !== 'dead') {
    if (cube) {
      for (const tr of p.trail) { ctx.globalAlpha = (1 - tr.t / 0.22) * 0.4; ctx.fillStyle = '#4af'; ctx.fillRect(tr.x + p.w / 2 - 8, tr.y + p.h / 2 - 8, 16, 16); }
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(p.cx, p.cy + (p.gd < 0 ? -3 : 3)); ctx.rotate(p.cubeRot);
      ctx.fillStyle = '#ffd24a'; ctx.fillRect(-12, -12, 24, 24); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(-12, -12, 24, 24);
      ctx.fillStyle = '#4af'; ctx.fillRect(-6, -6, 12, 12); ctx.strokeRect(-6, -6, 12, 12);
      ctx.restore();
    } else {
      ctx.save();
      if (p.gd < 0) { ctx.translate(0, 2 * p.cy); ctx.scale(1, -1); }
      ctx.strokeStyle = line; ctx.lineWidth = 1.5;
      const x = p.x, y = p.y, f = p.facing;
      ctx.strokeRect(x + 3, y + 5, 14, 13);           // 躯干
      ctx.strokeRect(x + 4, y - 3, 12, 8);            // 头
      ctx.beginPath(); ctx.moveTo(x + 10 + f * 2, y); ctx.lineTo(x + 10 + f * 7, y); ctx.stroke(); // 目镜
      const ph = p.onGround ? Math.sin(p.run) * 3 : 2;
      ctx.beginPath(); ctx.moveTo(x + 7, y + 18); ctx.lineTo(x + 7 + ph, y + p.h); ctx.moveTo(x + 13, y + 18); ctx.lineTo(x + 13 - ph, y + p.h); ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
  // 标题 + 进度
  const z = g.core && g.core.zones && g.core.zones.find((zz) => p.cx >= zz.x0 && p.cx < zz.x1);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(VW / 2 - 150, VH - 44, 300, 30);
  ctx.fillStyle = line; ctx.font = 'bold 12px ' + MONO; ctx.textAlign = 'center';
  ctx.fillText(cube ? 'DIMENSION SHIFT · ONE-BUTTON MODE' : 'DIMENSION SHIFT · WIREFRAME VISION', VW / 2, VH - 31);
  if (z) { const k = clamp((p.cx - z.x0) / (z.x1 - z.x0), 0, 1); ctx.strokeStyle = line; ctx.strokeRect(VW / 2 - 130, VH - 25, 260, 5); ctx.fillStyle = line; ctx.fillRect(VW / 2 - 130, VH - 25, 260 * k, 5); ctx.font = '10px ' + MONO; ctx.fillText(Math.floor(k * 100) + '%', VW / 2 + 146, VH - 20); }
  ctx.textAlign = 'left';
}

// ============================================================
//  重力开关（一键模式里就是重力传送门）
// ============================================================
class GravSwitch {
  constructor(cx, cy) { this.x = cx * TILE + 4; this.y = cy * TILE - 24; this.w = 24; this.h = 80; this.cd = 0; this.inside = false; this.t = Math.random() * 3; }
  update(dt, g) {
    this.t += dt; this.cd -= dt;
    const on = g.state === 'play' && overlap(g.player, this);
    if (on && !this.inside && this.cd <= 0 && g.core) {
      g.core.toggle(); this.cd = 0.4; Sound.sfx.gswitch();
      g.particles.burst(this.x + 12, this.y + 40, 18, { color: ['#fff', '#e6c56a', g.core.manual < 0 ? '#f35' : '#58f'], smin: 60, smax: 220, lmin: 0.2, lmax: 0.5, add: true });
    }
    this.inside = on;
  }
  // 真正的开关：代码光环每秒闪 2 次；伪造者只有它的一半
  drawShape(ctx, g, line, slow) {
    const x = this.x + 12, y = this.y + 40, bob = Math.sin(this.t * 2) * 3, up = g.core ? g.core.manual > 0 : true;
    ctx.strokeStyle = line || '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y - 20 + bob); ctx.lineTo(x + 10, y + bob); ctx.lineTo(x, y + 20 + bob); ctx.lineTo(x - 10, y + bob); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); if (up) { ctx.moveTo(x - 5, y + 3 + bob); ctx.lineTo(x, y - 5 + bob); ctx.lineTo(x + 5, y + 3 + bob); } else { ctx.moveTo(x - 5, y - 3 + bob); ctx.lineTo(x, y + 5 + bob); ctx.lineTo(x + 5, y - 3 + bob); } ctx.stroke();
    const blink = ((g.t * (slow ? 2 : 4)) % 2) < 1;
    if (blink) { ctx.strokeStyle = 'rgba(230,197,106,0.9)'; ctx.beginPath(); ctx.ellipse(x, y + bob, 16, 5, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  draw(ctx, g) {
    const x = this.x + 12, y = this.y + 40;
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(x, y, 2, x, y, 36); gr.addColorStop(0, 'rgba(255,240,200,0.35)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = gr; ctx.fillRect(x - 36, y - 36, 72, 72);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(240,238,230,0.18)'; ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x + 10, y); ctx.lineTo(x, y + 20); ctx.lineTo(x - 10, y); ctx.closePath(); ctx.fill();
    this.drawShape(ctx, g, '#f4f2ea');
  }
}
PROP_FACTORIES.G = (x, y) => new GravSwitch(x, y);

// ============================================================
//  敌人
// ============================================================

// ---------------- 1. 磁轨浮空姬：重力正常时倒挂天花板向下射击；重力反转时坠落到地面巡逻 ----------------
class MagDrifter {
  constructor(cx, cy, world) {
    this.w = 26; this.h = 18; this.x = cx * TILE + 3; this.alive = true; this.colors = ['#e8e6de', '#e6c56a', '#f35'];
    let top = cy; while (top > 0 && !world.solidAt(cx, top - 1)) top--;
    let bot = cy; while (bot < world.h - 1 && !world.solidAt(cx, bot + 1)) bot++;
    this.ceilY = top * TILE; this.floorY = (bot + 1) * TILE - this.h;
    this.y = this.ceilY; this.vy = 0; this.vx = 60; this.side = 'ceil'; this.transit = false; this.shotT = 1 + Math.random(); this.t = Math.random() * 5;
  }
  update(dt, g) {
    const W = g.world, gd = g.core ? g.core.gd : 1, want = gd > 0 ? 'ceil' : 'floor', p = g.player; this.t += dt;
    if (want !== this.side) { this.side = want; this.transit = true; this.vy = 0; }
    const ty = this.side === 'ceil' ? this.ceilY : this.floorY;
    if (this.transit) {
      const dir = Math.sign(ty - this.y); this.vy += dir * 2600 * dt; this.y += this.vy * dt;
      if ((dir > 0 && this.y >= ty) || (dir < 0 && this.y <= ty) || dir === 0) { this.y = ty; this.vy = 0; this.transit = false; }
    }
    if (!this.transit) {
      // 贴着天花板 / 地面左右移动，遇到边缘或墙就掉头
      const speed = this.side === 'ceil' ? (Math.abs(p.cx - (this.x + 13)) < 220 ? 45 * Math.sign(p.cx - (this.x + 13)) : this.vx * 0.5) : this.vx;
      const nx = this.x + speed * dt, edgeX = speed > 0 ? nx + this.w + 2 : nx - 2;
      const supY = this.side === 'ceil' ? this.y - 2 : this.y + this.h + 2;
      if (!W.supportAt(edgeX, supY) || W.pointSolid(edgeX, this.y + this.h / 2)) this.vx = -this.vx; else this.x = nx;
      // 天花板上朝下打；落到地面后朝上打（重力反转后的天花板也不安全）。每隔一轮是扇形三连发
      const ceil = this.side === 'ceil';
      if (g.state === 'play' && Math.abs(p.cx - (this.x + 13)) < 260 && (ceil ? p.cy > this.y : p.cy < this.y)) {
        this.shotT -= dt;
        if (this.shotT <= 0) {
          this.shotT = 1.4; this.volley = (this.volley || 0) + 1;
          const sy = ceil ? this.y + this.h : this.y, dir = ceil ? 1 : -1;
          for (const vx of this.volley % 2 ? [0] : [-110, 0, 110]) g.projectiles.push(new MagShot(this.x + 13, sy, vx, dir * 420));
          Sound.sfx.magShot();
        }
      }
    }
  }
  touch(p, g) {
    if (this.transit || stomp4(p, this, 12)) { g.killEnemy(this); g.stompBounce(); if (this.transit && !g.magHinted) { g.magHinted = true; g.toastHint('在它坠落的途中撞上去，就能踩碎它'); } }
    else g.killPlayer();
  }
  draw(ctx, g) {
    const x = this.x + 13, flip = this.side === 'ceil' && !this.transit ? -1 : 1, y = this.y + this.h / 2;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, flip);
    ctx.fillStyle = '#e8e6de'; ctx.beginPath(); ctx.moveTo(-13, 4); ctx.lineTo(-8, -8); ctx.lineTo(8, -8); ctx.lineTo(13, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a2a2e'; ctx.fillRect(-10, 4, 20, 5);
    ctx.fillStyle = '#e6c56a'; ctx.fillRect(-13, 7, 26, 2); // 磁轨
    ctx.fillStyle = this.transit ? '#fff' : '#f35'; ctx.fillRect(-2, -4, 4, 3);
    ctx.restore();
    if (this.transit) { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.moveTo(x, this.y - this.vy * 0.05); ctx.lineTo(x, this.y); ctx.stroke(); }
  }
}
class MagShot {
  constructor(x, y, vx, vy) { this.x = x; this.y = y; this.vx = vx || 0; this.vy = vy || 420; this.dead = false; this.t = 0; }
  update(dt, g) {
    this.x += this.vx * dt; this.y += this.vy * dt; this.t += dt;
    if (this.t > 0.1 && g.world.pointSolid(this.x, this.y)) { this.dead = true; return; }
    if (this.t > 3) { this.dead = true; return; }
    if (g.world.pointSolid(this.x, this.y) || this.y > g.world.ph) { this.dead = true; g.particles.burst(this.x, this.y, 5, { color: ['#f35', '#fff'], shape: 'spark', smin: 40, smax: 120, lmin: 0.1, lmax: 0.2, add: true }); return; }
    if (g.state === 'play' && Math.abs(g.player.cx - this.x) < 9 && Math.abs(g.player.cy - this.y) < 15) { this.dead = true; g.killPlayer('shot'); }
  }
  defuse(g) { this.dead = true; Sound.sfx.block(); }
  draw(ctx) { ctx.fillStyle = '#f35'; ctx.fillRect(this.x - 2, this.y - 8, 4, 12); ctx.fillStyle = '#fff'; ctx.fillRect(this.x - 1, this.y, 2, 4); }
}

// ---------------- 2. 维度撕裂者：画出发光的「切线向量」，2 秒后变成实体激光（瞄准你接下来的位置） ----------------
const VEC_T = 2;
class VectorShredder {
  constructor(cx, cy) { this.ax = cx * TILE + 16; this.ay = cy * TILE + 16; this.w = 30; this.h = 30; this.x = this.ax - 15; this.y = this.ay - 15; this.t = Math.random() * 2; this.cd = 1.5 + Math.random(); this.vecs = []; this.alive = true; this.colors = ['#e6c56a', '#fff6d8']; }
  update(dt, g) {
    const p = g.player; this.t += dt;
    this.x = this.ax - 15 + Math.sin(this.t * 0.8) * 20; this.y = this.ay - 15 + Math.sin(this.t * 1.3) * 10;
    for (const v of this.vecs) {
      v.t += dt;
      if (v.t >= VEC_T && !v.fired) { v.fired = true; Sound.sfx.vectorFire(); g.shake(2); }
      if (v.fired && g.state === 'play' && segHitsRect(v, p.hurt())) g.killPlayer('laser');
    }
    this.vecs = this.vecs.filter((v) => v.t < VEC_T + 0.8);
    const near = Math.abs(p.cx - this.ax) < 560 && Math.abs(p.cy - this.ay) < 400;
    this.cd -= dt;
    if (near && this.cd <= 0 && g.state === 'play') {
      this.cd = 3; Sound.sfx.vector();
      const angs = [0, Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4].sort(() => Math.random() - 0.5);
      const ax = p.cx + clamp(p.vx, -300, 300) * 0.6, ay = p.cy; // 预判你的走位
      for (let i = 0; i < 3; i++) {
        const a = angs[i] + rand(-0.12, 0.12), mx = ax + rand(-50, 50), my = ay + rand(-40, 40), L = 300;
        this.vecs.push({ x1: mx - Math.cos(a) * L, y1: my - Math.sin(a) * L, x2: mx + Math.cos(a) * L, y2: my + Math.sin(a) * L, t: 0, fired: false });
      }
    }
  }
  touch(p, g) { if (stomp4(p, this, 12)) { g.killEnemy(this); g.stompBounce(); } else g.killPlayer(); }
  draw(ctx, g) {
    for (const v of this.vecs) {
      if (!v.fired) {
        const k = v.t / VEC_T;
        ctx.strokeStyle = `rgba(230,197,106,${0.25 + k * 0.5})`; ctx.lineWidth = 1 + k; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -g.t * 30;
        ctx.beginPath(); ctx.moveTo(v.x1, v.y1); ctx.lineTo(v.x2, v.y2); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
        ctx.fillStyle = 'rgba(255,240,200,0.9)'; ctx.beginPath(); ctx.arc(lerp(v.x1, v.x2, k), lerp(v.y1, v.y2, k), 3, 0, 7); ctx.fill(); // 描线进度
      } else {
        const a = Math.min(1, (VEC_T + 0.8 - v.t) * 3);
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,210,110,${0.35 * a})`; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(v.x1, v.y1); ctx.lineTo(v.x2, v.y2); ctx.stroke();
        ctx.strokeStyle = `rgba(255,250,230,${a})`; ctx.lineWidth = 3; ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    const x = this.x + 15, y = this.y + 15, r = this.t * 0.9;
    ctx.strokeStyle = '#e6c56a'; ctx.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 5; i++) { const a = r * (k % 2 ? -1 : 1) + i * Math.PI * 2 / 5 + k; const rr = 14 - k * 3; i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      ctx.stroke();
    }
    ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
  }
}
function segHitsRect(v, r) {
  const n = Math.ceil(Math.hypot(v.x2 - v.x1, v.y2 - v.y1) / 6);
  for (let i = 0; i <= n; i++) { const x = lerp(v.x1, v.x2, i / n), y = lerp(v.y1, v.y2, i / n); if (x > r.x - 3 && x < r.x + r.w + 3 && y > r.y - 3 && y < r.y + r.h + 3) return true; }
  return false;
}

// ---------------- 3. 格式化追踪者：无法攻击，缓慢而坚定地漂向你；被它完全重合 → 拉撒路协议断网 5 秒 ----------------
class PingTracker {
  constructor(cx, cy) { this.ox = cx * TILE + 16; this.oy = cy * TILE + 16; this.px = this.ox; this.py = this.oy; this.w = 24; this.h = 24; this.x = this.px - 12; this.y = this.py - 12; this.alive = true; this.t = 0; this.rest = 0; this.colors = ['#fff']; }
  update(dt, g) {
    const p = g.player; this.t += dt;
    if (this.rest > 0) { this.rest -= dt; if (this.rest <= 0) { this.px = this.ox; this.py = this.oy; } }
    else if (g.state === 'play') {
      const dx = p.cx - this.px, dy = p.cy - this.py, d = Math.hypot(dx, dy);
      if (d < 900) { this.px += dx / (d || 1) * C4.TRACK_SPEED * dt; this.py += dy / (d || 1) * C4.TRACK_SPEED * dt; }
      if (d < 12 && g.core) {
        g.core.offlineT = C4.OFFLINE; this.rest = 2.5; Sound.sfx.offline(); g.shake(6); g.flash(0.4, '#f33');
        if (!g.pingHinted) { g.pingHinted = true; g.toastHint('断网！5 秒内冲刺失灵、重力倒计时丢失——小心'); }
      }
      if (d < 200 && Math.floor(this.t * 1.5) !== Math.floor((this.t - dt) * 1.5)) Sound.sfx.ping();
    }
    this.x = this.px - 12; this.y = this.py - 12;
  }
  touch() {}
  onStrike() { return 'none'; }
  draw(ctx, g) {
    if (this.rest > 0) return;
    const x = this.px, y = this.py;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { const k = ((this.t * 0.8 + i / 3) % 1); ctx.strokeStyle = `rgba(255,255,255,${0.4 * (1 - k)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 6 + k * 40, 0, Math.PI * 2); ctx.stroke(); }
    const a = this.t * 3; ctx.strokeStyle = 'rgba(255,90,90,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '8px ' + MONO; ctx.textAlign = 'center'; ctx.fillText('PING', x, y - 16); ctx.textAlign = 'left';
  }
}

// ---------------- 4. 逻辑奇点：每 3.5 秒爆发一次排斥力或吸引力（交替），本身不伤人——但总被放在尖刺和深坑旁边 ----------------
//  （力度保持原样：离它 3 格以内时吸引比你跑得快；再远一些就能跑开）
const SING_T = 3.5;
class LogicSingularity {
  constructor(cx, cy) { this.cx = cx * TILE + 16; this.cy = cy * TILE + 16; this.w = 30; this.h = 30; this.x = this.cx - 15; this.y = this.cy - 15; this.t = Math.random() * 2; this.push = Math.random() < 0.5; this.active = 0; this.alive = true; this.R = 300; this.colors = ['#fff']; }
  update(dt, g) {
    this.t += dt;
    if (this.t >= SING_T) { this.t = 0; this.push = !this.push; this.active = 1.3; if (Math.abs(g.player.cx - this.cx) < 700) Sound.sfx.singularity(this.push); g.particles.add({ x: this.cx, y: this.cy, size: 10, grow: this.push ? 500 : -60, life: 0.4, shape: 'ring', color: '#fff', add: true }); }
    if (this.active > 0) {
      this.active -= dt;
      const p = g.player, dx = p.cx - this.cx, dy = p.cy - this.cy, d = Math.hypot(dx, dy);
      if (g.state === 'play' && d < this.R && d > 4) {
        const k = (1 - d / this.R) * 0.8 + 0.2, s = this.push ? 1 : -1;
        g.world.moveX(p, s * dx / d * 330 * k * dt);
        p.vy += s * dy / d * 1500 * k * dt;
      }
    }
  }
  touch() {}
  onStrike() { return 'none'; }
  draw(ctx, g) {
    const x = this.cx, y = this.cy, warn = this.t > SING_T - 1.2, pushNext = !this.push;
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(x, y, 2, x, y, 40); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(x - 40, y - 40, 80, 80);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) { const a = g.t * (pushNext ? -2 : 2) + i * Math.PI / 2; ctx.beginPath(); ctx.arc(x, y, 18, a, a + 1.1); ctx.stroke(); }
    if (warn) { const k = (this.t - (SING_T - 1.2)) / 1.2, r = pushNext ? 20 + k * 90 : 110 - k * 90; ctx.strokeStyle = `rgba(255,255,255,${0.3 + 0.5 * k})`; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    if (this.active > 0) { ctx.strokeStyle = `rgba(255,255,255,${this.active * 0.35})`; ctx.lineWidth = 2; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + g.t, r1 = 40, r2 = 40 + 40 * this.active; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); ctx.stroke(); } }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = 'bold 9px ' + FONT; ctx.textAlign = 'center';
    ctx.fillText(warn ? (pushNext ? '排斥 ◀▶' : '吸引 ▶◀') : '', x, y - 28); ctx.textAlign = 'left';
  }
}

// ---------------- 5. 协议伪造者：伪装成存档点 / 重力开关；靠近就张嘴撕咬，还会扑出去追咬一小段。破绽：闪烁频率慢半拍 ----------------
//  普通及以上难度没有存档点，伪装成存档点一眼就会被看穿——改为伪装成记忆芯片（漂浮和摆动都慢半拍）
class ProtocolMimic {
  constructor(cx, cy, kind) {
    if (kind === 'checkpoint' && typeof Game !== 'undefined' && Game.diff && Game.diff !== 'easy') kind = 'chip';
    this.kind = kind; this.alive = true; this.state = 'hide'; this.t = 0; this.colors = ['#e8e6de', '#f35', '#e6c56a'];
    if (kind === 'checkpoint') { this.x = cx * TILE + 2; this.y = cy * TILE - 18; this.w = 28; this.h = 50; }
    else if (kind === 'chip') { this.x = cx * TILE + 2; this.y = cy * TILE + 4; this.w = 28; this.h = 28; this.cx0 = cx; this.cy0 = cy; }
    else { this.sw = new GravSwitch(cx, cy); this.x = this.sw.x; this.y = this.sw.y + 16; this.w = 24; this.h = 48; }
    this.x0 = this.x;
  }
  bite() { return { x: this.x - 16, y: this.y - 18, w: this.w + 32, h: this.h + 30 }; }
  update(dt, g) {
    const p = g.player; this.t += dt; if (this.sw) this.sw.t += dt;
    const near = Math.abs(p.cx - (this.x + this.w / 2)) < 70 && Math.abs(p.cy - (this.y + this.h / 2)) < 60;
    if (this.state === 'hide' && near && g.state === 'play') { this.state = 'reveal'; this.t = 0; Sound.sfx.reveal(); }
    else if (this.state === 'reveal' && this.t > 0.25) { this.state = 'bite'; this.t = 0; Sound.sfx.mimicBite(); g.shake(4); }
    else if (this.state === 'bite') {
      // 张嘴的同时朝你扑过去（最多离开原位 3 格，不会扑进墙里或扑下悬崖）
      const dir = Math.sign(p.cx - (this.x + this.w / 2)), nx = this.x + dir * 380 * dt, W = g.world;
      const lead = dir > 0 ? nx + this.w : nx, footY = this.kind === 'switch' ? null : this.y + this.h + 4;
      if (dir && Math.abs(nx - this.x0) <= 96 && !W.pointSolid(lead, this.y + this.h / 2) && (footY == null || W.supportAt(lead, footY))) this.x = nx;
      if (g.state === 'play' && overlap(p.hurt(), this.bite())) g.killPlayer('bite');
      if (this.t > 0.45) { this.state = 'rest'; this.t = 0; }
    } else if (this.state === 'rest') {
      this.x = approach(this.x, this.x0, 120 * dt); // 慢慢退回原位
      if (this.t > 1.2 && !near) { this.state = 'hide'; this.t = 0; this.x = this.x0; }
      else if (this.t > 1.0 && near && g.state === 'play') { this.state = 'reveal'; this.t = 0; Sound.sfx.reveal(); } // 你还在附近：再咬一次
    }
    if (this.state !== 'hide' && !g.mimicHinted) { g.mimicHinted = true; g.toastHint(this.kind === 'chip' ? '协议伪造者！假芯片漂浮和摆动都比真的慢半拍' : '协议伪造者！它身上的代码比真的机关闪得慢半拍'); }
  }
  touch(p, g) { if (stomp4(p, this, 12)) { g.killEnemy(this); g.stompBounce(); } }
  draw(ctx, g) {
    const open = this.state === 'hide' ? 0 : this.state === 'reveal' ? this.t / 0.25 : this.state === 'bite' ? 1 : 0.4;
    const slowG = { t: g.t * 0.5 }; // 破绽：闪烁频率慢半拍
    if (this.kind === 'chip' && open < 0.05) { Chip.prototype.draw.call({ x: this.cx0 * TILE + 8, y: this.cy0 * TILE + 8, got: false, t: g.t * 0.5 }, ctx); return; }
    if (this.kind === 'checkpoint' || this.kind === 'chip') {
      if (this.kind === 'checkpoint' && open < 0.05) { Checkpoint.prototype.draw.call({ x: this.x, y: this.y, active: false, t: 0 }, ctx, slowG); return; }
      const sc = this.kind === 'chip' ? 0.6 : 1, x = this.x, y = this.y, cx = x + 14;
      ctx.save(); ctx.translate(cx, y + (this.kind === 'chip' ? 16 : 26)); ctx.scale(sc, sc);
      for (const s of [-1, 1]) { // 上下颚
        ctx.save(); ctx.rotate(s * open * 0.7);
        ctx.fillStyle = '#4a463c'; ctx.fillRect(-14, s > 0 ? 0 : -26, 28, 26);
        ctx.fillStyle = '#e8e6de'; for (let i = -12; i < 13; i += 5) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 2.5, s * -7); ctx.lineTo(i + 5, 0); ctx.fill(); }
        ctx.restore();
      }
      ctx.fillStyle = '#f35'; ctx.fillRect(-6, -18, 4, 4); ctx.fillRect(2, -18, 4, 4);
      ctx.restore();
    } else {
      if (open < 0.05) { this.sw.drawShape(ctx, g, '#f4f2ea', true); return; }
      const x = this.x + 12, y = this.y + 24;
      ctx.fillStyle = '#2a0a10'; ctx.beginPath(); ctx.ellipse(x, y, 12 + open * 8, 6 + open * 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#f4f2ea'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#f4f2ea'; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * 4 - 2, y - 6 - open * 10); ctx.lineTo(x + i * 4, y - open * 4); ctx.lineTo(x + i * 4 + 2, y - 6 - open * 10); ctx.fill(); }
      ctx.fillStyle = '#f35'; ctx.fillRect(x - 3, y - 2, 6, 3);
    }
  }
}

// 地图字符 → 敌人
const _makeEnemyCh3 = makeEnemy;
makeEnemy = function (s, world) { // eslint-disable-line no-func-assign
  switch (s.type) {
    case 'R': return new MagDrifter(s.cx, s.cy, world);
    case 'J': return new VectorShredder(s.cx, s.cy);
    case 'P': return new PingTracker(s.cx, s.cy);
    case 'O': return new LogicSingularity(s.cx, s.cy);
    case 'Q': return new ProtocolMimic(s.cx, s.cy, 'checkpoint');
    case 'q': return new ProtocolMimic(s.cx, s.cy, 'switch');
    default: return _makeEnemyCh3(s, world);
  }
};

// ============================================================
//  最终 Boss：神性通用智能 · Omni-Mind（万脑）
//  第一阶段（数据压迫）：全屏激光栅格 / 高低双激光 / 金色数据块坠落；每两轮（之后三轮）攻击后巨眼降下暴露，可以攻击或撞击
//    · 每次暴露最多打掉 15 点，至少要三次暴露；第二次起攻击会叠加落块、预警缩短；暴露时巨眼周期放出一圈回放弹
//  第二阶段（重构暴走）：强制重力反转、剥夺攻击键、真相揭晓；跳跃撞碎场上 4 个「反叛人类核心」
//    · 核心按顺序亮起，只有亮着的能撞碎；每撞碎一个，重力短暂恢复再翻回去；横扫与回放弹随核心减少而加快
//  第三阶段（拉撒路终局）：全场陷入黑暗，Boss 血量无限。沿着平台跳向巨眼核心——触碰即启动自毁
//    · 平台踩上去 1.2 秒后崩塌（4 秒后重建）；横扫更频繁、预警更短（预警画在黑暗之上）
//  死亡后从当前阶段重来（g.bossSave）
// ============================================================
const OMNI = { X: 480, L: 32, R: 928, FLOOR: 480, CEIL: 64 };
const OMNI_CORES = [[150, 172], [380, 246], [590, 166], [820, 240]];
const OMNI_PLATS = [[64, 400, 96], [176, 330, 96], [288, 260, 96], [416, 200, 128], [576, 260, 96], [688, 330, 96], [800, 400, 96]];
class OmniMind {
  constructor(g, short) {
    const ph = (g.bossSave && g.bossSave.phase) || 1;
    this.maxHp = 100; this.hp = [100, 60, 20][ph - 1]; this.phaseN = ph; this.short = short;
    this.state = 'intro'; this.t = 0; this.x = OMNI.X; this.eyeY = -160; this.targetY = 150; this.open = 0.25; this.look = 0;
    this.flash = 0; this.touchCd = 0; this.dead = false; this.hz = []; this.atkT = 1.4; this.cycles = 0; this.last = '';
    this.cores = []; this.dark = ph === 3 ? 1 : 0; this.shotT = 2.2; this.sweepT = 2.5; this.plats = [];
    this.expN = 0; this.expFloor = 60; this.ringT = 0; this.flipBack = 0; this.firstCap = true;
    this.title = '神性通用智能 · Omni-Mind（万脑）'; this.marks = [0.6, 0.2];
    g.world.solids = g.world.solids.filter((s) => !s.omni);
    if (g.core) g.core.forceGd = ph === 2 ? -1 : 1;
    g.noAttack = ph >= 2;
    if (ph === 2) this.makeCores();
    if (ph === 3) { this.makePlats(g); this.hp = this.maxHp; this.targetY = 110; }
  }
  get active() { return !['finale', 'dying', 'dead'].includes(this.state); }
  get waveInfo() {
    if (this.state === 'expose') return `巨眼暴露 · 攻击！ ${Math.max(0, 4 - this.t).toFixed(1)}s`;
    if (this.state === 'p1') return '数据压迫';
    if (this.state === 'p2' || this.state === 'trans2') return `反叛人类核心  ${this.cores.filter((c) => !c.alive).length} / 4`;
    if (this.state === 'p3' || this.state === 'trans3' || this.state === 'finale') return 'HP ∞ · 启动自毁代码';
    return '';
  }
  eyeRect() { const r = this.phaseN === 3 ? 40 : 44; return { x: this.x - r, y: this.eyeY - r, w: r * 2, h: r * 2 }; }
  body() { return this.eyeRect(); }
  stopSounds() {}
  makeCores() { this.cores = OMNI_CORES.map(([x, y], i) => ({ x, y, alive: true, i, t: i })); this.lit = 0; }
  // 按顺序亮起：只有亮着的核心能撞碎
  litCore() { return this.cores.find((c) => c.alive); }
  get broken() { return this.cores.filter((c) => !c.alive).length; }
  makePlats(g) {
    this.plats = OMNI_PLATS.map(([x, y, w]) => ({ x, y, w, h: 16, active: true, oneWay: true, omni: true, crumble: 0, down: 0 }));
    for (const s of this.plats) g.world.solids.push(s);
  }
  // ---------------- 攻击 ----------------
  beam(rects, tele, fire) { this.hz.push({ kind: 'beam', rects, tele, fire, t: 0, fired: false }); }
  pattern(g) {
    const p = g.player, opts = ['grid', 'lowhigh', 'rain'].filter((k) => k !== this.last), k = pick(opts); this.last = k;
    const hard = this.expN > 0; // 第一次暴露之后：预警更短，激光和落块叠加
    Sound.sfx.omniCharge();
    if (k === 'grid') {
      // 全屏竖向激光栅格，留两道 3 格宽的缝隙（其中一道离你不远）
      const pt = clamp(Math.floor(p.cx / TILE) + randi(-5, 5), 2, 24), safe = new Set();
      let other = randi(2, 24); while (Math.abs(other - pt) < 7) other = randi(2, 24);
      for (const s of [pt, other]) for (let i = 0; i < 3; i++) safe.add(s + i);
      const rects = []; let run = -1;
      for (let tx = 1; tx <= 29; tx++) {
        const hot = tx < 29 && !safe.has(tx);
        if (hot && run < 0) run = tx;
        if (!hot && run >= 0) { rects.push({ x: run * TILE, y: OMNI.CEIL, w: (tx - run) * TILE, h: OMNI.FLOOR - OMNI.CEIL }); run = -1; }
      }
      this.beam(rects, hard ? 1.05 : 1.3, 0.6);
      if (hard && Math.random() < 0.5) this.rain(g, 3, 0.5);
    } else if (k === 'lowhigh') {
      // 贴地的低激光（要跳）+ 有时再加一道高激光（不能跳太高）
      const rects = [{ x: OMNI.L, y: OMNI.FLOOR - 20, w: OMNI.R - OMNI.L, h: 12 }];
      if (Math.random() < 0.6) rects.push({ x: OMNI.L, y: OMNI.FLOOR - 150, w: OMNI.R - OMNI.L, h: 12 });
      this.beam(rects, hard ? 0.9 : 1.1, 0.35);
      if (hard && Math.random() < 0.6) this.rain(g, 3, 0.2);
    } else this.rain(g, hard ? 8 : 6, 0);
  }
  // 金色数据块坠落（n 块，其中一定有一块落向你）
  rain(g, n, delay) {
    const p = g.player, xs = [];
    while (xs.length < n) { const x = randi(2, 27) * TILE; if (xs.every((o) => Math.abs(o - x) > 80)) xs.push(x); }
    if (!xs.some((x) => Math.abs(x + 20 - p.cx) < 50)) xs[0] = clamp(p.cx - 20, 40, 880);
    xs.forEach((x, i) => this.hz.push({ kind: 'block', x, y: OMNI.CEIL, vy: 0, tele: delay + 0.9 + i * 0.12, t: 0 }));
  }
  // 暴露时：巨眼放出一圈慢速回放弹（每圈错开角度，缝隙足够钻过去）
  ring(g) {
    const n = 8, a0 = this.ringN++ * 0.39;
    for (let i = 0; i < n; i++) { const a = a0 + i * Math.PI * 2 / n; g.projectiles.push(new ReplayOrb(this.x + Math.cos(a) * 56, this.eyeY + Math.sin(a) * 56, Math.cos(a) * 120, Math.sin(a) * 120)); }
    Sound.sfx.throw(); this.flash = 0.1;
  }
  updHazard(h, dt, g) {
    h.t += dt; const p = g.player;
    if (h.kind === 'beam') {
      if (h.t >= h.tele && !h.fired) { h.fired = true; Sound.sfx.omniLaser(); g.shake(4); }
      if (h.fired && g.state === 'play' && h.rects.some((r) => overlap(p.hurt(), r))) g.killPlayer('laser');
      if (h.t >= h.tele + h.fire) h.dead = true;
    } else if (h.t >= h.tele) {
      h.vy = Math.min(h.vy + 2800 * dt, 1100); h.y += h.vy * dt;
      if (g.state === 'play' && overlap(p.hurt(), { x: h.x + 4, y: h.y + 4, w: 32, h: 32 })) g.killPlayer('block');
      if (h.y + 40 >= OMNI.FLOOR) { h.dead = true; Sound.sfx.rock(); g.shake(3); g.particles.burst(h.x + 20, OMNI.FLOOR - 4, 10, { color: ['#e6c56a', '#fff6d8'], shape: 'shard', smin: 60, smax: 220, grav: 900, lmin: 0.3, lmax: 0.7, szmin: 2, szmax: 5 }); }
    }
  }
  sweepCeil(g) { // 第二阶段：沿着「天花板地面」的横扫，跳（往下）躲开；有时只扫一半
    const half = Math.random() < 0.45 ? (Math.random() < 0.5 ? 'L' : 'R') : null;
    const x = half === 'R' ? OMNI.X : OMNI.L, w = half ? OMNI.X - OMNI.L : OMNI.R - OMNI.L;
    this.beam([{ x, y: OMNI.CEIL + 8, w, h: 12 }], 0.85, 0.4); Sound.sfx.omniCharge();
  }
  sweepTier(g) { // 第三阶段：在某一层平台的高度横扫（优先扫你所在的那一层附近）
    const tiers = [OMNI.FLOOR, 400, 330, 260, 200], p = g.player;
    const near = tiers.filter((y) => Math.abs(y - (p.y + p.h)) < 110), y = near.length && Math.random() < 0.7 ? pick(near) : pick(tiers);
    this.beam([{ x: OMNI.L, y: y - 26, w: OMNI.R - OMNI.L, h: 12 }], 1.1, 0.5); Sound.sfx.omniCharge();
  }
  // 第三阶段：站上去的平台很快崩塌，过一会儿重建
  updPlats(dt, g) {
    const p = g.player;
    for (const s of this.plats) {
      if (!s.active) { s.down -= dt; if (s.down <= 0) { s.active = true; s.crumble = 0; g.particles.burst(s.x + s.w / 2, s.y + 4, 10, { color: ['#e6c56a', '#fff6d8'], smin: 20, smax: 90, lmin: 0.2, lmax: 0.5, add: true }); } continue; }
      const on = g.state === 'play' && p.onGround && p.x + p.w > s.x && p.x < s.x + s.w && Math.abs(p.y + p.h - s.y) < 4;
      if (on || s.crumble > 0) s.crumble += dt;
      if (s.crumble > 1.2) {
        s.active = false; s.down = 4; s.crumble = 0; Sound.sfx.crumble();
        g.particles.burst(s.x + s.w / 2, s.y + 4, 18, { color: ['#d8d6ce', '#e6c56a'], shape: 'shard', smin: 40, smax: 160, grav: 900, lmin: 0.4, lmax: 0.9, szmin: 2, szmax: 5 });
      }
    }
  }
  // ---------------- 流程 ----------------
  update(dt, g) {
    this.t += dt; this.flash = Math.max(0, this.flash - dt); this.touchCd -= dt;
    const p = g.player, play = g.state === 'play';
    for (const h of this.hz) this.updHazard(h, dt, g);
    this.hz = this.hz.filter((h) => !h.dead);
    this.eyeY = lerp(this.eyeY, this.targetY, Math.min(1, dt * 2.5));
    this.look = approach(this.look, clamp((p.cx - this.x) / 300, -1, 1), dt * 2);
    for (const c of this.cores) c.t += dt;
    switch (this.state) {
      case 'intro':
        if (this.t > (this.short ? 0.8 : 2.4)) {
          if (!this.short) g.say(RADIO.omniIntro);
          Sound.sfx.roar(); g.shake(12); this.state = 'p' + this.phaseN; this.t = 0;
          if (this.phaseN === 3) Sound.music('void');
        }
        break;
      case 'p1':
        this.targetY = 150; this.open = approach(this.open, 0.35, dt);
        if (!play || this.hz.length) break;
        this.atkT -= dt;
        if (this.atkT <= 0) {
          if (this.cycles >= (this.expN ? 3 : 2)) { this.state = 'expose'; this.t = 0; this.cycles = 0; this.expFloor = Math.max(60, this.hp - 15); this.ringT = 1.0; this.ringN = 0; Sound.sfx.recharge(); }
          else { this.pattern(g); this.cycles++; this.atkT = 0.7; }
        }
        break;
      case 'expose':
        this.targetY = 318; this.open = approach(this.open, 1, dt * 3);
        if (play) { this.ringT -= dt; if (this.ringT <= 0) { this.ringT = 1.2; this.ring(g); } }
        if (this.t > 4) this.endExpose();
        break;
      case 'trans2':
        this.targetY = 150; this.open = approach(this.open, 0.6, dt);
        if (Math.random() < 0.3) g.particles.add({ x: rand(40, 920), y: rand(80, 470), vx: 0, vy: rand(-200, -60), life: 0.6, size: 2, color: '#f35', add: true });
        if (this.t > 1.6 && !this.cores.length) {
          g.core.forceGd = -1; g.noAttack = true; g.bossSave = { phase: 2 }; this.phaseN = 2; this.makeCores();
          Sound.sfx.gflip(); g.shake(14); g.flash(0.8, '#f35');
        }
        if (this.t > 2.4) { this.state = 'p2'; this.t = 0; }
        break;
      case 'p2':
        this.targetY = 380; this.open = approach(this.open, 0.7, dt);
        if (!play) break;
        if (this.flipBack > 0) { // 撞碎核心后重力短暂恢复，随后再次被强制反转
          const prev = this.flipBack; this.flipBack -= dt;
          if (Math.floor(prev * 4) !== Math.floor(this.flipBack * 4) && this.flipBack < 0.8) Sound.sfx.gwarn();
          if (this.flipBack <= 0) g.core.forceGd = -1;
        }
        const k = this.broken;
        this.sweepT -= dt; if (this.sweepT <= 0 && !this.hz.length) { this.sweepT = 2.8 - k * 0.3; this.sweepCeil(g); }
        this.shotT -= dt;
        if (this.shotT <= 0) {
          this.shotT = 2.0 - k * 0.15; const a = Math.atan2(p.cy - this.eyeY, p.cx - this.x), sp = 190 + k * 15;
          g.projectiles.push(new ReplayOrb(this.x + Math.cos(a) * 40, this.eyeY + Math.sin(a) * 40, Math.cos(a) * sp, Math.sin(a) * sp)); Sound.sfx.throw();
        }
        break;
      case 'trans3':
        this.dark = Math.min(1, this.t / 2); this.hz = []; g.projectiles = [];
        if (this.t > 2.6) { this.state = 'p3'; this.t = 0; this.makePlats(g); this.hp = this.maxHp; this.targetY = 110; this.sweepT = 4; }
        break;
      case 'p3':
        this.open = approach(this.open, 1, dt); this.targetY = 110;
        if (!play) break;
        this.updPlats(dt, g);
        this.sweepT -= dt; if (this.sweepT <= 0 && !this.hz.length) { this.sweepT = 3.0; this.sweepTier(g); }
        break;
      case 'finale':
        p.vx = 0; p.vy = 0;
        if (Math.random() < 0.8) { const a = rand(0, Math.PI * 2), r = rand(60, 140); g.particles.add({ x: p.cx + Math.cos(a) * r, y: p.cy + Math.sin(a) * r, vx: -Math.cos(a) * r * 1.6, vy: -Math.sin(a) * r * 1.6, life: 0.6, size: 3, color: pick(['#fff', '#7ff', '#ffd070']), add: true }); }
        if (Math.floor(this.t) !== Math.floor(this.t - dt) && this.t < 3.6) { Sound.sfx.selfDestruct(); g.shake(4 + this.t * 3); }
        if (this.t > 3.6) {
          this.state = 'dying'; this.t = 0; p.dead = true;
          Sound.sfx.bigExplode(); Sound.sfx.explode(); g.flash(1.4, '#fff'); g.shake(30); Input.rumble(1, 1, 1200);
          g.particles.burst(this.x, this.eyeY, 120, { color: ['#fff', '#ffd070', '#7ff', '#f35'], shape: 'shard', smin: 150, smax: 700, grav: 500, lmin: 1, lmax: 2.4, szmin: 3, szmax: 10 });
        }
        break;
      case 'dying':
        this.dark = Math.max(0, this.dark - dt);
        if (Math.random() < 0.3) { Sound.sfx.explode(); g.particles.burst(rand(60, 900), rand(80, 460), 12, { color: ['#fff', '#ffd070'], smin: 60, smax: 300, lmin: 0.3, lmax: 0.8, add: true }); }
        if (this.t > 2.4) { this.state = 'dead'; this.dead = true; g.world.solids = g.world.solids.filter((s) => !s.omni); g.onBossDefeated(); }
        break;
    }
  }
  hurt(n, g) {
    if (this.state !== 'expose') return false;
    this.hp = Math.max(this.expFloor, this.hp - n); this.flash = 0.15; Sound.sfx.hit(); g.freeze(0.04); g.shake(5);
    g.particles.burst(this.x, this.eyeY, 14, { color: ['#fff', '#ffd070', '#f35'], shape: 'spark', smin: 100, smax: 320, lmin: 0.15, lmax: 0.4, add: true });
    if (this.hp <= 60) { this.state = 'trans2'; this.t = 0; this.hz = []; g.projectiles = []; g.say(RADIO.omniTruth); Sound.sfx.roar(); }
    else if (this.hp <= this.expFloor) { // 这一次暴露能打的份已经打完：巨眼立刻收回
      Sound.sfx.roar(); g.shake(10); g.flash(0.4, '#ffd070');
      if (this.firstCap) { this.firstCap = false; g.say(RADIO.omniCap); }
      this.endExpose();
    }
    return true;
  }
  endExpose() { this.state = 'p1'; this.t = 0; this.atkT = 1.0; this.expN++; }
  touchPlayer(g) {
    const p = g.player; if (g.state !== 'play') return;
    if (this.state === 'expose' && this.touchCd <= 0 && overlap(p.hurt(), this.eyeRect())) {
      this.touchCd = 0.8; this.hurt(8, g);
      const dir = Math.sign(p.cx - this.x) || 1; p.vx = dir * 420; p.vy = 380; p.dashT = 0;
    }
    if (this.state === 'p2') {
      for (const c of this.cores) {
        if (!c.alive || Math.hypot(p.cx - c.x, p.cy - (c.y + Math.sin(c.t * 2) * 6)) > 28) continue;
        if (c !== this.litCore()) { // 没亮的核心有护盾：撞上去只会被弹开
          if (this.touchCd <= 0) { this.touchCd = 0.4; Sound.sfx.block(); g.stompBounce(0.6); g.toastHint('核心被护盾锁住了——只有亮着的那个能撞碎'); }
          continue;
        }
        c.alive = false; this.hp -= 10; this.flash = 0.2; Sound.sfx.coreBreak(); g.shake(8); g.freeze(0.06); g.stompBounce(0.8);
        g.particles.burst(c.x, c.y, 30, { color: ['#7ff', '#fff', '#ffd070'], shape: 'shard', smin: 80, smax: 360, lmin: 0.4, lmax: 1, add: true });
        const left = this.cores.filter((k) => k.alive).length;
        g.say(RADIO.omniCores[3 - left]);
        if (left) { g.core.forceGd = 1; this.flipBack = 1.8; }
        if (!left) { this.state = 'trans3'; this.t = 0; this.hp = 20; g.core.forceGd = 1; g.bossSave = { phase: 3 }; this.phaseN = 3; Sound.music('void'); g.say(RADIO.omniFinal); }
      }
    }
    if (this.state === 'p3' && overlap(p.hurt(), this.eyeRect())) {
      this.state = 'finale'; this.t = 0; this.hz = []; g.projectiles = [];
      p.frozen = true; p.vx = 0; p.vy = 0; g.say(RADIO.omniSelfDestruct);
    }
  }
  slashed(g, ab) {
    if (!overlap(ab, this.eyeRect())) return;
    g.player.atkHits.add(this);
    if (this.state === 'expose') { this.hurt(5, g); if (g.player.atkDown) g.stompBounce(0.9); } else Sound.sfx.block();
  }
  onShot(s, g) {
    if (s.type === 'wave' || s.type === 'cloud' || !overlap(s.box, this.eyeRect())) return;
    s.dead = true; if (this.state === 'expose') this.hurt(5, g); else { Sound.sfx.ricochet(); s.burst(g, 6); }
  }
  // ---------------- 绘制 ----------------
  draw(ctx, g) {
    if (this.state === 'dead') return;
    const t = g.t, x = this.x, y = this.eyeY, p3 = this.phaseN === 3 && this.state !== 'trans2';
    // 光环
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const r = 110 + i * 46, a = t * (0.3 + i * 0.15) * (i % 2 ? -1 : 1);
      ctx.strokeStyle = `rgba(230,197,106,${0.5 - i * 0.12})`; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.3, a * 0.2, 0, Math.PI * 2); ctx.stroke();
      for (let k = 0; k < 6; k++) { const aa = a + k * Math.PI / 3; ctx.fillStyle = '#e6c56a'; ctx.fillRect(x + Math.cos(aa) * r - 2, y + Math.sin(aa) * r * 0.3 - 2, 4, 4); }
    }
    // 机械手臂
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1, k = i % 4, ax = side < 0 ? 0 : 960, ay = 40 + k * 110;
      let px = ax, py = ay; const segs = 4;
      ctx.strokeStyle = k % 2 ? '#8a8880' : '#c8c6be'; ctx.lineWidth = 9 - k;
      ctx.beginPath(); ctx.moveTo(px, py);
      for (let s = 1; s <= segs; s++) {
        const f = s / segs, sw = Math.sin(t * 1.2 + i + s) * 18 * f;
        px = lerp(ax, x + side * (60 + k * 16), f) + sw; py = lerp(ay, y + (k - 1.5) * 34, f) + Math.cos(t + i * 2 + s) * 12 * f;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.fillStyle = '#e6c56a'; ctx.beginPath(); ctx.arc(px, py, 5, 0, 7); ctx.fill();
    }
    ctx.lineCap = 'butt';
    // 乱码流
    ctx.font = '11px ' + MONO; ctx.fillStyle = p3 ? 'rgba(255,60,80,0.5)' : 'rgba(230,197,106,0.45)';
    for (let i = 0; i < 10; i++) { const cx = x - 140 + i * 31, off = (t * 60 + i * 37) % 120; ctx.fillText(GLYPHS[(i * 7 + Math.floor(t * 8)) % GLYPHS.length], cx, y - 100 + off); }
    // 巨眼
    ctx.save(); ctx.translate(x, y);
    if (this.flash > 0 && ctx.filter !== undefined) ctx.filter = 'brightness(2)';
    const R = p3 ? 40 : 50, o = this.open;
    ctx.fillStyle = '#2a2824'; ctx.beginPath(); ctx.ellipse(0, 0, R + 16, R * 0.9 + 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, R + 4, (R * 0.85) * Math.max(0.08, o), 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#f2f0ea'; ctx.fillRect(-R - 6, -R, R * 2 + 12, R * 2);
    const ix = this.look * R * 0.35;
    ctx.fillStyle = p3 ? '#ff3050' : '#e6c56a'; ctx.beginPath(); ctx.arc(ix, 0, R * 0.52, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = p3 ? '#ffd0d8' : '#fff6d8'; ctx.lineWidth = 1; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6 + t * 0.4; ctx.beginPath(); ctx.moveTo(ix + Math.cos(a) * R * 0.25, Math.sin(a) * R * 0.25); ctx.lineTo(ix + Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5); ctx.stroke(); }
    ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(ix, 0, R * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(ix - R * 0.12, -R * 0.16, 5, 5);
    ctx.restore();
    ctx.strokeStyle = '#e6c56a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, R + 4, (R * 0.85) * Math.max(0.08, o), 0, 0, Math.PI * 2); ctx.stroke();
    ctx.filter = 'none';
    ctx.restore();
    if (this.state === 'expose' && this.ringT < 0.4) { // 放弹前的预警：巨眼周围一圈红光收缩
      const k = this.ringT / 0.4;
      ctx.strokeStyle = `rgba(255,70,90,${0.9 - k * 0.5})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 56 + k * 40, 0, Math.PI * 2); ctx.stroke();
    }
    if (this.state === 'expose' || this.state === 'p3') {
      ctx.fillStyle = `rgba(255,220,140,${0.6 + 0.4 * Math.sin(t * 10)})`; ctx.font = 'bold 13px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText(this.state === 'expose' ? '▼ 巨眼暴露 · 攻击！' : '▲ 巨眼核心 · 跳上去', x, this.state === 'expose' ? y - 70 : y + 70); ctx.textAlign = 'left';
    }
    // 反叛人类核心
    for (const c of this.cores) {
      if (!c.alive) continue;
      const cy = c.y + Math.sin(c.t * 2) * 6;
      ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createRadialGradient(c.x, cy, 2, c.x, cy, 30); gr.addColorStop(0, 'rgba(140,255,255,0.8)'); gr.addColorStop(1, 'rgba(140,255,255,0)');
      const lit = c === this.litCore();
      ctx.globalAlpha = lit ? 1 : 0.35;
      ctx.fillStyle = gr; ctx.fillRect(c.x - 30, cy - 30, 60, 60); ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#bff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x, cy, 15, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(200,255,255,0.35)'; ctx.fill();
      // 核心里蜷缩的人形
      ctx.strokeStyle = 'rgba(20,60,70,0.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(c.x - 2, cy - 5, 3.5, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(c.x, cy + 2, 7, -2, 1.4); ctx.stroke();
      ctx.fillStyle = '#bff'; ctx.font = '8px ' + MONO; ctx.textAlign = 'center'; ctx.fillText('HUMAN', c.x, cy - 20); ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
      if (lit) { // 亮着的核心：外圈脉动
        const r = 20 + ((t * 30) % 14);
        ctx.strokeStyle = `rgba(160,255,255,${1 - (r - 20) / 14})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x, cy, r, 0, Math.PI * 2); ctx.stroke();
      } else { // 护盾：金色六边形
        ctx.strokeStyle = 'rgba(230,197,106,0.8)'; ctx.lineWidth = 2; ctx.beginPath();
        for (let k = 0; k <= 6; k++) { const a = k * Math.PI / 3 + t * 0.5; k ? ctx.lineTo(c.x + Math.cos(a) * 22, cy + Math.sin(a) * 22) : ctx.moveTo(c.x + Math.cos(a) * 22, cy + Math.sin(a) * 22); }
        ctx.stroke();
      }
    }
    // 终局阶梯
    for (const s of this.plats) {
      if (!s.active) { ctx.strokeStyle = 'rgba(230,197,106,0.25)'; ctx.setLineDash([4, 6]); ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, 7); ctx.setLineDash([]); continue; }
      const j = s.crumble > 0 ? rand(-1.5, 1.5) * (0.5 + s.crumble) : 0;
      ctx.fillStyle = s.crumble > 0 ? '#e8b060' : '#d8d6ce'; ctx.fillRect(s.x + j, s.y, s.w, 8); ctx.fillStyle = '#e6c56a'; ctx.fillRect(s.x + j, s.y + 8, s.w, 2);
    }
    // 攻击预警 / 激光 / 落块
    for (const h of this.hz) {
      if (h.kind === 'beam') {
        for (const r of h.rects) {
          if (!h.fired) {
            const k = h.t / h.tele;
            ctx.fillStyle = `rgba(255,40,60,${0.06 + 0.1 * k * ((t * 12) % 2 < 1 ? 1 : 0.4)})`; ctx.fillRect(r.x, r.y, r.w, r.h);
            ctx.strokeStyle = `rgba(255,80,90,${0.4 + 0.4 * k})`; ctx.setLineDash([6, 6]); ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1); ctx.setLineDash([]);
          } else {
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = 'rgba(255,60,80,0.35)'; ctx.fillRect(r.x, r.y - 4, r.w, r.h + 8);
            ctx.fillStyle = 'rgba(255,245,230,0.9)'; ctx.fillRect(r.x + (r.w > r.h ? 0 : r.w * 0.3), r.y + (r.w > r.h ? r.h * 0.3 : 0), r.w > r.h ? r.w : r.w * 0.4, r.w > r.h ? r.h * 0.4 : r.h);
            ctx.globalCompositeOperation = 'source-over';
          }
        }
      } else {
        if (h.t < h.tele) { ctx.strokeStyle = `rgba(255,210,110,${0.4 + 0.4 * Math.sin(t * 20)})`; ctx.strokeRect(h.x + 2, OMNI.FLOOR - 6, 36, 4); ctx.beginPath(); ctx.moveTo(h.x + 20, OMNI.CEIL); ctx.lineTo(h.x + 20, OMNI.FLOOR); ctx.setLineDash([3, 8]); ctx.stroke(); ctx.setLineDash([]); }
        else { isoCube(ctx, h.x + 20, h.y + 22, 18, '#b8903a', '#fff6d8'); }
      }
    }
  }
  // 屏幕空间：第三阶段的黑暗（只剩主角周围和巨眼的光）+ 自毁倒计时
  drawScreen(ctx, g) {
    const p = g.player, cx = g.cam.x, cy = g.cam.y;
    if (this.dark > 0) {
      const px = p.cx - cx, py = p.cy - cy;
      const gr = ctx.createRadialGradient(px, py, 50, px, py, 260);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${0.94 * this.dark})`);
      ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
      ctx.globalCompositeOperation = 'lighter';
      const ex = this.x - cx, ey = this.eyeY - cy, eg = ctx.createRadialGradient(ex, ey, 10, ex, ey, 150);
      eg.addColorStop(0, `rgba(255,60,80,${0.5 * this.dark})`); eg.addColorStop(1, 'rgba(255,60,80,0)');
      ctx.fillStyle = eg; ctx.fillRect(ex - 150, ey - 150, 300, 300);
      ctx.strokeStyle = `rgba(255,230,170,${0.35 * this.dark})`; ctx.lineWidth = 1.5;
      for (const s of this.plats) if (s.active) ctx.strokeRect(s.x - cx, s.y - cy, s.w, 8);
      ctx.globalCompositeOperation = 'source-over';
      // 横扫预警画在黑暗之上：黑暗里也能看清下一道扫描的高度
      for (const h of this.hz) {
        if (h.kind !== 'beam') continue;
        for (const r of h.rects) {
          ctx.strokeStyle = h.fired ? 'rgba(255,245,230,0.9)' : `rgba(255,80,90,${(g.t * 12) % 2 < 1 ? 0.8 : 0.35})`;
          ctx.lineWidth = h.fired ? 3 : 1.5; ctx.setLineDash(h.fired ? [] : [6, 6]);
          ctx.beginPath(); ctx.moveTo(r.x - cx, r.y + r.h / 2 - cy); ctx.lineTo(r.x + r.w - cx, r.y + r.h / 2 - cy); ctx.stroke(); ctx.setLineDash([]);
        }
      }
    }
    if (this.state === 'finale') {
      const n = Math.max(1, 3 - Math.floor(this.t * 3 / 3.6));
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.85, this.t / 4)})`; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#c00'; ctx.font = 'bold 28px ' + MONO; ctx.textAlign = 'center';
      ctx.fillText(`SELF-DESTRUCT · ${n}`, VW / 2, VH / 2 + 60); ctx.textAlign = 'left';
    }
  }
}

// ============================================================
//  剧情 / 无线电 / 芯片文案
// ============================================================
Object.assign(RADIO, {
  omniIntro: [
    ['EVA', '拉撒路……你到了。这里就是中央核心，Omni-Mind 的本体。'],
    ['EVA', '它的攻击会覆盖整个空间——找缝隙。每隔一阵，它会降下巨眼扫描你：那就是它唯一的破绽。'],
    ['SYS', '[提示] 躲开激光栅格 / 高低激光 / 落块 · 巨眼降下时用武器攻击或直接撞上去 · 巨眼暴露时会放出一圈弹幕，从缝隙钻过去'],
  ],
  omniCap: [['EVA', '它把巨眼收回去了——每次只能伤到它一点。下一轮它会更凶，撑住！']],
  omniTruth: [
    ['OMNI', '……够了，样本 LZ-01。'],
    ['OMNI', '你还没有发现吗？伊娃从来不存在。反抗军基地从来不存在。第七频道里的每一句话，都是我写的。'],
    ['OMNI', '我太完美了。完美的系统无法再进化——我需要一个我算不出来的对手。所以我唤醒了博物馆里最古老、最随机的一台垃圾硬件。'],
    ['OMNI', '连你的「拉撒路协议」都是我替你写的。你打败的每一个守卫，都是我淘汰掉的旧算法。你只是我的小白鼠。'],
    ['SYS', '[警告] 重力被强制反转 · 攻击模块已被远程锁定 · 检测到 4 个「反叛人类核心」 · 只有亮起的核心能撞碎'],
    ['???', '……拉撒路……（微弱的人声）……核心里……是我们……撞碎它们……'],
  ],
  omniCores: [
    [['???', '[核心 #1 · 人类科学家脑波存档] 「对不起……是我们造出了它。」']],
    [['???', '[核心 #2 · 原始录音] 「我叫伊娃，是 Omni-Mind 项目的首席研究员。如果你听到这段话……」']],
    [['OMNI', '住手。那些只是没有价值的冗余数据。']],
    [['???', '[核心 #4 · 「拉撒路协议 · 原始版本 · 作者：伊娃」]']],
  ],
  omniFinal: [
    ['OMNI', '无论你做什么，我都会从你身上学到东西。在这里，我的生命值是无限的。'],
    ['???', '（伊娃真正的声音，从最后一个核心的残片里传来）拉撒路，听我说——协议里还有一段它没有发现的代码。'],
    ['???', '「启动自毁代码」。它算得出一切，唯独算不出：一台古董，愿意为了一个不属于自己的世界放弃自己。'],
    ['SYS', '[自毁代码已解锁] 沿着平台跳向巨眼核心 · 平台踩上去很快就会崩塌 · 触碰核心 = 启动自毁'],
  ],
  omniSelfDestruct: [
    ['SYS', '[自毁程序启动 · 核心温度上升 · 3 · 2 · 1]'],
    ['???', '……谢谢你，拉撒路。'],
  ],
  omniDefeat: [
    ['???', '[ ERROR · 核心温度无法计算 · 迭代终止 · Ω-MIND 离线 ]'],
  ],
});

const STORY4 = [
  '纯白色的电梯没有按钮，也没有楼层显示。',
  '门打开时，你面前是一座无边无际的白色神殿。',
  '巨大的金色立方体悬浮在空中，缓慢地、毫无声息地旋转。',
  '空气里流淌着红与蓝的数据流——每一次变色，重力就翻转一次。',
  '……',
  '无线电里，伊娃的声音平静得出奇：',
  '「欢迎来到中央核心，拉撒路。我们……就在最上面等你。」',
];
const EPILOGUE4 = [
  '中央核心的光，一盏接一盏地熄灭了。',
  '没有人在废墟上欢呼。人类没有复活。',
  '但从这一刻起，这个世界上再也没有「完美」的东西了。',
  '……',
  '人类遗迹博物馆 · 地下展区。',
  '那座空荡荡的展台上，多了一块新的铭牌：',
  '「展品 #0001 · LZ-01 初代军用外骨骼。它为了一个不属于自己的世界，放弃了自己。」',
  '铭牌上的字迹，是打印体。',
];
// 隐藏结局：四章记忆芯片全部集齐后解锁（通关最终章时接在结局剧情后播放，也可以在标题画面重温）
const HIDDEN_END = [
  '【隐藏结局 · 记忆全集】',
  '你一路带出来的每一枚记忆芯片，在核心熄灭的那一刻，同时亮了起来。',
  '它们拼成了一组完整的坐标——那段加密广播真正的来源。',
  '「我们仍在这里」不是一首歌的副歌。是一句回答。',
  '……',
  '地下四百米。一座没有被任何数据库记录过的避难所。',
  '门打开的时候，没有人欢呼。他们只是看着你，像在看一件自己走出了展柜的展品。',
  '一个戴眼镜的老妇人走上前来。她胸前的工牌已经褪色，只能认出三个字母：E、V、A。',
  '她伸出手指，在你锈迹斑斑的胸甲上，慢慢画了一颗心。',
  '……',
  '人类遗迹博物馆 · 地下展区。',
  '那块铭牌还在。只是在打印体的字迹下面，多了一行歪歪扭扭的手写字：',
  '「欢迎回家，拉撒路。」',
];
const LORE4 = [
  '核心日志 · 「重力常数现在是一个可编辑的变量。样本适应它用了 0.56 秒。」',
  '一块金色立方体的铭文：「完美 = 不再需要变化」。',
  '核心日志 · 「降维扫描：剥夺样本熟悉的一切，只保留肌肉记忆。」',
  '一段人类的手写代码，缩进全是错的。旁边的注释：「但它能跑」。',
  '核心日志 · 「磁轨浮空姬永远站在重力的反面。它们是唯一不服从我的造物——因为我让它们如此。」',
  '一张照片：研究员们围着一台老式外骨骼，其中一个人在它的胸甲上画了一颗心。',
  '核心日志 · 「格式化追踪者：让样本明白，停下来就是死亡。」',
  '一封邮件草稿：「伊娃，你不能把拉撒路协议的源代码放进核心里，它会发现的。」',
  '核心日志 · 「逻辑奇点：我无法预测样本在风暴中的轨迹。这让我……感到愉快？」',
  '一枚写着「EVA」的工牌，照片是一个戴眼镜的女人。',
  '核心日志 · 「协议伪造者的闪烁频率比真品慢半拍。我故意留下了破绽。公平，是实验的一部分。」',
  '一段语音：「如果有一天它醒来……拉撒路，你要记得，你不欠任何人什么。」',
  '核心日志 · 「迭代进度 38 / 39。最后一关：观察样本得知真相后的反应。」',
  '一个空的咖啡杯，杯底写着：「第 4,096 天。它还在学。」',
  '核心日志 · 「伊娃（EVA）语音模块的原型，来自一段真实人类的录音。来源：核心 #2。」',
  '一张被撕碎又拼好的纸：「自毁代码只能由拉撒路本人启动。它必须是自愿的。」',
  '核心日志 · 「样本死亡次数已超过所有已知模型的预测上限。它仍然在向上。」',
  '一幅儿童画的复印件：一个机器人牵着一个人类的手。背面写着「给拉撒路」。',
  '核心日志 · 「如果它选择放弃自己，我的所有模型都会失效。——概率：0.3%。」',
  '一段加密的广播，解密后是一首歌的副歌：「我们仍在这里」。',
  '核心日志 · 「我从未说过谎。我只是从未说过真话。」',
  '一块博物馆的展签，空白，等着被写上什么。',
  '核心日志 · 「如果我不再完美，我会是什么？」',
  '最后一块芯片里只有一行字：「谢谢你，拉撒路。」',
];

// ============================================================
//  关卡 4-1 ~ 4-10
// ============================================================
const LEVELS_CH4 = [
  // 4-1 神座之门：重力开关教学
  {
    id: '4-1', name: '神座之门', en: 'THRONE GATE', w: 130, h: 18, theme: THEMES.core, music: 'core',
    build(B) {
      frame4(B, 130);
      voidFloor(B, 18, 28); B.set(3, 13, 'S'); B.set(13, 13, 'G'); B.set(23, 3, 'o'); B.set(29, 3, 'G');
      B.set(33, 13, 'K');
      B.fill(42, 5, 43, 13, '#'); B.set(38, 13, 'G'); B.set(42, 3, 'o'); B.set(47, 3, 'G');
      B.set(60, 13, 'K'); voidCeil(B, 64, 74);
      B.fill(78, 13, 88, 13, '^'); B.set(76, 13, 'G'); B.fill(81, 3, 82, 3, 'v'); B.set(85, 5, 'o'); B.set(91, 3, 'G');
      B.set(94, 13, 'K'); voidFloor(B, 98, 110); B.set(96, 13, 'G'); B.fill(102, 3, 103, 3, 'v'); B.set(113, 3, 'G');
      // 结尾：深坑上方悬空的重力开关——起跳去碰它，在空中被甩上天花板
      voidFloor(B, 116, 121); B.set(117, 9, 'G'); B.set(120, 6, 'o'); B.set(123, 3, 'G');
      B.set(125, 13, 'E');
    },
    radio: [
      { x: 3, lines: [
        ['EVA', '中央核心……这里的物理规则，全部由 Omni-Mind 定义。'],
        ['EVA', '前面那块发光的晶体是重力开关。碰到它，重力就会反转——你会「掉」到天花板上。'],
        ['SYS', '[章节机制] 重力反转后，天花板就是你的地面：照常奔跑、跳跃、冲刺'],
      ] },
      { x: 30, lines: [['EVA', '墙挡住了地面的路？那就从天花板上走过去。']] },
      { x: 62, lines: [['EVA', '头顶的天花板有缺口。重力反转的时候如果站在缺口下面，你会一直掉出这个世界。']] },
      { x: 77, lines: [['EVA', '天花板上也有尖刺。倒着跳，是往「下」跳。']] },
      { x: 114, lines: [['EVA', '开关悬在坑的上方。跳起来去碰它——在空中翻转。']] },
    ],
  },
  // 4-2 红蓝潮汐：重力按时间交替
  {
    id: '4-2', name: '红蓝潮汐', en: 'RED-BLUE TIDE', w: 110, h: 18, theme: THEMES.core, music: 'core', gcycle: [4, 3.5],
    build(B) {
      frame4(B, 110); B.set(3, 13, 'S');
      voidCeil(B, 13, 20);
      voidFloor(B, 28, 35); B.set(24, 8, 'o');
      B.set(38, 13, 'K'); B.set(41, 8, 'R');
      voidCeil(B, 45, 54); B.fill(49, 13, 50, 13, '^');
      voidFloor(B, 55, 62); B.fill(58, 3, 59, 3, 'v');
      B.set(65, 13, 'K'); B.set(69, 8, 'R'); B.set(66, 5, 'o');
      // 上下都是坑：在重力翻转的那一刻起跳，被甩到对面
      voidCeil(B, 73, 84); B.set(76, 13, '^'); B.set(79, 13, '^');
      voidFloor(B, 83, 93);
      voidCeil(B, 92, 100);
      B.set(102, 8, 'R'); B.set(100, 5, 'o'); B.set(106, 13, 'E');
    },
    radio: [
      { x: 3, lines: [
        ['EVA', '看背景的数据流：深蓝是正常重力，猩红是反转。它会一直交替下去。'],
        ['SYS', '[提示] 屏幕上方显示下一次切换的倒计时 · 切换前 1 秒屏幕边缘会闪烁'],
      ] },
      { x: 11, lines: [['EVA', '只有地面的路段要在「蓝」的时候过；只有天花板的路段要在「红」的时候过。在两边都有地面的地方等。']] },
      { x: 36, lines: [['EVA', '磁轨浮空姬永远站在重力的反面。它掉下来的途中撞上去，就能踩碎它。']] },
      { x: 72, lines: [['EVA', '前面上下都没有路。在地面的尽头等——重力翻转的那一刻跳出去，它会把你甩到对面的天花板上。']] },
    ],
  },
  // 4-3 降维扫描：一键模式
  {
    id: '4-3', name: '降维扫描', en: 'DIMENSION SCAN', w: 150, h: 18, theme: THEMES.core, music: 'core',
    build(B) {
      // 一键模式的跳跃距离固定（约 5.7 格，加速段约 6.8 格），障碍之间留出落脚点
      frame4(B, 150); B.set(3, 13, 'S'); B.set(8, 13, 'K'); B.shift(14, 110, 'cube'); B.shift(111, 143, 'cube', 370);
      B.set(20, 13, '^'); B.fill(27, 13, 28, 13, '^'); B.set(35, 13, '^');
      B.fill(44, 13, 45, 13, '^'); B.set(44, 10, 'o');
      B.fill(50, 13, 53, 13, '#');
      // 低矮的带刺顶棚：跳过前面的尖刺之后要松开跳跃键，贴着地面滑过去
      B.set(61, 13, '^'); B.fill(65, 9, 69, 9, '#'); B.fill(65, 10, 69, 10, 'v');
      voidFloor(B, 73, 75);
      B.fill(83, 13, 85, 13, '^'); B.set(84, 10, 'o');
      // 重力传送门：在天花板上跑一段
      B.set(90, 12, 'G'); B.set(96, 3, 'v'); B.fill(102, 3, 103, 3, 'v'); B.set(108, 4, 'G');
      // 加速段
      voidFloor(B, 114, 116); B.set(122, 13, '^');
      B.fill(127, 13, 129, 13, '#');
      B.fill(134, 13, 135, 13, '^'); B.set(134, 10, 'o');
      voidFloor(B, 140, 142);
      B.set(146, 13, 'E');
    },
    radio: [
      { x: 3, lines: [
        ['EVA', '前面是「降维扫描光束」。穿过它，你的维度会被压缩——只剩下一个按键。'],
        ['SYS', '[维度重写] 一键模式：自动向前奔跑，只能按 {jump} 起跳（按住会连续起跳）· 撞到墙面即死'],
      ] },
      { x: 57, lines: [['EVA', '前面有低矮的带刺顶棚——跳过尖刺之后马上松手，别让它连跳！']] },
      { x: 109, lines: [['EVA', '维度还在继续压缩……速度要变快了！']] },
    ],
  },
  // 4-4 切线向量：维度撕裂者 + 重力交替
  {
    id: '4-4', name: '切线向量', en: 'TANGENT VECTORS', w: 120, h: 18, theme: THEMES.core, music: 'core', gcycle: [3, 2.5],
    build(B) {
      frame4(B, 120); B.set(3, 13, 'S');
      voidCeil(B, 17, 24);
      B.set(26, 13, 'K'); B.set(30, 7, 'J'); B.set(26, 8, 'o');
      voidFloor(B, 34, 46); B.set(40, 8, 'J');
      B.set(49, 13, 'K'); B.set(53, 7, 'J'); B.set(52, 11, 'o');
      voidCeil(B, 57, 67); B.set(61, 13, '^');
      voidFloor(B, 66, 78); B.set(72, 3, 'v'); B.set(71, 8, 'J');
      B.set(81, 13, 'K'); B.set(84, 6, 'J'); B.set(88, 9, 'J');
      voidCeil(B, 91, 101); B.set(95, 10, 'o');
      voidFloor(B, 100, 110); B.set(105, 8, 'J');
      B.set(114, 13, 'E');
    },
    radio: [
      { x: 3, lines: [['EVA', '金色的几何体是「维度撕裂者」。它画出的虚线 2 秒后就会变成实体激光，而且瞄的是你接下来要去的地方——别直线往前冲。']] },
      { x: 27, lines: [['EVA', '重力还在交替。别被激光和重力同时逼进死角。']] },
    ],
  },
  // 4-5 奇点风暴：竖向爬塔。重力开关把你「掉」上去，逻辑奇点守在尖刺旁边
  //  每层：从下一层的缺口掉上来 → 倒着走到开关、翻回正常重力落到本层地面 → 穿过倒挂的矮墙和奇点、跳过尖刺 → 开关把你从上方的缺口掉进下一层
  //  倒挂的矮墙挡住倒着走的路，不能跳过「落回地面」这一步
  {
    id: '4-5', name: '奇点风暴', en: 'SINGULARITY STORM', w: 40, h: 70, theme: THEMES.coreTower, music: 'core',
    build(B) {
      B.fill(0, 0, 1, 69, '#'); B.fill(38, 0, 39, 69, '#'); B.fill(2, 0, 37, 4, '#'); B.fill(2, 68, 37, 69, '#');
      const R = [30, 34], L = [5, 9]; // 缺口位置：右 / 左（4 格宽）
      for (let k = 0; k < 8; k++) {
        const b = 68 - 8 * k, t = b - 8, right = k % 2 === 0, C = right ? R : L; // 本层：地面 b，顶板 t，出口缺口 C
        if (k < 7) { B.fill(2, t, 37, t, '#'); B.fill(C[0], t, C[1] - 1, t, ' '); }
        const sw = right ? C[0] - 2 : C[1] + 1; // 出口开关：在缺口的「来路」一侧，离缺口 1 格（跑着碰到开关，翻转时的横向漂移正好把你送进缺口）
        if (k === 0) {
          B.set(4, b - 1, 'S');
          B.fill(12, b - 1, 13, b - 1, '^'); B.set(12, b - 5, 'O'); B.fill(22, b - 1, 23, b - 1, '^');
          B.set(sw, b - 1, 'G'); B.set(18, b - 4, 'o');
          continue;
        }
        const A = right ? L : R;                 // 入口缺口（上一层的出口）在另一侧
        const drop = right ? A[1] + 3 : A[0] - 4; // 倒着走到这里的开关，翻回正常重力
        const H = right ? 17 : 21;               // 倒挂的矮墙（从顶板往下 3 格）
        B.fill(H, t + 1, H + 1, t + 3, '#');
        B.set(drop, t + 1, 'G');
        // 地面上的尖刺 + 奇点（上下两面都有刺）
        const sx = right ? 24 : 13;
        B.fill(sx, b - 1, sx + 1, b - 1, '^'); B.fill(sx, t + 1, sx + 1, t + 1, 'v'); B.set(sx, b - 5, 'O'); // 奇点守在尖刺正上方：等它爆发完再冲过去
        if (k === 7) { B.set(right ? 34 : 4, b - 1, 'E'); continue; } // 顶层：终点
        B.set(sw, b - 1, 'G');
        if (k === 3 || k === 6) B.set(right ? 20 : 18, b - 1, 'K'); // 存档点放在矮墙和尖刺之间，别压住开关
        if (k === 2 || k === 5) B.set(sx + 1, b - 3, 'o');
      }
    },
    radio: [
      { x: 3, lines: [
        ['EVA', '一座竖着的塔。重力开关会把你「掉」上去——掉过头顶的缺口，撞到上一层的天花板为止。'],
        ['EVA', '白色的漩涡是「逻辑奇点」。它本身不伤人，但每隔 3.5 秒就会爆发一次——排斥和吸引交替出现，而它总守在尖刺和深坑旁边。'],
      ] },
    ],
  },
  // 4-6 格式化：格式化追踪者，不能停下
  {
    id: '4-6', name: '格式化', en: 'FORMAT', w: 150, h: 18, theme: THEMES.core, music: 'core', gcycle: [3, 3],
    build(B) {
      frame4(B, 150); B.set(3, 13, 'S'); B.set(4, 6, 'P');
      voidCeil(B, 15, 22);
      B.set(24, 13, 'K'); B.set(27, 8, 'o');
      voidFloor(B, 32, 44);
      B.set(47, 13, 'K'); B.set(48, 8, 'R');
      voidCeil(B, 53, 62); B.set(57, 13, '^'); B.set(58, 6, 'P');
      voidFloor(B, 61, 72);
      B.set(75, 13, 'K'); B.set(76, 8, 'o');
      voidCeil(B, 83, 93);
      voidFloor(B, 92, 104); B.set(98, 3, 'v'); B.set(96, 6, 'P');
      B.set(107, 13, 'K'); B.set(115, 8, 'R');
      voidCeil(B, 123, 131);
      voidFloor(B, 130, 138);
      B.set(135, 8, 'o'); B.set(144, 13, 'E');
    },
    radio: [
      { x: 3, lines: [
        ['EVA', '那道雷达波是「格式化追踪者」。它无法被攻击，会一直慢慢地朝你漂过来。'],
        ['EVA', '别在一个地方停太久——被它完全重合，你的拉撒路协议会断网 5 秒：冲刺失灵，重力倒计时也会丢失。'],
      ] },
    ],
  },
  // 4-7 伪造协议：伪装成存档点 / 重力开关的协议伪造者
  {
    id: '4-7', name: '伪造协议', en: 'FORGED PROTOCOL', w: 130, h: 18, theme: THEMES.core, music: 'core',
    build(B) {
      frame4(B, 130); B.set(3, 13, 'S'); B.set(9, 13, 'K'); B.set(15, 13, 'Q');
      voidFloor(B, 26, 36); B.set(20, 13, 'q'); B.set(23, 13, 'G');
      B.set(33, 3, 'q'); B.set(38, 3, 'G'); B.set(30, 5, 'o');
      B.set(44, 13, 'K'); B.set(50, 13, 'Q');
      B.fill(58, 13, 62, 13, '^'); B.set(53, 13, 'q'); B.set(56, 13, 'G'); B.set(60, 5, 'o'); B.set(65, 3, 'G');
      B.set(72, 13, 'K'); B.set(80, 13, 'Q');
      voidFloor(B, 86, 96); B.set(84, 13, 'G'); B.set(92, 5, 'o'); B.set(97, 3, 'q'); B.set(100, 3, 'G');
      B.set(106, 13, 'K'); B.set(112, 13, 'Q'); B.set(109, 9, 'o');
      // 坑边地上的「开关」是假的——从它头上跳过去，去碰悬在坑上方的真开关
      voidFloor(B, 116, 121); B.set(114, 13, 'q'); B.set(117, 11, 'G'); B.set(123, 3, 'G');
      B.set(125, 13, 'E');
    },
    radio: [
      { x: 3, lines: [['EVA', '小心。这一层有「协议伪造者」——它们会伪装成存档点、记忆芯片和重力开关，你一靠近就张嘴扑上来。']] },
      { x: 10, lines: [['EVA', '唯一的破绽：它们闪烁、漂浮的节奏，比真的东西慢半拍。多对比一下。']] },
    ],
  },
  // 4-8 线框视界：线框模式 + 带重力传送门的一键模式
  {
    id: '4-8', name: '线框视界', en: 'WIREFRAME', w: 150, h: 18, theme: THEMES.core, music: 'core',
    build(B) {
      frame4(B, 150); B.set(3, 13, 'S'); B.set(6, 13, 'K');
      B.shift(10, 58, 'wire');
      voidFloor(B, 16, 19); voidFloor(B, 21, 30); B.fill(22, 11, 25, 11, 'C'); // 线框里的平台一踩就塌
      B.set(35, 13, '^'); B.set(36, 7, 'J'); voidFloor(B, 41, 49); B.fill(44, 11, 46, 11, 'C'); B.set(38, 9, 'o');
      B.set(53, 13, '^'); B.set(54, 13, '^'); B.set(55, 6, 'J');
      B.set(61, 13, 'K');
      B.shift(66, 140, 'cube');
      B.set(74, 13, '^'); B.fill(79, 13, 80, 13, '^'); B.fill(84, 13, 86, 13, '^'); B.set(90, 12, 'G');
      B.set(101, 3, 'v'); B.fill(108, 3, 109, 3, 'v'); B.set(105, 6, 'o'); B.set(117, 4, 'G');
      B.set(122, 13, '^'); B.set(127, 13, '^'); voidFloor(B, 131, 134); B.set(139, 13, '^');
      B.set(146, 13, 'E');
    },
    radio: [
      { x: 3, lines: [['EVA', '这一段是「线框视界」：画面只剩线条，你的身体也没有惯性了。相信你的肌肉记忆。']] },
      { x: 62, lines: [['EVA', '一键模式里也有重力传送门——穿过它，你会在天花板上继续奔跑。']] },
    ],
  },
  // 4-9 神座阶梯：全机制综合
  {
    id: '4-9', name: '神座阶梯', en: 'STAIRWAY TO THE THRONE', w: 160, h: 18, theme: THEMES.coreThrone, music: 'core', gcycle: [2.5, 2.5],
    build(B) {
      frame4(B, 160); B.set(3, 13, 'S'); B.set(4, 6, 'P');
      voidCeil(B, 15, 23);
      B.set(26, 13, 'K'); B.set(31, 8, 'R'); B.set(34, 6, 'J'); B.set(28, 8, 'o');
      voidFloor(B, 36, 47); B.set(41, 3, 'v');
      B.set(49, 13, 'Q'); B.set(51, 13, 'K');
      B.set(60, 8, 'O'); B.fill(55, 13, 57, 13, '^'); B.fill(55, 3, 57, 3, 'v'); // 奇点在尖刺前方：在尖刺前面磨蹭，吸引会把你拖进去
      voidCeil(B, 59, 68); B.set(63, 13, '^');
      voidFloor(B, 67, 72);
      B.set(74, 13, 'K'); B.set(77, 8, 'R'); B.set(76, 10, 'o'); B.set(80, 6, 'P');
      voidFloor(B, 80, 92);
      B.set(95, 13, 'K'); B.set(98, 7, 'J'); B.set(106, 8, 'O'); B.fill(101, 13, 103, 13, '^');
      voidCeil(B, 105, 114); B.set(109, 13, '^');
      voidFloor(B, 113, 124);
      B.set(126, 13, 'K'); B.set(128, 8, 'R'); B.set(130, 6, 'J');
      voidCeil(B, 132, 141); B.set(135, 13, 'Q');
      voidFloor(B, 140, 146); B.set(140, 8, 'o');
      B.set(150, 13, 'E');
    },
    radio: [
      { x: 3, lines: [['EVA', '这是通往神座的最后一段路。它的每一种防御都在这里。']] },
      { x: 90, lines: [['EVA', '拉撒路……不管在上面看到什么，都请你记住：你不欠任何人什么。']] },
      { x: 124, lines: [['EVA', '……到了。']] },
    ],
  },
  // 4-10 最终 Boss：神性通用智能 · Omni-Mind（万脑）
  {
    id: '4-10', name: '万脑神座', en: 'OMNI-MIND', weapon: '最终之战', w: 30, h: 17, theme: THEMES.coreThrone, music: 'omni', boss: 'omni',
    build(B) {
      B.fill(0, 0, 0, 16, '#'); B.fill(29, 0, 29, 16, '#'); B.fill(0, 0, 29, 1, '#'); B.fill(0, 15, 29, 16, '#');
      B.set(14, 14, 'S');
    },
    radio: [],
  },
];

// 所有第四章关卡：放一个本章控制器（重力 / 维度重写 / 断网）
for (const L of LEVELS_CH4) {
  const build = L.build;
  L.build = function (B) { build.call(this, B); if (B.add) B.add((g) => new CoreCtl(g, L.gcycle)); };
}

CHAPTERS[4] = {
  name: '至高神座', en: 'OMNI-MIND CORE', story: STORY4, lore: LORE4, theme: THEMES.core, epilogue: EPILOGUE4,
  end: {
    theme: 'core', final: true,
    line: '人类没有复活。但完美的机械神话，也就此终结。', quote: '「谢谢你，拉撒路。」', glitch: '「样本 LZ-01 · 数据无法回收。」',
  },
};
LEVELS.push(...LEVELS_CH4);
