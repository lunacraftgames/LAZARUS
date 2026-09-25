'use strict';
// ============================================================
//  场景物件 & 普通敌人
// ============================================================

// ---------------- 坍塌的石板 ----------------
class Crumble {
  constructor(cx, cy, group) {
    this.x = cx * TILE; this.y = cy * TILE; this.w = TILE; this.h = TILE; this.group = group;
    this.solid = { x: this.x, y: this.y, w: TILE, h: TILE, active: true, oneWay: false, owner: this };
    this.seed = hash2(cx, cy); this.reset();
  }
  reset() { this.state = 'idle'; this.t = 0; this.fy = 0; this.fvy = 0; this.solid.active = true; }
  onStand(g) {
    if (this.state !== 'idle') return;
    for (const c of g.crumbles) if (c.group === this.group && c.state === 'idle') { c.state = 'shake'; c.t = 0; }
    Sound.sfx.crack();
  }
  update(dt, g) {
    this.t += dt;
    if (this.state === 'shake' && this.t >= 1.0) {
      this.state = 'fall'; this.t = 0; this.solid.active = false; Sound.sfx.crumble();
      g.particles.burst(this.x + 16, this.y + 16, 8, { color: ['#7a7468', '#5a554c'], smin: 30, smax: 120, grav: 900, lmin: 0.4, lmax: 0.8, szmin: 3, szmax: 6 });
    } else if (this.state === 'fall') {
      this.fvy += GRAV * 0.8 * dt; this.fy += this.fvy * dt;
      if (this.t > 1.2) { this.state = 'gone'; this.t = 0; }
    } else if (this.state === 'gone' && this.t > 2.6) {
      if (!overlap(g.player, this)) {
        this.reset();
        g.particles.burst(this.x + 16, this.y + 16, 10, { color: '#9ff', smin: 10, smax: 60, lmin: 0.2, lmax: 0.5, add: true });
      }
    }
  }
  draw(ctx) {
    if (this.state === 'gone') {
      ctx.strokeStyle = 'rgba(150,255,255,0.12)'; ctx.setLineDash([4, 4]); ctx.strokeRect(this.x + 1, this.y + 1, 30, 14); ctx.setLineDash([]);
      return;
    }
    let ox = 0, oy = 0;
    if (this.state === 'shake') { const k = Math.min(1, this.t * 1.5); ox = (Math.random() - 0.5) * 3 * k; oy = (Math.random() - 0.5) * 1.5 * k; }
    if (this.state === 'fall') { oy = this.fy; ctx.globalAlpha = Math.max(0, 1 - this.t / 1.2); }
    const x = this.x + ox, y = this.y + oy;
    ctx.fillStyle = '#8b857a'; ctx.fillRect(x, y, 32, 16);
    ctx.fillStyle = '#b3ad9f'; ctx.fillRect(x, y, 32, 3);
    ctx.fillStyle = '#5c574f'; ctx.fillRect(x, y + 13, 32, 3);
    ctx.fillStyle = '#4b6b33'; ctx.fillRect(x + 3 + this.seed * 10, y, 10, 2);
    // 下方碎裂的支撑
    ctx.fillStyle = '#6a655b'; ctx.beginPath(); ctx.moveTo(x + 4, y + 16); ctx.lineTo(x + 28, y + 16); ctx.lineTo(x + 20, y + 26); ctx.lineTo(x + 12, y + 24); ctx.fill();
    ctx.strokeStyle = '#2e2b27'; ctx.lineWidth = 1.2; ctx.beginPath();
    ctx.moveTo(x + 8 + this.seed * 8, y); ctx.lineTo(x + 14, y + 8); ctx.lineTo(x + 11, y + 16);
    if (this.state !== 'idle') { ctx.moveTo(x + 14, y + 8); ctx.lineTo(x + 24, y + 5); ctx.lineTo(x + 30, y + 12); ctx.moveTo(x + 20, y + 16); ctx.lineTo(x + 22, y + 9); }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// ---------------- 弹床 ----------------
class Spring {
  constructor(cx, cy) { this.x = cx * TILE + 2; this.y = cy * TILE + 18; this.w = 28; this.h = 14; this.comp = 0; this.cd = 0; }
  update(dt, g) {
    this.comp = Math.max(0, this.comp - dt * 4); this.cd -= dt;
    const p = g.player;
    if (g.state === 'play' && this.cd <= 0 && p.vy >= 0 && overlap(p, this)) {
      p.cling = null; p.y = this.y - p.h; p.vy = -PL.SPRING; p.jumping = false; p.onGround = false; p.canDash = true; p.dashT = 0; p.coyote = 0; p.jumpsLeft = 1;
      p.sx = 0.7; p.sy = 1.4; this.comp = 1; this.cd = 0.15;
      Sound.sfx.spring(); Input.rumble(0.1, 0.5, 90);
      g.particles.burst(this.x + 14, this.y, 10, { color: ['#ffd070', '#fff'], smin: 60, smax: 180, angle: -Math.PI / 2, spread: 0.8, lmin: 0.2, lmax: 0.4, add: true });
    }
  }
  draw(ctx) {
    const x = this.x, y = this.y, k = this.comp;
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(x, y + 10, 28, 4);
    ctx.strokeStyle = '#c0a060'; ctx.lineWidth = 2; ctx.beginPath();
    const top = y + 2 + k * 6;
    for (let i = 0; i <= 4; i++) { const yy = lerp(y + 10, top + 3, i / 4); ctx.lineTo(x + (i % 2 ? 22 : 6), yy); }
    ctx.stroke();
    ctx.fillStyle = '#b8342a'; ctx.fillRect(x - 2, top - 2 - (1 - k) * 2, 32, 5);
    ctx.fillStyle = '#e8e0d0'; ctx.fillRect(x + 4, top - 2 - (1 - k) * 2, 6, 5); ctx.fillRect(x + 18, top - 2 - (1 - k) * 2, 6, 5);
  }
}

// ---------------- 备份终端（存档点） ----------------
class Checkpoint {
  constructor(cx, cy) {
    this.x = cx * TILE + 2; this.y = cy * TILE - 18; this.w = 28; this.h = 50; this.active = false;
    this.spawn = { x: cx * TILE + 6, y: (cy + 1) * TILE - 28 }; this.t = 0;
  }
  update(dt, g) {
    this.t += dt;
    if (!this.active && g.state === 'play' && overlap(g.player, this)) g.activateCheckpoint(this);
  }
  draw(ctx, g) {
    const x = this.x, y = this.y;
    ctx.fillStyle = '#34322c'; ctx.fillRect(x + 4, y + 14, 20, 36);
    ctx.fillStyle = '#4a463c'; ctx.fillRect(x, y + 44, 28, 6); ctx.fillRect(x + 2, y + 8, 24, 20);
    ctx.fillStyle = '#12181a'; ctx.fillRect(x + 5, y + 11, 18, 13);
    if (this.active) {
      ctx.fillStyle = '#5f8'; ctx.fillRect(x + 7, y + 13, 14 * Math.min(1, this.t * 2), 2);
      ctx.fillStyle = 'rgba(80,255,140,0.7)'; ctx.font = '7px ' + MONO; ctx.fillText('SAVED', x + 6, y + 22);
      ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createRadialGradient(x + 14, y + 17, 2, x + 14, y + 17, 34);
      gr.addColorStop(0, 'rgba(80,255,140,0.35)'); gr.addColorStop(1, 'rgba(80,255,140,0)');
      ctx.fillStyle = gr; ctx.fillRect(x - 20, y - 17, 68, 68);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.fillStyle = (g.t * 2) % 2 < 1 ? '#a33' : '#511'; ctx.fillRect(x + 12, y + 16, 4, 4);
    }
    ctx.fillStyle = '#6a6250'; ctx.fillRect(x + 8, y + 32, 12, 2); ctx.fillRect(x + 8, y + 36, 12, 2);
    ctx.strokeStyle = '#555'; ctx.beginPath(); ctx.moveTo(x + 22, y + 8); ctx.lineTo(x + 26, y); ctx.stroke();
  }
}

// ---------------- 出口：维修电梯 ----------------
class Exit {
  constructor(cx, cy) { this.x = cx * TILE - 8; this.y = (cy - 1) * TILE; this.w = 48; this.h = 64; this.done = false; }
  update(dt, g) {
    if (!this.done && g.state === 'play' && overlap(g.player, { x: this.x + 12, y: this.y + 10, w: 24, h: 54 })) { this.done = true; g.levelClear(); }
  }
  draw(ctx, g) {
    const x = this.x, y = this.y;
    ctx.fillStyle = '#2b2a26'; ctx.fillRect(x - 6, y - 10, 60, 74);
    ctx.fillStyle = '#6a5a38'; ctx.fillRect(x - 6, y - 10, 60, 5);
    const glow = 0.5 + 0.5 * Math.sin(g.t * 3);
    const gr = ctx.createLinearGradient(0, y, 0, y + 64);
    gr.addColorStop(0, `rgba(120,255,230,${0.35 + glow * 0.25})`); gr.addColorStop(1, 'rgba(120,255,230,0.05)');
    ctx.fillStyle = gr; ctx.fillRect(x + 2, y, 44, 64);
    ctx.fillStyle = '#1a1a18'; const open = this.done ? 1 : 0.15;
    ctx.fillRect(x + 2, y, 22 * (1 - open), 64); ctx.fillRect(x + 24 + 22 * open, y, 22 * (1 - open), 64);
    ctx.fillStyle = `rgba(150,255,235,${0.6 + glow * 0.4})`;
    const ay = y - 26 - Math.sin(g.t * 4) * 3;
    ctx.beginPath(); ctx.moveTo(x + 24, ay); ctx.lineTo(x + 34, ay + 10); ctx.lineTo(x + 14, ay + 10); ctx.fill();
    ctx.font = '9px ' + MONO; ctx.textAlign = 'center'; ctx.fillText('LIFT', x + 24, y - 32); ctx.textAlign = 'left';
  }
}

// ---------------- 记忆芯片 ----------------
class Chip {
  constructor(cx, cy, id) { this.x = cx * TILE + 8; this.y = cy * TILE + 8; this.w = 16; this.h = 16; this.id = id; this.got = false; this.t = Math.random() * 6; }
  update(dt, g) {
    this.t += dt;
    if (!this.got && g.state === 'play' && overlap(g.player, this)) { this.got = true; g.collectChip(this); }
  }
  draw(ctx) {
    if (this.got) return;
    const x = this.x + 8, y = this.y + 8 + Math.sin(this.t * 3) * 3;
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(x, y, 1, x, y, 18); gr.addColorStop(0, 'rgba(255,200,90,0.55)'); gr.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = gr; ctx.fillRect(x - 18, y - 18, 36, 36);
    ctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(this.t) * 0.3);
    ctx.fillStyle = '#3a2e18'; ctx.fillRect(-7, -6, 14, 12);
    ctx.fillStyle = '#e6b44a'; ctx.fillRect(-5, -4, 10, 8);
    ctx.fillStyle = '#fff2c0'; ctx.fillRect(-3, -2, 3, 2);
    ctx.fillStyle = '#c9a040'; for (let i = -5; i <= 3; i += 4) { ctx.fillRect(i, -8, 2, 2); ctx.fillRect(i, 6, 2, 2); }
    ctx.restore();
  }
}

// ---------------- 激光警戒网 ----------------
class LaserGate {
  constructor(cx, cy, idx, world) {
    this.x = cx * TILE + 16; this.y0 = cy * TILE;
    let yy = cy + 1; while (yy < world.h && !world.solidAt(cx, yy)) yy++;
    this.y1 = yy * TILE; this.period = 2.6; this.onDur = 1.1; this.offset = idx * 0.65; this.on = false; this.warn = false;
    // 供画面裁剪判断使用的包围盒（x 为中心线）
    this.y = this.y0; this.w = 20; this.h = this.y1 - this.y0;
  }
  update(dt, g) {
    const ph = (g.levelT + this.offset) % this.period;
    const on = ph < this.onDur;
    if (on && !this.on && Math.abs(g.player.cx - this.x) < 500) Sound.sfx.zap();
    this.on = on; this.warn = !on && ph > this.period - 0.5;
    if (on && g.state === 'play' && overlap(g.player.hurt(), { x: this.x - 5, y: this.y0 + 10, w: 10, h: this.y1 - this.y0 - 10 })) g.killPlayer('laser');
  }
  draw(ctx, g) {
    const x = this.x;
    ctx.fillStyle = '#3c3c3c'; ctx.fillRect(x - 10, this.y0, 20, 12);
    ctx.fillStyle = '#222'; ctx.fillRect(x - 6, this.y0 + 10, 12, 4);
    ctx.fillStyle = this.on ? '#f44' : this.warn ? ((g.t * 16) % 2 < 1 ? '#f88' : '#400') : '#511';
    ctx.fillRect(x - 3, this.y0 + 11, 6, 3);
    ctx.fillStyle = '#3c3c3c'; ctx.fillRect(x - 10, this.y1 - 4, 20, 4);
    if (this.on) {
      ctx.globalCompositeOperation = 'lighter';
      const f = 0.8 + Math.random() * 0.2;
      ctx.fillStyle = `rgba(255,40,40,${0.25 * f})`; ctx.fillRect(x - 8, this.y0 + 14, 16, this.y1 - this.y0 - 18);
      ctx.fillStyle = `rgba(255,80,60,${0.7 * f})`; ctx.fillRect(x - 3, this.y0 + 14, 6, this.y1 - this.y0 - 18);
      ctx.fillStyle = 'rgba(255,230,220,0.9)'; ctx.fillRect(x - 1, this.y0 + 14, 2, this.y1 - this.y0 - 18);
      ctx.globalCompositeOperation = 'source-over';
      if (Math.random() < 0.5) g.particles.add({ x: x + rand(-6, 6), y: this.y1 - 4, vx: rand(-80, 80), vy: rand(-160, -40), life: 0.25, size: 2, color: '#f86', shape: 'spark', add: true, grav: 600 });
    } else if (this.warn) {
      ctx.fillStyle = `rgba(255,60,60,${(g.t * 16) % 2 < 1 ? 0.35 : 0.1})`; ctx.fillRect(x - 0.5, this.y0 + 14, 1, this.y1 - this.y0 - 18);
    }
  }
}

// ---------------- 升降展台（移动平台） ----------------
class Mover {
  constructor(cx, cy, kind) {
    this.x0 = cx * TILE; this.y0 = cy * TILE; this.x = this.x0; this.y = this.y0; this.w = 96; this.h = 14; this.kind = kind;
    this.range = kind === 'H' ? 6 * TILE : 4 * TILE + 16; this.period = 4.4; this.t = 0;
    this.solid = { x: this.x, y: this.y, w: this.w, h: this.h, active: true, oneWay: true, owner: this };
  }
  update(dt, g) {
    this.t += dt;
    const k = (1 - Math.cos(this.t / this.period * Math.PI * 2)) / 2;
    const nx = this.kind === 'H' ? this.x0 + k * this.range : this.x0;
    const ny = this.kind === 'V' ? this.y0 - k * this.range : this.y0;
    const dx = nx - this.x, dy = ny - this.y;
    this.x = nx; this.y = ny; this.solid.x = nx; this.solid.y = ny; this.solid.dy = dy;
    const p = g.player;
    if (g.state === 'play' && p.ground === this.solid) { g.world.moveX(p, dx); p.y += dy; }
  }
  draw(ctx, g) {
    const x = this.x, y = this.y;
    ctx.fillStyle = '#4a4a46'; ctx.fillRect(x, y, this.w, 10);
    for (let i = 0; i < this.w; i += 16) { ctx.fillStyle = (i / 16) % 2 ? '#c9a030' : '#222'; ctx.fillRect(x + i, y, 8, 3); }
    ctx.fillStyle = '#2a2a28'; ctx.fillRect(x + 6, y + 10, this.w - 12, 4);
    ctx.globalCompositeOperation = 'lighter';
    for (const tx of [x + 16, x + this.w - 16]) {
      const gr = ctx.createRadialGradient(tx, y + 16, 1, tx, y + 16, 12 + Math.sin(g.t * 20) * 2);
      gr.addColorStop(0, 'rgba(120,220,255,0.7)'); gr.addColorStop(1, 'rgba(120,220,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(tx - 14, y + 4, 28, 28);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}

// ============================================================
//  敌人
// ============================================================
function stompable(p, e, tol) { return p.vy > 30 && p.prevBottom <= e.y + (tol || 10); }

// ---------------- 除尘蜘蛛 Scrubber ----------------
class Scrubber {
  constructor(cx, cy, wall, world) {
    this.alive = true; this.t = Math.random() * 10; this.colors = ['#8a8f94', '#c9a030', '#4a4e52'];
    if (!wall) {
      this.wall = 0; this.w = 26; this.h = 14; this.x = cx * TILE + 3; this.y = (cy + 1) * TILE - this.h; this.vx = -60; this.vy = 0;
    } else {
      const side = world.solidAt(cx + 1, cy) ? 1 : world.solidAt(cx - 1, cy) ? -1 : 1;
      this.wall = side; this.w = 14; this.h = 26; this.x = side > 0 ? (cx + 1) * TILE - this.w : cx * TILE; this.y = cy * TILE;
      let top = cy; while (top - 1 >= 0 && !world.blockAt(cx, top - 1) && world.solidAt(cx + side, top - 1)) top--;
      let bot = cy; while (bot + 1 < world.h && !world.blockAt(cx, bot + 1) && world.solidAt(cx + side, bot + 1)) bot++;
      this.minY = top * TILE; this.maxY = (bot + 1) * TILE - this.h; this.vy = -75;
    }
  }
  update(dt, g) {
    this.t += dt; const w = g.world;
    if (!this.wall) {
      this.vy = Math.min(this.vy + GRAV * dt, MAXFALL);
      const fx = this.vx > 0 ? this.x + this.w + 2 : this.x - 2;
      if (this.grounded && !w.supportAt(fx, this.y + this.h + 4)) this.vx = -this.vx;
      if (w.moveX(this, this.vx * dt)) this.vx = -this.vx;
      const ry = w.moveY(this, this.vy * dt); this.grounded = !!ry; if (ry) this.vy = 0;
      if (this.y > w.ph) this.alive = false;
    } else {
      this.y += this.vy * dt;
      if (this.y < this.minY) { this.y = this.minY; this.vy = -this.vy; }
      if (this.y > this.maxY) { this.y = this.maxY; this.vy = -this.vy; }
    }
    if (Math.random() < 0.05) g.particles.add({ x: this.x + this.w / 2, y: this.wall ? this.y + this.h / 2 : this.y + this.h, vx: rand(-20, 20), vy: rand(-20, 0), life: 0.5, size: 2, color: 'rgba(200,200,180,0.5)' });
  }
  touch(p, g) { if (stompable(p, this)) { g.killEnemy(this); g.stompBounce(); } else g.killPlayer(); }
  draw(ctx, g) {
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
    if (this.wall) ctx.rotate(this.wall > 0 ? -Math.PI / 2 : Math.PI / 2);
    const dir = this.wall ? Math.sign(this.vy) * -this.wall : Math.sign(this.vx);
    const t = this.t * 14;
    // 腿
    ctx.strokeStyle = '#3a3e42'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const lx = -9 + i * 9, a = Math.sin(t + i * 2) * 3;
      ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx - 4 + a, -8); ctx.lineTo(lx - 6 + a, 7); ctx.stroke();
    }
    // 身体
    ctx.fillStyle = '#8a8f94'; ctx.beginPath(); ctx.ellipse(0, -1, 12, 6, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#c9a030'; ctx.fillRect(-12, -1, 24, 3);
    ctx.fillStyle = '#4a4e52'; ctx.fillRect(-10, 2, 20, 3);
    // 刷子
    ctx.fillStyle = '#b8b09a'; for (let i = -9; i < 10; i += 3) ctx.fillRect(i + (t % 3), 5, 1.5, 3);
    // 眼
    ctx.fillStyle = '#f33'; ctx.fillRect(dir * 7 - 1.5, -5, 3, 2);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,50,50,0.4)'; ctx.fillRect(dir * 7 - 4, -7, 8, 6); ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }
}

// ---------------- 警戒无人机 Sentry Drone ----------------
class Drone {
  constructor(cx, cy) {
    this.bx = cx * TILE + 2; this.by = cy * TILE + 6; this.x = this.bx; this.y = this.by; this.w = 28; this.h = 18;
    this.t = Math.random() * 6; this.pt = Math.random() * 6; this.alarmCd = 0; this.alertT = 0; this.bombCd = 0; this.offx = 0; this.alive = true;
    this.colors = ['#5a6064', '#f33', '#2a2e30'];
  }
  update(dt, g) {
    this.t += dt; this.alarmCd -= dt;
    const p = g.player, px = p.cx, py = p.cy, cx = this.x + 14, cy = this.y + 9;
    const sees = g.state === 'play' && Math.hypot(px - cx, py - cy) < 280 && py > cy - 40 && g.world.los(cx, cy, px, py);
    if (sees && this.alarmCd <= 0) {
      this.alarmCd = 4.0; this.alertT = 2.6; p.dashLock = 2.0; this.bombCd = 0.45;
      g.alarmSrc = { drone: this, t: 0 }; // 用于画出“是谁锁住了冲刺”
      if (!g.alarmHintShown) { g.alarmHintShown = true; g.toastHint('无人机警报：冲刺被干扰 2 秒（DASH 变红）'); }
      Sound.sfx.alarm(); g.alarmFlash = 0.6;
      g.particles.add({ x: cx, y: cy, size: 6, grow: 260, life: 0.4, shape: 'ring', color: '#f44', add: true });
    }
    if (this.alertT > 0) {
      this.alertT -= dt;
      this.offx = clamp(this.offx + clamp(px - cx, -1, 1) * 80 * dt, -170, 170);
      this.bombCd -= dt;
      if (this.bombCd <= 0 && sees) { this.throwBomb(g, px, py); this.bombCd = 1.2; }
    } else { this.pt += dt; }
    this.x = this.bx + Math.sin(this.pt * 0.9) * 70 + this.offx;
    this.y = this.by + Math.sin(this.t * 2.4) * 5;
  }
  throwBomb(g, px, py) {
    const T = 0.75, sx = this.x + 14, sy = this.y + 18;
    const vx = clamp((px - sx) / T, -420, 420), vy = (py - sy - 0.5 * 1300 * T * T) / T;
    g.projectiles.push(new Bomb(sx, sy, vx, vy)); Sound.sfx.throw();
  }
  touch(p, g) { if (stompable(p, this, 12)) { g.killEnemy(this); g.stompBounce(); } else g.killPlayer(); }
  draw(ctx, g) {
    const x = this.x, y = this.y, alert = this.alertT > 0;
    // 旋翼
    ctx.fillStyle = '#6a7074';
    const s = Math.abs(Math.sin(g.t * 40)) * 12 + 2;
    ctx.fillRect(x + 4 - s / 2 + 3, y - 3, s, 2); ctx.fillRect(x + 24 - s / 2 - 3, y - 3, s, 2);
    ctx.fillStyle = '#3a3e40'; ctx.fillRect(x + 6, y - 2, 2, 4); ctx.fillRect(x + 20, y - 2, 2, 4);
    // 机身
    ctx.fillStyle = '#5a6064'; ctx.beginPath(); ctx.moveTo(x + 2, y + 4); ctx.lineTo(x + 26, y + 4); ctx.lineTo(x + 22, y + 16); ctx.lineTo(x + 6, y + 16); ctx.fill();
    ctx.fillStyle = '#7a8084'; ctx.fillRect(x + 2, y + 2, 24, 3);
    ctx.fillStyle = '#2a2e30'; ctx.fillRect(x + 9, y + 8, 10, 6);
    // 眼
    const ex = x + 14 + clamp((g.player.cx - x - 14) / 40, -3, 3);
    ctx.fillStyle = alert ? '#f33' : '#fc4'; ctx.fillRect(ex - 2, y + 9, 4, 4);
    // 视野/警报灯
    ctx.globalCompositeOperation = 'lighter';
    if (alert) {
      const a = (g.t * 8) % 2 < 1 ? 0.5 : 0.15;
      const gr = ctx.createRadialGradient(x + 14, y + 8, 2, x + 14, y + 8, 40); gr.addColorStop(0, `rgba(255,40,40,${a})`); gr.addColorStop(1, 'rgba(255,40,40,0)');
      ctx.fillStyle = gr; ctx.fillRect(x - 26, y - 32, 80, 80);
    } else {
      ctx.fillStyle = 'rgba(255,200,80,0.05)'; ctx.beginPath(); ctx.moveTo(ex, y + 13); ctx.lineTo(ex - 70, y + 150); ctx.lineTo(ex + 70, y + 150); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    if (alert) { ctx.fillStyle = (g.t * 8) % 2 < 1 ? '#f33' : '#fff'; ctx.font = 'bold 16px ' + FONT; ctx.textAlign = 'center'; ctx.fillText('!', x + 14, y - 8); ctx.textAlign = 'left'; }
  }
}
class Bomb {
  constructor(x, y, vx, vy) { this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.t = 0; this.dead = false; }
  update(dt, g) {
    this.t += dt; this.vy += 1300 * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    const w = g.world;
    if (w.pointSolid(this.x, this.y + 5) || (this.vy > 0 && w.supportAt(this.x, this.y + 5)) || this.t > 2.5) this.explode(g);
    else if (g.state === 'play' && Math.hypot(g.player.cx - this.x, g.player.cy - this.y) < 14) this.explode(g);
  }
  explode(g) { this.dead = true; g.explosion(this.x, this.y, 42); }
  defuse(g) {
    this.dead = true; Sound.sfx.block();
    g.particles.burst(this.x, this.y, 10, { color: ['#888', '#fc4'], smin: 40, smax: 160, lmin: 0.2, lmax: 0.5 });
  }
  draw(ctx, g) {
    // 炸弹：加大并加红色光圈，保证在任何背景下都看得见
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, 18); gr.addColorStop(0, 'rgba(255,80,50,0.55)'); gr.addColorStop(1, 'rgba(255,60,40,0)');
    ctx.fillStyle = gr; ctx.fillRect(this.x - 18, this.y - 18, 36, 36); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(this.x, this.y, 7, 0, 7); ctx.fill();
    ctx.strokeStyle = '#f55'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = (this.t * 12) % 2 < 1 ? '#f44' : '#fc4'; ctx.fillRect(this.x - 1.5, this.y - 9, 3, 3);
  }
}

// ---------------- 看守者盔甲 Husk Knight（新） ----------------
class Knight {
  constructor(cx, cy) {
    this.w = 24; this.h = 40; this.x = cx * TILE + 4; this.y = (cy + 1) * TILE - this.h;
    this.dir = -1; this.vx = 0; this.vy = 0; this.state = 'patrol'; this.t = 0; this.turnT = 0; this.alive = true; this.walk = 0;
    this.colors = ['#8e9296', '#5a5e62', '#b33'];
  }
  update(dt, g) {
    const w = g.world, p = g.player; this.t += dt;
    this.vy = Math.min(this.vy + GRAV * dt, MAXFALL);
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2, dx = p.cx - cx;
    const canSee = g.state === 'play' && Math.abs(p.cy - cy) < 56 && Math.abs(dx) < 300 && w.los(cx, cy - 8, p.cx, p.cy);
    switch (this.state) {
      case 'patrol':
        this.vx = this.dir * 38;
        if (canSee) {
          if (Math.sign(dx) === this.dir) { this.state = 'windup'; this.t = 0; Sound.sfx.growl(); }
          else if (Math.abs(dx) < 170) { this.turnT += dt; if (this.turnT > 0.35) { this.dir *= -1; this.turnT = 0; } }
        }
        break;
      case 'windup': this.vx = 0; if (this.t > 0.55) { this.state = 'charge'; this.t = 0; } break;
      case 'charge':
        this.vx = this.dir * 340; if (this.t > 1.8) { this.state = 'recover'; this.t = 0; }
        if (Math.random() < 0.5) g.particles.add({ x: this.x + this.w / 2 - this.dir * 10, y: this.y + this.h, vx: -this.dir * rand(20, 80), vy: rand(-60, -10), life: 0.4, size: 3, color: '#7a7468' });
        break;
      case 'stun': this.vx = 0; if (this.t > 1.9) { this.state = 'recover'; this.t = 0; } break;
      case 'recover': this.vx = 0; if (this.t > 0.6) { this.state = 'patrol'; this.t = 0; } break;
    }
    if (this.vx !== 0 && this.grounded) {
      const fx = this.dir > 0 ? this.x + this.w + 3 : this.x - 3;
      if (!w.supportAt(fx, this.y + this.h + 4)) {
        if (this.state === 'charge') { this.state = 'recover'; this.t = 0; } else this.dir *= -1;
        this.vx = 0;
      }
    }
    const hit = w.moveX(this, this.vx * dt);
    if (hit) {
      if (this.state === 'charge') {
        this.state = 'stun'; this.t = 0; Sound.sfx.heavyClang(); g.shake(8);
        g.particles.burst(this.x + (this.dir > 0 ? this.w : 0), this.y + 12, 14, { color: ['#ffd070', '#fff'], shape: 'spark', smin: 100, smax: 300, lmin: 0.2, lmax: 0.4, add: true, grav: 500 });
      } else this.dir *= -1;
    }
    const ry = w.moveY(this, this.vy * dt); this.grounded = !!ry; if (ry) this.vy = 0;
    if (Math.abs(this.vx) > 0) this.walk += dt * Math.abs(this.vx) * 0.08;
    if (this.y > w.ph) this.alive = false;
  }
  // 盾牌/刺盔：未晕眩时，从正面或上方的攻击都会被挡下
  guard(p, kind) {
    if (this.state === 'stun') return false;
    if (kind === 'heavy' || kind === 'spore') return false; // 重劈 / 冲击波 / 孢子腐蚀：无视盾牌
    if (kind === 'blade' && (Inventory.weapon() === 'relicBlade' || Inventory.weapon() === 'fist')) return false; // 巨像残刃、阿特拉斯的液压拳可破甲
    const front = Math.sign(p.cx - (this.x + this.w / 2)) === this.dir;
    const above = p.y + p.h <= this.y + 8;
    return front || above;
  }
  touch(p, g) {
    const stomp = stompable(p, this, 12);
    if (this.state === 'stun') { if (stomp) { g.killEnemy(this); g.stompBounce(); } return; }
    if (stomp) {
      Sound.sfx.clang(); g.stompBounce(0.85);
      g.particles.burst(p.cx, p.y + p.h, 8, { color: '#ffd070', shape: 'spark', smin: 80, smax: 200, lmin: 0.15, lmax: 0.3, add: true });
      g.toastHint('头盔带刺！引它撞墙后再踩');
    } else g.killPlayer();
  }
  draw(ctx, g) {
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h); ctx.scale(this.dir, 1);
    const st = this.state, shake = st === 'windup' ? (Math.random() - 0.5) * 2 : 0;
    ctx.translate(shake, 0);
    const lw = Math.sin(this.walk) * 4;
    ctx.fillStyle = '#4e5256'; ctx.fillRect(-8 + lw, -12, 6, 12); ctx.fillRect(2 - lw, -12, 6, 12);
    ctx.fillStyle = '#6e7276'; ctx.fillRect(-9 + lw, -2, 8, 2); ctx.fillRect(1 - lw, -2, 8, 2);
    // 胸甲
    ctx.fillStyle = '#8e9296'; ctx.beginPath(); ctx.moveTo(-11, -30); ctx.lineTo(11, -30); ctx.lineTo(9, -12); ctx.lineTo(-9, -12); ctx.fill();
    ctx.fillStyle = '#b8bcc0'; ctx.fillRect(-10, -30, 20, 2); ctx.fillRect(-1, -28, 2, 14);
    ctx.fillStyle = '#7a2a22'; ctx.fillRect(-9, -14, 18, 3);
    // 盾
    ctx.fillStyle = '#6a4a2a'; ctx.beginPath(); ctx.moveTo(6, -28); ctx.lineTo(15, -28); ctx.lineTo(15, -18); ctx.lineTo(10.5, -12); ctx.lineTo(6, -18); ctx.fill();
    ctx.fillStyle = '#c9a030'; ctx.fillRect(9.5, -26, 2, 10);
    // 头盔 + 尖刺
    const hy = st === 'stun' ? -34 : -40, tilt = st === 'stun' ? 0.3 : 0;
    ctx.save(); ctx.translate(0, hy + 8); ctx.rotate(tilt);
    ctx.fillStyle = '#9ea2a6'; ctx.fillRect(-8, -8, 16, 12);
    ctx.fillStyle = '#6e7276'; ctx.fillRect(-8, -8, 16, 2);
    ctx.fillStyle = '#c0c4c8';
    if (st !== 'stun') for (let i = -7; i <= 5; i += 4) { ctx.beginPath(); ctx.moveTo(i, -8); ctx.lineTo(i + 1.5, -14); ctx.lineTo(i + 3, -8); ctx.fill(); }
    ctx.fillStyle = '#111'; ctx.fillRect(0, -3, 8, 2);
    const eye = st === 'windup' || st === 'charge' ? '#f22' : st === 'stun' ? '#444' : '#a33';
    ctx.fillStyle = eye; ctx.fillRect(3, -3, 3, 2);
    ctx.restore();
    // 长戟
    ctx.strokeStyle = '#5a4430'; ctx.lineWidth = 2;
    const la = st === 'charge' ? 1.35 : st === 'windup' ? 1.0 : 0.25;
    ctx.save(); ctx.translate(-6, -22); ctx.rotate(la);
    ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(0, -26); ctx.stroke();
    ctx.fillStyle = '#c0c4c8'; ctx.beginPath(); ctx.moveTo(-3, -24); ctx.lineTo(0, -34); ctx.lineTo(3, -24); ctx.fill(); ctx.fillRect(0, -24, 6, 4);
    ctx.restore();
    if (st === 'stun') {
      ctx.fillStyle = '#ffd070';
      for (let i = 0; i < 3; i++) { const a = g.t * 5 + i * 2.1; ctx.fillRect(Math.cos(a) * 10 - 1.5, -48 + Math.sin(a) * 3, 3, 3); }
    }
    ctx.restore();
  }
}

// ---------------- 展柜拟态 Glass Mimic（新） ----------------
class Mimic {
  constructor(cx, cy) {
    this.w = 30; this.h = 26; this.x = cx * TILE + 1; this.y = (cy + 1) * TILE - this.h;
    this.state = 'hide'; this.t = 0; this.vx = 0; this.vy = 0; this.onGround = true; this.cd = 0; this.alive = true; this.face = 1;
    this.colors = ['#8fd8e8', '#4a3a28', '#f33'];
  }
  update(dt, g) {
    const w = g.world, p = g.player; this.t += dt;
    const dx = p.cx - (this.x + this.w / 2), dy = p.cy - (this.y + this.h / 2);
    this.vy = Math.min(this.vy + GRAV * dt, MAXFALL);
    if (this.state === 'hide') {
      if (g.state === 'play' && Math.abs(dx) < 118 && Math.abs(dy) < 90) { this.state = 'reveal'; this.t = 0; Sound.sfx.reveal(); this.face = Math.sign(dx) || 1; }
    } else if (this.state === 'reveal') {
      if (this.t > 0.38) { this.state = 'hunt'; this.cd = 0; }
    } else if (this.state === 'hunt') {
      if (this.onGround) {
        this.vx = approach(this.vx, 0, 1600 * dt); this.cd -= dt;
        if (this.cd <= 0 && g.state === 'play') {
          const dir = Math.sign(dx) || 1; this.face = dir;
          this.vx = dir * clamp(Math.abs(dx) * 1.7, 110, 270); this.vy = -560; this.onGround = false; this.cd = 0.75;
          Sound.sfx.hop();
        }
      }
    }
    if (w.moveX(this, this.vx * dt)) this.vx = -this.vx * 0.3;
    const ry = w.moveY(this, this.vy * dt);
    if (ry) { if (this.vy > 0 && !this.onGround) { this.onGround = true; g.particles.burst(this.x + 15, this.y + this.h, 5, { color: '#8a8070', smin: 20, smax: 70, angle: -Math.PI / 2, spread: 1.4, lmin: 0.2, lmax: 0.3 }); } this.vy = 0; }
    else if (this.vy > 60) this.onGround = false;
    if (this.y > w.ph) this.alive = false;
  }
  touch(p, g) {
    if (stompable(p, this, 12)) { g.killEnemy(this); Sound.sfx.shatter(); g.stompBounce(); }
    else { this.state = 'hunt'; Sound.sfx.bite(); g.killPlayer(); }
  }
  draw(ctx, g) {
    const x = this.x, y = this.y, open = this.state === 'hide' ? 0 : this.state === 'reveal' ? Math.min(1, this.t * 3) : 0.6 + Math.sin(this.t * 14) * 0.4;
    ctx.save(); ctx.translate(x + 15, y + 26); ctx.scale(this.face, 1);
    // 腿
    if (this.state !== 'hide') {
      ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) { const lx = -11 + i * 7, a = Math.sin(g.t * 20 + i) * 2 * (this.onGround ? 0.3 : 1); ctx.beginPath(); ctx.moveTo(lx, -8); ctx.lineTo(lx - 3 + a, -2); ctx.lineTo(lx - 1 + a, 0); ctx.stroke(); }
    }
    const lift = this.state === 'hide' ? 0 : 4;
    // 底座
    ctx.fillStyle = '#4a3a28'; ctx.fillRect(-15, -9 - lift, 30, 9);
    ctx.fillStyle = '#6a5438'; ctx.fillRect(-15, -9 - lift, 30, 2);
    ctx.fillStyle = '#c9a030'; ctx.fillRect(-4, -5 - lift, 8, 2);
    // 诱饵芯片
    const cy = -16 - lift;
    ctx.fillStyle = '#e6b44a'; ctx.fillRect(-4, cy - 3, 8, 6);
    if (this.state === 'hide') {
      ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createRadialGradient(0, cy, 1, 0, cy, 16); gr.addColorStop(0, 'rgba(255,200,90,0.5)'); gr.addColorStop(1, 'rgba(255,200,90,0)');
      ctx.fillStyle = gr; ctx.fillRect(-16, cy - 16, 32, 32); ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.fillStyle = '#f33'; ctx.fillRect(-6, cy - 1, 3, 3); ctx.fillRect(3, cy - 1, 3, 3);
    }
    // 玻璃罩（上下颚）
    ctx.save(); ctx.translate(-15, -9 - lift); ctx.rotate(-open * 0.9);
    ctx.fillStyle = 'rgba(150,220,235,0.3)'; ctx.fillRect(0, -17, 30, 17);
    ctx.strokeStyle = '#bfe8f0'; ctx.lineWidth = 1.5; ctx.strokeRect(0, -17, 30, 17);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(4, -15, 2, 12);
    if (open > 0.05) { ctx.fillStyle = '#e8f8ff'; for (let i = 3; i < 30; i += 5) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 2, 5); ctx.lineTo(i + 4, 0); ctx.fill(); } }
    ctx.restore();
    ctx.restore();
  }
}

