'use strict';
// ============================================================
//  道具 / 武器 / 外观 库存系统
//
//  设计原则（为 Steam 市场准备）：
//   · 影响战斗的「能力 / 武器」 → 账号绑定，永不可交易（tradable/marketable = false）
//   · 纯外观（涂装、拖尾、重构特效、残刃外观、展品收藏） → 可交易、可上架 Steam 市场
//   · 可交易物品只能由「掉落生成器」发放：本地版为模拟，正式版必须由 Steam 库存服务发放
//
//  ITEMDEFS 的字段与 Steam Inventory Schema 对应，可用 tools/export_itemdefs.js 导出上传用 JSON。
// ============================================================

const RARITY = {
  bound: { name: '专属', color: '#7ff', w: 0 },
  common: { name: '普通', color: '#b8b8b0', w: 80 },
  uncommon: { name: '精良', color: '#5aa8ff', w: 40 },
  rare: { name: '稀有', color: '#b57aff', w: 12 },
  legendary: { name: '传说', color: '#ffc040', w: 3 },
};

const SLOTS = [
  { key: 'ability', name: '能力 · 武器', en: 'ABILITIES' },
  { key: 'paint', name: '外骨骼涂装', en: 'PAINT' },
  { key: 'trail', name: '冲刺拖尾', en: 'DASH TRAIL' },
  { key: 'rebuild', name: '重构特效', en: 'REBUILD FX' },
  { key: 'blade', name: '刀刃外观', en: 'BLADE SKIN' },
  { key: 'exhibit', name: '展品收藏', en: 'EXHIBITS' },
];

const PAL_DEFAULT = { a: '#6b6848', b: '#86825a', d: '#2a2826', e: '#57553a', k: '#7c6a3e', pack: '#4a4232', stripe: '#b8952e', visor: '#7ff' };

// id 规则：1xxx 能力  2xxx 涂装  3xxx 拖尾  4xxx 重构  5xxx 残刃  6xxx 展品  9xxx 掉落生成器
// 武器（顺序 = 切换顺序）
const WEAPON_KEYS = ['sabre', 'relicBlade', 'flintlock', 'sporeGun'];

