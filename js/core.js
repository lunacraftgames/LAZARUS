'use strict';
// ============================================================
//  LAZARUS · 核心工具 / 物理世界 / 粒子
// ============================================================
const TILE = 32, VW = 960, VH = 540;
const BUILD = '20260926-28'; // 版本号，显示在标题界面右下角；与 index.html 里脚本的 ?v= 保持一致
const GRAV = 2100, MAXFALL = 820;
const FONT = '"Microsoft YaHei","PingFang SC","Hiragino Sans GB","Noto Sans SC","Source Han Sans SC",sans-serif';
const MONO = 'Consolas,"Courier New",monospace';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0; let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
function wrapText(ctx, text, maxW) {
  const lines = []; let line = '';
  for (const ch of text) {
    if (ch === '\n') { lines.push(line); line = ''; continue; }
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = ch; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// ------------------------------------------------------------
//  World：瓦片地图 + 动态碰撞体
//  '#' 石块  '=' 大理石  '-' 单向平台  '^' 'v' 碎玻璃尖刺
// ------------------------------------------------------------
class World {
  constructor(grid, water) {
    this.grid = grid; this.h = grid.length; this.w = grid[0].length;
    this.water = water || null; // 高密度培养液区域（布尔二维数组）
    this.pw = this.w * TILE; this.ph = this.h * TILE;
    this.solids = []; // {x,y,w,h,active,oneWay,owner}
  }
  tile(cx, cy) { if (cx < 0 || cx >= this.w) return '#'; if (cy < 0 || cy >= this.h) return ' '; return this.grid[cy][cx]; }
  solidAt(cx, cy) { const t = this.tile(cx, cy); return t === '#' || t === '='; }
  oneWayAt(cx, cy) { return this.tile(cx, cy) === '-'; }
  blockAt(cx, cy) { return this.solidAt(cx, cy) || this.oneWayAt(cx, cy); }
  pointSolid(x, y) { return this.solidAt(Math.floor(x / TILE), Math.floor(y / TILE)); }
  waterAt(cx, cy) { return !!(this.water && cy >= 0 && cy < this.h && cx >= 0 && cx < this.w && this.water[cy][cx] && !this.solidAt(cx, cy)); }
  pointWater(x, y) { return this.waterAt(Math.floor(x / TILE), Math.floor(y / TILE)); }
  supportAt(x, y) {
    if (this.blockAt(Math.floor(x / TILE), Math.floor(y / TILE))) return true;
    for (const s of this.solids) if (s.active && x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
    return false;
  }
  los(x1, y1, x2, y2) {
    const d = Math.hypot(x2 - x1, y2 - y1), n = Math.ceil(d / 10);
    for (let i = 1; i < n; i++) { const t = i / n; if (this.pointSolid(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false; }
    return true;
  }
  moveX(b, dx) {
    if (dx === 0) return null;
    b.x += dx;
    const top = Math.floor(b.y / TILE), bot = Math.floor((b.y + b.h - 0.001) / TILE);
    if (dx > 0) {
      const c = Math.floor((b.x + b.w - 0.001) / TILE);
      for (let cy = top; cy <= bot; cy++) if (this.solidAt(c, cy)) { b.x = c * TILE - b.w; return { tile: true }; }
    } else {
      const c = Math.floor(b.x / TILE);
      for (let cy = top; cy <= bot; cy++) if (this.solidAt(c, cy)) { b.x = (c + 1) * TILE; return { tile: true }; }
    }
    for (const s of this.solids) {
      if (!s.active || s.oneWay || s.owner === b) continue;
      if (overlap(b, s)) { b.x = dx > 0 ? s.x - b.w : s.x + s.w; return { solid: s }; }
    }
    return null;
  }
  moveY(b, dy, drop) {
    if (dy === 0) return null;
    const prevBottom = b.y + b.h;
    b.y += dy;
    const l = Math.floor(b.x / TILE), r = Math.floor((b.x + b.w - 0.001) / TILE);
    if (dy > 0) {
      const c = Math.floor((b.y + b.h - 0.001) / TILE);
      for (let cx = l; cx <= r; cx++) {
        if (this.solidAt(cx, c)) { b.y = c * TILE - b.h; return { tile: true }; }
        if (!drop && this.oneWayAt(cx, c) && prevBottom <= c * TILE + 0.5) { b.y = c * TILE - b.h; return { tile: true, oneWay: true }; }
      }
      for (const s of this.solids) {
        if (!s.active || s.owner === b) continue;
        // 上升中的平台：允许本帧上移量的容差，避免从平台中穿过
        const tol = 0.5 + Math.max(0, -(s.dy || 0));
        if (overlap(b, s) && (!s.oneWay || (!drop && prevBottom <= s.y + tol))) { b.y = s.y - b.h; return { solid: s, oneWay: s.oneWay }; }
      }
    } else {
      const c = Math.floor(b.y / TILE);
      for (let cx = l; cx <= r; cx++) if (this.solidAt(cx, c)) { b.y = (c + 1) * TILE; return { tile: true }; }
      for (const s of this.solids) {
        if (!s.active || s.oneWay || s.owner === b) continue;
        if (overlap(b, s)) { b.y = s.y + s.h; return { solid: s }; }
      }
    }
    return null;
  }
}

// ------------------------------------------------------------
//  粒子
// ------------------------------------------------------------
class Particles {
  constructor() { this.list = []; }
  add(o) {
    const p = { x: 0, y: 0, vx: 0, vy: 0, life: 0.6, t: 0, size: 3, color: '#fff', grav: 0, drag: 0, shape: 'sq', add: false, rot: 0, vr: 0, grow: 0 };
    Object.assign(p, o); this.list.push(p);
    if (this.list.length > 1600) this.list.splice(0, this.list.length - 1600);
    return p;
  }
  burst(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      const sp = o.spread != null ? o.spread : Math.PI;
      const a = o.angle != null ? o.angle + rand(-sp, sp) : rand(0, Math.PI * 2);
      const s = rand(o.smin || 50, o.smax || 200);
      this.add({
        x: x + rand(-(o.jx || 0), o.jx || 0), y: y + rand(-(o.jy || 0), o.jy || 0),
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rand(o.lmin || 0.3, o.lmax || 0.7), size: rand(o.szmin || 2, o.szmax || 4),
        color: Array.isArray(o.color) ? pick(o.color) : (o.color || '#fff'),
        grav: o.grav || 0, drag: o.drag || 0, shape: o.shape || 'sq', add: !!o.add,
        rot: rand(0, 6), vr: rand(-10, 10), grow: o.grow || 0, floor: o.floor,
      });
    }
  }
  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i]; p.t += dt;
      if (p.t >= p.life) { L.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.size = Math.max(0.1, p.size + p.grow * dt);
      if (p.floor != null && p.y > p.floor) { p.y = p.floor; p.vy *= -0.3; p.vx *= 0.6; p.vr *= 0.5; }
    }
  }
  draw(ctx, cam) {
    for (const p of this.list) {
      if (p.x < cam.x - 60 || p.x > cam.x + VW + 60 || p.y < cam.y - 60 || p.y > cam.y + VH + 60) continue;
      const a = Math.max(0, 1 - p.t / p.life);
      ctx.globalAlpha = a;
      ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
      const s = p.size;
      switch (p.shape) {
        case 'spark': ctx.lineWidth = s; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke(); break;
        case 'ring': ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, Math.PI * 2); ctx.stroke(); break;
        case 'glow': ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, Math.PI * 2); ctx.fill(); break;
        case 'shard':
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.beginPath(); ctx.moveTo(-s, s * 0.6); ctx.lineTo(s, 0); ctx.lineTo(-s * 0.4, -s * 0.8); ctx.closePath(); ctx.fill();
          ctx.restore(); break;
        default: ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}

// ------------------------------------------------------------
//  存档
// ------------------------------------------------------------
const Save = {
  key: 'lazarus_ch1_save',
  load() { try { return JSON.parse(localStorage.getItem(this.key) || 'null'); } catch (e) { return null; } },
  save(d) { try { localStorage.setItem(this.key, JSON.stringify(d)); } catch (e) { /* ignore */ } },
  clear() { try { localStorage.removeItem(this.key); } catch (e) { /* ignore */ } },
};
