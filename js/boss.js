'use strict';
// ============================================================
//  第一章 Boss：博物馆守卫 · 巨像1号（The Colossus）
//  机制：
//   · 冲撞：冲向玩家一侧墙壁，撞墙引发落石 → 用两侧弹床跳上高台 / 越过它
//   · 激光：头部升起追踪扫射 → 躲到“高压展览柜”后方，激光击中展柜引发反噬电流（巨额伤害）
//   · 跳砸：跃向场地一侧，落地产生冲击波 → 起跳躲避
//   · 古董炮（二阶段起）：背部火炮抛射炮弹
//   · 眩晕时头部落地，可踩踏头部追加伤害；从上方踩到机身会被弹开
// ============================================================
const ARENA = { FLOOR: 480, L: 32, R: 928, CX: 480 };

class ExhibitCase {
  constructor(g) {
    this.x = 450; this.y = 384; this.w = 60; this.h = 96;
    this.state = 'charged'; this.charge = 1; this.t = 0;
    this.solid = { x: this.x, y: this.y, w: this.w, h: this.h, active: true, oneWay: false, owner: this };
    g.world.solids.push(this.solid);
  }
  blocks() { return this.state === 'charged'; }
  overload(g, boss) {
    this.state = 'broken'; this.charge = 0; this.t = 0;
    Sound.sfx.shatter(); Sound.sfx.electric(); g.flash(0.7, '#dff'); g.shake(16); g.freeze(0.12);
    g.particles.burst(this.x + 30, this.y + 30, 40, { color: ['#bfe8f0', '#fff', '#8fd8e8'], shape: 'shard', smin: 100, smax: 420, grav: 900, lmin: 0.6, lmax: 1.3, szmin: 3, szmax: 7 });
    const e = boss.eye();
    g.bolts.push({ x1: this.x + 30, y1: this.y + 20, x2: e.x, y2: e.y, t: 0, life: 0.7, w: 5 });
    g.bolts.push({ x1: this.x + 30, y1: this.y + 20, x2: boss.x, y2: boss.y - 120, t: 0, life: 0.6, w: 3 });
  }
  update(dt, g) {
    this.t += dt;
    if (this.state === 'broken') {
      this.charge = Math.min(1, this.charge + dt / 5.5);
      if (Math.random() < 0.15) g.particles.add({ x: this.x + rand(10, 50), y: this.y + rand(20, 60), vx: rand(-30, 30), vy: rand(-80, -20), life: 0.4, size: 2, color: '#8ff', add: true, shape: 'spark' });
      if (this.charge >= 1) {
        this.state = 'charged'; Sound.sfx.recharge();
        g.particles.burst(this.x + 30, this.y + 40, 20, { color: ['#8ff', '#fff'], smin: 40, smax: 160, lmin: 0.3, lmax: 0.6, add: true });
      }
    }
  }
  draw(ctx, g) {
    const x = this.x, y = this.y;
    // 基座
    ctx.fillStyle = '#8d887d'; ctx.fillRect(x - 4, y + 72, 68, 24);
    ctx.fillStyle = '#b5b0a4'; ctx.fillRect(x - 4, y + 72, 68, 3);
    ctx.fillStyle = '#5a564e'; ctx.fillRect(x - 4, y + 92, 68, 4);
    // 充能条
    ctx.fillStyle = '#222'; ctx.fillRect(x + 6, y + 80, 48, 5);
    ctx.fillStyle = this.state === 'charged' ? ((g.t * 6) % 2 < 1 ? '#6ff' : '#3cc') : '#fa4'; ctx.fillRect(x + 6, y + 80, 48 * this.charge, 5);
    ctx.fillStyle = '#3a3226'; ctx.fillRect(x + 12, y + 87, 36, 4);
    // 特斯拉线圈
    const cx = x + 30;
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(cx - 10, y + 62, 20, 10);
    ctx.fillStyle = '#b8743a'; for (let i = 0; i < 9; i++) ctx.fillRect(cx - 5, y + 24 + i * 4.3, 10, 2.6);
    ctx.fillStyle = '#6a4424'; ctx.fillRect(cx - 5, y + 24, 2, 38);
    ctx.fillStyle = '#9aa0a4'; ctx.beginPath(); ctx.ellipse(cx, y + 20, 15, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8ccd0'; ctx.beginPath(); ctx.ellipse(cx, y + 18, 13, 3, 0, 0, Math.PI * 2); ctx.fill();
    // 电弧
    if (this.state === 'charged') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(160,240,255,0.85)'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath(); let px = cx + rand(-12, 12), py = y + 18; ctx.moveTo(px, py);
        const tx = x + (Math.random() < 0.5 ? 2 : 58), ty = y + rand(4, 60);
        for (let s = 1; s <= 5; s++) ctx.lineTo(lerp(px, tx, s / 5) + rand(-4, 4), lerp(py, ty, s / 5) + rand(-4, 4));
        ctx.stroke();
      }
      const gr = ctx.createRadialGradient(cx, y + 20, 2, cx, y + 20, 60);
      gr.addColorStop(0, 'rgba(120,230,255,0.35)'); gr.addColorStop(1, 'rgba(120,230,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(cx - 60, y - 40, 120, 120);
      ctx.globalCompositeOperation = 'source-over';
      // 防弹玻璃
      ctx.fillStyle = 'rgba(150,220,235,0.16)'; ctx.fillRect(x, y, 60, 72);
      ctx.strokeStyle = '#bfe8f0'; ctx.lineWidth = 2; ctx.strokeRect(x, y, 60, 72);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 6, y + 6, 3, 50); ctx.fillRect(x + 12, y + 6, 1.5, 30);
    } else {
      ctx.strokeStyle = 'rgba(191,232,240,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y + 72); ctx.lineTo(x, y + 40); ctx.lineTo(x + 8, y + 50); ctx.lineTo(x + 5, y + 30);
      ctx.moveTo(x + 60, y + 72); ctx.lineTo(x + 60, y + 34); ctx.lineTo(x + 52, y + 48); ctx.lineTo(x + 55, y + 58); ctx.stroke();
      // 能量重建框
      ctx.strokeStyle = `rgba(255,170,70,${0.3 + this.charge * 0.5})`; ctx.setLineDash([4, 4]);
      ctx.strokeRect(x, y + 72 - 72 * this.charge, 60, 72 * this.charge); ctx.setLineDash([]);
    }
    ctx.fillStyle = 'rgba(255,220,120,0.7)'; ctx.font = '9px ' + FONT; ctx.textAlign = 'center';
    ctx.fillText('⚡ 高压展品 · 1891', cx, y - 6); ctx.textAlign = 'left';
  }
}

