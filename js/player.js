'use strict';
// ============================================================
//  主角：LZ-01 “拉撒路” 初代军用外骨骼
// ============================================================
const PL = {
  RUN: 250, ACC_G: 2600, DEC_G: 3000, ACC_A: 1700, DEC_A: 900,
  JUMP: 740, COYOTE: 0.1, BUFFER: 0.13,
  DASH_SPEED: 680, DASH_TIME: 0.15, DASH_CD: 0.28,
  SPRING: 1150,
  // 第二章
  DJUMP: 640,            // 二段跳（推进囊）
  SLIME_T: 3,            // 粘液：持续 3 秒，跳跃高度减半且不能二段跳
  WATER: { GRAV: 780, MAXFALL: 230, RUN: 190, ACC: 650, DEC: 150, SWIM: 420, SWIM_CD: 0.22, EXIT: 660 }, // 高密度培养液：低重力、惯性大
  H: 28, CROUCH_H: 19, CROUCH_RUN: 0.4, // 站立 / 下蹲高度（下蹲降低 1/3 个身位），下蹲移动速度倍率
  CROUCH_ATK: 8,                         // 下蹲时攻击位置降低一半：站立时攻击中心离地约 16px → 下蹲时约 8px
  // 第三章
  LAG: 0.5,              // 掉帧幽灵：输入延迟 0.5 秒
};
// 主角读取的输入动作；死锁时移动 / 跳跃 / 冲刺全部失效
const PL_ACTS = ['left', 'right', 'up', 'down', 'jump', 'dash', 'attack', 'swap'];
const PL_LOCKED = ['left', 'right', 'up', 'down', 'jump', 'dash'];

// 武器：active = 判定持续时间，cd = 两次出手的间隔，swing = 刀光动画时长，reach = 攻击距离，arc = 刀光半径
const WPN = {
  sabre: { melee: true, active: 0.09, cd: 0.17, swing: 0.12, reach: 46, arc: 30 },               // 轻快，可弹反
  relicBlade: { melee: true, active: 0.12, cd: 0.34, swing: 0.2, reach: 64, arc: 44, charge: 0.6 }, // 沉重，破盾，蓄力重劈
  flintlock: { gun: true, cd: 0.95 },                                                             // 一发一装填，有后坐力
  sporeGun: { gun: true, cd: 0.75 },                                                              // 三发扇形孢子
};
const HEAVY = { active: 0.16, cd: 0.45, swing: 0.26, reach: 92, arc: 62 };