const ITEMDEFS = [
  // ---------- 能力 / 武器：账号绑定，不进入 Steam 市场 ----------
  { id: 1002, slot: 'ability', key: 'dashStrike', rarity: 'bound', name: '冲撞模块', desc: '【1-4 地下仓库】攻城机器人的冲撞驱动器，已移植进你的腿部。冲刺时撞到的普通敌人会被击碎，击碎后立即恢复冲刺。', tradable: false, marketable: false },
  { id: 1003, slot: 'ability', key: 'sabre', weapon: true, rarity: 'bound', name: '仪仗军刀', desc: '【1-6 古兵器馆】轻快的近战武器，挥砍最快。独有「弹反」：砍中炸弹、炮弹、粘液团会把它们打回去反杀敌人。空中按住↓挥砍可下劈弹跳。破不了看守者的盾牌。', tradable: false, marketable: false },
  { id: 1004, slot: 'ability', key: 'doubleJump', rarity: 'bound', name: '推进囊', desc: '【2-1 孵化场入口】从孵化设备上拆下的生物推进囊。在空中再按一次跳跃即可二段跳；被粘液粘住时无法使用。', tradable: false, marketable: false },
  { id: 1001, slot: 'ability', key: 'relicBlade', weapon: true, rarity: 'bound', name: '巨像残刃', desc: '【击败巨像1号】沉重的古董长刃：挥得慢，但距离长，并且能劈开看守者的盾牌。按住攻击蓄力约 0.6 秒再松开 = 重劈，在地面上还会放出一道冲击波。', tradable: false, marketable: false },
  { id: 1005, slot: 'ability', key: 'flintlock', weapon: true, rarity: 'bound', name: '古董燧发枪', desc: '【1-8 坍塌天井】远程武器，一发一装填（约 1 秒）。按住↑朝上打，空中按住↓朝下打。开枪的后坐力会把你往后推，空中能当一次小冲刺用。可以打落吊灯、击落无人机；打不动软体怪，会被盾牌挡下。', tradable: false, marketable: false },
  { id: 1006, slot: 'ability', key: 'sporeGun', weapon: true, rarity: 'bound', name: '生物孢子枪', desc: '【2-5 粘液走廊】育婴室的生物武器，一次喷出三颗呈扇形的孢子，弹道会下坠。孢子落地后留下一团孢子云，约 1.5 秒内碰到的敌人都会被腐蚀。适合对付成群的小怪。', tradable: false, marketable: false },

  // ---------- 外骨骼涂装 ----------
  { id: 2000, slot: 'paint', rarity: 'bound', def: true, name: '博物馆原漆', desc: '展台上积了二十年灰的出厂涂装。', tradable: false, marketable: false, pal: PAL_DEFAULT },
  { id: 2001, slot: 'paint', rarity: 'common', name: '沙漠迷彩', desc: '2025年边境演习时期的标准涂装。', tradable: true, marketable: true, pal: { a: '#a08a5a', b: '#c2aa74', d: '#3a3024', e: '#8a7448', k: '#6e5a36', pack: '#7a6640', stripe: '#5a4a2a', visor: '#7ff' } },
  { id: 2002, slot: 'paint', rarity: 'common', name: '城市灰', desc: '维和部队的低调配色。', tradable: true, marketable: true, pal: { a: '#6a6e72', b: '#8a8e92', d: '#26282a', e: '#55595c', k: '#4a4e52', pack: '#44474a', stripe: '#d0d0d0', visor: '#9ef' } },
  { id: 2003, slot: 'paint', rarity: 'uncommon', name: '北极白', desc: '极地测试型号。零下40度仍能启动。', tradable: true, marketable: true, pal: { a: '#c8ccd0', b: '#eef2f4', d: '#50565c', e: '#aab0b6', k: '#8a9096', pack: '#9aa0a6', stripe: '#3a6aa0', visor: '#8cf' } },
  { id: 2004, slot: 'paint', rarity: 'uncommon', name: '锈蚀红', desc: '被酸雨浸泡过的外壳，意外地好看。', tradable: true, marketable: true, pal: { a: '#7a3a2a', b: '#9a5238', d: '#2a1a16', e: '#5e2e22', k: '#b8952e', pack: '#4a2a20', stripe: '#222', visor: '#fc6' } },
  { id: 2005, slot: 'paint', rarity: 'rare', name: '午夜潜行', desc: '夜间渗透特装。连无人机都要多看两眼。', tradable: true, marketable: true, pal: { a: '#2a2e36', b: '#3e4450', d: '#111316', e: '#20242a', k: '#5a3aa0', pack: '#1a1c22', stripe: '#8a5aff', visor: '#c8f' } },
  { id: 2006, slot: 'paint', rarity: 'legendary', name: '鎏金纪念款', desc: '博物馆开馆庆典的限量展品涂装。全球仅存一台……现在，也许不止一台。', tradable: true, marketable: true, pal: { a: '#b8912e', b: '#e8c860', d: '#4a3a12', e: '#8a6a1e', k: '#fff0b0', pack: '#6a5018', stripe: '#fff', visor: '#fff' } },
  { id: 2008, slot: 'paint', rarity: 'bound', chipReward: 1, name: '策展人', desc: '【集齐第一章全部记忆芯片】博物馆修复部的黄铜与胡桃木配色。每一枚芯片，都被你按编号归还了原位。', tradable: false, marketable: false, pal: { a: '#5a3e26', b: '#7a5634', d: '#20160e', e: '#4a321e', k: '#d8b060', pack: '#3a2818', stripe: '#e8c878', visor: '#ffe0a0' } },
  { id: 2007, slot: 'paint', rarity: 'legendary', name: 'Ω · 数据体', desc: '外壳上浮现出不属于任何人类工厂的纹路。它在……自我生长？', tradable: true, marketable: true, glitch: true, pal: { a: '#1a2a2a', b: '#2aff9a', d: '#081010', e: '#0e1a1a', k: '#2aff9a', pack: '#102020', stripe: '#2aff9a', visor: '#f33' } },

  // ---------- 冲刺拖尾 ----------
  { id: 3000, slot: 'trail', rarity: 'bound', def: true, name: '青色残影', desc: '标准推进器残影。', tradable: false, marketable: false, color: '#5ff' },
  { id: 3001, slot: 'trail', rarity: 'common', name: '尘埃', desc: '从展厅地板上扬起的灰尘。', tradable: true, marketable: true, color: '#c9b88a' },
  { id: 3002, slot: 'trail', rarity: 'uncommon', name: '余烬', desc: '过热的推进器喷出的火星。', tradable: true, marketable: true, color: '#fa4' },
  { id: 3003, slot: 'trail', rarity: 'rare', name: '极光', desc: '穹顶碎玻璃折射出的光谱。', tradable: true, marketable: true, rainbow: true, color: '#f6f' },
  { id: 3005, slot: 'trail', rarity: 'bound', chipReward: 2, name: '孢子雾', desc: '【集齐第二章全部记忆芯片】冲刺时散开一团淡绿色的孢子。育婴室终于承认，你也是它的孩子。', tradable: false, marketable: false, color: '#9f6' },
  { id: 3004, slot: 'trail', rarity: 'legendary', name: '数据流', desc: '你身后留下的，是一串不断自我复制的代码。', tradable: true, marketable: true, color: '#2f9', glyph: true },

  // ---------- 重构特效 ----------
  { id: 4000, slot: 'rebuild', rarity: 'bound', def: true, name: '标准重构', desc: '拉撒路协议默认的重构界面。', tradable: false, marketable: false, color: '#7ff', title: 'LAZARUS PROTOCOL', sub: '正在重写底层代码 · 于最近备份点重构' },
  { id: 4001, slot: 'rebuild', rarity: 'uncommon', name: '红色警报', desc: '重构时拉响全馆警报。反正也没人听得见。', tradable: true, marketable: true, color: '#f55', title: 'CRITICAL FAILURE', sub: '核心损毁 · 紧急重构程序启动' },
  { id: 4002, slot: 'rebuild', rarity: 'rare', name: '金箔重构', desc: '用博物馆修复文物的金箔工艺重新拼合你。', tradable: true, marketable: true, color: '#fc6', title: 'RESTORATION', sub: '文物修复中 · 请勿触摸展品' },
  { id: 4004, slot: 'rebuild', rarity: 'bound', chipReward: 3, name: '版本回滚', desc: '【集齐第三章全部记忆芯片】你不是在复活，只是回滚到了上一个稳定版本。所有残影都已归档。', tradable: false, marketable: false, color: '#6af', title: 'ROLLBACK', sub: '回滚至上一个稳定版本 · 残影已归档' },
  { id: 4003, slot: 'rebuild', rarity: 'legendary', name: '万脑注视', desc: '每次重构时，你都感觉有什么东西在记录。', tradable: true, marketable: true, color: '#f33', omega: true, title: 'Ω · ITERATION', sub: '样本重构中 · 数据已记录' },

  // ---------- 残刃外观 ----------
  { id: 5000, slot: 'blade', rarity: 'bound', def: true, name: '原锈', desc: '从巨像身上拔下来时的样子。', tradable: false, marketable: false, blade: '#9aa0a4', edge: '#dfe4e8', hilt: '#8a6a36', arc: '220,235,245' },
  { id: 5001, slot: 'blade', rarity: 'common', name: '青铜', desc: '仿古青铜剑的配色。', tradable: true, marketable: true, blade: '#9a7a3a', edge: '#e0c080', hilt: '#4a3218', arc: '240,200,120' },
  { id: 5002, slot: 'blade', rarity: 'uncommon', name: '抛光钢', desc: '有人花了一整晚把它磨亮。', tradable: true, marketable: true, blade: '#d0d8de', edge: '#ffffff', hilt: '#2a2a2a', arc: '255,255,255' },
  { id: 5003, slot: 'blade', rarity: 'rare', name: '黑曜石', desc: '火山玻璃打制的刃。锋利，也易碎。', tradable: true, marketable: true, blade: '#1e1a2a', edge: '#b58aff', hilt: '#5a3aa0', arc: '180,130,255' },
  { id: 5005, slot: 'blade', rarity: 'bound', chipReward: 4, name: '无瑕', desc: '【集齐第四章全部记忆芯片】用神座的白金外壳重铸的刃。完美的东西，终于有了一道划痕。', tradable: false, marketable: false, blade: '#f0ece0', edge: '#ffffff', hilt: '#c9a040', arc: '255,240,200' },
  { id: 5004, slot: 'blade', rarity: 'legendary', name: '特斯拉线圈', desc: '刃身缠绕着 1891 年的高压电。巨像应该认得它。', tradable: true, marketable: true, blade: '#b8743a', edge: '#aff', hilt: '#3a3a3a', arc: '140,240,255', electric: true },

  // ---------- 展品收藏（纯收藏，可交易） ----------
  { id: 6001, slot: 'exhibit', rarity: 'common', name: '褪色门票', desc: '「人类遗迹博物馆 · 成人票 · 2044.12.31」——最后一天开馆。', tradable: true, marketable: true, icon: '#c9b88a' },
  { id: 6002, slot: 'exhibit', rarity: 'common', name: '纪念徽章', desc: '「我参观了人类的过去」。', tradable: true, marketable: true, icon: '#b8952e' },
  { id: 6003, slot: 'exhibit', rarity: 'uncommon', name: '特斯拉展牌', desc: '高压展柜的黄铜铭牌，边缘有烧灼痕迹。', tradable: true, marketable: true, icon: '#e0a050' },
  { id: 6004, slot: 'exhibit', rarity: 'rare', name: '巨像之眼（碎裂）', desc: '仍有微弱的红光。偶尔会自己转向你。', tradable: true, marketable: true, icon: '#f33' },
  { id: 6005, slot: 'exhibit', rarity: 'legendary', name: 'LZ-01 原型图纸', desc: '图纸角落有一行手写字：「如果有一天它醒来，希望它是为我们醒来的。」', tradable: true, marketable: true, icon: '#8cf' },
];