// ---------------- 坠落吊灯 Chandelier（新） ----------------
class Chandelier {
  constructor(cx, cy, world) {
    this.w = 36; this.h = 24; this.x = cx * TILE - 2; this.y = cy * TILE; this.y0 = this.y;
    let yy = cy - 1; while (yy > 0 && !world.solidAt(cx, yy)) yy--;
    this.top = (yy + 1) * TILE; this.state = 'hang'; this.t = 0; this.vy = 0; this.alive = true; this.noStomp = true;
    this.colors = ['#c9a030', '#bfe8f0', '#fff'];
  }
  update(dt, g) {
    this.t += dt; const p = g.player;
    if (this.state === 'hang') {
      if (g.state === 'play' && p.cx > this.x - 14 && p.cx < this.x + this.w + 14 && p.y > this.y + this.h && p.y - this.y < 420) { this.state = 'shake'; this.t = 0; Sound.sfx.crack(); }
    } else if (this.state === 'shake') {
      if (this.t > 0.38) { this.state = 'fall'; this.t = 0; }
    } else if (this.state === 'fall') {
      this.vy = Math.min(this.vy + GRAV * dt, 1000); this.y += this.vy * dt;
      if (g.world.supportAt(this.x + this.w / 2, this.y + this.h) || this.y > g.world.ph) this.shatter(g);
    }
  }
  shatter(g) {
    this.alive = false; Sound.sfx.shatter(); g.shake(5);
    g.particles.burst(this.x + this.w / 2, this.y + this.h - 4, 24, { color: ['#bfe8f0', '#fff', '#c9a030'], shape: 'shard', smin: 60, smax: 260, angle: -Math.PI / 2, spread: 1.4, grav: 900, lmin: 0.5, lmax: 1.0, szmin: 2, szmax: 5 });
  }
  touch(p, g) { if (this.state === 'fall') g.killPlayer(); }
  draw(ctx, g) {
    const sx = this.state === 'shake' ? (Math.random() - 0.5) * 3 : 0;
    const x = this.x + sx, y = this.y, cx = x + this.w / 2;
    if (this.state !== 'fall') { ctx.strokeStyle = '#5a5040'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.x + this.w / 2, this.top); ctx.lineTo(cx, y); ctx.stroke(); }
    ctx.fillStyle = '#c9a030'; ctx.fillRect(cx - 2, y, 4, 8);
    ctx.strokeStyle = '#c9a030'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, y + 10, 17, 4, 0, 0, Math.PI * 2); ctx.stroke();
    for (let i = -2; i <= 2; i++) {
      const px = cx + i * 7;
      ctx.fillStyle = 'rgba(190,232,240,0.85)'; ctx.beginPath(); ctx.moveTo(px - 2.5, y + 12); ctx.lineTo(px, y + 22 + (i % 2 === 0 ? 2 : 0)); ctx.lineTo(px + 2.5, y + 12); ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(cx, y + 12, 2, cx, y + 12, 30); gr.addColorStop(0, 'rgba(255,220,150,0.25)'); gr.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = gr; ctx.fillRect(cx - 30, y - 18, 60, 60);
    ctx.globalCompositeOperation = 'source-over';
  }
}