class Rock {
  constructor(g, x, delay) {
    this.x = x; this.delay = delay; this.y = 66; this.vy = 0; this.r = rand(12, 17); this.dead = false; this.t = 0; this.rot = rand(0, 6);
    let ty = 70; while (ty < 540 && !g.world.supportAt(x, ty)) ty += 4;
    this.ty = ty;
  }
  update(dt, g) {
    this.t += dt;
    if (this.t < this.delay) {
      if (Math.random() < 0.3) g.particles.add({ x: this.x + rand(-10, 10), y: 66, vx: 0, vy: rand(60, 160), life: 0.6, size: 2, color: '#8a8070' });
      return;
    }
    this.vy += 1900 * dt; this.y += this.vy * dt; this.rot += dt * 4;
    if (g.state === 'play' && Math.hypot(g.player.cx - this.x, g.player.cy - this.y) < this.r + 9) g.killPlayer('rock');
    if (this.y + this.r >= this.ty) {
      this.dead = true; Sound.sfx.rock(); g.shake(3);
      g.particles.burst(this.x, this.ty - 4, 10, { color: ['#6e6a62', '#8e897e', '#4a4640'], smin: 60, smax: 220, angle: -Math.PI / 2, spread: 1.3, grav: 1000, lmin: 0.4, lmax: 0.8, szmin: 3, szmax: 6 });
    }
  }
  draw(ctx, g) {
    if (this.t < this.delay) {
      const k = this.t / this.delay;
      ctx.strokeStyle = `rgba(255,70,50,${0.3 + 0.5 * ((g.t * 10) % 2 < 1 ? 1 : 0.4)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(this.x, this.ty - 2, 18 * (1.3 - k * 0.3), 4, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([3, 6]); ctx.beginPath(); ctx.moveTo(this.x, 70); ctx.lineTo(this.x, this.ty - 6); ctx.stroke(); ctx.setLineDash([]);
      return;
    }
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rot);
    ctx.fillStyle = '#6e6a62'; ctx.beginPath();
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, rr = this.r * (0.8 + ((i * 37) % 5) / 12); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.fill(); ctx.fillStyle = '#8e897e'; ctx.fillRect(-this.r * 0.5, -this.r * 0.5, this.r * 0.5, this.r * 0.3);
    ctx.fillStyle = '#4b6b33'; ctx.fillRect(-this.r * 0.2, this.r * 0.3, this.r * 0.6, 3);
    ctx.restore();
  }
}

class Shockwave {
  constructor(x, dir) { this.x = x; this.dir = dir; this.y = ARENA.FLOOR; this.dead = false; this.t = 0; }
  update(dt, g) {
    this.t += dt; this.x += this.dir * 430 * dt;
    if (this.x < ARENA.L || this.x > ARENA.R) this.dead = true;
    if (Math.random() < 0.6) g.particles.add({ x: this.x + rand(-8, 8), y: this.y - 2, vx: rand(-40, 40), vy: rand(-220, -80), life: 0.35, size: rand(2, 5), color: pick(['#8e897e', '#ffb060']), grav: 900 });
    const p = g.player;
    if (g.state === 'play' && overlap(p.hurt(), { x: this.x - 14, y: this.y - 26, w: 28, h: 26 })) g.killPlayer('shock');
  }
  draw(ctx, g) {
    const x = this.x, y = this.y;
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(x, y, 2, x, y, 34); gr.addColorStop(0, 'rgba(255,170,80,0.7)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = gr; ctx.fillRect(x - 34, y - 34, 68, 34);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#7a7468';
    for (let i = 0; i < 4; i++) { const sx = x - this.dir * i * 7, h = 24 - i * 5; ctx.beginPath(); ctx.moveTo(sx - 5, y); ctx.lineTo(sx, y - h); ctx.lineTo(sx + 5, y); ctx.fill(); }
  }
}

class Cannonball {
  constructor(sx, sy, tx, ty) {
    const T = 1.1; this.g = 1400;
    this.x = sx; this.y = sy; this.vx = (tx - sx) / T; this.vy = (ty - sy - 0.5 * this.g * T * T) / T;
    this.tx = tx; this.ty = ty; this.dead = false; this.t = 0;
  }
  update(dt, g) {
    this.t += dt; this.vy += this.g * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    if (g.state === 'play' && Math.hypot(g.player.cx - this.x, g.player.cy - this.y) < 16) { this.boom(g); return; }
    if (this.vy > 0 && (g.world.supportAt(this.x, this.y + 8) || this.y > ARENA.FLOOR)) this.boom(g);
  }
  boom(g) { this.dead = true; g.explosion(this.x, Math.min(this.y, ARENA.FLOOR - 4), 50); }
  defuse(g) {
    this.dead = true; Sound.sfx.block(); g.shake(3);
    g.particles.burst(this.x, this.y, 12, { color: ['#888', '#fa4', '#fff'], smin: 60, smax: 200, lmin: 0.2, lmax: 0.5 });
  }
  draw(ctx, g) {
    ctx.strokeStyle = `rgba(255,80,50,${(g.t * 8) % 2 < 1 ? 0.8 : 0.35})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(this.tx, this.ty - 2, 26, 5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(this.x, this.y, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#555'; ctx.fillRect(this.x - 4, this.y - 5, 3, 3);
    g.particles.add({ x: this.x, y: this.y, vx: 0, vy: -20, life: 0.4, size: 5, grow: 12, color: 'rgba(90,90,90,0.5)', shape: 'glow' });
  }
}

class Colossus {
  constructor(g, short) {
    this.x = 720; this.y = -260; this.vy = 0; this.facing = -1;
    this.maxHp = 12; this.hp = 12; this.state = 'intro'; this.t = 0; this.short = short;
    this.walk = 0; this.lift = 0; this.headDrop = 0; this.crouch = 0; this.recoil = 0; this.flash = 0;
    this.patternIdx = 0; this.la = 0; this.beam = null; this.laserSnd = null; this.dead = false;
    this.stomped = false; this.doubled = false; this.shots = 0; this.shotT = 0; this.deathT = 0; this.hitOnce = false; this.phaseSeen = 1;
  }
  get phase() { return this.hp > 8 ? 1 : this.hp > 4 ? 2 : 3; }
  get active() { return !['dying', 'dead'].includes(this.state); }
  body() { const c = this.crouch * 20; return { x: this.x - 110, y: this.y - 192 + c, w: 220, h: 192 - c }; }
  headRect() { return { x: this.x + this.facing * 135 - 34, y: this.y - 78, w: 68, h: 52 }; }
  eye() {
    return { x: this.x + this.facing * (140 - this.headDrop * 4), y: this.y - 160 - this.lift * 24 + this.crouch * 20 + this.headDrop * 108 };
  }
  worldAngle() { return this.facing > 0 ? this.la : Math.PI - this.la; }
  localTarget(p) {
    const e = this.eye(); let a = Math.atan2(p.cy - e.y, p.cx - e.x);
    if (this.facing < 0) a = Math.PI - a;
    a = angDiff(a, 0);
    return clamp(a, -1.45, 1.45);
  }
  faceTo(p) { const d = p.cx - this.x; if (Math.abs(d) > 20) this.facing = Math.sign(d); }

  next(g, avoidLaser) {
    const pats = { 1: ['charge', 'laser', 'leap', 'laser'], 2: ['charge', 'laser', 'mortar', 'leap', 'laser'], 3: ['charge', 'laser', 'mortar', 'leap', 'mortar', 'laser'] };
    const pat = pats[this.phase];
    let a = pat[this.patternIdx % pat.length]; this.patternIdx++;
    if (avoidLaser && a === 'laser') { a = pat[this.patternIdx % pat.length]; this.patternIdx++; }
    this.begin(a, g);
  }
  begin(a, g) {
    this.t = 0; const p = g.player;
    if (a === 'charge') { this.faceTo(p); this.state = 'windCharge'; Sound.sfx.growl(); }
    else if (a === 'laser') {
      if (this.x - ARENA.L < 170) this.facing = 1; else if (ARENA.R - this.x < 170) this.facing = -1; else this.faceTo(p);
      this.state = 'aim'; this.la = this.localTarget(p); Sound.sfx.laserCharge(1.0);
    } else if (a === 'leap') { this.state = 'crouch'; }
    else if (a === 'mortar') { this.state = 'mortar'; this.shots = 0; this.shotT = 0.5; this.faceTo(p); }
  }

  update(dt, g) {
    this.t += dt; this.flash = Math.max(0, this.flash - dt);
    const p = g.player, ph = this.phase;
    switch (this.state) {
      case 'intro':
        this.vy += 2400 * dt; this.y += this.vy * dt;
        if (this.y >= ARENA.FLOOR) {
          this.y = ARENA.FLOOR; this.vy = 0; g.shake(20); Sound.sfx.slam();
          g.particles.burst(this.x, ARENA.FLOOR, 40, { color: ['#8e897e', '#6e6a62'], smin: 80, smax: 360, angle: -Math.PI / 2, spread: 1.5, grav: 900, lmin: 0.5, lmax: 1.1, szmin: 3, szmax: 7 });
          this.state = 'roar'; this.t = 0; Sound.sfx.roar();
          if (!this.short) g.say(RADIO.bossIntro);
        }
        break;
      case 'roar':
        this.lift = Math.min(1, this.t * 2);
        if (Math.random() < 0.3) g.shake(4);
        if (this.t > (this.short ? 1.0 : 1.8)) { this.lift = 0; this.state = 'idle'; this.t = 0; }
        break;
      case 'idle':
        this.lift = approach(this.lift, 0, dt * 3); this.headDrop = approach(this.headDrop, 0, dt * 3);
        this.faceTo(p);
        if (this.t > [0.9, 0.65, 0.45][ph - 1]) this.next(g);
        break;
      case 'windCharge':
        this.crouch = Math.min(1, this.t * 3) * 0.4;
        if (Math.random() < 0.5) g.particles.add({ x: this.x - this.facing * 90, y: ARENA.FLOOR, vx: -this.facing * rand(60, 160), vy: rand(-120, -30), life: 0.5, size: 4, color: '#8e897e', grav: 600 });
        if (this.t > [0.85, 0.7, 0.55][ph - 1]) { this.state = 'charge'; this.t = 0; this.crouch = 0; }
        break;
      case 'charge': {
        const sp = [480, 600, 700][ph - 1];
        this.x += this.facing * sp * dt; this.walk += dt * 15;
        if (Math.random() < 0.6) g.particles.add({ x: this.x - this.facing * 100, y: ARENA.FLOOR - 2, vx: -this.facing * rand(40, 140), vy: rand(-90, -20), life: 0.5, size: 5, color: '#7a7468', grav: 400 });
        if (Math.floor(this.walk / Math.PI) !== Math.floor((this.walk - dt * 15) / Math.PI)) { g.shake(3); Sound.sfx.rock(); }
        const edge = this.x + this.facing * 118;
        if (this.facing > 0 ? edge >= ARENA.R : edge <= ARENA.L) { this.x = this.facing > 0 ? ARENA.R - 118 : ARENA.L + 118; this.slam(g); }
        break;
      }
      case 'stagger':
        this.recoil = Math.max(0, 1 - this.t);
        if (this.t > 1.0) {
          this.recoil = 0; this.facing *= -1;
          if (ph === 3 && !this.doubled) { this.doubled = true; this.faceTo(p); this.state = 'windCharge'; this.t = 0; Sound.sfx.growl(); }
          else { this.doubled = false; this.next(g); }
        }
        break;
      case 'aim': {
        this.lift = Math.min(1, this.t * 2.5);
        this.la += clamp(this.localTarget(p) - this.la, -3 * dt, 3 * dt);
        if (this.t > 1.0) { this.state = 'fire'; this.t = 0; this.laserSnd = Sound.laserLoop(); g.shake(5); }
        break;
      }
      case 'fire': {
        const rate = [0.95, 1.15, 1.35][ph - 1];
        this.la += clamp(this.localTarget(p) - this.la, -rate * dt, rate * dt);
        this.castBeam(g);
        if (this.state === 'fire' && this.t > [2.6, 3.0, 3.4][ph - 1]) this.endLaser();
        break;
      }
      case 'cool':
        this.lift = Math.max(0, 1 - this.t * 2.5);
        if (this.t > 0.6) this.next(g);
        break;
      case 'crouch':
        this.crouch = Math.min(1, this.t * 2.5);
        if (this.t > 0.6) {
          let tx = clamp(p.cx, 150, 810);
          if (tx > 300 && tx < 660) tx = tx < ARENA.CX ? 300 : 660;
          if (Math.abs(tx - this.x) < 60) tx = this.x < ARENA.CX ? 660 : 300;
          this.jx0 = this.x; this.jx1 = tx; this.facing = Math.sign(tx - this.x) || this.facing;
          this.state = 'leap'; this.t = 0; this.crouch = 0; Sound.sfx.cannon();
        }
        break;
      case 'leap': {
        const k = Math.min(1, this.t / 1.0);
        this.x = lerp(this.jx0, this.jx1, k); this.y = ARENA.FLOOR - Math.sin(k * Math.PI) * 190; this.walk += dt * 4;
        if (k >= 1) { this.y = ARENA.FLOOR; this.land(g); }
        break;
      }
      case 'mortar': {
        const N = [0, 3, 3, 5][ph];
        this.shotT -= dt; this.recoil = Math.max(0, this.recoil - dt * 4);
        if (this.shotT <= 0 && this.shots < N) {
          const c = this.cannon();
          let tx = clamp(p.cx + rand(-70, 70) + p.vx * 0.5, 50, 910);
          let ty = 70; while (ty < 540 && !g.world.supportAt(tx, ty)) ty += 4;
          g.projectiles.push(new Cannonball(c.x, c.y, tx, ty));
          Sound.sfx.cannon(); g.shake(4); this.recoil = 1;
          g.particles.burst(c.x, c.y, 10, { color: ['#fa4', '#fff', '#888'], smin: 40, smax: 160, lmin: 0.2, lmax: 0.5, add: true });
          this.shots++; this.shotT = 0.42;
        }
        if (this.shots >= N && this.shotT < -0.6) this.next(g);
        break;
      }
      case 'stunned':
        this.headDrop = Math.min(1, this.t * 3); this.lift = 0;
        if (Math.random() < 0.35) {
          const b = this.body();
          g.particles.add({ x: rand(b.x, b.x + b.w), y: rand(b.y, b.y + b.h * 0.6), vx: rand(-60, 60), vy: rand(-120, -20), life: 0.3, size: 2, color: '#8ff', shape: 'spark', add: true });
        }
        if (this.t > 3.0) { this.state = 'recover'; this.t = 0; }
        break;
      case 'recover':
        this.headDrop = Math.max(0, 1 - this.t * 2);
        if (this.t > 0.8) { this.headDrop = 0; this.next(g, true); }
        break;
      case 'dying':
        this.deathT += dt; this.headDrop = Math.min(1, this.deathT); this.lift = 0;
        if (Math.random() < 0.25) {
          const b = this.body(), ex = rand(b.x, b.x + b.w), ey = rand(b.y, b.y + b.h);
          Sound.sfx.explode(); g.shake(8);
          g.particles.burst(ex, ey, 14, { color: ['#fa4', '#ff6', '#f52', '#fff'], smin: 40, smax: 220, lmin: 0.3, lmax: 0.7, add: true, szmin: 3, szmax: 7 });
        }
        if (this.deathT > 3.4) {
          this.state = 'dead'; this.dead = true; Sound.sfx.bigExplode(); g.shake(28); g.flash(1, '#fff');
          const b = this.body();
          g.particles.burst(this.x, this.y - 100, 70, { color: ['#4d4942', '#6e6a62', '#8e9296', '#c9a030', '#bfe8f0'], shape: 'shard', smin: 150, smax: 600, grav: 1100, lmin: 1, lmax: 2.2, szmin: 4, szmax: 12, floor: ARENA.FLOOR - 3 });
          g.particles.burst(this.x, this.y - 100, 50, { color: ['#fa4', '#ff6', '#fff'], smin: 100, smax: 500, lmin: 0.4, lmax: 1.0, add: true, szmin: 4, szmax: 9 });
          g.onBossDefeated(b);
        }
        break;
    }
    // 阶段台词
    if (this.phase > this.phaseSeen && this.active) {
      this.phaseSeen = this.phase;
      g.say(this.phase === 2 ? RADIO.bossPhase2 : RADIO.bossPhase3);
    }
  }
  cannon() { return { x: this.x - this.facing * 58, y: this.y - 238 + this.crouch * 20 }; }

  slam(g) {
    g.shake(20); Sound.sfx.slam(); g.freeze(0.06);
    const wx = this.facing > 0 ? ARENA.R : ARENA.L;
    g.particles.burst(wx, ARENA.FLOOR - 120, 30, { color: ['#8e897e', '#6e6a62', '#ffd070'], smin: 80, smax: 360, grav: 900, lmin: 0.5, lmax: 1.0, szmin: 3, szmax: 7 });
    const n = [5, 7, 9][this.phase - 1];
    for (let i = 0; i < n; i++) g.projectiles.push(new Rock(g, rand(60, 900), 0.55 + i * 0.16 + rand(0, 0.2)));
    this.state = 'stagger'; this.t = 0;
  }
  land(g) {
    g.shake(18); Sound.sfx.slam();
    g.particles.burst(this.x, ARENA.FLOOR, 30, { color: ['#8e897e', '#6e6a62'], smin: 60, smax: 300, angle: -Math.PI / 2, spread: 1.5, grav: 900, lmin: 0.4, lmax: 0.9, szmin: 3, szmax: 7 });
    g.projectiles.push(new Shockwave(this.x - 118, -1), new Shockwave(this.x + 118, 1));
    if (this.phase >= 2) for (let i = 0; i < 3; i++) g.projectiles.push(new Rock(g, rand(60, 900), 0.4 + i * 0.25));
    this.state = 'idle'; this.t = 0;
  }
  castBeam(g) {
    const e = this.eye(), a = this.worldAngle(), dx = Math.cos(a), dy = Math.sin(a), cs = g.exhibit;
    let x = e.x, y = e.y, len = 0, hitCase = false;
    for (len = 0; len < 1500; len += 4) {
      x = e.x + dx * len; y = e.y + dy * len;
      if (x < 0 || x > VW || y < 0 || g.world.pointSolid(x, y)) break;
      if (cs && cs.blocks() && x >= cs.x && x <= cs.x + cs.w && y >= cs.y && y <= cs.y + cs.h) { hitCase = true; break; }
    }
    this.beam = { x1: e.x, y1: e.y, x2: x, y2: y, hitCase };
    if (Math.random() < 0.8) g.particles.add({ x, y, vx: rand(-200, 200), vy: rand(-260, -40), life: 0.3, size: 2, color: pick(['#f64', '#fc8', '#fff']), shape: 'spark', add: true, grav: 800 });
    if (g.state === 'play') {
      const hb = g.player.hurt();
      for (let s = 0; s < len; s += 5) {
        const bx = e.x + dx * s, by = e.y + dy * s;
        if (bx > hb.x - 4 && bx < hb.x + hb.w + 4 && by > hb.y - 4 && by < hb.y + hb.h + 4) { g.killPlayer('laser'); break; }
      }
    }
    if (hitCase && cs.charge >= 1) {
      cs.overload(g, this);
      this.hurt(4, g, true);
    }
  }
  endLaser() {
    if (this.laserSnd) { this.laserSnd.stop(); this.laserSnd = null; }
    this.beam = null;
    if (this.state === 'fire' || this.state === 'aim') { this.state = 'cool'; this.t = 0; }
  }
  stopSounds() { if (this.laserSnd) { this.laserSnd.stop(); this.laserSnd = null; } }
  hurt(n, g, overload) {
    if (!this.active) return;
    this.hp = Math.max(0, this.hp - n); this.flash = 0.25; Sound.sfx.hit();
    if (overload) {
      this.stopSounds(); this.beam = null; this.state = 'stunned'; this.t = 0; this.stomped = false; this.lift = 0;
      if (!this.hitOnce) { this.hitOnce = true; g.say(RADIO.bossFirstHit); }
    }
    if (this.hp <= 0) { this.stopSounds(); this.beam = null; this.state = 'dying'; this.t = 0; this.deathT = 0; Sound.sfx.roar(); }
  }
  // 与玩家的接触
  touchPlayer(g) {
    const p = g.player; if (g.state !== 'play' || !this.active || this.state === 'intro' && this.y < 100) return;
    const b = this.body();
    const stunned = this.state === 'stunned' || this.state === 'recover';
    if (stunned) {
      const hr = this.headRect();
      if (!this.stomped && this.state === 'stunned' && overlap(p, hr) && p.vy > 0 && p.prevBottom <= hr.y + 16) {
        this.stomped = true; this.hurt(1, g, false); g.stompBounce(1.1);
        g.particles.burst(p.cx, p.y + p.h, 16, { color: ['#ffd070', '#fff'], shape: 'spark', smin: 100, smax: 300, lmin: 0.2, lmax: 0.4, add: true });
        return;
      }
      if (overlap(p, b) && p.vy > 0 && p.prevBottom <= b.y + 16) this.bounce(g);
      return;
    }
    if (!overlap(p, b)) return;
    if (p.vy > 0 && p.prevBottom <= b.y + 16) this.bounce(g);
    else if (overlap(p.hurt(), b)) g.killPlayer('boss');
  }
  // 残刃命中：眩晕时砍头 +1（与踩头共用每次眩晕一次的机会），其余部位只会溅出火花
  slashed(g, ab) {
    if (!this.active || this.state === 'intro') return;
    const p = g.player;
    if (this.state === 'stunned' && !this.stomped && overlap(ab, this.headRect())) {
      p.atkHits.add(this); this.stomped = true; this.hurt(1, g, false); Sound.sfx.slashHit(); g.freeze(0.06);
      g.particles.burst(ab.x + ab.w / 2, ab.y + ab.h / 2, 16, { color: ['#ffd070', '#fff'], shape: 'spark', smin: 100, smax: 320, lmin: 0.2, lmax: 0.4, add: true });
      if (p.atkDown) g.stompBounce(1.1);
      return;
    }
    if (overlap(ab, this.body())) {
      p.atkHits.add(this); Sound.sfx.block();
      g.particles.burst(ab.x + ab.w / 2, ab.y + ab.h / 2, 8, { color: ['#ffd070', '#fff'], shape: 'spark', smin: 80, smax: 220, lmin: 0.1, lmax: 0.25, add: true });
      if (p.atkDown) g.stompBounce(0.9);
      g.toastHint('装甲太厚了——还是得靠高压展柜。瘫痪时可以砍它的头');
    }
  }
  bounce(g) {
    const p = g.player; p.y = this.body().y - p.h; p.vy = -640; p.vx = Math.sign(p.cx - this.x || 1) * 320; p.canDash = true;
    Sound.sfx.clang(); g.shake(3);
  }

  // -------------------- 绘制 --------------------
  draw(ctx, g) {
    if (this.state === 'dead') return;
    const t = g.t;
    // 跳跃落点阴影
    if (this.state === 'leap') {
      ctx.fillStyle = 'rgba(255,60,40,0.25)'; ctx.beginPath(); ctx.ellipse(this.jx1, ARENA.FLOOR - 2, 120, 10, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.facing, 1);
    if (this.flash > 0 && ctx.filter !== undefined) ctx.filter = 'brightness(2.6)';
    if (this.state === 'dying') ctx.translate((Math.random() - 0.5) * 6, 0);
    const walking = this.state === 'charge';
    const bob = walking ? Math.sin(this.walk * 2) * 4 : Math.sin(t * 2) * 2;
    const by = bob + this.crouch * 20 + this.recoil * 6 + (this.state === 'dying' ? this.deathT * 8 : 0);
    const air = this.state === 'leap';

    // 腿：远侧（暗）
    this.drawLeg(ctx, 85, -85 + by, 0, true, air);
    this.drawLeg(ctx, -60, -85 + by, Math.PI, true, air);
    // 背部古董兵器
    ctx.lineCap = 'round';
    this.drawSword(ctx, -70, -196 + by, -0.5, 60);
    this.drawSword(ctx, -35, -206 + by, -0.2, 70);
    ctx.strokeStyle = '#4a3a26'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(10, -205 + by); ctx.lineTo(28, -280 + by); ctx.stroke();
    ctx.fillStyle = '#b0b6ba'; ctx.beginPath(); ctx.moveTo(24, -278 + by); ctx.lineTo(31, -300 + by); ctx.lineTo(34, -276 + by); ctx.fill();
    ctx.fillStyle = '#7a2a22'; ctx.fillRect(22, -272 + by, 10, 6);
    // 古董炮
    ctx.save(); ctx.translate(-58, -214 + by); ctx.rotate(-0.9 - this.recoil * 0.1);
    ctx.fillStyle = '#6a4a26'; ctx.fillRect(-6, -8, 50, 16); ctx.fillStyle = '#8a6a36'; ctx.fillRect(-6, -8, 50, 4);
    ctx.fillStyle = '#4a3218'; ctx.fillRect(40, -10, 6, 20); ctx.fillStyle = '#111'; ctx.fillRect(44, -5, 3, 10);
    ctx.restore();
    ctx.fillStyle = '#3a3226'; ctx.beginPath(); ctx.arc(-58, -212 + by, 12, 0, 7); ctx.fill();

    // 躯干
    const hull = [[-122, -82], [-132, -150], [-100, -206], [-10, -218], [75, -204], [118, -168], [116, -92], [64, -72], [-60, -70]];
    const gr = ctx.createLinearGradient(0, -220 + by, 0, -70 + by);
    gr.addColorStop(0, '#5a554c'); gr.addColorStop(1, '#2c2a27');
    ctx.fillStyle = gr; ctx.beginPath(); hull.forEach(([hx, hy], i) => (i ? ctx.lineTo(hx, hy + by) : ctx.moveTo(hx, hy + by))); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1a1917'; ctx.lineWidth = 3; ctx.stroke();
    // 装甲板
    ctx.fillStyle = '#4a4640';
    ctx.beginPath(); ctx.moveTo(-110, -150 + by); ctx.lineTo(-60, -176 + by); ctx.lineTo(-50, -110 + by); ctx.lineTo(-105, -96 + by); ctx.fill();
    ctx.fillStyle = '#403c37';
    ctx.beginPath(); ctx.moveTo(40, -190 + by); ctx.lineTo(100, -160 + by); ctx.lineTo(96, -100 + by); ctx.lineTo(50, -94 + by); ctx.fill();
    ctx.fillStyle = '#8a8478';
    for (const [rx, ry] of [[-100, -140], [-66, -160], [-58, -112], [-98, -104], [48, -180], [92, -150], [88, -108], [56, -102], [-20, -200], [20, -196]]) { ctx.beginPath(); ctx.arc(rx, ry + by, 2.5, 0, 7); ctx.fill(); }
    // 锈迹 / 苔藓
    ctx.fillStyle = 'rgba(138,82,52,0.55)'; ctx.fillRect(-90, -90 + by, 30, 8); ctx.fillRect(70, -120 + by, 14, 20);
    ctx.fillStyle = '#4b6b33'; ctx.fillRect(-60, -210 + by, 40, 4); ctx.fillRect(30, -202 + by, 26, 3);
    // 防弹玻璃舱 + 核心
    const pulse = 0.6 + 0.4 * Math.sin(t * (this.phase === 3 ? 10 : 4));
    ctx.save();
    ctx.beginPath(); ctx.rect(-40, -190 + by, 70, 80); ctx.clip();
    ctx.fillStyle = '#1e1c1a'; ctx.fillRect(-40, -190 + by, 70, 80);
    ctx.globalCompositeOperation = 'lighter';
    const cg = ctx.createRadialGradient(-5, -150 + by, 2, -5, -150 + by, 38);
    const coreCol = this.state === 'stunned' ? '120,230,255' : '255,140,50';
    cg.addColorStop(0, `rgba(${coreCol},${0.9 * pulse})`); cg.addColorStop(1, `rgba(${coreCol},0)`);
    ctx.fillStyle = cg; ctx.fillRect(-45, -195 + by, 80, 90);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#6a4a26'; ctx.fillRect(-20, -120 + by, 30, 10);
    ctx.restore();
    ctx.fillStyle = 'rgba(160,220,235,0.18)'; ctx.fillRect(-40, -190 + by, 70, 80);
    ctx.strokeStyle = '#8fb8c0'; ctx.lineWidth = 3; ctx.strokeRect(-40, -190 + by, 70, 80);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-32, -120 + by); ctx.lineTo(-10, -184 + by); ctx.moveTo(-22, -118 + by); ctx.lineTo(-4, -168 + by); ctx.stroke();
    if (this.hp <= 8) { ctx.strokeStyle = 'rgba(240,250,255,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10, -190 + by); ctx.lineTo(0, -160 + by); ctx.lineTo(16, -140 + by); ctx.lineTo(4, -112 + by); ctx.stroke(); }
    // 侧盾
    ctx.fillStyle = '#6a5438'; ctx.beginPath(); ctx.arc(-85, -128 + by, 26, 0, 7); ctx.fill();
    ctx.strokeStyle = '#b09050'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#b09050'; ctx.beginPath(); ctx.arc(-85, -128 + by, 6, 0, 7); ctx.fill();
    ctx.strokeStyle = '#8a6a36'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-85, -154 + by); ctx.lineTo(-85, -102 + by); ctx.moveTo(-111, -128 + by); ctx.lineTo(-59, -128 + by); ctx.stroke();
    // 火枪管
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(40, -86 + by, 80, 5); ctx.fillStyle = '#5a3a20'; ctx.fillRect(30, -88 + by, 22, 9);
    // 三阶段：裂缝发光 + 冒烟
    if (this.phase === 3 && this.active) {
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,120,40,${0.5 + 0.4 * Math.sin(t * 12)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-100, -170 + by); ctx.lineTo(-80, -150 + by); ctx.lineTo(-90, -120 + by); ctx.moveTo(60, -150 + by); ctx.lineTo(80, -130 + by); ctx.lineTo(70, -110 + by); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      if (Math.random() < 0.3) g.particles.add({ x: this.x + rand(-80, 80), y: this.y - 200, vx: rand(-20, 20), vy: rand(-80, -40), life: 1.2, size: 6, grow: 14, color: 'rgba(60,60,60,0.45)', shape: 'glow' });
    }
    // 腿：近侧（亮）
    this.drawLeg(ctx, 70, -85 + by, Math.PI, false, air);
    this.drawLeg(ctx, -75, -85 + by, 0, false, air);

    // 头与颈
    const hx = 0, hy = -this.lift * 24 + this.headDrop * 108 + by;
    ctx.strokeStyle = '#3a3733'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(95, -150 + by); ctx.lineTo(118 + hx, -158 + hy); ctx.stroke();
    ctx.strokeStyle = '#5a544a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(95, -144 + by); ctx.lineTo(118, -150 + hy); ctx.stroke();
    ctx.save(); ctx.translate(135, -160 + hy); ctx.rotate(this.headDrop * 0.35 - this.lift * 0.1);
    ctx.fillStyle = '#57534b';
    ctx.beginPath(); ctx.moveTo(-35, -32); ctx.lineTo(25, -30); ctx.lineTo(38, -2); ctx.lineTo(26, 28); ctx.lineTo(-30, 30); ctx.lineTo(-40, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1a1917'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#6e6a60'; ctx.fillRect(-34, -30, 58, 6);
    // 头冠尖刺（古董刀刃）
    ctx.fillStyle = '#b0b6ba';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-28 + i * 14, -30); ctx.lineTo(-24 + i * 14, -46 - (i % 2) * 8); ctx.lineTo(-18 + i * 14, -30); ctx.fill(); }
    // 面罩缝
    ctx.fillStyle = '#111'; ctx.fillRect(-26, -6, 60, 10);
    // 下颚齿轮牙
    ctx.fillStyle = '#8a8478';
    for (let i = 0; i < 6; i++) ctx.fillRect(-22 + i * 9, 18, 5, 8 + (i % 2) * 3);
    // 眼
    const aiming = this.state === 'aim' || this.state === 'fire';
    const er = aiming ? 7 + (this.state === 'aim' ? this.t * 6 : 6) : 6;
    const ecol = this.state === 'stunned' || this.state === 'dying' ? '#355' : '#f22';
    ctx.fillStyle = ecol; ctx.beginPath(); ctx.arc(5, -1, Math.min(er, 12), 0, 7); ctx.fill();
    if (ecol === '#f22') {
      ctx.globalCompositeOperation = 'lighter';
      const eg = ctx.createRadialGradient(5, -1, 1, 5, -1, 30 + (aiming ? 20 : 0));
      eg.addColorStop(0, 'rgba(255,60,40,0.8)'); eg.addColorStop(1, 'rgba(255,40,20,0)');
      ctx.fillStyle = eg; ctx.fillRect(-50, -55, 110, 110);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#fff'; ctx.fillRect(3, -3, 3, 3);
    }
    ctx.restore();
    ctx.filter = 'none';
    // 眩晕电弧
    if (this.state === 'stunned') {
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(150,240,255,0.9)'; ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath(); let px = rand(-110, 110), py = rand(-200, -80) + by; ctx.moveTo(px, py);
        for (let s = 0; s < 5; s++) { px += rand(-25, 25); py += rand(-20, 20); ctx.lineTo(px, py); }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ffd070';
      for (let i = 0; i < 4; i++) { const a = t * 4 + i * 1.57; ctx.fillRect(135 + Math.cos(a) * 30 - 2, -205 + hy + Math.sin(a) * 6, 4, 4); }
    }
    ctx.restore();

    // 激光
    if (this.state === 'aim') {
      const e = this.eye(), a = this.worldAngle();
      ctx.strokeStyle = `rgba(255,50,40,${0.3 + 0.4 * ((t * 20) % 2 < 1 ? 1 : 0)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(a) * 1200, e.y + Math.sin(a) * 1200); ctx.stroke();
    }
    if (this.beam) {
      const b = this.beam, w = 1 + Math.random() * 0.3;
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,40,30,0.25)'; ctx.lineWidth = 26 * w; ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,90,60,0.8)'; ctx.lineWidth = 10 * w; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,230,1)'; ctx.lineWidth = 3; ctx.stroke();
      const hg = ctx.createRadialGradient(b.x2, b.y2, 2, b.x2, b.y2, 36); hg.addColorStop(0, 'rgba(255,200,150,0.9)'); hg.addColorStop(1, 'rgba(255,60,30,0)');
      ctx.fillStyle = hg; ctx.fillRect(b.x2 - 36, b.y2 - 36, 72, 72);
      ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt';
    }
  }
  drawSword(ctx, x, y, rot, len) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = '#b0b6ba'; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(0, -len); ctx.lineTo(3, 0); ctx.fill();
    ctx.fillStyle = '#8a6a36'; ctx.fillRect(-9, 0, 18, 4); ctx.fillStyle = '#4a3218'; ctx.fillRect(-2, 4, 4, 10);
    ctx.restore();
  }
  drawLeg(ctx, hipX, hipY, off, far, air) {
    let fx = hipX, fy = 0;
    if (air) { fx = hipX + (hipX > 0 ? 20 : -20); fy = hipY + 80; }
    else if (this.state === 'charge') { fx = hipX + Math.sin(this.walk + off) * 30; fy = -Math.max(0, Math.cos(this.walk + off)) * 18; }
    else fx = hipX + (hipX > 0 ? 10 : -10);
    const mx = (hipX + fx) / 2, my = (hipY + fy) / 2;
    const kx = mx + (hipX > 0 ? -24 : 24), ky = my - 6;
    const dark = far ? 0.55 : 1;
    const col = (r, g, b) => `rgb(${Math.round(r * dark)},${Math.round(g * dark)},${Math.round(b * dark)})`;
    ctx.lineCap = 'round';
    ctx.strokeStyle = col(58, 55, 51); ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kx, ky); ctx.stroke();
    ctx.strokeStyle = col(74, 65, 54); ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(fx, fy - 8); ctx.stroke();
    ctx.fillStyle = col(110, 104, 92); ctx.beginPath(); ctx.arc(kx, ky, 9, 0, 7); ctx.fill();
    ctx.fillStyle = col(160, 150, 120); ctx.beginPath(); ctx.arc(kx, ky, 3, 0, 7); ctx.fill();
    // 足：剑刃爪
    ctx.fillStyle = col(176, 182, 186);
    ctx.beginPath(); ctx.moveTo(fx - 14, fy - 8); ctx.lineTo(fx + 18, fy - 6); ctx.lineTo(fx + 26, fy); ctx.lineTo(fx - 16, fy); ctx.fill();
    ctx.fillStyle = col(90, 70, 40); ctx.fillRect(fx - 6, fy - 14, 12, 7);
    ctx.lineCap = 'butt';
  }
}
