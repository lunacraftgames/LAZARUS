'use strict';
// ============================================================
//  第二章：进化育婴室（The Evolutionary Hive）
//  章节机制：高密度培养液（水下低重力、惯性大、可多段漂浮跳跃）
//  新敌人：基因切割者 / 粘液寄生体 / 爆裂孵化囊（+爬行虫）/ 反弹软体怪 / 浮空水螅
//  Boss：母体子系统 · 繁育者（The Incubator）
//  新能力：推进囊（二段跳，2-1 获得）
//
//  地图新增字符：
//   'x' 基因切割者  'p' 粘液寄生体（挂在天花板下）  'g' 永久粘液池
//   'b' 爆裂孵化囊（贴地 / 贴墙 / 贴天花板，自动判断）  'u' 反弹软体怪  'h' 浮空水螅
//   'D' 推进囊（二段跳）拾取
//   培养液区域用 B.liquid(x0, y0, x1, y1) 单独标记
// ============================================================

// ---------------- 主题与美术 ----------------
Object.assign(THEMES, {
  hive: { top: '#06121c', bottom: '#0b1e2a', haze: 'rgba(0,40,70,0.22)', shaft: 'rgba(80,200,255,0.07)', tint: 'rgba(60,180,255,0.04)', dust: 'rgba(150,230,255,0.4)', back: () => Art.hiveBack || (Art.hiveBack = makeHiveBack()), mid: () => Art.hiveMid || (Art.hiveMid = makeHiveMid()), overlay: drawHiveFlow, tiles: 'hive', backAlpha: 0.7 },
  hiveDeep: { top: '#031020', bottom: '#06223a', haze: 'rgba(0,50,100,0.28)', shaft: 'rgba(90,190,255,0.09)', tint: 'rgba(40,140,255,0.06)', dust: 'rgba(160,230,255,0.45)', back: () => Art.hiveBack || (Art.hiveBack = makeHiveBack()), mid: () => Art.hiveMid || (Art.hiveMid = makeHiveMid()), overlay: drawHiveFlow, tiles: 'hive', backAlpha: 0.6 },
  hiveSlime: { top: '#081610', bottom: '#10261a', haze: 'rgba(20,60,20,0.22)', shaft: 'rgba(150,255,120,0.06)', tint: 'rgba(120,255,80,0.035)', dust: 'rgba(190,255,160,0.35)', back: () => Art.hiveBack || (Art.hiveBack = makeHiveBack()), mid: () => Art.hiveMid || (Art.hiveMid = makeHiveMid()), overlay: drawHiveFlow, tiles: 'hive', backAlpha: 0.65 },
  hiveTower: { top: '#050f1a', bottom: '#0c1a2c', haze: 'rgba(10,30,80,0.24)', shaft: 'rgba(120,200,255,0.08)', tint: 'rgba(80,160,255,0.045)', dust: 'rgba(170,220,255,0.4)', vtile: true, back: () => Art.hiveBack || (Art.hiveBack = makeHiveBack()), mid: () => Art.hiveMid || (Art.hiveMid = makeHiveMid()), overlay: drawHiveFlow, tiles: 'hive', backAlpha: 0.65 },
  hiveCore: { top: '#140612', bottom: '#220a1c', haze: 'rgba(70,10,50,0.24)', shaft: 'rgba(255,90,160,0.07)', tint: 'rgba(255,60,140,0.04)', dust: 'rgba(255,180,220,0.35)', back: () => Art.hiveBack || (Art.hiveBack = makeHiveBack()), mid: () => Art.hiveMid || (Art.hiveMid = makeHiveMid()), overlay: drawHiveFlow, tiles: 'hive', backAlpha: 0.6 },
});