// 地图字符 → 场景物件工厂（后续章节注册；返回 null 表示不生成）
const PROP_FACTORIES = {};

function makeEnemy(s, world) {
  switch (s.type) {
    case 's': return new Scrubber(s.cx, s.cy, false, world);
    case 'w': return new Scrubber(s.cx, s.cy, true, world);
    case 'd': return new Drone(s.cx, s.cy);
    case 'k': return new Knight(s.cx, s.cy);
    case 'm': return new Mimic(s.cx, s.cy);
    case 'Y': return new Chandelier(s.cx, s.cy, world);
  }
  return null;
}

// ---------------- 能力 / 武器拾取物 ----------------
//  dashStrike：1-4 地下仓库（拆解展台上的冲撞驱动器）
//  sabre     ：1-6 古兵器馆（展柜里的仪仗军刀）
//  relicBlade：击败巨像1号后插在地上的残刃
const PICKUP_INFO = {
  dashStrike: { label: '冲撞模块', color: '255,170,80' },
  sabre: { label: '仪仗军刀', color: '220,235,255' },
  relicBlade: { label: '巨像残刃', color: '255,210,120' },
  flintlock: { label: '古董燧发枪', color: '255,200,140' },
  sporeGun: { label: '生物孢子枪', color: '150,240,190' },
};
class AbilityPickup {
  constructor(x, groundY, key) { this.key = key; this.x = x - 14; this.y = groundY - 56; this.w = 28; this.h = 56; this.t = 0; this.got = false; }
  update(dt, g) {
    this.t += dt;
    const c = PICKUP_INFO[this.key].color;
    if (!this.got && Math.random() < 0.3) g.particles.add({ x: this.x + 14 + rand(-10, 10), y: this.y + 50, vx: rand(-10, 10), vy: rand(-80, -30), life: 0.8, size: 2, color: `rgb(${c})`, add: true });
    if (!this.got && this.t > 0.5 && g.state === 'play' && overlap(g.player, this)) { this.got = true; g.pickupAbility(this.key); }
  }
  draw(ctx, g) {
    if (this.got) return;
    const x = this.x + 14, y = this.y + 56, c = PICKUP_INFO[this.key].color;
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(x, y - 26, 2, x, y - 26, 60 + Math.sin(g.t * 3) * 6);
    gr.addColorStop(0, `rgba(${c},0.45)`); gr.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = gr; ctx.fillRect(x - 70, y - 96, 140, 140);
    ctx.fillStyle = `rgba(${c},0.07)`; ctx.fillRect(x - 10, y - 400, 20, 400);
    ctx.globalCompositeOperation = 'source-over';
    if (this.key === 'relicBlade') {
      ctx.fillStyle = '#9aa0a4'; ctx.beginPath(); ctx.moveTo(x - 3, y - 36); ctx.lineTo(x + 3, y - 36); ctx.lineTo(x + 2, y - 2); ctx.lineTo(x, y + 4); ctx.lineTo(x - 2, y - 2); ctx.fill();
      ctx.fillStyle = '#dfe4e8'; ctx.fillRect(x - 1, y - 34, 1, 30);
      ctx.fillStyle = '#8a6a36'; ctx.fillRect(x - 10, y - 40, 20, 4); ctx.fillStyle = '#4a3218'; ctx.fillRect(x - 2, y - 52, 4, 12);
      ctx.fillStyle = '#f33'; ctx.beginPath(); ctx.arc(x, y - 54, 3, 0, 7); ctx.fill();
    } else {
      // 展柜底座
      ctx.fillStyle = '#6a5438'; ctx.fillRect(x - 18, y - 14, 36, 14); ctx.fillStyle = '#8a7048'; ctx.fillRect(x - 18, y - 14, 36, 3);
      ctx.fillStyle = 'rgba(150,220,235,0.14)'; ctx.fillRect(x - 16, y - 54, 32, 40);
      ctx.strokeStyle = 'rgba(191,232,240,0.7)'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 16, y - 54, 32, 40);
      const bob = Math.sin(g.t * 2.5) * 2;
      if (this.key === 'flintlock' || this.key === 'sporeGun') {
        ctx.save(); ctx.translate(x, y - 34 + bob);
        ItemArt.icon(ctx, this.key, 0, 0, 0.16, g.t);
        ctx.restore();
      } else if (this.key === 'sabre') {
        ctx.save(); ctx.translate(x, y - 34 + bob); ctx.rotate(-0.6);
        ctx.strokeStyle = '#dfe6ee'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-2, 14); ctx.quadraticCurveTo(4, -2, 2, -18); ctx.stroke();
        ctx.fillStyle = '#c9a030'; ctx.fillRect(-7, 13, 12, 3); ctx.fillStyle = '#5a3a20'; ctx.fillRect(-3, 16, 3, 7);
        ctx.restore();
      } else {
        ctx.fillStyle = '#5a5650'; ctx.fillRect(x - 10, y - 44 + bob, 20, 18);
        ctx.fillStyle = '#b8743a'; ctx.fillRect(x - 12, y - 40 + bob, 24, 4); ctx.fillRect(x - 12, y - 32 + bob, 24, 4);
        ctx.fillStyle = `rgb(${c})`; ctx.beginPath(); ctx.arc(x, y - 35 + bob, 4, 0, 7); ctx.fill();
      }
    }
    ctx.fillStyle = `rgba(${c},${0.6 + 0.4 * Math.sin(g.t * 4)})`; ctx.font = 'bold 11px ' + FONT; ctx.textAlign = 'center';
    ctx.fillText('▼ ' + PICKUP_INFO[this.key].label, x, y - 70 - Math.sin(g.t * 3) * 3); ctx.textAlign = 'left';
  }
}
