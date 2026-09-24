'use strict';
// ============================================================
//  主角：LZ-01 “拉撒路” 初代军用外骨骼
// ============================================================
const PL = {
  RUN: 250, ACC_G: 2600, DEC_G: 3000, ACC_A: 1700, DEC_A: 900,
  JUMP: 740, COYOTE: 0.1, BUFFER: 0.13,
  DASH_SPEED: 680, DASH_TIME: 0.15, DASH_CD: 0.28,
  SPRING: 1150,
  // 武器节奏：active = 判定持续时间，cd = 两次挥砍的间隔，swing = 刀光动画时长
  SABRE: { active: 0.09, cd: 0.17, swing: 0.12 },   // 仪仗军刀：轻快
  RELIC: { active: 0.11, cd: 0.24, swing: 0.16 },   // 巨像残刃：更重，但攻击距离更长、可破甲
};

class Player {
  constructor(x, y) { this.w = 20; this.h = 28; this.reset(x, y); }
  reset(x, y) {
    Object.assign(this, {
      x, y, vx: 0, vy: 0, onGround: false, ground: null, groundOneWay: false,
      coyote: 0, jumpBuf: 0, jumping: false, dashT: 0, dashCd: 0, canDash: true, dashLock: 0,
      dashDir: { x: 1, y: 0 }, facing: 1, dead: false, dropT: 0, run: 0, sx: 1, sy: 1,
      spawnT: 0, trail: [], trailT: 0, prevBottom: y + 28, airT: 0,
      atkT: 0, atkCd: 0, atkDown: false, atkHits: new Set(), atkSwing: 0,
    });
  }
  hurt() { return { x: this.x + 4, y: this.y + 6, w: this.w - 8, h: this.h - 8 }; }
  attackBox() {
    if (this.atkT <= 0) return null;
    const R = Inventory.ability('relicBlade') ? 60 : 46; // 巨像残刃攻击距离更长
    if (this.atkDown) return { x: this.x - 12, y: this.y + this.h - 6, w: this.w + 24, h: R - 8 };
    return { x: this.facing > 0 ? this.x + this.w - 6 : this.x + 6 - R, y: this.y - 10, w: R, h: this.h + 16 };
  }
  trailColor(t, i) {
    const tr = Inventory.equipped('trail');
    return tr.rainbow ? `hsl(${(t * 400 + i * 40) % 360},100%,65%)` : tr.color;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dt, g) {
    const I = Input, W = g.world;
    this.prevBottom = this.y + this.h;
    if (this.spawnT > 0) this.spawnT -= dt;
    if (this.dashLock > 0) this.dashLock -= dt;
    this.dashCd -= dt; this.dropT -= dt;
    const mx = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0);
    if (I.hit('jump')) this.jumpBuf = PL.BUFFER; else this.jumpBuf -= dt;
    if (this.onGround) { this.coyote = PL.COYOTE; if (this.dashT <= 0) this.canDash = true; } else this.coyote -= dt;

    // ---- 冲刺 ----
    if (I.hit('dash')) {
      if (this.dashLock > 0) { Sound.sfx.denied(); g.hudDeny = 0.6; Input.rumble(0.3, 0, 120); }
      else if (this.canDash && this.dashCd <= 0) {
        let dx = mx, dy = (I.down('down') ? 1 : 0) - (I.down('up') ? 1 : 0);
        if (this.onGround && dy > 0) dy = 0;
        if (!dx && !dy) dx = this.facing;
        const l = Math.hypot(dx, dy);
        this.dashDir = { x: dx / l, y: dy / l };
        this.dashT = PL.DASH_TIME; this.canDash = false; this.dashCd = PL.DASH_CD; this.jumping = false;
        if (dx) this.facing = Math.sign(dx);
        Sound.sfx.dash(); g.shake(2); g.freeze(0.03); Input.rumble(0.05, 0.35, 70);
        g.particles.burst(this.cx, this.cy, 10, { color: [this.trailColor(g.t, 0), this.trailColor(g.t, 3), '#fff'], smin: 60, smax: 200, lmin: 0.15, lmax: 0.35, szmin: 2, szmax: 3, add: true });
      }
    }

