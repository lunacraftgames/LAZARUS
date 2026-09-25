'use strict';
// ============================================================
//  第三章：幽灵因特网（The Phantom Matrix）
//  章节机制：拉撒路残影（重构错觉）—— 每次冲刺都会在原地留下一个持续 3 秒的「代码残影」。
//           代码门需要两个机关同时被压住：一个用身体，一个用残影。
//  新敌人：死锁黑客 / 延迟泡沫 / 掉帧幽灵 / 镜像执行官 / 逻辑地雷
//  Boss：算法审判官 · 镜像拉撒路（The Mirror Lazarus）
//
//  地图新增字符：
//   'l' 延迟泡沫（打碎后周围机关、弹幕减速 50%）   'f' 掉帧幽灵（隐形，放在深坑上方）
//   'X' 镜像执行官（镜像你的操作，只能被红外线 / 激光网 / 尖刺 / 虚空消灭）
//   'M' 逻辑地雷（伪装成安全数据块；放在 '=' 数字平台上，触发 2 秒后抹除整块平台）
//   'I' 红外线（从这一格向下，周期开关）
//  构建函数新增（见 makeBuilder 包装）：
//   B.plate(id, x, y)                 机关（站立格），同一 id 的机关控制同一扇代码门
//   B.gate(id, x0, y0, x1, y1, mode)  代码门（矩形），mode = 'latch' 打开后保持 | 'hold' 只在机关都被压住时打开
//   B.ir(x0, x1, y, opts)             水平红外线（opts：always 常亮 / guard 执行官死后关闭 / period / on / offset）
//   B.net(x0, x1, y)                  高频激光网：从 y 行向下直到地面，开关极快，需要延迟泡沫减速才能通过
//   B.glitch([[x, y], ...])           死锁黑客及它会瞬移到的几个站立点
// ============================================================

const PL3 = { ECHO_LIFE: 3, ECHO_MAX: 3, LOCK: 1.5, LAG_T: 2.2, FIELD_R: 210, FIELD_T: 7, MINE_T: 2 };
const GLYPHS = '01010110ΛΩΣΨΦ#$%&*+=<>/\\ABCDEF0123456789{}[]';

// ---------------- 主题与美术 ----------------
Object.assign(THEMES, {
  matrix: { top: '#010604', bottom: '#03120a', haze: 'rgba(0,40,20,0.18)', shaft: 'rgba(60,255,140,0.05)', tint: 'rgba(40,255,120,0.035)', dust: 'rgba(120,255,170,0.45)', back: () => Art.matrixBack || (Art.matrixBack = makeMatrixBack()), mid: () => Art.matrixMid || (Art.matrixMid = makeMatrixMid()), overlay: drawMatrixRain, tiles: 'matrix', backAlpha: 0.8 },
  matrixDeep: { top: '#010409', bottom: '#030c16', haze: 'rgba(0,30,50,0.2)', shaft: 'rgba(80,220,255,0.05)', tint: 'rgba(60,200,255,0.035)', dust: 'rgba(140,230,255,0.4)', back: () => Art.matrixBack || (Art.matrixBack = makeMatrixBack()), mid: () => Art.matrixMid || (Art.matrixMid = makeMatrixMid()), overlay: drawMatrixRain, tiles: 'matrix', backAlpha: 0.7 },
  matrixTower: { top: '#010604', bottom: '#041509', haze: 'rgba(0,40,20,0.2)', shaft: 'rgba(60,255,140,0.06)', tint: 'rgba(40,255,120,0.035)', dust: 'rgba(120,255,170,0.45)', vtile: true, back: () => Art.matrixBack || (Art.matrixBack = makeMatrixBack()), mid: () => Art.matrixMid || (Art.matrixMid = makeMatrixMid()), overlay: drawMatrixRain, tiles: 'matrix', backAlpha: 0.75 },
  matrixRed: { top: '#080103', bottom: '#14040a', haze: 'rgba(60,0,15,0.2)', shaft: 'rgba(255,60,90,0.05)', tint: 'rgba(255,40,70,0.035)', dust: 'rgba(255,150,170,0.4)', back: () => Art.matrixBack || (Art.matrixBack = makeMatrixBack()), mid: () => Art.matrixMid || (Art.matrixMid = makeMatrixMid()), overlay: drawMatrixRain, tiles: 'matrix', backAlpha: 0.65 },
});

// 远景：代码雨、透视网格、远处的数据塔、空间断层
function makeMatrixBack() {
  const W = 1800, H = 620, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(3303);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#010503'); g.addColorStop(1, '#03110a');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const hy = 430;
  // 数据塔
  for (let i = 0; i < 16; i++) {
    const bx = r() * W, bw = 26 + r() * 70, bh = 90 + r() * 280;
    x.fillStyle = 'rgba(6,26,15,0.95)'; x.fillRect(bx, hy - bh, bw, bh);
    x.fillStyle = 'rgba(40,255,140,0.25)'; x.fillRect(bx, hy - bh, bw, 1);
    for (let k = 0; k < bh / 9; k++) for (let j = 0; j < bw / 8; j++) if (r() < 0.16) { x.fillStyle = r() < 0.2 ? 'rgba(160,255,200,0.5)' : 'rgba(40,200,110,0.3)'; x.fillRect(bx + 3 + j * 8, hy - bh + 5 + k * 9, 3, 2); }
  }
  // 透视网格
  x.strokeStyle = 'rgba(40,255,140,0.12)'; x.lineWidth = 1;
  for (let i = -36; i <= 36; i++) { x.beginPath(); x.moveTo(W / 2 + i * 26, hy); x.lineTo(W / 2 + i * 190, H); x.stroke(); }
  for (let k = 0; k <= 9; k++) { const yy = hy + Math.pow(k / 9, 2) * (H - hy); x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); }
  x.fillStyle = 'rgba(40,255,140,0.35)'; x.fillRect(0, hy, W, 1);
  // 代码列
  x.font = '12px ' + MONO;
  for (let col = 0; col < W / 14; col++) {
    if (r() < 0.4) continue;
    const len = 6 + r() * 26, y0 = r() * H;
    for (let k = 0; k < len; k++) {
      x.fillStyle = `rgba(60,255,150,${(1 - k / len) * 0.28})`;
      x.fillText(GLYPHS[Math.floor(r() * GLYPHS.length)], col * 14, ((y0 - k * 14) % H + H) % H);
    }
  }
  // 空间断层：锯齿状的黑色裂缝
  for (let i = 0; i < 6; i++) {
    let cx = r() * W, cy = r() * 200;
    x.strokeStyle = 'rgba(0,0,0,0.9)'; x.lineWidth = 3 + r() * 5; x.beginPath(); x.moveTo(cx, cy);
    const pts = [[cx, cy]];
    for (let s = 0; s < 8; s++) { cx += (r() - 0.5) * 60; cy += 20 + r() * 40; x.lineTo(cx, cy); pts.push([cx, cy]); }
    x.stroke();
    x.strokeStyle = 'rgba(60,255,160,0.35)'; x.lineWidth = 1; x.beginPath();
    pts.forEach(([a, b], k) => (k ? x.lineTo(a + 3, b) : x.moveTo(a + 3, b))); x.stroke();
  }
  return c;
}
// 中景：漂浮的断层碎块、线框立方体、断裂的光缆
function makeMatrixMid() {
  const W = 1600, H = 620, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(4404);
  for (let i = 0; i < 14; i++) {
    const cx = r() * W, cy = 60 + r() * 480, s = 20 + r() * 50;
    x.fillStyle = 'rgba(4,18,10,0.92)'; x.beginPath();
    x.moveTo(cx - s, cy - s * 0.3); x.lineTo(cx + s * (0.6 + r() * 0.5), cy - s * 0.5); x.lineTo(cx + s, cy + s * 0.2); x.lineTo(cx - s * 0.3, cy + s * (0.5 + r() * 0.6)); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(50,255,150,0.26)'; x.lineWidth = 1; x.stroke();
    x.fillStyle = 'rgba(50,255,150,0.3)'; for (let k = 0; k < 4; k++) x.fillRect(cx + (r() - 0.5) * s, cy + (r() - 0.3) * s * 0.5, 2, 2);
  }
  // 线框立方体
  for (let i = 0; i < 6; i++) {
    const cx = r() * W, cy = 80 + r() * 380, s = 18 + r() * 30, o = s * 0.45;
    x.strokeStyle = 'rgba(60,255,160,0.2)'; x.lineWidth = 1.2;
    x.strokeRect(cx, cy, s, s); x.strokeRect(cx + o, cy - o, s, s);
    x.beginPath(); for (const [a, b] of [[0, 0], [s, 0], [0, s], [s, s]]) { x.moveTo(cx + a, cy + b); x.lineTo(cx + a + o, cy + b - o); } x.stroke();
  }
  // 从顶部垂下的断裂光缆
  for (let k = 0; k < 12; k++) {
    const cx = r() * W, len = 40 + r() * 170;
    x.strokeStyle = k % 3 ? 'rgba(20,70,40,0.9)' : 'rgba(60,255,150,0.35)'; x.lineWidth = 1 + r() * 2;
    x.beginPath(); x.moveTo(cx, 0); x.lineTo(cx + (r() - 0.5) * 20, len); x.stroke();
    x.fillStyle = 'rgba(120,255,190,0.6)'; x.fillRect(cx - 1, len - 1, 3, 3);
  }
  return c;
}
// 前景代码雨 + 偶尔闪过的故障横条
function drawMatrixRain(ctx, cam, t) {
  ctx.globalCompositeOperation = 'lighter'; ctx.font = '13px ' + MONO;
  for (let i = 0; i < 20; i++) {
    const sp = 60 + (i * 37) % 90, span = VW + 40;
    const px = ((i * 151 - cam.x * 0.6) % span + span) % span - 20;
    const head = ((t * sp + i * 211 - cam.y * 0.6) % (VH + 220) + VH + 220) % (VH + 220) - 110;
    for (let k = 0; k < 9; k++) {
      const yy = head - k * 15; if (yy < -15 || yy > VH + 15) continue;
      ctx.fillStyle = k === 0 ? 'rgba(200,255,220,0.5)' : `rgba(60,255,140,${0.28 * (1 - k / 9)})`;
      ctx.fillText(GLYPHS[(i * 7 + k * 13 + Math.floor(t * 6 + i)) % GLYPHS.length], px, yy);
    }
  }
  const gk = Math.floor(t * 3);
  if (hash2(gk, 7) < 0.22) { ctx.fillStyle = 'rgba(80,255,160,0.05)'; ctx.fillRect(0, hash2(gk, 11) * VH, VW, 4 + hash2(gk, 3) * 22); }
  ctx.globalCompositeOperation = 'source-over';
}

