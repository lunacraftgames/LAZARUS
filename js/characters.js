'use strict';
// ============================================================
//  可选角色
//  · 每个角色可以覆盖 PL 里的手感参数（pl），决定尺寸、专属武器、能力开关和绘制方式
//  · 角色只能在「新的游戏」开始时（1-1 之前）选择，整个周目不能更换；选择结果写进周目存档
//  · 角色影响战斗 → 账号绑定解锁，不进入 Steam 市场
// ============================================================
const CHARACTERS = {
  lazarus: {
    id: 'lazarus', name: '拉撒路', en: 'LAZARUS', model: 'LZ-01 初代军用外骨骼',
    color: '#7ff', w: 20, h: 28, pl: {},
    bio: '在人类遗迹博物馆的展台上积了二十年灰的初代军用外骨骼。硬件老旧，却是整个世界上最古老、最「不可预测」的一台机器。',
    skills: [
      ['8 向冲刺', '按住方向再冲刺；地面冲刺可以接跳跃（长跳）'],
      ['二段跳', '第二章拿到推进囊后解锁'],
      ['武器库', '仪仗军刀、巨像残刃、古董燧发枪、生物孢子枪，随时切换'],
      ['下蹲 / 瞄准', '↓ 下蹲，↑ 向上瞄准，空中 ↓ + 攻击 = 下劈'],
    ],
    stats: { 机动: 4, 跳跃: 4, 攀爬: 1, 火力: 5 },
    unlocked: () => true,
  },
  scrubber: {
    id: 'scrubber', name: '小扫', en: 'SCRUBBER', model: 'SC-7 博物馆除尘机械',
    color: '#fc4', w: 20, h: 18,
    // 跑得快一点、跳得矮一点（仍然能跳上 3 格高的台子）、没有二段跳
    pl: { RUN: 270, ACC_G: 3000, JUMP: 690, H: 18 },
    music: 'tin', // 背景音乐的演奏风格（见 audio.js 的 STYLES）
    weapon: 'brush', draw: 'drawScrubber', noDoubleJump: true, noCrouch: true, crawl: true, rollStrike: true,
    climb: 190, // 贴墙 / 天花板爬行速度（像素/秒）
    bio: '第一章那只被你踩碎的除尘蜘蛛。它在拉撒路的无线电信号里重新找回了自己的清扫程序，把碎掉的腿一根根装了回去——然后决定跟着你走。',
    skills: [
      ['六足吸附', '碰到墙壁时按住朝向墙的方向就会吸住；↑ ↓ 沿墙爬，爬到尽头会自动翻过墙角'],
      ['倒挂天花板', '撞到天花板时按住 ↑ 或跳跃就会倒挂；← → 爬行，↓ 或跳跃松开'],
      ['弹射', '8 向弹射，贴在任何表面上都会恢复；弹射天生能撞碎普通敌人'],
      ['旋转刷', '专属近战：出手最快、距离最短；不能使用拉撒路的武器，没有二段跳'],
    ],
    stats: { 机动: 5, 跳跃: 3, 攀爬: 5, 火力: 2 },
    unlockText: '通关第一章「死寂博物馆」后解锁',
    unlocked: () => !!(Inventory.p && Inventory.p.ch1Clear),
  },
  atlas: {
    id: 'atlas', name: '阿特拉斯', en: 'ATLAS', model: 'ATLAS-9 重型工程外骨骼',
    color: '#f5b52e', w: 24, h: 30,
    // 跑得慢、惯性大、跳得矮；没有冲刺和二段跳，靠喷气背包和地面猛击
    pl: { RUN: 205, ACC_G: 1500, DEC_G: 1700, ACC_A: 1100, DEC_A: 600, JUMP: 650, H: 30 },
    music: 'steel', // 背景音乐的演奏风格（见 audio.js 的 STYLES）
    weapon: 'fist', draw: 'drawAtlas', noDoubleJump: true, noCrouch: true, jet: true, shield: true,
    fuel: 1.15,      // 喷气燃料（秒），落地回满
    echoLife: 4,     // 第三章：踏地留下的残影更久（它跑得慢，也不能冲刺）
    bio: '机械展区里的另一件展品：一台用来搬运钢梁的重型工程外骨骼，电池早在清洗战争前就被拆掉了。拉撒路的无线电信号让它的液压系统重新加压——它比拉撒路重三倍，也固执三倍。',
    skills: [
      ['喷气悬停', '空中按住跳跃：喷气背包托着你悬停、缓慢上升；燃料落地回满'],
      ['地面猛击', '空中按冲刺：垂直砸下去，落地的冲击波向两侧推开，还会震塌坍塌石板'],
      ['液压踏地', '地面按冲刺：原地震一下，打碎身边的敌人（第三章会留下 4 秒的残影）'],
      ['液压拳 / 臂盾', '专属近战：慢但范围大，能打碎看守者的盾牌；站在地上时，正面飞来的子弹和炸弹会被挡下'],
    ],
    stats: { 机动: 2, 跳跃: 4, 攀爬: 1, 火力: 4 },
    unlockText: '通关第二章「进化育婴室」后解锁',
    unlocked: () => !!(Inventory.p && Inventory.p.ch2Clear),
  },
};
const CHAR_ORDER = ['lazarus', 'scrubber', 'atlas'];
function charDef(id) { return CHARACTERS[id] || CHARACTERS.lazarus; }
// 背景音乐跟着角色换演奏风格
function applyCharMusic(id) { Sound.setStyle(charDef(id).music || null); }

