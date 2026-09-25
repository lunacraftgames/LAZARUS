'use strict';
// ============================================================
//  武器系统：切换武器、远程弹道、弹反、重劈冲击波
//  · 仪仗军刀：弹反（砍中炸弹 / 炮弹 / 粘液团 → 反弹回去击杀敌人）
//  · 巨像残刃：按住蓄力 → 重劈（破盾），地面上放出冲击波
//  · 古董燧发枪：高速子弹，后坐力推动自己
//  · 生物孢子枪：三颗扇形孢子，落地留下孢子云（腐蚀，无视盾牌）
// ============================================================
const WEAPON_INFO = {
  sabre: { name: '仪仗军刀', en: 'SABRE' },
  relicBlade: { name: '巨像残刃', en: 'RELIC' },
  flintlock: { name: '古董燧发枪', en: 'FLINTLOCK' },
  sporeGun: { name: '生物孢子枪', en: 'SPORE' },
};

// ---------------- 玩家发出的弹道 ----------------
class PShot {
  // type: bullet | spore | reflect | wave
  constructor(o) { Object.assign(this, { t: 0, dead: false, r: 4, grav: 0, life: 1, pierce: false, hit: new Set() }, o); }
  get box() { return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }; }
  update(dt, g) {
    this.t += dt; if (this.t > this.life) { this.expire(g); return; }
    const W = g.world;
    if (this.type === 'wave') {
      // 冲击波：贴着地面走，撞墙或脚下没地面就消失
      this.x += this.vx * dt;
      if (W.pointSolid(this.x + Math.sign(this.vx) * 10, this.y - 12) || !W.supportAt(this.x, this.y + 4)) { this.dead = true; this.burst(g, 8); }
      if (Math.random() < 0.8) g.particles.add({ x: this.x + rand(-8, 8), y: this.y - 2, vx: rand(-40, 40), vy: rand(-200, -60), life: 0.4, size: rand(2, 4), color: pick(['#ffd070', '#c9a030', '#8e897e']), grav: 700 });
      return;
    }
    this.vy += this.grav * dt;
    const steps = Math.ceil((Math.abs(this.vx) + Math.abs(this.vy)) * dt / 6) || 1;
    for (let i = 0; i < steps; i++) {
      this.x += this.vx * dt / steps; this.y += this.vy * dt / steps;
      if (this.type === 'spore' && W.pointWater(this.x, this.y)) { this.dead = true; return; }
      if (W.pointSolid(this.x, this.y) || this.y > W.ph || this.x < 0 || this.x > W.pw) { this.impact(g); return; }
    }
    if (this.type === 'bullet' && Math.random() < 0.5) g.particles.add({ x: this.x, y: this.y, vx: 0, vy: 0, life: 0.18, size: 1.5, color: '#fff3c0', add: true });
    if (this.type === 'spore' && Math.random() < 0.4) g.particles.add({ x: this.x, y: this.y, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.35, size: 2, color: '#9fe8c0', add: true });
  }
  burst(g, n) { g.particles.burst(this.x, this.y, n, { color: this.colors || ['#ffd070', '#fff'], shape: 'spark', smin: 60, smax: 220, lmin: 0.1, lmax: 0.3, add: true }); }
  impact(g) {
    this.dead = true;
    if (this.type === 'spore') { g.pshots.push(new SporeCloud(this.x, this.y)); Sound.sfx.sporeBurst(); return; }
    this.burst(g, 6);
  }
  expire(g) { this.dead = true; if (this.type === 'spore') g.pshots.push(new SporeCloud(this.x, this.y)); }
  // 命中敌人后：子弹 / 孢子 / 反弹物消失，冲击波继续前进
  onHit(g, res) {
    if (this.pierce && res !== 'block' && res !== 'bounced') return;
    this.dead = true;
    if (res === 'block' || res === 'bounced') { Sound.sfx.ricochet(); this.burst(g, 8); }
    if (this.type === 'spore') g.pshots.push(new SporeCloud(this.x, this.y));
  }
  draw(ctx) {
    ctx.globalCompositeOperation = 'lighter';
    if (this.type === 'bullet') {
      const tx = this.x - this.vx * 0.02, ty = this.y - this.vy * 0.02;
      ctx.strokeStyle = 'rgba(255,220,140,0.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(this.x, this.y); ctx.stroke();
      ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(this.x, this.y, 2.5, 0, 7); ctx.fill();
    } else if (this.type === 'spore') {
      const gr = ctx.createRadialGradient(this.x, this.y, 1, this.x, this.y, 9); gr.addColorStop(0, 'rgba(210,255,220,0.95)'); gr.addColorStop(1, 'rgba(90,220,150,0)');
      ctx.fillStyle = gr; ctx.fillRect(this.x - 9, this.y - 9, 18, 18);
      ctx.fillStyle = '#c86ab0'; ctx.fillRect(this.x - 1, this.y - 1, 2, 2);
    } else if (this.type === 'reflect') {
      const gr = ctx.createRadialGradient(this.x, this.y, 1, this.x, this.y, 16); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.4, this.glow || 'rgba(120,220,255,0.7)'); gr.addColorStop(1, 'rgba(120,220,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(this.x - 16, this.y - 16, 32, 32);
    } else if (this.type === 'wave') {
      const a = 1 - this.t / this.life, d = Math.sign(this.vx);
      ctx.fillStyle = `rgba(255,210,120,${0.7 * a})`;
      ctx.beginPath(); ctx.moveTo(this.x - d * 18, this.y); ctx.quadraticCurveTo(this.x, this.y - 34, this.x + d * 10, this.y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(255,255,230,${a})`; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
// 孢子云：停留约 1.5 秒，碰到的敌人会被腐蚀（无视盾牌）
class SporeCloud {
  constructor(x, y) { this.x = x; this.y = y; this.r = 26; this.t = 0; this.life = 1.5; this.dead = false; this.type = 'cloud'; this.pierce = true; this.hit = new Set(); }
  get box() { return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }; }
  update(dt, g) {
    this.t += dt; if (this.t > this.life) this.dead = true;
    if (Math.random() < 0.5) g.particles.add({ x: this.x + rand(-this.r, this.r), y: this.y + rand(-this.r * 0.6, this.r * 0.4), vx: rand(-10, 10), vy: rand(-30, -8), life: 0.7, size: rand(3, 6), grow: 6, color: 'rgba(140,230,170,0.35)', shape: 'glow' });
  }
  onHit() {}
  draw(ctx) {
    const a = Math.min(1, (this.life - this.t) * 2) * 0.45;
    const gr = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, this.r + 6);
    gr.addColorStop(0, `rgba(170,255,190,${a})`); gr.addColorStop(0.6, `rgba(90,200,140,${a * 0.6})`); gr.addColorStop(1, 'rgba(60,160,110,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 6, 0, 7); ctx.fill();
  }
}

Object.assign(Game, {
  // 切换到下一把已拥有的武器
  swapWeapon() {
    const p = this.player, k = Inventory.cycleWeapon(1);
    if (!k) { if (Inventory.owned().length === 1) { Sound.sfx.denied(); this.toastHint('目前只有一把武器'); } return; }
    p.atkT = 0; p.atkSwing = 0; p.chargeT = -1; p.atkHeavy = false; p.atkCd = Math.min(p.atkCd, 0.12);
    Sound.sfx.swap(); Input.rumble(0, 0.15, 40);
    this.weaponPop = { k, t: 0 };
  },
  // 远程武器开火
  fireWeapon(p, k, dir) {
    const f = p.facing, sy = p.y + p.h - 15;
    const gd = p.gd || 1; // 重力反转时「上 / 下」跟着翻转
    const base = dir === 'up' ? { x: 0, y: -gd } : dir === 'down' ? { x: 0, y: gd } : { x: f, y: 0 };
    const mx = p.cx + base.x * 16, my = (dir === 'side' ? sy : p.cy) + base.y * 16;
    if (k === 'flintlock') {
      this.pshots.push(new PShot({ type: 'bullet', x: mx, y: my, vx: base.x * 1150, vy: base.y * 1150, r: 4, life: 0.6, kind: 'shot' }));
      Sound.sfx.gunshot(); this.shake(3); Input.rumble(0.3, 0.3, 70);
      // 后坐力：朝反方向推自己
      if (dir === 'side') p.vx -= f * (p.onGround ? 230 : 420);
      else if (dir === 'down') { p.vy = gd > 0 ? Math.min(p.vy, -520) : Math.max(p.vy, 520); p.jumping = false; }
      else if (dir === 'up' && !p.onGround) p.vy = gd > 0 ? Math.max(p.vy, 160) : Math.min(p.vy, -160);
      this.particles.burst(mx, my, 8, { color: ['#fff3c0', '#ffb040', '#fff'], shape: 'spark', smin: 60, smax: 260, lmin: 0.08, lmax: 0.2, add: true });
      this.particles.burst(mx, my, 5, { color: ['rgba(150,150,150,0.5)'], shape: 'glow', smin: 10, smax: 50, lmin: 0.4, lmax: 0.8, grow: 10, szmin: 4, szmax: 6 });
      setTimeout(() => { if (Inventory.weapon() === 'flintlock') Sound.sfx.reload(); }, 820);
    } else if (k === 'sporeGun') {
      const a0 = Math.atan2(base.y, base.x);
      for (const da of [-0.16, 0, 0.16]) {
        const a = a0 + da, sp = 560;
        this.pshots.push(new PShot({ type: 'spore', x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (dir === 'side' ? 80 : 0), grav: 650, r: 5, life: 1.1, kind: 'spore', colors: ['#9fe8c0', '#c86ab0'] }));
      }
      Sound.sfx.sporeShot(); Input.rumble(0.05, 0.2, 50);
      this.particles.burst(mx, my, 6, { color: ['#9fe8c0', '#dfffe8'], smin: 40, smax: 160, lmin: 0.15, lmax: 0.35, add: true });
    }
  },
  // 巨像残刃重劈
  heavySlash(p) {
    Sound.sfx.heavy(); this.shake(7); this.freeze(0.05); Input.rumble(0.6, 0.6, 160);
    this.particles.burst(p.cx + p.facing * 40, p.cy, 16, { color: ['#ffd070', '#fff', '#c9a030'], shape: 'spark', smin: 120, smax: 380, lmin: 0.15, lmax: 0.35, add: true });
    if (p.onGround) this.pshots.push(new PShot({ type: 'wave', x: p.cx + p.facing * 30, y: p.y + p.h, vx: p.facing * 520, r: 14, life: 0.6, kind: 'heavy', pierce: true }));
  },
  // 仪仗军刀弹反：把敌人的抛射物打回去
  parry(pr, p) {
    pr.dead = true;
    let vx = p.atkDown ? 0 : p.facing * 640, vy = p.atkDown ? 640 : -60;
    // 自动瞄准前方最近的敌人（下劈弹反则直接砸向正下方）
    if (!p.atkDown) {
      let best = null, bd = 460;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const ex = e.x + e.w / 2, ey = e.y + e.h / 2, dx = ex - pr.x, d = Math.hypot(dx, ey - pr.y);
        if (dx * p.facing > 0 && d < bd && Math.abs(ey - pr.y) < d * 0.8) { bd = d; best = { ex, ey }; }
      }
      if (best) { const a = Math.atan2(best.ey - pr.y, best.ex - pr.x); vx = Math.cos(a) * 640; vy = Math.sin(a) * 640; }
    }
    const slime = typeof SlimeBlob !== 'undefined' && pr instanceof SlimeBlob;
    this.pshots.push(new PShot({ type: 'reflect', x: pr.x, y: pr.y, vx, vy, r: 9, life: 0.9, kind: 'shot', glow: slime ? 'rgba(140,255,80,0.8)' : 'rgba(255,170,60,0.8)', colors: slime ? ['#8f4', '#dfb'] : ['#fa4', '#fff'] }));
    Sound.sfx.parry(); this.freeze(0.06); this.shake(4); Input.rumble(0.2, 0.5, 90);
    this.particles.burst(pr.x, pr.y, 14, { color: ['#bff', '#fff', '#ffd070'], shape: 'spark', smin: 100, smax: 320, lmin: 0.15, lmax: 0.3, add: true });
    if (!this.parryHinted) { this.parryHinted = true; this.toastHint('弹反！仪仗军刀可以把炸弹、炮弹、粘液团打回去'); }
  },
  updatePShots(dt) {
    for (const s of this.pshots) s.update(dt, this);
    if (this.state === 'play') {
      for (const s of this.pshots) {
        if (s.dead) continue;
        const b = s.box;
        for (const e of this.enemies) {
          if (!e.alive || s.hit.has(e) || !overlap(b, e)) continue;
          s.hit.add(e);
          const res = this.strike(e, s.kind, { cx: s.x - (s.vx || 0) * 0.05, y: s.y - (s.vy || 0) * 0.05, h: 0 });
          if (res === 'none') continue;
          s.onHit(this, res);
          if (s.dead) break;
        }
        if (!s.dead && this.boss && this.boss.active) this.shotBoss(s);
      }
    }
    this.pshots = this.pshots.filter((s) => !s.dead);
    if (this.weaponPop) { this.weaponPop.t += dt; if (this.weaponPop.t > 1.4) this.weaponPop = null; }
  },
  // 远程攻击打 Boss：巨像1号只会被打断瞄准；繁育者核心暴露时可以打
  shotBoss(s) {
    const B = this.boss, b = s.box;
    if (B.onShot) { B.onShot(s, this); return; } // 第三章起：Boss 自己处理远程攻击
    if (typeof Colossus !== 'undefined' && B instanceof Colossus) {
      if (s.type === 'wave' || s.type === 'cloud') return;
      const e = B.eye();
      if (B.state === 'aim' && !B.flinched && Math.hypot(s.x - e.x, s.y - e.y) < 22) {
        B.flinched = true; B.t = Math.max(0, B.t - 0.4); B.la += rand(-0.3, 0.3);
        s.dead = true; Sound.sfx.clang(); this.shake(3);
        this.particles.burst(e.x, e.y, 12, { color: ['#f64', '#fff'], shape: 'spark', smin: 100, smax: 260, lmin: 0.1, lmax: 0.3, add: true });
        return;
      }
      if (overlap(b, B.body())) { s.dead = true; Sound.sfx.ricochet(); s.burst(this, 6); }
      return;
    }
    if (typeof Incubator !== 'undefined' && B instanceof Incubator) {
      if (s.type === 'wave' || s.type === 'cloud') return;
      if (overlap(b, B.core()) && B.state === 'exposed') { if (B.hurt(1, this)) s.dead = true; }
      else if (overlap(b, B.body())) { s.dead = true; Sound.sfx.ricochet(); s.burst(this, 6); }
    }
  },
  drawPShots(ctx) { for (const s of this.pshots) s.draw(ctx, this); },
  // 切换武器时在主角头顶显示一下武器名
  drawWeaponPop(ctx) {
    const w = this.weaponPop; if (!w || !this.player) return;
    const p = this.player, a = Math.min(1, w.t * 6, (1.4 - w.t) * 3);
    ctx.globalAlpha = Math.max(0, a); ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(p.cx - 48, p.y - 40 - w.t * 8, 96, 18);
    ctx.fillStyle = '#ffd070'; ctx.font = 'bold 12px ' + FONT; ctx.fillText(WEAPON_INFO[w.k].name, p.cx, p.y - 27 - w.t * 8);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  },
});