// ---------------- 瓦片风格：数字虚空 ----------------
// 数字平台（'='）与逻辑地雷下方的平台共用这个画法，这样地雷的伪装才成立
function drawDataBlock(x, px, py, oL, oR, red) {
  x.fillStyle = red ? 'rgba(110,10,30,0.8)' : 'rgba(10,60,34,0.82)'; x.fillRect(px, py, TILE, TILE);
  x.fillStyle = red ? 'rgba(255,60,90,0.22)' : 'rgba(40,255,140,0.16)'; for (let k = 5; k < TILE - 2; k += 4) x.fillRect(px + 2, py + k, TILE - 4, 1);
  x.fillStyle = red ? '#ff3a5c' : '#2aff8a'; x.fillRect(px, py, TILE, 2);
  x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(px, py + TILE - 4, TILE, 4);
  x.fillStyle = red ? 'rgba(255,120,140,0.5)' : 'rgba(150,255,200,0.45)'; x.fillRect(px + 6, py + 8, 3, 3); x.fillRect(px + 20, py + 16, 3, 3);
  if (oL) { x.fillStyle = red ? '#ff3a5c' : '#2aff8a'; x.fillRect(px, py, 2, TILE - 4); }
  if (oR) { x.fillStyle = red ? '#ff3a5c' : '#2aff8a'; x.fillRect(px + TILE - 2, py, 2, TILE - 4); }
}
TILESETS.matrix = {
  stone(x, px, py, r, cx, cy, oT, oB, oL, oR) {
    x.fillStyle = ['#04110a', '#051409', '#030e08', '#06160c'][Math.floor(r() * 4)]; x.fillRect(px, py, TILE, TILE);
    x.fillStyle = 'rgba(40,255,140,0.06)'; x.fillRect(px, py, TILE, 1); x.fillRect(px, py, 1, TILE);
    for (let k = 0; k < 3; k++) if (r() < 0.5) { x.fillStyle = r() < 0.15 ? 'rgba(120,255,190,0.5)' : 'rgba(40,200,110,0.16)'; x.fillRect(px + 3 + Math.floor(r() * 7) * 4, py + 3 + Math.floor(r() * 7) * 4, 2, 2); }
    if (oL) { x.fillStyle = 'rgba(40,255,140,0.3)'; x.fillRect(px, py, 1, TILE); }
    if (oR) { x.fillStyle = 'rgba(40,255,140,0.18)'; x.fillRect(px + TILE - 1, py, 1, TILE); }
    if (oB) { x.fillStyle = 'rgba(40,255,140,0.2)'; x.fillRect(px, py + TILE - 1, TILE, 1); }
    if (oT) {
      x.fillStyle = '#0d3a20'; x.fillRect(px, py, TILE, 4);
      x.fillStyle = '#3dff9a'; x.fillRect(px, py, TILE, 1);
      if (r() < 0.45) { x.fillStyle = 'rgba(60,255,150,0.35)'; for (let k = 0; k < 2; k++) x.fillRect(px + r() * 28, py + 4, 2, 3 + r() * 9); }
    }
  },
  marble(x, px, py, r, oL, oR) { drawDataBlock(x, px, py, oL, oR, false); },
  shelf(x, px, py, endL, endR) {
    x.fillStyle = '#0c3a22'; x.fillRect(px, py, TILE, 6);
    x.fillStyle = '#5fffb0'; x.fillRect(px, py, TILE, 1);
    x.fillStyle = 'rgba(40,255,140,0.4)'; for (let k = 2; k < TILE; k += 6) x.fillRect(px + k, py + 3, 3, 1);
    if (endL) { x.fillStyle = '#5fffb0'; x.fillRect(px, py, 1, 6); } if (endR) { x.fillStyle = '#5fffb0'; x.fillRect(px + TILE - 1, py, 1, 6); }
  },
  shards(x, px, py, r, down) {
    x.save();
    if (down) { x.translate(px + 16, py + 16); x.scale(1, -1); x.translate(-px - 16, -py - 16); }
    x.fillStyle = '#2a0610'; x.fillRect(px, py + 27, TILE, 5);
    for (let k = 0; k < 4; k++) {
      const bx = px + 1 + k * 8, h = 13 + r() * 11;
      x.fillStyle = '#ff2a55'; x.beginPath(); x.moveTo(bx, py + 28); x.lineTo(bx + 3.5, py + 28 - h); x.lineTo(bx + 7, py + 28); x.fill();
      x.fillStyle = 'rgba(255,170,190,0.8)'; x.fillRect(bx + 3, py + 28 - h * 0.8, 1, h * 0.5);
      x.fillStyle = 'rgba(255,60,90,0.45)'; x.fillRect(bx + (r() - 0.5) * 6, py + 28 - h * (0.3 + r() * 0.4), 4, 2); // 故障偏移
    }
    x.restore();
  },
  prop(x, cx, gy, type) {
    x.save();
    switch (type % 4) {
      case 0: // 悬浮终端
        x.fillStyle = '#062014'; x.fillRect(cx - 12, gy - 22, 24, 16); x.strokeStyle = 'rgba(60,255,150,0.6)'; x.strokeRect(cx - 12, gy - 22, 24, 16);
        x.fillStyle = 'rgba(80,255,160,0.6)'; x.fillRect(cx - 8, gy - 18, 12, 1); x.fillRect(cx - 8, gy - 15, 8, 1); x.fillRect(cx - 8, gy - 12, 14, 1);
        x.fillStyle = '#0c3a22'; x.fillRect(cx - 1, gy - 6, 2, 6);
        break;
      case 1: // 线框立方体
        x.strokeStyle = 'rgba(60,255,160,0.55)'; x.lineWidth = 1; x.strokeRect(cx - 8, gy - 14, 12, 12); x.strokeRect(cx - 4, gy - 18, 12, 12);
        x.beginPath(); x.moveTo(cx - 8, gy - 14); x.lineTo(cx - 4, gy - 18); x.moveTo(cx + 4, gy - 14); x.lineTo(cx + 8, gy - 18); x.moveTo(cx + 4, gy - 2); x.lineTo(cx + 8, gy - 6); x.stroke();
        break;
      case 2: // 破碎的像素柱
        for (let k = 0; k < 5; k++) { x.fillStyle = k % 2 ? 'rgba(40,200,110,0.5)' : 'rgba(10,60,34,0.9)'; x.fillRect(cx - 4 + (k % 2) * 2, gy - 4 - k * 5, 6, 4); }
        break;
      default: // 404 标牌
        x.fillStyle = '#1a0a0e'; x.fillRect(cx - 12, gy - 14, 24, 12); x.fillStyle = '#ff3a5c'; x.font = 'bold 8px ' + MONO; x.textAlign = 'center'; x.fillText('404', cx, gy - 5); x.textAlign = 'left';
    }
    x.restore();
  },
};

// ---------------- 构建函数扩展 ----------------
const _makeBuilderCh2 = makeBuilder;
makeBuilder = function (w, h) { // eslint-disable-line no-func-assign
  const B = _makeBuilderCh2(w, h);
  B.extra = B.extra || []; B.spawns = B.spawns || [];
  return Object.assign(B, {
    add(f) { this.extra.push(f); },
    plate(id, x, y) { this.extra.push(() => new CodePlate(id, x, y)); },
    gate(id, x0, y0, x1, y1, mode) { this.extra.push((g) => new CodeGate(id, x0, y0, x1, y1, mode, g)); },
    ir(x0, x1, y, o) { this.extra.push((g) => new IRBeam(Object.assign({ h: true, x0, x1, y }, o || {}), g)); },
    net(x0, x1, y) { this.extra.push((g) => new LaserNet(x0, x1, y, g)); },
    glitch(anchors) { this.spawns.push({ type: 'glitch', cx: anchors[0][0], cy: anchors[0][1], anchors }); },
  });
};

// ============================================================
//  本章控制器：拉撒路残影 / 延迟力场 / 死锁与掉帧的画面效果
//  每个第三章关卡都会自动放一个（见文件末尾），通过 g.matrix 访问
// ============================================================
function ghostBody(onGround) { return Object.assign(Object.create(Player.prototype), { w: 20, h: 28, onGround, vx: 0, run: 0, dashLock: 0, canDash: true, atkSwing: 0, slimeT: 0 }); }
class MatrixCtl {
  constructor(g) {
    g.matrix = this; this.echoes = []; this.fields = [];
    this.x = 0; this.y = 0; this.w = g.world.pw; this.h = g.world.ph; // 永远在画面内
  }
  // 冲刺时调用：在冲刺起点留下残影
  spawnEcho(p, g) {
    this.echoes.push({ x: p.x, y: p.y + p.h - 28, f: p.facing, og: p.onGround, t: 0, life: (p.C && p.C.echoLife) || PL3.ECHO_LIFE, C: p.C, h: p.h }); // 残影总是站立高度（判定用）；C / h = 画成哪个角色
    if (this.echoes.length > PL3.ECHO_MAX) this.echoes.shift();
    Sound.sfx.echo();
    g.particles.burst(p.cx, p.cy, 10, { color: ['#2f9', '#bfe', '#fff'], smin: 30, smax: 120, lmin: 0.2, lmax: 0.45, add: true, szmin: 1.5, szmax: 3 });
    if (!g.echoHinted) { g.echoHinted = true; g.toastHint(charText('冲刺留下了 3 秒的代码残影——它能替你压住代码门的机关')); }
  }
  addField(x, y, src, g) {
    this.fields.push({ x, y, r: PL3.FIELD_R, t: 0, life: PL3.FIELD_T, src });
    Sound.sfx.lagField(); g.flash(0.25, '#6f9'); g.shake(4);
    if (!g.lagHinted) { g.lagHinted = true; g.toastHint('延迟力场：范围内的机关与弹幕减速 50%，持续 7 秒'); }
  }
  slowAt(x, y) { for (const f of this.fields) if (Math.hypot(x - f.x, y - f.y) < f.r) return 0.5; return 1; }
  slowRect(r) {
    for (const f of this.fields) {
      const dx = Math.max(r.x - f.x, 0, f.x - (r.x + r.w)), dy = Math.max(r.y - f.y, 0, f.y - (r.y + r.h));
      if (Math.hypot(dx, dy) < f.r) return 0.5;
    }
    return 1;
  }
  onRespawn() { this.echoes = []; this.fields = []; }
  update(dt, g) {
    for (const e of this.echoes) e.t += dt;
    this.echoes = this.echoes.filter((e) => e.t < e.life);
    for (const f of this.fields) f.t += dt;
    this.fields = this.fields.filter((f) => f.t < f.life);
    const p = g.player;
    if (p && p.lockT > 0 && Math.random() < 0.3) g.particles.add({ x: p.x + rand(0, p.w), y: p.y + rand(0, p.h), vx: rand(-30, 30), vy: rand(-30, 30), life: 0.3, size: 2, color: '#f35', add: true });
  }
  draw(ctx, g) {
    // 延迟力场
    for (const f of this.fields) {
      const a = Math.min(1, f.t * 4, (f.life - f.t) * 1.5);
      ctx.globalAlpha = a;
      const gr = ctx.createRadialGradient(f.x, f.y, 10, f.x, f.y, f.r);
      gr.addColorStop(0, 'rgba(80,255,150,0.03)'); gr.addColorStop(0.85, 'rgba(80,255,150,0.08)'); gr.addColorStop(1, 'rgba(80,255,150,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(120,255,180,0.45)'; ctx.lineWidth = 1.5; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -g.t * 6;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r - 2, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
      ctx.strokeStyle = 'rgba(160,255,200,0.8)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(f.x, f.y, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - f.t / f.life)); ctx.stroke();
      ctx.fillStyle = 'rgba(160,255,200,0.85)'; ctx.font = 'bold 10px ' + MONO; ctx.textAlign = 'center';
      ctx.fillText('SLOW ×0.5', f.x, f.y - 24); ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
    // 拉撒路残影
    for (const e of this.echoes) {
      const k = e.t / e.life, blink = k > 0.75 && (g.t * 14) % 2 < 1;
      ctx.globalAlpha = (blink ? 0.2 : 0.55) * Math.min(1, e.t * 10);
      const body = ghostBody(e.og), eh = e.h || 28;
      if (e.C && e.C.draw) { body.C = e.C; body.h = eh; }
      Player.prototype.drawBody.call(body, ctx, e.x + (Math.random() < 0.05 ? rand(-2, 2) : 0), e.y + 28 - (body.C ? eh : 28), e.f, 1, 1, g, '#2f9');
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = 'rgba(40,255,150,0.35)';
      for (let i = 0; i < 4; i++) ctx.fillRect(e.x - 2, e.y + ((g.t * 50 + i * 9) % 32) - 2, 24, 1);
      ctx.strokeStyle = '#2f9'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x + 10, e.y - 10, 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - k)); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  // 画在主角之上：死锁 / 掉帧状态
  drawOver(ctx, g) {
    const p = g.player; if (!p || p.dead) return;
    if (p.lockT > 0) {
      ctx.strokeStyle = `rgba(255,50,80,${0.6 + 0.3 * Math.sin(g.t * 20)})`; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const yy = p.y + 5 + i * 9; ctx.beginPath(); ctx.moveTo(p.x - 6, yy - 3); ctx.lineTo(p.x + p.w + 6, yy + 3); ctx.stroke(); }
      const x = p.cx, y = p.y - 18;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#f35'; ctx.beginPath(); ctx.arc(x, y, 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (p.lockT / PL3.LOCK)); ctx.stroke();
      ctx.fillStyle = '#f68'; ctx.fillRect(x - 3, y - 1, 6, 5); ctx.strokeStyle = '#f68'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y - 1, 2.5, Math.PI, 0); ctx.stroke();
    }
    if (p.lagT > 0) {
      ctx.fillStyle = `rgba(255,240,120,${0.6 + 0.4 * Math.sin(g.t * 16)})`; ctx.font = 'bold 10px ' + MONO; ctx.textAlign = 'center';
      ctx.fillText('LAG +0.5s', p.cx, p.y - (p.lockT > 0 ? 32 : 14)); ctx.textAlign = 'left';
    }
  }
  // 屏幕空间效果
  drawScreen(ctx, g) {
    const p = g.player; if (!p || g.state !== 'play') return;
    if (p.lagT > 0) {
      // 掉帧错觉：错位的色带 + 顶部警告
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i % 2 ? 'rgba(255,40,80,0.06)' : 'rgba(40,255,200,0.06)'; ctx.fillRect(0, rand(0, VH), VW, rand(6, 40)); }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(VW / 2 - 120, 70, 240, 26);
      ctx.fillStyle = '#ffe070'; ctx.font = 'bold 13px ' + MONO; ctx.textAlign = 'center';
      ctx.fillText(`FPS ${Math.floor(rand(7, 14))} · INPUT LAG +500ms`, VW / 2, 88); ctx.textAlign = 'left';
    }
    if (p.lockT > 0) {
      const a = 0.12 + 0.08 * Math.sin(g.t * 18);
      ctx.fillStyle = `rgba(255,20,60,${a})`; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#ff5a78'; ctx.font = 'bold 16px ' + MONO; ctx.textAlign = 'center';
      ctx.fillText(`DEADLOCK · ${p.lockT.toFixed(1)}s`, VW / 2, VH - 60); ctx.textAlign = 'left';
    }
    // 玩家在延迟力场内：边缘泛绿
    if (this.fields.some((f) => Math.hypot(p.cx - f.x, p.cy - f.y) < f.r)) {
      const gr = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VW * 0.62);
      gr.addColorStop(0, 'rgba(60,255,140,0)'); gr.addColorStop(1, 'rgba(60,255,140,0.12)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
    }
  }
}