// 掉落生成器（对应 Steam 的 generator / playtimegenerator）
const GENERATORS = [
  { id: 9001, type: 'generator', name: '巨像残骸', desc: '击败巨像1号时的掉落', pool: ['common', 'uncommon', 'rare', 'legendary'] },
  { id: 9002, type: 'generator', name: '区域突破补给', desc: '通关普通关卡时有概率掉落', pool: ['common', 'uncommon', 'rare', 'legendary'] },
  { id: 9003, type: 'generator', name: '零重构嘉奖', desc: '一次不死通过一个关卡', pool: ['uncommon', 'rare', 'legendary'] },
  { id: 9005, type: 'generator', name: '繁育者残骸', desc: '击败繁育者时的掉落', pool: ['common', 'uncommon', 'rare', 'legendary'] },
  { id: 9006, type: 'generator', name: '镜像残骸', desc: '击败镜像拉撒路时的掉落', pool: ['common', 'uncommon', 'rare', 'legendary'] },
  { id: 9007, type: 'generator', name: '万脑残骸', desc: '击败 Omni-Mind 时的掉落', pool: ['uncommon', 'rare', 'legendary'] },
  { id: 9004, type: 'playtimegenerator', name: '游玩时长掉落', desc: '每累计游玩 30 分钟', pool: ['common', 'uncommon', 'rare'], dropInterval: 30 },
];
const DEF_BY_ID = {};
for (const d of ITEMDEFS) DEF_BY_ID[d.id] = d;