class Player {
  constructor(x, y) { this.w = 20; this.h = PL.H; this.reset(x, y); }
  reset(x, y) {
    Object.assign(this, {
      x, y, vx: 0, vy: 0, onGround: false, ground: null, groundOneWay: false,
      coyote: 0, jumpBuf: 0, jumping: false, dashT: 0, dashCd: 0, canDash: true, dashLock: 0,
      dashDir: { x: 1, y: 0 }, facing: 1, dead: false, dropT: 0, run: 0, sx: 1, sy: 1,
      spawnT: 0, trail: [], trailT: 0, prevBottom: y + 28, airT: 0,
      atkT: 0, atkCd: 0, atkDown: false, atkHits: new Set(), atkSwing: 0, chargeT: -1, atkHeavy: false,
      jumpsLeft: 1, slimeT: 0, inWater: false, swimCd: 0,
      lockT: 0, lockImmune: 0, lagT: 0, lagBuf: [], lagOut: null, ctl: {},
      gd: 1, prevTop: y, cubeRot: 0, frozen: false, // 第四章：重力方向（1 正常 / -1 反转）、一键模式、终局冻结
      lookUp: false, lookT: 0, atkUp: false,         // 向上瞄准
      aimDown: false,                                // 空中向下瞄准
      h: PL.H, crouch: false,                        // 下蹲：碰撞箱降低 1/3
    });
  }
  hurt() { const t = this.crouch ? 3 : 6; return { x: this.x + 4, y: this.y + t, w: this.w - 8, h: this.h - t - 2 }; }
  // 改变身高（下蹲 / 起身），脚的位置保持不变；重力反转时脚在上方
  setHeight(h) { if (this.gd > 0) this.y += this.h - h; this.h = h; }
  // 起身前检查头顶有没有空间
  roomToStand(W) {
    const r = { x: this.x, y: this.gd > 0 ? this.y + this.h - PL.H : this.y, w: this.w, h: PL.H };
    for (let cy = Math.floor(r.y / TILE); cy <= Math.floor((r.y + r.h - 0.001) / TILE); cy++)
      for (let cx = Math.floor(r.x / TILE); cx <= Math.floor((r.x + r.w - 0.001) / TILE); cx++) if (W.solidAt(cx, cy)) return false;
    for (const s of W.solids) if (s.active && !s.oneWay && s.owner !== this && overlap(r, s)) return false;
    return true;
  }
  attackBox() {
    if (this.atkT <= 0) return null;
    const W = this.atkHeavy ? HEAVY : WPN[Inventory.weapon()];
    if (!W || !W.reach) return null;
    const R = W.reach;
    // 以站立时的头顶为基准；下蹲时横向攻击的高度降低一半
    const top = this.y + this.h - PL.H, low = this.crouch ? PL.CROUCH_ATK : 0;
    let b;
    if (this.atkHeavy) b = { x: this.facing > 0 ? this.x + this.w - 10 : this.x + 10 - R, y: top - 26 + low, w: R, h: PL.H + 34 };
    else if (this.atkDown) b = { x: this.x - 12, y: this.y + this.h - 6, w: this.w + 24, h: R - 8 };
    else if (this.atkUp) b = { x: this.x - 12, y: top - R + 14, w: this.w + 24, h: R - 8 }; // 按住「向上瞄准」：朝上劈
    else b = { x: this.facing > 0 ? this.x + this.w - 6 : this.x + 6 - R, y: top - 10 + low, w: R, h: PL.H + 16 };
    if (this.gd < 0) b.y = 2 * this.cy - (b.y + b.h); // 重力反转：上下镜像
    return b;
  }
  trailColor(t, i) {
    const tr = Inventory.equipped('trail');
    return tr.rainbow ? `hsl(${(t * 400 + i * 40) % 360},100%,65%)` : tr.color;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  // 输入：正常时直接读 Input；被掉帧幽灵干扰时读 0.5 秒前的输入；被死锁时移动类输入全部失效
  control(g) {
    let s = {}, h = {};
    for (const a of PL_ACTS) { s[a] = Input.down(a); h[a] = Input.hit(a); }
    if (this.lagT > 0) {
      this.lagBuf.push({ t: g.t, s, h });
      let cur = this.lagOut || s; h = {};
      while (this.lagBuf.length && this.lagBuf[0].t <= g.t - PL.LAG) { const e = this.lagBuf.shift(); cur = e.s; for (const a in e.h) if (e.h[a]) h[a] = true; }
      this.lagOut = cur; s = cur;
    } else if (this.lagBuf.length) {
      // 延迟结束：还没送达的按键一并补上，不吞键
      for (const e of this.lagBuf) for (const a in e.h) if (e.h[a]) h[a] = true;
      this.lagBuf = []; this.lagOut = null;
    }
    if (this.lockT > 0) { s = Object.assign({}, s); h = Object.assign({}, h); for (const a of PL_LOCKED) { s[a] = false; h[a] = false; } }
    return { down: (a) => !!s[a], hit: (a) => !!h[a] };
  }

  update(dt, g) {
    const W = g.world;
    if (this.frozen) return; // 第四章终局演出
    this.prevTop = this.y;
    if (this.lockT > 0) this.lockT -= dt;
    if (this.lockImmune > 0) this.lockImmune -= dt;
    if (this.lagT > 0) this.lagT -= dt;
    const I = this.control(g);
    this.prevBottom = this.y + this.h;
    if (this.spawnT > 0) this.spawnT -= dt;
    if (this.dashLock > 0) this.dashLock -= dt;
    this.dashCd -= dt; this.dropT -= dt;
    const mx = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0);
    // 本帧的实际操作（镜像执行官读取它）
    const ctl = this.ctl = { tick: g.t, mx, jumpHeld: I.down('jump'), jumped: null, dashed: false, dashDir: null };
    // 向上瞄准：抬头、举手 / 枪口朝上；站着不动一会儿，镜头会往上看
    this.lookUp = I.down('up') && !I.down('down');
    this.aimDown = (!this.onGround || this.inWater) && I.down('down') && !I.down('up'); // 空中 / 水中按住 ↓：低头、枪口朝下（↓ + 攻击 = 下劈 / 朝下开枪）
    this.lookT = this.lookUp && this.onGround && Math.abs(this.vx) < 30 ? this.lookT + dt : 0;
    // ---- 第四章：重力方向。下面的物理全部在「本地坐标」里计算（vy > 0 = 朝自己脚下），最后再换回世界坐标 ----
    const gd = g.core ? g.core.gd : 1;
    if (gd !== this.gd) { this.gd = gd; this.onGround = false; this.coyote = 0; this.jumping = false; this.jumpsLeft = 1; }
    // ---- 下蹲：站在地上按住 ↓；松开后头顶有空间才会站起来 ----
    const cube = g.core && g.core.mode === 'cube';
    const wantCrouch = this.onGround && !this.inWater && !cube && I.down('down') && !I.down('up') && this.dashT <= 0;
    if (wantCrouch && !this.crouch) { this.crouch = true; this.setHeight(PL.CROUCH_H); }
    else if (!wantCrouch && this.crouch && (cube || this.roomToStand(W))) { this.crouch = false; this.setHeight(PL.H); }
    if (cube) return this.updateCube(dt, g, I, ctl);
    this.vy *= gd;
    const footY = gd > 0 ? this.y + this.h + 1 : this.y - 1;
    if (I.hit('jump')) this.jumpBuf = PL.BUFFER; else this.jumpBuf -= dt;
    if (this.onGround) { this.coyote = PL.COYOTE; if (this.dashT <= 0) this.canDash = true; } else this.coyote -= dt;
    // ---- 培养液（水下低重力）与粘液状态 ----
    const wasWater = this.inWater;
    this.inWater = !!(W.pointWater && W.pointWater(this.cx, this.cy));
    if (this.inWater !== wasWater && g.onSplash) g.onSplash(this, this.inWater);
    this.swimCd -= dt;
    if (this.inWater) { if (this.slimeT > 0) { this.slimeT = 0; g.toastHint && g.toastHint('培养液冲掉了粘液'); } this.jumpsLeft = 1; if (this.dashT <= 0) this.canDash = true; }
    if (this.onGround) this.jumpsLeft = 1;
    if (this.slimeT > 0) { this.slimeT -= dt; if (Math.random() < 0.2) g.particles.add({ x: this.x + rand(2, this.w - 2), y: this.y + rand(4, this.h), vx: 0, vy: rand(20, 60), life: 0.5, size: 3, color: '#8f4', grav: 200 }); }

    // ---- 冲刺 ----
    if (I.hit('dash')) {
      if (this.dashLock > 0) { Sound.sfx.denied(); g.hudDeny = 0.6; Input.rumble(0.3, 0, 120); }
      else if (this.canDash && this.dashCd <= 0) {
        let dx = mx, dy = (I.down('down') ? 1 : 0) - (I.down('up') ? 1 : 0); // 同时按住「向上」+ 冲刺 = 向上冲刺
        if (this.onGround && dy > 0) dy = 0;
        if (!dx && !dy) dx = this.facing;
        const l = Math.hypot(dx, dy);
        this.dashDir = { x: dx / l, y: dy / l };
        this.dashT = PL.DASH_TIME; this.canDash = false; this.dashCd = PL.DASH_CD; this.jumping = false;
        if (dx) this.facing = Math.sign(dx);
        ctl.dashed = true; ctl.dashDir = this.dashDir;
        if (g.matrix) g.matrix.spawnEcho(this, g); // 第三章：拉撒路残影
        Sound.sfx.dash(); g.shake(2); g.freeze(0.03); Input.rumble(0.05, 0.35, 70);
        g.particles.burst(this.cx, this.cy, 10, { color: [this.trailColor(g.t, 0), this.trailColor(g.t, 3), '#fff'], smin: 60, smax: 200, lmin: 0.15, lmax: 0.35, szmin: 2, szmax: 3, add: true });
      }
    }

    // ---- 攻击 / 切换武器 ----
    this.atkCd -= dt; if (this.atkT > 0) this.atkT -= dt; else this.atkHeavy = false;
    if (I.hit('swap')) g.swapWeapon();
    const wk = Inventory.weapon(), WP = WPN[wk];
    if (I.hit('attack')) this.atkBuf = 0.12; else this.atkBuf = (this.atkBuf || 0) - dt; // 攻击输入缓冲：冷却快结束时按下也会出手
    if (this.atkBuf > 0 && WP && this.atkCd <= 0 && !g.noAttack) {
      this.atkBuf = 0;
      if (WP.melee) {
        this.atkDown = (!this.onGround || this.inWater) && I.down('down'); this.atkUp = !this.atkDown && I.down('up');
        this.atkT = WP.active; this.atkCd = WP.cd; this.atkCdMax = WP.cd; this.atkHits = new Set(); this.atkSwing = WP.swing; this.atkSwingMax = WP.swing; this.atkHeavy = false;
        Sound.sfx.slash(); Input.rumble(0, 0.2, 50);
        if (WP.charge) this.chargeT = 0; // 巨像残刃：出刀后继续按住 = 蓄力
      } else {
        const dir = I.down('up') ? 'up' : (!this.onGround || this.inWater) && I.down('down') ? 'down' : 'side';
        this.atkCd = WP.cd; this.atkCdMax = WP.cd;
        g.fireWeapon(this, wk, dir);
      }
    }
    // 巨像残刃蓄力：按住约 0.6 秒后松开 → 重劈（地面上还会放出冲击波）
    if (WP && WP.charge && this.chargeT >= 0) {
      if (I.down('attack')) {
        const before = this.chargeT; this.chargeT += dt;
        if (before < WP.charge && this.chargeT >= WP.charge) { Sound.sfx.recharge(); Input.rumble(0.1, 0.3, 80); }
      } else {
        if (this.chargeT >= WP.charge) {
          this.atkDown = false; this.atkUp = false; this.atkHeavy = true;
          this.atkT = HEAVY.active; this.atkCd = HEAVY.cd; this.atkCdMax = HEAVY.cd; this.atkHits = new Set(); this.atkSwing = HEAVY.swing; this.atkSwingMax = HEAVY.swing;
          g.heavySlash(this);
        }
        this.chargeT = -1;
      }
    } else if (!WP || !WP.charge) this.chargeT = -1;
    this.atkSwing = Math.max(0, this.atkSwing - dt);

    if (this.dashT > 0) {
      this.dashT -= dt;
      const ds = this.inWater ? PL.DASH_SPEED * 0.7 : PL.DASH_SPEED;
      this.vx = this.dashDir.x * ds; this.vy = this.dashDir.y * ds;
      const grounded = this.dashDir.y === 0 && (W.supportAt(this.x + 2, footY) || W.supportAt(this.x + this.w - 2, footY));
      if (grounded) this.coyote = PL.COYOTE;
      this.trailT -= dt;
      if (this.trailT <= 0) {
        this.trailT = 0.018; this.trail.push({ x: this.x, y: this.y, f: this.facing, t: 0, c: this.trailColor(g.t, this.trail.length) });
        if (Inventory.equipped('trail').glyph) g.particles.add({ x: this.cx + rand(-8, 8), y: this.cy + rand(-10, 10), vx: rand(-20, 20), vy: rand(20, 60), life: 0.6, size: 3, color: '#2f9', add: true });
      }
      // 地面冲刺可以接跳跃（长跳）
      if (this.jumpBuf > 0 && this.coyote > 0) {
        this.dashT = 0; this.jumpBuf = 0; this.coyote = 0; this.vx *= 0.75;
        this.vy = -PL.JUMP; this.jumping = true; Sound.sfx.jump(); this.sx = 0.75; this.sy = 1.3; ctl.jumped = 'ground';
      } else if (this.dashT <= 0) {
        this.vx *= 0.6; this.vy = this.vy < 0 ? this.vy * 0.45 : this.vy * 0.5;
      }
    } else if (this.inWater) {
      // 水下：惯性大、极难刹车，可以无限次「漂浮跳跃」
      const Wt = PL.WATER;
      this.vx = approach(this.vx, mx * Wt.RUN, (mx ? Wt.ACC : Wt.DEC) * dt);
      if (mx) this.facing = mx;
      this.vy = clamp(this.vy + Wt.GRAV * dt, -720, Wt.MAXFALL);
      this.jumping = false;
      if (this.jumpBuf > 0 && this.swimCd <= 0) {
        this.jumpBuf = 0; this.swimCd = Wt.SWIM_CD;
        const nearSurface = !W.pointWater(this.cx, this.y - 6);
        this.vy = nearSurface ? -Wt.EXIT : Math.min(this.vy, 0) - Wt.SWIM * 0.8 - 80;
        this.vy = Math.max(this.vy, -Wt.EXIT);
        Sound.sfx.swim && Sound.sfx.swim(); ctl.jumped = 'swim';
        for (let i = 0; i < 5; i++) g.particles.add({ x: this.cx + rand(-8, 8), y: this.y + this.h, vx: rand(-20, 20), vy: rand(-60, -20), life: rand(0.5, 1), size: rand(2, 4), color: 'rgba(180,240,255,0.8)', shape: 'ring' });
      }
      if (Math.random() < 0.06) g.particles.add({ x: this.cx + rand(-4, 4), y: this.y + 4, vx: rand(-10, 10), vy: rand(-50, -30), life: 1, size: 2, color: 'rgba(180,240,255,0.7)', shape: 'ring' });
    } else {
      const target = mx * PL.RUN * (this.crouch && this.onGround ? PL.CROUCH_RUN : 1);
      let acc = this.onGround ? (mx ? PL.ACC_G : PL.DEC_G) : (mx ? PL.ACC_A : PL.DEC_A);
      const wire = g.core && g.core.mode === 'wire'; // 第四章线框视界：没有惯性，起跳高度固定
      // 空中顺着方向时保留冲刺带来的额外速度（手感更宽容）
      if (!this.onGround && mx && Math.sign(this.vx) === mx && Math.abs(this.vx) > PL.RUN) acc = 380;
      if (wire) acc = 1e5;
      this.vx = approach(this.vx, target, acc * dt);
      if (mx) this.facing = mx;
      let grav = GRAV;
      if (this.jumping && I.down('jump') && Math.abs(this.vy) < 100) grav *= 0.5;
      this.vy = Math.min(this.vy + grav * dt, MAXFALL);
      if (this.jumping && !I.down('jump') && this.vy < -220 && !wire) { this.vy *= 0.48; this.jumping = false; }
      if (this.vy >= 0) this.jumping = false;
      if (this.jumpBuf > 0 && this.coyote > 0) {
        this.jumpBuf = 0; this.coyote = 0;
        if (this.onGround && this.groundOneWay && I.down('down')) { this.dropT = 0.22; this.onGround = false; }
        else {
          this.vy = -PL.JUMP * (this.slimeT > 0 ? 0.71 : 1); this.jumping = true; this.onGround = false; this.sx = 0.75; this.sy = 1.3;
          Sound.sfx.jump(); ctl.jumped = 'ground';
          g.particles.burst(this.cx, this.y + this.h, 6, { color: this.slimeT > 0 ? '#8f4' : '#8a8070', smin: 20, smax: 80, angle: -Math.PI / 2, spread: 1.3, lmin: 0.2, lmax: 0.4, grav: 200 });
        }
      } else if (this.jumpBuf > 0 && !this.onGround && this.coyote <= 0 && this.jumpsLeft > 0 && Inventory.ability('doubleJump')) {
        // ---- 二段跳（推进囊）；被粘液粘住时不可用 ----
        if (this.slimeT > 0) { if (I.hit('jump')) { Sound.sfx.denied(); g.hudSlime = 0.6; } }
        else {
          this.jumpBuf = 0; this.jumpsLeft = 0; ctl.jumped = 'double';
          this.vy = -PL.DJUMP; this.jumping = true; this.sx = 0.8; this.sy = 1.25;
          Sound.sfx.djump ? Sound.sfx.djump() : Sound.sfx.jump();
          g.particles.add({ x: this.cx, y: this.y + this.h, size: 4, grow: 90, life: 0.3, shape: 'ring', color: '#7ff', add: true });
          g.particles.burst(this.cx, this.y + this.h, 8, { color: ['#7ff', '#bff'], smin: 40, smax: 120, angle: Math.PI / 2, spread: 0.9, lmin: 0.2, lmax: 0.4, add: true });
        }
      }
    }

    // ---- 位移与碰撞 ----
    const hx = W.moveX(this, this.vx * dt);
    if (hx) this.vx = 0;
    const wasGround = this.onGround;
    const ry = W.moveY(this, this.vy * dt * gd, this.dropT > 0 && gd > 0);
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
    this.vy *= gd; // 换回世界坐标

    // ---- 动画 ----
    this.sx = approach(this.sx, 1, dt * 3.5); this.sy = approach(this.sy, 1, dt * 3.5);
    if (this.onGround && Math.abs(this.vx) > 20) this.run += dt * Math.abs(this.vx) * 0.055;
    for (const t of this.trail) t.t += dt;
    this.trail = this.trail.filter((t) => t.t < 0.22);
  }

