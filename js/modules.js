'use strict';
// ============================================================
//  可选角色的「专属武器模块」
//  拉撒路在 6 个地方拿到武器 / 能力（1-4 冲撞模块、1-6 仪仗军刀、1-8 燧发枪、1-10 巨像残刃、2-1 推进囊、2-5 孢子枪）。
//  其他角色在同样的地方拿到自己的模块，用途与拉撒路那一件对应：
//   冲撞 → 冲刺键能力强化    军刀 → 基础攻击强化    燧发枪 → 远程（长按攻击约 0.3 秒松开）
//   残刃 → 破盾 / 重击（长按攻击约 0.6 秒松开）      推进囊 → 空中机动强化    孢子枪 → 群攻 / 无视盾牌
//  模块写进存档的 abilities（键名「角色.槽位」，例如 scrubber.sabre），整个存档共享、按角色分开
// ============================================================
const MOD_SLOTS = ['dashStrike', 'sabre', 'flintlock', 'relicBlade', 'doubleJump', 'sporeGun']; // 获得顺序
const MOD_SOURCE = { dashStrike: '1-4', sabre: '1-6', flintlock: '1-8', relicBlade: '1-10', doubleJump: '2-1', sporeGun: '2-5' };
const MOD_CHARGE = { ranged: 0.3, heavy: 0.6 };
const MODULES = {
  scrubber: {
    color: '255,204,68',
    list: {
      dashStrike: ['连锁弹射', '【1-4 地下仓库】弹射撞碎敌人时，冲击会连带击碎它周围约 2 格内的其他普通敌人。'],
      sabre: ['双刷头', '【1-6 古兵器馆】旋转刷的攻击距离 34 → 44；连续挥动的第三下变成转一整圈的旋转扫，前后都能打到。'],
      flintlock: ['回旋刷头', '【1-8 坍塌天井】按住攻击约 0.3 秒再松开：甩出刷头，飞出约 5 格再飞回来，沿途的敌人都会被击碎。能打落吊灯、击落无人机，会被盾牌挡下。'],
      relicBlade: ['高压蒸汽', '【击败巨像1号】按住攻击约 0.6 秒再松开：高压喷刷，能冲开看守者的盾牌；站在地上时还会向前推出一道蒸汽冲击波。'],
      doubleJump: ['增压吸盘', '【2-1 孵化场入口】空中额外多一次弹射：弹射之后没贴到任何表面，也能再弹一次。'],
      sporeGun: ['清洁泡沫', '【2-5 粘液走廊】旋转扫会向两侧甩出泡沫团，落地留下一滩泡沫，约 1.5 秒内碰到的敌人都会被腐蚀（无视盾牌）。'],
    },
  },
  atlas: {
    color: '245,181,46',
    list: {
      dashStrike: ['液压冲压', '【1-4 地下仓库】液压踏地（地面按冲刺）的范围扩大到约 2.5 格，冷却 0.5 → 0.3 秒。'],
      sabre: ['连击阀', '【1-6 古兵器馆】出拳后马上再按一次攻击，可以紧接着打出第二拳；两拳之后才进入正常冷却。'],
      flintlock: ['火箭拳', '【1-8 坍塌天井】按住攻击约 0.3 秒再松开：发射拳头，直线飞出约 8 格。能打落吊灯、击落无人机，也能破盾。'],
      relicBlade: ['打桩锤', '【击败巨像1号】按住攻击约 0.6 秒再松开：重拳；站在地上时会砸出一次震地，向两侧放出冲击波，还能震塌坍塌石板。'],
      doubleJump: ['扩容燃料罐', '【2-1 孵化场入口】喷气燃料 1.15 → 1.8 秒：悬停更久、爬得更高（落地回满约需 0.8 秒）。'],
      sporeGun: ['震荡核心', '【2-5 粘液走廊】地面猛击放出的冲击波距离翻倍，落点还会留下约 1 秒的震荡区，碰到的敌人都会被震碎（无视盾牌）。'],
    },
  },
  vesper: {
    color: '255,77,109',
    list: {
      dashStrike: ['相位斩', '【1-4 地下仓库】闪现路径上的普通敌人会被切碎；切碎至少一个时，立即恢复闪现。'],
      sabre: ['残像回响', '【1-6 古兵器馆】数据刃挥过的地方，0.3 秒后会由残像再砍一次。'],
      flintlock: ['数据飞刃', '【1-8 坍塌天井】按住攻击约 0.3 秒再松开：射出一道飞刃，飞出约 6 格。能打落吊灯、击落无人机，会被盾牌挡下。'],
      relicBlade: ['格式化', '【击败巨像1号】按住攻击约 0.6 秒再松开：瞬移穿过前方最多 3 格，路径上的敌人全部被斩开（能破盾）。'],
      doubleJump: ['二次闪现', '【2-1 孵化场入口】空中闪现次数 1 → 2。'],
      sporeGun: ['回溯爆破', '【2-5 粘液走廊】回溯时，在离开的位置引爆一次数据爆破：半径约 2 格内的敌人都会被击碎（无视盾牌）。'],
    },
  },
  eva: {
    color: '255,154,60',
    list: {
      dashStrike: ['拖拽钩', '【1-4 地下仓库】抓钩钩中普通敌人时，会把它拽过来撞碎（被盾牌挡住的除外）。'],
      sabre: ['双膛信号枪', '【1-6 古兵器馆】信号枪的射击冷却 0.42 → 0.28 秒。'],
      flintlock: ['燃烧信号弹', '【1-8 坍塌天井】被信号弹打晕的敌人会着火，晕眩结束时直接烧毁——不用再踩头收尾。'],
      relicBlade: ['照明弹', '【击败巨像1号】按住攻击约 0.6 秒再松开：抛出照明弹，落地炸开强光，半径约 3.5 格内的敌人全部晕眩，看守者也会放下盾牌。'],
      doubleJump: ['扑翼', '【2-1 孵化场入口】空中（没挂在绳子上时）按跳跃，可以扑一下滑翔翼向上腾起；每次离地可以用一次。'],
      sporeGun: ['彩烟信号', '【2-5 粘液走廊】信号弹落地或命中时留下一团彩烟，约 1.5 秒内碰到的敌人都会被晕眩。'],
    },
  },
};
// 注册成「能力 · 武器」页里的物品（id：11xx，按角色 × 槽位固定，存档里的「已看过」标记靠它）
Object.keys(MODULES).forEach((ch, ci) => MOD_SLOTS.forEach((s, si) => {
  const m = MODULES[ch].list[s];
  const d = { id: 1100 + ci * 10 + si, slot: 'ability', key: ch + '.' + s, rarity: 'bound', mod: true, char: ch, base: s, name: m[0], desc: m[1], color: MODULES[ch].color };
  ITEMDEFS.push(d); DEF_BY_ID[d.id] = d;
}));
function modDef(ch, s) { const M = MODULES[ch]; return M ? ITEMDEFS.find((d) => d.mod && d.char === ch && d.base === s) : null; }
function hasMod(ch, s) { return Inventory.ability(ch + '.' + s); }
// 这个拾取点对当前角色还有没有东西可拿（拉撒路：原来的武器 / 能力；其他角色：自己的模块）
function pickupWanted(key) {
  const c = (typeof Game !== 'undefined' && Game.charId) || 'lazarus';
  if (c === 'lazarus' || !MODULES[c]) return !Inventory.ability(key);
  return !hasMod(c, key);
}
// 从章节选择直接进入后面的关卡：之前关卡里的模块直接补上（和一路打过来的周目一致）
function grantEarlierModules(ch, levelIndex) {
  if (!MODULES[ch]) return;
  for (const s of MOD_SLOTS) {
    const i = LEVELS.findIndex((L) => L.id === MOD_SOURCE[s]);
    if (i >= 0 && i < levelIndex && !hasMod(ch, s)) Inventory.p.abilities[ch + '.' + s] = true;
  }
  Inventory.save();
}