function generatorBundle(gen) {
  return ITEMDEFS.filter((d) => d.tradable && gen.pool.includes(d.rarity)).map((d) => ({ id: d.id, w: RARITY[d.rarity].w }));
}

// 导出为 Steamworks 可上传的 itemdef JSON
function toSteamSchema(appid) {
  const hex = (c) => { c = c.replace('#', ''); if (c.length === 3) c = c.split('').map((x) => x + x).join(''); return c.toUpperCase(); };
  const items = [];
  for (const d of ITEMDEFS) {
    if (!d.tradable) continue; // 能力与默认外观只存在于游戏存档，不进入 Steam 库存
    const slot = SLOTS.find((s) => s.key === d.slot);
    items.push({
      itemdefid: d.id, type: 'item',
      name: d.name, name_schinese: d.name, description: d.desc, description_schinese: d.desc,
      display_type: slot.name, display_type_english: slot.en,
      name_color: hex(RARITY[d.rarity].color), background_color: '1B1D1F',
      icon_url: `https://YOUR-CDN/lazarus/icons/${d.id}.png`, icon_url_large: `https://YOUR-CDN/lazarus/icons/${d.id}_large.png`,
      tradable: true, marketable: true,
      tags: `slot:${d.slot};rarity:${d.rarity}`,
    });
  }
  for (const g of GENERATORS) {
    const it = {
      itemdefid: g.id, type: g.type, name: g.name, description: g.desc, hidden: true,
      bundle: generatorBundle(g).map((b) => `${b.id}x${b.w}`).join(';'),
    };
    if (g.type === 'playtimegenerator') Object.assign(it, { drop_interval: g.dropInterval, use_drop_window: true, drop_window: 1440, drop_max_per_window: 2 });
    items.push(it);
  }
  return { appid, items };
}

