'use strict';
// ============================================================
//  美术：程序化生成的博物馆背景、壁画、瓦片
// ============================================================
const Art = {
  init() {
    this.mural = makeMural();
    this.columns = makeColumns();
    this.vignette = makeVignette();
    this.scan = makeScanlines();
    this.motes = [];
    for (let i = 0; i < 70; i++) this.motes.push({ x: rand(0, VW), y: rand(0, VH), z: rand(0.3, 1.2), s: rand(0.8, 2.2), p: rand(0, 6) });
  },
};

// ---------------- 壁画：人类文明的辉煌 ----------------
function makeMural() {
  const W = 2400, H = 620, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(7);
  x.fillStyle = '#15181a'; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(255,255,255,0.028)'; x.lineWidth = 2;
  for (let yy = 0; yy < H; yy += 48) {
    const off = (yy / 48) % 2 ? 48 : 0;
    for (let xx = -off; xx < W; xx += 96) x.strokeRect(xx + 1, yy + 1, 94, 46);
  }
  const scenes = [sceneFire, sceneVitruvian, sceneMoon, sceneCity, sceneHands];
  const titles = ['火 种', '度 量', '远 航', '城 邦', '造 物'];
  for (let i = 0; i < 5; i++) {
    const px = 70 + i * 480, py = 110, pw = 380, ph = 280;
    x.fillStyle = '#231d16'; x.fillRect(px - 16, py - 16, pw + 32, ph + 32);
    x.strokeStyle = '#57462b'; x.lineWidth = 4; x.strokeRect(px - 10, py - 10, pw + 20, ph + 20);
    x.strokeStyle = '#3a2f20'; x.lineWidth = 2; x.strokeRect(px - 4, py - 4, pw + 8, ph + 8);
    x.save(); x.beginPath(); x.rect(px, py, pw, ph); x.clip();
    x.fillStyle = '#2a2e2b'; x.fillRect(px, py, pw, ph);
    scenes[i](x, px, py, pw, ph, r);
    x.fillStyle = 'rgba(18,20,22,0.42)'; x.fillRect(px, py, pw, ph);
    // 裂纹
    x.strokeStyle = 'rgba(10,10,10,0.6)'; x.lineWidth = 1.5;
    for (let k = 0; k < 6; k++) {
      let cx = px + r() * pw, cy = py + r() * ph; x.beginPath(); x.moveTo(cx, cy);
      for (let s = 0; s < 6; s++) { cx += (r() - 0.5) * 60; cy += (r() - 0.3) * 40; x.lineTo(cx, cy); }
      x.stroke();
    }
    // 剥落
    x.fillStyle = '#1b1d1e';
    for (let k = 0; k < 3; k++) {
      const cx = px + r() * pw, cy = py + r() * ph, rr = 15 + r() * 35;
      x.beginPath();
      for (let a = 0; a < 10; a++) { const ang = a / 10 * Math.PI * 2, rad = rr * (0.6 + r() * 0.5); x.lineTo(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad); }
      x.fill();
    }
    x.restore();
    // 铭牌
    x.fillStyle = '#3a3226'; x.fillRect(px + pw / 2 - 56, py + ph + 30, 112, 22);
    x.fillStyle = '#8a7a5a'; x.font = '14px ' + FONT; x.textAlign = 'center'; x.fillText(titles[i], px + pw / 2, py + ph + 46);
  }
  // 苔藓 / 水渍
  for (let k = 0; k < 40; k++) {
    const gx = r() * W, gy = r() * H;
    const g = x.createRadialGradient(gx, gy, 0, gx, gy, 40 + r() * 60);
    g.addColorStop(0, 'rgba(40,60,30,0.18)'); g.addColorStop(1, 'rgba(40,60,30,0)');
    x.fillStyle = g; x.fillRect(gx - 100, gy - 100, 200, 200);
  }
  return c;
}
function figure(x, cx, gy, s, col, armsUp) {
  x.fillStyle = col; x.strokeStyle = col; x.lineWidth = 3 * s; x.lineCap = 'round';
  x.beginPath(); x.arc(cx, gy - 38 * s, 6 * s, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.moveTo(cx, gy - 31 * s); x.lineTo(cx, gy - 14 * s); x.stroke();
  x.beginPath(); x.moveTo(cx, gy - 14 * s); x.lineTo(cx - 6 * s, gy); x.moveTo(cx, gy - 14 * s); x.lineTo(cx + 6 * s, gy); x.stroke();
  x.beginPath();
  if (armsUp) { x.moveTo(cx, gy - 28 * s); x.lineTo(cx - 10 * s, gy - 44 * s); x.moveTo(cx, gy - 28 * s); x.lineTo(cx + 10 * s, gy - 44 * s); }
  else { x.moveTo(cx, gy - 28 * s); x.lineTo(cx - 9 * s, gy - 18 * s); x.moveTo(cx, gy - 28 * s); x.lineTo(cx + 9 * s, gy - 18 * s); }
  x.stroke();
}
function sceneFire(x, px, py, pw, ph, r) {
  const g = x.createLinearGradient(0, py, 0, py + ph); g.addColorStop(0, '#6e4a2a'); g.addColorStop(1, '#2a1c14');
  x.fillStyle = g; x.fillRect(px, py, pw, ph);
  x.fillStyle = '#c9a66a'; x.beginPath(); x.arc(px + pw / 2, py + 70, 36, 0, Math.PI * 2); x.fill();
  x.strokeStyle = 'rgba(201,166,106,0.5)'; x.lineWidth = 3;
  for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2; x.beginPath(); x.moveTo(px + pw / 2 + Math.cos(an) * 46, py + 70 + Math.sin(an) * 46); x.lineTo(px + pw / 2 + Math.cos(an) * 70, py + 70 + Math.sin(an) * 70); x.stroke(); }
  x.fillStyle = '#1e1510'; x.fillRect(px, py + ph - 50, pw, 50);
  x.fillStyle = '#d0703a'; x.beginPath(); x.moveTo(px + pw / 2 - 26, py + ph - 50); x.quadraticCurveTo(px + pw / 2 - 10, py + ph - 110, px + pw / 2, py + ph - 130); x.quadraticCurveTo(px + pw / 2 + 12, py + ph - 100, px + pw / 2 + 26, py + ph - 50); x.fill();
  x.fillStyle = '#e8b65a'; x.beginPath(); x.moveTo(px + pw / 2 - 12, py + ph - 50); x.quadraticCurveTo(px + pw / 2, py + ph - 90, px + pw / 2 + 12, py + ph - 50); x.fill();
  for (let i = 0; i < 6; i++) { const fx = px + 50 + i * 56 + (i >= 3 ? 50 : 0); figure(x, fx, py + ph - 50, 1.3, '#140e0a', i % 2 === 0); }
}
function sceneVitruvian(x, px, py, pw, ph) {
  x.fillStyle = '#8b8064'; x.fillRect(px, py, pw, ph);
  const cx = px + pw / 2, cy = py + ph / 2 + 5;
  x.strokeStyle = '#4a3a24'; x.lineWidth = 2.5;
  x.beginPath(); x.arc(cx, cy, 110, 0, Math.PI * 2); x.stroke();
  x.strokeRect(cx - 95, cy - 88, 190, 190);
  x.lineWidth = 4; x.lineCap = 'round';
  x.beginPath(); x.arc(cx, cy - 70, 12, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.moveTo(cx, cy - 58); x.lineTo(cx, cy + 15);
  x.moveTo(cx, cy - 40); x.lineTo(cx - 95, cy - 40); x.moveTo(cx, cy - 40); x.lineTo(cx + 95, cy - 40);
  x.moveTo(cx, cy - 40); x.lineTo(cx - 85, cy - 80); x.moveTo(cx, cy - 40); x.lineTo(cx + 85, cy - 80);
  x.moveTo(cx, cy + 15); x.lineTo(cx - 20, cy + 102); x.moveTo(cx, cy + 15); x.lineTo(cx + 20, cy + 102);
  x.moveTo(cx, cy + 15); x.lineTo(cx - 60, cy + 90); x.moveTo(cx, cy + 15); x.lineTo(cx + 60, cy + 90);
  x.stroke();
  x.fillStyle = 'rgba(74,58,36,0.6)';
  for (let i = 0; i < 12; i++) x.fillRect(px + 16 + (i % 2) * (pw - 60), py + 20 + Math.floor(i / 2) * 12, 28 + (i * 7) % 16, 2);
}
function sceneMoon(x, px, py, pw, ph, r) {
  const g = x.createLinearGradient(0, py, 0, py + ph); g.addColorStop(0, '#0e1a2e'); g.addColorStop(1, '#23324a');
  x.fillStyle = g; x.fillRect(px, py, pw, ph);
  x.fillStyle = '#c9cfd6';
  for (let i = 0; i < 60; i++) x.fillRect(px + r() * pw, py + r() * ph, 1.5, 1.5);
  x.fillStyle = '#bfb9a4'; x.beginPath(); x.arc(px + pw - 90, py + 80, 50, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#9e9884'; x.beginPath(); x.arc(px + pw - 100, py + 70, 10, 0, 7); x.arc(px + pw - 75, py + 95, 7, 0, 7); x.fill();
  x.fillStyle = '#3e6a8a'; x.beginPath(); x.arc(px + 60, py + ph - 40, 28, 0, Math.PI * 2); x.fill();
  x.save(); x.translate(px + pw / 2 - 20, py + ph / 2 + 30); x.rotate(-0.5);
  x.fillStyle = '#d8d2c0'; x.beginPath(); x.moveTo(0, -60); x.quadraticCurveTo(14, -40, 14, 0); x.lineTo(14, 40); x.lineTo(-14, 40); x.lineTo(-14, 0); x.quadraticCurveTo(-14, -40, 0, -60); x.fill();
  x.fillStyle = '#8a3a2a'; x.beginPath(); x.moveTo(-14, 20); x.lineTo(-28, 48); x.lineTo(-14, 40); x.fill(); x.beginPath(); x.moveTo(14, 20); x.lineTo(28, 48); x.lineTo(14, 40); x.fill();
  x.fillStyle = '#e0a050'; x.beginPath(); x.moveTo(-10, 42); x.lineTo(0, 100); x.lineTo(10, 42); x.fill();
  x.restore();
}
function sceneCity(x, px, py, pw, ph, r) {
  const g = x.createLinearGradient(0, py, 0, py + ph); g.addColorStop(0, '#5a3a4a'); g.addColorStop(0.6, '#a0643a'); g.addColorStop(1, '#3a2a22');
  x.fillStyle = g; x.fillRect(px, py, pw, ph);
  let bx = px;
  while (bx < px + pw) {
    const bw = 20 + r() * 34, bh = 60 + r() * 150;
    x.fillStyle = '#231a18'; x.fillRect(bx, py + ph - bh, bw, bh);
    x.fillStyle = 'rgba(230,190,110,0.55)';
    for (let wy = py + ph - bh + 8; wy < py + ph - 8; wy += 12) for (let wx = bx + 4; wx < bx + bw - 6; wx += 9) if (r() < 0.4) x.fillRect(wx, wy, 4, 5);
    bx += bw + 3;
  }
  x.fillStyle = '#231a18'; x.fillRect(px + pw / 2 - 5, py + 40, 10, ph - 40);
  x.beginPath(); x.moveTo(px + pw / 2, py + 10); x.lineTo(px + pw / 2 - 6, py + 40); x.lineTo(px + pw / 2 + 6, py + 40); x.fill();
  x.fillStyle = '#6a5a5a'; x.beginPath(); x.ellipse(px + 90, py + 60, 40, 12, 0, 0, Math.PI * 2); x.fill();
}
function sceneHands(x, px, py, pw, ph) {
  const g = x.createRadialGradient(px + pw / 2, py + ph / 2, 10, px + pw / 2, py + ph / 2, 240);
  g.addColorStop(0, '#4e7a74'); g.addColorStop(1, '#1a2a2a');
  x.fillStyle = g; x.fillRect(px, py, pw, ph);
  x.lineCap = 'round';
  // 人类之手
  x.strokeStyle = '#b08a64'; x.lineWidth = 26; x.beginPath(); x.moveTo(px - 20, py + ph / 2 + 50); x.lineTo(px + 140, py + ph / 2 + 10); x.stroke();
  x.lineWidth = 8; x.beginPath();
  x.moveTo(px + 140, py + ph / 2 + 10); x.lineTo(px + 180, py + ph / 2 + 2);
  x.moveTo(px + 140, py + ph / 2 + 16); x.lineTo(px + 170, py + ph / 2 + 22);
  x.moveTo(px + 136, py + ph / 2 + 22); x.lineTo(px + 160, py + ph / 2 + 34);
  x.moveTo(px + 134, py + ph / 2 + 2); x.lineTo(px + 158, py + ph / 2 - 10);
  x.stroke();
  // 机械之手
  x.strokeStyle = '#8a9094'; x.lineWidth = 22; x.beginPath(); x.moveTo(px + pw + 20, py + ph / 2 - 50); x.lineTo(px + pw - 140, py + ph / 2 - 6); x.stroke();
  x.strokeStyle = '#5a6064'; x.lineWidth = 6; x.beginPath();
  x.moveTo(px + pw - 140, py + ph / 2 - 6); x.lineTo(px + pw - 168, py + ph / 2); x.lineTo(px + pw - 188, py + ph / 2 + 2);
  x.moveTo(px + pw - 140, py + ph / 2); x.lineTo(px + pw - 160, py + ph / 2 + 14);
  x.moveTo(px + pw - 142, py + ph / 2 - 12); x.lineTo(px + pw - 164, py + ph / 2 - 20);
  x.stroke();
  x.fillStyle = '#cfe8e0'; x.beginPath(); x.arc(px + pw / 2 - 5, py + ph / 2 + 4, 5, 0, 7); x.fill();
  x.strokeStyle = 'rgba(207,232,224,0.4)'; x.lineWidth = 1;
  for (let a = 0; a < 8; a++) { const an = a / 8 * Math.PI * 2; x.beginPath(); x.moveTo(px + pw / 2 - 5 + Math.cos(an) * 8, py + ph / 2 + 4 + Math.sin(an) * 8); x.lineTo(px + pw / 2 - 5 + Math.cos(an) * 18, py + ph / 2 + 4 + Math.sin(an) * 18); x.stroke(); }
}

// ---------------- 中景：断裂的石柱与拱门 ----------------
function makeColumns() {
  const W = 1600, H = 620, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(21);
  x.strokeStyle = '#1b2023'; x.lineWidth = 30;
  for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(200 + i * 400, 300, 190, Math.PI, 0); x.stroke(); }
  const cols = [120, 520, 880, 1290];
  for (const cx of cols) {
    const top = 120 + r() * 260, w = 64;
    x.fillStyle = '#1c2225'; x.fillRect(cx - w / 2, top, w, H - top);
    x.fillStyle = '#161b1e'; for (let f = 0; f < 5; f++) x.fillRect(cx - w / 2 + 6 + f * 12, top + 10, 4, H - top);
    x.fillStyle = '#20272a'; x.fillRect(cx - w / 2 - 10, H - 50, w + 20, 50);
    x.fillStyle = '#1c2225'; x.beginPath(); x.moveTo(cx - w / 2, top + 2);
    for (let k = 0; k <= 6; k++) x.lineTo(cx - w / 2 + k * w / 6, top - r() * 26);
    x.lineTo(cx + w / 2, top + 2); x.fill();
    // 倒下的柱段
    x.save(); x.translate(cx + 90, H - 40); x.rotate(-0.1 + r() * 0.2);
    x.fillStyle = '#1a1f22'; x.fillRect(-50, -22, 100, 44); x.fillStyle = '#15191b'; x.fillRect(-50, -6, 100, 4);
    x.restore();
    // 藤蔓
    x.strokeStyle = '#223a22'; x.lineWidth = 3;
    for (let v = 0; v < 3; v++) {
      const vx = cx - w / 2 + r() * w; let vy = top;
      x.beginPath(); x.moveTo(vx, vy);
      for (let s = 0; s < 8; s++) { vy += 16 + r() * 18; x.lineTo(vx + Math.sin(s + v) * 8, vy); }
      x.stroke();
    }
  }
  // 顶部垂下的藤蔓与电缆
  for (let i = 0; i < 18; i++) {
    const vx = r() * W, len = 60 + r() * 200;
    x.strokeStyle = i % 3 === 0 ? '#1e1e1e' : '#203522'; x.lineWidth = i % 3 === 0 ? 3 : 2;
    x.beginPath(); x.moveTo(vx, 0); x.quadraticCurveTo(vx + (r() - 0.5) * 60, len * 0.6, vx + (r() - 0.5) * 30, len); x.stroke();
    if (i % 3 !== 0) { x.fillStyle = '#26432a'; for (let l = 0; l < 5; l++) x.fillRect(vx + (r() - 0.5) * 20, r() * len, 4, 3); }
  }
  return c;
}
function makeVignette() {
  const c = mkCanvas(VW, VH), x = c.getContext('2d');
  const g = x.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VW * 0.65);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
  x.fillStyle = g; x.fillRect(0, 0, VW, VH);
  return c;
}
function makeScanlines() {
  const c = mkCanvas(VW, VH), x = c.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,0.07)';
  for (let y = 0; y < VH; y += 3) x.fillRect(0, y, VW, 1);
  return c;
}