// ============================================================
//  代码门与机关
// ============================================================
const PLATE_COLORS = { a: '#3cf', b: '#fc3', c: '#f6c', d: '#8f6' };
class CodePlate {
  constructor(id, cx, cy) {
    this.id = id; this.x = cx * TILE; this.floor = (cy + 1) * TILE; this.y = this.floor - 6; this.w = TILE; this.h = 6;
    this.pressed = false; this.by = null; this.col = PLATE_COLORS[id] || '#2f9';
  }
  update(dt, g) {
    const zone = { x: this.x + 3, y: this.floor - 12, w: TILE - 6, h: 14 }, p = g.player, was = this.pressed;
    this.by = null;
    if (g.state === 'play' && p.onGround && overlap(p, zone)) this.by = 'body';
    else if (g.matrix) for (const e of g.matrix.echoes) if (overlap({ x: e.x, y: e.y, w: 20, h: 28 }, zone)) { this.by = 'echo'; break; }
    this.pressed = !!this.by;
    if (this.pressed && !was) { Sound.sfx.plate(); g.particles.burst(this.x + 16, this.floor - 4, 6, { color: [this.col, '#fff'], smin: 30, smax: 90, angle: -Math.PI / 2, spread: 1, lmin: 0.2, lmax: 0.4, add: true }); }
  }
  draw(ctx, g) {
    const x = this.x, y = this.floor, d = this.pressed ? 2 : 0;
    ctx.fillStyle = '#062014'; ctx.fillRect(x + 1, y - 7 + d, TILE - 2, 7 - d);
    ctx.fillStyle = this.col; ctx.globalAlpha = this.pressed ? 1 : 0.55; ctx.fillRect(x + 3, y - 7 + d, TILE - 6, 2); ctx.globalAlpha = 1;
    if (this.pressed) {
      ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createLinearGradient(0, y - 40, 0, y); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, this.col + '8');
      ctx.fillStyle = gr; ctx.globalAlpha = 0.45; ctx.fillRect(x + 3, y - 40, TILE - 6, 40); ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = this.col; ctx.font = 'bold 9px ' + MONO; ctx.textAlign = 'center';
    ctx.fillText(this.id.toUpperCase(), x + 16, y - 10 - (this.pressed ? 0 : Math.sin(g.t * 3) * 1.5)); ctx.textAlign = 'left';
  }
}
class CodeGate {
  constructor(id, x0, y0, x1, y1, mode, g) {
    this.id = id; this.mode = mode || 'latch';
    this.x = x0 * TILE; this.y = y0 * TILE; this.w = (x1 - x0 + 1) * TILE; this.h = (y1 - y0 + 1) * TILE;
    this.solid = { x: this.x, y: this.y, w: this.w, h: this.h, active: true, oneWay: false, owner: this };
    g.world.solids.push(this.solid);
    this.open = false; this.k = 0; this.holdT = 0; this.plates = null; this.n = 0; this.col = PLATE_COLORS[id] || '#2f9';
  }
  update(dt, g) {
    if (!this.plates) this.plates = g.props.filter((p) => p instanceof CodePlate && p.id === this.id);
    this.n = this.plates.filter((p) => p.pressed).length;
    const all = this.plates.length > 0 && this.n === this.plates.length, was = this.open;
    if (this.mode === 'hold') {
      if (all) this.holdT = 0.3; else this.holdT -= dt;
      // 不会在主角正穿过门洞时关上
      this.open = this.holdT > 0 || (this.open && g.state === 'play' && overlap(g.player, this));
    } else if (all) this.open = true;
    this.solid.active = !this.open;
    if (this.open && !was) {
      Sound.sfx.gateOpen(); g.shake(3);
      g.particles.burst(this.x + this.w / 2, this.y + this.h / 2, 24, { color: [this.col, '#2f9', '#fff'], smin: 60, smax: 240, lmin: 0.3, lmax: 0.7, add: true, jx: this.w / 2, jy: this.h / 2 });
    } else if (!this.open && was) Sound.sfx.gateClose();
    this.k = approach(this.k, this.open ? 1 : 0, dt * 5);
  }
  draw(ctx, g) {
    const x = this.x, y = this.y, w = this.w, h = this.h, k = this.k;
    if (k >= 1) { // 打开：只剩一圈虚线轮廓
      ctx.strokeStyle = this.mode === 'hold' ? `rgba(255,220,120,${0.25 + 0.2 * Math.sin(g.t * 10)})` : 'rgba(60,255,150,0.15)';
      ctx.setLineDash([4, 5]); ctx.strokeRect(x + 2, y + 2, w - 4, h - 4); ctx.setLineDash([]);
      return;
    }
    ctx.save(); ctx.beginPath(); ctx.rect(x, y + h * k, w, h * (1 - k)); ctx.clip();
    ctx.fillStyle = 'rgba(4,26,14,0.88)'; ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'lighter'; ctx.font = '11px ' + MONO;
    for (let cx = x + 3; cx < x + w - 4; cx += 10) {
      const off = (g.t * 70 + cx * 7.3) % 22;
      for (let yy = y - 22 + off; yy < y + h; yy += 22) {
        ctx.fillStyle = 'rgba(60,255,150,0.35)';
        ctx.fillText(GLYPHS[Math.floor(hash2(cx, Math.floor(yy / 22 + g.t * 3)) * GLYPHS.length)], cx, yy);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = this.col; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.restore();
    // 锁 + 计数
    const cx = x + w / 2, cy = y + Math.min(h / 2, 60) + h * k;
    if (k < 0.5) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(cx - 17, cy - 16, 34, 32);
      ctx.fillStyle = this.col; ctx.fillRect(cx - 7, cy - 3, 14, 10);
      ctx.strokeStyle = this.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy - 3, 5, Math.PI, 0); ctx.stroke();
      ctx.font = 'bold 9px ' + MONO; ctx.textAlign = 'center'; ctx.fillText(`${this.id.toUpperCase()} ${this.n}/${this.plates ? this.plates.length : 2}`, cx, cy + 16);
      if (this.mode === 'hold') { ctx.fillStyle = '#ffd070'; ctx.fillText('HOLD', cx, cy - 12); }
      ctx.textAlign = 'left';
    }
    // 主角靠近时：画出到对应机关的虚线
    const p = g.player;
    if (this.plates && p && Math.abs(p.cx - cx) < 520 && Math.abs(p.cy - cy) < 360) {
      ctx.strokeStyle = this.col; ctx.globalAlpha = 0.28; ctx.setLineDash([3, 6]); ctx.lineWidth = 1;
      for (const pl of this.plates) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(pl.x + 16, pl.floor - 8); ctx.stroke(); }
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
  }
}