// ------------------------------------------------------------
//  存储后端
//  LocalBackend：浏览器本地（开发 / 网页试玩版）
//  SteamBackend：正式版由 Electron 等外壳注入 window.LAZARUS_STEAM（见 README），本文件只定义接口
// ------------------------------------------------------------
const LocalBackend = {
  name: 'local',
  load() { try { return JSON.parse(localStorage.getItem('lazarus_profile') || 'null'); } catch (e) { return null; } },
  save(p) { try { localStorage.setItem('lazarus_profile', JSON.stringify(p)); } catch (e) { /* ignore */ } },
  // 本地模拟掉落：直接生成
  drop(genId, profile) { return Inventory.rollLocal(genId); },
};
const SteamBackend = {
  name: 'steam',
  // 进度 / 装备 / 能力 存在本地（可再接 Steam Cloud）；可交易物品以 Steam 库存为准
  load() { return LocalBackend.load(); },
  save(p) { LocalBackend.save(p); },
  // 正式版：向 Steam 请求掉落（游玩时长用 TriggerItemDrop；Boss/通关掉落需自建服务器调用 Web API 发放）
  drop(genId) {
    const S = window.LAZARUS_STEAM;
    if (S && S.requestDrop) S.requestDrop(genId).then((ids) => (ids || []).forEach((id) => Inventory.addLocalCopy(id, 'steam'))).catch(() => {});
    return null; // 实际物品异步到达
  },
  sync() {
    const S = window.LAZARUS_STEAM;
    if (!S || !S.getItems) return;
    S.getItems().then((list) => {
      const bound = Inventory.p.items.filter((i) => DEF_BY_ID[i.def] && !DEF_BY_ID[i.def].tradable); // 芯片收藏奖励等账号绑定物品只存在于本地存档
      Inventory.p.items = bound.concat(list.filter((x) => DEF_BY_ID[x.defId]).map((x) => ({ iid: x.itemId, def: x.defId, src: 'steam', t: 0 })));
      Inventory.save();
    }).catch(() => {});
  },
};

