// 关卡可达性粗检：node tools/check_levels.js
// 基于跳跃包络（高 3 格 / 远 4~7 格，冲刺 +3 格，弹床 +9 格高）在瓦片网格上做 BFS，
// 第二章起：二段跳（高 6 格）、培养液（可自由上浮，出水跳 3 格）、反弹软体怪（踩头 +8 格高）。
// 只用于发现“明显无法到达出口”的设计错误；不模拟敌人、激光、时序，结果仅供参考。
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = {}; vm.createContext(ctx);
// 只需要地图数据：其余依赖用空壳代替
vm.runInContext('var TILESETS={},PROP_FACTORIES={},PICKUP_INFO={},Inventory={ability:()=>false};function makeEnemy(){}', ctx);
const src = ['levels.js', 'chapter2.js'].map((f) => fs.readFileSync(path.join(__dirname, '../js', f), 'utf8')).join('\n');
vm.runInContext(src + '\nthis.LEVELS=LEVELS;this.makeBuilder=makeBuilder;', ctx);
const SOLID = '#=', ONE = '-C', BLOCK = SOLID + ONE;
const H = { 3: 4, 2: 5, 1: 6, 0: 7 };
let bad = 0;
for (const L of ctx.LEVELS) {
  const B = ctx.makeBuilder(L.w, L.h); L.build(B); const g = B.grid;
  const t = (x, y) => (x < 0 || x >= L.w ? '#' : y < 0 || y >= L.h ? ' ' : g[y][x]);
  const solid = (x, y) => SOLID.includes(t(x, y));
  const support = new Set();
  // 升降台轨迹视作可站立
  const moverCells = [];
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const c = g[y][x];
    if (c === 'H') for (let k = 0; k <= 6; k++) for (let j = 0; j < 3; j++) moverCells.push([x + k + j, y]);
    if (c === 'V') for (let k = 0; k <= 4; k++) for (let j = 0; j < 3; j++) moverCells.push([x + j, y - k]);
  }
  for (const [x, y] of moverCells) support.add(x + ',' + y);
  const ch = parseInt(L.id, 10), dj = ch >= 2;
  const wet = (x, y) => !!(B.water && B.water[y] && B.water[y][x]);
  const stand = (x, y) => !solid(x, y) && !solid(x, y - 1) && t(x, y) !== '^' && (BLOCK.includes(t(x, y + 1)) || support.has(x + ',' + (y + 1)) || wet(x, y) || t(x, y + 1) === 'u');
  let S = null, E = null;
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { if (g[y][x] === 'S') S = [x, y]; if (g[y][x] === 'E') E = [x, y]; }
  if (L.boss) { console.log(`${L.id} ${L.name}: Boss 关，跳过`); continue; }
  const nodes = []; for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) if (stand(x, y)) nodes.push([x, y]);
  const clear = (x1, y1, x2, y2) => {
    const top = Math.min(y1, y2) - 1, lo = Math.min(x1, x2), hi = Math.max(x1, x2);
    for (let x = lo + 1; x < hi; x++) if (solid(x, top) || solid(x, Math.min(y1, y2))) return false;
    for (let y = top; y <= y1; y++) if (solid(x1, y)) return false;
    return true;
  };
  const reach = (dash) => {
    const seen = new Set([S + '']), q = [S];
    while (q.length) {
      const [x, y] = q.shift();
      const spring = t(x, y) === 'T' || t(x, y + 1) === 'u', inW = wet(x, y);
      for (const [x2, y2] of nodes) {
        const k = x2 + ',' + y2; if (seen.has(k)) continue;
        const dy = y - y2, dx = Math.abs(x2 - x);
        let ok = false;
        if (spring && dy <= 10 && dx <= 5) ok = true;
        else if (inW && wet(x2, y2) && Math.abs(dy) + dx <= 2) ok = true;
        else if (inW && dy <= 4 && dy >= 0 && dx <= 5) ok = true;
        else if (dj && dy > 3 && dy <= 6) ok = dx <= 5 + (dash ? 3 : 0);
        else if (dy > 3) ok = false;
        else if (dj && dy >= 0) ok = dx <= H[dy] + 3 + (dash ? 3 : 0);
        else if (dy >= 0) ok = dx <= H[dy] + (dash ? 3 : 0);
        else ok = dx <= 7 + Math.min(4, -dy) + (dash ? 3 : 0);
        if (ok && !(spring && dy > 3) && !(dj && dy > 3) && !(inW && wet(x2, y2)) && !clear(x, y, x2, y2)) ok = false;
        if (ok) { seen.add(k); q.push([x2, y2]); }
      }
    }
    return seen.has(E + '');
  };
  const a = reach(false), b = reach(true);
  if (!b) bad++;
  console.log(`${L.id} ${L.name}: 不冲刺${a ? '可达' : '不可达'} · 含冲刺${b ? '可达' : '【不可达！】'}`);
}
process.exit(bad ? 1 : 0);