  // 重力反转时整个身体上下翻转
  draw(ctx, g) {
    const flip = this.gd < 0;
    if (flip) { ctx.save(); ctx.translate(0, 2 * this.cy); ctx.scale(1, -1); }
    this.drawMain(ctx, g);
    if (flip) ctx.restore();
  }
  drawMain(ctx, g) {
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
    // 蓄力光：满了以后变成金色并闪烁
    const Wc = WPN[Inventory.weapon()];
    if (Wc && Wc.charge && this.chargeT > 0.12) {
      const k = Math.min(1, this.chargeT / Wc.charge), full = k >= 1;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = full ? `rgba(255,220,120,${0.6 + 0.4 * Math.sin(g.t * 30)})` : `rgba(255,200,120,${0.25 + k * 0.4})`;
      ctx.lineWidth = full ? 3 : 2;
      ctx.beginPath(); ctx.arc(this.cx, this.cy, 22 - k * 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
      if (full) { const gr = ctx.createRadialGradient(this.cx, this.cy, 2, this.cx, this.cy, 30); gr.addColorStop(0, 'rgba(255,220,120,0.35)'); gr.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = gr; ctx.fillRect(this.cx - 30, this.cy - 30, 60, 60); }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  drawSlash(ctx, g) {
    const sk = Inventory.equipped('blade'), k = 1 - this.atkSwing / (this.atkSwingMax || 0.12);
    const feet = this.y + this.h, cx = this.cx, cy = feet - PL.H / 2 + (this.crouch && !this.atkDown && !this.atkUp ? PL.CROUCH_ATK : 0);
    ctx.save();
    if (this.crouch) { ctx.beginPath(); ctx.rect(cx - 200, feet - 300, 400, 300); ctx.clip(); } // 下蹲：刀光不画到地面以下
    ctx.translate(cx, cy);
    if (this.atkDown) ctx.rotate(Math.PI / 2);
    else { ctx.scale(this.facing, 1); if (this.atkUp && !this.atkHeavy) ctx.rotate(-Math.PI / 2); }
    const a0 = -1.3 + k * 0.4, a1 = a0 + 2.4 * Math.min(1, k * 2.2);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(${sk.arc},${0.75 * (1 - k)})`; ctx.lineWidth = this.atkHeavy ? 18 : 10; ctx.lineCap = 'round';
    const RR = this.atkHeavy ? HEAVY.arc : (WPN[Inventory.weapon()] || WPN.sabre).arc || 30;
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
    const slimed = !tint && this.slimeT > 0;
    if (paint && paint.glitch && Math.random() < 0.04) ctx.translate(rand(-3, 3), 0);
    const cr = this.crouch ? 10 : 0; // 下蹲：上半身整体下沉约 1/3 个身位
    if (cr) ctx.translate(0, cr);
    // 背上的残刃（已解锁时）
    const curW = !tint && this.hasBlade !== false ? Inventory.weapon() : null;
    if (curW && WPN[curW].melee && !(this.atkSwing > 0)) {
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
    // 腿（下蹲时画成弯曲的短腿，坐标要减去上半身的下沉量）
    let l1x = -6, l2x = 1, l1y = 0, l2y = 0;
    if (moving) { l1x += Math.sin(ph) * 4; l2x -= Math.sin(ph) * 4; l1y = -Math.max(0, Math.cos(ph)) * 3; l2y = -Math.max(0, -Math.cos(ph)) * 3; }
    else if (air) { l1x = -7; l2x = 3; l1y = -3; l2y = -1; }
    if (!cr) {
      ctx.fillStyle = c.a; ctx.fillRect(l1x, -11 + l1y, 5, 10); ctx.fillRect(l2x, -11 + l2y, 5, 10);
      ctx.fillStyle = c.k; ctx.fillRect(l1x, -8 + l1y, 5, 3); ctx.fillRect(l2x, -8 + l2y, 5, 3);
      ctx.fillStyle = c.d; ctx.fillRect(l1x - 1, -2 + l1y, 7, 3); ctx.fillRect(l2x - 1, -2 + l2y, 8, 3);
    }
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
    // 下蹲的腿：单膝跪地——前腿大腿伸出身前、膝盖立起、小腿竖直着地；后腿膝盖跪地、小腿平放在身后
    if (cr) {
      const g0 = -cr - bob, ol = tint || '#1c1a14'; // g0 = 地面在当前坐标系里的位置；ol = 轮廓色
      const leg = (x, y, w, h, col) => { ctx.fillStyle = ol; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
      leg(-9, g0 - 7, 5, 5, c.a);    // 后腿大腿（向下）
      leg(-18, g0 - 3, 10, 3, c.a);  // 后腿小腿（平放在地上）
      leg(-9, g0 - 3, 5, 3, c.k);    // 跪地的膝盖
      leg(-21, g0 - 2, 3, 2, c.d);   // 后脚
      leg(3, g0 - 9, 11, 4, c.a);    // 前腿大腿（伸到身前）
      leg(12, g0 - 7, 4, 7, c.a);    // 前腿小腿（竖直）
      leg(12, g0 - 11, 5, 4, c.k);   // 前膝护甲
      leg(11, g0 - 2, 8, 2, c.d);    // 前脚
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
    const look = !tint && this.lookUp; // 向上瞄准：手臂举起、枪口朝上、头往上抬
    const dn = !tint && !look && this.aimDown; // 空中向下瞄准：手臂垂下、枪口朝下、低头
    const sw = look || dn ? 0 : moving ? Math.sin(ph) * 3 : air ? -2 : 0;
    ctx.fillStyle = c.b; ctx.fillRect(-3, -24, 9, 5);
    const ay = cr ? -2 : 0; // 下蹲：手臂和枪稍微抬起，和子弹射出的高度对齐
    if (dn) { ctx.fillStyle = c.a; ctx.fillRect(3, -19, 4, 11); ctx.fillStyle = c.d; ctx.fillRect(3, -9, 4, 3); }
    else if (!look) { ctx.fillStyle = c.a; ctx.fillRect(1 + sw, -19 + ay, 4, 8); ctx.fillStyle = c.d; ctx.fillRect(1 + sw, -12 + ay, 4, 3); }
    // 手里的枪（向上瞄准时画在头的前面，见下方）
    const drawGun = (kick) => {
      if (look) { ctx.translate(9, -34 + kick); ctx.rotate(-Math.PI / 2); }
      else if (dn) { ctx.translate(5, -8 - kick); ctx.rotate(Math.PI / 2); }
      else { ctx.translate(3 + sw - kick, -11 + ay); ctx.rotate(-kick * 0.08); }
      if (curW === 'flintlock') {
        ctx.fillStyle = '#5a3a20'; ctx.fillRect(-2, -1, 5, 5);            // 握把
        ctx.fillStyle = '#8a6a36'; ctx.fillRect(0, -3, 5, 3);             // 击锤座
        ctx.fillStyle = '#6a6e72'; ctx.fillRect(3, -3, 11, 2);            // 枪管
        ctx.fillStyle = '#c9a030'; ctx.fillRect(12, -3.5, 2, 3);
      } else {
        ctx.fillStyle = '#2a3a44'; ctx.fillRect(-2, -1, 5, 5);
        ctx.fillStyle = 'rgba(120,240,200,0.85)'; ctx.beginPath(); ctx.ellipse(5, -3, 5, 3.5, 0, 0, 7); ctx.fill(); // 孢子囊
        ctx.fillStyle = '#8a9aa6'; ctx.fillRect(9, -3.5, 5, 2);
        ctx.fillStyle = '#c86ab0'; ctx.fillRect(3, -4, 1.5, 1.5);
      }
    };
    const hasGun = curW === 'flintlock' || curW === 'sporeGun';
    if (hasGun && !look) { ctx.save(); drawGun(Math.max(0, (this.atkCd || 0) - 0.8) * 20); ctx.restore(); }
    // 头（向上瞄准时绕脖子往上抬，空中向下瞄准时低头）
    if (look || dn) { ctx.save(); ctx.translate(0, -22); ctx.rotate(look ? -0.4 : 0.35); ctx.translate(0, 22); }
    ctx.fillStyle = c.e; ctx.fillRect(-6, -31, 13, 9);
    ctx.fillStyle = c.b; ctx.fillRect(-6, -31, 13, 2);
    const visor = tint || (this.dashLock > 0 ? '#f44' : c.visor);
    ctx.fillStyle = visor; ctx.fillRect(1, -28, 7, 3);
    if (!tint) {
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = this.dashLock > 0 ? 'rgba(255,60,60,0.35)' : 'rgba(100,255,255,0.3)';
      ctx.fillRect(0, -30, 11, 7); ctx.globalCompositeOperation = 'source-over';
    }
    if (dn) ctx.restore();
    if (look) {
      ctx.restore();
      // 举起的手臂：从肩膀伸到脸的前上方
      ctx.fillStyle = c.a; ctx.fillRect(6, -34, 4, 12); ctx.fillStyle = c.d; ctx.fillRect(6, -37, 4, 3);
      if (hasGun) { ctx.save(); drawGun(curW === 'flintlock' ? Math.max(0, (this.atkCd || 0) - 0.8) * 20 : 0); ctx.restore(); }
    }
    if (slimed) {
      ctx.fillStyle = 'rgba(140,255,60,0.55)';
      ctx.fillRect(-9, -23, 18, 4); ctx.fillRect(-6, -31, 13, 3);
      ctx.fillRect(-7, -19, 3, 6 + Math.sin(t * 6) * 2); ctx.fillRect(4, -20, 3, 8 + Math.cos(t * 5) * 2);
    }
    ctx.restore();
  }
}