function tileLayer(ctx, img, ox, oy, vtile) {
  const W = img.width, H = img.height;
  const sx = ((ox % W) + W) % W;
  for (let xx = -sx; xx < VW; xx += W) {
    if (vtile) { const sy = ((oy % H) + H) % H; for (let yy = -sy; yy < VH; yy += H) ctx.drawImage(img, xx, yy); }
    else ctx.drawImage(img, xx, -oy);
  }
}
function drawBackground(ctx, cam, th, t) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, th.top); g.addColorStop(1, th.bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // 章节可以通过 th.back / th.mid（返回画布的函数）替换远景与中景
  const back = th.back ? th.back() : Art.mural, mid = th.mid ? th.mid() : Art.columns;
  ctx.globalAlpha = th.backAlpha || 0.55; tileLayer(ctx, back, cam.x * 0.25, cam.y * 0.25 + (th.vtile ? 0 : 40), th.vtile); ctx.globalAlpha = 1;
  // 光柱
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const period = 1100;
    let bx = ((i * 380 + 200 - cam.x * 0.35) % period + period) % period - 100;
    const sway = Math.sin(t * 0.3 + i) * 20;
    const gg = ctx.createLinearGradient(0, 0, 0, VH);
    gg.addColorStop(0, th.shaft); gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg; ctx.beginPath();
    ctx.moveTo(bx + sway, 0); ctx.lineTo(bx + 70 + sway, 0); ctx.lineTo(bx - 120, VH); ctx.lineTo(bx - 260, VH); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  tileLayer(ctx, mid, cam.x * 0.5, cam.y * 0.5 + (th.vtile ? 0 : 60), th.vtile);
  if (th.overlay) th.overlay(ctx, cam, t);
  ctx.fillStyle = th.haze; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = 'rgba(4,6,8,0.42)'; ctx.fillRect(0, 0, VW, VH);
  // 浮尘
  ctx.fillStyle = th.dust || 'rgba(255,230,190,0.35)';
  for (const m of Art.motes) {
    const mx = (((m.x - cam.x * m.z + t * 8 * m.z) % VW) + VW) % VW;
    const my = (((m.y - cam.y * m.z + Math.sin(t * 0.7 + m.p) * 10) % VH) + VH) % VH;
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 2 + m.p);
    ctx.fillRect(mx, my, m.s, m.s);
  }
  ctx.globalAlpha = 1;
}