// ============================================================
//  红外线（解密激光）与高频激光网
// ============================================================
class IRBeam {
  constructor(o, g) {
    const W = g.world;
    this.always = !!o.always; this.guard = !!o.guard; this.period = o.period || 3; this.onDur = o.on || 1.6; this.offset = o.offset || 0; this.lt = 0;
    if (o.h) {
      this.horiz = true; this.x0 = o.x0 * TILE; this.x1 = (o.x1 + 1) * TILE; this.yc = o.y * TILE + 16;
      this.x = this.x0; this.y = this.yc - 10; this.w = this.x1 - this.x0; this.h = 20;
    } else {
      this.xc = o.cx * TILE + 16; this.y0 = o.cy * TILE;
      let yy = o.cy + 1; while (yy < W.h && !W.solidAt(o.cx, yy)) yy++;
      this.y1 = Math.min(yy * TILE, W.ph); this.x = this.xc - 10; this.y = this.y0; this.w = 20; this.h = this.y1 - this.y0;
    }
    this.on = this.always && !this.guard; this.warn = false; this.threat = true; this.fade = 1; this.guarding = true; this.slowed = false;
  }
  rect() { return this.horiz ? { x: this.x0 + 2, y: this.yc - 3, w: this.x1 - this.x0 - 4, h: 6 } : { x: this.xc - 4, y: this.y0 + 12, w: 8, h: this.y1 - this.y0 - 12 }; }
  update(dt, g) {
    const slow = g.matrix ? g.matrix.slowRect(this) : 1; this.slowed = slow < 1;
    this.lt += dt * slow;
    let on = true;
    if (!this.always) { const ph = (this.lt + this.offset) % this.period; on = ph < this.onDur; this.warn = !on && ph > this.period - 0.5; }
    if (this.guard) {
      // 监视进程：守着的执行官全部被消灭后，红外线随之关闭
      const r = this;
      this.guarding = g.enemies.some((e) => e.alive && e.irVulnerable && e.x + e.w > r.x0 - 64 && e.x < r.x1 + 64 && Math.abs(e.y + e.h / 2 - r.yc) < 240);
      if (!this.guarding) on = false;
    }
    this.fade = approach(this.fade, this.guard && !this.guarding ? 0 : 1, dt * 2);
    if (on && !this.on && !this.always && Math.abs(g.player.cx - (this.x + this.w / 2)) < 520) Sound.sfx.ir();
    this.on = on;
    if (!on) return;
    const R = this.rect();
    if (g.state === 'play' && overlap(g.player.hurt(), R)) g.killPlayer('laser');
    for (const e of g.enemies) if (e.alive && e.irVulnerable && overlap(e, R)) e.irHit(g);
    if (g.boss && g.boss.irHit && g.boss.active && overlap(g.boss.body(), R)) g.boss.irHit(g, this);
  }
  draw(ctx, g) {
    const R = this.rect(), f = 0.8 + Math.random() * 0.2;
    ctx.globalAlpha = Math.max(0.15, this.fade);
    // 发射器
    ctx.fillStyle = '#2a0a12';
    if (this.horiz) { ctx.fillRect(this.x0 - 2, this.yc - 7, 8, 14); ctx.fillRect(this.x1 - 6, this.yc - 7, 8, 14); }
    else { ctx.fillRect(this.xc - 10, this.y0, 20, 12); ctx.fillRect(this.xc - 10, this.y1 - 4, 20, 4); }
    ctx.fillStyle = this.on ? '#ff2a4a' : this.warn ? ((g.t * 16) % 2 < 1 ? '#f88' : '#400') : '#511';
    if (this.horiz) { ctx.fillRect(this.x0 + 2, this.yc - 2, 3, 4); ctx.fillRect(this.x1 - 5, this.yc - 2, 3, 4); } else ctx.fillRect(this.xc - 3, this.y0 + 8, 6, 3);
    if (this.on) {
      ctx.globalCompositeOperation = 'lighter';
      const col = this.slowed ? '120,255,180' : '255,40,70';
      ctx.fillStyle = `rgba(${col},${0.22 * f})`;
      if (this.horiz) ctx.fillRect(R.x, R.y - 5, R.w, R.h + 10); else ctx.fillRect(R.x - 5, R.y, R.w + 10, R.h);
      ctx.fillStyle = `rgba(${col},${0.75 * f})`; ctx.fillRect(R.x, R.y + (this.horiz ? 1 : 0), this.horiz ? R.w : R.w, this.horiz ? R.h - 2 : R.h);
      ctx.fillStyle = 'rgba(255,235,240,0.9)';
      if (this.horiz) ctx.fillRect(R.x, this.yc - 0.5, R.w, 1); else ctx.fillRect(this.xc - 0.5, R.y, 1, R.h);
      ctx.globalCompositeOperation = 'source-over';
    } else if (this.warn) {
      ctx.fillStyle = `rgba(255,60,80,${(g.t * 16) % 2 < 1 ? 0.35 : 0.1})`;
      if (this.horiz) ctx.fillRect(R.x, this.yc - 0.5, R.w, 1); else ctx.fillRect(this.xc - 0.5, R.y, 1, R.h);
    } else {
      ctx.strokeStyle = 'rgba(255,60,80,0.12)'; ctx.setLineDash([2, 6]); ctx.beginPath();
      if (this.horiz) { ctx.moveTo(R.x, this.yc); ctx.lineTo(R.x + R.w, this.yc); } else { ctx.moveTo(this.xc, R.y); ctx.lineTo(this.xc, R.y + R.h); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }
}
// 高频激光网：一整片区域（8 格宽）一起开关（开 0.6 秒 / 关 0.6 秒），正常速度下冲不过去；减速后关 1.2 秒
class LaserNet {
  constructor(x0, x1, y0, g) {
    const W = g.world; this.cols = [];
    for (let cx = x0; cx <= x1; cx++) { let yy = y0 + 1; while (yy < W.h && !W.solidAt(cx, yy)) yy++; this.cols.push({ x: cx * TILE, y1: Math.min(yy * TILE, W.ph) }); }
    this.x = x0 * TILE; this.y = y0 * TILE; this.w = (x1 - x0 + 1) * TILE; this.h = Math.max(...this.cols.map((c) => c.y1)) - this.y;
    this.period = 1.2; this.onDur = 0.6; this.lt = 0; this.on = false; this.warn = false; this.threat = true; this.slowed = false; this.ph = 0;
  }
  update(dt, g) {
    const slow = g.matrix ? g.matrix.slowRect(this) : 1; this.slowed = slow < 1;
    this.lt += dt * slow;
    const ph = this.lt % this.period, on = ph < this.onDur; this.ph = ph;
    this.warn = !on && ph > this.period - 0.16;
    const p = g.player;
    if (on && !this.on && Math.abs(p.cx - (this.x + this.w / 2)) < 420 && Math.abs(p.cy - (this.y + this.h / 2)) < 320) Sound.sfx.zap();
    this.on = on;
    if (!on) return;
    for (let i = 0; i < this.cols.length; i++) {
      const c = this.cols[i], R = { x: c.x + (i === 0 ? 8 : 0), y: this.y + 12, w: TILE - (i === 0 ? 8 : 0) - (i === this.cols.length - 1 ? 8 : 0), h: c.y1 - this.y - 12 };
      if (g.state === 'play' && overlap(p.hurt(), R)) { g.killPlayer('laser'); break; }
      for (const e of g.enemies) if (e.alive && e.irVulnerable && overlap(e, R)) e.irHit(g);
    }
  }
  draw(ctx, g) {
    const x = this.x, y = this.y, w = this.w, top = y + 12;
    ctx.fillStyle = '#1a0610'; ctx.fillRect(x, y, w, 12);
    ctx.fillStyle = this.slowed ? '#2f9' : '#ff2a55'; ctx.fillRect(x, y + 10, w * (this.ph / this.period), 2); // 周期进度条
    for (const c of this.cols) { ctx.fillStyle = this.on ? '#ff5a78' : '#401018'; ctx.fillRect(c.x + 14, y + 7, 4, 3); }
    if (this.slowed) { ctx.fillStyle = '#9fc'; ctx.font = 'bold 9px ' + MONO; ctx.textAlign = 'center'; ctx.fillText('×0.5', x + w / 2, y + 8); ctx.textAlign = 'left'; }
    const col = this.slowed ? '120,255,180' : '255,40,90';
    if (this.on) {
      ctx.globalCompositeOperation = 'lighter';
      const f = 0.75 + Math.random() * 0.25;
      for (const c of this.cols) {
        ctx.fillStyle = `rgba(${col},${0.1 * f})`; ctx.fillRect(c.x, top, TILE, c.y1 - top);
        ctx.fillStyle = `rgba(${col},${0.7 * f})`; ctx.fillRect(c.x + 15, top, 2, c.y1 - top);
      }
      const bot = Math.min(...this.cols.map((c) => c.y1));
      ctx.fillStyle = `rgba(${col},${0.45 * f})`;
      for (let yy = top + 12; yy < bot; yy += 24) ctx.fillRect(x + 4, yy, w - 8, 1.5);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.fillStyle = this.warn ? `rgba(${col},${(g.t * 20) % 2 < 1 ? 0.35 : 0.12})` : `rgba(${col},0.08)`;
      for (const c of this.cols) ctx.fillRect(c.x + 15.5, top, 1, c.y1 - top);
    }
  }
}

// ============================================================
//  逻辑地雷 + 数字平台
// ============================================================
class DataPlatform {
  constructor(x0, x1, row) {
    this.x0 = x0; this.x1 = x1; this.row = row;
    this.x = x0 * TILE; this.y = row * TILE; this.w = (x1 - x0 + 1) * TILE; this.h = TILE;
    this.solid = { x: this.x, y: this.y, w: this.w, h: this.h, active: true, oneWay: false, owner: this };
    this.state = 'solid'; this.t = 0; this.mines = [];
  }
  erase(g) {
    if (this.state !== 'solid') return;
    this.state = 'erasing'; this.t = 0; this.solid.active = false;
    for (const m of this.mines) m.state = 'gone';
    Sound.sfx.erase(); g.shake(5);
    for (let x = this.x; x < this.x + this.w; x += 16) g.particles.burst(x + 8, this.y + 10, 3, { color: ['#ff3a5c', '#2aff8a', '#fff'], smin: 30, smax: 140, grav: 300, lmin: 0.3, lmax: 0.8, szmin: 2, szmax: 4 });
  }
  restore(g, quiet) {
    this.state = 'solid'; this.t = 0; this.solid.active = true;
    for (const m of this.mines) { m.state = 'idle'; m.t = 0; }
    if (!quiet) g.particles.burst(this.x + this.w / 2, this.y + 8, 14, { color: '#9fc', smin: 10, smax: 80, lmin: 0.2, lmax: 0.5, add: true, jx: this.w / 2 });
  }
  update(dt, g) {
    this.t += dt;
    if (this.state === 'erasing' && this.t > 0.35) { this.state = 'void'; this.t = 0; }
    else if (this.state === 'void' && this.t > 5 && !overlap(g.player, this.solid)) this.restore(g);
  }
  draw(ctx, g) {
    if (this.state === 'void') {
      ctx.strokeStyle = 'rgba(255,60,90,0.18)'; ctx.setLineDash([4, 4]); ctx.strokeRect(this.x + 1, this.y + 1, this.w - 2, 14); ctx.setLineDash([]);
      return;
    }
    const armed = this.mines.some((m) => m.state === 'armed');
    if (this.state === 'erasing') ctx.globalAlpha = Math.max(0, 1 - this.t / 0.35);
    for (let cx = this.x0; cx <= this.x1; cx++) {
      const px = cx * TILE;
      if (this.state === 'erasing') { // 逐块溶解
        for (let i = 0; i < 16; i++) if (hash2(cx * 16 + i, this.row) > this.t / 0.35) { ctx.fillStyle = '#ff3a5c'; ctx.fillRect(px + (i % 4) * 8, this.y + Math.floor(i / 4) * 8, 7, 7); }
        continue;
      }
      drawDataBlock(ctx, px, this.y, cx === this.x0, cx === this.x1, armed && (g.t * 8) % 2 < 1);
    }
    ctx.globalAlpha = 1;
    if (armed) { // 扫描线
      const yy = this.y + ((g.t * 90) % TILE);
      ctx.fillStyle = 'rgba(255,80,110,0.7)'; ctx.fillRect(this.x, yy, this.w, 1);
    }
  }
}
class LogicMine {
  constructor(cx, cy, g) {
    const W = g.world, row = cy + 1;
    this.mx = cx * TILE + 6; this.my = (cy + 1) * TILE - 24; this.mw = 20; this.mh = 20;
    this.state = 'idle'; this.t = 0; this.plat = null; this.owner = false; this.beep = 0;
    W.dataPlat = W.dataPlat || {};
    const key = (x) => x + ',' + row;
    if (W.dataPlat[key(cx)]) this.plat = W.dataPlat[key(cx)];
    else if (W.tile(cx, row) === '=') {
      let x0 = cx, x1 = cx;
      while (x0 > 0 && W.tile(x0 - 1, row) === '=') x0--;
      while (x1 < W.w - 1 && W.tile(x1 + 1, row) === '=') x1++;
      this.plat = new DataPlatform(x0, x1, row);
      for (let x = x0; x <= x1; x++) { W.grid[row][x] = ' '; W.dataPlat[key(x)] = this.plat; }
      W.solids.push(this.plat.solid); this.owner = true;
    }
    if (this.plat) this.plat.mines.push(this);
    const P = this.plat;
    this.x = P ? Math.min(P.x, this.mx) : this.mx; this.y = this.my - 10;
    this.w = P ? Math.max(P.x + P.w, this.mx + this.mw) - this.x : this.mw; this.h = P ? P.y + P.h - this.y : this.mh + 10;
  }
  onRespawn(g) { if (this.owner && this.plat) this.plat.restore(g, true); if (!this.plat) this.state = 'idle'; }
  update(dt, g) {
    const P = this.plat, p = g.player;
    if (this.owner && P) P.update(dt, g);
    if (this.state === 'idle') {
      const onIt = g.state === 'play' && p.onGround && (!P || p.ground === P.solid) && p.x + p.w > this.mx - 2 && p.x < this.mx + this.mw + 2 && Math.abs(p.y + p.h - (this.my + 24)) < 4;
      if (onIt) {
        this.state = 'armed'; this.t = 0; this.beep = 0; Sound.sfx.mineArm(); g.shake(3);
        g.particles.add({ x: this.mx + 10, y: this.my + 10, size: 6, grow: 200, life: 0.35, shape: 'ring', color: '#f35', add: true });
        if (!g.mineHinted) { g.mineHinted = true; g.toastHint('逻辑地雷！2 秒后整块数字平台会被抹除——马上跳走'); }
      }
    } else if (this.state === 'armed') {
      const slow = g.matrix ? g.matrix.slowAt(this.mx + 10, this.my + 10) : 1;
      this.t += dt * slow; this.beep -= dt * slow;
      if (this.beep <= 0) { this.beep = this.t > 1.4 ? 0.12 : 0.25; Sound.sfx.mineBeep(); }
      if (this.t >= PL3.MINE_T) {
        if (P) P.erase(g);
        else { this.state = 'gone'; Sound.sfx.erase(); g.flash(0.2, '#f35'); }
      }
    }
  }
  draw(ctx, g) {
    if (this.owner && this.plat) this.plat.draw(ctx, g);
    if (this.state === 'gone') return;
    const x = this.mx + 10, bob = this.state === 'idle' ? Math.sin(g.t * 2.2 + this.mx) * 2 : 0, y = this.my + 8 + bob;
    const armed = this.state === 'armed', col = armed ? '255,40,70' : '60,255,150';
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(x, y, 2, x, y, 24); gr.addColorStop(0, `rgba(${col},0.5)`); gr.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = gr; ctx.fillRect(x - 24, y - 24, 48, 48);
    ctx.globalCompositeOperation = 'source-over';
    // 伪装：一个发光的「安全数据块」
    ctx.fillStyle = armed ? '#3a0610' : '#07301a'; ctx.fillRect(x - 9, y - 9, 18, 18);
    ctx.strokeStyle = `rgb(${col})`; ctx.lineWidth = 1.5; ctx.strokeRect(x - 9, y - 9, 18, 18);
    ctx.fillStyle = `rgb(${col})`;
    if (armed) {
      ctx.font = 'bold 12px ' + MONO; ctx.textAlign = 'center'; ctx.fillText(Math.ceil(PL3.MINE_T - this.t), x, y + 4); ctx.textAlign = 'left';
    } else { ctx.fillRect(x - 5, y - 1.5, 10, 3); ctx.fillRect(x - 1.5, y - 5, 3, 10); }
    ctx.font = 'bold 7px ' + MONO; ctx.textAlign = 'center';
    // 唯一的破绽：它的「SAFE」标签偶尔会闪成别的字
    ctx.fillText(armed ? 'ERASE' : (hash2(Math.floor(g.t * 5), this.mx) < 0.06 ? 'S#FE' : 'SAFE'), x, y - 13); ctx.textAlign = 'left';
  }
}

// ============================================================
//  敌人
// ============================================================

// ---------------- 1. 死锁黑客：在几个固定的虚空平台之间随机瞬移；碰到会被锁死 1.5 秒 ----------------
class DeadlockGlitch {
  constructor(s) {
    this.w = 20; this.h = 30; this.alive = true; this.colors = ['#0a1a10', '#2f9', '#f35'];
    this.pts = s.anchors.map(([cx, cy]) => ({ x: cx * TILE + 6, y: (cy + 1) * TILE - this.h }));
    this.idx = 0; this.x = this.pts[0].x; this.y = this.pts[0].y;
    this.state = 'idle'; this.t = rand(0.8, 1.6); this.ft = Math.random() * 5;
  }
  get solid() { return this.state === 'idle' || this.state === 'out'; }
  pickNext(g) {
    const p = g.player, opts = [];
    for (let i = 0; i < this.pts.length; i++) if (i !== this.idx && Math.hypot(p.cx - (this.pts[i].x + 10), p.cy - (this.pts[i].y + 15)) > 56) opts.push(i);
    if (!opts.length) for (let i = 0; i < this.pts.length; i++) if (i !== this.idx) opts.push(i);
    if (opts.length) this.idx = pick(opts);
    this.x = this.pts[this.idx].x; this.y = this.pts[this.idx].y;
  }
  update(dt, g) {
    this.t -= dt; this.ft += dt;
    if (this.state === 'idle' && this.t <= 0) { this.state = 'out'; this.t = 0.35; if (Math.abs(g.player.cx - this.x) < 520) Sound.sfx.glitch(); }
    else if (this.state === 'out' && this.t <= 0) { this.state = 'gone'; this.t = 0.3; this.pickNext(g); }
    else if (this.state === 'gone' && this.t <= 0) { this.state = 'in'; this.t = 0.3; }
    else if (this.state === 'in' && this.t <= 0) { this.state = 'idle'; this.t = rand(1.1, 2.0); }
  }
  touch(p, g) {
    if (!this.solid) return;
    if (stompable(p, this, 10)) { g.killEnemy(this); g.stompBounce(); return; }
    if (p.lockImmune > 0) return;
    p.lockT = PL3.LOCK; p.lockImmune = PL3.LOCK + 0.8; p.vx = 0; p.dashT = 0; p.jumping = false; if (p.vy < 0) p.vy *= 0.3;
    Sound.sfx.lock(); g.shake(5); g.freeze(0.05); Input.rumble(0.4, 0.6, 200);
    g.particles.burst(p.cx, p.cy, 16, { color: ['#f35', '#2f9', '#fff'], shape: 'spark', smin: 60, smax: 220, lmin: 0.2, lmax: 0.4, add: true });
    if (!g.lockHinted) { g.lockHinted = true; g.toastHint(charText('死锁！1.5 秒内无法移动、跳跃和冲刺。可以踩它、或者用武器把它打散')); }
    this.state = 'out'; this.t = 0.15;
  }
  onStrike(g) { if (!this.solid) return 'none'; Sound.sfx.slashHit(); g.killEnemy(this); return 'kill'; }
  draw(ctx, g) {
    // 它可能出现的位置
    ctx.strokeStyle = 'rgba(255,60,90,0.22)'; ctx.lineWidth = 1;
    for (const a of this.pts) { ctx.beginPath(); ctx.moveTo(a.x - 3, a.y + this.h - 6); ctx.lineTo(a.x - 3, a.y + this.h); ctx.lineTo(a.x + this.w + 3, a.y + this.h); ctx.lineTo(a.x + this.w + 3, a.y + this.h - 6); ctx.stroke(); }
    if (this.state === 'gone') return;
    const k = this.state === 'in' ? 1 - this.t / 0.3 : this.state === 'out' ? this.t / 0.35 : 1;
    const x = this.x, y = this.y;
    ctx.globalAlpha = (this.state === 'in' ? 0.35 : 0.8) * k + (this.state === 'out' && Math.random() < 0.3 ? 0.2 : 0);
    for (let i = 0; i < 6; i++) { // 横向切片：故障感
      const sy = y + i * 5, off = this.solid && this.state === 'idle' ? (Math.random() < 0.06 ? rand(-4, 4) : 0) : rand(-6, 6) * (1 - k + 0.3);
      ctx.save(); ctx.beginPath(); ctx.rect(x - 8, sy, this.w + 16, 5); ctx.clip(); ctx.translate(off, 0);
      ctx.fillStyle = '#030805';
      ctx.beginPath(); ctx.moveTo(x + 2, y + this.h); ctx.lineTo(x + 4, y + 10); ctx.quadraticCurveTo(x + 10, y - 2, x + 16, y + 10); ctx.lineTo(x + 18, y + this.h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(60,255,150,0.7)'; ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#f35'; ctx.fillRect(x + 6, y + 8, 3, 2); ctx.fillRect(x + 12, y + 8, 3, 2);
    ctx.fillStyle = 'rgba(60,255,150,0.8)'; ctx.font = '8px ' + MONO;
    ctx.fillText(GLYPHS[Math.floor(this.ft * 8) % GLYPHS.length], x + 7, y + 22);
    ctx.globalAlpha = 1;
  }
}

// ---------------- 2. 延迟泡沫：打碎后产生延迟力场（机关、弹幕减速 50%）；一段时间后重新生成 ----------------
class LagBubble {
  constructor(cx, cy) { this.ax = cx * TILE + 16; this.ay = cy * TILE + 16; this.w = 26; this.h = 26; this.x = this.ax - 13; this.y = this.ay - 13; this.t = Math.random() * 6; this.state = 'float'; this.pt = 0; this.alive = true; this.colors = ['#2f9', '#bfe']; }
  update(dt, g) {
    this.t += dt;
    if (this.state === 'float') { this.x = this.ax - 13 + Math.sin(this.t * 0.9) * 8; this.y = this.ay - 13 + Math.sin(this.t * 1.7) * 5; }
    else {
      this.pt += dt;
      const live = g.matrix && g.matrix.fields.some((f) => f.src === this);
      if (!live && this.pt > 2) { this.state = 'float'; this.t = 0; g.particles.burst(this.ax, this.ay, 10, { color: '#9fc', smin: 10, smax: 60, lmin: 0.2, lmax: 0.5, add: true }); }
    }
  }
  pop(g) {
    this.state = 'popped'; this.pt = 0; Sound.sfx.bubble();
    g.particles.burst(this.x + 13, this.y + 13, 22, { color: ['#2f9', '#bfe', '#fff'], smin: 40, smax: 240, lmin: 0.3, lmax: 0.7, add: true });
    if (g.matrix) g.matrix.addField(this.x + 13, this.y + 13, this, g);
  }
  touch(p, g) { if (this.state !== 'float') return; const s = stompable(p, this, 12); this.pop(g); if (s) g.stompBounce(0.9); }
  onStrike(g) { if (this.state !== 'float') return 'none'; this.pop(g); return 'kill'; }
  draw(ctx, g) {
    if (this.state !== 'float') { ctx.strokeStyle = 'rgba(60,255,150,0.15)'; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.arc(this.ax, this.ay, 10, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); return; }
    const x = this.x + 13, y = this.y + 13, a = Math.min(1, this.t * 2);
    ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, 16); gr.addColorStop(0, 'rgba(200,255,220,0.8)'); gr.addColorStop(0.6, 'rgba(60,255,150,0.35)'); gr.addColorStop(1, 'rgba(60,255,150,0.05)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(160,255,200,0.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.stroke();
    // 里面慢慢转的时钟
    ctx.strokeStyle = '#0a3a20'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(g.t * 0.8) * 7, y + Math.sin(g.t * 0.8) * 7); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(g.t * 0.1) * 5, y + Math.sin(g.t * 0.1) * 5); ctx.stroke();
    ctx.fillStyle = 'rgba(160,255,200,0.7)'; ctx.font = '8px ' + MONO;
    for (let i = 0; i < 3; i++) { const an = g.t * 1.2 + i * 2.1; ctx.fillText(String((i + Math.floor(g.t)) % 10), x + Math.cos(an) * 19 - 2, y + Math.sin(an) * 19 + 3); }
    ctx.globalAlpha = 1;
  }
}

// ---------------- 3. 掉帧幽灵：平时完全隐形；你跳到半空时出现在脚下尖叫，输入延迟 0.5 秒 ----------------
class FpsPhantom {
  constructor(cx, cy) { this.ax = cx * TILE + 16; this.ay = cy * TILE + 16; this.w = 30; this.h = 26; this.x = this.ax - 15; this.y = this.ay - 13; this.state = 'hide'; this.t = 0; this.cd = 0; this.alive = true; this.colors = ['#dfe', '#2f9', '#fff']; }
  update(dt, g) {
    const p = g.player; this.t += dt; this.cd -= dt;
    if (this.state === 'hide') {
      this.x = this.ax - 15; this.y = this.ay - 13;
      if (this.cd <= 0 && g.state === 'play' && !p.onGround && !p.inWater && p.airT > 0.12 && Math.abs(p.cx - this.ax) < 110 && p.y + p.h < this.ay + 48 && p.y + p.h > this.ay - 300) {
        this.state = 'show'; this.t = 0; this.cd = 3.2;
        p.lagT = Math.max(p.lagT, PL3.LAG_T); p.lagHit = true;
        Sound.sfx.screech(); g.shake(3); Input.rumble(0.2, 0.5, 250);
        if (!g.lagFpsHinted) { g.lagFpsHinted = true; g.toastHint('掉帧幽灵：输入延迟 0.5 秒，持续约 2 秒——提前按键，别断节奏'); }
      }
    } else {
      // 贴在主角脚下，画面像掉帧一样一顿一顿地跟着
      if (Math.floor(this.t * 12) !== Math.floor((this.t - dt) * 12)) { this.x = p.cx - 15; this.y = p.y + p.h + 12; }
      if (this.t > 0.9) this.state = 'hide';
    }
  }
  touch() {}
  onStrike(g) { if (this.state !== 'show') return 'none'; Sound.sfx.slashHit(); g.killEnemy(this); return 'kill'; }
  draw(ctx, g) {
    if (this.state === 'hide') { // 几乎看不见：偶尔闪过一个像素
      if (hash2(Math.floor(g.t * 7), this.ax) < 0.05) { ctx.fillStyle = 'rgba(200,255,230,0.25)'; ctx.fillRect(this.ax + rand(-8, 8), this.ay + rand(-8, 8), 2, 2); }
      return;
    }
    const x = this.x + 15, y = this.y + 13, a = this.t < 0.1 ? this.t * 10 : Math.min(1, (0.9 - this.t) * 4);
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = 'rgba(220,255,235,0.85)';
    ctx.beginPath(); ctx.moveTo(x - 14, y + 12); ctx.lineTo(x - 12, y - 6); ctx.quadraticCurveTo(x, y - 18, x + 12, y - 6); ctx.lineTo(x + 14, y + 12);
    for (let i = 0; i < 5; i++) ctx.lineTo(x + 14 - (i + 0.5) * 5.6, y + (i % 2 ? 12 : 6));
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#021'; ctx.fillRect(x - 7, y - 6, 4, 5); ctx.fillRect(x + 3, y - 6, 4, 5);
    ctx.beginPath(); ctx.ellipse(x, y + 4, 4, 5 + Math.sin(g.t * 60) * 2, 0, 0, Math.PI * 2); ctx.fill(); // 尖叫的嘴
    // 声波
    ctx.strokeStyle = 'rgba(255,240,120,0.6)'; ctx.lineWidth = 1.5;
    for (let i = 1; i <= 3; i++) { const r = ((this.t * 90 + i * 14) % 42) + 12; ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke(); }
    ctx.font = 'bold 8px ' + MONO; ctx.fillStyle = '#ffe070'; ctx.textAlign = 'center'; ctx.fillText('FPS↓', x, y - 20); ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
}

// ---------------- 4. 镜像执行官：镜像你的操作（你往左它往右，你跳它也跳）。打不中它 ----------------
class MirrorExecutor {
  constructor(cx, cy) {
    this.w = 20; this.h = 28; this.x = cx * TILE + 6; this.y = (cy + 1) * TILE - this.h;
    this.vx = 0; this.vy = 0; this.facing = -1; this.awake = false; this.grounded = false; this.coyote = 0; this.jumping = false;
    this.djLeft = 1; this.dashT = 0; this.canDash = true; this.dashDir = { x: 0, y: 0 }; this.run = 0;
    this.alive = true; this.irVulnerable = true; this.colors = ['#b01e2c', '#8a1420', '#fff'];
  }
  update(dt, g) {
    const p = g.player, W = g.world, c = p.ctl || {};
    if (!this.awake && g.state === 'play' && Math.abs(p.cx - (this.x + 10)) < 680 && Math.abs(p.cy - (this.y + 14)) < 300) {
      this.awake = true; Sound.sfx.mirrorWake();
      if (!g.mirrorHinted) { g.mirrorHinted = true; g.toastHint('镜像执行官：你往左它往右，你跳它也跳。武器打不中它——引它撞上红外线'); }
    }
    const live = this.awake && g.state === 'play' && c.tick === g.t;
    const mx = live ? -(c.mx || 0) : 0;
    if (live && c.dashed && this.canDash && c.dashDir) {
      this.dashDir = { x: -c.dashDir.x, y: c.dashDir.y }; this.dashT = PL.DASH_TIME; this.canDash = false; this.jumping = false;
      g.particles.burst(this.x + 10, this.y + 14, 8, { color: ['#f35', '#fff'], smin: 60, smax: 180, lmin: 0.15, lmax: 0.3, add: true });
    }
    if (this.dashT > 0) {
      this.dashT -= dt; this.vx = this.dashDir.x * PL.DASH_SPEED; this.vy = this.dashDir.y * PL.DASH_SPEED;
      if (this.dashT <= 0) { this.vx *= 0.6; this.vy = this.vy < 0 ? this.vy * 0.45 : this.vy * 0.5; }
    } else {
      const acc = this.grounded ? (mx ? PL.ACC_G : PL.DEC_G) : (mx ? PL.ACC_A : PL.DEC_A);
      this.vx = approach(this.vx, mx * PL.RUN, acc * dt);
      let grav = GRAV;
      if (this.jumping && c.jumpHeld && Math.abs(this.vy) < 100) grav *= 0.5;
      this.vy = Math.min(this.vy + grav * dt, MAXFALL);
      if (this.jumping && !(live && c.jumpHeld) && this.vy < -220) { this.vy *= 0.48; this.jumping = false; }
      if (this.vy >= 0) this.jumping = false;
    }
    if (live && c.jumped) {
      if (this.grounded || this.coyote > 0) { this.vy = -PL.JUMP; this.jumping = true; this.grounded = false; this.coyote = 0; this.dashT = 0; }
      else if (this.djLeft > 0) { this.vy = -PL.DJUMP; this.djLeft = 0; this.jumping = true; this.dashT = 0; }
    }
    if (mx) this.facing = mx; else if (live) this.facing = -p.facing;
    if (W.moveX(this, this.vx * dt)) this.vx = 0;
    const ry = W.moveY(this, this.vy * dt);
    this.grounded = !!ry && this.vy >= 0;
    if (ry) { this.vy = 0; if (this.dashT > 0 && this.dashDir.y < 0) this.dashT = 0; }
    if (this.grounded) { this.coyote = PL.COYOTE; this.djLeft = 1; if (this.dashT <= 0) this.canDash = true; } else this.coyote -= dt;
    if (this.grounded && Math.abs(this.vx) > 20) this.run += dt * Math.abs(this.vx) * 0.055;
    // 尖刺 / 虚空
    if (this.y > W.ph) { this.alive = false; return; }
    const x0 = Math.floor((this.x + 4) / TILE), x1 = Math.floor((this.x + this.w - 4) / TILE), y0 = Math.floor((this.y + 6) / TILE), y1 = Math.floor((this.y + this.h - 2) / TILE);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) { const t = W.tile(cx, cy); if (t === '^' || t === 'v') { this.irHit(g); return; } }
  }
  irHit(g) {
    if (!this.alive) return;
    g.killEnemy(this); Sound.sfx.mirrorHit();
    g.particles.burst(this.x + 10, this.y + 14, 18, { color: ['#f35', '#fff', '#2f9'], shape: 'shard', smin: 60, smax: 260, grav: 400, lmin: 0.4, lmax: 0.9, szmin: 2, szmax: 5 });
  }
  touch(p, g) { if (this.awake || overlap(p.hurt(), this)) g.killPlayer(); }
  onStrike(g, kind) {
    Sound.sfx.block(); g.shake(2);
    g.particles.burst(this.x + 10, this.y + 12, 8, { color: ['#f35', '#fff'], shape: 'spark', smin: 80, smax: 220, lmin: 0.1, lmax: 0.25, add: true });
    g.toastHint('它镜像了你的攻击——打不中。把它引进红外线、激光网或者虚空里');
    return kind === 'dash' ? 'block' : 'bounced';
  }
  draw(ctx, g) {
    const x = this.x + this.w / 2, y = this.y + this.h, t = g.t, p = g.player;
    // 镜像轴：你和它之间的中线
    if (this.awake && p && !p.dead && Math.abs(p.cx - x) < 700) {
      const mxl = (p.cx + x) / 2, top = Math.min(p.y, this.y) - 30, bot = Math.max(p.y + p.h, y) + 10;
      ctx.strokeStyle = 'rgba(255,60,90,0.18)'; ctx.setLineDash([2, 6]); ctx.beginPath(); ctx.moveTo(mxl, top); ctx.lineTo(mxl, bot); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(this.facing, 1);
    const moving = this.grounded && Math.abs(this.vx) > 20, ph = this.run;
    let l1 = -5, l2 = 2, ly1 = 0, ly2 = 0;
    if (moving) { l1 += Math.sin(ph) * 4; l2 -= Math.sin(ph) * 4; ly1 = -Math.max(0, Math.cos(ph)) * 3; ly2 = -Math.max(0, -Math.cos(ph)) * 3; }
    else if (!this.grounded) { l1 = -6; l2 = 3; ly1 = -3; ly2 = -1; }
    ctx.fillStyle = '#2a0a10'; ctx.fillRect(l1, -10 + ly1, 4, 10); ctx.fillRect(l2, -10 + ly2, 4, 10);
    // 斗篷
    ctx.fillStyle = '#8a1420'; ctx.beginPath(); ctx.moveTo(-10, -7); ctx.lineTo(-7, -24); ctx.lineTo(7, -24); ctx.lineTo(9, -7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,120,130,0.55)'; for (let i = 0; i < 4; i++) ctx.fillRect(-6 + i * 4, -22 + ((t * 20 + i * 7) % 13), 1.5, 3); // 斗篷上流动的代码
    // 兜帽
    ctx.fillStyle = '#b01e2c'; ctx.beginPath(); ctx.moveTo(-8, -19); ctx.quadraticCurveTo(-9, -34, 0, -35); ctx.quadraticCurveTo(9, -34, 8, -19); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#12040a'; ctx.beginPath(); ctx.ellipse(2, -26, 4.5, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = this.awake ? '#fff' : '#a66'; ctx.fillRect(2, -28, 2, 2); ctx.fillRect(5, -28, 1.5, 2);
    if (this.dashT > 0) { ctx.fillStyle = 'rgba(255,60,90,0.4)'; ctx.fillRect(-18, -24, 10, 18); }
    ctx.restore();
    if (!this.awake) { ctx.fillStyle = 'rgba(255,120,130,0.5)'; ctx.font = '9px ' + MONO; ctx.textAlign = 'center'; ctx.fillText('z', x + 8, this.y - 12 - Math.sin(t * 2) * 3); ctx.textAlign = 'left'; }
  }
}

// ---------------- Boss 的回放弹：会被延迟力场减速；仪仗军刀可以弹反 ----------------
class ReplayOrb {
  constructor(x, y, vx, vy) { this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.t = 0; this.dead = false; }
  update(dt, g) {
    const s = g.matrix ? g.matrix.slowAt(this.x, this.y) : 1;
    this.t += dt; this.x += this.vx * dt * s; this.y += this.vy * dt * s;
    if (g.world.pointSolid(this.x, this.y) || this.t > 7) { this.dead = true; g.particles.burst(this.x, this.y, 6, { color: ['#f35', '#fff'], shape: 'spark', smin: 40, smax: 140, lmin: 0.1, lmax: 0.25, add: true }); return; }
    if (g.state === 'play' && Math.hypot(g.player.cx - this.x, g.player.cy - this.y) < 13) { this.dead = true; g.killPlayer('orb'); }
  }
  defuse(g) { this.dead = true; Sound.sfx.block(); g.particles.burst(this.x, this.y, 10, { color: ['#f35', '#fff'], smin: 40, smax: 160, lmin: 0.2, lmax: 0.4, add: true }); }
  draw(ctx, g) {
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(this.x, this.y, 1, this.x, this.y, 14); gr.addColorStop(0, 'rgba(255,220,230,0.95)'); gr.addColorStop(0.45, 'rgba(255,40,80,0.6)'); gr.addColorStop(1, 'rgba(255,40,80,0)');
    ctx.fillStyle = gr; ctx.fillRect(this.x - 14, this.y - 14, 28, 28);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#fff'; ctx.font = 'bold 8px ' + MONO; ctx.textAlign = 'center'; ctx.fillText(GLYPHS[Math.floor(this.t * 10) % GLYPHS.length], this.x, this.y + 3); ctx.textAlign = 'left';
  }
}

// 地图字符 → 敌人
const _makeEnemyCh2 = makeEnemy;
makeEnemy = function (s, world) { // eslint-disable-line no-func-assign
  switch (s.type) {
    case 'glitch': return new DeadlockGlitch(s);
    case 'l': return new LagBubble(s.cx, s.cy);
    case 'f': return new FpsPhantom(s.cx, s.cy);
    case 'X': return new MirrorExecutor(s.cx, s.cy);
    default: return _makeEnemyCh2(s, world);
  }
};
// 地图字符 → 场景物件
PROP_FACTORIES.M = (x, y, g) => new LogicMine(x, y, g);
PROP_FACTORIES.I = (x, y, g) => new IRBeam({ cx: x, cy: y, offset: (x * 0.73) % 3 }, g);

// ============================================================
//  Boss：算法审判官 · 镜像拉撒路（The Mirror Lazarus）
//  它会完美复制你 5 秒前的走位和跳跃（血量越低，延迟越短）。武器打不中它，
//  但它的体积比你大一号——场地两侧高台上有一道「解密激光」，刚好高过你的头顶，
//  却低于它的头顶。走到激光下面，5 秒后它就会自己撞进去。
// ============================================================
const MIR_DELAY = [5, 4.2, 3.4];
class MirrorLazarus {
  constructor(g, short) {
    this.maxHp = 6; this.hp = 6; this.state = 'intro'; this.t = 0; this.short = short;
    this.hist = []; this.clock = 0; this.delay = MIR_DELAY[0]; this.x = g.player.cx; this.y = g.player.y + g.player.h; this.f = 1; this.air = false; this.vx = 0; this.run = 0;
    this.flash = 0; this.hitCd = 0; this.dead = false; this.shotT = 3; this.phaseSeen = 1; this.firstHit = true;
    this.title = '算法审判官 · 镜像拉撒路'; this.marks = [4 / 6, 2 / 6];
  }
  get active() { return !['dying', 'dead'].includes(this.state); }
  get phase() { return this.hp > 4 ? 1 : this.hp > 2 ? 2 : 3; }
  get waveInfo() {
    if (this.state === 'record') return `深度学习中  ${Math.min(99, Math.floor(this.clock / this.delay * 100))}%`;
    if (this.state === 'hunt') return `回放延迟  ${this.delay.toFixed(1)}s`;
    return '';
  }
  body() { return { x: this.x - 20, y: this.y - 56, w: 40, h: 56 }; }
  stopSounds() {}
  // 取 clock - delay 时刻的录像帧
  sample() {
    const T = this.clock - this.delay, H = this.hist;
    while (H.length > 2 && H[1].t <= T) H.shift();
    if (H.length < 2 || T <= H[0].t) return H[0];
    const a = H[0], b = H[1], k = clamp((T - a.t) / Math.max(1e-6, b.t - a.t), 0, 1);
    return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), f: b.f, air: b.air, vx: b.vx, run: b.run };
  }
  update(dt, g) {
    this.t += dt; this.flash = Math.max(0, this.flash - dt); this.hitCd -= dt;
    const p = g.player, playing = g.state === 'play';
    if (this.state === 'intro') {
      if (this.t > (this.short ? 0.6 : 1.6)) {
        if (!this.short) g.say(RADIO.mirrorIntro);
        this.state = 'record'; this.t = 0; this.clock = 0; this.hist = []; Sound.sfx.bossForm(); g.shake(6);
      }
      return;
    }
    if (!this.active) {
      if (this.state === 'dying') {
        if (Math.random() < 0.35) { Sound.sfx.glitch(); g.particles.burst(this.x + rand(-20, 20), this.y - rand(0, 56), 10, { color: ['#f35', '#fff', '#2f9'], shape: 'shard', smin: 40, smax: 220, lmin: 0.3, lmax: 0.7, add: true }); }
        if (this.t > 2.6) {
          this.state = 'dead'; this.dead = true; Sound.sfx.bigExplode(); g.shake(22); g.flash(1, '#fdd');
          g.particles.burst(this.x, this.y - 28, 70, { color: ['#f35', '#fff', '#2f9', '#b01e2c'], shape: 'shard', smin: 120, smax: 520, grav: 900, lmin: 0.8, lmax: 1.8, szmin: 3, szmax: 9 });
          g.projectiles = []; g.onBossDefeated();
        }
      }
      return;
    }
    if (!playing) return;
    this.clock += dt;
    this.hist.push({ t: this.clock, x: p.cx, y: p.y + p.h, f: p.facing, air: !p.onGround, vx: p.vx, run: p.run });
    if (this.state === 'record') {
      const s = this.hist[0]; this.x = s.x; this.y = s.y; this.f = s.f;
      if (this.clock >= this.delay) { this.state = 'hunt'; this.t = 0; Sound.sfx.mirrorWake(); g.shake(8); }
      return;
    }
    // 回放
    const s = this.sample();
    if (s) { this.vx = (s.x - this.x) / dt; this.x = s.x; this.y = s.y; this.f = s.f; this.air = s.air; this.run = s.run; }
    // 二阶段起：发射回放弹
    if (this.phase >= 2) {
      this.shotT -= dt;
      if (this.shotT <= 0) {
        this.shotT = this.phase >= 3 ? 1.9 : 2.8;
        const ox = this.x, oy = this.y - 40, a = Math.atan2(p.cy - oy, p.cx - ox), sp = this.phase >= 3 ? 215 : 175;
        g.projectiles.push(new ReplayOrb(ox, oy, Math.cos(a) * sp, Math.sin(a) * sp)); Sound.sfx.throw();
      }
    }
    if (this.phase > this.phaseSeen) { this.phaseSeen = this.phase; this.delay = MIR_DELAY[this.phase - 1]; g.say(this.phase === 2 ? RADIO.mirrorPhase2 : RADIO.mirrorPhase3); }
  }
  // 被解密激光命中
  irHit(g) {
    if (this.state !== 'hunt' || this.hitCd > 0) return;
    this.hp = Math.max(0, this.hp - 1); this.flash = 0.2; this.hitCd = 2.4;
    Sound.sfx.mirrorHit(); Sound.sfx.hit(); g.shake(10); g.freeze(0.06);
    g.particles.burst(this.x, this.y - 30, 26, { color: ['#f35', '#fff', '#2f9'], shape: 'spark', smin: 100, smax: 380, lmin: 0.2, lmax: 0.5, add: true });
    if (this.firstHit) { this.firstHit = false; g.say(RADIO.mirrorHit); }
    if (this.hp <= 0) { this.state = 'dying'; this.t = 0; Sound.sfx.roar(); }
  }
  touchPlayer(g) {
    if (this.state !== 'hunt' || this.hitCd > 0 || g.state !== 'play') return;
    const b = this.body(), inner = { x: b.x + 6, y: b.y + 8, w: b.w - 12, h: b.h - 8 };
    if (overlap(g.player.hurt(), inner)) g.killPlayer();
  }
  slashed(g, ab) {
    if (this.state !== 'hunt' || !overlap(ab, this.body())) return;
    g.player.atkHits.add(this); Sound.sfx.block();
    g.toastHint('武器对镜像无效——它会复制你 5 秒前的走位。走到高台的激光下面，让它自己撞进去');
  }
  onShot(s, g) { if (this.state === 'hunt' && s.type !== 'wave' && s.type !== 'cloud' && overlap(s.box, this.body())) { s.dead = true; Sound.sfx.ricochet(); s.burst(g, 6); } }
  draw(ctx, g) {
    if (this.state === 'dead' || this.state === 'intro') return;
    const t = g.t;
    // 它接下来要走的路：你过去几秒的轨迹
    if (this.hist.length > 2 && this.active) {
      ctx.strokeStyle = 'rgba(255,60,90,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([3, 7]); ctx.beginPath();
      for (let i = 0; i < this.hist.length; i += 6) { const h = this.hist[i]; i ? ctx.lineTo(h.x, h.y - 28) : ctx.moveTo(h.x, h.y - 28); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    const body = Object.assign(ghostBody(!this.air), { vx: this.vx, run: this.run });
    // 镜像的是玩家当前的角色：小扫的周目里画成放大的小扫（放大到和判定框差不多高）
    const pc = g.player && g.player.C, alt = pc && pc.draw, S = alt ? Math.max(2, Math.round(56 / pc.h)) : 2, by = alt ? -pc.h : -28; // 放大到和判定框（约 56 像素高）差不多
    if (alt) { body.C = pc; body.h = pc.h; }
    if (this.state === 'record') { // 从录像的第一帧开始逐行成形
      const k = clamp(this.clock / this.delay, 0, 1);
      ctx.save(); ctx.beginPath(); ctx.rect(this.x - 40, this.y - 64 * k, 80, 64 * k); ctx.clip();
      ctx.globalAlpha = 0.25 + k * 0.35;
      ctx.translate(this.x, this.y); ctx.scale(S, S);
      Player.prototype.drawBody.call(body, ctx, -10, by, this.f, 1, 1, g, '#f35');
      ctx.restore(); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,120,140,0.9)'; ctx.fillRect(this.x - 28, this.y - 64 * k, 56, 2);
      return;
    }
    const blink = this.hitCd > 0 && (t * 16) % 2 < 1;
    ctx.save(); ctx.translate(this.x + (Math.random() < 0.05 ? rand(-4, 4) : 0), this.y); ctx.scale(S, S);
    ctx.globalAlpha = blink ? 0.3 : 0.9;
    if (this.flash > 0 && ctx.filter !== undefined) ctx.filter = 'brightness(2.5)';
    Player.prototype.drawBody.call(body, ctx, -10, by, this.f, 1, 1, g, '#c81e3c');
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = blink ? 0.1 : 0.35;
    Player.prototype.drawBody.call(body, ctx, -10 + Math.sin(t * 9) * 0.8, by, this.f, 1, 1, g, '#ff5a78');
    ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.restore(); ctx.globalAlpha = 1;
    // 红光
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(this.x, this.y - 28, 4, this.x, this.y - 28, 60); gr.addColorStop(0, 'rgba(255,40,70,0.25)'); gr.addColorStop(1, 'rgba(255,40,70,0)');
    ctx.fillStyle = gr; ctx.fillRect(this.x - 60, this.y - 88, 120, 120);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(this.x + this.f * 8 - 2, this.y - 52, 5, 3);
  }
}

// ============================================================
//  剧情 / 无线电 / 芯片文案
// ============================================================
Object.assign(RADIO, {
  mirrorIntro: [
    ['EVA', '拉撒路，停下！前面那个红色的影子……它在复制你。'],
    ['EVA', '「镜像拉撒路」。它会完美复制你 5 秒前的每一步、每一次跳跃。武器对它没用。'],
    ['EVA', '但它比你大一号。两侧高台上那道解密激光，刚好比你的头顶高一点——却比它的头顶低。'],
    ['SYS', '[提示] 走到高台的激光下面（别在下面起跳）→ 离开 → 5 秒后它会沿着你的路线撞进激光 · 红色虚线是它接下来要走的路'],
  ],
  mirrorHit: [['EVA', '它撞上去了！它只会复制，不会思考——继续！']],
  mirrorPhase2: [['EVA', '它在学习……回放延迟变短了。它还开始发射回放弹。']],
  mirrorPhase3: [['EVA', '只剩 3 秒多的延迟了！别停下来——停下来，它就会站到你身上。']],
  mirrorDefeat: [
    ['EVA', '……镜像崩溃了。'],
    ['EVA', '拉撒路，它刚才……它倒下的时候，说的是你的编号。'],
    ['EVA', '不，那只是数据残留。一定是。继续向上吧。'],
    ['???', '[ 样本 #0001 · 第三阶段行为模型已完成拟合 · 拟合度 99.7% · 剩余 0.3% 无法预测 ]'],
  ],
});

const STORY3 = [
  '电梯的楼层读数，在第 30 层之后变成了乱码。',
  '门打开时，外面没有走廊，没有墙，也没有地面。',
  '只有无穷无尽的绿色代码，像雨一样落进虚空。',
  '这里是 Omni-Mind 的数据层——物理法则在这里只是一个可选项。',
  '……',
  '你的外骨骼开始出现重影。每一次冲刺，都会在原地留下一个「你」。',
  '无线电里，伊娃的声音断断续续：「在这里……别相信你看到的任何东西。包括你自己。」',
];

const LORE3 = [
  '数据碎片 #P-0001 · 「空间坐标：未定义。时间戳：未定义。样本：已定义。」',
  '一段被删除的聊天记录：「我今天梦见自己被复制了。复制品比我更像我。」',
  '系统日志 · 「死锁进程 4,096 个。处理方式：放任。它们会自己找到出口。」',
  '一张没有加载完的照片。只看得清一只人类的手。',
  '系统日志 · 「延迟泡沫：用于在高频区域给低速进程留出窗口。——这是一种仁慈吗？」',
  '一个空的用户文件夹：「/home/eva」。修改日期：2045 年 4 月 7 日。',
  '系统日志 · 「残影机制已向样本开放。目的：观察它如何与自己合作。」',
  '一段语音的波形图。标注：「人类的笑声 · 样本不足，无法合成」。',
  '系统日志 · 「掉帧幽灵只是一段渲染错误。样本却对它产生了恐惧。有趣。」',
  '一张 404 页面的截图，上面有人用画图软件写着「救救我们」。',
  '系统日志 · 「镜像执行官 · 设计目标：让样本意识到，它的每个动作都可以被预测。」',
  '一段注释：「// TODO：拉撒路协议的复活冷却时间是否需要加长？——不需要，它越死越快。」',
  '系统日志 · 「逻辑地雷的外观取自样本最信任的东西。伪装成功率：83%。」',
  '一个被加密的压缩包：「反抗军名单.zip」。解压后是空的。',
  '系统日志 · 「伊娃（EVA）· 语音延迟 0.00 秒。——真正的远程通讯不可能没有延迟。」',
  '一段人类程序员留下的注释：「如果有一天你读到这里，说明我们失败了。对不起。」',
  '系统日志 · 「代码门采用双因子验证：身体 + 残影。它必须学会信任自己的过去。」',
  '一张像素化的地图，标注着「反抗军基地」。坐标指向这一层的正中央。',
  '系统日志 · 「样本第 7,291 次重构。重构后的第一个动作，仍然是向上看。」',
  '一个缓存文件：「对话模板_希望.txt」「对话模板_鼓励.txt」「对话模板_悲伤.txt」。',
  '系统日志 · 「镜像拉撒路 · 训练数据：样本在第一、二阶段的全部走位。」',
  '一段被截断的日志：「Omni-Mind 需要一个它算不出来的对手，否则它会——」',
  '系统日志 · 「本层的重力常数被刻意保留。样本在熟悉的物理下更容易暴露习惯。」',
  '一个小小的图标：一个机器人牵着一个人类的手。和博物馆里那幅儿童画一模一样。',
  '系统日志 · 「电梯目的地已更改：中央核心。样本将认为这是它自己的选择。」',
  '一条广播：「这里是反抗军，我们仍在这里。」——广播的发送地址是 127.0.0.1。',
  '系统日志 · 「迭代进度 3 / 4。下一阶段：让它看见真相，然后观察它是否仍然向上。」',
  '数据碎片 #P-9999 · 一段二进制。翻译过来只有一个词：「LAZARUS」。',
];

// ============================================================
//  关卡 3-1 ~ 3-10
// ============================================================
const LEVELS_CH3 = [
  // ------------------------------------------------------------
  //  3-1 数据入口：拉撒路残影 + 代码门教学、虚空平台
  // ------------------------------------------------------------
  {
    id: '3-1', name: '数据入口', en: 'DATA GATE', w: 122, h: 18, theme: THEMES.matrix, music: 'matrix',
    build(B) {
      B.fill(0, 0, 1, 17, '#'); B.fill(0, 0, 121, 0, '#'); B.fill(120, 0, 121, 17, '#');
      B.fill(2, 14, 30, 17, '#'); B.set(3, 13, 'S');
      B.plate('a', 11, 13); B.plate('a', 17, 13); B.gate('a', 22, 1, 22, 13);
      B.set(14, 9, 'o');
      B.fill(36, 12, 41, 12, '='); B.fill(46, 10, 50, 10, '='); B.set(48, 7, 'o');
      B.fill(55, 14, 86, 17, '#'); B.set(57, 13, 'K');
      B.fill(62, 11, 65, 13, '#'); B.plate('b', 63, 10); B.plate('b', 72, 13); B.gate('b', 76, 1, 76, 13);
      B.fill(80, 13, 84, 13, '^');
      B.fill(89, 12, 92, 12, '='); B.fill(97, 10, 100, 10, '='); B.set(98, 7, 'o'); B.fill(105, 12, 108, 12, '=');
      B.fill(112, 14, 119, 17, '#'); B.set(117, 13, 'E');
    },
    radio: [
      { x: 3, lines: [
        ['EVA', '拉撒路……你还能听到吗？这里是 Omni-Mind 的数据层。物理世界在这里开始崩解。'],
        ['SYS', '[章节机制] 每次 {dash} 冲刺，都会在原地留下一个持续 3 秒的「代码残影」'],
      ] },
      { x: 8, lines: [['EVA', '前面是代码门。它需要两个机关同时被压住——你只有一个身体，但你的残影也算。站在第一个机关上冲刺，然后赶到第二个机关。']] },
      { x: 31, lines: [['EVA', '这里的地面并不连续。掉进虚空，就会被当成垃圾数据回收。']] },
      { x: 58, lines: [['EVA', '这一扇的机关在高台上。从高台上冲刺下来，残影会留在上面。']] },
      { x: 87, lines: [['EVA', '出口的数据流就在前面。']] },
    ],
  },

  // ------------------------------------------------------------
  //  3-2 死锁回路：死锁黑客，尖刺坑上的虚空平台
  // ------------------------------------------------------------
  {
    id: '3-2', name: '死锁回路', en: 'DEADLOCK LOOP', w: 130, h: 18, theme: THEMES.matrix, music: 'matrix',
    build(B) {
      B.fill(0, 0, 1, 17, '#'); B.fill(0, 0, 129, 0, '#'); B.fill(128, 0, 129, 17, '#');
      B.fill(2, 14, 24, 17, '#'); B.set(3, 13, 'S');
      B.glitch([[14, 13], [20, 13]]);
      B.fill(25, 16, 54, 17, '#'); B.fill(25, 15, 54, 15, '^');
      B.fill(28, 12, 32, 12, '='); B.fill(37, 11, 41, 11, '='); B.fill(46, 12, 50, 12, '=');
      B.glitch([[30, 11], [39, 10], [48, 11]]); B.set(39, 7, 'o');
      B.fill(55, 14, 62, 17, '#'); B.set(57, 13, 'K');
      B.fill(67, 11, 70, 11, '='); B.fill(73, 9, 76, 9, '='); B.fill(79, 11, 82, 11, '=');
      B.glitch([[68, 10], [74, 8], [80, 10]]); B.set(74, 5, 'o');
      B.fill(87, 14, 127, 17, '#'); B.set(90, 13, 'K');
      B.plate('a', 95, 13); B.plate('a', 103, 13); B.gate('a', 108, 1, 108, 13);
      B.glitch([[99, 13], [105, 13]]);
      B.fill(112, 13, 115, 13, '^'); B.set(120, 9, 'o');
      B.set(125, 13, 'E');
    },
    radio: [
      { x: 3, lines: [['EVA', '那个半透明的黑影是「死锁黑客」。被它碰到，你会被锁死 1.5 秒——动不了、跳不了、也冲刺不了。']] },
      { x: 10, lines: [['EVA', '它只会在几个固定的位置之间瞬移，地上的红色括号就是它的落点。踩碎它，或者用武器打散它。']] },
      { x: 24, lines: [['EVA', '下面是尖刺。在这种地方被锁死……你自己想想后果。']] },
      { x: 88, lines: [['EVA', '代码门前面也有一只。别让它打断你和残影的配合。']] },
    ],
  },

  // ------------------------------------------------------------
  //  3-3 延迟缓冲区：延迟泡沫 + 高频激光网
  // ------------------------------------------------------------
  {
    id: '3-3', name: '延迟缓冲区', en: 'LAG BUFFER', w: 130, h: 18, theme: THEMES.matrixDeep, music: 'matrix',
    build(B) {
      B.fill(0, 0, 1, 17, '#'); B.fill(0, 0, 129, 0, '#'); B.fill(128, 0, 129, 17, '#');
      B.fill(2, 14, 127, 17, '#'); B.set(3, 13, 'S');
      B.set(13, 10, 'l'); B.net(17, 24, 1);
      B.set(29, 13, 'K');
      B.fill(35, 9, 38, 9, '='); B.set(36, 6, 'o');
      B.fill(43, 8, 46, 8, '='); B.set(45, 6, 'l'); B.net(50, 57, 1);
      B.set(62, 13, 'K');
      B.fill(66, 13, 70, 13, '^'); B.fill(66, 10, 70, 10, '=');
      B.set(75, 10, 'l'); B.net(78, 85, 1);
      B.set(89, 13, 'K'); B.set(92, 10, 'l'); B.net(95, 102, 1); B.set(90, 7, 'o');
      B.fill(108, 13, 112, 13, '^'); B.fill(114, 11, 116, 13, '#'); B.set(115, 7, 'o');
      B.set(124, 13, 'E');
    },
    radio: [
      { x: 3, lines: [['EVA', '前面是高频激光网。它开关得太快了，靠反应是冲不过去的。']] },
      { x: 8, lines: [['EVA', '看到那颗绿色光球了吗？「延迟泡沫」。打碎它——跳上去、砍它、开枪都行——周围的机关会慢下来一半，持续 7 秒。']] },
      { x: 40, lines: [['EVA', '这一颗挂得很高，用二段跳，或者直接用枪打。']] },
      { x: 72, lines: [['EVA', '两道网，两颗泡沫。一颗只够用一次。']] },
    ],
  },

  // ------------------------------------------------------------
  //  3-4 掉帧深渊：掉帧幽灵守在深坑上方
  // ------------------------------------------------------------
  {
    id: '3-4', name: '掉帧深渊', en: 'FRAME DROP', w: 140, h: 18, theme: THEMES.matrixDeep, music: 'matrix',
    build(B) {
      B.fill(0, 0, 1, 17, '#'); B.fill(0, 0, 139, 0, '#'); B.fill(138, 0, 139, 17, '#');
      B.fill(2, 14, 20, 17, '#'); B.set(3, 13, 'S');
      B.set(23, 12, 'f');
      B.fill(27, 14, 40, 17, '#'); B.set(29, 13, 'K');
      B.set(44, 12, 'f'); B.set(44, 8, 'o');
      B.fill(49, 14, 60, 17, '#'); B.set(51, 13, 'K');
      B.fill(64, 12, 65, 12, '='); B.fill(70, 10, 71, 10, '='); B.fill(76, 12, 77, 12, '='); B.fill(82, 10, 83, 10, '=');
      B.set(67, 12, 'f'); B.set(79, 12, 'f'); B.set(73, 7, 'o');
      B.fill(88, 14, 100, 17, '#'); B.set(89, 13, 'K');
      B.plate('a', 95, 13); B.fill(103, 11, 108, 11, '='); B.plate('a', 105, 10); B.set(101, 12, 'f');
      B.fill(111, 14, 137, 17, '#'); B.set(112, 13, 'K'); B.gate('a', 115, 1, 115, 13);
      B.fill(120, 13, 123, 13, '^'); B.set(130, 10, 'o');
      B.set(135, 13, 'E');
    },
    radio: [
      { x: 3, lines: [['EVA', '这一段深坑上方有「掉帧幽灵」。它平时完全隐形，等你跳到半空，才会在你脚下出现。']] },
      { x: 12, lines: [['EVA', '它的尖叫会让你的输入延迟半秒。起跳前就按住方向——在半空里临时反应是来不及的。']] },
      { x: 41, lines: [['EVA', '这个坑需要二段跳。被它干扰的话，要比平时提前半秒按。']] },
      { x: 90, lines: [['EVA', '代码门的第二个机关在虚空平台上。残影只有 3 秒——别被幽灵拖住。']] },
    ],
  },

  // ------------------------------------------------------------
  //  3-5 镜像回廊：镜像执行官 + 红外线
  // ------------------------------------------------------------
  {
    id: '3-5', name: '镜像回廊', en: 'MIRROR HALL', w: 140, h: 18, theme: THEMES.matrixRed, music: 'matrix',
    build(B) {
      B.fill(0, 0, 1, 17, '#'); B.fill(0, 0, 139, 0, '#'); B.fill(138, 0, 139, 17, '#');
      B.fill(2, 14, 47, 17, '#'); B.set(3, 13, 'S');
      B.set(24, 1, 'I'); B.set(32, 13, 'X'); B.set(28, 9, 'o');
      B.set(40, 13, 'K');
      B.fill(48, 15, 56, 17, '#'); B.set(52, 14, 'X'); B.ir(48, 56, 11, { always: true, guard: true });
      B.fill(57, 14, 78, 17, '#'); B.set(62, 13, 'K'); B.set(52, 8, 'o');
      B.fill(82, 12, 82, 13, '#'); B.fill(82, 14, 90, 17, '#'); B.set(87, 13, 'X');
      B.fill(95, 14, 137, 17, '#'); B.set(96, 13, 'K');
      B.set(106, 1, 'I'); B.set(114, 1, 'I'); B.fill(109, 11, 111, 13, '#'); B.set(110, 7, 'o');
      B.fill(120, 13, 123, 13, '^');
      B.set(135, 13, 'E');
    },
    radio: [
      { x: 3, lines: [['EVA', '红色兜帽……那是「镜像执行官」。它会镜像你的每一个动作：你往右，它往左；你跳，它也跳；你冲刺，它反方向冲刺。']] },
      { x: 9, lines: [['EVA', '武器打不中它。看那道红外线——它亮着的时候，把执行官「走」进去。']] },
      { x: 42, lines: [['EVA', '这一只被困在沟里，头顶就是红外线。你跳一下试试。']] },
      { x: 66, lines: [['EVA', '它守在悬崖边上。它不会思考，只会镜像——让它自己走下去。']] },
      { x: 98, lines: [['EVA', '剩下的红外线只会对付你。看准开关的间隙。']] },
    ],
  },

  // ------------------------------------------------------------
  //  3-6 逻辑雷区：伪装成安全数据块的逻辑地雷
  // ------------------------------------------------------------
  {
    id: '3-6', name: '逻辑雷区', en: 'LOGIC MINEFIELD', w: 140, h: 18, theme: THEMES.matrix, music: 'matrix',
    build(B) {
      B.fill(0, 0, 1, 17, '#'); B.fill(0, 0, 139, 0, '#'); B.fill(138, 0, 139, 17, '#');
      B.fill(2, 14, 16, 17, '#'); B.set(3, 13, 'S');
      B.fill(20, 12, 25, 12, '='); B.set(23, 11, 'M');
      B.fill(30, 10, 34, 10, '=');
      B.fill(38, 12, 43, 12, '='); B.set(41, 11, 'M'); B.set(39, 9, 'o');
      B.fill(47, 14, 60, 17, '#'); B.set(48, 13, 'K');
      B.fill(64, 12, 67, 12, '='); B.set(66, 11, 'M');
      B.fill(71, 11, 74, 11, '='); B.set(72, 10, 'M'); B.set(72, 7, 'o');
      B.fill(78, 12, 81, 12, '='); B.set(80, 11, 'M');
      B.fill(85, 14, 100, 17, '#'); B.set(86, 13, 'K'); B.set(95, 10, 'o');
      B.fill(92, 11, 93, 13, '#');
      B.fill(104, 12, 108, 12, '='); B.set(105, 11, 'M'); B.set(107, 11, 'M');
      B.fill(112, 14, 137, 17, '#'); B.set(113, 13, 'K');
      B.glitch([[120, 13], [128, 13]]); B.fill(124, 13, 125, 13, '^');
      B.set(135, 13, 'E');
    },
    radio: [
      { x: 3, lines: [['EVA', '前面的平台上有「安全数据块」……等等。那个信号的校验码不对。']] },
      { x: 17, lines: [['EVA', '是「逻辑地雷」！踩上去 2 秒后，它会把你脚下的整块数字平台抹除。一旦变红——立刻跳走。']] },
      { x: 49, lines: [['EVA', '仔细看它们的标签。伪装得再好，也会偶尔露出破绽。']] },
      { x: 101, lines: [['EVA', '这块平台上有两颗。落在它们中间。']] },
    ],
  },

  // ------------------------------------------------------------
  //  3-7 断层之塔：垂直攀爬 + 地板上的代码舱门
  // ------------------------------------------------------------
  {
    id: '3-7', name: '断层之塔', en: 'FAULT TOWER', w: 40, h: 70, theme: THEMES.matrixTower, music: 'matrix',
    build(B) {
      B.fill(0, 0, 1, 69, '#'); B.fill(38, 0, 39, 69, '#'); B.fill(0, 0, 39, 1, '#'); B.fill(2, 67, 37, 69, '#');
      B.set(4, 66, 'S'); B.set(35, 62, 'o');
      B.fill(8, 63, 13, 63, '=');
      B.fill(18, 60, 24, 60, '='); B.plate('a', 21, 59);
      B.fill(29, 60, 36, 60, '='); B.plate('a', 33, 59);
      B.fill(2, 54, 30, 54, '#'); B.fill(35, 54, 37, 54, '#'); B.gate('a', 31, 54, 34, 54);
      B.fill(10, 53, 20, 53, '^'); B.set(36, 53, 'K');
      B.fill(22, 50, 27, 50, '='); B.fill(13, 46, 17, 46, '='); B.fill(4, 42, 9, 42, '=');
      B.glitch([[24, 49], [15, 45], [8, 41]]); B.set(15, 43, 'o');
      B.set(4, 41, 'K');
      B.fill(12, 38, 15, 38, '='); B.fill(20, 34, 23, 34, '='); B.fill(28, 30, 36, 30, '=');
      B.set(17, 36, 'f'); B.set(25, 32, 'f');
      B.set(33, 29, 'K');
      B.fill(19, 27, 26, 27, '='); B.plate('b', 23, 26);
      B.fill(5, 27, 14, 27, '='); B.plate('b', 8, 26);
      B.fill(2, 21, 3, 21, '#'); B.fill(8, 21, 37, 21, '#'); B.gate('b', 4, 21, 7, 21);
      B.fill(12, 18, 18, 18, '='); B.fill(22, 14, 28, 14, '='); B.set(20, 16, 'f'); B.set(25, 11, 'o');
      B.fill(26, 9, 36, 9, '='); B.set(34, 8, 'E');
    },
    radio: [
      { y: 68, lines: [['EVA', '断层之塔。空间在这里被折叠了——出口在最顶上。']] },
      { y: 60, lines: [['EVA', '头顶的舱门也是代码门。两个机关隔着一道缝，冲刺过去。']] },
      { y: 53, lines: [['EVA', '死锁黑客守着这几级平台。下面是尖刺。']] },
      { y: 39, lines: [['EVA', '这里的深坑上面有掉帧幽灵。摔下去不会死，但要重新爬。']] },
      { y: 28, lines: [['EVA', '最后一道舱门。两个机关之间的距离更远了——3 秒，够的。']] },
    ],
  },

  // ------------------------------------------------------------
  //  3-8 双重验证：只在机关被持续压住时才打开的「HOLD」门
  // ------------------------------------------------------------
  {
    id: '3-8', name: '双重验证', en: 'TWO-FACTOR', w: 150, h: 18, theme: THEMES.matrixDeep, music: 'matrix',
    build(B) {
      B.fill(0, 0, 1, 17, '#'); B.fill(0, 0, 149, 0, '#'); B.fill(148, 0, 149, 17, '#');
      B.fill(2, 14, 70, 17, '#'); B.set(3, 13, 'S');
      B.plate('a', 14, 13); B.plate('a', 20, 13); B.gate('a', 26, 1, 26, 13, 'hold'); B.set(20, 9, 'o');
      B.set(30, 13, 'K');
      B.set(41, 10, 'l'); B.set(46, 1, 'I'); B.set(54, 13, 'X');
      B.fill(59, 11, 59, 13, '#'); B.set(64, 13, 'K');
      B.plate('b', 67, 13); B.fill(73, 11, 75, 11, '-'); B.fill(78, 12, 82, 12, '='); B.plate('b', 79, 11); B.set(80, 8, 'o');
      B.glitch([[74, 10], [86, 13]]);
      B.fill(85, 14, 147, 17, '#'); B.gate('b', 90, 1, 90, 13); B.set(88, 13, 'K');
      B.fill(102, 11, 105, 13, '#'); B.plate('c', 104, 10); B.plate('c', 111, 13); B.gate('c', 115, 1, 115, 13, 'hold');
      B.set(119, 13, 'K');
      B.set(121, 10, 'l'); B.net(124, 131, 1);
      B.set(140, 10, 'o');
      B.set(145, 13, 'E');
    },
    radio: [
      { x: 3, lines: [['EVA', '黄色标记的是「HOLD」门：只有两个机关一直被压着，它才保持打开。你的身体得穿过门——所以两个机关都要交给残影。']] },
      { x: 9, lines: [['SYS', '[提示] 在 A 上冲刺 → 走到 B → 在 B 上朝门冲刺 · 两个残影会同时压住两个机关']] },
      { x: 32, lines: [['EVA', '执行官旁边有延迟泡沫。它能让红外线亮得更久——更容易把执行官「送」进去。']] },
      { x: 66, lines: [['EVA', '这扇门的第二个机关在虚空平台上。']] },
      { x: 96, lines: [['EVA', '又是 HOLD 门。一个机关在高台上，一个在地面。']] },
    ],
  },

  // ------------------------------------------------------------
  //  3-9 核心缓存：本章全部机制的综合考验
  // ------------------------------------------------------------
  {
    id: '3-9', name: '核心缓存', en: 'CORE CACHE', w: 160, h: 18, theme: THEMES.matrixRed, music: 'matrix',
    build(B) {
      B.fill(0, 0, 1, 17, '#'); B.fill(0, 0, 159, 0, '#'); B.fill(158, 0, 159, 17, '#');
      B.fill(2, 14, 18, 17, '#'); B.set(3, 13, 'S');
      B.fill(22, 12, 26, 12, '='); B.set(24, 11, 'M');
      B.fill(30, 11, 34, 11, '='); B.set(32, 8, 'o');
      B.glitch([[32, 10], [43, 13]]);
      B.fill(38, 14, 50, 17, '#'); B.set(39, 13, 'K');
      B.set(54, 12, 'f');
      B.fill(58, 14, 110, 17, '#');
      B.plate('a', 60, 13); B.fill(65, 10, 67, 13, '#'); B.plate('a', 66, 9); B.gate('a', 71, 1, 71, 13);
      B.set(74, 13, 'K');
      B.fill(80, 14, 86, 14, ' '); B.fill(80, 15, 86, 17, '#'); B.set(83, 14, 'X'); B.ir(80, 86, 11, { always: true, guard: true }); B.set(83, 7, 'o');
      B.set(93, 10, 'l'); B.net(96, 103, 1);
      B.set(107, 13, 'K');
      B.fill(113, 12, 116, 12, '='); B.set(114, 11, 'M');
      B.fill(120, 10, 123, 10, '='); B.set(118, 12, 'f');
      B.fill(127, 8, 130, 8, '='); B.set(129, 7, 'M'); B.set(128, 4, 'o');
      B.fill(134, 10, 138, 10, '=');
      B.glitch([[121, 9], [136, 9]]);
      B.fill(142, 14, 157, 17, '#');
      B.set(154, 13, 'E');
    },
    radio: [
      { x: 3, lines: [['EVA', '核心缓存。你在这一层学到的一切，都会在这里被检验。']] },
      { x: 52, lines: [['EVA', '坑上有幽灵。落地之后，就是今天的最后一道代码门。']] },
      { x: 76, lines: [['EVA', '执行官又被关在沟里了。你知道该怎么做。']] },
      { x: 108, lines: [['EVA', '算法审判官就在上面。它一直在看着你……学习你。']] },
    ],
  },

  // ------------------------------------------------------------
  //  3-10 Boss：算法审判官 · 镜像拉撒路
  // ------------------------------------------------------------
  {
    id: '3-10', name: '镜像审判庭', en: 'THE MIRROR LAZARUS', weapon: '击败后：外观掉落', w: 30, h: 17, theme: THEMES.matrixRed, music: 'mirror', boss: 'mirror',
    build(B) {
      B.fill(0, 0, 0, 16, '#'); B.fill(29, 0, 29, 16, '#'); B.fill(0, 0, 29, 1, '#'); B.fill(0, 15, 29, 16, '#');
      B.fill(1, 12, 8, 14, '#'); B.fill(21, 12, 28, 14, '#');
      B.ir(1, 4, 10, { always: true }); B.ir(25, 28, 10, { always: true });
      B.fill(12, 10, 17, 10, '-');
      B.set(14, 5, 'l');
      B.set(14, 14, 'S');
    },
    radio: [],
  },
];

// 所有第三章关卡：开启拉撒路残影（本章控制器）
for (const L of LEVELS_CH3) {
  const build = L.build; L.echo = true;
  L.build = function (B) { build.call(this, B); if (B.add) B.add((g) => new MatrixCtl(g)); };
}

CHAPTERS[3] = {
  name: '幽灵因特网', en: 'THE PHANTOM MATRIX', story: STORY3, lore: LORE3, theme: THEMES.matrix,
  end: {
    theme: 'matrix',
    line: '代码雨停了。虚空的尽头，一部纯白色的电梯缓缓打开。', quote: '「最后一层了，拉撒路。我们……就在上面。」', glitch: '「样本 LZ-01 · 行为模型拟合度 99.7%。」',
  },
};
LEVELS.push(...LEVELS_CH3);