// 小扫的专属武器：旋转刷
WPN.brush = { melee: true, active: 0.08, cd: 0.12, swing: 0.1, reach: 34, arc: 22 };
WEAPON_INFO.brush = { name: '旋转刷', en: 'BRUSH' };
// 阿特拉斯的专属武器：液压拳（慢、范围大、能破盾）
WPN.fist = { melee: true, active: 0.14, cd: 0.42, swing: 0.2, reach: 58, arc: 38 };
WEAPON_INFO.fist = { name: '液压拳', en: 'FIST' };

// ============================================================
//  小扫：贴墙 / 倒挂爬行
//  cling.s = 表面相对身体的方向：'L' 左墙  'R' 右墙  'U' 头顶（天花板）  'D' 脚下（只在重力反转时使用）
//  重力方向上的「地面」不算吸附状态，交给普通物理处理
// ============================================================
Object.assign(Player.prototype, {
  // 身体旁边某一侧有没有实心瓦片（只看瓦片，移动平台不算）
  surfaceAt(W, s) {
    const x0 = Math.floor(this.x / TILE), x1 = Math.floor((this.x + this.w - 0.01) / TILE);
    const y0 = Math.floor(this.y / TILE), y1 = Math.floor((this.y + this.h - 0.01) / TILE);
    if (s === 'L' || s === 'R') {
      const c = s === 'L' ? Math.floor((this.x - 1) / TILE) : Math.floor((this.x + this.w + 1) / TILE);
      for (let y = y0; y <= y1; y++) if (W.solidAt(c, y)) return c;
      return null;
    }
    const r = s === 'U' ? Math.floor((this.y - 1) / TILE) : Math.floor((this.y + this.h + 1) / TILE);
    for (let x = x0; x <= x1; x++) if (W.solidAt(x, r)) return r;
    return null;
  },
  boxFree(W, x, y) {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + this.w - 0.01) / TILE), y0 = Math.floor(y / TILE), y1 = Math.floor((y + this.h - 0.01) / TILE);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) if (W.solidAt(cx, cy) || W.tile(cx, cy) === '^' || W.tile(cx, cy) === 'v') return false;
    return true;
  },
  // 这个表面是不是重力方向上的「地面」（是的话就交给普通物理，不算吸附）
  isFloor(s) { return (s === 'D' && this.gd > 0) || (s === 'U' && this.gd < 0); },
  attach(s, g) {
    if (this.isFloor(s)) { this.cling = null; return; }
    if (!this.cling) { Sound.sfx.land(); this.sx = 1.15; this.sy = 0.85; }
    this.cling = { s }; this.vx = 0; this.vy = 0; this.dashT = 0; this.jumping = false; this.canDash = true; this.jumpsLeft = 1;
    if (s === 'L') this.facing = -1; else if (s === 'R') this.facing = 1;
  },
  release(g) { this.cling = null; this.clingCd = 0.12; },
  canCling(g) { return this.C.crawl && !this.inWater && this.clingCd <= 0 && !(g.core && g.core.mode === 'cube'); },

  // 普通物理里触发吸附：横向撞墙（按住朝墙方向）
  tryWallAttach(g, mx, I) {
    if (!this.canCling(g) || !mx) return;
    const s = mx < 0 ? 'L' : 'R';
    if (this.onGround && !I.down('up')) return; // 站在地上推墙不会自己爬上去，要按 ↑
    if (this.surfaceAt(g.world, s) != null) this.attach(s, g);
  },
  // 撞到头顶（按住 ↑ 或跳跃）
  tryCeilAttach(g, I) {
    if (!this.canCling(g) || !(I.down('up') || I.down('jump'))) return;
    const s = this.gd > 0 ? 'U' : 'D';
    if (this.surfaceAt(g.world, s) != null) this.attach(s, g);
  },
  // 走出台子边缘时按住 ↓：翻到台子侧面，沿墙往下爬
  tryLedgeWrap(g, dir) {
    if (!this.canCling(g) || !dir) return false;
    const W = g.world;
    if (this.gd > 0) {
      const edge = dir > 0 ? Math.floor(this.x / TILE) * TILE : Math.ceil((this.x + this.w) / TILE) * TILE; // 刚刚离开的台子边缘
      const row = Math.floor((this.y + this.h + 2) / TILE);
      const blockCol = dir > 0 ? edge / TILE - 1 : edge / TILE;
      if (!W.solidAt(blockCol, row)) return false;
      const nx = dir > 0 ? edge : edge - this.w, ny = row * TILE;
      if (!this.boxFree(W, nx, ny)) return false;
      this.x = nx; this.y = ny; this.attach(dir > 0 ? 'L' : 'R', g); this.facing = dir;
      return true;
    }
    return false;
  },

  // 吸附状态下的移动（完全取代重力和普通物理）
  updateCling(dt, g, I, ctl) {
    const W = g.world, s = this.cling.s, sp = this.C.climb || 180;
    const up = I.down('up'), dn = I.down('down'), mx = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0); // mx 只在倒挂时用来爬行
    this.vx = 0; this.vy = 0; this.onGround = false; this.coyote = 0; this.airT = 0;
    if (this.inWater) { this.release(g); return this.clingAnim(dt); }
    // 松开：跳跃（墙上 = 蹬墙跳，天花板 = 落下）
    if (this.jumpBuf > 0) {
      this.jumpBuf = 0; this.release(g);
      if (s === 'L' || s === 'R') {
        const away = s === 'L' ? 1 : -1;
        this.vx = away * 330; this.vy = -this.K.JUMP * 0.9 * this.gd; this.jumping = true; this.facing = away;
        Sound.sfx.jump(); ctl.jumped = 'ground'; this.sx = 0.8; this.sy = 1.25;
      } else { this.vy = 0; }
      return this.clingAnim(dt);
    }
    if (s === 'L' || s === 'R') {
      const away = s === 'L' ? 1 : -1;
      if (I.hit(away < 0 ? 'left' : 'right')) { this.release(g); this.vx = away * 160; return this.clingAnim(dt); } // 重新按一下朝墙外的方向 = 松开（一直按住的键不算，免得翻过台子边缘时立刻掉下去）
      const vdir = ((dn ? 1 : 0) - (up ? 1 : 0)) * this.gd; // 重力反转时 ↑ 指向自己的头顶（世界的下方）
      if (vdir) {
        const r = W.moveY(this, vdir * sp * dt, false);
        this.run += dt * sp * 0.06;
        if (r) { // 内角：撞到天花板 / 地面 → 转到那个面上
          const ns = vdir < 0 ? 'U' : 'D';
          if (this.isFloor(ns)) { this.release(g); this.clingCd = 0; return this.clingAnim(dt); }
          this.attach(ns, g); this.facing = away; return this.clingAnim(dt);
        }
        if (this.surfaceAt(W, s) == null) this.wrapWall(g, s, vdir);
      }
    } else {
      // 倒挂（或重力反转时趴在方块顶上）：← → 爬行，朝重力方向按键 = 松开
      const drop = dn; // 松开 = 朝自己脚下的方向（'U' 只在正常重力、'D' 只在重力反转时出现，两种情况下都是 ↓）
      if (drop) { this.release(g); return this.clingAnim(dt); }
      if (mx) {
        this.facing = mx;
        const hit = W.moveX(this, mx * sp * 1.1 * dt);
        this.run += dt * sp * 0.06;
        if (hit) { this.attach(mx > 0 ? 'R' : 'L', g); return this.clingAnim(dt); } // 内角：爬上前方的墙
        if (this.surfaceAt(W, s) == null) this.wrapCeil(g, s, mx);
      }
    }
    if (this.cling && this.surfaceAt(W, this.cling.s) == null) this.release(g); // 表面没了（比如坍塌）
    return this.clingAnim(dt);
  },
  // 沿墙爬到尽头：翻过外角，到方块顶面 / 底面
  wrapWall(g, s, vdir) {
    const W = g.world, col = s === 'L' ? Math.floor((this.x - 1) / TILE) : Math.floor((this.x + this.w + 1) / TILE);
    if (vdir < 0) { // 往上爬过了墙顶
      const top = Math.ceil((this.y + this.h) / TILE) * TILE, row = top / TILE;
      if (W.solidAt(col, row)) {
        const nx = s === 'L' ? (col + 1) * TILE - this.w : col * TILE, ny = top - this.h;
        if (this.boxFree(W, nx, ny)) { this.x = nx; this.y = ny; this.facing = s === 'L' ? -1 : 1; if (this.isFloor('D')) { this.release(g); this.onGround = true; this.clingCd = 0; } else this.attach('D', g); return; }
      }
    } else { // 往下爬过了墙底
      const bot = Math.floor(this.y / TILE) * TILE, row = bot / TILE - 1;
      if (W.solidAt(col, row)) {
        const nx = s === 'L' ? (col + 1) * TILE - this.w : col * TILE, ny = bot;
        if (this.boxFree(W, nx, ny)) { this.x = nx; this.y = ny; this.facing = s === 'L' ? -1 : 1; if (this.isFloor('U')) { this.release(g); this.clingCd = 0; } else this.attach('U', g); return; }
      }
    }
    this.release(g);
  },
  // 倒挂爬到方块边缘：翻到方块侧面
  wrapCeil(g, s, mx) {
    const W = g.world;
    if (s === 'U') {
      const row = Math.floor((this.y - 1) / TILE), col = mx > 0 ? Math.floor(this.x / TILE) - 1 : Math.ceil((this.x + this.w) / TILE);
      const edgeX = mx > 0 ? (col + 1) * TILE : col * TILE;
      if (W.solidAt(col, row)) {
        const nx = mx > 0 ? edgeX : edgeX - this.w, ny = (row + 1) * TILE - this.h;
        if (this.boxFree(W, nx, ny)) { this.x = nx; this.y = ny; this.attach(mx > 0 ? 'L' : 'R', g); this.facing = mx; return; }
      }
    } else {
      const row = Math.floor((this.y + this.h + 1) / TILE), col = mx > 0 ? Math.floor(this.x / TILE) - 1 : Math.ceil((this.x + this.w) / TILE);
      const edgeX = mx > 0 ? (col + 1) * TILE : col * TILE;
      if (W.solidAt(col, row)) {
        const nx = mx > 0 ? edgeX : edgeX - this.w, ny = row * TILE;
        if (this.boxFree(W, nx, ny)) { this.x = nx; this.y = ny; this.attach(mx > 0 ? 'L' : 'R', g); this.facing = mx; return; }
      }
    }
    this.release(g);
  },
  clingAnim(dt) {
    this.sx = approach(this.sx, 1, dt * 3.5); this.sy = approach(this.sy, 1, dt * 3.5);
    for (const t of this.trail) t.t += dt;
    this.trail = this.trail.filter((t) => t.t < 0.22);
  },

  // ---------------- 小扫的外观：六足圆盘 + 黄黑警示条纹 + 底部旋转刷 ----------------
  // 脚始终朝向吸附的表面；tint = 冲刺残影的纯色
  drawScrubber(ctx, x, y, facing, sx, sy, g, tint) {
    const t = g.t, s = this.cling && !tint ? this.cling.s : null;
    const ang = s === 'L' ? Math.PI / 2 : s === 'R' ? -Math.PI / 2 : s === 'U' ? Math.PI : 0;
    const col = tint ? { a: tint, b: tint, d: tint, s: tint, leg: tint, eye: tint } : { a: '#d9a520', b: '#f2c440', d: '#3a2e14', s: '#222', leg: '#4a4a4a', eye: this.dashLock > 0 ? '#f44' : '#7ff' };
    ctx.save();
    ctx.translate(Math.round(x + this.w / 2), Math.round(y + this.h / 2));
    ctx.rotate(ang);
    const rolling = this.dashT > 0 && !tint;
    if (rolling) ctx.rotate(t * 30 * facing); // 弹射：缩成一团滚出去
    ctx.scale(facing * sx, sy);
    ctx.translate(0, this.h / 2); // 原点移到脚底
    const moving = (this.onGround && Math.abs(this.vx) > 20) || (s && this.run), ph = this.run * 2;
    if (!rolling) {
      // 六条腿（左右各三条），走路时交替抬起
      ctx.strokeStyle = col.leg; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        for (const side of [-1, 1]) {
          const lift = moving ? Math.max(0, Math.sin(ph + i * 2.1 + (side > 0 ? Math.PI : 0))) * 3 : 0;
          const bx = side * (3 + i * 3), kx = side * (7 + i * 3), fx = side * (9 + i * 3.5);
          ctx.beginPath(); ctx.moveTo(bx, -7); ctx.lineTo(kx, -12 - lift); ctx.lineTo(fx, -1 - lift); ctx.stroke();
        }
      }
      ctx.lineCap = 'butt';
    }
    // 底部的刷子（攻击时高速旋转、刷毛张开）
    const atk = !tint && this.atkSwing > 0;
    ctx.fillStyle = tint || '#d8d0b0';
    const bw = atk ? 22 : 16;
    for (let i = 0; i < 7; i++) { const k = (i / 6 - 0.5) * bw + (atk ? Math.sin(t * 60 + i) * 1.5 : 0); ctx.fillRect(k - 0.75, -4, 1.5, atk ? 4 : 3); }
    // 圆盘身体
    ctx.fillStyle = col.d; ctx.beginPath(); ctx.ellipse(0, -7, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col.a; ctx.beginPath(); ctx.ellipse(0, -10, 10, 6.5, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-10, -10, 20, 3);
    ctx.fillStyle = col.b; ctx.beginPath(); ctx.ellipse(-1, -12, 6, 3, 0, Math.PI, 0); ctx.fill();
    if (!tint) {
      // 警示条纹
      ctx.save(); ctx.beginPath(); ctx.rect(-10, -9, 20, 2.5); ctx.clip();
      ctx.fillStyle = col.s; for (let i = -12; i < 12; i += 4) { ctx.beginPath(); ctx.moveTo(i, -6.5); ctx.lineTo(i + 2, -6.5); ctx.lineTo(i + 4, -9); ctx.lineTo(i + 2, -9); ctx.fill(); }
      ctx.restore();
      // 被踩碎后重新拼好的焊缝
      ctx.strokeStyle = '#8a5a20'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-4, -16); ctx.lineTo(-2, -13); ctx.lineTo(-5, -11); ctx.stroke();
    }
    // 前方的「眼睛」传感器
    ctx.fillStyle = tint || '#222'; ctx.fillRect(5, -13, 6, 4);
    ctx.fillStyle = col.eye; ctx.fillRect(7, -12, 3, 2);
    if (!tint) {
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = this.dashLock > 0 ? 'rgba(255,60,60,0.4)' : 'rgba(100,255,255,0.35)';
      ctx.beginPath(); ctx.arc(8.5, -11, 4 + Math.sin(t * 6) * 0.8, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      // 天线（冲刺冷却时变暗）
      ctx.strokeStyle = '#333'; ctx.beginPath(); ctx.moveTo(-5, -16); ctx.lineTo(-8, -22); ctx.stroke();
      ctx.fillStyle = this.canDash ? '#fc4' : '#553'; ctx.fillRect(-9.5, -23.5, 3, 3);
      if (this.slimeT > 0) { ctx.fillStyle = 'rgba(140,255,60,0.55)'; ctx.fillRect(-9, -15, 18, 4); }
    }
    ctx.restore();
  },
  // 旋转刷的攻击特效：一圈飞散的刷毛弧线
  drawBrushSwing(ctx, g) {
    const k = 1 - this.atkSwing / (this.atkSwingMax || 0.1), ab = this.attackBox(); if (!ab) return;
    const cx = ab.x + ab.w / 2, cy = ab.y + ab.h / 2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,220,120,${0.8 * (1 - k)})`; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) { const a0 = g.t * 25 + i * 2.1; ctx.beginPath(); ctx.arc(cx, cy, 10 + k * 8, a0, a0 + 1.2); ctx.stroke(); }
    ctx.fillStyle = `rgba(255,240,200,${1 - k})`;
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + g.t * 10; ctx.fillRect(cx + Math.cos(a) * (8 + k * 14), cy + Math.sin(a) * (8 + k * 14), 2, 2); }
    ctx.restore();
  },
});

// ============================================================
//  阿特拉斯：喷气悬停、地面猛击、液压踏地、臂盾
// ============================================================
Object.assign(Player.prototype, {
  // 冲刺键：空中 = 地面猛击，地上 = 液压踏地
  atlasDash(g, I, ctl) {
    if (this.dashLock > 0) { Sound.sfx.denied(); g.hudDeny = 0.6; Input.rumble(0.3, 0, 120); return; }
    if (this.stompCd > 0 || this.slamming) return;
    if (!this.onGround && !this.inWater) {
      this.slamming = true; this.jetOn = false; this.jumping = false; this.vx = 0; this.vy = 900;
      Sound.sfx.dash(); Input.rumble(0.1, 0.4, 80); this.sx = 0.8; this.sy = 1.25;
    } else if (this.onGround) {
      this.stompCd = 0.5; this.sx = 1.25; this.sy = 0.8;
      g.atlasQuake(this, 46, false);
      if (g.matrix) g.matrix.spawnEcho(this, g); // 第三章：踏地留下残影
    }
  },
  // 喷气悬停（在「本地坐标」的普通物理里调用：vy > 0 = 朝脚下）
  updateJet(dt, g, I) {
    this.stompCd -= dt;
    if (this.onGround || this.inWater) { this.fuel = this.C.fuel; this.jetOn = false; if (this.onGround) this.slamming = false; return; }
    if (this.slamming) { this.vx = 0; this.vy = Math.max(this.vy, 900); this.jetOn = false; return; }
    const can = I.down('jump') && this.fuel > 0 && this.dashLock <= 0 && this.slimeT <= 0 && this.vy > -160;
    this.jetOn = can;
    if (!can) return;
    this.vy = approach(this.vy, -95, 2600 * dt); this.fuel = Math.max(0, this.fuel - dt); this.jumping = false;
    if (Math.random() < 0.7) {
      const gd = this.gd || 1, fy = gd > 0 ? this.y + this.h - 4 : this.y + 4;
      g.particles.add({ x: this.cx - this.facing * 9 + rand(-2, 2), y: fy, vx: rand(-20, 20), vy: gd * rand(120, 220), life: rand(0.15, 0.3), size: rand(2, 4), color: Math.random() < 0.5 ? '#ffb040' : '#fff0a0', add: true });
    }
    if (Math.random() < 0.06) Sound.sfx.jet ? Sound.sfx.jet() : null;
  },
  // 猛击落地
  slamLand(g) {
    this.slamming = false; this.stompCd = 0.3; this.sx = 1.4; this.sy = 0.7;
    g.atlasQuake(this, 96, true);
    if (g.matrix) g.matrix.spawnEcho(this, g);
  },
  // 阿特拉斯：高大的黄色工程外骨骼，液压臂、铆钉、背后的喷气背包
  drawAtlas(ctx, x, y, facing, sx, sy, g, tint) {
    const t = g.t;
    ctx.save();
    ctx.translate(Math.round(x + this.w / 2), Math.round(y + this.h));
    ctx.scale(facing * sx, sy);
    const c = tint ? { a: tint, b: tint, d: tint, k: tint, m: tint, v: tint, j: tint } : { a: '#e0a525', b: '#f7c948', d: '#2c2a26', k: '#5b5a55', m: '#8a8880', v: this.dashLock > 0 ? '#f44' : '#ff9a3c', j: '#4a4843' };
    const air = !this.onGround, moving = !air && Math.abs(this.vx) > 20, ph = this.run;
    // 喷气背包（背后）+ 喷口火焰
    ctx.fillStyle = c.j; ctx.fillRect(-15, -27, 7, 16);
    ctx.fillStyle = c.k; ctx.fillRect(-16, -12, 4, 4); ctx.fillRect(-11, -12, 4, 4);
    if (!tint && this.jetOn) {
      ctx.globalCompositeOperation = 'lighter';
      const fl = 8 + Math.random() * 8;
      ctx.fillStyle = 'rgba(255,170,60,0.85)'; ctx.fillRect(-15.5, -8, 3, fl); ctx.fillRect(-10.5, -8, 3, fl);
      ctx.fillStyle = 'rgba(255,245,180,0.9)'; ctx.fillRect(-15, -8, 2, fl * 0.5); ctx.fillRect(-10, -8, 2, fl * 0.5);
      ctx.globalCompositeOperation = 'source-over';
    }
    // 腿：粗壮的液压腿
    let l1 = 0, l2 = 0;
    if (moving) { l1 = Math.sin(ph * 0.8) * 3; l2 = -l1; }
    const leg = (lx, lift) => {
      ctx.fillStyle = c.k; ctx.fillRect(lx, -13 - lift, 7, 9);
      ctx.fillStyle = c.m; ctx.fillRect(lx + 2, -12 - lift, 3, 7); // 液压杆
      ctx.fillStyle = c.a; ctx.fillRect(lx - 1, -5 - lift, 9, 5);  // 脚
      ctx.fillStyle = c.d; ctx.fillRect(lx - 1, -1 - lift, 9, 1);
    };
    leg(-9 + l1, air ? 2 : Math.max(0, l1)); leg(2 + l2, air ? 0 : Math.max(0, l2));
    // 躯干：工程黄 + 黑黄警示条 + 铆钉
    const bob = moving ? Math.abs(Math.sin(ph * 0.8)) * -1 : 0;
    ctx.translate(0, bob);
    ctx.fillStyle = c.a; ctx.fillRect(-10, -28, 20, 16);
    ctx.fillStyle = c.b; ctx.fillRect(-10, -28, 20, 3);
    if (!tint) {
      ctx.save(); ctx.beginPath(); ctx.rect(-10, -16, 20, 4); ctx.clip();
      ctx.fillStyle = '#1e1c19'; for (let i = -12; i < 12; i += 5) { ctx.beginPath(); ctx.moveTo(i, -12); ctx.lineTo(i + 2.5, -12); ctx.lineTo(i + 6.5, -16); ctx.lineTo(i + 4, -16); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = '#6a4a14'; for (const [rx, ry] of [[-8, -24], [7, -24], [-8, -19], [7, -19]]) ctx.fillRect(rx, ry, 1.5, 1.5);
      ctx.fillStyle = '#3a3630'; ctx.fillRect(-3, -24, 7, 5); // 胸口的铭牌
      ctx.fillStyle = '#ffd070'; ctx.fillRect(-2, -23, 5, 1);
    }
    // 头：小小的驾驶舱 + 橙色护目镜
    ctx.fillStyle = c.a; ctx.fillRect(-5, -35, 11, 8);
    ctx.fillStyle = c.d; ctx.fillRect(-5, -35, 11, 1);
    ctx.fillStyle = c.v; ctx.fillRect(0, -33, 6, 3);
    if (!tint) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,150,60,0.35)'; ctx.fillRect(-1, -34, 8, 5); ctx.globalCompositeOperation = 'source-over'; }
    // 肩甲 + 液压臂（出拳时向前伸出）
    ctx.fillStyle = c.b; ctx.fillRect(-12, -29, 7, 6); ctx.fillRect(5, -29, 8, 6);
    const punch = !tint && this.atkSwing > 0 ? Math.sin(Math.min(1, 1 - this.atkSwing / (this.atkSwingMax || 0.2)) * Math.PI) : 0;
    const ax = 8 + punch * 12, ay = this.atkUp ? -36 : this.atkDown ? -6 : -22;
    ctx.fillStyle = c.k; ctx.fillRect(7, -24, 4 + punch * 12, 4);          // 前臂液压杆
    ctx.fillStyle = c.a; ctx.fillRect(ax, ay + (this.atkUp || this.atkDown ? 0 : 0), 7, 7); // 拳头
    ctx.fillStyle = c.d; ctx.fillRect(ax + 5, ay + 1, 2, 5);
    ctx.fillStyle = c.a; ctx.fillRect(-12, -23, 4, 9); ctx.fillStyle = c.a; ctx.fillRect(-13, -15, 6, 5); // 后臂
    if (!tint && this.slimeT > 0) { ctx.fillStyle = 'rgba(140,255,60,0.55)'; ctx.fillRect(-10, -28, 20, 4); ctx.fillRect(-15, -27, 7, 5); }
    ctx.restore();
  },
  // 液压拳的攻击特效：一圈冲击环
  drawFistSwing(ctx, g) {
    const ab = this.attackBox(); if (!ab) return;
    const k = 1 - this.atkSwing / (this.atkSwingMax || 0.2), cx = this.atkDown || this.atkUp ? ab.x + ab.w / 2 : this.facing > 0 ? ab.x + ab.w * 0.6 : ab.x + ab.w * 0.4, cy = ab.y + ab.h / 2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,200,90,${0.8 * (1 - k)})`; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, 8 + k * 22, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,230,${0.9 * (1 - k)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 4 + k * 12, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  },
});