    // ---- 攻击：巨像残刃（通关第一章后解锁，账号绑定） ----
    this.atkCd -= dt; if (this.atkT > 0) this.atkT -= dt;
    if (I.hit('attack')) this.atkBuf = 0.12; else this.atkBuf = (this.atkBuf || 0) - dt; // 攻击输入缓冲：冷却快结束时按下也会出刀
    if (this.atkBuf > 0 && Inventory.canAttack() && this.atkCd <= 0) {
      const W = Inventory.ability('relicBlade') ? PL.RELIC : PL.SABRE;
      this.atkBuf = 0;
      this.atkDown = !this.onGround && I.down('down');
      this.atkT = W.active; this.atkCd = W.cd; this.atkCdMax = W.cd; this.atkHits = new Set(); this.atkSwing = W.swing; this.atkSwingMax = W.swing;
      Sound.sfx.slash(); Input.rumble(0, 0.2, 50);
    }
    this.atkSwing = Math.max(0, this.atkSwing - dt);

    if (this.dashT > 0) {
      this.dashT -= dt;
      this.vx = this.dashDir.x * PL.DASH_SPEED; this.vy = this.dashDir.y * PL.DASH_SPEED;
      const grounded = this.dashDir.y === 0 && (W.supportAt(this.x + 2, this.y + this.h + 1) || W.supportAt(this.x + this.w - 2, this.y + this.h + 1));
      if (grounded) this.coyote = PL.COYOTE;
      this.trailT -= dt;
      if (this.trailT <= 0) {
        this.trailT = 0.018; this.trail.push({ x: this.x, y: this.y, f: this.facing, t: 0, c: this.trailColor(g.t, this.trail.length) });
        if (Inventory.equipped('trail').glyph) g.particles.add({ x: this.cx + rand(-8, 8), y: this.cy + rand(-10, 10), vx: rand(-20, 20), vy: rand(20, 60), life: 0.6, size: 3, color: '#2f9', add: true });
      }
      // 地面冲刺可以接跳跃（长跳）
      if (this.jumpBuf > 0 && this.coyote > 0) {
        this.dashT = 0; this.jumpBuf = 0; this.coyote = 0; this.vx *= 0.75;
        this.vy = -PL.JUMP; this.jumping = true; Sound.sfx.jump(); this.sx = 0.75; this.sy = 1.3;
      } else if (this.dashT <= 0) {
        this.vx *= 0.6; this.vy = this.vy < 0 ? this.vy * 0.45 : this.vy * 0.5;
      }
    } else {
      const target = mx * PL.RUN;
      let acc = this.onGround ? (mx ? PL.ACC_G : PL.DEC_G) : (mx ? PL.ACC_A : PL.DEC_A);
      // 空中顺着方向时保留冲刺带来的额外速度（手感更宽容）
      if (!this.onGround && mx && Math.sign(this.vx) === mx && Math.abs(this.vx) > PL.RUN) acc = 380;
      this.vx = approach(this.vx, target, acc * dt);
      if (mx) this.facing = mx;
      let grav = GRAV;
      if (this.jumping && I.down('jump') && Math.abs(this.vy) < 100) grav *= 0.5;
      this.vy = Math.min(this.vy + grav * dt, MAXFALL);
      if (this.jumping && !I.down('jump') && this.vy < -220) { this.vy *= 0.48; this.jumping = false; }
      if (this.vy >= 0) this.jumping = false;
      if (this.jumpBuf > 0 && this.coyote > 0) {
        this.jumpBuf = 0; this.coyote = 0;
        if (this.onGround && this.groundOneWay && I.down('down')) { this.dropT = 0.22; this.onGround = false; }
        else {
          this.vy = -PL.JUMP; this.jumping = true; this.onGround = false; this.sx = 0.75; this.sy = 1.3;
          Sound.sfx.jump();
          g.particles.burst(this.cx, this.y + this.h, 6, { color: '#8a8070', smin: 20, smax: 80, angle: -Math.PI / 2, spread: 1.3, lmin: 0.2, lmax: 0.4, grav: 200 });
        }
      }
    }

    // ---- 位移与碰撞 ----
    const hx = W.moveX(this, this.vx * dt);
    if (hx) this.vx = 0;
    const wasGround = this.onGround;
    const ry = W.moveY(this, this.vy * dt, this.dropT > 0);
    this.onGround = false; this.ground = null; this.groundOneWay = false;
    if (ry) {
      if (this.vy >= 0) {
        this.onGround = true; this.ground = ry.solid || null; this.groundOneWay = !!ry.oneWay;
        if (!wasGround && (this.airT > 0.2 || this.vy > 380)) {
          Sound.sfx.land(); this.sx = 1.3; this.sy = 0.75;
          g.particles.burst(this.cx, this.y + this.h, 8, { color: ['#8a8070', '#6a6258'], smin: 30, smax: 110, angle: -Math.PI / 2, spread: 1.5, lmin: 0.2, lmax: 0.45, grav: 300 });
        }
        if (this.dashT <= 0) this.vy = 0;
        if (ry.solid && ry.solid.owner && ry.solid.owner.onStand) ry.solid.owner.onStand(g);
      } else {
        this.vy = 0;
        if (this.dashT > 0 && this.dashDir.y < 0) this.dashT = 0;
      }
    }
    this.airT = this.onGround ? 0 : this.airT + dt;

