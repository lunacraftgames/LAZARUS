'use strict';
// ============================================================
//  仓库里「能力 · 武器」的高清展示图（纯矢量绘制，随屏幕分辨率清晰）
//  drawItemArt(ctx, key, cx, cy, t, own)：以 (cx, cy) 为中心，约 280×160 的区域
//  外形与游戏内一致：军刀 = 弯刃 + 黄铜护手 + 棕色握柄；残刃 = 灰色长刃 + 金色十字护手 + 红宝石柄头；
//  冲撞模块 = 灰色驱动器 + 橙色箍 + 橙色核心；推进囊 = 青色发光的生物囊
// ============================================================
const ItemArt = (() => {
  const lg = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const rg = (ctx, x, y, r0, r1, stops) => { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const glow = (ctx, x, y, r, col, a) => { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rg(ctx, x, y, 0, r, [[0, `rgba(${col},${a})`], [1, `rgba(${col},0)`]]); ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalCompositeOperation = 'source-over'; };
  const rivet = (ctx, x, y, r) => { ctx.fillStyle = rg(ctx, x - r * 0.3, y - r * 0.3, 0, r, [[0, '#f4e2a8'], [0.5, '#b08a3a'], [1, '#5a4018']]); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
  // 金属表面上扫过的一道高光
  function sheen(ctx, t, x0, y0, w, h) {
    const k = ((t * 0.35) % 1.6) - 0.3, sx = x0 + w * k;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = lg(ctx, sx - 30, 0, sx + 30, 0, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillRect(x0, y0, w, h); ctx.restore();
  }

  // ---------------- 仪仗军刀 ----------------
  function sabre(ctx, t) {
    // 刀身轮廓（刀尖在右上）：刃背弧线 + 刃口弧线
    const blade = new Path2D();
    blade.moveTo(-62, -5); blade.quadraticCurveTo(40, -16, 128, -44); blade.lineTo(140, -52);
    blade.quadraticCurveTo(128, -34, 118, -30); blade.quadraticCurveTo(36, -2, -62, 5); blade.closePath();
    ctx.save(); ctx.clip(blade);
    ctx.fillStyle = lg(ctx, 0, -26, 0, 6, [[0, '#f8fbff'], [0.35, '#cdd6de'], [0.6, '#8e9aa5'], [1, '#e9eef2']]);
    ctx.fillRect(-70, -60, 220, 70);
    // 血槽
    ctx.strokeStyle = 'rgba(70,82,94,0.75)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-50, -3); ctx.quadraticCurveTo(30, -10, 100, -33); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-50, -1); ctx.quadraticCurveTo(30, -8, 100, -31); ctx.stroke();
    // 刀身蚀刻花纹
    ctx.strokeStyle = 'rgba(120,96,50,0.55)'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 5; i++) { const x = -40 + i * 11, y = 1 - i * 1.4; ctx.beginPath(); ctx.arc(x, y, 3, Math.PI, 0); ctx.stroke(); }
    sheen(ctx, t, -70, -60, 220, 70);
    ctx.restore();
    ctx.strokeStyle = 'rgba(40,48,56,0.9)'; ctx.lineWidth = 1.2; ctx.stroke(blade);
    // 刃口的冷光
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-60, 4.5); ctx.quadraticCurveTo(36, -2.5, 117, -30.5); ctx.stroke();
    // 护手：黄铜 D 形护弓 + 横档
    const brass = lg(ctx, 0, -14, 0, 30, [[0, '#fff0b8'], [0.3, '#e0b650'], [0.7, '#9a7024'], [1, '#5e4214']]);
    ctx.fillStyle = brass; ctx.strokeStyle = '#4a3210'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-72, -14); ctx.lineTo(-58, -12); ctx.lineTo(-56, 12); ctx.lineTo(-74, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-64, 0, 5, 11, 0, 0, 7); ctx.fill(); ctx.stroke();
    // D 形护弓（绕到柄头）
    ctx.lineWidth = 5; ctx.strokeStyle = brass;
    ctx.beginPath(); ctx.moveTo(-66, 12); ctx.bezierCurveTo(-78, 34, -126, 34, -134, 10); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,245,200,0.8)';
    ctx.beginPath(); ctx.moveTo(-67, 10); ctx.bezierCurveTo(-79, 31, -125, 31, -132, 8); ctx.stroke();
    // 握柄：鲨鱼皮 + 金丝缠绕
    ctx.fillStyle = lg(ctx, 0, -9, 0, 9, [[0, '#6a4428'], [0.5, '#3e2414'], [1, '#22140a']]);
    ctx.beginPath(); ctx.moveTo(-74, -8); ctx.quadraticCurveTo(-100, -11, -128, -7); ctx.lineTo(-128, 7); ctx.quadraticCurveTo(-100, 11, -74, 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(240,210,120,0.85)'; ctx.lineWidth = 1;
    for (let x = -124; x < -76; x += 4.2) { ctx.beginPath(); ctx.moveTo(x, -8); ctx.lineTo(x + 5, 8); ctx.stroke(); }
    // 柄头（狮首帽）
    ctx.fillStyle = brass; ctx.strokeStyle = '#4a3210'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-128, -10); ctx.quadraticCurveTo(-146, -12, -146, 0); ctx.quadraticCurveTo(-146, 12, -128, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    rivet(ctx, -138, 0, 3);
    // 刀穗（金色流苏，轻轻摆动）
    const sw = Math.sin(t * 1.6) * 4;
    ctx.strokeStyle = '#c99a30'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-100, 26); ctx.quadraticCurveTo(-104 + sw * 0.4, 38, -102 + sw, 48); ctx.stroke();
    ctx.fillStyle = lg(ctx, 0, 46, 0, 70, [[0, '#f0c860'], [1, '#8a6018']]);
    ctx.beginPath(); ctx.moveTo(-106 + sw, 46); ctx.lineTo(-98 + sw, 46); ctx.lineTo(-94 + sw * 1.3, 70); ctx.lineTo(-110 + sw * 1.3, 70); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(90,60,16,0.6)'; ctx.lineWidth = 0.7;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-105 + i * 1.8 + sw, 50); ctx.lineTo(-108 + i * 3.4 + sw * 1.3, 70); ctx.stroke(); }
    rivet(ctx, -102 + sw, 46, 3.5);
  }

  // ---------------- 巨像残刃 ----------------
  function relic(ctx, t) {
    // 宽厚的古剑，刀尖断裂成锯齿状
    const blade = new Path2D();
    blade.moveTo(-58, -13); blade.lineTo(104, -16); blade.lineTo(114, -9); blade.lineTo(108, -3); blade.lineTo(122, 2);
    blade.lineTo(110, 8); blade.lineTo(116, 13); blade.lineTo(-58, 13); blade.closePath();
    ctx.save(); ctx.clip(blade);
    ctx.fillStyle = lg(ctx, 0, -16, 0, 14, [[0, '#dfe4e8'], [0.45, '#9aa0a4'], [0.55, '#6f767b'], [1, '#b7bec2']]);
    ctx.fillRect(-60, -20, 190, 40);
    // 中脊
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-56, -0.5); ctx.lineTo(108, -1); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,44,48,0.5)'; ctx.beginPath(); ctx.moveTo(-56, 1.5); ctx.lineTo(108, 1); ctx.stroke();
    // 锈斑与缺口
    ctx.fillStyle = 'rgba(138,82,52,0.6)';
    for (const [x, y, r] of [[-20, -8, 5], [12, 7, 7], [44, -9, 4], [70, 6, 6], [90, -6, 3]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, 0.3, 0, 7); ctx.fill(); }
    ctx.strokeStyle = 'rgba(30,30,30,0.8)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, -16); ctx.lineTo(56, -7); ctx.lineTo(62, -2); ctx.moveTo(30, 13); ctx.lineTo(34, 6); ctx.lineTo(29, 2); ctx.stroke();
    // 古老的铭文（发着微弱的红光）
    const pulse = 0.35 + 0.25 * Math.sin(t * 2.2);
    ctx.fillStyle = `rgba(255,90,60,${pulse})`;
    for (let i = 0; i < 6; i++) ctx.fillRect(-44 + i * 12, -4.5, 6 - (i % 2) * 2, 2);
    sheen(ctx, t + 1.3, -60, -20, 190, 40);
    ctx.restore();
    ctx.strokeStyle = '#2a2d30'; ctx.lineWidth = 1.4; ctx.stroke(blade);
    // 巨像的固定夹具（还卡在刀根上）
    ctx.fillStyle = lg(ctx, 0, -20, 0, 20, [[0, '#6e6a62'], [1, '#3a3733']]);
    ctx.fillRect(-58, -18, 22, 36); ctx.strokeStyle = '#1a1917'; ctx.strokeRect(-58, -18, 22, 36);
    rivet(ctx, -52, -12, 2.4); rivet(ctx, -42, -12, 2.4); rivet(ctx, -52, 12, 2.4); rivet(ctx, -42, 12, 2.4);
    // 十字护手：宽大的金色护手，两端卷曲
    const gold = lg(ctx, 0, -40, 0, 40, [[0, '#fff0b8'], [0.3, '#d4a840'], [0.7, '#8a6a36'], [1, '#4a3218']]);
    ctx.fillStyle = gold; ctx.strokeStyle = '#3a2610'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-60, -8); ctx.lineTo(-66, -38); ctx.quadraticCurveTo(-72, -50, -62, -52); ctx.quadraticCurveTo(-56, -46, -60, -40);
    ctx.lineTo(-54, -8); ctx.lineTo(-54, 8); ctx.lineTo(-60, 40); ctx.quadraticCurveTo(-56, 46, -62, 52); ctx.quadraticCurveTo(-72, 50, -66, 38);
    ctx.lineTo(-60, 8); ctx.lineTo(-74, 8); ctx.lineTo(-74, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
    rivet(ctx, -64, 0, 4);
    // 握柄：旧布条缠绕
    ctx.fillStyle = lg(ctx, 0, -8, 0, 8, [[0, '#6a4a2a'], [0.5, '#4a3218'], [1, '#2a1a0a']]);
    ctx.fillRect(-124, -7, 50, 14);
    ctx.strokeStyle = 'rgba(200,170,120,0.55)'; ctx.lineWidth = 2.4;
    for (let x = -122; x < -76; x += 6) { ctx.beginPath(); ctx.moveTo(x, -7); ctx.lineTo(x + 4, 7); ctx.stroke(); }
    // 散开的布条尾巴
    const sw = Math.sin(t * 1.4) * 3;
    ctx.strokeStyle = 'rgba(170,140,95,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-96, 7); ctx.quadraticCurveTo(-98 + sw, 26, -90 + sw * 1.4, 44); ctx.stroke();
    // 柄头：红宝石
    ctx.fillStyle = gold; ctx.strokeStyle = '#3a2610';
    ctx.beginPath(); ctx.moveTo(-124, -11); ctx.lineTo(-138, -13); ctx.quadraticCurveTo(-150, 0, -138, 13); ctx.lineTo(-124, 11); ctx.closePath(); ctx.fill(); ctx.stroke();
    glow(ctx, -138, 0, 26, '255,50,40', 0.45 + 0.2 * Math.sin(t * 3));
    ctx.fillStyle = rg(ctx, -140, -3, 0, 7, [[0, '#ffc0b0'], [0.4, '#f22'], [1, '#600']]);
    ctx.beginPath(); ctx.moveTo(-138, -7); ctx.lineTo(-132, 0); ctx.lineTo(-138, 7); ctx.lineTo(-144, 0); ctx.closePath(); ctx.fill();
  }

  // ---------------- 冲撞模块 ----------------
  function dash(ctx, t) {
    const pump = Math.max(0, Math.sin(t * 3)) ** 6; // 活塞周期性猛地前冲
    // 背部安装架
    ctx.fillStyle = lg(ctx, 0, -40, 0, 40, [[0, '#5a5650'], [1, '#2e2c28']]);
    ctx.beginPath(); ctx.moveTo(-110, -30); ctx.lineTo(-80, -44); ctx.lineTo(-80, 44); ctx.lineTo(-110, 30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1a1917'; ctx.lineWidth = 1.5; ctx.stroke();
    rivet(ctx, -96, -22, 3); rivet(ctx, -96, 22, 3);
    // 液压缸主体
    const body = lg(ctx, 0, -34, 0, 34, [[0, '#9a958a'], [0.25, '#6e6a62'], [0.7, '#45423c'], [1, '#2a2826']]);
    ctx.fillStyle = body; ctx.fillRect(-80, -34, 110, 68);
    ctx.strokeStyle = '#1a1917'; ctx.strokeRect(-80, -34, 110, 68);
    // 橙色加固箍（与游戏里的一致）
    for (const x of [-66, -22]) {
      ctx.fillStyle = lg(ctx, 0, -38, 0, 38, [[0, '#ffc07a'], [0.4, '#b8743a'], [1, '#6a3a14']]);
      ctx.fillRect(x, -38, 12, 76); ctx.strokeStyle = '#3a200a'; ctx.strokeRect(x, -38, 12, 76);
      rivet(ctx, x + 6, -30, 2.2); rivet(ctx, x + 6, 30, 2.2);
    }
    // 警示条纹
    ctx.save(); ctx.beginPath(); ctx.rect(-50, 20, 24, 12); ctx.clip();
    for (let i = -2; i < 6; i++) { ctx.fillStyle = i % 2 ? '#1a1917' : '#e0b040'; ctx.beginPath(); ctx.moveTo(-50 + i * 8, 32); ctx.lineTo(-42 + i * 8, 20); ctx.lineTo(-34 + i * 8, 20); ctx.lineTo(-42 + i * 8, 32); ctx.fill(); }
    ctx.restore();
    // 核心视窗：橙色能量
    const pulse = 0.6 + 0.4 * Math.sin(t * 5);
    ctx.fillStyle = '#1a1210'; ctx.beginPath(); ctx.arc(-38, -8, 13, 0, 7); ctx.fill();
    ctx.fillStyle = rg(ctx, -38, -8, 1, 12, [[0, '#fff4d0'], [0.35, `rgba(255,170,80,${pulse})`], [1, 'rgba(120,40,0,0.2)']]);
    ctx.beginPath(); ctx.arc(-38, -8, 11, 0, 7); ctx.fill();
    ctx.strokeStyle = '#b8743a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(-38, -8, 13, 0, 7); ctx.stroke();
    glow(ctx, -38, -8, 40, '255,170,80', 0.35 * pulse);
    // 活塞杆
    const rx = 30 + pump * 26;
    ctx.fillStyle = lg(ctx, 0, -10, 0, 10, [[0, '#f4f6f8'], [0.5, '#a8b0b6'], [1, '#6a7076']]);
    ctx.fillRect(30, -9, rx - 30 + 20, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(30, -6, rx - 30 + 20, 2);
    // 冲撞锤头
    ctx.fillStyle = lg(ctx, 0, -40, 0, 40, [[0, '#b8b2a4'], [0.5, '#6e6a62'], [1, '#34322e']]);
    ctx.beginPath(); ctx.moveTo(rx + 20, -40); ctx.lineTo(rx + 44, -32); ctx.lineTo(rx + 52, 0); ctx.lineTo(rx + 44, 32); ctx.lineTo(rx + 20, 40); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1a1917'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = '#b8743a'; ctx.fillRect(rx + 20, -40, 6, 80);
    rivet(ctx, rx + 34, -22, 2.6); rivet(ctx, rx + 34, 22, 2.6); rivet(ctx, rx + 40, 0, 2.6);
    // 液压管线
    ctx.strokeStyle = '#2a2826'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-70, 34); ctx.bezierCurveTo(-60, 60, 10, 60, 22, 34); ctx.stroke();
    ctx.strokeStyle = '#6a3a14'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-70, 34); ctx.bezierCurveTo(-60, 58, 10, 58, 22, 34); ctx.stroke();
    // 冲击时的速度线与火花
    if (pump > 0.3) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,200,120,${pump * 0.8})`; ctx.lineWidth = 2;
      for (const y of [-26, -8, 10, 28]) { ctx.beginPath(); ctx.moveTo(rx + 58, y); ctx.lineTo(rx + 58 + 26 * pump, y); ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // ---------------- 推进囊 ----------------
  function thruster(ctx, t) {
    const breathe = 1 + Math.sin(t * 2.4) * 0.04;
    // 喷口光焰（在下方）
    const fl = 0.6 + 0.4 * Math.sin(t * 17) * Math.sin(t * 7);
    glow(ctx, 0, 52, 60, '120,240,255', 0.3 + 0.15 * fl);
    ctx.globalCompositeOperation = 'lighter';
    for (const nx of [-18, 0, 18]) {
      ctx.fillStyle = lg(ctx, 0, 46, 0, 80 + fl * 10, [[0, 'rgba(220,255,255,0.9)'], [0.4, 'rgba(120,240,255,0.5)'], [1, 'rgba(60,160,255,0)']]);
      ctx.beginPath(); ctx.moveTo(nx - 5, 46); ctx.lineTo(nx + 5, 46); ctx.lineTo(nx, 76 + fl * 12); ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // 金属颈环 + 三个喷口
    ctx.fillStyle = lg(ctx, -40, 0, 40, 0, [[0, '#3a3a3a'], [0.5, '#9aa4aa'], [1, '#3a3a3a']]);
    ctx.fillRect(-36, 30, 72, 14); ctx.strokeStyle = '#141414'; ctx.lineWidth = 1.2; ctx.strokeRect(-36, 30, 72, 14);
    for (const nx of [-18, 0, 18]) {
      ctx.fillStyle = lg(ctx, nx - 7, 0, nx + 7, 0, [[0, '#2a2a2a'], [0.5, '#8a9298'], [1, '#2a2a2a']]);
      ctx.beginPath(); ctx.moveTo(nx - 6, 44); ctx.lineTo(nx + 6, 44); ctx.lineTo(nx + 8, 52); ctx.lineTo(nx - 8, 52); ctx.closePath(); ctx.fill();
    }
    rivet(ctx, -28, 37, 2.2); rivet(ctx, 28, 37, 2.2);
    // 生物囊：半透明膜
    ctx.save(); ctx.translate(0, 0); ctx.scale(breathe, 2 - breathe);
    const sac = new Path2D();
    sac.moveTo(-32, 32); sac.bezierCurveTo(-62, 10, -58, -48, -20, -62); sac.bezierCurveTo(4, -70, 40, -60, 52, -30);
    sac.bezierCurveTo(62, -4, 46, 24, 32, 32); sac.closePath();
    ctx.fillStyle = rg(ctx, -6, -18, 4, 70, [[0, 'rgba(210,255,255,0.95)'], [0.35, 'rgba(90,220,240,0.75)'], [0.8, 'rgba(30,110,150,0.8)'], [1, 'rgba(12,50,70,0.9)']]);
    ctx.fill(sac);
    ctx.save(); ctx.clip(sac);
    // 血管脉络
    ctx.strokeStyle = 'rgba(200,90,160,0.5)'; ctx.lineWidth = 1.4;
    for (const [x0, y0, x1, y1, x2, y2] of [[-30, 30, -44, -6, -20, -40], [30, 30, 46, 0, 30, -40], [0, 32, 6, -10, -6, -56], [-18, 30, -6, 0, 14, -30]]) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x1, y1, x2, y2); ctx.stroke(); }
    // 里面的气泡
    ctx.fillStyle = 'rgba(230,255,255,0.7)';
    for (let i = 0; i < 7; i++) { const ph = (t * 0.5 + i / 7) % 1, bx = Math.sin(i * 2.3) * 26 + Math.sin(t * 2 + i) * 3, by = 28 - ph * 90; ctx.beginPath(); ctx.arc(bx, by, 1.5 + (i % 3), 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(180,250,255,0.8)'; ctx.lineWidth = 1.5; ctx.stroke(sac);
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(-22, -36, 8, 14, -0.5, 0, 7); ctx.fill();
    ctx.restore();
    glow(ctx, 0, -14, 70, '120,240,255', 0.18);
  }


  // ---------------- 古董燧发枪 ----------------
  function flintlock(ctx, t) {
    const wood = (y0, y1) => lg(ctx, 0, y0, 0, y1, [[0, '#9a6232'], [0.4, '#6a3e1c'], [1, '#3a200c']]);
    const brass = lg(ctx, 0, -20, 0, 20, [[0, '#fff0b8'], [0.35, '#d4a840'], [1, '#6a4a16']]);
    // 枪托（弯曲的木握把）
    ctx.fillStyle = wood(-10, 60); ctx.strokeStyle = '#2a1608'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-40, -12); ctx.bezierCurveTo(-60, -8, -86, 20, -96, 48); ctx.quadraticCurveTo(-92, 62, -76, 58);
    ctx.bezierCurveTo(-66, 34, -50, 16, -30, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 木纹
    ctx.strokeStyle = 'rgba(40,20,6,0.45)'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-44 - i * 3, -6 + i * 4); ctx.bezierCurveTo(-60 - i * 3, 4 + i * 4, -74 - i * 2, 24 + i * 3, -84 - i, 46 + i * 2); ctx.stroke(); }
    // 柄底黄铜帽
    ctx.fillStyle = brass; ctx.beginPath(); ctx.ellipse(-86, 54, 11, 7, -0.5, 0, 7); ctx.fill(); ctx.strokeStyle = '#3a2610'; ctx.stroke();
    rivet(ctx, -86, 54, 3);
    // 前托（包住枪管的木头）
    ctx.fillStyle = wood(-14, 4); ctx.beginPath(); ctx.moveTo(-40, -12); ctx.lineTo(70, -10); ctx.lineTo(70, 0); ctx.lineTo(-30, 10); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#2a1608'; ctx.lineWidth = 1.2; ctx.stroke();
    // 枪管（八角形的钢管）
    ctx.fillStyle = lg(ctx, 0, -20, 0, -8, [[0, '#e8eef2'], [0.5, '#8a949c'], [1, '#4a5258']]);
    ctx.fillRect(-10, -20, 128, 11); ctx.strokeStyle = '#22282c'; ctx.strokeRect(-10, -20, 128, 11);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-8, -18, 124, 1.5);
    ctx.save(); ctx.beginPath(); ctx.rect(-10, -20, 128, 11); ctx.clip(); sheen(ctx, t, -10, -20, 128, 11); ctx.restore();
    // 枪口 / 枪箍
    ctx.fillStyle = brass; ctx.fillRect(114, -22, 7, 15); ctx.fillRect(40, -21, 5, 13); ctx.fillRect(66, -21, 5, 13);
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(121, -14.5, 3, 0, 7); ctx.fill();
    // 通条
    ctx.fillStyle = '#6a6e72'; ctx.fillRect(-4, -5, 110, 2.5); ctx.fillStyle = brass; ctx.fillRect(104, -6, 4, 4.5);
    // 燧发机：击锤 + 燧石 + 药池盖
    ctx.fillStyle = lg(ctx, 0, -30, 0, 4, [[0, '#c8ced2'], [1, '#4a5258']]);
    ctx.beginPath(); ctx.moveTo(-36, -10); ctx.lineTo(-2, -10); ctx.lineTo(-2, 2); ctx.lineTo(-30, 4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#22282c'; ctx.stroke();
    ctx.strokeStyle = '#8a949c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-28, -8); ctx.quadraticCurveTo(-36, -26, -24, -32); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(-27, -35, 8, 6);           // 燧石
    ctx.fillStyle = '#6a6e72'; ctx.fillRect(-14, -22, 4, 12);          // 药池盖
    // 扳机 + 扳机护圈
    ctx.strokeStyle = brass; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-36, 6); ctx.quadraticCurveTo(-26, 26, -12, 6); ctx.stroke();
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-24, 4); ctx.quadraticCurveTo(-26, 12, -22, 16); ctx.stroke();
    // 装饰雕花
    ctx.strokeStyle = 'rgba(255,230,160,0.6)'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-18 + i * 7, -3, 2.5, 0, Math.PI); ctx.stroke(); }
    // 枪口残烟
    const k = (t * 0.6) % 1;
    ctx.fillStyle = `rgba(200,200,200,${0.25 * (1 - k)})`; ctx.beginPath(); ctx.arc(128 + k * 20, -18 - k * 26, 4 + k * 10, 0, 7); ctx.fill();
  }

  // ---------------- 生物孢子枪 ----------------
  function spore(ctx, t) {
    const metal = lg(ctx, 0, -20, 0, 20, [[0, '#8a9aa6'], [0.5, '#3a4a54'], [1, '#1a242a']]);
    // 枪身骨架
    ctx.fillStyle = metal; ctx.strokeStyle = '#0e1418'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-70, -12); ctx.lineTo(40, -14); ctx.lineTo(56, -6); ctx.lineTo(56, 8); ctx.lineTo(-40, 12); ctx.lineTo(-70, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 握把
    ctx.beginPath(); ctx.moveTo(-40, 8); ctx.lineTo(-26, 8); ctx.lineTo(-34, 52); ctx.lineTo(-52, 50); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a1a24'; for (let i = 0; i < 5; i++) ctx.fillRect(-46 + i * 1.2, 16 + i * 7, 12, 3);
    // 扳机
    ctx.strokeStyle = '#8a9aa6'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-20, 10); ctx.quadraticCurveTo(-22, 20, -16, 24); ctx.stroke();
    // 孢子囊（半透明，里面的孢子在翻滚）
    const pulse = 1 + Math.sin(t * 3) * 0.05;
    ctx.save(); ctx.translate(-8, -30); ctx.scale(pulse, 2 - pulse);
    const sac = new Path2D(); sac.ellipse(0, 0, 38, 22, 0, 0, 7);
    ctx.fillStyle = rg(ctx, -8, -8, 3, 40, [[0, 'rgba(220,255,230,0.95)'], [0.5, 'rgba(110,220,160,0.75)'], [1, 'rgba(30,90,70,0.85)']]);
    ctx.fill(sac); ctx.save(); ctx.clip(sac);
    for (let i = 0; i < 9; i++) { const a = t * (0.8 + i * 0.1) + i * 1.7, r = 8 + (i % 3) * 7; ctx.fillStyle = i % 3 ? 'rgba(200,106,176,0.85)' : 'rgba(255,255,230,0.9)'; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.4, Math.sin(a) * r * 0.7, 2.2 + (i % 2), 0, 7); ctx.fill(); }
    ctx.strokeStyle = 'rgba(200,90,160,0.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-30, 8); ctx.quadraticCurveTo(-6, -4, 26, 10); ctx.moveTo(-20, -16); ctx.quadraticCurveTo(0, -2, 22, -14); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(180,255,210,0.8)'; ctx.lineWidth = 1.5; ctx.stroke(sac);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(-16, -10, 7, 4, -0.3, 0, 7); ctx.fill();
    ctx.restore();
    // 固定爪
    ctx.fillStyle = metal;
    for (const x of [-34, 18]) { ctx.beginPath(); ctx.moveTo(x - 4, -12); ctx.lineTo(x + 4, -12); ctx.lineTo(x + 2, -32); ctx.lineTo(x - 2, -32); ctx.closePath(); ctx.fill(); }
    // 三联喷口
    for (const [dy, a] of [[-8, -0.16], [0, 0], [8, 0.16]]) {
      ctx.save(); ctx.translate(56, dy * 0.6); ctx.rotate(a);
      ctx.fillStyle = lg(ctx, 0, -4, 0, 4, [[0, '#c8d4da'], [1, '#3a4a54']]); ctx.fillRect(0, -3.5, 22, 7);
      ctx.fillStyle = '#c86ab0'; ctx.fillRect(18, -3.5, 4, 7);
      ctx.restore();
    }
    glow(ctx, 78, 0, 26, '150,240,190', 0.25 + 0.15 * Math.sin(t * 4));
    // 连接管
    ctx.strokeStyle = '#2a3a44'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(24, -24); ctx.quadraticCurveTo(44, -24, 46, -12); ctx.stroke();
    ctx.strokeStyle = 'rgba(150,240,190,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    rivet(ctx, -60, -2, 2.4); rivet(ctx, 30, -4, 2.4);
  }

  // ---------------- 小扫的旋转刷 ----------------
  function brush(ctx, t) {
    const spin = t * 8;
    // 刷盘底座
    ctx.fillStyle = lg(ctx, 0, -40, 0, 20, [[0, '#f2c440'], [1, '#8a6414']]);
    ctx.beginPath(); ctx.ellipse(0, -10, 80, 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3a2e14'; ctx.lineWidth = 2; ctx.stroke();
    // 警示条纹
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, -10, 80, 26, 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#222'; for (let i = -100; i < 100; i += 24) { ctx.beginPath(); ctx.moveTo(i, 16); ctx.lineTo(i + 12, 16); ctx.lineTo(i + 30, -36); ctx.lineTo(i + 18, -36); ctx.fill(); }
    ctx.restore();
    // 旋转的刷毛
    for (let i = 0; i < 28; i++) {
      const a = spin + i / 28 * Math.PI * 2, x = Math.cos(a) * 70, z = Math.sin(a);
      ctx.strokeStyle = z > 0 ? '#f0e8c8' : '#9a9070'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, 8 + z * 8); ctx.lineTo(x * 1.08, 34 + z * 8); ctx.stroke();
    }
    // 中心轴
    ctx.fillStyle = rg(ctx, -6, -18, 0, 20, [[0, '#fff2c0'], [1, '#6a5018']]); ctx.beginPath(); ctx.arc(0, -12, 16, 0, 7); ctx.fill();
    glow(ctx, 0, -12, 40, '255,210,90', 0.25);
  }
  // ---------------- 阿特拉斯的液压拳 ----------------
  function fist(ctx, t) {
    const pump = Math.max(0, Math.sin(t * 3)) ** 4 * 14;
    // 液压杆
    ctx.fillStyle = lg(ctx, 0, -14, 0, 14, [[0, '#c9c7c0'], [0.5, '#7a7872'], [1, '#3e3c38']]);
    ctx.fillRect(-110, -10, 70 + pump, 20);
    ctx.fillStyle = '#5b5a55'; ctx.fillRect(-120, -22, 26, 44);
    rivet(ctx, -107, -14, 3); rivet(ctx, -107, 14, 3);
    // 拳套：工程黄 + 黑黄警示条
    ctx.save(); ctx.translate(pump, 0);
    const body = new Path2D(); body.rect(-44, -42, 96, 84);
    ctx.fillStyle = lg(ctx, 0, -42, 0, 42, [[0, '#f7c948'], [0.6, '#e0a525'], [1, '#8a6414']]); ctx.fill(body);
    ctx.save(); ctx.clip(body); ctx.fillStyle = '#1e1c19';
    for (let i = -60; i < 60; i += 20) { ctx.beginPath(); ctx.moveTo(i, 42); ctx.lineTo(i + 10, 42); ctx.lineTo(i + 30, 22); ctx.lineTo(i + 20, 22); ctx.fill(); }
    sheen(ctx, t, -44, -42, 96, 84); ctx.restore();
    ctx.strokeStyle = '#3a2e14'; ctx.lineWidth = 3; ctx.stroke(body);
    // 指节
    for (let k = 0; k < 4; k++) { ctx.fillStyle = '#5b5a55'; ctx.fillRect(52, -38 + k * 20, 16, 16); ctx.fillStyle = '#8a8880'; ctx.fillRect(54, -36 + k * 20, 12, 4); }
    rivet(ctx, -30, -28, 4); rivet(ctx, 36, -28, 4); rivet(ctx, -30, 8, 4); rivet(ctx, 36, 8, 4);
    ctx.restore();
    glow(ctx, 60 + pump, 0, 50, '255,190,80', 0.2);
  }
  // ---------------- 赤影的数据刃 ----------------
  function datablade(ctx, t) {
    const j = Math.floor(t * 12) % 5;
    ctx.save(); ctx.globalAlpha = 0.9;
    // 刃身：半透明红色，边缘像素抖动
    const blade = new Path2D(); blade.moveTo(-70, 10); blade.lineTo(90, -8); blade.lineTo(110, -2); blade.lineTo(-70, 20); blade.closePath();
    ctx.fillStyle = lg(ctx, -70, 0, 110, 0, [[0, 'rgba(120,10,30,0.9)'], [0.6, 'rgba(255,77,109,0.85)'], [1, 'rgba(255,220,230,0.95)']]); ctx.fill(blade);
    ctx.strokeStyle = 'rgba(255,180,200,0.9)'; ctx.lineWidth = 2; ctx.stroke(blade);
    for (let k = 0; k < 9; k++) { const px = -60 + k * 19 + ((k * 7 + j * 3) % 6), py = 6 - k * 1.6 + ((k + j) % 3 - 1) * 8; ctx.fillStyle = k % 2 ? 'rgba(255,77,109,0.8)' : 'rgba(255,255,255,0.7)'; ctx.fillRect(px, py, 5, 5); }
    // 错位切片
    ctx.fillStyle = 'rgba(80,220,255,0.35)'; ctx.fillRect(-40 + j * 6, -2, 60, 3);
    // 握柄
    ctx.fillStyle = '#2a0f16'; ctx.fillRect(-110, 6, 44, 18); ctx.fillStyle = '#ff4d6d'; ctx.fillRect(-72, 2, 6, 26);
    ctx.restore();
    glow(ctx, 40, 0, 70, '255,77,109', 0.22);
  }
  // ---------------- 信使的信号枪 ----------------
  function flaregun(ctx, t) {
    // 粗短的橙色枪管 + 白色握把，枪口冒着一颗信号弹
    ctx.fillStyle = lg(ctx, 0, -26, 0, 22, [[0, '#ffc07a'], [0.5, '#ff9a3c'], [1, '#a4561a']]);
    ctx.fillRect(-60, -26, 120, 44);
    ctx.fillStyle = '#5a4636'; ctx.fillRect(56, -30, 14, 52); ctx.fillRect(-64, -22, 10, 36);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-56, -22, 108, 6);
    ctx.fillStyle = lg(ctx, 0, 10, 0, 90, [[0, '#f4efe4'], [1, '#b8b0a0']]);
    ctx.beginPath(); ctx.moveTo(-50, 18); ctx.lineTo(-18, 18); ctx.lineTo(-24, 92); ctx.lineTo(-62, 92); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a4636'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(-8, 30, 12, 0, Math.PI); ctx.stroke();
    const pulse = 0.6 + 0.4 * Math.sin(t * 6);
    glow(ctx, 92, -4, 46 * pulse + 20, '255,154,60', 0.45);
    ctx.fillStyle = '#fff4d8'; ctx.beginPath(); ctx.arc(92, -4, 9, 0, 7); ctx.fill();
  }
  const ART = { flare: { fn: flaregun, rot: -0.08, s: 0.9 }, datablade: { fn: datablade, rot: -0.1, s: 0.95 }, fist: { fn: fist, rot: 0, s: 0.95 }, brush: { fn: brush, rot: 0, s: 1 }, sabre: { fn: sabre, rot: -0.12, s: 0.95 }, relicBlade: { fn: relic, rot: -0.1, s: 0.9 }, dashStrike: { fn: dash, rot: 0, s: 1 }, doubleJump: { fn: thruster, rot: 0, s: 0.85 }, flintlock: { fn: flintlock, rot: -0.06, s: 0.95 }, sporeGun: { fn: spore, rot: -0.05, s: 1.05 } };

  function draw(ctx, key, cx, cy, t, own) {
    const A = ART[key]; if (!A) return false;
    const bob = Math.sin(t * 1.5) * 3;
    ctx.save();
    // 展台光斑
    ctx.fillStyle = rg(ctx, cx, cy + 62, 4, 110, [[0, 'rgba(255,255,255,0.10)'], [1, 'rgba(255,255,255,0)']]);
    ctx.beginPath(); ctx.ellipse(cx, cy + 62, 110, 12, 0, 0, 7); ctx.fill();
    ctx.translate(cx, cy + bob); ctx.rotate(A.rot); ctx.scale(A.s, A.s);
    if (!own) {
      // 未获得：只显示剪影
      ctx.filter = 'brightness(0) opacity(0.6)';
      A.fn(ctx, 0);
      ctx.filter = 'none';
    } else A.fn(ctx, t);
    ctx.restore();
    return true;
  }
  // 小图标（HUD、拾取物用）：没有展台和浮动
  function icon(ctx, key, cx, cy, scale, t) {
    const A = ART[key]; if (!A) return;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(A.rot - (key === 'sabre' || key === 'relicBlade' ? 0.5 : 0)); ctx.scale(scale, scale);
    A.fn(ctx, t); ctx.restore();
  }
  return { draw, icon };
})();