Object.assign(Game, {
  // 阿特拉斯的震地：半径内的敌人受到重击（能破盾）；大猛击还会向两侧放出冲击波、震塌脚下的坍塌石板
  atlasQuake(p, r, big) {
    const fx = p.cx, fy = (p.gd || 1) > 0 ? p.y + p.h : p.y;
    Sound.sfx.heavy(); this.shake(big ? 9 : 4); this.freeze(big ? 0.06 : 0.03); Input.rumble(big ? 0.7 : 0.35, 0.6, big ? 200 : 110);
    this.particles.burst(fx, fy, big ? 22 : 10, { color: ['#c9b88a', '#8a8070', '#ffd070'], smin: 60, smax: big ? 320 : 180, angle: -Math.PI / 2 * (p.gd || 1), spread: 2.6, lmin: 0.2, lmax: 0.5, grav: 700 * (p.gd || 1), szmin: 2, szmax: 5 });
    this.particles.add({ x: fx, y: fy, size: 6, grow: r * 4, life: 0.25, shape: 'ring', color: '#ffd070', add: true });
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
      if (Math.abs(ex - fx) < r + e.w / 2 && Math.abs(ey - fy) < r * 0.6 + e.h / 2) this.strike(e, 'heavy', { x: fx, y: fy });
    }
    if (big) {
      if (p.onGround) for (const dir of [-1, 1]) this.pshots.push(new PShot({ type: 'wave', x: fx + dir * 20, y: fy, vx: dir * 460, r: 12, life: 0.45, kind: 'heavy', pierce: true }));
      // 震塌脚下的坍塌石板（整组立刻开始下落）
      for (const c of this.crumbles) if (c.state === 'idle' && Math.abs(c.x + 16 - fx) < 40 && Math.abs(((p.gd || 1) > 0 ? c.y : c.y + 32) - fy) < 6) { c.onStand(this); for (const o of this.crumbles) if (o.group === c.group && o.state === 'shake') o.t = Math.max(o.t, 0.9); }
    }
  },
  // 臂盾：站在地上时，正面飞来的抛射物会被挡下
  atlasShield(p) {
    if (!p.onGround || p.dead) return;
    const bx = p.facing > 0 ? p.x + p.w - 4 : p.x - 26, box = { x: bx, y: p.y - 6, w: 30, h: p.h + 6 };
    for (const pr of this.projectiles) {
      if (pr.dead || typeof pr.x !== 'number' || typeof pr.y !== 'number') continue;
      if (pr.x < box.x || pr.x > box.x + box.w || pr.y < box.y || pr.y > box.y + box.h) continue;
      const vx = pr.vx || 0; if (vx && Math.sign(vx) === p.facing) continue; // 从背后追上来的不挡
      pr.dead = true; Sound.sfx.block(); this.shake(2);
      this.particles.burst(pr.x, pr.y, 8, { color: ['#ffd070', '#fff'], shape: 'spark', smin: 80, smax: 240, lmin: 0.12, lmax: 0.25, add: true });
      if (!this.shieldHinted) { this.shieldHinted = true; this.toastHint('臂盾挡下了正面飞来的攻击——只在站在地上时有效'); }
    }
  },
});