    // ---- 动画 ----
    this.sx = approach(this.sx, 1, dt * 3.5); this.sy = approach(this.sy, 1, dt * 3.5);
    if (this.onGround && Math.abs(this.vx) > 20) this.run += dt * Math.abs(this.vx) * 0.055;
    for (const t of this.trail) t.t += dt;
    this.trail = this.trail.filter((t) => t.t < 0.22);
  }

  draw(ctx, g) {
    for (const t of this.trail) {
      ctx.globalAlpha = (1 - t.t / 0.22) * 0.45;
      this.drawBody(ctx, t.x, t.y, t.f, 1, 1, g, t.c || '#5ff');
    }
    ctx.globalAlpha = 1;
    if (this.spawnT > 0) {
      // 重构：逐行扫描出现
      const k = 1 - this.spawnT / 0.45;
      ctx.save(); ctx.beginPath(); ctx.rect(this.x - 20, this.y + this.h - (this.h + 14) * k, this.w + 40, (this.h + 14) * k + 2); ctx.clip();
      this.drawBody(ctx, this.x, this.y, this.facing, this.sx, this.sy, g);
      ctx.restore();
      ctx.fillStyle = 'rgba(120,255,255,0.8)'; ctx.fillRect(this.x - 8, this.y + this.h - (this.h + 14) * k, this.w + 16, 2);
      return;
    }
    this.drawBody(ctx, this.x, this.y, this.facing, this.sx, this.sy, g);
    if (this.atkSwing > 0) this.drawSlash(ctx, g);
  }

  drawSlash(ctx, g) {
    const sk = Inventory.equipped('blade'), k = 1 - this.atkSwing / (this.atkSwingMax || 0.12);
    const cx = this.cx, cy = this.cy;
    ctx.save(); ctx.translate(cx, cy);
    if (this.atkDown) ctx.rotate(Math.PI / 2); else ctx.scale(this.facing, 1);
    const a0 = -1.3 + k * 0.4, a1 = a0 + 2.4 * Math.min(1, k * 2.2);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(${sk.arc},${0.75 * (1 - k)})`; ctx.lineWidth = 10; ctx.lineCap = 'round';
    const RR = Inventory.ability('relicBlade') ? 42 : 30;
    ctx.beginPath(); ctx.arc(6, 0, RR, a0, a1); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - k)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(6, 0, RR + 4, a0, a1); ctx.stroke();
    if (sk.electric) {
      ctx.strokeStyle = `rgba(160,240,255,${1 - k})`; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i <= 8; i++) { const a = lerp(a0, a1, i / 8), r = 30 + rand(-6, 6); i ? ctx.lineTo(6 + Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(6 + Math.cos(a) * r, Math.sin(a) * r); }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    // 刀身
    const ba = a1;
    ctx.save(); ctx.translate(6, 0); ctx.rotate(ba);
    ctx.fillStyle = sk.hilt; ctx.fillRect(4, -2, 8, 4); ctx.fillRect(11, -5, 2, 10);
    ctx.fillStyle = sk.blade; ctx.beginPath(); ctx.moveTo(13, -2.5); ctx.lineTo(36, -1); ctx.lineTo(40, 0); ctx.lineTo(36, 1.5); ctx.lineTo(13, 2.5); ctx.fill();
    ctx.fillStyle = sk.edge; ctx.fillRect(14, -2.5, 22, 1);
    ctx.restore();
    ctx.restore(); ctx.lineCap = 'butt';
  }

  drawBody(ctx, x, y, facing, sx, sy, g, tint) {
    const t = g.t;
    ctx.save();
    ctx.translate(Math.round(x + this.w / 2), Math.round(y + this.h));
    ctx.scale(facing * sx, sy);
    const air = !this.onGround;
    const moving = !air && Math.abs(this.vx) > 20;
    const ph = this.run;
    const paint = tint ? null : Inventory.equipped('paint');
    const c = tint ? { a: tint, b: tint, d: tint, e: tint, k: tint, pack: tint, stripe: tint, visor: tint } : paint.pal;
    if (paint && paint.glitch && Math.random() < 0.04) ctx.translate(rand(-3, 3), 0);
    // 背上的残刃（已解锁时）
    if (!tint && this.hasBlade !== false && Inventory.canAttack() && !(this.atkSwing > 0)) {
      const sk = Inventory.equipped('blade');
      ctx.lineCap = 'round';
      ctx.strokeStyle = sk.blade; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-16, -6); ctx.lineTo(-8, -28); ctx.stroke();
      ctx.strokeStyle = sk.hilt; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-8, -28); ctx.lineTo(-5, -35); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-11, -29); ctx.lineTo(-5, -26); ctx.stroke();
      ctx.lineCap = 'butt';
    }
    // 背包 + 天线
    ctx.fillStyle = c.pack; ctx.fillRect(-13, -25, 6, 13);
    ctx.fillStyle = tint || '#8a5234'; ctx.fillRect(-12, -18, 3, 3);
    ctx.strokeStyle = tint || '#333'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-10, -25); ctx.lineTo(-13, -36); ctx.stroke();
    if (!tint) {
      const radio = g.radio && g.radio.cur;
      ctx.fillStyle = radio ? ((t * 8) % 2 < 1 ? '#6f6' : '#262') : ((t * 1.5) % 2 < 0.2 ? '#f55' : '#522');
      ctx.fillRect(-14.5, -38, 3, 3);
    }
    // 腿
    let l1x = -6, l2x = 1, l1y = 0, l2y = 0;
    if (moving) { l1x += Math.sin(ph) * 4; l2x -= Math.sin(ph) * 4; l1y = -Math.max(0, Math.cos(ph)) * 3; l2y = -Math.max(0, -Math.cos(ph)) * 3; }
    else if (air) { l1x = -7; l2x = 3; l1y = -3; l2y = -1; }
    ctx.fillStyle = c.a; ctx.fillRect(l1x, -11 + l1y, 5, 10); ctx.fillRect(l2x, -11 + l2y, 5, 10);
    ctx.fillStyle = c.k; ctx.fillRect(l1x, -8 + l1y, 5, 3); ctx.fillRect(l2x, -8 + l2y, 5, 3);
    ctx.fillStyle = c.d; ctx.fillRect(l1x - 1, -2 + l1y, 7, 3); ctx.fillRect(l2x - 1, -2 + l2y, 8, 3);
    // 躯干
    const bob = moving ? Math.abs(Math.sin(ph)) * -1 : 0;
    ctx.translate(0, bob);
    ctx.fillStyle = c.a; ctx.fillRect(-9, -23, 18, 13);
    ctx.fillStyle = c.b; ctx.fillRect(-9, -23, 18, 2);
    if (!tint) {
      ctx.fillStyle = c.stripe; ctx.fillRect(-9, -12, 18, 2);
      ctx.fillStyle = '#222'; for (let i = -8; i < 9; i += 4) ctx.fillRect(i, -12, 2, 2);
      ctx.fillStyle = '#8a5234'; ctx.fillRect(4, -20, 3, 2); ctx.fillRect(-6, -15, 2, 2);
      ctx.fillStyle = '#3a382a'; ctx.fillRect(-8, -21, 1, 1); ctx.fillRect(7, -21, 1, 1);
    }
    // 核心
    let core = c.visor;
    if (this.dashLock > 0) core = (t * 10) % 2 < 1 ? '#f33' : '#700';
    else if (!this.canDash) core = '#555';
    if (!tint) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = core === '#555' ? 'rgba(0,0,0,0)' : (this.dashLock > 0 ? 'rgba(255,50,50,0.35)' : 'rgba(80,255,255,0.3)');
      ctx.beginPath(); ctx.arc(1, -17, 6 + Math.sin(t * 5), 0, 7); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = tint || core; ctx.fillRect(-1, -19, 4, 4);
    // 肩甲 + 手臂
    const sw = moving ? Math.sin(ph) * 3 : air ? -2 : 0;
    ctx.fillStyle = c.b; ctx.fillRect(-3, -24, 9, 5);
    ctx.fillStyle = c.a; ctx.fillRect(1 + sw, -19, 4, 8);
    ctx.fillStyle = c.d; ctx.fillRect(1 + sw, -12, 4, 3);
    // 头
    ctx.fillStyle = c.e; ctx.fillRect(-6, -31, 13, 9);
    ctx.fillStyle = c.b; ctx.fillRect(-6, -31, 13, 2);
    const visor = tint || (this.dashLock > 0 ? '#f44' : c.visor);
    ctx.fillStyle = visor; ctx.fillRect(1, -28, 7, 3);
    if (!tint) {
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = this.dashLock > 0 ? 'rgba(255,60,60,0.35)' : 'rgba(100,255,255,0.3)';
      ctx.fillRect(0, -30, 11, 7); ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }
}