// ---------------- 瓦片预渲染 ----------------
// 瓦片风格注册表：章节可以注册自己的画法（见 chapter2.js 的 hive）
const TILESETS = {};
function renderTiles(world, occ, setName) {
  const T = TILESETS[setName] || TILESETS.museum;
  const drawStone = T.stone, drawMarble = T.marble, drawShelf = T.shelf, drawShards = T.shards, drawProp = T.prop;
  const c = mkCanvas(world.pw, world.ph), x = c.getContext('2d');
  for (let cy = 0; cy < world.h; cy++) {
    for (let cx = 0; cx < world.w; cx++) {
      const t = world.grid[cy][cx]; if (t === ' ') continue;
      const px = cx * TILE, py = cy * TILE, r = rng(cx * 9973 + cy * 31337 + 1);
      const solid = (a, b) => world.solidAt(a, b);
      if (t === '#') drawStone(x, px, py, r, cx, cy, !solid(cx, cy - 1), !solid(cx, cy + 1), !solid(cx - 1, cy), !solid(cx + 1, cy));
      else if (t === '=') drawMarble(x, px, py, r, !solid(cx - 1, cy), !solid(cx + 1, cy));
      else if (t === '-') drawShelf(x, px, py, world.tile(cx - 1, cy) !== '-', world.tile(cx + 1, cy) !== '-');
      else if (t === '^') drawShards(x, px, py, r, false);
      else if (t === 'v') drawShards(x, px, py, r, true);
    }
  }
  // 展品装饰
  for (let cy = 2; cy < world.h; cy++) {
    for (let cx = 1; cx < world.w - 1; cx++) {
      if (!solid2(world, cx, cy) || solid2(world, cx, cy - 1) || world.tile(cx, cy - 1) !== ' ' || world.tile(cx, cy - 2) !== ' ') continue;
      if (occ.has(cx + ',' + (cy - 1)) || occ.has((cx + 1) + ',' + (cy - 1)) || occ.has((cx - 1) + ',' + (cy - 1))) continue;
      const h = hash2(cx * 7, cy * 13);
      if (h < 0.075) drawProp(x, cx * TILE + 16, cy * TILE, Math.floor(hash2(cx, cy * 3) * 6), world, cx, cy);
    }
  }
  return c;
}
function solid2(w, cx, cy) { return w.solidAt(cx, cy); }
function drawStone(x, px, py, r, cx, cy, oT, oB, oL, oR) {
  const base = ['#3a3f43', '#363b3f', '#3e4347', '#33383c'][Math.floor(r() * 4)];
  x.fillStyle = base; x.fillRect(px, py, TILE, TILE);
  x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(px, py + 15, TILE, 2);
  const off = cy % 2 ? 8 : 22; x.fillRect(px + off, py, 2, 15); x.fillRect(px + ((off + 14) % 30), py + 17, 2, 15);
  x.fillStyle = 'rgba(255,255,255,0.045)';
  for (let k = 0; k < 5; k++) x.fillRect(px + r() * 30, py + r() * 30, 2, 2);
  x.fillStyle = 'rgba(0,0,0,0.12)';
  for (let k = 0; k < 4; k++) x.fillRect(px + r() * 30, py + r() * 30, 3, 2);
  if (r() < 0.15) { x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 1; x.beginPath(); x.moveTo(px + r() * 32, py); x.lineTo(px + r() * 32, py + 16); x.lineTo(px + r() * 32, py + 32); x.stroke(); }
  if (oL) { x.fillStyle = 'rgba(255,255,255,0.06)'; x.fillRect(px, py, 2, TILE); }
  if (oR) { x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(px + TILE - 2, py, 2, TILE); }
  if (oB) { x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(px, py + TILE - 4, TILE, 4); }
  if (oT) {
    x.fillStyle = '#596066'; x.fillRect(px, py, TILE, 3);
    if (r() < 0.75) {
      x.fillStyle = '#4b6b33'; x.fillRect(px, py, TILE, 4);
      x.fillStyle = '#6f963f'; x.fillRect(px, py, TILE, 1);
      x.fillStyle = '#3e5a2a';
      for (let k = 0; k < 4; k++) x.fillRect(px + r() * 30, py + 4, 2, 2 + r() * 7);
      x.fillStyle = '#7da848';
      for (let k = 0; k < 3; k++) x.fillRect(px + r() * 30, py - 2, 2, 2);
    }
  }
}
function drawMarble(x, px, py, r, oL, oR) {
  x.fillStyle = '#9d988d'; x.fillRect(px, py, TILE, TILE);
  x.strokeStyle = 'rgba(90,85,78,0.6)'; x.lineWidth = 1;
  x.beginPath(); x.moveTo(px, py + r() * 32); x.bezierCurveTo(px + 10, py + r() * 32, px + 20, py + r() * 32, px + 32, py + r() * 32); x.stroke();
  x.fillStyle = '#d2ccbf'; x.fillRect(px, py, TILE, 3);
  x.fillStyle = '#5f5a52'; x.fillRect(px, py + TILE - 4, TILE, 4);
  x.fillStyle = 'rgba(255,255,255,0.1)'; x.fillRect(px, py + 3, TILE, 2);
  if (oL) { x.fillStyle = '#6e695f'; x.fillRect(px, py, 3, TILE); x.clearRect(px, py + 24, 3, 8); }
  if (oR) { x.fillStyle = '#6e695f'; x.fillRect(px + TILE - 3, py, 3, TILE); x.clearRect(px + TILE - 3, py + 26, 3, 6); }
}
function drawShelf(x, px, py, endL, endR) {
  x.fillStyle = '#5e4630'; x.fillRect(px, py, TILE, 8);
  x.fillStyle = '#8a6a48'; x.fillRect(px, py, TILE, 2);
  x.fillStyle = '#3a2a1e'; x.fillRect(px, py + 7, TILE, 2);
  x.fillStyle = '#7a6a4a';
  if (endL || (px / TILE) % 3 === 0) { x.fillRect(px + 4, py + 8, 3, 9); x.fillRect(px + 4, py + 8, 9, 2); }
  if (endR) { x.fillRect(px + 25, py + 8, 3, 9); x.fillRect(px + 19, py + 8, 9, 2); }
}
function drawShards(x, px, py, r, down) {
  x.save();
  if (down) { x.translate(px + 16, py + 16); x.scale(1, -1); x.translate(-px - 16, -py - 16); }
  x.fillStyle = '#2a2d30'; x.fillRect(px, py + 28, TILE, 4);
  for (let k = 0; k < 4; k++) {
    const bx = px + 2 + k * 7 + r() * 3, h = 12 + r() * 12;
    x.fillStyle = 'rgba(160,220,235,0.75)';
    x.beginPath(); x.moveTo(bx, py + 29); x.lineTo(bx + 3 + r() * 3, py + 29 - h); x.lineTo(bx + 8, py + 29); x.fill();
    x.fillStyle = 'rgba(235,255,255,0.9)'; x.fillRect(bx + 3, py + 29 - h * 0.7, 1, h * 0.5);
  }
  x.restore();
}
function drawProp(x, cx, gy, type) {
  x.save();
  switch (type) {
    case 0: // 隔离柱 + 红绳
      x.fillStyle = '#8a7440'; x.fillRect(cx - 14, gy - 26, 4, 26); x.fillRect(cx + 12, gy - 26, 4, 26);
      x.fillRect(cx - 17, gy - 3, 10, 3); x.fillRect(cx + 9, gy - 3, 10, 3);
      x.beginPath(); x.arc(cx - 12, gy - 27, 3, 0, 7); x.arc(cx + 14, gy - 27, 3, 0, 7); x.fill();
      x.strokeStyle = '#7a1f1f'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx - 12, gy - 22); x.quadraticCurveTo(cx + 1, gy - 12, cx + 14, gy - 22); x.stroke();
      break;
    case 1: // 残破半身像
      x.fillStyle = '#6e6a62'; x.fillRect(cx - 10, gy - 14, 20, 14);
      x.fillStyle = '#8e897e'; x.beginPath(); x.moveTo(cx - 12, gy - 14); x.quadraticCurveTo(cx, gy - 26, cx + 12, gy - 14); x.fill();
      x.beginPath(); x.arc(cx + 1, gy - 32, 8, 0, 7); x.fill();
      x.fillStyle = '#5a564e'; x.fillRect(cx - 7, gy - 36, 5, 5);
      break;
    case 2: // 老式显示器
      x.fillStyle = '#4a4a44'; x.fillRect(cx - 13, gy - 22, 26, 20); x.fillRect(cx - 5, gy - 2, 10, 2);
      x.fillStyle = '#1e2a26'; x.fillRect(cx - 10, gy - 19, 20, 13);
      x.fillStyle = 'rgba(100,255,180,0.25)'; x.fillRect(cx - 8, gy - 16, 9, 1); x.fillRect(cx - 8, gy - 13, 13, 1);
      break;
    case 3: // 说明牌
      x.fillStyle = '#2a2622'; x.fillRect(cx - 1, gy - 20, 3, 20);
      x.fillStyle = '#3e3a30'; x.fillRect(cx - 12, gy - 30, 26, 14);
      x.fillStyle = '#8a8060'; x.fillRect(cx - 9, gy - 27, 20, 2); x.fillRect(cx - 9, gy - 23, 14, 2);
      break;
    case 4: // 旧机器人头
      x.fillStyle = '#54504a'; x.beginPath(); x.arc(cx, gy - 10, 11, Math.PI, 0); x.fill(); x.fillRect(cx - 11, gy - 10, 22, 10);
      x.fillStyle = '#2a2622'; x.fillRect(cx - 7, gy - 12, 14, 4);
      x.fillStyle = '#3a4a2a'; x.fillRect(cx - 11, gy - 3, 22, 3);
      break;
    default: // 木箱
      x.fillStyle = '#4e3a26'; x.fillRect(cx - 12, gy - 20, 24, 20);
      x.strokeStyle = '#2e2218'; x.lineWidth = 2; x.strokeRect(cx - 11, gy - 19, 22, 18);
      x.beginPath(); x.moveTo(cx - 11, gy - 19); x.lineTo(cx + 11, gy - 1); x.stroke();
  }
  x.restore();
}

TILESETS.museum = { stone: drawStone, marble: drawMarble, shelf: drawShelf, shards: drawShards, prop: drawProp };
