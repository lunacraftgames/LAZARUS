// 关卡可达性粗检：node tools/check_levels.js
// 基于跳跃包络（高 3 格 / 远 4~7 格，冲刺 +3 格，弹床 +9 格高）在瓦片网格上做 BFS，
// 第二章起：二段跳（高 6 格）、培养液（可自由上浮，出水跳 3 格）、反弹软体怪（踩头 +8 格高）。
// 第三章：代码门视为已打开（机关谜题需要手动验证），逻辑地雷下的平台视为存在。
// 第四章：同时考虑正常站立和倒立在天花板上两种状态；有重力周期的关卡任何位置都能翻转，只有重力开关的关卡只能在开关处翻转。
//        一键模式区域按普通跳跃计算（障碍都设计成跳得过去）。
// 小扫（可选角色）：没有二段跳，但能沿任何实心瓦片的表面爬行（墙、天花板、翻过外角）；另外单独检查一遍。
//   第四章：能翻转重力的地方（按时间交替的关卡处处可翻，开关关卡只在开关旁）额外允许「倒过来」的跳跃和落下。
// 只用于发现“明显无法到达出口”的设计错误；不模拟敌人、激光、时序，结果仅供参考。
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = {}; vm.createContext(ctx);
// 只需要地图数据：其余依赖用空壳代替
vm.runInContext('var TILESETS={},PROP_FACTORIES={},PICKUP_INFO={},Inventory={ability:()=>false};function makeEnemy(){};function Player(){}', ctx);
const src = ['levels.js', 'chapter2.js', 'chapter3.js', 'chapter4.js'].map((f) => fs.readFileSync(path.join(__dirname, '../js', f), 'utf8')).join('\n');
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
  const crawlTag = () => { const ok = reachCrawl(L, g, t, solid, wet, support); if (!ok) bad++; return ` · 小扫${ok ? '可达' : '【不可达！】'}`; };
  if (ch >= 4) { if (L.boss) { console.log(`${L.id} ${L.name}: Boss 关，跳过`); continue; } const ok = reach4(L, g, t, solid); if (!ok) bad++; console.log(`${L.id} ${L.name}: 含重力翻转${ok ? '可达' : '【不可达！】'}${crawlTag()}`); continue; }
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
  console.log(`${L.id} ${L.name}: 不冲刺${a ? '可达' : '不可达'} · 含冲刺${b ? '可达' : '【不可达！】'}${crawlTag()}`);
}
// 第四章：节点 = (x, y, 朝向)，朝向 0 = 站在地面上，1 = 倒立站在天花板下
function reach4(L, g, t, solid) {
  const standN = (x, y) => !solid(x, y) && !solid(x, y - 1) && t(x, y) !== '^' && BLOCK.includes(t(x, y + 1));
  const standI = (x, y) => !solid(x, y) && !solid(x, y + 1) && t(x, y) !== 'v' && solid(x, y - 1);
  const switches = []; let S = null, E = null;
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const c = g[y][x]; if (c === 'G') switches.push([x, y]); if (c === 'S') S = [x, y, 0]; if (c === 'E') E = [x, y, 0]; }
  const anyFlip = !!L.gcycle;
  const canFlipAt = (x, y) => anyFlip || switches.some(([sx, sy]) => Math.abs(sx - x) <= 1 && Math.abs(sy - y) <= 1);
  const nodes = [];
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { if (standN(x, y)) nodes.push([x, y, 0]); if (standI(x, y)) nodes.push([x, y, 1]); }
  // o = 1 时把地图上下镜像，复用同一套跳跃规则
  const clearO = (x1, y1, x2, y2, o) => {
    const up = o ? 1 : -1, top = (o ? Math.max(y1, y2) : Math.min(y1, y2)) + up, lo = Math.min(x1, x2), hi = Math.max(x1, x2);
    for (let x = lo + 1; x < hi; x++) if (solid(x, top) || solid(x, o ? Math.max(y1, y2) : Math.min(y1, y2))) return false;
    for (let y = y1; o ? y <= top : y >= top; y += up) if (solid(x1, y)) return false;
    return true;
  };
  const colClear = (x, ya, yb) => { for (let y = Math.min(ya, yb) + 1; y < Math.max(ya, yb); y++) if (solid(x, y)) return false; return true; };
  const key = (n) => n.join(',');
  const seen = new Set([key(S)]), q = [S];
  while (q.length) {
    const [x, y, o] = q.shift();
    for (const n of nodes) {
      const [x2, y2, o2] = n, k = key(n); if (seen.has(k)) continue;
      const dx = Math.abs(x2 - x); let ok = false;
      if (o2 === o) {
        const dy = o ? y2 - y : y - y2; // 本地坐标里的上升高度
        if (dy > 3 && dy <= 6) ok = dx <= 5 + 3; else if (dy > 6) ok = false; else if (dy >= 0) ok = dx <= H[dy] + 3 + 3; else ok = dx <= 7 + Math.min(4, -dy) + 3;
        if (ok && dy <= 3 && !clearO(x, y, x2, y2, o)) ok = false;
      } else if (canFlipAt(x, y)) {
        // 重力翻转：朝反方向「掉」过去，途中还能横向漂移几格
        ok = (o === 0 ? y2 < y : y2 > y) && dx <= 6 && colClear(x, y, y2) && colClear(x2, y, y2);
      }
      if (ok) { seen.add(k); q.push(n); }
    }
  }
  return seen.has(key(E));
}
// 小扫：节点 = 站立点 + 贴着实心瓦片的空格（可爬行表面）。爬行表面之间相邻（含绕过外角的斜向）可以直接爬过去；
// 任何节点都可以起跳 / 蹬墙跳 / 从天花板落下，按单段跳（高 3 格）+ 冲刺计算
function reachCrawl(L, g, t, solid, wet, support) {
  const spike = (x, y) => t(x, y) === '^' || t(x, y) === 'v';
  const free = (x, y) => y >= 0 && y < L.h && !solid(x, y) && !spike(x, y);
  const crawl = (x, y) => free(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1));
  const stand = (x, y) => free(x, y) && (BLOCK.includes(t(x, y + 1)) || support.has(x + ',' + (y + 1)) || wet(x, y) || t(x, y + 1) === 'u');
  let S = null, E = null;
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { if (g[y][x] === 'S') S = [x, y]; if (g[y][x] === 'E') E = [x, y]; }
  const nodes = []; for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) if (stand(x, y) || crawl(x, y)) nodes.push([x, y]);
  const isNode = new Set(nodes.map((n) => n + ''));
  const ch4 = parseInt(L.id, 10) >= 4, sw = [];
  if (ch4) for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) if (g[y][x] === 'G') sw.push([x, y]);
  const flips = ch4 && (!!L.gcycle || sw.length > 0);
  const clearM = (x1, y1, x2, y2) => {
    const top = Math.max(y1, y2) + 1, lo = Math.min(x1, x2), hi = Math.max(x1, x2);
    for (let x = lo + 1; x < hi; x++) if (solid(x, top) || solid(x, Math.max(y1, y2))) return false;
    for (let y = y1; y <= top; y++) if (solid(x1, y)) return false;
    return true;
  };
  const canFlip = (x, y) => ch4 && (!!L.gcycle || sw.some(([sx, sy]) => Math.abs(sx - x) <= 1 && Math.abs(sy - y) <= 1));
  const colClear = (x, ya, yb) => { for (let y = Math.min(ya, yb) + 1; y < Math.max(ya, yb); y++) if (solid(x, y)) return false; return true; };
  const clear = (x1, y1, x2, y2) => {
    const top = Math.min(y1, y2) - 1, lo = Math.min(x1, x2), hi = Math.max(x1, x2);
    for (let x = lo + 1; x < hi; x++) if (solid(x, top) || solid(x, Math.min(y1, y2))) return false;
    for (let y = top; y <= y1; y++) if (solid(x1, y)) return false;
    return true;
  };
  const seen = new Set([S + '']), q = [S];
  const push = (x, y) => { const k = x + ',' + y; if (!seen.has(k) && isNode.has(k)) { seen.add(k); q.push([x, y]); } };
  while (q.length) {
    const [x, y] = q.shift();
    // 沿表面爬行
    if (crawl(x, y)) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (crawl(x + dx, y + dy)) push(x + dx, y + dy);
      for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) if (crawl(x + dx, y + dy) && (solid(x + dx, y) !== solid(x, y + dy))) push(x + dx, y + dy);
    }
    // 跳跃 / 落下
    const spring = t(x, y) === 'T' || t(x, y + 1) === 'u', inW = wet(x, y);
    for (const [x2, y2] of nodes) {
      const k = x2 + ',' + y2; if (seen.has(k)) continue;
      const dy = y - y2, dx = Math.abs(x2 - x);
      let ok = false;
      if (spring && dy <= 10 && dx <= 5) ok = true;
      else if (inW && wet(x2, y2) && Math.abs(dy) + dx <= 2) ok = true;
      else if (inW && dy <= 4 && dy >= 0 && dx <= 5) ok = true;
      else if (dy > 3) ok = false;
      else if (dy >= 0) ok = dx <= H[dy] + 3;
      else ok = dx <= 7 + Math.min(4, -dy) + 3;
      if (ok && !(spring && dy > 3) && !(inW && wet(x2, y2)) && !clear(x, y, x2, y2)) ok = false;
      // 第四章：在能翻转重力的地方，朝上「掉」过去（途中可以横向漂移几格）
      if (!ok && canFlip(x, y) && y2 < y && dx <= 6 && colClear(x, y, y2) && colClear(x2, y, y2)) ok = true;
      // 第四章：倒立在天花板下时的跳跃（上下镜像的同一套规则）
      if (!ok && flips && solid(x, y - 1)) {
        const dm = y2 - y;
        if (dm > 3) ok = false; else if (dm >= 0) ok = dx <= H[dm] + 3; else ok = dx <= 7 + Math.min(4, -dm) + 3;
        if (ok && !clearM(x, y, x2, y2)) ok = false;
      }
      if (ok) { seen.add(k); q.push([x2, y2]); }
    }
  }
  return seen.has(E + '');
}
process.exit(bad ? 1 : 0);