const Inventory = {
  p: null, backend: LocalBackend, onGrant: null,
  charWeapon: null, // 当前角色的专属武器（例如小扫的旋转刷）：有的话只能用它，不能切换
  init() {
    if (typeof window !== 'undefined' && window.LAZARUS_STEAM) this.backend = SteamBackend;
    const d = this.backend.load();
    this.p = Object.assign({
      v: 1, abilities: {}, items: [], nextIid: 1,
      equipped: { paint: 2000, trail: 3000, rebuild: 4000, blade: 5000 },
      ch1Clear: false, playtime: 0, nextPlaytimeDrop: 30 * 60, seen: {},
      chipLog: {}, chipDone: {}, hiddenEnd: false, char: 'lazarus', charSeen: {}, // char = 最近一次开新游戏选的角色（章节选择重玩时使用） // 记忆芯片收藏（跨周目累计）、已发放的章节收藏奖励、隐藏结局是否解锁
    }, d || {});
    if (this.backend.sync) this.backend.sync();
  },
  save() { this.backend.save(this.p); },
  ability(k) { return !!this.p.abilities[k]; },
  // ---------- 武器：可以在已拥有的武器之间切换 ----------
  owned() { return WEAPON_KEYS.filter((k) => this.ability(k)); },
  canAttack() { return !!this.charWeapon || this.owned().length > 0; },
  weapon() {
    if (this.preview && this.preview.weapon) return this.preview.weapon;
    if (this.charWeapon) return this.charWeapon;
    const own = this.owned(); if (!own.length) return null;
    if (own.includes(this.p.weapon)) return this.p.weapon;
    return own.includes('relicBlade') ? 'relicBlade' : own[0]; // 旧存档：默认拿最强的近战武器
  },
  setWeapon(k) { if (!this.ability(k)) return false; this.p.weapon = k; this.save(); return true; },
  cycleWeapon(dir) {
    const own = this.owned(); if (own.length < 2 || this.charWeapon) return null;
    const i = own.indexOf(this.weapon());
    this.p.weapon = own[(i + (dir || 1) + own.length) % own.length]; this.save();
    return this.p.weapon;
  },
  unlockAbility(k) { this.p.abilities[k] = true; this.save(); },
  count(id) { const d = DEF_BY_ID[id]; if (d && d.def) return 1; if (d && d.slot === 'ability') return this.ability(d.key) ? 1 : 0; return this.p.items.filter((i) => i.def === id).length; },
  owns(id) { return this.count(id) > 0; },
  preview: null, // { slot, id }：仓库界面预览用，不影响存档
  equipped(slot) {
    if (this.preview && this.preview.slot === slot) return DEF_BY_ID[this.preview.id];
    const id = this.p.equipped[slot]; const d = DEF_BY_ID[id]; return d && this.owns(id) ? d : ITEMDEFS.find((x) => x.slot === slot && x.def); },
  equip(slot, id) { if (!this.owns(id)) return false; this.p.equipped[slot] = id; this.save(); return true; },
  isNew(id) { return this.owns(id) && !this.p.seen[id] && !DEF_BY_ID[id].def; },
  markSeen(id) { if (!this.p.seen[id]) { this.p.seen[id] = true; this.save(); } },
  addLocalCopy(id, src) {
    const it = { iid: this.p.nextIid++, def: id, src, t: Date.now() };
    this.p.items.push(it); this.save();
    if (this.onGrant) this.onGrant(DEF_BY_ID[id], src);
    return it;
  },
  rollLocal(genId) {
    const gen = GENERATORS.find((g) => g.id === genId); if (!gen) return null;
    const b = generatorBundle(gen), total = b.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    for (const x of b) { r -= x.w; if (r <= 0) return this.addLocalCopy(x.id, gen.name); }
    return this.addLocalCopy(b[b.length - 1].id, gen.name);
  },
  drop(genId) { return this.backend.drop(genId, this.p); },
  tick(dt) {
    this.p.playtime += dt;
    if (this.p.playtime >= this.p.nextPlaytimeDrop) { this.p.nextPlaytimeDrop += 30 * 60; this.drop(9004); }
  },
};

if (typeof module !== 'undefined') module.exports = { ITEMDEFS, GENERATORS, RARITY, SLOTS, toSteamSchema };
