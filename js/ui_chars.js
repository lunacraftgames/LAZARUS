'use strict';
// ============================================================
//  角色界面
//  · mode 'new'：开始新的游戏前选择角色和难度（唯一可以选的时机，选定后整个周目都不能更换）
//  · mode 'view'：标题画面「角色」，只能查看
// ============================================================
Object.assign(Game, {
  openChars(mode) {
    this.charMode = mode; this.state = 'chars'; this.stateT = 0;
    const cur = CHAR_ORDER.indexOf(mode === 'new' ? Inventory.p.char || 'lazarus' : this.charId);
    this.charSel = Math.max(0, cur); if (!charDef(CHAR_ORDER[this.charSel]).unlocked()) this.charSel = 0;
    this.charPrev = {};
    // 难度：默认上次开新游戏选的（第一次是普通）
    this.diffSel = Math.max(0, DIFFS.findIndex((d) => d.id === (mode === 'new' ? Inventory.p.diff || DIFF_DEFAULT : this.diff)));
    if (!DIFFS[this.diffSel].unlocked()) this.diffSel = DIFFS.findIndex((d) => d.id === DIFF_DEFAULT);
    Sound.init(); Sound.sfx.select();
  },
  charPick(i) {
    const id = CHAR_ORDER[i], C = charDef(id);
    if (this.charMode !== 'new') { Sound.sfx.denied(); this.toastHint('角色只能在开始「新的游戏」时选择'); return; }
    if (!C.unlocked()) { Sound.sfx.denied(); this.toastHint(C.unlockText || '尚未解锁'); return; }
    Sound.sfx.confirm(); this.beginRun(id, DIFFS[this.diffSel].id);
  },
  setCharSel(i) { if (i !== this.charSel) { this.charSel = i; Sound.sfx.select(); } },
  // 难度只能在新游戏开始前选；未解锁的难度选不了
  setDiffSel(i) {
    if (this.charMode !== 'new' || i === this.diffSel) return;
    const D = DIFFS[i]; if (!D) return;
    if (!D.unlocked()) { Sound.sfx.denied(); this.toastHint(D.unlockText || '尚未解锁'); return; }
    this.diffSel = i; Sound.sfx.select();
  },
  stepDiff(dir) { // ← →：在已解锁的难度之间切换
    if (this.charMode !== 'new') return;
    const n = DIFFS.length; let i = this.diffSel;
    for (let k = 0; k < n; k++) { i = (i + dir + n) % n; if (DIFFS[i].unlocked()) break; }
    this.setDiffSel(i);
  },
  // 选中哪个角色，就试听它的音乐风格（离开界面时 toTitle 会换回当前周目的角色）
  previewCharMusic() { const id = CHAR_ORDER[this.charSel]; applyCharMusic(charDef(id).unlocked() ? id : this.charId); },
  updateChars() {
    const n = CHAR_ORDER.length;
    // ↑ ↓ 选角色，← → 选难度（查看模式下 ← → 也用来翻角色）
    if (Input.hit('mu') || (this.charMode !== 'new' && Input.hit('ml'))) this.setCharSel((this.charSel + n - 1) % n);
    if (Input.hit('md') || (this.charMode !== 'new' && Input.hit('mr'))) this.setCharSel((this.charSel + 1) % n);
    if (this.charMode === 'new' && Input.hit('ml')) this.stepDiff(-1);
    if (this.charMode === 'new' && Input.hit('mr')) this.stepDiff(1);
    if (Input.hit('confirm') && this.stateT > 0.2) this.charPick(this.charSel);
    if (Input.hit('pause') || Input.hit('back')) { Sound.sfx.select(); this.toTitle(); }
    this.previewCharMusic();
    const id = CHAR_ORDER[this.charSel];
    if (charDef(id).unlocked() && !Inventory.p.charSeen[id]) { Inventory.p.charSeen[id] = true; Inventory.save(); }
  },
  // 预览用的角色模型（原地走路；小扫会轮流演示地面 / 贴墙 / 倒挂）
  charPreview(id) {
    let p = this.charPrev[id];
    if (!p) { p = this.charPrev[id] = new Player(0, 0, id); p.onGround = true; p.spawnT = 0; }
    const ph = Math.floor(this.t / 2.2) % 3;
    p.cling = p.C.crawl && ph ? { s: ph === 1 ? 'R' : 'U' } : null;
    p.onGround = !p.cling; p.vx = 120; p.run = this.t * 7; p.facing = 1;
    return p;
  },
  drawDiffPicker(ctx, newRun) {
    const x0 = 60, y0 = 112 + CHAR_ORDER.length * CHAR_ROW + 20, bw = 122, bh = 30, gap = 6; // 放在角色列表下面
    ctx.fillStyle = 'rgba(220,220,210,0.8)'; ctx.font = 'bold 14px ' + FONT;
    ctx.fillText(newRun ? tr('难度') : tr('当前周目难度'), x0, y0);
    const cur = newRun ? this.diffSel : Math.max(0, DIFFS.findIndex((d) => d.id === this.diff));
    DIFFS.forEach((D, i) => {
      const bx = x0 + (i % 2) * (bw + gap), by = y0 + 10 + Math.floor(i / 2) * (bh + gap), open = D.unlocked(), sel = i === cur;
      ctx.fillStyle = sel ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)'; ctx.fillRect(bx, by, bw, bh);
      if (sel) { ctx.strokeStyle = D.color; ctx.lineWidth = 2; ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2); ctx.lineWidth = 1; }
      ctx.fillStyle = !open ? 'rgba(160,160,160,0.45)' : sel ? D.color : 'rgba(220,220,210,0.75)'; ctx.font = (sel ? 'bold ' : '') + '14px ' + FONT; ctx.textAlign = 'center';
      ctx.fillText((open ? '' : '🔒 ') + diffName(D.id), bx + bw / 2, by + 20); ctx.textAlign = 'left';
      if (newRun) this.addHot(bx, by, bw, bh, () => this.setDiffSel(i));
    });
    const D = DIFFS[cur], open = D.unlocked(), ty = y0 + 10 + 2 * (bh + gap) + 16;
    ctx.fillStyle = open ? 'rgba(230,225,205,0.85)' : 'rgba(255,160,120,0.8)'; ctx.font = '12px ' + FONT;
    wrapText(ctx, open ? D.desc : tr(D.unlockText || '尚未解锁'), 2 * bw + gap).slice(0, 3).forEach((l, i) => ctx.fillText(l, x0, ty + i * 16));
  },
  renderChars(ctx) {
    const newRun = this.charMode === 'new', t = this.t;
    drawBackground(ctx, { x: t * 10, y: 0 }, THEMES.hall, t);
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#f2ead6'; ctx.font = 'bold 28px ' + FONT; ctx.fillText(newRun ? '选择角色与难度' : '角色', 60, 64);
    ctx.fillStyle = 'rgba(200,190,160,0.6)'; ctx.font = '12px ' + MONO; if (!I18N.en) { ctx.font = 'bold 28px ' + FONT; const tw = ctx.measureText(newRun ? '选择角色与难度' : '角色').width; ctx.font = '12px ' + MONO; ctx.fillText(newRun ? 'NEW GAME · SELECT UNIT & DIFFICULTY' : 'UNITS', 60 + tw + 14, 64); } // 英文小标题跟在中文标题后面
    ctx.fillStyle = newRun ? 'rgba(255,210,120,0.85)' : 'rgba(200,200,200,0.6)'; ctx.font = '13px ' + FONT;
    ctx.fillText(newRun ? '角色和难度只能在这里（新的游戏开始前）选择，选定后整个周目都不能更换。' : '这里只能查看。角色和难度只能在开始「新的游戏」时选择，游戏中途不能更换。', 60, 92);

    // 左侧：角色列表
    CHAR_ORDER.forEach((id, i) => {
      const C = charDef(id), open = C.unlocked(), sel = i === this.charSel, x = 60, y = 112 + i * CHAR_ROW, w = 250, h = CHAR_ROW - 6, compact = h < 50; // 每行高度随角色数收紧
      ctx.fillStyle = sel ? 'rgba(120,255,230,0.12)' : 'rgba(255,255,255,0.04)'; ctx.fillRect(x, y, w, h);
      if (sel) { ctx.fillStyle = C.color; ctx.fillRect(x, y, 4, h); }
      this.addHot(x, y, w, h, () => { if (this.charSel === i) this.charPick(i); else this.setCharSel(i); }, () => { this.charSel = i; });
      // 小头像
      ctx.save(); ctx.beginPath(); ctx.rect(x + 8, y + 5, 48, h - 10); ctx.clip();
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 8, y + 5, 48, h - 10);
      if (!open) ctx.filter = 'brightness(0) opacity(0.7)';
      const p = this.charPreview(id), pc = p.cling; p.cling = null; p.onGround = true;
      const ps = Math.min(1.2, (h - 10) / 28); ctx.translate(x + 32, y + h - 4); ctx.scale(ps, ps); p.drawBody(ctx, -p.w / 2, -p.h, 1, 1, 1, { t: sel ? t : 0, radio: null });
      p.cling = pc; ctx.filter = 'none'; ctx.restore();
      ctx.fillStyle = open ? (sel ? '#fff' : 'rgba(230,230,220,0.8)') : 'rgba(160,160,160,0.6)'; ctx.font = (sel ? 'bold ' : '') + (compact ? '16px ' : '18px ') + FONT;
      ctx.fillText(open ? C.name : '？？？', x + 68, y + (compact ? 19 : 21));
      ctx.fillStyle = 'rgba(200,190,160,0.6)'; ctx.font = '11px ' + MONO; ctx.fillText(open ? (I18N.en ? C.model.split(' ')[0] : C.en) : 'LOCKED', x + 68, y + (compact ? 33 : 34)); // 英文模式下名字已经是英文，这里改写型号
      ctx.font = '11px ' + FONT;
      const sx = compact ? x + w - 8 : x + 68, sy = compact ? y + 19 : y + 47; if (compact) ctx.textAlign = 'right'; // 行太矮时，状态文字放到名字那一行的右边
      if (!open) { ctx.fillStyle = 'rgba(255,160,120,0.8)'; ctx.fillText('🔒 未解锁', sx, sy); }
      else if (!newRun && id === this.charId) { ctx.fillStyle = '#7ff'; ctx.fillText(Save.load() ? '✔ 当前周目' : '✔ 最近使用', sx, sy); }
      else if (newRun && id === (Inventory.p.char || 'lazarus')) { ctx.fillStyle = 'rgba(120,255,230,0.7)'; ctx.fillText('上次使用', sx, sy); }
      ctx.textAlign = 'left';
    });

    // 右侧：详情
    const id = CHAR_ORDER[this.charSel], C = charDef(id), open = C.unlocked(), dx = 340, dw = 560;
    // 展台 + 大号模型
    ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(dx, 116, 220, 200);
    ctx.strokeStyle = open ? C.color : '#444'; ctx.strokeRect(dx + 0.5, 116.5, 219, 199);
    const gr = ctx.createRadialGradient(dx + 110, 250, 10, dx + 110, 250, 120); gr.addColorStop(0, open ? 'rgba(120,255,230,0.18)' : 'rgba(80,80,80,0.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.fillRect(dx, 116, 220, 200);
    ctx.fillStyle = '#3a3226'; ctx.fillRect(dx + 40, 282, 140, 12); ctx.fillStyle = '#5a4a32'; ctx.fillRect(dx + 40, 282, 140, 2);
    ctx.save(); ctx.beginPath(); ctx.rect(dx, 116, 220, 200); ctx.clip();
    if (!open) ctx.filter = 'brightness(0) opacity(0.7)';
    const p = this.charPreview(id), S = 4;
    // 小扫演示贴墙 / 倒挂时，在展台上画出墙和天花板
    if (open && p.cling) {
      ctx.fillStyle = '#4a4436';
      if (p.cling.s === 'R') ctx.fillRect(dx + 110 + p.w / 2 * S, 150, 16, 132);
      else ctx.fillRect(dx + 30, 150 - 16, 160, 16);
    }
    ctx.translate(dx + 110, p.cling && p.cling.s === 'U' ? 150 + p.h * S : p.cling ? 282 - 30 : 282); ctx.scale(S, S);
    p.drawBody(ctx, -p.w / 2, -p.h, p.cling && p.cling.s === 'U' ? -1 : 1, 1, 1, { t: open ? t : 0, radio: null });
    ctx.filter = 'none'; ctx.restore();

    const tx = dx + 240;
    ctx.fillStyle = open ? C.color : '#888'; ctx.font = 'bold 26px ' + FONT; ctx.fillText(open ? C.name : '？？？', tx, 146);
    ctx.fillStyle = 'rgba(200,190,160,0.7)'; ctx.font = '12px ' + MONO; ctx.fillText(open ? (I18N.en ? tr(C.model) : `${C.en} · ${C.model}`) : 'LOCKED', tx, 166);
    // 属性条
    ctx.font = '13px ' + FONT;
    const lw = Math.max(44, ...Object.keys(C.stats).map((k) => ctx.measureText(k).width + 10)); // 属性名的宽度（英文更长）
    Object.entries(C.stats).forEach(([k, v], i) => {
      const y = 192 + i * 24;
      ctx.fillStyle = 'rgba(220,220,210,0.75)'; ctx.fillText(k, tx, y + 10);
      for (let j = 0; j < 5; j++) { ctx.fillStyle = open && j < v ? C.color : 'rgba(255,255,255,0.1)'; ctx.fillRect(tx + lw + j * 34, y, 30, 10); }
    });
    // 背景故事 + 技能
    ctx.font = '13px ' + FONT; ctx.fillStyle = '#e6dcc0';
    const bio = open ? C.bio : tr('尚未解锁。%{t}', { t: tr(C.unlockText || '') });
    wrapText(ctx, bio, dw).slice(0, 3).forEach((l, i) => ctx.fillText(l, dx, 342 + i * 20));
    if (open) {
      ctx.font = 'bold 13px ' + FONT;
      const kw = Math.max(100, ...C.skills.map(([k]) => ctx.measureText('◆ ' + k).width + 12)); // 技能名一列的宽度
      C.skills.forEach(([k, v], i) => {
        const y = 404 + i * 26;
        ctx.fillStyle = C.color; ctx.font = 'bold 13px ' + FONT; ctx.fillText('◆ ' + k, dx, y);
        ctx.fillStyle = 'rgba(220,220,210,0.8)'; ctx.font = '12px ' + FONT;
        let ls = wrapText(ctx, v, dw - kw);
        if (ls.length > 1) { ctx.font = '11px ' + FONT; ls = wrapText(ctx, v, dw - kw).slice(0, 2); } // 放不下一行就换小一号的字，还放不下再分两行
        ls.forEach((l, j) => ctx.fillText(l, dx + kw, y + (ls.length > 1 ? j * 12 - 5 : 0)));
      });
    }

    // 难度（左下）：新游戏时可以选；查看模式只显示当前周目的难度
    this.drawDiffPicker(ctx, newRun);
    const hint = newRun ? [{ k: 'select' }, '选择角色', { k: 'tab' }, '选择难度', { k: 'confirm' }, open ? '开始' : '未解锁', { k: 'back' }, '返回'] : [{ k: 'select' }, '查看', { k: 'back' }, '返回'];
    drawHintLine(ctx, 60, VH - 26, hint);
    if (newRun) { // 触屏 / 鼠标用的「开始」按钮
      const bw = 150, bx = VW - 96 - 24 - bw - 12, by = VH - 44;
      ctx.fillStyle = open ? 'rgba(120,255,230,0.18)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(bx, by, bw, 30);
      ctx.strokeStyle = open ? C.color : '#555'; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, 29);
      ctx.fillStyle = open ? '#fff' : '#888'; ctx.font = 'bold 13px ' + FONT; ctx.textAlign = 'center'; ctx.fillText(open ? tr('▶ 用%{name}开始', { name: tr(C.name) }) : '🔒 未解锁', bx + bw / 2, by + 20); ctx.textAlign = 'left';
      this.addHot(bx, by, bw, 30, () => this.charPick(this.charSel));
    }
    this.drawBackButton(ctx, () => { Sound.sfx.select(); this.toTitle(); });
    ctx.drawImage(Art.vignette, 0, 0); ctx.drawImage(Art.scan, 0, 0);
  },
});
