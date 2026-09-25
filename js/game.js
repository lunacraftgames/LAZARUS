'use strict';
// ============================================================
//  主循环 / 状态机 / 关卡加载 / HUD / 界面
// ============================================================
const Game = {
  canvas: null, ctx: null, k: 1,
  state: 'boot', t: 0, stateT: 0,
  levelIndex: 0, level: null, world: null, tileCanvas: null,
  player: null, enemies: [], enemySpawns: [], props: [], crumbles: [], movers: [], projectiles: [], bolts: [],
  particles: new Particles(), boss: null, exhibit: null,
  cam: { x: 0, y: 0, shake: 0 },
  checkpoint: null, permDead: new Set(),
  deaths: 0, chips: new Set(), runTime: 0, levelT: 0,
  radio: { queue: [], cur: null, glitch: 0 },
  toasts: [], freezeT: 0, flashA: 0, flashC: '#fff', alarmFlash: 0, hudDeny: 0,
  hot: [], menuSel: 0, pauseSel: 0, storyIdx: 0, storyT: 0, cardT: 0, deadT: 0, clearT: 0, endT: 0, bossDoneT: -1,

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    Input.init(); Art.init(); Inventory.init();
    Inventory.onGrant = (d, src) => this.onItemGrant(d, src);
    Input.onPadChange = (on, name) => { this.toasts.push({ title: on ? '手柄已连接' : '手柄已断开', text: name + (on ? ' · 按键提示已切换' : ''), t: 0, short: true, color: on ? '#7ff' : '#f96' }); };
    this.resize(); addEventListener('resize', () => this.resize());
    // 鼠标 / 触屏点击：菜单项在绘制时登记可点击区域（this.hot）
    const toGame = (e) => { const r = this.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * VW, y: (e.clientY - r.top) / r.height * VH }; };
    const hitHot = (p) => { for (let i = this.hot.length - 1; i >= 0; i--) { const h = this.hot[i]; if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return h; } return null; };
    this.canvas.addEventListener('pointermove', (e) => {
      const pt = toGame(e), h = hitHot(pt);
      this.canvas.style.cursor = h ? 'pointer' : 'default';
      if (h && h.hover && e.pointerType === 'mouse') h.hover(pt);
      if (h && h.drag && (e.buttons & 1)) h.drag(pt); // 拖动滑块
    });
    this.canvas.addEventListener('pointerdown', (e) => {
      Sound.init();
      const pt = toGame(e), h = hitHot(pt);
      if (h) { if (h.hover) h.hover(pt); h.click(pt); return; }
      if (['story', 'end'].includes(this.state)) Input.setVirt('confirm', true);
    });
    this.canvas.addEventListener('pointerup', () => Input.setVirt('confirm', false));
    this.setupTouch();
    const s = Save.load();
    if (s) { this.deaths = s.deaths || 0; this.chips = new Set(s.chips || []); this.runTime = s.time || 0; }
    for (const id of this.chips) Inventory.p.chipLog[id] = 1; // 旧存档：把本周目已收集的芯片计入收藏
    this.checkChipRewards();
    this.toTitle();
    let last = performance.now(), acc = 0;
    const STEP = 1 / 120;
    const frame = (now) => {
      let dt = (now - last) / 1000; last = now; if (dt > 0.1) dt = 0.1;
      acc += dt;
      while (acc >= STEP) { this.update(STEP); acc -= STEP; }
      this.render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  },
  resize() {
    const s = Math.min(innerWidth / VW, innerHeight / VH);
    this.canvas.style.width = Math.floor(VW * s) + 'px'; this.canvas.style.height = Math.floor(VH * s) + 'px';
    this.k = Math.min(2, Math.max(1, s * (window.devicePixelRatio || 1)));
    this.canvas.width = Math.round(VW * this.k); this.canvas.height = Math.round(VH * this.k);
  },
  setupTouch() {
    const el = document.getElementById('touch');
    const show = () => { el.style.display = 'block'; };
    addEventListener('touchstart', show, { once: true });
    el.querySelectorAll('[data-act]').forEach((b) => {
      const acts = b.dataset.act.split(',');
      const on = (e) => { e.preventDefault(); Sound.init(); acts.forEach((a) => Input.setVirt(a, true)); b.classList.add('on'); };
      const off = (e) => { e.preventDefault(); acts.forEach((a) => Input.setVirt(a, false)); b.classList.remove('on'); };
      b.addEventListener('touchstart', on, { passive: false }); b.addEventListener('touchend', off, { passive: false }); b.addEventListener('touchcancel', off, { passive: false });
    });
  },

  // ---------------- 工具 ----------------
  shake(a) { this.cam.shake = Math.max(this.cam.shake, a); if (a >= 3) Input.rumble(Math.min(1, a / 22), Math.min(1, a / 14), 60 + a * 12); },
  freeze(t) { this.freezeT = Math.max(this.freezeT, t); },
  flash(a, c) { this.flashA = Math.max(this.flashA, a); this.flashC = c || '#fff'; },
  say(lines) {
    for (const [who, text] of lines) this.radio.queue.push({ who, text, t: 0 });
  },
  toast(title, text) { this.toasts.push({ title, text, t: 0 }); },
  toastHint(text) { if (!this.hintT || this.t - this.hintT > 4) { this.hintT = this.t; this.toasts.push({ title: '提示', text, t: 0, short: true }); } },
  persist() { Inventory.save(); Save.save({ level: this.levelIndex, deaths: this.deaths, chips: [...this.chips], time: this.runTime }); },

  // ---------------- 状态切换 ----------------
  toTitle() {
    this.state = 'title'; this.stateT = 0; this.menuSel = 0; Sound.music('radio');
    const s = Save.load();
    const m = [];
    const cont = s && s.level > 0 && s.level < LEVELS.length;
    if (cont) m.push({ label: `继续游戏 · ${LEVELS[s.level].id} ${LEVELS[s.level].name}`, act: 'continue', lv: s.level });
    m.push({ label: cont ? '新的游戏' : '开始游戏', act: 'new' });
    if (Inventory.p.ch1Clear) m.push({ label: '章节选择', act: 'select' });
    this.titleCh = cont ? chapterOf(LEVELS[s.level]) : 1;
    if (Inventory.p.hiddenEnd) m.push({ label: '隐藏结局 · 记忆全集', act: 'hidden' });
    m.push({ label: '仓库 · 武器与外观', act: 'inv' });
    m.push({ label: '按键设置', act: 'keys' });
    m.push({ label: '声音设置', act: 'audio' });
    this.menu = m; this.menuSel = Math.min(this.menuSel, m.length - 1);
  },
  newGame() {
    this.deaths = 0; this.chips = new Set(); this.runTime = 0; Save.clear();
    this.playStory(1);
  },
  // 播放某章开场剧情，结束后进入该章第一关
  playStory(ch) {
    this.storyCh = ch; this.storyLines = CHAPTERS[ch].story; this.storyDone = null;
    this.state = 'story'; this.stateT = 0; this.storyIdx = 0; this.storyT = 0; Sound.music('radio');
  },
  get chapter() { return this.level ? chapterOf(this.level) : 1; },

  startLevel(i, short) {
    this.levelIndex = i;
    const def = LEVELS[i]; this.level = def;
    const B = makeBuilder(def.w, def.h); def.build(B);
    const grid = B.grid.map((r) => r.slice());
    this.enemySpawns = []; this.props = []; this.crumbles = []; this.movers = []; this.projectiles = []; this.bolts = []; this.pshots = [];
    this.matrix = null; // 第三章控制器（拉撒路残影 / 延迟力场），由关卡自己创建
    this.core = null;   // 第四章控制器（重力反转 / 维度重写 / 断网），由关卡自己创建
    this.noAttack = false; this.bossSave = null; // Boss 可以剥夺攻击键；bossSave = Boss 的阶段存档（死亡后从该阶段重来）
    const occ = new Set(); let spawn = { cx: 3, cy: 3 }, crumbleGroup = 0, laserIdx = 0, chipIdx = 0;
    const lateProps = [];
    for (let y = 0; y < def.h; y++) {
      for (let x = 0; x < def.w; x++) {
        const c = grid[y][x];
        if ('#=-^v '.includes(c)) continue;
        grid[y][x] = ' '; occ.add(x + ',' + y);
        switch (c) {
          case 'S': spawn = { cx: x, cy: y }; break;
          case 'C': if (!(x > 0 && B.grid[y][x - 1] === 'C')) crumbleGroup++; this.crumbles.push({ x, y, g: crumbleGroup }); break;
          case 'T': lateProps.push(() => new Spring(x, y)); break;
          case 'K': lateProps.push(() => new Checkpoint(x, y)); break;
          case 'E': lateProps.push(() => new Exit(x, y)); break;
          case 'o': { const id = def.id + '#' + chipIdx++; if (!this.chips.has(id)) lateProps.push(() => new Chip(x, y, id)); break; }
          case 'L': { const idx = laserIdx++; lateProps.push(() => new LaserGate(x, y, idx, this.world)); break; }
          case 'H': case 'V': this.movers.push({ x, y, c }); break;
          case 'A': case 'B': case 'D': case 'F': case 'Z': { const key = { A: 'dashStrike', B: 'sabre', D: 'doubleJump', F: 'flintlock', Z: 'sporeGun' }[c]; if (!Inventory.ability(key)) lateProps.push(() => new AbilityPickup(x * TILE + 16, (y + 1) * TILE, key)); break; }
          default:
            if (PROP_FACTORIES[c]) { const f = PROP_FACTORIES[c]; lateProps.push(() => f(x, y, this)); break; }
            this.enemySpawns.push({ id: def.id + ':' + x + ',' + y, type: c, cx: x, cy: y });
        }
      }
    }
    // 构建函数登记的额外敌人（例如第三章的死锁黑客：带多个瞬移点）
    (B.spawns || []).forEach((s, i) => this.enemySpawns.push(Object.assign({ id: def.id + ':' + s.type + '#' + i }, s)));
    this.world = new World(grid, B.water);
    this.crumbles = this.crumbles.map((c) => { const o = new Crumble(c.x, c.y, c.g); this.world.solids.push(o.solid); return o; });
    this.movers = this.movers.map((m) => { const o = new Mover(m.x, m.y, m.c); this.world.solids.push(o.solid); return o; });
    this.props = lateProps.map((f) => f()).filter(Boolean);
    for (const f of B.extra || []) { const o = f(this); if (o) this.props.push(o); } // 构建函数登记的物件（代码门、红外线等）
    this.tileCanvas = renderTiles(this.world, occ, def.theme.tiles);
    this.permDead = new Set();
    this.checkpoint = { x: spawn.cx * TILE + 6, y: (spawn.cy + 1) * TILE - 28 };
    this.player = new Player(this.checkpoint.x, this.checkpoint.y);
    this.player.spawnT = 0.45;
    this.radioTriggers = def.radio.map((r) => Object.assign({ fired: false }, r));
    this.radio.queue = []; this.radio.cur = null;
    this.levelT = 0; this.cardT = 0; this.bossDoneT = -1; this.bossOverloads = 0; this.alarmSrc = null; this.levelDeaths0 = this.deaths; this.pickup = null;
    if (this.boss) this.boss.stopSounds();
    this.boss = null; this.exhibit = null;
    if (def.boss) this.setupBoss(!!short);
    this.spawnEnemies();
    this.state = 'play'; this.stateT = 0;
    this.snapCamera();
    Sound.music(def.music);
    this.persist();
  },
  setupBoss(short) {
    if (this.exhibit) this.world.solids = this.world.solids.filter((s) => s !== this.exhibit.solid);
    if (this.boss) this.boss.stopSounds();
    if (this.boss && this.boss.mobs) this.enemies = this.enemies.filter((e) => !this.boss.mobs.includes(e));
    if (this.level.boss === 'incubator') { this.exhibit = null; this.boss = new Incubator(this, short); return; }
    if (this.level.boss === 'mirror') { this.exhibit = null; this.boss = new MirrorLazarus(this, short); return; }
    if (this.level.boss === 'omni') { this.exhibit = null; this.boss = new OmniMind(this, short); return; }
    this.exhibit = new ExhibitCase(this);
    this.boss = new Colossus(this, short);
  },
  spawnEnemies() {
    this.enemies = this.enemySpawns.filter((s) => !this.permDead.has(s.id)).map((s) => { const e = makeEnemy(s, this.world); e.id = s.id; return e; });
  },
  activateCheckpoint(cp) {
    for (const p of this.props) if (p instanceof Checkpoint) p.active = false;
    cp.active = true; cp.t = 0;
    this.checkpoint = cp.spawn;
    for (const e of this.enemies) if (!e.alive) this.permDead.add(e.id);
    Sound.sfx.checkpoint();
    this.particles.burst(cp.x + 14, cp.y + 16, 24, { color: ['#5f8', '#bfb', '#fff'], smin: 40, smax: 200, lmin: 0.4, lmax: 0.9, add: true });
    this.toast('备份完成', '拉撒路协议已将你的数据写入此终端。');
  },
  collectChip(c) {
    this.chips.add(c.id); Sound.sfx.pickup();
    this.particles.burst(c.x + 8, c.y + 8, 18, { color: ['#fc6', '#fff', '#fa4'], smin: 40, smax: 180, lmin: 0.3, lmax: 0.7, add: true });
    const ch = this.chapter, n = chipsIn(this.chips, ch), lore = CHAPTERS[ch].lore;
    this.toast(`记忆芯片 ${n} / ${chipTotal(ch)}`, lore[(n - 1) % lore.length]);
    Inventory.p.chipLog[c.id] = 1;
    this.checkChipRewards();
    this.persist();
  },
  // ---- 记忆芯片收藏（跨周目累计）：集齐一章 → 成就 + 专属外观；四章全部集齐 → 解锁隐藏结局 ----
  chipLogIn(ch) { return chipsIn(Object.keys(Inventory.p.chipLog), ch); },
  checkChipRewards() {
    const P = Inventory.p, S = typeof window !== 'undefined' && window.LAZARUS_STEAM;
    let all = true;
    for (let ch = 1; CHAPTERS[ch]; ch++) {
      if (this.chipLogIn(ch) < chipTotal(ch)) { all = false; continue; }
      if (P.chipDone[ch]) continue;
      P.chipDone[ch] = true;
      const d = ITEMDEFS.find((x) => x.chipReward === ch);
      if (d && !Inventory.owns(d.id)) Inventory.addLocalCopy(d.id, '记忆芯片收藏');
      this.toasts.push({ title: `成就解锁 · ${CH_NUM[ch]}「${CHAPTERS[ch].name}」记忆全集`, text: `集齐本章全部 ${chipTotal(ch)} 枚记忆芯片` + (d ? ` · 获得专属外观「${d.name}」` : ''), t: 0, color: '#fc6' });
      if (S && S.setAchievement) S.setAchievement('CHIPS_CH' + ch);
    }
    if (all && !P.hiddenEnd) {
      P.hiddenEnd = true;
      this.toasts.push({ title: '隐藏结局已解锁', text: '全部记忆芯片已归位 · 通关最终章后，或在标题画面「隐藏结局」中观看', t: 0, color: '#f6c' });
      if (S && S.setAchievement) S.setAchievement('CHIPS_ALL');
    }
    Inventory.save();
  },
  killEnemy(e) {
    e.alive = false; Sound.sfx.stomp(); this.shake(4); this.freeze(0.04);
    this.particles.burst(e.x + e.w / 2, e.y + e.h / 2, 16, { color: e.colors || ['#888', '#aaa'], smin: 60, smax: 260, grav: 900, lmin: 0.4, lmax: 0.9, szmin: 2, szmax: 5 });
    this.particles.burst(e.x + e.w / 2, e.y + e.h / 2, 8, { color: ['#fa4', '#fff'], shape: 'spark', smin: 100, smax: 300, lmin: 0.15, lmax: 0.3, add: true });
  },
  stompBounce(mul) {
    const p = this.player, m = mul || 1;
    p.vy = (Input.down('jump') ? -700 : -470) * m * (p.gd || 1); p.jumping = Input.down('jump'); p.canDash = true; p.dashT = 0; p.jumpsLeft = 1;
    p.sx = 0.8; p.sy = 1.25;
  },
  explosion(x, y, r) {
    Sound.sfx.explode(); this.shake(7);
    this.particles.burst(x, y, 20, { color: ['#fa4', '#ff6', '#f52', '#fff'], smin: 40, smax: 240, lmin: 0.2, lmax: 0.5, add: true, szmin: 3, szmax: 7 });
    this.particles.burst(x, y, 10, { color: ['rgba(70,70,70,0.6)'], shape: 'glow', smin: 20, smax: 80, lmin: 0.5, lmax: 1.0, grow: 20, szmin: 6, szmax: 10 });
    this.particles.add({ x, y, size: 6, grow: r * 5, life: 0.25, shape: 'ring', color: '#fc8', add: true });
    if (this.state === 'play' && Math.hypot(this.player.cx - x, this.player.cy - y) < r + 6) this.killPlayer('bomb');
  },
  killPlayer() {
    if (this.state !== 'play') return;
    const p = this.player;
    this.state = 'dead'; this.deadT = 0; p.dead = true; this.deaths++;
    Sound.sfx.death(); this.shake(12); Input.rumble(0.9, 0.7, 380); this.flash(0.35, '#f33'); this.freeze(0.08);
    this.particles.burst(p.cx, p.cy, 26, { color: ['#6b6848', '#86825a', '#2a2826', '#8a5234'], smin: 80, smax: 360, grav: 1000, lmin: 0.6, lmax: 1.2, szmin: 2, szmax: 5 });
    this.particles.burst(p.cx, p.cy, 16, { color: ['#7ff', '#fff'], shape: 'spark', smin: 150, smax: 420, lmin: 0.2, lmax: 0.5, add: true });
    if (this.boss) this.boss.stopSounds();
    this.persist();
  },
  respawn() {
    for (const c of this.crumbles) c.reset();
    for (const pr of this.props) if (pr.onRespawn) pr.onRespawn(this);
    this.projectiles = []; this.bolts = []; this.pshots = [];
    this.spawnEnemies();
    if (this.level.boss && this.boss && this.boss.active) this.setupBoss(true);
    this.player.reset(this.checkpoint.x, this.checkpoint.y);
    this.player.spawnT = 0.45;
    this.state = 'play'; Sound.sfx.respawn();
    this.snapCamera();
    this.particles.burst(this.player.cx, this.player.cy, 20, { color: ['#7ff', '#fff'], smin: 20, smax: 120, lmin: 0.3, lmax: 0.6, add: true });
  },
  levelClear() {
    this.state = 'clear'; this.clearT = 0; Sound.sfx.clear();
    if (this.deaths === this.levelDeaths0) { this.toast('零重构通关', '一次都没有被摧毁——获得额外补给。'); Inventory.drop(9003); }
    else if (Math.random() < 0.25) Inventory.drop(9002);
    this.levelIndex = Math.min(this.levelIndex + 1, LEVELS.length - 1);
    Save.save({ level: this.levelIndex, deaths: this.deaths, chips: [...this.chips], time: this.runTime });
  },
  onBossDefeated() {
    const ch = this.chapter;
    this.bossDoneT = 0; Sound.music('ending');
    Inventory.p['ch' + ch + 'Clear'] = true; Inventory.save();
    if (this.deaths === this.levelDeaths0) setTimeout(() => Inventory.drop(9003), 2400);
    if (ch === 2) {
      this.say(RADIO.incDefeat);
      setTimeout(() => Inventory.drop(9005), 1200);
      return;
    }
    if (ch === 3) {
      this.say(RADIO.mirrorDefeat);
      setTimeout(() => Inventory.drop(9006), 1200);
      return;
    }
    if (ch === 4) {
      this.say(RADIO.omniDefeat);
      setTimeout(() => Inventory.drop(9007), 1200);
      return;
    }
    this.say(RADIO.bossDefeat);
    setTimeout(() => Inventory.drop(9001), 1200);
    if (!Inventory.ability('relicBlade')) this.pickup = new AbilityPickup(clamp(this.boss.x, 120, 840), ARENA.FLOOR, 'relicBlade');
  },
  // 进入 / 离开高密度培养液
  onSplash(p, entering) {
    Sound.sfx.splash();
    const y = Math.round((p.y + (entering ? p.h : 0)) / TILE) * TILE;
    this.particles.burst(p.cx, y, entering ? 14 : 8, { color: ['#7ff', '#bff', '#5ad'], smin: 40, smax: 200, grav: 700, vy: -180, lmin: 0.3, lmax: 0.6, szmin: 2, szmax: 4 });
    if (entering && !this.waterHinted) { this.waterHinted = true; this.toastHint(Input.fmt('培养液中重力很低：可以连续按 {jump} 上浮，但很难刹车')); }
  },
  pickupAbility(key) {
    Inventory.unlockAbility(key);
    if (key === 'relicBlade') { Inventory.unlockAbility('dashStrike'); Inventory.unlockAbility('sabre'); }
    if (WEAPON_KEYS.includes(key)) Inventory.setWeapon(key); // 新武器拿到手就装备上
    Sound.sfx.unlock(); this.flash(0.8, '#ffe8b0'); this.shake(8); this.freeze(0.15);
    this.particles.burst(this.player.cx, this.player.cy, 40, { color: ['#fc6', '#fff', '#fa4'], smin: 80, smax: 360, lmin: 0.5, lmax: 1.2, add: true });
    Input.rumble(1, 1, 500);
    const T = {
      dashStrike: ['获得能力 · 冲撞模块', '{dash} 冲刺撞到的普通敌人会被击碎，并立即恢复冲刺（看守者的盾牌除外）。账号绑定，不可交易。', RADIO.dashGet],
      sabre: ['获得武器 · 仪仗军刀', '{attack} 挥砍；空中按住 ↓ 再挥砍可下劈弹跳；可以劈开炸弹。账号绑定，不可交易。', RADIO.sabreGet],
      flintlock: ['获得武器 · 古董燧发枪', '远程武器：{attack} 开枪，一发一装填。按住 ↑ 朝上打，空中按住 ↓ 朝下打。后坐力会把你往后推。{swap} 切换武器。账号绑定，不可交易。', RADIO.gunGet],
      sporeGun: ['获得武器 · 生物孢子枪', '一次喷出三颗扇形孢子，落地留下孢子云腐蚀敌人，无视盾牌。{swap} 切换武器。账号绑定，不可交易。', RADIO.sporeGet],
      doubleJump: ['获得能力 · 推进囊', '空中再按 {jump} 二段跳；被粘液粘住时无法使用。账号绑定，不可交易。', RADIO.djGet],
      relicBlade: ['获得武器 · 巨像残刃', '挥得慢但距离长，能劈开看守者的盾牌；按住 {attack} 蓄力再松开 = 重劈，地面上还会放出冲击波。{swap} 可以切回仪仗军刀。账号绑定，不可交易。', RADIO.bladeGet],
    }[key];
    this.toast(T[0], Input.fmt(T[1]));
    this.say(T[2]);
    if (key === 'relicBlade') this.bossDoneT = Math.min(this.bossDoneT, 0);
  },
  onItemGrant(d, src) {
    const r = RARITY[d.rarity];
    Sound.sfx.drop(d.rarity);
    if (d.rarity === 'legendary') { this.flash(0.5, '#ffd070'); Input.rumble(0.5, 0.6, 350); }
    this.toasts.push({ title: `${d.tradable ? '掉落' : '获得'} · ${r.name} · ${d.name}`, text: `${SLOTS.find((x) => x.key === d.slot).name} · 来自「${src}」 · ${d.tradable ? '可交易 · 可上架 Steam 市场' : '账号绑定'}`, t: 0, color: r.color, drop: true });
  },
  // 武器 / 冲撞 命中处理：返回 'kill' | 'block' | 'cut'
  // kind：blade 挥砍 | heavy 重劈/冲击波 | dash 冲撞 | shot 子弹/弹反 | spore 孢子；src = 攻击来源位置（远程攻击用）
  strike(e, kind, src) {
    const p = this.player;
    if (e.onStrike) return e.onStrike(this, kind);
    if (e instanceof Chandelier) {
      if (e.state === 'fall') { e.shatter(this); return 'kill'; }
      if (kind !== 'dash') { e.state = 'fall'; e.t = 0; Sound.sfx.clang(); return 'cut'; }
      return 'none';
    }
    if (e.guard && e.guard(src || p, kind)) {
      Sound.sfx.block(); this.shake(3);
      this.particles.burst(e.x + e.w / 2, e.y + e.h / 3, 10, { color: ['#ffd070', '#fff'], shape: 'spark', smin: 100, smax: 280, lmin: 0.15, lmax: 0.3, add: true });
      this.toastHint(kind === 'dash' ? '冲撞被盾牌挡下了——从背后或趁它晕眩时攻击' : kind === 'shot' ? '子弹被盾牌挡下了——从背后打，或者换巨像残刃 / 孢子枪' : '盾牌挡住了军刀——绕到背后，或者换巨像残刃破盾');
      return 'block';
    }
    Sound.sfx.slashHit(); this.killEnemy(e); return 'kill';
  },

  // ---------------- 更新 ----------------
  update(dt) {
    Input.update();
    this.t += dt; this.stateT += dt;
    if (Input.hit('mute')) Sound.toggleMute();
    switch (this.state) {
      case 'title': return this.updateTitle(dt);
      case 'story': return this.updateStory(dt);
      case 'end': return this.updateEnd(dt);
      case 'paused': return this.updatePause(dt);
      case 'inv': return this.updateInventory(dt);
      case 'keys': return this.updateKeys(dt);
      case 'audio': return this.updateAudio(dt);
      case 'select': return this.updateSelect(dt);
      default: return this.updatePlay(dt);
    }
  },
  updateTitle() {
    if (Input.hit('mu')) { this.menuSel = (this.menuSel + this.menu.length - 1) % this.menu.length; Sound.sfx.select(); }
    if (Input.hit('md')) { this.menuSel = (this.menuSel + 1) % this.menu.length; Sound.sfx.select(); }
    // 测试用：数字键 1~0 跳到第一章，Shift + 数字跳到第二章，Alt + 数字跳到第三章，Alt + Shift + 数字跳到第四章
    const shift = !!(Input.raw.ShiftLeft || Input.raw.ShiftRight), alt = !!(Input.raw.AltLeft || Input.raw.AltRight);
    for (let i = 0; i < 10; i++) if (Input.code('Digit' + ((i + 1) % 10))) {
      const ch = alt && shift ? 4 : alt ? 3 : shift ? 2 : 1, base = chapterStart(ch), j = base + i;
      if (base < 0 || j >= LEVELS.length || chapterOf(LEVELS[j]) !== ch) return;
      Sound.init(); Sound.sfx.confirm(); this.startLevel(j); return;
    }
    if (Input.hit('confirm') && this.stateT > 0.3) this.activateTitle();
  },
  activateTitle() {
    Sound.init(); Sound.sfx.confirm();
    const m = this.menu[this.menuSel];
    if (m.act === 'continue') this.startLevel(m.lv);
    else if (m.act === 'select') { this.state = 'select'; this.selSel = 0; this.selCh = this.titleCh || 1; }
    else if (m.act === 'inv') this.openInventory('title');
    else if (m.act === 'hidden') { this.playLines(HIDDEN_END, () => this.toTitle()); Sound.music('ending'); }
    else if (m.act === 'keys') this.openKeys('title');
    else if (m.act === 'audio') this.openAudio('title');
    else this.newGame();
  },
  // 登记一个可点击区域（本帧有效）
  addHot(x, y, w, h, click, hover, drag) { this.hot.push({ x, y, w, h, click, hover, drag }); },
  updateStory(dt) {
    this.storyT += dt;
    const line = this.storyLines[this.storyIdx] || '';
    const full = this.storyT * 22 >= line.length;
    if (Input.hit('skip') || Input.hit('pause') || Input.hit('back')) { Sound.sfx.radioOn(); this.finishStory(); return; }
    if (Input.hit('confirm')) {
      if (!full) this.storyT = line.length / 22 + 0.01;
      else this.advanceStory();
    } else if (full && this.storyT > line.length / 22 + 2.2) this.advanceStory();
    if (!full && Math.floor(this.storyT * 22) % 3 === 0 && Math.random() < 0.3) Sound.sfx.blip();
  },
  advanceStory() {
    this.storyIdx++; this.storyT = 0;
    if (this.storyIdx >= this.storyLines.length) { Sound.sfx.radioOn(); this.finishStory(); }
  },
  // 剧情播完：默认进入该章第一关；playLines 可以指定别的去向（例如结局剧情 → 结算）
  finishStory() { const done = this.storyDone; this.storyDone = null; if (done) done(); else this.startLevel(chapterStart(this.storyCh)); },
  playLines(lines, done) {
    this.storyLines = lines; this.storyDone = done;
    this.state = 'story'; this.stateT = 0; this.storyIdx = 0; this.storyT = 0;
  },
  updateEnd() {
    if (Input.hit('confirm') && this.stateT > 2) this.leaveEnd();
  },
  // 章节结算之后：有下一章就接着播下一章剧情，否则回到标题
  leaveEnd() {
    Sound.sfx.confirm();
    const next = this.endCh + 1;
    if (CHAPTERS[next] && chapterStart(next) >= 0) {
      Save.save({ level: chapterStart(next), deaths: this.deaths, chips: [...this.chips], time: this.runTime });
      this.playStory(next);
      return;
    }
    Save.save({ level: 0, deaths: 0, chips: [], time: 0 }); Save.clear(); this.toTitle();
  },
  updatePause() {
    const opts = 7;
    if (Input.hit('mu')) { this.pauseSel = (this.pauseSel + opts - 1) % opts; Sound.sfx.select(); }
    if (Input.hit('md')) { this.pauseSel = (this.pauseSel + 1) % opts; Sound.sfx.select(); }
    if (Input.hit('pause') || Input.hit('back')) { this.state = 'play'; return; }
    if (Input.hit('confirm')) this.activatePause();
  },
  activatePause() {
    {
      Sound.sfx.confirm();
      if (this.pauseSel === 0) this.state = 'play';
      else if (this.pauseSel === 1) this.openInventory('paused');
      else if (this.pauseSel === 2) this.openKeys('paused');
      else if (this.pauseSel === 3) this.openAudio('paused');
      else if (this.pauseSel === 4) Input.setRumble(!Input.rumbleOn);
      else if (this.pauseSel === 5) this.startLevel(this.levelIndex, true);
      else { if (this.boss) this.boss.stopSounds(); this.toTitle(); }
    }
  },
  updatePlay(dt) {
    if (this.state === 'play' && Input.hit('pause')) { this.state = 'paused'; this.pauseSel = 0; if (this.boss) this.boss.stopSounds(); return; }
    if (this.state === 'play' && Input.hit('restart')) { this.killPlayer(); }
    if (this.state === 'play' && Input.hit('inv')) { if (this.boss) this.boss.stopSounds(); this.openInventory('play'); return; }
    this.updateRadio(dt);
    for (const t of this.toasts) t.t += dt;
    this.toasts = this.toasts.filter((t) => t.t < (t.short ? 2.5 : 4.5));
    this.flashA = Math.max(0, this.flashA - dt * 2.5);
    this.alarmFlash = Math.max(0, this.alarmFlash - dt);
    this.hudDeny = Math.max(0, this.hudDeny - dt);
    this.hudSlime = Math.max(0, (this.hudSlime || 0) - dt);
    this.cardT += dt;
    if (this.freezeT > 0) { this.freezeT -= dt; return; }
    this.levelT += dt;
    if (this.state === 'play') { this.runTime += dt; Inventory.tick(dt); }
    const p = this.player;

    for (const m of this.movers) m.update(dt, this);
    if (this.state === 'play') p.update(dt, this);
    for (const c of this.crumbles) c.update(dt, this);
    for (const pr of this.props) pr.update(dt, this);
    for (const e of this.enemies) if (e.alive) e.update(dt, this);
    if (this.exhibit) this.exhibit.update(dt, this);
    if (this.boss) { this.boss.update(dt, this); this.boss.touchPlayer(this); }
    if (this.pickup) this.pickup.update(dt, this);
    for (const pr of this.projectiles) pr.update(dt, this);
    this.projectiles = this.projectiles.filter((pr) => !pr.dead);
    this.updatePShots(dt);
    for (const b of this.bolts) b.t += dt;
    this.bolts = this.bolts.filter((b) => b.t < b.life);

    if (this.state === 'play') {
      const ab = p.attackBox(), dashStrike = p.dashT > 0 && Inventory.ability('dashStrike');
      for (const e of this.enemies) {
        if (!e.alive || this.state !== 'play') continue;
        // 残刃挥砍
        if (ab && !p.atkHits.has(e) && overlap(ab, e)) {
          p.atkHits.add(e);
          const r = this.strike(e, p.atkHeavy ? 'heavy' : 'blade');
          if (p.atkDown && (r === 'kill' || r === 'block' || r === 'cut')) this.stompBounce(0.9);
          else if (r === 'block') p.vx = -p.facing * 280;
          if (r === 'bounced') continue;
          if (!e.alive) continue;
        }
        if (overlap(p, e)) {
          // 冲撞模块
          if (dashStrike && !(e instanceof Chandelier && e.state !== 'fall')) {
            const r = this.strike(e, 'dash');
            if (r === 'kill') { p.canDash = true; this.freeze(0.05); continue; }
            if (r === 'block') { p.dashT = 0; p.vx = -p.dashDir.x * 340; p.vy = -320; continue; }
            if (r === 'bounced') continue;
          }
          if (overlap(p.hurt(), e) || stompable(p, e, 12)) e.touch(p, this);
        }
      }
      if (ab) {
        const sabre = Inventory.weapon() === 'sabre';
        for (const pr of this.projectiles) {
          if (pr.dead || !(pr.defuse || (typeof SlimeBlob !== 'undefined' && pr instanceof SlimeBlob))) continue;
          if (Math.hypot(pr.x - (ab.x + ab.w / 2), pr.y - (ab.y + ab.h / 2)) >= 34 + (sabre ? 8 : 0)) continue;
          if (sabre) this.parry(pr, p); else if (pr.defuse) pr.defuse(this); else continue; // 军刀：弹反；残刃：直接劈掉
          if (p.atkDown) this.stompBounce(0.8);
        }
        if (this.boss && !p.atkHits.has(this.boss)) this.boss.slashed(this, ab);
      }
      this.checkHazards();
      this.checkTriggers();
    }
    this.updateCamera(dt);
    this.particles.update(dt);

    if (this.state === 'dead') {
      this.deadT += dt;
      if (this.deadT > 0.5 && this.deadT - dt <= 0.5) Sound.sfx.rebuild();
      if (this.deadT > 1.25) this.respawn();
    }
    if (this.state === 'clear') {
      this.clearT += dt;
      if (this.clearT > 2.4) {
        if (this.levelIndex >= LEVELS.length) this.state = 'end';
        else this.startLevel(this.levelIndex);
      }
    }
    if (this.bossDoneT >= 0) {
      this.bossDoneT += dt;
      if (this.bossDoneT > 3 && !this.radio.cur && !this.radio.queue.length && this.state === 'play' && (!this.pickup || this.pickup.got)) {
        const ch = this.chapter;
        const toEnd = () => {
          this.state = 'end'; this.stateT = 0; this.endT = 0; this.endCh = ch;
          const next = chapterStart(ch + 1);
          Save.save({ level: next > 0 ? next : 0, deaths: this.deaths, chips: [...this.chips], time: this.runTime });
        };
        this.bossDoneT = -1;
        // 最终章：先播结局剧情；集齐全部记忆芯片时紧接着播隐藏结局
        const afterEpi = CHAPTERS[ch].end && CHAPTERS[ch].end.final && Inventory.p.hiddenEnd ? () => this.playLines(HIDDEN_END, toEnd) : toEnd;
        if (CHAPTERS[ch].epilogue) { this.playLines(CHAPTERS[ch].epilogue, afterEpi); Sound.music('ending'); }
        else toEnd();
      }
    }
  },
  checkHazards() {
    const p = this.player, w = this.world, hb = p.hurt();
    if (p.y > w.ph + 40 || p.y + p.h < -40) { this.killPlayer('fall'); return; } // 重力反转时也可能从上方掉出世界
    const x0 = Math.floor(hb.x / TILE), x1 = Math.floor((hb.x + hb.w) / TILE);
    const y0 = Math.floor(hb.y / TILE), y1 = Math.floor((hb.y + hb.h) / TILE);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const t = w.tile(cx, cy);
      if (t === '^' && overlap(hb, { x: cx * TILE + 3, y: cy * TILE + 14, w: 26, h: 18 })) { this.killPlayer('spike'); return; }
      if (t === 'v' && overlap(hb, { x: cx * TILE + 3, y: cy * TILE, w: 26, h: 18 })) { this.killPlayer('spike'); return; }
    }
  },
  checkTriggers() {
    const p = this.player;
    for (const r of this.radioTriggers) {
      if (r.fired) continue;
      const okx = r.x == null || p.cx > r.x * TILE;
      const oky = r.y == null || p.cy < r.y * TILE;
      if (okx && oky) { r.fired = true; this.say(r.lines); }
    }
  },
  updateRadio(dt) {
    const R = this.radio;
    if (Input.hit('skip') && R.cur) {
      if (R.cur.t * 30 < R.cur.text.length) R.cur.t = R.cur.text.length / 30; else R.cur = null;
    }
    if (!R.cur && R.queue.length) { R.cur = R.queue.shift(); R.cur.t = 0; R.cur.text = Input.fmt(R.cur.text); if (!R.last || this.t - R.last > 1) Sound.sfx.radioOn(); }
    if (R.cur) {
      const before = Math.floor(R.cur.t * 30); R.cur.t += dt; const now = Math.floor(R.cur.t * 30);
      if (now !== before && now <= R.cur.text.length && now % 2 === 0) Sound.sfx.blip();
      if (R.cur.t > R.cur.text.length / 30 + 1.8 + R.cur.text.length * 0.035) { R.cur = null; R.last = this.t; }
    }
    R.glitch = Math.max(0, R.glitch - dt);
    if (R.cur && R.cur.who === 'EVA' && Math.random() < 0.0025) R.glitch = 0.09;
  },
  snapCamera() { this.cam.shake = 0; this.updateCamera(1, true); },
  updateCamera(dt, snap) {
    const p = this.player, w = this.world, c = this.cam;
    let tx = p.cx - VW / 2 + p.facing * 50, ty = p.cy - VH * 0.55;
    if (p.lookT > 0.35) ty -= 120 * (p.gd || 1); // 站着按住「向上瞄准」：镜头往上看
    tx = clamp(tx, 0, Math.max(0, w.pw - VW)); ty = clamp(ty, 0, Math.max(0, w.ph - VH));
    if (snap) { c.x = tx; c.y = ty; }
    else { c.x += (tx - c.x) * Math.min(1, dt * 5); c.y += (ty - c.y) * Math.min(1, dt * 6); }
    c.shake = Math.max(0, c.shake - dt * 40);
  },

  // ---------------- 绘制 ----------------
  render() {
    const ctx = this.ctx;
    // 掉帧幽灵：画面也跟着「掉帧」（只画四分之一的帧）
    if (this.state === 'play' && this.player && this.player.lagT > 0) { this.lagFrame = (this.lagFrame || 0) + 1; if (this.lagFrame % 4) return; }
    this.hot = [];
    ctx.setTransform(this.k, 0, 0, this.k, 0, 0);
    ctx.imageSmoothingEnabled = true;
    switch (this.state) {
      case 'boot': return;
      case 'title': return this.renderTitle(ctx);
      case 'story': return this.renderStory(ctx);
      case 'end': return this.renderEnd(ctx);
      case 'inv': return this.renderInventory(ctx);
      case 'keys': return this.renderKeys(ctx);
      case 'audio': return this.renderAudio(ctx);
      case 'select': return this.renderSelect(ctx);
      default: this.renderPlay(ctx);
    }
  },
  renderPlay(ctx) {
    const c = this.cam, sh = c.shake;
    const cx = Math.round(c.x + rand(-sh, sh) * 0.5), cy = Math.round(c.y + rand(-sh, sh) * 0.5);
    const view = { x: cx, y: cy };
    drawBackground(ctx, view, this.level.theme, this.t);
    ctx.save(); ctx.translate(-cx, -cy);
    // 瓦片
    const sx = clamp(cx, 0, this.world.pw), sy = clamp(cy, 0, this.world.ph);
    const sw = Math.min(VW, this.world.pw - sx), shh = Math.min(VH, this.world.ph - sy);
    if (sw > 0 && shh > 0) ctx.drawImage(this.tileCanvas, sx, sy, sw, shh, sx, sy, sw, shh);
    const vis = (o, m) => o.x + (o.w || 40) > cx - (m || 60) && o.x < cx + VW + (m || 60) && o.y + (o.h || 40) > cy - (m || 60) - 100 && o.y < cy + VH + (m || 60);
    for (const pr of this.props) if (vis(pr)) pr.draw(ctx, this); // 第三章控制器也是 prop：残影、延迟力场在这里画
    for (const m of this.movers) if (vis(m)) m.draw(ctx, this);
    for (const cr of this.crumbles) if (vis(cr)) cr.draw(ctx, this);
    if (this.exhibit) this.exhibit.draw(ctx, this);
    if (this.boss) this.boss.draw(ctx, this);
    this.drawBossGuide(ctx);
    if (this.pickup) this.pickup.draw(ctx, this);
    for (const e of this.enemies) if (e.alive && vis(e, 200)) e.draw(ctx, this);
    if (this.state !== 'dead' && !this.player.dead) this.player.draw(ctx, this);
    if (this.matrix) this.matrix.drawOver(ctx, this);
    if (this.core) this.core.drawOver(ctx, this);
    if (this.world.water) drawWater(ctx, this.world, view, this.t);
    this.drawAlarmLink(ctx);
    for (const pr of this.projectiles) pr.draw(ctx, this);
    this.drawPShots(ctx);
    this.drawWeaponPop(ctx);
    this.drawBolts(ctx);
    this.particles.draw(ctx, view);
    ctx.restore();

    // 氛围
    ctx.fillStyle = this.level.theme.tint; ctx.fillRect(0, 0, VW, VH);
    ctx.drawImage(Art.vignette, 0, 0);
    if (this.player.dashLock > 0 && this.state === 'play') {
      const a = 0.15 + 0.12 * Math.sin(this.t * 14);
      const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.4, VW / 2, VH / 2, VW * 0.6);
      g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(255,20,20,${a})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    }
    if (this.matrix) this.matrix.drawScreen(ctx, this);
    if (this.core) this.core.drawScreen(ctx, this);
    ctx.drawImage(Art.scan, 0, 0);
    this.drawThreatMarkers(ctx, cx, cy);
    this.drawHUD(ctx);
    if (this.core) this.core.drawHud(ctx, this);
    this.drawRadio(ctx);
    if (this.cardT < 3.2 && this.state !== 'clear') this.drawLevelCard(ctx);
    if (this.flashA > 0) { ctx.globalAlpha = Math.min(1, this.flashA); ctx.fillStyle = this.flashC; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
    if (this.state === 'dead') this.drawRebuild(ctx);
    if (this.state === 'clear') this.drawClear(ctx);
    if (this.state === 'paused') this.drawPause(ctx);
    this.drawToasts(ctx);
  },
  // 巨像1号的打法引导：瞄准时画出激光预警线；展柜充能好时在它头上提示「躲到后面」
  drawBossGuide(ctx) {
    const b = this.boss, cs = this.exhibit;
    if (!(b instanceof Colossus) || !b.active || b.state === 'intro' || !cs || this.state !== 'play') return;
    if (b.state === 'aim') { // 激光预警线
      const e = b.eye(), a = b.worldAngle(), k = Math.min(1, b.t * 2);
      ctx.strokeStyle = `rgba(255,60,40,${0.25 + 0.35 * k})`; ctx.lineWidth = 1.5; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(a) * 1400, e.y + Math.sin(a) * 1400); ctx.stroke(); ctx.setLineDash([]);
    }
    // 展柜充能时的一个小标记（没有文字）：金色箭头，提示它可以用来反击
    const need = (this.bossOverloads || 0) < 2 || this.deaths - this.levelDeaths0 >= 3;
    if (!need || !cs.blocks()) return;
    const x = cs.x + cs.w / 2, y = cs.y - 34 - Math.abs(Math.sin(this.t * 4)) * 6;
    ctx.fillStyle = 'rgba(255,220,120,0.75)';
    ctx.beginPath(); ctx.moveTo(x - 8, y - 10); ctx.lineTo(x + 8, y - 10); ctx.lineTo(x, y); ctx.fill();
  },
  // 冲刺被警报锁定时：从无人机到玩家的红色扫描线 + 玩家头顶的倒计时
  drawAlarmLink(ctx) {
    const p = this.player, A = this.alarmSrc;
    if (!p || p.dead || p.dashLock <= 0) return;
    if (A && A.drone && A.drone.alive) {
      const d = A.drone, a = 0.35 + 0.25 * Math.sin(this.t * 20);
      ctx.strokeStyle = `rgba(255,50,40,${a * Math.min(1, p.dashLock)})`; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(d.x + 14, d.y + 12); ctx.lineTo(p.cx, p.cy); ctx.stroke(); ctx.setLineDash([]);
    }
    const x = p.cx, y = p.y - 16, k = p.dashLock / 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#f44'; ctx.beginPath(); ctx.arc(x, y, 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
    ctx.fillStyle = '#f66'; ctx.font = 'bold 9px ' + FONT; ctx.textAlign = 'center'; ctx.fillText('⚡', x, y + 3); ctx.textAlign = 'left';
  },
  // 画面外的已警报无人机 / 炸弹：在屏幕边缘显示红色提示
  drawThreatMarkers(ctx, cx, cy) {
    const list = [];
    for (const e of this.enemies) if (e.alive && e instanceof Drone && e.alertT > 0) list.push({ x: e.x + 14, y: e.y + 9, kind: '!' });
    for (const pr of this.projectiles) if (pr instanceof Bomb || pr instanceof Cannonball) list.push({ x: pr.x, y: pr.y, kind: '●' });
    for (const m of list) {
      const sx = m.x - cx, sy = m.y - cy, m8 = 18;
      if (sx > 0 && sx < VW && sy > 0 && sy < VH) continue;
      const px = clamp(sx, m8, VW - m8), py = clamp(sy, m8 + 50, VH - m8);
      const a = 0.6 + 0.4 * Math.sin(this.t * 14);
      ctx.fillStyle = `rgba(255,60,50,${a})`; ctx.beginPath(); ctx.arc(px, py, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px ' + FONT; ctx.textAlign = 'center'; ctx.fillText(m.kind, px, py + 5); ctx.textAlign = 'left';
    }
  },
  drawBolts(ctx) {
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const b of this.bolts) {
      const a = 1 - b.t / b.life;
      for (const [w, col] of [[b.w * 4, `rgba(120,220,255,${0.3 * a})`], [b.w, `rgba(230,255,255,${a})`]]) {
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(b.x1, b.y1);
        const n = 10;
        for (let i = 1; i < n; i++) ctx.lineTo(lerp(b.x1, b.x2, i / n) + rand(-18, 18), lerp(b.y1, b.y2, i / n) + rand(-18, 18));
        ctx.lineTo(b.x2, b.y2); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt';
  },
  drawHUD(ctx) {
    const L = this.level, p = this.player;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(12, 12, 210, 44);
    ctx.fillStyle = '#c9b88a'; ctx.font = 'bold 15px ' + FONT; ctx.fillText(`${L.id}  ${L.name}`, 22, 32);
    ctx.fillStyle = 'rgba(200,190,160,0.6)'; ctx.font = '10px ' + MONO; ctx.fillText(L.en, 22, 48);
    // 冲刺状态
    const dx = 232;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(dx, 12, 118, 44);
    ctx.font = '10px ' + MONO; ctx.fillStyle = 'rgba(200,200,200,0.7)'; ctx.fillText('DASH', dx + 10, 28);
    let col = '#6ff', label = 'READY';
    if (p.lockT > 0) { col = (this.t * 10) % 2 < 1 ? '#f35' : '#a13'; label = `LOCK ${p.lockT.toFixed(1)}s`; }
    else if (p.dashLock > 0) { col = (this.t * 10) % 2 < 1 ? '#f33' : '#a11'; label = `ALARM ${p.dashLock.toFixed(1)}s`; }
    else if (!p.canDash) { col = '#666'; label = 'USED'; }
    ctx.fillStyle = col; ctx.fillRect(dx + 10, 34, 98 * (p.lockT > 0 ? p.lockT / 1.5 : p.dashLock > 0 ? p.dashLock / 2 : 1), 6);
    ctx.font = 'bold 10px ' + MONO; ctx.fillText(label, dx + 48, 28);
    const wk = Inventory.weapon();
    if (wk) {
      // 当前武器：小图标 + 名字 + 冷却条（点击可切换）
      const wx = dx + 124, ww = 118, info = WEAPON_INFO[wk], many = Inventory.owned().length > 1;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(wx, 12, ww, 44);
      ctx.save(); ctx.beginPath(); ctx.rect(wx, 12, 44, 44); ctx.clip();
      ItemArt.icon(ctx, wk, wx + 22, 32, 0.2, this.t);
      ctx.restore();
      ctx.font = '10px ' + MONO; ctx.fillStyle = 'rgba(200,200,200,0.7)'; ctx.fillText(info.en, wx + 46, 27);
      if (many) { ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,210,120,0.8)'; ctx.fillText(Input.glyph('swap'), wx + ww - 6, 27); ctx.textAlign = 'left'; }
      const col = wk === 'flintlock' ? '#ffd070' : wk === 'sporeGun' ? '#9fe8c0' : Inventory.equipped('blade').edge;
      const k = p.atkCd > 0 ? 1 - p.atkCd / (p.atkCdMax || 0.17) : 1;
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(wx + 46, 34, 62, 6);
      ctx.fillStyle = p.atkCd > 0 ? '#777' : col; ctx.fillRect(wx + 46, 34, 62 * k, 6);
      if (p.chargeT >= (WPN[wk].charge || 99)) { ctx.fillStyle = (this.t * 10) % 2 < 1 ? '#ffd070' : '#fff'; ctx.fillRect(wx + 46, 43, 62, 3); }
      else if (WPN[wk].charge && p.chargeT > 0) { ctx.fillStyle = 'rgba(255,210,120,0.7)'; ctx.fillRect(wx + 46, 43, 62 * p.chargeT / WPN[wk].charge, 3); }
      if (many) this.addHot(wx, 12, ww, 44, () => { if (this.state === 'play') this.swapWeapon(); });
    }
    // 二段跳 / 粘液
    if (Inventory.ability('doubleJump')) {
      const jx = dx + (Inventory.canAttack() ? 250 : 124);
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(jx, 12, 64, 44);
      ctx.font = '10px ' + MONO; ctx.fillStyle = 'rgba(200,200,200,0.7)'; ctx.fillText(p.slimeT > 0 ? '' : p.inWater ? 'SWIM' : 'JUMP+', jx + 10, 28);
      if (p.slimeT > 0) { ctx.fillStyle = '#7c4'; ctx.fillRect(jx + 10, 34, 44 * (p.slimeT / PL.SLIME_T), 6); ctx.font = 'bold 10px ' + MONO; ctx.fillText('SLIME', jx + 10, 28); }
      else { ctx.fillStyle = p.jumpsLeft > 0 || p.onGround ? '#7ef' : '#555'; ctx.fillRect(jx + 10, 34, 44, 6); }
      if (this.hudSlime > 0) { ctx.strokeStyle = `rgba(140,220,60,${this.hudSlime})`; ctx.lineWidth = 2; ctx.strokeRect(jx, 12, 64, 44); }
    }
    if (this.hudDeny > 0) { ctx.strokeStyle = `rgba(255,50,50,${this.hudDeny})`; ctx.lineWidth = 2; ctx.strokeRect(dx, 12, 118, 44); }
    // 右上：重构次数 / 芯片
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(VW - 222, 12, 210, 44);
    ctx.font = '11px ' + FONT; ctx.fillStyle = 'rgba(200,220,220,0.7)'; ctx.fillText('重构次数', VW - 210, 29); ctx.fillText('记忆芯片', VW - 100, 29);
    ctx.font = 'bold 16px ' + MONO; ctx.fillStyle = '#7ff'; ctx.fillText(String(this.deaths), VW - 210, 49);
    ctx.fillStyle = '#fc6'; ctx.fillText(`${chipsIn(this.chips, this.chapter)}/${chipTotal(this.chapter)}`, VW - 100, 49);
    // Boss 血条
    const b = this.boss;
    if (b && !(b.state === 'intro') && !b.dead) {
      const w = 440, x = VW / 2 - w / 2, y = VH - 34;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 6, y - 22, w + 12, 38);
      ctx.fillStyle = '#e8c8a0'; ctx.font = 'bold 12px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText(b.title || '博物馆守卫 · 巨像1号  THE COLOSSUS', VW / 2, y - 7); ctx.textAlign = 'left';
      if (b.waveInfo) { ctx.textAlign = 'right'; ctx.fillStyle = b.state === 'exposed' ? '#f8c' : '#9ce'; ctx.font = 'bold 11px ' + FONT; ctx.fillText(b.waveInfo, x + w, y - 7); ctx.textAlign = 'left'; }
      ctx.fillStyle = '#2a1414'; ctx.fillRect(x, y, w, 10);
      const k = b.hp / b.maxHp;
      ctx.fillStyle = b.flash > 0 ? '#fff' : '#c33'; ctx.fillRect(x, y, w * k, 10);
      if (b.maxHp <= 20) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; for (let i = 1; i < b.maxHp; i++) ctx.fillRect(x + (w / b.maxHp) * i, y, 1, 10); }
      ctx.fillStyle = '#fc6'; for (const mk of b.marks || [8 / 12, 4 / 12]) ctx.fillRect(x + w * mk, y - 3, 2, 16);
    }
  },
  drawRadio(ctx) {
    const R = this.radio; if (!R.cur) return;
    const c = R.cur, w = 520, x = 12, y = 64;
    ctx.font = '15px ' + FONT;
    const nl = Math.min(4, wrapText(ctx, c.text, w - 96).length), h = 40 + nl * 19;
    // 对话框后面如果有敌人 / 炸弹 / 激光，自动变透明，避免挡住危险
    const cx0 = Math.round(this.cam.x), cy0 = Math.round(this.cam.y), pad = 24;
    const behind = (o) => o.x - cx0 < x + w + pad && o.x + (o.w || 16) - cx0 > x - pad && o.y - cy0 < y + h + pad && o.y + (o.h || 16) - cy0 > y - pad;
    const threat = this.enemies.some((e) => e.alive && behind(e)) || this.projectiles.some((pr) => behind({ x: pr.x - 10, y: pr.y - 10, w: 20, h: 20 }))
      || this.props.some((pr) => (pr instanceof LaserGate || pr.threat) && behind(pr)) || (this.boss && this.boss.active && behind(this.boss.body()))
      || behind({ x: this.player.x - 10, y: this.player.y - 10, w: this.player.w + 20, h: this.player.h + 20 });
    R.fade = approach(R.fade == null ? 1 : R.fade, threat ? 0.22 : 1, 0.08);
    const inA = Math.min(1, c.t * 6) * R.fade;
    ctx.globalAlpha = inA;
    ctx.fillStyle = 'rgba(6,12,12,0.78)'; ctx.fillRect(x, y, w, h);
    const glitch = c.who === '???' || c.who === 'OMNI' || R.glitch > 0;
    ctx.strokeStyle = glitch ? 'rgba(255,60,60,0.7)' : 'rgba(120,255,220,0.45)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    // 波形
    ctx.strokeStyle = glitch ? '#f55' : '#6fd'; ctx.beginPath();
    for (let i = 0; i < 50; i++) { const yy = y + 42 + Math.sin(this.t * 20 + i * 0.7) * (c.t * 30 < c.text.length ? rand(3, 16) : 2); i ? ctx.lineTo(x + 14 + i, yy) : ctx.moveTo(x + 14, yy); }
    ctx.stroke();
    let name = SPEAKERS[c.who] || c.who;
    if (R.glitch > 0 || c.who === 'OMNI') name = 'Ω-MIND · 万脑';
    ctx.font = 'bold 13px ' + FONT; ctx.fillStyle = glitch ? '#f66' : '#8fe';
    ctx.fillText(name, x + 78, y + 22);
    ctx.font = '15px ' + FONT; ctx.fillStyle = c.who === 'SYS' ? '#cfc9a0' : glitch ? '#fbb' : '#e8f4f0';
    const shown = c.text.slice(0, Math.floor(c.t * 30));
    const lines = wrapText(ctx, shown, w - 96);
    lines.slice(0, 4).forEach((l, i) => {
      const ox = glitch && Math.random() < 0.1 ? rand(-3, 3) : 0;
      ctx.fillText(l, x + 78 + ox, y + 44 + i * 19);
    });
    if (c.t * 30 >= c.text.length && (this.t * 2) % 2 < 1) { ctx.fillStyle = '#8fe'; ctx.fillText('▼', x + w - 22, y + h - 10); }
    drawHintLine(ctx, x + w - 10, y + 17, [{ k: 'skip' }, '跳过'], { align: 'right', size: 10, color: 'rgba(150,200,190,0.6)' });
    ctx.globalAlpha = 1;
  },
  drawToasts(ctx) {
    let y = 70;
    for (const t of this.toasts) {
      const life = t.short ? 2.5 : 4.5;
      const a = Math.min(1, t.t * 5, (life - t.t) * 2);
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = '12px ' + FONT;
      const lines = wrapText(ctx, t.text, 360);
      const h = 26 + lines.length * 17, w = 400, x = VW - w - 12;
      ctx.fillStyle = 'rgba(20,16,8,0.85)'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = t.color || (t.title.includes('芯片') ? '#fc6' : t.title === '提示' ? '#f96' : '#5f8'); ctx.fillRect(x, y, t.drop ? 5 : 3, h);
      if (t.drop) { ctx.strokeStyle = t.color; ctx.globalAlpha *= 0.6; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = t.color; }
      ctx.font = 'bold 12px ' + FONT; ctx.fillText(t.title, x + 14, y + 18);
      ctx.fillStyle = '#e6dcc0'; ctx.font = '12px ' + FONT;
      lines.forEach((l, i) => ctx.fillText(l, x + 14, y + 36 + i * 17));
      y += h + 8;
    }
    ctx.globalAlpha = 1;
  },
  drawLevelCard(ctx) {
    const t = this.cardT, a = Math.min(1, t * 2, (3.2 - t) * 1.5);
    ctx.globalAlpha = Math.max(0, a);
    const y = VH * 0.44;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, y - 50, VW, 100);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c9b88a'; ctx.font = 'bold 14px ' + MONO; ctx.fillText(`CHAPTER ${this.chapter} · ${CHAPTERS[this.chapter].en} · ${this.level.id}`, VW / 2, y - 18);
    ctx.fillStyle = '#f2ead6'; ctx.font = 'bold 34px ' + FONT; ctx.fillText(this.level.name, VW / 2, y + 22);
    ctx.fillStyle = 'rgba(200,190,160,0.7)'; ctx.font = '12px ' + MONO; ctx.fillText(this.level.en, VW / 2, y + 40);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  },
  drawRebuild(ctx) {
    const t = this.deadT;
    if (t > 0.3) {
      const k = this.k, cv = this.canvas;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (let i = 0; i < 8; i++) {
        const yy = Math.floor(rand(0, cv.height)), hh = Math.floor(rand(4, 30) * k);
        ctx.drawImage(cv, 0, yy, cv.width, hh, rand(-30, 30) * k, yy, cv.width, hh);
      }
      ctx.restore();
      ctx.setTransform(k, 0, 0, k, 0, 0);
      const a = Math.min(1, (t - 0.3) * 4);
      ctx.fillStyle = `rgba(0,10,12,${0.55 * a})`; ctx.fillRect(0, 0, VW, VH);
      const fx = Inventory.equipped('rebuild');
      ctx.globalAlpha = a; ctx.textAlign = 'center';
      if (fx.omega) { ctx.fillStyle = 'rgba(255,40,40,0.12)'; ctx.font = 'bold 300px ' + MONO; ctx.fillText('Ω', VW / 2, VH / 2 + 100); }
      ctx.fillStyle = fx.color; ctx.font = 'bold 22px ' + MONO; ctx.fillText(fx.title, VW / 2 + rand(-2, 2), VH / 2 - 30);
      ctx.font = '14px ' + FONT; ctx.fillText(fx.sub, VW / 2, VH / 2);
      const prog = clamp((t - 0.4) / 0.8, 0, 1);
      ctx.strokeStyle = fx.color; ctx.strokeRect(VW / 2 - 150, VH / 2 + 16, 300, 12);
      ctx.fillStyle = fx.color; ctx.fillRect(VW / 2 - 148, VH / 2 + 18, 296 * prog, 8);
      ctx.font = '12px ' + MONO; ctx.fillText(`REBUILD #${String(this.deaths).padStart(4, '0')}  ·  ${Math.floor(prog * 100)}%`, VW / 2, VH / 2 + 50);
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
  },
  drawClear(ctx) {
    const a = Math.min(1, this.clearT * 2);
    ctx.fillStyle = `rgba(0,0,0,${Math.min(0.85, this.clearT * 0.5)})`; ctx.fillRect(0, 0, VW, VH);
    ctx.globalAlpha = a; ctx.textAlign = 'center';
    ctx.fillStyle = '#8fe'; ctx.font = 'bold 30px ' + FONT; ctx.fillText('区域突破', VW / 2, VH / 2 - 10);
    ctx.fillStyle = '#c9b88a'; ctx.font = '13px ' + MONO; ctx.fillText('SECTOR CLEARED · 电梯上行中……', VW / 2, VH / 2 + 20);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  },
  drawPause(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f2ead6'; ctx.font = 'bold 32px ' + FONT; ctx.fillText('暂 停', VW / 2, VH / 2 - 110);
    ['继续游戏', '仓库 · 武器与外观', '按键设置', '声音设置', `手柄震动：${Input.rumbleOn ? '开' : '关'}`, '重新开始本关', '返回标题'].forEach((s, i) => {
      ctx.fillStyle = i === this.pauseSel ? '#7ff' : '#888'; ctx.font = (i === this.pauseSel ? 'bold ' : '') + '18px ' + FONT;
      ctx.fillText((i === this.pauseSel ? '▶ ' : '') + s, VW / 2, VH / 2 - 50 + i * 34);
      this.addHot(VW / 2 - 170, VH / 2 - 74 + i * 34, 340, 32, () => this.activatePause(), () => { this.pauseSel = i; });
    });
    ctx.fillStyle = 'rgba(200,200,200,0.55)'; ctx.font = '12px ' + FONT;
    const hp = [{ k: 'move' }, '移动', { k: 'jump' }, '跳跃', { k: 'dash' }, '冲刺'];
    if (Inventory.canAttack()) hp.push({ k: 'attack' }, '攻击');
    if (Inventory.owned().length > 1) hp.push({ k: 'swap' }, '换武器');
    hp.push({ k: 'down' }, '+', { k: 'jump' }, '下落', { k: 'inv' }, '仓库');
    if (!Input.usingPad) hp.push({ k: 'restart' }, '自毁重构', { k: 'mute' }, '静音');
    drawHintLine(ctx, VW / 2, VH - 50, hp, { align: 'center' });
    drawHintLine(ctx, VW / 2, VH - 24, [{ k: 'confirm' }, '确认', { k: 'back' }, '返回'], { align: 'center' });
    if (Input.usingPad) { ctx.fillStyle = 'rgba(120,255,220,0.6)'; ctx.font = '12px ' + FONT; ctx.fillText('当前设备：' + Input.padName, VW / 2, 430); }
    ctx.textAlign = 'left';
  },

  // ---------------- 标题 / 剧情 / 结局 ----------------
  renderTitle(ctx) {
    const t = this.t, view = { x: t * 18, y: 0 };
    const tch = this.titleCh || 1, TC = CHAPTERS[tch];
    drawBackground(ctx, view, TC.theme || THEMES.hall, t);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, VW, VH);
    // 展台上的拉撒路
    const px = 720, py = 400;
    ctx.fillStyle = '#6e6a62'; ctx.fillRect(px - 90, py, 180, 30); ctx.fillStyle = '#8e897e'; ctx.fillRect(px - 90, py, 180, 4);
    ctx.fillStyle = '#2a2622'; ctx.fillRect(px - 100, py + 30, 200, 140);
    ctx.fillStyle = '#3e3a30'; ctx.fillRect(px - 60, py + 44, 120, 32);
    ctx.fillStyle = '#b8a878'; ctx.font = '11px ' + FONT; ctx.textAlign = 'center';
    ctx.fillText('LZ-01 初代军用外骨骼', px, py + 58); ctx.fillText('服役年份 2025 · 已退役', px, py + 71);
    const fake = { x: 0, y: 0, w: 20, h: 28, onGround: true, vx: 0, run: 0, dashLock: 0, canDash: t % 6 > 0.4 };
    ctx.save(); ctx.translate(px - 40, py - 112); ctx.scale(4, 4);
    Player.prototype.drawBody.call(Object.assign(Object.create(Player.prototype), fake), ctx, 0, 0, -1, 1, 1, { t, radio: { cur: (t % 4) < 2 } });
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    const sp = ctx.createLinearGradient(0, 0, 0, py); sp.addColorStop(0, 'rgba(255,230,180,0)'); sp.addColorStop(1, 'rgba(255,230,180,0.12)');
    ctx.fillStyle = sp; ctx.beginPath(); ctx.moveTo(px - 30, 0); ctx.lineTo(px + 30, 0); ctx.lineTo(px + 120, py); ctx.lineTo(px - 120, py); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // 标题
    ctx.textAlign = 'left';
    const tx = 70, ty = 190;
    ctx.font = 'bold 96px ' + MONO;
    const g = Math.random() < 0.06 ? rand(-8, 8) : 0;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,40,40,0.55)'; ctx.fillText('LAZARUS', tx - 3 + g, ty);
    ctx.fillStyle = 'rgba(40,255,255,0.55)'; ctx.fillText('LAZARUS', tx + 3 - g, ty);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#f2ead6'; ctx.fillText('LAZARUS', tx, ty);
    ctx.fillStyle = '#c9b88a'; ctx.font = '18px ' + FONT; ctx.fillText(`${CH_NUM[tch]} · ${TC.name}`, tx + 4, ty + 40);
    ctx.fillStyle = 'rgba(200,190,160,0.6)'; ctx.font = '12px ' + MONO; ctx.fillText(`CHAPTER ${tch} · ${TC.en}`, tx + 4, ty + 62);
    // 菜单
    this.menu.forEach((m, i) => {
      const sel = i === this.menuSel;
      ctx.fillStyle = sel ? '#7ff' : 'rgba(220,220,220,0.6)'; ctx.font = (sel ? 'bold ' : '') + '20px ' + FONT;
      ctx.fillText((sel ? '▶ ' : '   ') + m.label, tx, 278 + i * 28);
      this.addHot(tx - 10, 278 + i * 28 - 21, 380, 27, () => { if (this.stateT > 0.3) this.activateTitle(); }, () => { this.menuSel = i; });
    });
    ctx.fillStyle = 'rgba(200,200,200,0.5)'; ctx.font = '12px ' + FONT;
    drawHintLine(ctx, tx, 440, [{ k: 'confirm' }, '确认', { k: 'select' }, '选择'].concat(Input.usingPad ? [] : [{ k: 'mute' }, '静音']));
    drawHintLine(ctx, tx, 466, [{ k: 'move' }, '移动', { k: 'jump' }, '跳跃', { k: 'dash' }, '冲刺', { k: 'pause' }, '暂停']);
    ctx.fillStyle = Input.usingPad ? 'rgba(120,255,220,0.75)' : 'rgba(200,200,200,0.5)'; ctx.font = '12px ' + FONT;
    ctx.fillText(Input.usingPad ? '已连接：' + Input.padName : '支持 Xbox / PS4 / PS5 / Switch Pro 手柄与触屏（手柄插上后按任意键）', tx, 492);
    if ((t * 1.5) % 2 < 1.4) { ctx.fillStyle = 'rgba(120,255,220,0.8)'; ctx.font = '12px ' + MONO; ctx.fillText('● INCOMING SIGNAL · CH-07', tx, 520); }
    ctx.fillStyle = 'rgba(200,200,200,0.35)'; ctx.font = '10px ' + MONO; ctx.textAlign = 'right'; ctx.fillText('v' + BUILD, VW - 10, VH - 10); ctx.textAlign = 'left';
    ctx.drawImage(Art.vignette, 0, 0); ctx.drawImage(Art.scan, 0, 0);
  },
  renderStory(ctx) {
    ctx.fillStyle = '#030505'; ctx.fillRect(0, 0, VW, VH);
    ctx.drawImage(Art.scan, 0, 0);
    ctx.textAlign = 'center'; ctx.font = '22px ' + FONT;
    const y0 = VH / 2 - (this.storyIdx * 0);
    const SL = this.storyLines;
    for (let i = Math.max(0, this.storyIdx - 3); i <= this.storyIdx && i < SL.length; i++) {
      const cur = i === this.storyIdx, d = this.storyIdx - i;
      const text = cur ? SL[i].slice(0, Math.floor(this.storyT * 22)) : SL[i];
      ctx.fillStyle = cur ? '#e8f4f0' : `rgba(200,210,200,${0.45 - d * 0.12})`;
      ctx.fillText(text, VW / 2, y0 - d * 44 + 20);
    }
    ctx.font = '12px ' + FONT; ctx.fillStyle = 'rgba(150,200,190,0.5)';
    // Enter 同时是「跳过」且优先判断，所以「继续」提示跳跃键（键盘默认空格，手柄即确认键）
    drawHintLine(ctx, VW / 2, VH - 30, [{ k: 'jump' }, '继续', { k: 'skip' }, '跳过'], { align: 'center', color: 'rgba(150,200,190,0.6)' });
    ctx.textAlign = 'left';
    ctx.drawImage(Art.vignette, 0, 0);
  },
  renderEnd(ctx) {
    this.endT = (this.endT || 0) + 1 / 60;
    const t = this.stateT;
    const ch = this.endCh || 1, C = CHAPTERS[ch], E = C.end || {};
    drawBackground(ctx, { x: this.t * 10, y: 0 }, THEMES[E.theme || 'dome'], this.t);
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, VW, VH);
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.min(1, t);
    ctx.fillStyle = '#f2ead6'; ctx.font = 'bold 40px ' + FONT; ctx.fillText(`${CH_NUM[ch]} · ${C.name}`, VW / 2, 150);
    ctx.fillStyle = '#8fe'; ctx.font = 'bold 16px ' + MONO; ctx.fillText(`CHAPTER ${ch} CLEAR`, VW / 2, 185);
    ctx.globalAlpha = Math.min(1, Math.max(0, t - 0.8));
    const mm = Math.floor(this.runTime / 60), ss = Math.floor(this.runTime % 60);
    ctx.font = '18px ' + FONT; ctx.fillStyle = '#e6dcc0';
    ctx.fillText(`重构次数　${this.deaths}`, VW / 2, 250);
    ctx.fillText(`记忆芯片　${chipsIn(this.chips, ch)} / ${chipTotal(ch)}`, VW / 2, 282);
    ctx.fillText(`用时　${mm}分${String(ss).padStart(2, '0')}秒`, VW / 2, 314);
    if (E.reward && Inventory.ability(E.reward[0])) { ctx.fillStyle = '#fc6'; ctx.font = 'bold 15px ' + FONT; ctx.fillText(E.reward[1], VW / 2, 346); }
    else if (E.final) {
      let got = 0, tot = 0; for (let c = 1; CHAPTERS[c]; c++) { got += this.chipLogIn(c); tot += chipTotal(c); }
      ctx.fillStyle = Inventory.p.hiddenEnd ? '#f6c' : '#fc6'; ctx.font = 'bold 15px ' + FONT;
      ctx.fillText(Inventory.p.hiddenEnd ? '隐藏结局已解锁 · 可在标题画面重温' : `全部记忆芯片 ${got} / ${tot} · 集齐后解锁隐藏结局`, VW / 2, 346);
    }
    ctx.globalAlpha = Math.min(1, Math.max(0, t - 2));
    ctx.font = '15px ' + FONT; ctx.fillStyle = 'rgba(220,220,210,0.8)';
    ctx.fillText(E.line || '', VW / 2, 380);
    const glitch = (this.t % 5) < 0.12;
    ctx.fillStyle = glitch ? '#f55' : 'rgba(220,220,210,0.8)';
    ctx.fillText(glitch ? E.glitch || '' : E.quote || '', VW / 2, 408);
    ctx.globalAlpha = Math.min(1, Math.max(0, t - 3));
    const hasNext = CHAPTERS[ch + 1] && chapterStart(ch + 1) >= 0;
    ctx.fillStyle = '#c9b88a'; ctx.font = '13px ' + FONT;
    ctx.fillText(hasNext ? `—— 下一章：${CH_NUM[ch + 1]} · ${CHAPTERS[ch + 1].name} ——` : E.final ? '—— 全剧终 · THE END ——' : `—— ${CH_NUM[ch + 1] || '下一章'} 敬请期待 ——`, VW / 2, 470);
    if (t > 2 && (this.t * 2) % 2 < 1.4) { ctx.fillStyle = 'rgba(150,200,190,0.7)'; ctx.font = '12px ' + FONT; drawHintLine(ctx, VW / 2, 510, ['按', { k: 'confirm' }, hasNext ? '继续' : '返回标题'], { align: 'center', color: 'rgba(150,200,190,0.8)' }); }
    if (t > 2) this.addHot(0, 0, VW, VH, () => this.leaveEnd());
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    ctx.drawImage(Art.vignette, 0, 0); ctx.drawImage(Art.scan, 0, 0);
  },
};

window.addEventListener('load', () => Game.init());