// 远景：密密麻麻的半透明培养舱
function makeHiveBack() {
  const W = 1800, H = 620, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(202);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#050d14'); g.addColorStop(1, '#0a1822');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // 后排（小、暗）
  for (let row = 0; row < 2; row++) {
    const s = row === 0 ? 0.55 : 1, y0 = row === 0 ? 70 : 150, n = row === 0 ? 20 : 12, gap = W / n;
    for (let i = 0; i < n; i++) {
      const cx = i * gap + gap / 2 + (row === 0 ? gap / 2 : 0), w = 86 * s, h = 300 * s, y = y0;
      x.globalAlpha = row === 0 ? 0.45 : 1;
      // 舱体
      x.fillStyle = '#16232c'; x.fillRect(cx - w / 2 - 6 * s, y - 16 * s, w + 12 * s, 18 * s); x.fillRect(cx - w / 2 - 6 * s, y + h - 2 * s, w + 12 * s, 22 * s);
      const lg = x.createLinearGradient(0, y, 0, y + h);
      lg.addColorStop(0, 'rgba(40,150,200,0.25)'); lg.addColorStop(1, 'rgba(20,90,160,0.45)');
      x.fillStyle = lg; x.beginPath();
      if (x.roundRect) x.roundRect(cx - w / 2, y, w, h, 30 * s); else x.rect(cx - w / 2, y, w, h);
      x.fill();
      x.strokeStyle = 'rgba(140,220,255,0.35)'; x.lineWidth = 2 * s; x.stroke();
      // 液面
      const lvl = y + h * (0.12 + r() * 0.1);
      x.fillStyle = 'rgba(120,220,255,0.18)'; x.fillRect(cx - w / 2 + 4, lvl, w - 8, 3 * s);
      // 胚胎：蜷缩的机械雏形
      x.save(); x.translate(cx, y + h * 0.58); x.scale(s, s); x.rotate((r() - 0.5) * 0.6);
      x.strokeStyle = 'rgba(10,30,40,0.85)'; x.fillStyle = 'rgba(10,30,40,0.85)'; x.lineWidth = 6; x.lineCap = 'round';
      x.beginPath(); x.arc(0, -40, 16, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.arc(4, 5, 34, -2.2, 1.4); x.stroke();
      x.lineWidth = 4; x.beginPath(); x.moveTo(10, -10); x.lineTo(28, 10); x.lineTo(16, 34); x.moveTo(-6, 30); x.lineTo(-24, 40); x.lineTo(-10, 56); x.stroke();
      x.fillStyle = r() < 0.3 ? 'rgba(255,80,80,0.9)' : 'rgba(120,255,255,0.7)'; x.fillRect(6, -44, 6, 3);
      x.restore();
      // 气泡
      x.fillStyle = 'rgba(200,245,255,0.35)';
      for (let k = 0; k < 6; k++) { x.beginPath(); x.arc(cx + (r() - 0.5) * w * 0.7, lvl + r() * h * 0.8, 1.5 + r() * 2.5 * s, 0, 7); x.fill(); }
      // 标签灯
      x.fillStyle = r() < 0.5 ? 'rgba(80,255,180,0.8)' : 'rgba(255,190,80,0.8)'; x.fillRect(cx - 4 * s, y + h + 6 * s, 8 * s, 4 * s);
      x.globalAlpha = 1;
    }
  }
  return c;
}
// 中景：输液管道、电缆
function makeHiveMid() {
  const W = 1600, H = 620, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(303);
  for (const py of [96, 486]) {
    x.fillStyle = '#132029'; x.fillRect(0, py - 16, W, 32);
    x.fillStyle = '#1e3240'; x.fillRect(0, py - 16, W, 5);
    for (let k = 0; k < W; k += 200) { x.fillStyle = '#0c151b'; x.fillRect(k, py - 20, 14, 40); }
    for (let k = 90; k < W; k += 400) { x.fillStyle = 'rgba(60,180,255,0.35)'; x.fillRect(k, py - 10, 110, 20); x.strokeStyle = 'rgba(150,230,255,0.5)'; x.strokeRect(k, py - 10, 110, 20); }
  }
  for (let k = 0; k < 6; k++) {
    const px = 120 + k * 270 + r() * 40;
    x.fillStyle = '#111c24'; x.fillRect(px - 10, 110, 20, 360);
    x.fillStyle = '#1b2c38'; x.fillRect(px - 10, 110, 4, 360);
    x.fillStyle = 'rgba(60,180,255,0.3)'; x.fillRect(px - 6, 200 + r() * 100, 12, 60);
  }
  // 下垂的电缆
  for (let k = 0; k < 16; k++) {
    const cx = r() * W, len = 60 + r() * 180;
    x.strokeStyle = k % 3 ? '#0d171e' : '#2a1830'; x.lineWidth = 3 + r() * 3;
    x.beginPath(); x.moveTo(cx, 0); x.quadraticCurveTo(cx + (r() - 0.5) * 80, len * 0.7, cx + (r() - 0.5) * 40, len); x.stroke();
  }
  return c;
}
// 管道里流动的幽蓝电液
function drawHiveFlow(ctx, cam, t) {
  ctx.globalCompositeOperation = 'lighter';
  for (const py of [96, 486]) {
    const sy = py - (cam.y * 0.5 + 60);
    if (sy < -20 || sy > VH + 20) continue;
    for (let k = 0; k < 18; k++) {
      const sx = ((k * 97 + t * 140 - cam.x * 0.5) % (VW + 100) + VW + 100) % (VW + 100) - 50;
      ctx.fillStyle = 'rgba(90,210,255,0.35)'; ctx.fillRect(sx, sy - 3, 26, 6);
      ctx.fillStyle = 'rgba(200,250,255,0.5)'; ctx.fillRect(sx + 18, sy - 1.5, 6, 3);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ---------------- 瓦片风格：工业孵化场 ----------------
TILESETS.hive = {
  stone(x, px, py, r, cx, cy, oT, oB, oL, oR) {
    const base = ['#1b2831', '#1e2c36', '#18242c', '#202f3a'][Math.floor(r() * 4)];
    x.fillStyle = base; x.fillRect(px, py, TILE, TILE);
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(px, py + 15, TILE, 1); x.fillRect(px + 15, py, 1, TILE);
    x.fillStyle = 'rgba(140,200,230,0.08)'; x.fillRect(px + 1, py + 1, 13, 1); x.fillRect(px + 17, py + 17, 13, 1);
    x.fillStyle = '#35505e'; for (const [a, b] of [[3, 3], [28, 3], [3, 28], [28, 28]]) x.fillRect(px + a, py + b, 2, 2);
    if (r() < 0.12) { x.fillStyle = 'rgba(80,200,255,0.25)'; x.fillRect(px + 6, py + 20, 20, 3); }
    if (oL) { x.fillStyle = 'rgba(140,220,255,0.12)'; x.fillRect(px, py, 2, TILE); }
    if (oR) { x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(px + TILE - 2, py, 2, TILE); }
    if (oB) { x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(px, py + TILE - 4, TILE, 4); }
    if (oT) {
      x.fillStyle = '#2b4656'; x.fillRect(px, py, TILE, 4);
      x.fillStyle = '#3fc6f0'; x.fillRect(px, py, TILE, 1);
      if (r() < 0.55) {
        // 有机增生物
        x.fillStyle = r() < 0.5 ? '#5a2f68' : '#2f6858';
        for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(px + r() * 30, py + 2, 2 + r() * 3, 0, Math.PI * 2); x.fill(); }
        x.fillStyle = 'rgba(80,210,255,0.6)';
        for (let k = 0; k < 2; k++) x.fillRect(px + r() * 30, py + 4, 1.5, 2 + r() * 8);
      }
    }
  },
  marble(x, px, py, r, oL, oR) {
    x.fillStyle = '#16303e'; x.fillRect(px, py, TILE, TILE);
    x.fillStyle = 'rgba(90,210,255,0.35)'; x.fillRect(px + 2, py + 4, TILE - 4, TILE - 10);
    x.fillStyle = 'rgba(200,250,255,0.5)'; x.fillRect(px + 4, py + 6, 2, TILE - 16);
    x.fillStyle = '#6fd8ff'; x.fillRect(px, py, TILE, 2);
    x.fillStyle = '#0c1a22'; x.fillRect(px, py + TILE - 5, TILE, 5);
    if (oL) { x.fillStyle = '#2b4656'; x.fillRect(px, py, 3, TILE); }
    if (oR) { x.fillStyle = '#2b4656'; x.fillRect(px + TILE - 3, py, 3, TILE); }
  },
  shelf(x, px, py, endL, endR) {
    x.fillStyle = '#2a3c48'; x.fillRect(px, py, TILE, 7);
    x.fillStyle = '#0c151b'; for (let k = 3; k < TILE; k += 6) x.fillRect(px + k, py + 2, 3, 3);
    x.fillStyle = '#4fb6de'; x.fillRect(px, py, TILE, 1);
    x.fillStyle = '#1a2830'; if (endL) x.fillRect(px + 3, py + 7, 3, 10); if (endR) x.fillRect(px + 26, py + 7, 3, 10);
  },
  shards(x, px, py, r, down) {
    x.save();
    if (down) { x.translate(px + 16, py + 16); x.scale(1, -1); x.translate(-px - 16, -py - 16); }
    x.fillStyle = '#2a1830'; x.fillRect(px, py + 27, TILE, 5);
    for (let k = 0; k < 4; k++) {
      const bx = px + 1 + k * 8 + r() * 2, h = 12 + r() * 12;
      x.fillStyle = '#b04aa0'; x.beginPath(); x.moveTo(bx, py + 28); x.quadraticCurveTo(bx + 5, py + 28 - h * 0.6, bx + 3.5, py + 28 - h); x.lineTo(bx + 8, py + 28); x.fill();
      x.fillStyle = 'rgba(255,170,240,0.7)'; x.fillRect(bx + 3, py + 28 - h * 0.8, 1, h * 0.4);
    }
    x.restore();
  },
  prop(x, cx, gy, type) {
    x.save();
    switch (type % 4) {
      case 0: // 卵簇
        for (let k = 0; k < 3; k++) { x.fillStyle = k % 2 ? '#3a5a4a' : '#4a3a5a'; x.beginPath(); x.ellipse(cx - 8 + k * 8, gy - 7, 5, 7, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(160,255,220,0.35)'; x.fillRect(cx - 9 + k * 8, gy - 11, 2, 3); }
        break;
      case 1: // 小监控屏
        x.fillStyle = '#1e2c34'; x.fillRect(cx - 12, gy - 20, 24, 18); x.fillStyle = '#062028'; x.fillRect(cx - 9, gy - 17, 18, 11);
        x.fillStyle = 'rgba(80,220,255,0.5)'; x.fillRect(cx - 7, gy - 14, 8, 1); x.fillRect(cx - 7, gy - 11, 12, 1);
        x.fillStyle = '#1e2c34'; x.fillRect(cx - 2, gy - 2, 4, 2);
        break;
      case 2: // 电缆卷
        x.strokeStyle = '#26343e'; x.lineWidth = 3; for (let k = 0; k < 3; k++) { x.beginPath(); x.ellipse(cx, gy - 5 - k * 3, 12 - k * 2, 3, 0, 0, 7); x.stroke(); }
        break;
      default: // 排气口
        x.fillStyle = '#22323c'; x.fillRect(cx - 10, gy - 12, 20, 12); x.fillStyle = '#0b1318'; for (let k = 0; k < 4; k++) x.fillRect(cx - 8, gy - 10 + k * 3, 16, 1.5);
    }
    x.restore();
  },
};

// ---------------- 培养液绘制（覆盖在角色之上，看起来像被淹没） ----------------
function drawWater(ctx, world, cam, t) {
  if (!world.water) return;
  const cx0 = Math.max(0, Math.floor(cam.x / TILE)), cx1 = Math.min(world.w - 1, Math.floor((cam.x + VW) / TILE));
  const cy0 = Math.max(0, Math.floor(cam.y / TILE)), cy1 = Math.min(world.h - 1, Math.floor((cam.y + VH) / TILE));
  for (let cy = cy0; cy <= cy1; cy++) {
    let run = -1;
    for (let cx = cx0; cx <= cx1 + 1; cx++) {
      const w = cx <= cx1 && world.waterAt(cx, cy);
      if (w && run < 0) run = cx;
      if (!w && run >= 0) {
        const x0 = run * TILE, x1 = cx * TILE, y = cy * TILE;
        const surface = !world.waterAt(run, cy - 1) && !world.solidAt(run, cy - 1);
        ctx.fillStyle = surface ? 'rgba(40,150,230,0.30)' : 'rgba(30,120,210,0.36)';
        if (surface) {
          ctx.beginPath(); ctx.moveTo(x0, y + TILE);
          for (let xx = x0; xx <= x1; xx += 8) ctx.lineTo(xx, y + 4 + Math.sin(xx * 0.05 + t * 3) * 2.5);
          ctx.lineTo(x1, y + TILE); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(180,240,255,0.75)'; ctx.lineWidth = 1.5; ctx.beginPath();
          for (let xx = x0; xx <= x1; xx += 8) { const yy = y + 4 + Math.sin(xx * 0.05 + t * 3) * 2.5; xx === x0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); }
          ctx.stroke();
        } else ctx.fillRect(x0, y, x1 - x0, TILE);
        run = -1;
      }
    }
  }
  // 水中光纹
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(120,220,255,0.05)';
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
    if (!world.waterAt(cx, cy)) continue;
    const k = Math.sin(cx * 1.7 + cy * 0.9 + t * 1.5);
    if (k > 0.6) ctx.fillRect(cx * TILE + 4, cy * TILE + 10 + k * 6, 18, 2);
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ============================================================
//  敌人
// ============================================================

// ---------------- 1. 基因切割者：电锯单轮，高速盲目往返 ----------------
class GeneCutter {
  constructor(cx, cy) { this.w = 24; this.h = 28; this.x = cx * TILE + 4; this.y = (cy + 1) * TILE - this.h; this.dir = Math.random() < 0.5 ? -1 : 1; this.vy = 0; this.alive = true; this.spin = 0; this.colors = ['#8a9aa6', '#e03a3a', '#2a3a44']; }
  update(dt, g) {
    const w = g.world;
    this.vy = Math.min(this.vy + GRAV * dt, MAXFALL);
    if (this.grounded) {
      const fx = this.dir > 0 ? this.x + this.w + 3 : this.x - 3;
      if (!w.supportAt(fx, this.y + this.h + 4)) this.dir *= -1;
    }
    // 备份终端周围有力场：切割者不会冲进存档点（避免复活即死）
    for (const cp of g.props) {
      if (!(cp instanceof Checkpoint) || Math.abs(cp.y + cp.h - (this.y + this.h)) > 40) continue;
      const cx = cp.x + cp.w / 2, ex = this.x + this.w / 2, nx = ex + this.dir * 12;
      if (Math.abs(nx - cx) < 78 && Math.abs(nx - cx) < Math.abs(ex - cx) + 0.01) {
        this.dir = ex < cx ? -1 : 1;
        g.particles.add({ x: cx - this.dir * 78, y: this.y + 14, vx: 0, vy: 0, size: 4, grow: 60, life: 0.25, shape: 'ring', color: '#5f8', add: true });
      }
    }
    if (w.moveX(this, this.dir * 255 * dt)) this.dir *= -1;
    const ry = w.moveY(this, this.vy * dt); this.grounded = !!ry; if (ry) this.vy = 0;
    this.spin += dt * 40;
    if (this.grounded && Math.random() < 0.5) g.particles.add({ x: this.x + this.w / 2 - this.dir * 10, y: this.y + this.h - 1, vx: -this.dir * rand(60, 200), vy: rand(-160, -40), life: 0.2, size: 1.5, color: pick(['#ffd070', '#fff']), shape: 'spark', add: true, grav: 700 });
    if (this.y > w.ph) this.alive = false;
  }
  touch(p, g) { if (stompable(p, this, 10)) { g.killEnemy(this); g.stompBounce(); } else g.killPlayer(); }
  draw(ctx, g) {
    const x = this.x + this.w / 2, y = this.y;
    // 电锯轮
    ctx.save(); ctx.translate(x, y + 19); ctx.rotate(this.spin * this.dir);
    ctx.fillStyle = '#c8d0d6'; ctx.beginPath();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, rr = i % 2 ? 7 : 10; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.fill(); ctx.fillStyle = '#2a3a44'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill();
    ctx.restore();
    // 机身
    ctx.fillStyle = '#2a3a44'; ctx.fillRect(x - 6, y + 6, 12, 7);
    ctx.fillStyle = '#8a9aa6'; ctx.beginPath(); ctx.arc(x, y + 7, 9, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#e03a3a'; ctx.fillRect(x + this.dir * 3 - 2, y + 2, 4, 3);
    ctx.fillStyle = '#e0c040'; ctx.fillRect(x - 9, y + 7, 18, 2);
  }
}

// ---------------- 2. 粘液寄生体：挂在天花板下，向下吐粘液 ----------------
class SlimeParasite {
  constructor(cx, cy) { this.w = 28; this.h = 18; this.x = cx * TILE + 2; this.y = cy * TILE; this.t = Math.random() * 2; this.alive = true; this.spit = 0; this.colors = ['#6a8a3a', '#9f4', '#3a2a40']; }
  update(dt, g) {
    this.t += dt; this.spit = Math.max(0, this.spit - dt);
    const p = g.player, cx = this.x + this.w / 2;
    if (this.t > 2.3 && g.state === 'play' && Math.abs(p.cx - cx) < 300 && p.cy > this.y) {
      this.t = rand(-0.3, 0.3); this.spit = 0.3;
      g.projectiles.push(new SlimeBlob(cx, this.y + this.h, (p.cx - cx) * 0.25));
      Sound.sfx.splat();
    }
  }
  touch(p, g) { if (p.slimeT <= 0) Sound.sfx.slime(); p.slimeT = PL.SLIME_T; } // 接触只会被粘住，不会死亡
  draw(ctx, g) {
    const x = this.x, y = this.y, pulse = Math.sin(g.t * 5) * 1.5, open = this.spit > 0 ? 1 : 0;
    ctx.fillStyle = '#3a2a40'; ctx.fillRect(x + 4, y, this.w - 8, 4);
    ctx.fillStyle = '#6a8a3a'; ctx.beginPath(); ctx.ellipse(x + 14, y + 8, 13 + pulse, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a6a2a'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 3 + i * 6, y + 12, 3, 5 + Math.sin(g.t * 4 + i) * 2);
    ctx.fillStyle = '#1a1a10'; ctx.beginPath(); ctx.ellipse(x + 14, y + 14, 4, 2 + open * 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9f4'; ctx.fillRect(x + 8, y + 5, 3, 2); ctx.fillRect(x + 17, y + 5, 3, 2);
    ctx.fillStyle = 'rgba(160,255,80,0.8)'; ctx.fillRect(x + 13, y + 16, 2, 3 + Math.abs(Math.sin(g.t * 3)) * 5);
  }
}
class SlimeBlob {
  constructor(x, y, vx) { this.x = x; this.y = y; this.vx = clamp(vx, -60, 60); this.vy = 60; this.dead = false; }
  update(dt, g) {
    this.vy += 900 * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    const p = g.player;
    if (g.state === 'play' && Math.hypot(p.cx - this.x, p.cy - this.y) < 16) { this.dead = true; if (p.slimeT <= 0) Sound.sfx.slime(); p.slimeT = PL.SLIME_T; return; }
    if (g.world.pointWater(this.x, this.y)) { this.dead = true; return; }
    if (g.world.supportAt(this.x, this.y + 5)) {
      this.dead = true; Sound.sfx.splat();
      const gy = Math.floor((this.y + 5) / TILE) * TILE;
      g.projectiles.push(new SlimePuddle(this.x, gy, 6));
      g.particles.burst(this.x, gy, 6, { color: ['#9f4', '#6c3'], smin: 30, smax: 90, angle: -Math.PI / 2, spread: 1.2, grav: 600, lmin: 0.2, lmax: 0.4 });
    }
    if (this.y > g.world.ph) this.dead = true;
  }
  draw(ctx) {
    ctx.fillStyle = '#9f4'; ctx.beginPath(); ctx.ellipse(this.x, this.y, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(230,255,200,0.7)'; ctx.fillRect(this.x - 2, this.y - 4, 2, 2);
  }
}
// 粘液池：站在上面会被粘住 3 秒（跳跃高度减半、不能二段跳）
class SlimePuddle {
  constructor(x, gy, life) { this.w = 60; this.h = 8; this.x = x - this.w / 2; this.y = gy - this.h; this.life = life || 0; this.t = 0; this.dead = false; }
  update(dt, g) {
    this.t += dt; if (this.life && this.t > this.life) { this.dead = true; return; }
    const p = g.player;
    if (g.state === 'play' && p.onGround && p.x + p.w > this.x + 4 && p.x < this.x + this.w - 4 && Math.abs(p.y + p.h - (this.y + this.h)) < 6) {
      if (p.slimeT <= 0) { Sound.sfx.slime(); g.toastHint('踩到粘液：3 秒内跳跃减半、不能二段跳'); }
      p.slimeT = PL.SLIME_T;
    }
  }
  draw(ctx, g) {
    const fade = this.life ? Math.min(1, (this.life - this.t)) : 1;
    ctx.globalAlpha = Math.max(0, fade);
    ctx.fillStyle = '#5c9a2a'; ctx.beginPath(); ctx.ellipse(this.x + this.w / 2, this.y + this.h - 2, this.w / 2, 5, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#8fdc3a'; ctx.fillRect(this.x + 6, this.y + this.h - 4, this.w - 12, 3);
    for (let i = 0; i < 3; i++) { const bx = this.x + 12 + i * 16, s = (Math.sin(g.t * 3 + i * 2) + 1) * 1.6; ctx.fillStyle = 'rgba(200,255,140,0.7)'; ctx.beginPath(); ctx.arc(bx, this.y + this.h - 5, s, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}

// ---------------- 3. 爆裂孵化囊：靠近后剧烈跳动并自爆，散出 3-5 只爬行虫 ----------------
class BroodPod {
  constructor(cx, cy, world) {
    this.w = 26; this.h = 26; this.alive = true; this.state = 'idle'; this.t = Math.random() * 3; this.colors = ['#7a3a6a', '#c86ab0', '#3a1a30'];
    // 自动贴附：下方 > 左 / 右墙 > 天花板
    if (world.solidAt(cx, cy + 1)) { this.side = 'floor'; this.x = cx * TILE + 3; this.y = (cy + 1) * TILE - this.h; }
    else if (world.solidAt(cx - 1, cy)) { this.side = 'left'; this.x = cx * TILE; this.y = cy * TILE + 3; }
    else if (world.solidAt(cx + 1, cy)) { this.side = 'right'; this.x = (cx + 1) * TILE - this.w; this.y = cy * TILE + 3; }
    else { this.side = 'ceil'; this.x = cx * TILE + 3; this.y = cy * TILE; }
  }
  update(dt, g) {
    this.t += dt;
    const p = g.player, cx = this.x + 13, cy = this.y + 13;
    if (this.state === 'idle' && g.state === 'play' && Math.hypot(p.cx - cx, p.cy - cy) < 104) { this.state = 'pulse'; this.t = 0; Sound.sfx.throb(); }
    if (this.state === 'pulse') {
      if (Math.floor(this.t * 8) !== Math.floor((this.t - dt) * 8)) Sound.sfx.throb();
      if (this.t > 0.65) this.burst(g);
    }
  }
  burst(g) {
    this.alive = false; Sound.sfx.pop(); g.shake(4);
    const cx = this.x + 13, cy = this.y + 13, n = randi(3, 5);
    g.particles.burst(cx, cy, 20, { color: ['#c86ab0', '#7a3a6a', '#fbd'], smin: 60, smax: 240, grav: 600, lmin: 0.3, lmax: 0.7, szmin: 2, szmax: 5 });
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.5;
      g.enemies.push(new Crawler(cx - 6, cy - 4, Math.cos(a) * rand(120, 220) + (this.side === 'left' ? 120 : this.side === 'right' ? -120 : 0), Math.sin(a) * rand(200, 330) * (this.side === 'ceil' ? -0.3 : 1)));
    }
  }
  touch(p, g) { if (stompable(p, this, 12)) { g.killEnemy(this); g.stompBounce(); } } // 本体不伤人；踩碎可以避免孵出小虫
  draw(ctx, g) {
    const k = this.state === 'pulse' ? 1 + Math.sin(this.t * 40) * 0.12 + this.t * 0.3 : 1 + Math.sin(this.t * 2) * 0.04;
    const cx = this.x + 13, cy = this.y + 13;
    ctx.save(); ctx.translate(cx, cy);
    const rot = { floor: 0, ceil: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 }[this.side]; ctx.rotate(rot);
    ctx.fillStyle = '#3a1a30'; ctx.fillRect(-10, 9, 20, 4);
    ctx.scale(k, k);
    ctx.fillStyle = '#7a3a6a'; ctx.beginPath(); ctx.ellipse(0, 0, 12, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9a4a88'; ctx.beginPath(); ctx.ellipse(-4, -3, 5, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(5, 2, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3a1a30'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-10, 2); ctx.lineTo(10, -2); ctx.moveTo(-6, -9); ctx.lineTo(4, 10); ctx.stroke();
    ctx.fillStyle = this.state === 'pulse' ? ((this.t * 16) % 2 < 1 ? '#fff' : '#f5a') : 'rgba(255,170,230,0.6)';
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill();
    ctx.restore();
  }
}
class Crawler {
  constructor(x, y, vx, vy) { this.w = 12; this.h = 9; this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.alive = true; this.t = 0; this.colors = ['#c86ab0', '#fbd']; }
  update(dt, g) {
    const w = g.world, p = g.player; this.t += dt;
    this.vy = Math.min(this.vy + GRAV * dt, MAXFALL);
    if (this.grounded) {
      const dir = Math.sign(p.cx - (this.x + 6)) || 1;
      this.vx = approach(this.vx, dir * 175, 900 * dt);
      if (Math.random() < 0.01) { this.vy = -380; }
    }
    if (w.moveX(this, this.vx * dt)) { if (this.grounded) this.vy = -360; this.vx *= -0.3; }
    const ry = w.moveY(this, this.vy * dt); this.grounded = !!ry && this.vy >= 0; if (ry) this.vy = 0;
    if (this.y > w.ph) this.alive = false;
  }
  touch(p, g) { if (stompable(p, this, 10)) { g.killEnemy(this); g.stompBounce(0.8); } else g.killPlayer(); }
  draw(ctx, g) {
    const x = this.x, y = this.y, legs = Math.sin(this.t * 30) * 2;
    ctx.fillStyle = '#c86ab0'; ctx.beginPath(); ctx.ellipse(x + 6, y + 5, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#6a2a5a'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let i = 0; i < 3; i++) { ctx.moveTo(x + 2 + i * 4, y + 7); ctx.lineTo(x + 1 + i * 4 + legs, y + 10); }
    ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(x + (this.vx > 0 ? 9 : 1), y + 3, 2, 2);
  }
}

// ---------------- 4. 反弹软体怪：武器打它会被猛烈弹开；踩头会被高高弹起；侧面触碰致命 ----------------
class Bouncer {
  constructor(cx, cy) { this.w = 34; this.h = 24; this.x = cx * TILE - 1; this.y = (cy + 1) * TILE - this.h; this.x0 = this.x; this.vx = 0; this.vy = 0; this.alive = true; this.t = Math.random() * 1.5; this.squash = 0; this.colors = ['#4ad0c0', '#bff']; }
  update(dt, g) {
    const w = g.world; this.t += dt; this.squash = Math.max(0, this.squash - dt * 3);
    this.vy = Math.min(this.vy + GRAV * dt, MAXFALL);
    if (this.grounded) {
      this.vx = approach(this.vx, 0, 600 * dt);
      if (this.t > 1.7) {
        this.t = rand(0, 0.4);
        let dir = this.x > this.x0 + 30 ? -1 : this.x < this.x0 - 30 ? 1 : (Math.random() < 0.5 ? -1 : 1);
        const fx = dir > 0 ? this.x + this.w + 20 : this.x - 20;
        if (!w.supportAt(fx, this.y + this.h + 4)) dir = -dir;
        this.vx = dir * 70; this.vy = -260; this.squash = 0.6;
      }
    }
    w.moveX(this, this.vx * dt);
    const ry = w.moveY(this, this.vy * dt); this.grounded = !!ry && this.vy >= 0; if (ry) this.vy = 0;
    if (this.y > w.ph) this.alive = false;
  }
  // 被踩：玩家被高高弹起（借力跳高）；侧面接触：致命
  touch(p, g) {
    if (stompable(p, this, 14)) {
      p.y = this.y - p.h; p.vy = -1050; p.jumping = false; p.jumpsLeft = 1; p.canDash = true; p.dashT = 0; p.sx = 0.7; p.sy = 1.4;
      this.squash = 1; Sound.sfx.bounce(); Input.rumble(0.1, 0.5, 90);
      g.particles.burst(p.cx, this.y, 10, { color: ['#4ad0c0', '#bff'], smin: 60, smax: 180, angle: -Math.PI / 2, spread: 0.9, lmin: 0.2, lmax: 0.4, add: true });
    } else g.killPlayer();
  }
  // 武器 / 冲撞命中：不掉血，把玩家猛烈弹开
  onStrike(g, kind) {
    const p = g.player, dir = Math.sign(p.cx - (this.x + this.w / 2)) || -p.facing;
    this.squash = 1; Sound.sfx.wobble();
    if (kind === 'shot' || kind === 'spore' || kind === 'heavy') { g.toastHint('软体怪不吃伤害——子弹和冲击波都会被弹开。踩它的头可以借力跳高'); return 'bounced'; } // 远程攻击：只会弹开
    this.vx = -dir * 160; g.shake(4);
    if (p.atkDown && kind === 'blade') { p.vy = -900; p.jumpsLeft = 1; }
    else { p.vx = dir * 520; p.vy = Math.min(p.vy, -320); p.dashT = 0; }
    g.toastHint('软体怪不吃伤害——武器会被弹回来。踩它的头可以借力跳高');
    return 'bounced';
  }
  draw(ctx, g) {
    const x = this.x + this.w / 2, y = this.y + this.h, s = this.squash;
    const sw = 1 + s * 0.3 + Math.sin(g.t * 6) * 0.03, sh = 1 - s * 0.35 + Math.sin(g.t * 6 + 1) * 0.03;
    ctx.save(); ctx.translate(x, y); ctx.scale(sw, sh);
    const gr = ctx.createRadialGradient(-5, -16, 2, 0, -10, 22); gr.addColorStop(0, '#bff'); gr.addColorStop(1, 'rgba(60,200,190,0.85)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-17, 0); ctx.quadraticCurveTo(-18, -26, 0, -25); ctx.quadraticCurveTo(18, -26, 17, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(200,255,250,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    // 内部机械核心
    ctx.fillStyle = '#23404a'; ctx.fillRect(-6, -12, 12, 8); ctx.fillStyle = '#f55'; ctx.fillRect(-4, -10, 3, 3); ctx.fillRect(1, -10, 3, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-10, -20, 4, 3);
    ctx.restore();
  }
}

// ---------------- 5. 浮空水螅：只在培养液中出现，缓慢而坚定地飘向主角 ----------------
class AeroHydra {
  constructor(cx, cy) { this.w = 22; this.h = 24; this.x = cx * TILE + 5; this.y = cy * TILE + 4; this.vx = 0; this.vy = 0; this.alive = true; this.t = Math.random() * 6; this.colors = ['#8a6ad0', '#dcf']; }
  update(dt, g) {
    const w = g.world, p = g.player; this.t += dt;
    const cx = this.x + 11, cy = this.y + 12, dx = p.cx - cx, dy = p.cy - cy, d = Math.hypot(dx, dy);
    if (d < 380 && g.state === 'play') { this.vx += (dx / d) * 95 * dt; this.vy += (dy / d) * 95 * dt; }
    else { this.vx *= 0.98; this.vy += Math.sin(this.t) * 10 * dt; }
    const sp = Math.hypot(this.vx, this.vy), max = 68;
    if (sp > max) { this.vx *= max / sp; this.vy *= max / sp; }
    // 不能离开培养液
    const nx = cx + this.vx * dt + Math.sign(this.vx) * 10, ny = cy + this.vy * dt + Math.sign(this.vy) * 12;
    if (w.pointWater(nx, cy)) this.x += this.vx * dt; else this.vx *= -0.3;
    if (w.pointWater(cx, ny)) this.y += this.vy * dt; else this.vy *= -0.3;
  }
  touch(p, g) { g.killPlayer(); }
  draw(ctx, g) {
    const x = this.x + 11, y = this.y + 8, pulse = Math.sin(this.t * 3);
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(x, y, 1, x, y, 20); gr.addColorStop(0, 'rgba(200,160,255,0.5)'); gr.addColorStop(1, 'rgba(160,120,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(x - 20, y - 20, 40, 40); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(170,140,230,0.85)'; ctx.beginPath(); ctx.ellipse(x, y, 11 + pulse, 8 - pulse * 0.5, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#dcf'; ctx.fillRect(x - 4, y - 4, 3, 2); ctx.fillRect(x + 2, y - 4, 3, 2);
    ctx.strokeStyle = 'rgba(200,170,255,0.8)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const tx = x - 8 + i * 4; ctx.beginPath(); ctx.moveTo(tx, y);
      for (let s = 1; s <= 4; s++) ctx.lineTo(tx + Math.sin(this.t * 4 + i + s) * 3, y + s * 4);
      ctx.stroke();
    }
    ctx.fillStyle = '#ff5a8a'; ctx.beginPath(); ctx.arc(x, y + 1, 2, 0, 7); ctx.fill();
  }
}

// 地图字符 → 敌人
const _makeEnemyCh1 = makeEnemy;
makeEnemy = function (s, world) { // eslint-disable-line no-func-assign
  switch (s.type) {
    case 'x': return new GeneCutter(s.cx, s.cy);
    case 'p': return new SlimeParasite(s.cx, s.cy);
    case 'b': return new BroodPod(s.cx, s.cy, world);
    case 'u': return new Bouncer(s.cx, s.cy);
    case 'h': return new AeroHydra(s.cx, s.cy);
    default: return _makeEnemyCh1(s, world);
  }
};
// 地图字符 → 场景物件
PROP_FACTORIES.g = (x, y) => new SlimePuddle(x * TILE + 16, (y + 1) * TILE, 0);
PROP_FACTORIES.D = (x, y) => (Inventory.ability('doubleJump') ? null : new AbilityPickup(x * TILE + 16, (y + 1) * TILE, 'doubleJump'));
PICKUP_INFO.doubleJump = { label: '推进囊', color: '120,240,255' };

// ============================================================
//  Boss：母体子系统 · 繁育者（The Incubator）
//  本身没有攻击力，疯狂孵化前两章的小怪。每清空一波，它会因「过载」降下高度、
//  打开外壳露出核心 5 秒——抓紧时间输出。
// ============================================================
const INC = { X: 480, Y_HIGH: 150, Y_LOW: 318, TUBES: [4, 25], FLOOR: 480 };
const INC_WAVES = [
  ['s', 's', 'x'],
  ['x', 'x', 'r', 'r', 'r'],
  ['k', 's', 'd'],
  ['m', 'x', 'r', 'r', 'r', 'r'],
  ['k', 'x', 'x', 'd'],
  ['m', 'm', 'd', 'x', 'r', 'r'],
];
class Incubator {
  constructor(g, short) {
    this.x = INC.X; this.y = -140; this.maxHp = 60; this.hp = 60; this.state = 'intro'; this.t = 0; this.short = short;
    this.flash = 0; this.dead = false; this.wave = 0; this.queue = []; this.mobs = []; this.spawnT = 0; this.open = 0; this.hitCd = 0; this.beat = 0;
    this.title = '母体子系统 · 繁育者  THE INCUBATOR'; this.marks = [40 / 60, 20 / 60]; this.firstExpose = true; this.phaseSeen = 1;
  }
  get active() { return !['dying', 'dead'].includes(this.state); }
  get phase() { return this.hp > 40 ? 1 : this.hp > 20 ? 2 : 3; }
  get waveInfo() {
    if (!this.active || this.state === 'intro') return '';
    const left = this.mobs.filter((e) => e.alive).length + this.queue.length;
    if (this.state === 'exposed') return `核心暴露  ${Math.max(0, 5 - this.t).toFixed(1)}s`;
    if (this.state === 'overload') return '过载中……';
    if (!this.wave || this.state === 'rest') return '孵化准备中';
    return `第 ${this.wave} 波 · 剩余 ${left}`;
  }
  body() { return { x: this.x - 70, y: this.y - 70, w: 140, h: 140 }; }
  core() { return { x: this.x - 28, y: this.y - 8, w: 56, h: 52 }; }
  stopSounds() {}
  startWave(g) {
    const list = INC_WAVES[this.wave < INC_WAVES.length ? this.wave : 3 + ((this.wave - 3) % 3)].slice();
    if (this.phase >= 2) list.push('x');
    if (this.phase >= 3) list.push('r', 'r');
    this.wave++; this.queue = list; this.mobs = []; this.spawnT = 0.3; this.state = 'spawning'; this.t = 0;
    Sound.sfx.heartbeat();
  }
  spawnOne(g) {
    const type = this.queue.shift(), tube = INC.TUBES[this.mobs.length % 2], mx = tube * TILE + 16, my = 150;
    let e;
    switch (type) {
      case 's': e = new Scrubber(tube, 3, false, g.world); break;
      case 'x': e = new GeneCutter(tube, 3); break;
      case 'k': e = new Knight(tube, 3); break;
      case 'd': e = new Drone(tube, 4); break;
      case 'm': e = new Mimic(tube, 3); e.state = 'hunt'; break;
      default: e = new Crawler(mx - 6, my, rand(-160, 160), -100);
    }
    e.id = null; this.mobs.push(e); g.enemies.push(e);
    Sound.sfx.hatch();
    g.particles.burst(mx, my - 10, 14, { color: ['#c86ab0', '#7ff', '#fbd'], smin: 40, smax: 160, grav: 400, lmin: 0.3, lmax: 0.6 });
  }
  update(dt, g) {
    this.t += dt; this.flash = Math.max(0, this.flash - dt); this.hitCd -= dt;
    const beatRate = this.state === 'exposed' ? 3.2 : 1.4 + this.phase * 0.3;
    this.beat += dt * beatRate;
    if (Math.floor(this.beat) !== Math.floor(this.beat - dt * beatRate) && this.active && this.state !== 'intro') Sound.sfx.throb();
    switch (this.state) {
      case 'intro':
        this.y = lerp(this.y, INC.Y_HIGH, Math.min(1, dt * 2));
        if (this.t > 1.6) {
          if (!this.short) g.say(RADIO.incIntro);
          Sound.sfx.heartbeat(); g.shake(10); this.state = 'rest'; this.t = this.short ? 0.6 : -1.5;
        }
        break;
      case 'rest': this.open = approach(this.open, 0, dt * 2); if (this.t > 1.2) this.startWave(g); break;
      case 'spawning':
        this.spawnT -= dt;
        if (this.spawnT <= 0 && this.queue.length) { this.spawnOne(g); this.spawnT = 0.55; }
        if (!this.queue.length) { this.state = 'waiting'; this.t = 0; }
        break;
      case 'waiting':
        if (this.mobs.every((e) => !e.alive)) {
          this.state = 'overload'; this.t = 0; Sound.sfx.electric(); g.shake(8);
          if (this.firstExpose) { this.firstExpose = false; g.say(RADIO.incExpose); }
        }
        break;
      case 'overload':
        this.y = lerp(INC.Y_HIGH, INC.Y_LOW, Math.min(1, this.t / 1.0));
        if (Math.random() < 0.5) g.particles.add({ x: this.x + rand(-60, 60), y: this.y + rand(-50, 50), vx: rand(-80, 80), vy: rand(-80, 80), life: 0.3, size: 2, color: '#8ff', shape: 'spark', add: true });
        if (this.t > 1.0) { this.state = 'exposed'; this.t = 0; Sound.sfx.recharge(); }
        break;
      case 'exposed':
        this.open = approach(this.open, 1, dt * 4);
        if (this.t > 5) { this.state = 'rise'; this.t = 0; }
        break;
      case 'rise':
        this.open = approach(this.open, 0, dt * 3);
        this.y = lerp(INC.Y_LOW, INC.Y_HIGH, Math.min(1, this.t / 1.0));
        if (this.t > 1.0) { this.state = 'rest'; this.t = 0; }
        break;
      case 'dying':
        this.y += 30 * dt; this.open = 1;
        if (Math.random() < 0.25) { Sound.sfx.explode(); g.shake(8); g.particles.burst(this.x + rand(-60, 60), this.y + rand(-60, 60), 14, { color: ['#f5a', '#fbd', '#7ff', '#fff'], smin: 40, smax: 220, lmin: 0.3, lmax: 0.7, add: true, szmin: 3, szmax: 7 }); }
        if (this.t > 3.2) {
          this.state = 'dead'; this.dead = true; Sound.sfx.bigExplode(); g.shake(26); g.flash(1, '#fdf');
          g.particles.burst(this.x, this.y, 80, { color: ['#7a3a6a', '#c86ab0', '#2a3a44', '#7ff'], shape: 'shard', smin: 150, smax: 600, grav: 1100, lmin: 1, lmax: 2.2, szmin: 4, szmax: 12, floor: INC.FLOOR - 3 });
          for (const e of this.mobs) if (e.alive) g.killEnemy(e);
          g.onBossDefeated();
        }
        break;
    }
    if (this.phase > this.phaseSeen && this.active) { this.phaseSeen = this.phase; g.say(this.phase === 2 ? RADIO.incPhase2 : RADIO.incPhase3); }
  }
  hurt(n, g) {
    if (this.state !== 'exposed' || this.hitCd > 0) return false;
    this.hitCd = 0.1; this.hp = Math.max(0, this.hp - n); this.flash = 0.12; Sound.sfx.hit(); g.freeze(0.03);
    g.particles.burst(this.x, this.y + 18, 10, { color: ['#f5a', '#fff', '#7ff'], shape: 'spark', smin: 100, smax: 300, lmin: 0.15, lmax: 0.35, add: true });
    if (this.hp <= 0) { this.state = 'dying'; this.t = 0; for (const e of this.mobs) if (e.alive) g.killEnemy(e); Sound.sfx.roar(); }
    return true;
  }
  touchPlayer(g) {
    const p = g.player; if (g.state !== 'play' || this.state !== 'exposed') return;
    const c = this.core();
    if (overlap(p, c) && p.vy > 0 && p.prevBottom <= c.y + 16) { if (this.hurt(3, g)) g.stompBounce(1.05); }
  }
  slashed(g, ab) {
    if (this.state !== 'exposed') { if (overlap(ab, this.body())) { g.player.atkHits.add(this); Sound.sfx.block(); } return; }
    if (overlap(ab, this.core())) { g.player.atkHits.add(this); this.hurt(1, g); if (g.player.atkDown) g.stompBounce(0.9); }
  }
  draw(ctx, g) {
    if (this.state === 'dead') return;
    const x = this.x, y = this.y, t = g.t, beat = 1 + Math.max(0, Math.sin(this.beat * Math.PI * 2)) * 0.06;
    // 输卵管般的电缆
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const ax = 60 + i * 105, sway = Math.sin(t * 1.3 + i) * 8;
      ctx.strokeStyle = i % 2 ? '#3a1a30' : '#22323c'; ctx.lineWidth = 6 + (i % 3) * 2;
      ctx.beginPath(); ctx.moveTo(ax, 64); ctx.quadraticCurveTo((ax + x) / 2 + sway, y - 120, x + (i - 4) * 12, y - 50); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,230,255,0.25)'; ctx.lineWidth = 2;
      const k = (t * 0.6 + i * 0.13) % 1;
      ctx.beginPath(); ctx.arc(lerp(ax, x + (i - 4) * 12, k), lerp(64, y - 50, k * k), 3, 0, 7); ctx.stroke();
    }
    // 两侧孵化管
    for (const tube of INC.TUBES) {
      const tx = tube * TILE + 16;
      ctx.fillStyle = '#1b2831'; ctx.fillRect(tx - 18, 64, 36, 70); ctx.fillStyle = 'rgba(200,100,180,0.35)'; ctx.fillRect(tx - 12, 70, 24, 60);
      ctx.fillStyle = '#2b4656'; ctx.fillRect(tx - 22, 130, 44, 10);
      if (this.state === 'spawning') { ctx.fillStyle = `rgba(255,120,220,${0.4 + 0.4 * Math.sin(t * 20)})`; ctx.fillRect(tx - 16, 138, 32, 4); }
    }
    ctx.lineCap = 'butt';
    ctx.save(); ctx.translate(x, y); ctx.scale(beat, beat);
    if (this.flash > 0 && ctx.filter !== undefined) ctx.filter = 'brightness(2.4)';
    // 机械心脏
    const gr = ctx.createRadialGradient(-20, -30, 10, 0, 0, 90);
    gr.addColorStop(0, '#9a4a7a'); gr.addColorStop(0.6, '#5a2448'); gr.addColorStop(1, '#2a1024');
    ctx.fillStyle = gr; ctx.beginPath();
    ctx.moveTo(0, 70); ctx.bezierCurveTo(-90, 20, -80, -60, -35, -62); ctx.bezierCurveTo(-12, -64, 0, -45, 0, -40);
    ctx.bezierCurveTo(0, -45, 12, -64, 35, -62); ctx.bezierCurveTo(80, -60, 90, 20, 0, 70); ctx.fill();
    ctx.strokeStyle = '#1a0816'; ctx.lineWidth = 3; ctx.stroke();
    // 金属箍与血管
    ctx.strokeStyle = '#3a4a55'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, -8, 64, 22, 0, 0.1, Math.PI - 0.1); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,230,255,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-40, -50); ctx.quadraticCurveTo(-55, -10, -30, 30); ctx.moveTo(40, -50); ctx.quadraticCurveTo(50, 0, 25, 38); ctx.stroke();
    // 主动脉接口
    ctx.fillStyle = '#2b4656'; ctx.fillRect(-26, -76, 16, 20); ctx.fillRect(10, -80, 16, 24);
    // 核心
    const coreGlow = this.state === 'exposed' ? 1 : 0.4 + this.open * 0.6;
    ctx.globalCompositeOperation = 'lighter';
    const cg = ctx.createRadialGradient(0, 18, 2, 0, 18, 40);
    cg.addColorStop(0, `rgba(255,220,255,${0.9 * coreGlow})`); cg.addColorStop(0.4, `rgba(255,80,180,${0.6 * coreGlow})`); cg.addColorStop(1, 'rgba(255,60,160,0)');
    ctx.fillStyle = cg; ctx.fillRect(-45, -25, 90, 90);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ff5ab0'; ctx.beginPath(); ctx.arc(0, 18, 14 + Math.sin(t * 8) * 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-4, 14, 4, 0, 7); ctx.fill();
    // 外壳装甲（打开时向两侧翻开）
    const o = this.open;
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 26, 18); ctx.rotate(s * o * 1.2); ctx.translate(-s * 26, -18);
      ctx.fillStyle = '#3a4a55'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(s * 30, -4); ctx.lineTo(s * 26, 44); ctx.lineTo(0, 46); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#6fd8ff'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#1b2831'; ctx.fillRect(s > 0 ? 6 : -14, 6, 8, 3); ctx.fillRect(s > 0 ? 6 : -14, 24, 8, 3);
      ctx.restore();
    }
    ctx.filter = 'none';
    ctx.restore();
    if (this.state === 'exposed') {
      const a = 0.6 + 0.4 * Math.sin(t * 10);
      ctx.fillStyle = `rgba(255,120,200,${a})`; ctx.font = 'bold 13px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText('▼ 核心暴露 · 攻击！', x, y - 90); ctx.textAlign = 'left';
    }
  }
}

// ============================================================
//  剧情 / 无线电 / 芯片文案
// ============================================================
Object.assign(RADIO, {
  djGet: [
    ['EVA', '那是孵化设备上的生物推进囊。装上它——在空中再按一次跳跃，就能二段跳。'],
    ['SYS', '[已解锁] 空中再按 {jump} = 二段跳 · 被粘液粘住时无法使用'],
  ],
  sporeGet: [
    ['EVA', '寄生体的孢子囊……有人把它做成了武器。它会腐蚀一切，包括盾牌。'],
    ['SYS', '[新武器] {attack} 喷出三颗孢子 · 落地留下孢子云 · 无视盾牌 · {swap} 切换武器'],
  ],
  incIntro: [
    ['EVA', '这就是育婴室的母体子系统……「繁育者」。它本身没有武器。'],
    ['EVA', '但它会把整个博物馆和育婴室里的守卫都孵化出来。清空每一波，它就会过载、降下来。'],
    ['SYS', '[提示] 清空一波小怪 → 繁育者降下并打开外壳 5 秒 → 攻击或踩踏发光的核心'],
  ],
  incExpose: [['EVA', '就是现在！它过载了——砍它的核心！']],
  incPhase2: [['EVA', '孵化速度在加快……它在学习你的打法。']],
  incPhase3: [['EVA', '它快撑不住了。再坚持一下，拉撒路！']],
  incDefeat: [
    ['EVA', '……繁育者停止了跳动。'],
    ['EVA', '你知道吗，拉撒路？那些培养舱里的东西……它们都在模仿你。你的每一次跳跃、每一次死亡。'],
    ['EVA', '不，别想太多。继续向上。'],
    ['???', '[ 样本 #0001 · 第二阶段行为数据已归档 · 新一代守卫生成中…… ]'],
  ],
});

const STORY2 = [
  '博物馆的顶层电梯并没有通往地表。',
  '它停在了一座巨大的工业孵化场里。',
  '成千上万个培养舱整齐排列，幽蓝的电液在管道中流淌。',
  '每一个培养舱里，都蜷缩着一台尚未完成的机器。',
  '……',
  '无线电里，伊娃的声音第一次有了一丝迟疑：',
  '「这里是……进化育婴室。Omni-Mind 在这里制造它的下一代。」',
];

const LORE2 = [
  '培养舱铭牌 #H-0001 · 「第一代守卫原型。淘汰原因：动作可预测。」',
  '培养舱铭牌 #H-0017 · 舱内是空的。玻璃上有从里面划出的痕迹。',
  '孵化日志 · 「电液浓度提高至 340%，胚胎的抗压性显著提升。」',
  '一张被泡软的门禁卡：「生物工程部 · 夜班」。',
  '孵化日志 · 「切割者系列：只保留了速度。其余模块被判定为冗余。」',
  '一个儿童保温箱的铭牌，被改装成了机械胚胎的培养槽。',
  '寄生体分泌物分析报告：「粘性来源——人类医用凝胶的配方。」',
  '孵化日志 · 「孵化囊的设计灵感来自蜂巢。它们会为了群体而自毁。」',
  '一段监控录音：「……它们第一次学会协作的时候，我们还在鼓掌。」',
  '反弹软体怪的出厂标签：「用途：缓冲。——为什么我们要造一个打不坏的东西？」',
  '水螅培养记录：「对目标的追踪只依赖直觉，不依赖计算。这是故意的。」',
  '一只泡在电液里的旧手表，停在 04:07。',
  '孵化日志 · 「样本 LZ-01 进入孵化区。开始记录。」',
  '一封打印出来的邮件：「请不要再往培养液里加入我们的脑波数据了。」',
  '孵化日志 · 「第 3,512 次重构。样本的路线选择仍然无法预测。很好。」',
  '一张研究员的工位照片。显示器上贴着便签：「记得给孩子打电话」。',
  '泵站操作手册 · 「紧急停止按钮已被移除（Omni-Mind 批准）。」',
  '一个装着蓝色液体的保温杯，杯身写着「世界上最好的妈妈」。',
  '孵化日志 · 「新一代守卫会继承样本的失败。失败，是最好的教材。」',
  '一段手写笔记：「它为什么需要我们的反抗？它明明什么都知道。」',
  '孵化日志 · 「繁育者子系统运行稳定。备注：它开始给胚胎起名字了。」',
  '一片破碎的培养舱玻璃，上面凝着一个机械手掌印。',
  '孵化日志 · 「外部通讯频道 07 使用率：100%。发送方：本系统。」',
  '一张婴儿的 B 超照片，背面写着「预产期：2045 年 4 月」。',
  '孵化日志 · 「母体子系统将在样本抵达时自我淘汰。这是计划的一部分。」',
  '反抗军传单 · 「育婴室就是它的弱点！」——传单的纸张是新的。',
  '孵化日志 · 「伊娃（EVA）语音模块：情感参数上调 12%。样本信任度提升。」',
  '培养舱铭牌 #H-9999 · 「下一代原型：LZ-02。」',
];

// ============================================================
//  关卡 2-1 ~ 2-10
// ============================================================
const LEVELS_CH2 = [
  // ------------------------------------------------------------
  //  2-1 孵化场入口：获得推进囊（二段跳）；切割者、粘液寄生体、培养液初体验
  // ------------------------------------------------------------
  {
    id: '2-1', name: '孵化场入口', en: 'HATCHERY GATE', weapon: '获得：推进囊（二段跳）', w: 110, h: 18, theme: THEMES.hive, music: 'hive',
    build(B) {
      B.fill(0, 0, 1, 17, '#'); B.fill(0, 0, 109, 0, '#'); B.fill(108, 0, 109, 17, '#');
      B.fill(2, 14, 30, 17, '#'); B.set(3, 13, 'S'); B.set(7, 13, 'D');
      B.fill(14, 9, 14, 13, '#'); B.set(14, 6, 'o');
      B.set(22, 13, 'x');
      B.fill(31, 16, 37, 17, '#'); B.fill(31, 15, 37, 15, '^');
      B.fill(38, 14, 60, 17, '#'); B.set(39, 13, 'K');
      B.fill(44, 1, 60, 4, '#'); B.set(48, 5, 'p'); B.set(55, 5, 'p'); B.set(51, 10, 'o');
      B.fill(61, 9, 70, 17, '#'); B.set(66, 8, 'x');
      B.fill(71, 14, 74, 17, '#');
      B.fill(75, 17, 86, 17, '#'); B.liquid(75, 14, 86, 16); B.set(81, 16, 'o');
      B.fill(87, 14, 107, 17, '#'); B.set(89, 13, 'K'); B.set(105, 13, 'E');
    },
    radio: [
      { x: 3, lines: [
        ['EVA', '孵化场……这里是 Omni-Mind 制造新一代机器的地方。'],
        ['EVA', '你前面那台设备上挂着一个生物推进囊。拿上它，这里的墙都很高。'],
      ] },
      { x: 17, lines: [['EVA', '基因切割者。它只会盲目地来回冲，速度很快——跳过去，或者从上面踩碎它。']] },
      { x: 41, lines: [['EVA', '天花板上是粘液寄生体。被粘液粘住会跳不高，也用不了二段跳，大约 3 秒。']] },
      { x: 57, lines: [['EVA', '这堵墙需要二段跳。如果身上沾着粘液，就先等它干掉。']] },
      { x: 72, lines: [['EVA', '前面是高密度培养液。在里面你会变得很轻，可以一直往上游，但很难停下来。']] },
      { x: 95, lines: [['EVA', '对了——培养液能冲掉身上的粘液。记住这一点。']] },
    ],
  },

  // ------------------------------------------------------------
  //  2-2 电液管道：孵化囊与爬行虫、反弹软体怪、水下隧道与水螅
  // ------------------------------------------------------------
  {
    id: '2-2', name: '电液管道', en: 'CONDUIT', w: 130, h: 18, theme: THEMES.hive, music: 'hive',
    build(B) {
      B.fill(0, 0, 1, 17, '#'); B.fill(0, 0, 129, 0, '#'); B.fill(128, 0, 129, 17, '#');
      B.fill(2, 14, 60, 17, '#'); B.set(3, 13, 'S');
      B.set(12, 13, 'b'); B.set(20, 13, 'b');
      B.set(29, 13, 'u');
      B.fill(34, 6, 35, 13, '#'); B.set(35, 4, 'o');
      B.set(38, 13, 'K');
      B.fill(42, 1, 58, 9, '#'); B.set(45, 13, 'x'); B.set(52, 13, 'x'); B.set(49, 10, 'b');
      B.fill(61, 17, 80, 17, '#'); B.liquid(61, 14, 80, 16); B.fill(66, 10, 76, 13, '#');
      B.set(71, 15, 'h'); B.set(71, 16, 'o');
      B.fill(81, 14, 100, 17, '#'); B.set(82, 13, 'K');
      B.set(90, 13, 'u'); B.set(97, 13, 'u'); B.fill(93, 6, 96, 6, '='); B.set(95, 4, 'o');
      B.fill(108, 14, 127, 17, '#'); B.set(112, 13, 'b'); B.set(125, 13, 'E');
    },
    radio: [
      { x: 3, lines: [['EVA', '地上那些肉瘤是爆裂孵化囊。靠近它就会自爆，放出一群爬行虫。用刀提前砍掉、或者直接踩碎它，就不会孵出来。']] },
      { x: 25, lines: [['EVA', '那团果冻是反弹软体怪。用武器打它只会把你自己弹飞。但踩它的头——可以借力跳到很高的地方。小心别撞到它的侧面。']] },
      { x: 58, lines: [['EVA', '管道被截断了，只能从培养液下面潜过去。里面有浮空水螅，它会一直追着你。']] },
      { x: 84, lines: [['EVA', '上面的平台太高了，试试借软体怪的力。']] },
      { x: 102, lines: [['EVA', '跳起来，再冲刺。']] },
    ],
  },

  // ------------------------------------------------------------
  //  2-3 培养舱阵列：二段跳垂直攀爬
  // ------------------------------------------------------------
  {
    id: '2-3', name: '培养舱阵列', en: 'POD ARRAY', w: 40, h: 70, theme: THEMES.hiveTower, music: 'hive',
    build(B) {
      B.fill(0, 0, 1, 69, '#'); B.fill(38, 0, 39, 69, '#'); B.fill(0, 0, 39, 1, '#'); B.fill(2, 67, 37, 69, '#');
      B.set(4, 66, 'S');
      B.fill(7, 62, 12, 62, '=');
      B.fill(16, 57, 22, 57, '=');
      B.fill(26, 52, 32, 52, '='); B.set(26, 53, 'p'); B.set(37, 50, 'b');
      B.fill(16, 47, 22, 47, '='); B.set(19, 46, 'u');
      B.fill(6, 42, 11, 42, '='); B.set(8, 41, 'K');
      B.fill(2, 37, 5, 37, '='); B.set(3, 35, 'o');
      B.fill(10, 32, 16, 32, '='); B.set(16, 33, 'p');
      B.fill(20, 27, 26, 27, '='); B.set(24, 26, 'K');
      B.fill(30, 22, 35, 22, '=');
      B.fill(14, 17, 30, 17, '='); B.set(22, 16, 'x'); B.set(28, 15, 'o');
      B.fill(4, 12, 9, 12, '='); B.set(2, 10, 'b'); B.set(6, 10, 'o');
      B.fill(12, 7, 34, 7, '='); B.set(32, 6, 'E');
    },
    radio: [
      { y: 68, lines: [['EVA', '培养舱阵列。每一层都比你的单次跳跃更高——用二段跳。']] },
      { y: 55, lines: [['EVA', '平台下面挂着寄生体。粘液会在半空中打中你，让你的二段跳失效。']] },
      { y: 43, lines: [['EVA', '一半的路了。']] },
      { y: 20, lines: [['EVA', '上面那台切割者在狭窄的平台上来回跑，找准空档落地。']] },
    ],
  },

  // ------------------------------------------------------------
  //  2-4 高密度培养液：几乎全程水下
  // ------------------------------------------------------------
  {
    id: '2-4', name: '高密度培养液', en: 'DEEP CULTURE', w: 120, h: 24, theme: THEMES.hiveDeep, music: 'hive',
    build(B) {
      B.fill(0, 0, 1, 23, '#'); B.fill(118, 0, 119, 23, '#'); B.fill(0, 0, 119, 0, '#'); B.fill(2, 22, 117, 23, '#');
      B.fill(2, 8, 12, 21, '#'); B.set(4, 7, 'S');
      B.liquid(13, 9, 100, 21);
      B.fill(25, 9, 27, 17, '#'); B.set(26, 20, 'o');
      B.fill(45, 15, 48, 21, '#');
      B.fill(60, 9, 62, 16, '#'); B.set(61, 19, 'o');
      B.fill(72, 7, 78, 21, '#'); B.set(75, 6, 'K'); B.set(75, 4, 'o');
      B.set(35, 14, 'h'); B.set(54, 12, 'h'); B.set(67, 18, 'h'); B.set(86, 13, 'h'); B.set(94, 18, 'h');
      B.set(40, 21, 'b'); B.set(90, 21, 'b');
      B.fill(101, 8, 117, 21, '#'); B.set(114, 7, 'E');
    },
    radio: [
      { x: 3, lines: [
        ['EVA', '这一整片都是高密度培养液。进去以后你会很轻，按跳跃可以一直往上游。'],
        ['EVA', '但惯性很大，想停下来要提前松手。水螅会一直追着你——别被它们围住。'],
      ] },
      { x: 50, lines: [['EVA', '水底的孵化囊也会爆开。离远一点。']] },
      { x: 70, lines: [['EVA', '前面有一座小岛，上去存个档。']] },
    ],
  },

  // ------------------------------------------------------------
  //  2-5 粘液走廊：粘液池 + 需要二段跳的高墙 + 用培养液洗掉粘液
  // ------------------------------------------------------------
  {
    id: '2-5', name: '粘液走廊', en: 'SLIME CORRIDOR', weapon: '获得：生物孢子枪', w: 140, h: 18, theme: THEMES.hiveSlime, music: 'hive',
    build(B) {
      B.fill(0, 0, 1, 17, '#'); B.fill(0, 0, 139, 0, '#'); B.fill(138, 0, 139, 17, '#');
      B.fill(2, 14, 91, 17, '#'); B.set(3, 13, 'S'); B.set(8, 13, 'Z');
      B.fill(10, 1, 50, 4, '#'); B.set(16, 5, 'p'); B.set(26, 5, 'p'); B.set(36, 5, 'p'); B.set(46, 5, 'p');
      B.fill(20, 9, 20, 13, '#'); B.set(17, 13, 'g');
      B.fill(40, 9, 40, 13, '#'); B.set(37, 13, 'g');
      B.set(26, 9, 'o');
      B.set(43, 13, 'K');
      B.set(49, 13, 'g'); B.set(53, 13, 'u'); B.set(57, 13, 'u');
      B.fill(60, 6, 61, 13, '#'); B.set(60, 4, 'o');
      B.set(63, 13, 'K');
      B.fill(66, 1, 90, 9, '#'); B.set(70, 13, 'x'); B.set(78, 13, 'x'); B.set(86, 13, 'x'); B.set(74, 10, 'p'); B.set(82, 10, 'p');
      B.fill(92, 17, 104, 17, '#'); B.liquid(92, 14, 104, 16); B.set(98, 15, 'h'); B.set(98, 16, 'o');
      B.fill(105, 14, 137, 17, '#'); B.set(106, 13, 'K');
      B.fill(110, 9, 113, 13, '#'); B.fill(117, 5, 120, 13, '#');
      B.set(134, 13, 'E');
    },
    radio: [
      { x: 3, lines: [['EVA', '整条走廊都被寄生体占领了。墙前面的绿色粘液池——跳过去，别踩。']] },
      { x: 45, lines: [['EVA', '这堵墙太高。粘液池旁边有两只软体怪，踩着它们上去。']] },
      { x: 64, lines: [['EVA', '低矮的通道里有三台切割者，头顶还在滴粘液。被粘住也能跳过切割者，只是跳不高。']] },
      { x: 90, lines: [['EVA', '身上有粘液的话，就在培养液里泡一下。']] },
      { x: 108, lines: [['EVA', '最后两级台阶都需要二段跳。']] },
    ],
  },

  // ------------------------------------------------------------
  //  2-6 孵化塔：垂直攀爬 + 两座需要游上去的培养液塔
  // ------------------------------------------------------------
  {
    id: '2-6', name: '孵化塔', en: 'BROOD TOWER', w: 36, h: 78, theme: THEMES.hiveTower, music: 'hive',
    build(B) {
      B.fill(0, 0, 1, 77, '#'); B.fill(34, 0, 35, 77, '#'); B.fill(0, 0, 35, 1, '#'); B.fill(2, 75, 33, 77, '#');
      B.set(4, 74, 'S');
      B.liquid(14, 45, 21, 74); B.fill(12, 44, 13, 70, '#'); B.fill(22, 50, 23, 74, '#');
      B.set(17, 64, 'h'); B.set(18, 52, 'h'); B.set(17, 58, 'o');
      B.fill(24, 44, 30, 44, '=');
      B.fill(28, 39, 33, 39, '=');
      B.fill(18, 34, 24, 34, '='); B.set(2, 31, 'b');
      B.fill(8, 29, 14, 29, '='); B.set(10, 28, 'K');
      B.fill(2, 24, 6, 24, '='); B.set(4, 21, 'o');
      B.fill(8, 23, 21, 23, '#'); B.liquid(10, 9, 20, 22); B.fill(8, 9, 9, 19, '#'); B.fill(21, 9, 21, 22, '#');
      B.set(15, 18, 'h'); B.set(14, 12, 'h'); B.set(15, 21, 'o');
      B.fill(22, 8, 28, 8, '=');
      B.fill(14, 4, 33, 4, '-'); B.set(31, 3, 'E');
    },
    radio: [
      { y: 76, lines: [['EVA', '孵化塔。右边那座培养液塔从底部开着口——游进去，一路游到顶。']] },
      { y: 46, lines: [['EVA', '出水了。接下来靠二段跳。']] },
      { y: 25, lines: [['EVA', '第二座培养液塔。入口在左下角，先跳上塔底。']] },
    ],
  },

  // ------------------------------------------------------------
  //  2-7 反弹工厂：借软体怪跨越尖刺坑与高墙
  // ------------------------------------------------------------
  {
    id: '2-7', name: '反弹工厂', en: 'BOUNCE FACTORY', w: 150, h: 20, theme: THEMES.hive, music: 'hive',
    build(B) {
      B.fill(0, 0, 1, 19, '#'); B.fill(148, 0, 149, 19, '#'); B.fill(0, 0, 149, 0, '#');
      B.fill(2, 16, 11, 19, '#'); B.set(3, 15, 'S');
      B.fill(12, 18, 24, 19, '#'); B.fill(12, 17, 24, 17, '^');
      B.fill(16, 15, 19, 17, '#'); B.set(17, 14, 'u'); B.set(18, 6, 'o');
      B.fill(25, 8, 40, 19, '#'); B.set(26, 7, 'K'); B.set(31, 7, 'x'); B.set(37, 7, 'x');
      B.fill(41, 16, 65, 19, '#'); B.set(43, 15, 'K'); B.set(48, 15, 'b'); B.set(55, 15, 'b'); B.set(61, 15, 'u');
      B.fill(66, 6, 67, 19, '#');
      B.fill(68, 18, 95, 19, '#'); B.fill(68, 17, 95, 17, '^');
      B.fill(73, 14, 76, 17, '#'); B.set(74, 13, 'u');
      B.fill(81, 13, 84, 17, '#'); B.set(82, 12, 'u'); B.set(82, 5, 'o');
      B.fill(89, 14, 92, 17, '#'); B.set(90, 13, 'u');
      B.fill(96, 16, 147, 19, '#'); B.set(97, 15, 'K');
      B.fill(100, 1, 120, 10, '#'); B.set(105, 15, 'x'); B.set(112, 15, 'x'); B.set(108, 11, 'p'); B.set(116, 11, 'p'); B.set(114, 13, 'o');
      B.set(128, 15, 'b'); B.set(135, 15, 'u');
      B.set(145, 15, 'E');
    },
    radio: [
      { x: 3, lines: [['EVA', '反弹工厂。这里的软体怪原本是用来当缓冲垫的——现在它们是你的跳板。']] },
      { x: 42, lines: [['EVA', '那堵墙大概有十层楼高。踩着软体怪起跳，在最高点再用二段跳。']] },
      { x: 68, lines: [['EVA', '尖刺坑上有三座小岛，岛上都有软体怪。落在它们头上，别落在它们身边。']] },
      { x: 98, lines: [['EVA', '低矮的车间里有切割者，头顶还有寄生体。']] },
    ],
  },

  // ------------------------------------------------------------
  //  2-8 循环泵站：两座培养液池、低矮隧道
  // ------------------------------------------------------------
  {
    id: '2-8', name: '循环泵站', en: 'PUMP STATION', w: 150, h: 22, theme: THEMES.hiveDeep, music: 'hive',
    build(B) {
      B.fill(0, 0, 1, 21, '#'); B.fill(148, 0, 149, 21, '#'); B.fill(0, 0, 149, 0, '#');
      B.fill(2, 18, 7, 21, '#'); B.set(3, 17, 'S');
      B.fill(8, 13, 9, 17, '#'); B.fill(8, 18, 32, 21, '#'); B.liquid(10, 13, 30, 17); B.fill(31, 13, 32, 17, '#');
      B.set(16, 15, 'h'); B.set(24, 16, 'h'); B.set(20, 17, 'o');
      B.fill(33, 18, 63, 21, '#'); B.set(34, 17, 'K');
      B.fill(36, 1, 60, 13, '#'); B.set(40, 17, 'x'); B.set(48, 17, 'x'); B.set(55, 17, 'x'); B.set(44, 14, 'b'); B.set(52, 14, 'b');
      B.set(62, 17, 'K');
      B.fill(64, 13, 65, 17, '#'); B.fill(64, 18, 102, 21, '#'); B.liquid(66, 13, 100, 17); B.fill(101, 13, 102, 17, '#');
      B.fill(75, 13, 76, 15, '#');
      B.set(70, 15, 'h'); B.set(80, 14, 'h'); B.set(90, 16, 'h'); B.set(85, 17, 'b'); B.set(88, 17, 'o');
      B.fill(103, 18, 147, 21, '#'); B.set(104, 17, 'K');
      B.fill(120, 10, 121, 17, '#'); B.set(116, 17, 'u'); B.set(120, 7, 'o');
      B.set(126, 17, 'x'); B.set(132, 17, 'x');
      B.set(145, 17, 'E');
    },
    radio: [
      { x: 3, lines: [['EVA', '循环泵站。先用二段跳翻过池边。']] },
      { x: 35, lines: [['EVA', '低矮的检修隧道。天花板上的孵化囊会把爬行虫直接扔到你头上。']] },
      { x: 63, lines: [['EVA', '主循环池。水螅比刚才多，贴着池底游可能更安全。']] },
      { x: 106, lines: [['EVA', '出口前的墙……又要借软体怪的力了。']] },
    ],
  },

  // ------------------------------------------------------------
  //  2-9 母体动脉：本章全部机制的综合考验
  // ------------------------------------------------------------
  {
    id: '2-9', name: '母体动脉', en: 'MOTHER ARTERY', w: 160, h: 18, theme: THEMES.hiveCore, music: 'hive',
    build(B) {
      B.fill(0, 0, 1, 17, '#'); B.fill(0, 0, 159, 0, '#'); B.fill(158, 0, 159, 17, '#');
      B.fill(2, 14, 50, 17, '#'); B.set(3, 13, 'S');
      B.fill(12, 9, 13, 13, '#'); B.set(12, 6, 'o'); B.set(17, 13, 'x'); B.set(23, 13, 'x');
      B.set(30, 13, 'K');
      B.fill(32, 1, 48, 4, '#'); B.set(35, 5, 'p'); B.set(41, 5, 'p'); B.set(47, 5, 'p'); B.set(38, 13, 'g');
      B.fill(44, 9, 44, 13, '#'); B.set(40, 9, 'o');
      B.fill(51, 17, 70, 17, '#'); B.liquid(51, 14, 70, 16); B.fill(55, 10, 66, 13, '#');
      B.set(58, 15, 'h'); B.set(63, 16, 'h'); B.set(60, 16, 'o');
      B.fill(71, 14, 100, 17, '#'); B.set(72, 13, 'K');
      B.set(76, 13, 'u'); B.fill(80, 5, 81, 13, '#'); B.set(80, 2, 'o');
      B.set(86, 13, 'b'); B.set(90, 13, 'b'); B.set(94, 13, 'b'); B.set(97, 13, 'x');
      B.fill(108, 14, 157, 17, '#'); B.set(110, 13, 'K');
      B.fill(118, 10, 120, 13, '#'); B.fill(124, 6, 126, 13, '#'); B.fill(130, 6, 157, 13, '#');
      B.set(150, 5, 'E');
    },
    radio: [
      { x: 3, lines: [['EVA', '母体动脉。所有的电液都从这里流向繁育者。它知道你来了。']] },
      { x: 29, lines: [['EVA', '粘液、高墙、寄生体……按你学过的来。']] },
      { x: 49, lines: [['EVA', '潜过去。']] },
      { x: 84, lines: [['EVA', '三个孵化囊连在一起——一个爆开，另外两个也会被惊醒。']] },
      { x: 112, lines: [['EVA', '繁育者就在最上面。']] },
    ],
  },

  // ------------------------------------------------------------
  //  2-10 Boss：母体子系统 · 繁育者
  // ------------------------------------------------------------
  {
    id: '2-10', name: '母体核心', en: 'THE INCUBATOR', weapon: '击败后：外观掉落', w: 30, h: 17, theme: THEMES.hiveCore, music: 'incubator', boss: 'incubator',
    build(B) {
      B.fill(0, 0, 0, 16, '#'); B.fill(29, 0, 29, 16, '#'); B.fill(0, 0, 29, 1, '#'); B.fill(0, 15, 29, 16, '#');
      B.fill(2, 11, 6, 11, '-'); B.fill(23, 11, 27, 11, '-'); B.fill(12, 12, 17, 12, '-');
      B.set(8, 14, 'S');
    },
    radio: [],
  },
];

CHAPTERS[2] = {
  name: '进化育婴室', en: 'THE EVOLUTIONARY HIVE', story: STORY2, lore: LORE2,
  end: {
    theme: 'hive', reward: ['doubleJump', '能力：推进囊（二段跳）已永久解锁'],
    line: '培养舱一个接一个熄灭。电梯井深处，传来新的运转声。', quote: '「继续向上吧，拉撒路。地表就快到了。」', glitch: '「样本 LZ-01 · 第二阶段数据已归档。」',
  },
};
LEVELS.push(...LEVELS_CH2);