// ============================================================
//  Player：读取模块、武器参数、蓄力、每帧更新
// ============================================================
Object.assign(Player.prototype, {
  mod(s) { return this.chId !== 'lazarus' && !!MODULES[this.chId] && hasMod(this.chId, s); },
  // 当前武器的实际参数（模块会改距离 / 冷却）
  wpnSpec(wk) {
    const W = WPN[wk];
    if (!W || this.chId === 'lazarus') return W;
    if (wk === 'brush' && this.mod('sabre')) return Object.assign({}, W, { reach: 44, arc: 28 });
    if (wk === 'flare' && this.mod('sabre')) return Object.assign({}, W, { cd: 0.28 });
    return W;
  },
  // 模块蓄力：t1 = 远程（信使没有），t2 = 重击；都没有就不蓄力
  modCharge() {
    if (this.chId === 'lazarus' || !MODULES[this.chId]) return null;
    const t1 = this.chId !== 'eva' && this.mod('flintlock') ? MOD_CHARGE.ranged : 0, t2 = this.mod('relicBlade') ? MOD_CHARGE.heavy : 0;
    return t1 || t2 ? { t1, t2 } : null;
  },
  // 重击：沿用拉撒路重劈的判定框（前方大范围、能破盾）
  startHeavy() {
    this.atkDown = false; this.atkUp = false; this.atkHeavy = true; this.atkSpin = false;
    this.atkT = HEAVY.active; this.atkCd = HEAVY.cd; this.atkCdMax = HEAVY.cd; this.atkHits = new Set(); this.atkSwing = HEAVY.swing; this.atkSwingMax = HEAVY.swing;
  },
  // 每次近战出手之后
  onSwing(g) {
    this.atkSpin = false;
    if (this.chId === 'scrubber' && this.mod('sabre')) {
      this.combo = this.comboT > 0 ? (this.combo || 0) + 1 : 1; this.comboT = 0.5;
      if (this.combo >= 3 && !this.atkDown && !this.atkUp) {
        this.combo = 0; this.atkSpin = true; this.atkT = 0.14; this.atkSwing = 0.18; this.atkSwingMax = 0.18; this.atkCd = 0.26; this.atkCdMax = 0.26;
        Sound.sfx.saw ? Sound.sfx.saw() : Sound.sfx.slash();
        if (this.mod('sporeGun')) g.throwFoam(this);
      }
    } else if (this.chId === 'atlas' && this.mod('sabre')) {
      if (this.comboT > 0) { this.comboT = 0; this.atkCd = 0.55; this.atkCdMax = 0.55; } // 第二拳之后：正常冷却稍长一点
      else { this.comboT = 0.45; this.atkCd = 0.18; this.atkCdMax = 0.18; }            // 第一拳之后可以马上接第二拳
    } else if (this.chId === 'vesper' && this.mod('sabre')) {
      const b = this.attackBox(); if (b) (this.echoQ || (this.echoQ = [])).push({ t: 0.3, box: b, hits: new Set() });
    }
  },
  // 每帧：连击计时、残像回响、空中额外次数恢复
  modTick(dt, g) {
    if (this.comboT > 0) this.comboT -= dt;
    const grounded = this.onGround || this.cling || this.inWater;
    if (grounded && this.mod('doubleJump') && (this.C.crawl || this.C.blink)) this.bonusDash = 1;
    if (grounded) this.flap = this.mod('doubleJump') && this.C.glide ? 1 : 0;
    if (this.echoQ && this.echoQ.length) {
      for (const q of this.echoQ) {
        q.t -= dt;
        if (q.t <= 0 && !q.done) {
          q.done = true; q.fx = 0.18;
          Sound.sfx.slash();
          for (const e of g.enemies) if (e.alive && overlap(q.box, e) && !q.hits.has(e)) { q.hits.add(e); g.strike(e, 'blade'); }
          if (g.boss && g.boss.slashed && g.boss.active) g.boss.slashed(g, q.box);
        }
        if (q.done) q.fx -= dt;
      }
      this.echoQ = this.echoQ.filter((q) => !q.done || q.fx > 0);
    }
  },
  // 模块自带的额外绘制（残像回响的红框）
  drawMods(ctx, g) {
    if (!this.echoQ) return;
    for (const q of this.echoQ) {
      const b = q.box, a = q.done ? q.fx / 0.18 : 0.25 + 0.2 * Math.sin(g.t * 30);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,77,109,${q.done ? 0.45 * a : 0.08})`; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = `rgba(255,160,180,${a})`; ctx.lineWidth = 1; ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      ctx.globalCompositeOperation = 'source-over';
    }
  },
  // 阿特拉斯：喷气燃料上限
  maxFuel() { return (this.C.fuel || 0) * (this.mod('doubleJump') ? 1.8 / 1.15 : 1); },
});

// ============================================================
//  Game：模块的攻击
// ============================================================
Object.assign(Game, {
  // 拾取点：其他角色拿到自己的模块
  pickupModule(key) {
    const ch = this.charId, d = modDef(ch, key); if (!d) return;
    Inventory.unlockAbility(ch + '.' + key);
    if (key === 'relicBlade') for (const s of ['dashStrike', 'sabre']) if (!hasMod(ch, s)) Inventory.unlockAbility(ch + '.' + s); // 和拉撒路一样：巨像之后前面的也补上
    Sound.sfx.unlock(); this.flash(0.8, '#ffe8b0'); this.shake(8); this.freeze(0.15);
    this.particles.burst(this.player.cx, this.player.cy, 40, { color: [`rgb(${d.color})`, '#fff', '#fc6'], smin: 80, smax: 360, lmin: 0.5, lmax: 1.2, add: true });
    Input.rumble(1, 1, 500);
    this.toast(tr('获得模块 · %{name}', { name: tr(d.name) }), tr(d.desc).replace(/^(【.+?】|\[[^\]]+\]\s*)/, '')); // 去掉开头的获得地点
    if (key === 'relicBlade') this.bossDoneT = Math.min(this.bossDoneT, 0);
  },
  // 远程（长按约 0.3 秒松开）
  modRanged(p) {
    const f = p.facing, gd = p.gd || 1, mx = p.cx + f * 16, my = p.cy;
    p.atkCd = Math.max(p.atkCd, 0.3); p.atkCdMax = 0.3;
    if (p.chId === 'scrubber') {
      this.pshots.push(new PShot({ type: 'boom', x: mx, y: my, vx: f * 620, vy: 0, r: 8, life: 1.6, kind: 'shot', pierce: true, owner: p, colors: ['#fc4', '#fff'] }));
      Sound.sfx.throw();
    } else if (p.chId === 'atlas') {
      this.pshots.push(new PShot({ type: 'rocket', x: mx, y: my - gd * 4, vx: f * 760, vy: 0, r: 9, life: 0.34, kind: 'heavy', colors: ['#ffb040', '#fff0a0', '#f5b52e'] }));
      Sound.sfx.cannon ? Sound.sfx.cannon() : Sound.sfx.gunshot(); this.shake(4); p.vx -= f * (p.onGround ? 120 : 220);
    } else if (p.chId === 'vesper') {
      this.pshots.push(new PShot({ type: 'dblade', x: mx, y: my, vx: f * 680, vy: 0, r: 7, life: 0.29, kind: 'shot', colors: ['#ff4d6d', '#ffd0da'] }));
      Sound.sfx.slash(); Sound.sfx.echo && Sound.sfx.echo();
    }
    Input.rumble(0.1, 0.3, 60);
    this.particles.burst(mx, my, 8, { color: [`rgb(${MODULES[p.chId].color})`, '#fff'], shape: 'spark', smin: 60, smax: 200, lmin: 0.1, lmax: 0.25, add: true });
  },
  // 重击（长按约 0.6 秒松开）
  modHeavy(p) {
    if (p.chId === 'eva') return this.throwFlareBomb(p);
    p.startHeavy();
    if (p.chId === 'scrubber') {
      this.heavySlash(p); // 地面上放出冲击波
      this.particles.burst(p.cx + p.facing * 36, p.cy, 22, { color: ['rgba(230,240,255,0.7)', 'rgba(200,220,235,0.5)'], shape: 'glow', smin: 60, smax: 260, angle: p.facing > 0 ? 0 : Math.PI, spread: 0.5, grow: 14, lmin: 0.3, lmax: 0.6 });
    } else if (p.chId === 'atlas') {
      Sound.sfx.heavy(); this.freeze(0.05);
      if (p.onGround) this.atlasQuake(p, 96, true); else { this.shake(5); Input.rumble(0.5, 0.5, 140); }
    } else if (p.chId === 'vesper') {
      this.formatSlash(p);
    }
  },
  // 小扫：旋转扫甩出两团泡沫（落地留下泡沫，腐蚀、无视盾牌）
  throwFoam(p) {
    for (const d of [-1, 1]) this.pshots.push(new PShot({ type: 'spore', x: p.cx + d * 10, y: p.cy - 4 * (p.gd || 1), vx: d * 240, vy: -260 * (p.gd || 1), grav: 900 * (p.gd || 1), r: 5, life: 1.0, kind: 'spore', foam: true, colors: ['#e8f4ff', '#9fd8ff'] }));
  },
  // 小扫：弹射撞碎敌人时连带周围的敌人
  chainKill(e) {
    const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
    for (const o of this.enemies) {
      if (!o.alive || o === e) continue;
      if (Math.hypot(o.x + o.w / 2 - ex, o.y + o.h / 2 - ey) > 72) continue;
      if (this.strike(o, 'dash') === 'kill') this.bolts.push({ x1: ex, y1: ey, x2: o.x + o.w / 2, y2: o.y + o.h / 2, t: 0, life: 0.25, w: 2 });
    }
  },
  // 赤影：格式化——向前瞬移最多 3 格，斩开路径上的敌人（能破盾）
  formatSlash(p) {
    const W = this.world, f = p.facing, x0 = p.x;
    let x = x0;
    for (let d = 8; d <= 96; d += 8) { const nx = x0 + f * d; if (!p.spotFree(W, nx, p.y)) break; x = nx; }
    const lo = Math.min(x0, x), hi = Math.max(x0, x) + p.w, box = { x: lo - (f < 0 ? 40 : 0), y: p.y - 10, w: hi - lo + 40, h: p.h + 20 };
    const from = p.cx;
    p.x = x; p.invulnT = 0.2; p.vx = f * 180;
    for (const e of this.enemies) if (e.alive && overlap(box, e) && !p.atkHits.has(e)) { p.atkHits.add(e); this.strike(e, 'heavy'); }
    if (this.boss && this.boss.slashed && this.boss.active) this.boss.slashed(this, box);
    Sound.sfx.heavy(); Sound.sfx.echo && Sound.sfx.echo(); this.shake(6); this.freeze(0.06); Input.rumble(0.5, 0.6, 140);
    for (let i = 0; i <= 10; i++) this.particles.add({ x: lerp(from, p.cx, i / 10) + rand(-4, 4), y: p.cy + rand(-10, 10), vx: rand(-30, 30), vy: rand(-30, 30), life: rand(0.2, 0.45), size: rand(2, 4), color: Math.random() < 0.5 ? '#ff4d6d' : '#fff', add: true });
  },
  // 赤影：回溯爆破
  rewindBlast(x, y) {
    const R = 64;
    Sound.sfx.explode(); this.shake(6); this.freeze(0.04);
    this.particles.add({ x, y, size: 8, grow: R * 5, life: 0.3, shape: 'ring', color: '#ff4d6d', add: true });
    this.particles.burst(x, y, 24, { color: ['#ff4d6d', '#ffd0da', '#fff'], shape: 'spark', smin: 80, smax: 300, lmin: 0.2, lmax: 0.45, add: true });
    for (const e of this.enemies) if (e.alive && Math.hypot(e.x + e.w / 2 - x, e.y + e.h / 2 - y) < R + Math.max(e.w, e.h) / 2) this.strike(e, 'spore');
  },
  // 信使：照明弹
  throwFlareBomb(p) {
    const f = p.facing, gd = p.gd || 1;
    p.atkCd = Math.max(p.atkCd, 0.5); p.atkCdMax = 0.5;
    this.pshots.push(new PShot({ type: 'flarebomb', x: p.cx + f * 12, y: p.cy - gd * 6, vx: f * 360, vy: -420 * gd, grav: 1100 * gd, r: 6, life: 1.6, kind: 'flare', colors: ['#fff', '#ffe0a0', '#ff9a3c'] }));
    Sound.sfx.throw(); Input.rumble(0.1, 0.3, 60);
  },
  flareBurst(x, y) {
    const R = 112, p = this.player, burn = p.mod && p.mod('flintlock');
    Sound.sfx.flare(); Sound.sfx.explode(); this.flash(0.35, '#fff6d8'); this.shake(5);
    this.particles.add({ x, y, size: 10, grow: R * 5, life: 0.35, shape: 'ring', color: '#fff0c0', add: true });
    this.particles.burst(x, y, 30, { color: ['#fff', '#ffe0a0', '#ff9a3c'], shape: 'spark', smin: 100, smax: 360, lmin: 0.25, lmax: 0.6, add: true });
    for (const e of this.enemies) {
      if (!e.alive || Math.hypot(e.x + e.w / 2 - x, e.y + e.h / 2 - y) > R + Math.max(e.w, e.h) / 2) continue;
      if (e.onStrike || e instanceof Chandelier) continue; // 机关、软体怪等：照明弹不起作用
      e.stunT = Math.max(e.stunT || 0, 3); if (burn) e.burn = true; // 看守者也会晕眩（放下盾牌，可以踩头）
    }
  },
});
