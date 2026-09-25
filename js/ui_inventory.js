'use strict';
// ============================================================
//  仓库界面 / 章节选择
// ============================================================
Object.assign(Game, {
  openInventory(from) {
    this.invFrom = from; this.state = 'inv'; this.invTab = this.invTab || 0; this.invSel = 0; Sound.sfx.select();
  },
  invItems() { const slot = SLOTS[this.invTab].key; return ITEMDEFS.filter((d) => d.slot === slot); },
  closeInventory() {
    Inventory.preview = null;
    if (this.invFrom === 'title') this.toTitle();
    else this.state = this.invFrom === 'paused' ? 'paused' : 'play';
  },
  updateInventory() {
    const I = Input;
    if (I.hit('ml')) { this.invTab = (this.invTab + SLOTS.length - 1) % SLOTS.length; this.invSel = 0; Sound.sfx.select(); }
    if (I.hit('mr')) { this.invTab = (this.invTab + 1) % SLOTS.length; this.invSel = 0; Sound.sfx.select(); }
    const items = this.invItems();
    if (I.hit('mu')) { this.invSel = (this.invSel + items.length - 1) % items.length; Sound.sfx.select(); }
    if (I.hit('md')) { this.invSel = (this.invSel + 1) % items.length; Sound.sfx.select(); }
    const d = items[this.invSel];
    if (d) Inventory.markSeen(d.id);
    if ((I.hit('confirm') || I.hit('skip')) && d) this.equipItem(d);
    if (I.hit('pause') || I.hit('inv') || I.hit('back')) { Sound.sfx.select(); this.closeInventory(); }
  },
  equipItem(d) {
    if (d && d.weapon) { // 武器：设为当前武器
      if (Inventory.setWeapon(d.key)) { Sound.sfx.equip(); if (this.player) { this.player.chargeT = -1; this.player.atkHeavy = false; } } else Sound.sfx.denied();
      return;
    }
    if (!d || d.slot === 'ability' || d.slot === 'exhibit') return;
    if (Inventory.equip(d.slot, d.id)) Sound.sfx.equip(); else Sound.sfx.denied();
  },
  // 右下角「返回」按钮（鼠标 / 触屏用）
  drawBackButton(ctx, onClick) {
    const w = 96, h = 30, x = VW - w - 24, y = VH - 44;
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(200,200,200,0.4)'; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = '#e8e4d8'; ctx.font = '13px ' + FONT; ctx.textAlign = 'center'; ctx.fillText('✕  返回', x + w / 2, y + 20); ctx.textAlign = 'left';
    this.addHot(x, y, w, h, onClick);
  },
  drawMannequin(ctx, x, y, s, opts) {
    const fake = Object.assign(Object.create(Player.prototype), { x: 0, y: 0, w: 20, h: 28, onGround: true, vx: 0, run: 0, dashLock: 0, canDash: true, atkSwing: 0, facing: 1 }, opts || {});
    ctx.save(); ctx.translate(x - 10 * s, y - 28 * s); ctx.scale(s, s);
    if (opts && opts.trail) for (let i = 4; i >= 1; i--) { ctx.globalAlpha = 0.12 * (5 - i); fake.drawBody(ctx, -i * 9, 0, 1, 1, 1, { t: this.t, radio: {} }, fake.trailColor(this.t, i)); }
    ctx.globalAlpha = 1;
    fake.drawBody(ctx, 0, 0, 1, 1, 1, { t: this.t, radio: {} });
    if (opts && opts.slash) { fake.atkSwing = 0.12; fake.drawSlash(ctx, { t: this.t }); }
    ctx.restore();
  },
  renderInventory(ctx) {
    drawBackground(ctx, { x: this.t * 8, y: 0 }, THEMES.gallery, this.t);
    ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#f2ead6'; ctx.font = 'bold 26px ' + FONT; ctx.fillText('仓库', 24, 48);
    ctx.fillStyle = 'rgba(200,190,160,0.6)'; ctx.font = '12px ' + MONO; ctx.fillText('INVENTORY', 86, 48);
    ctx.textAlign = 'right'; ctx.font = '11px ' + FONT;
    ctx.fillStyle = Inventory.backend.name === 'steam' ? '#8fe' : 'rgba(255,200,120,0.75)';
    ctx.fillText(Inventory.backend.name === 'steam' ? '已连接 Steam 库存' : '本地模拟库存 · 正式版将与 Steam 库存同步', VW - 24, 30);
    const tradable = Inventory.p.items.length;
    ctx.fillStyle = 'rgba(200,200,200,0.6)'; ctx.fillText(`可交易物品 ${tradable} 件 · 累计游玩 ${Math.floor(Inventory.p.playtime / 60)} 分钟`, VW - 24, 48);
    ctx.textAlign = 'left';
    // 标签页
    SLOTS.forEach((sl, i) => {
      const y = 80 + i * 46, sel = i === this.invTab;
      ctx.fillStyle = sel ? 'rgba(120,255,230,0.14)' : 'rgba(255,255,255,0.03)'; ctx.fillRect(24, y, 170, 38);
      if (sel) { ctx.fillStyle = '#7ff'; ctx.fillRect(24, y, 3, 38); }
      ctx.fillStyle = sel ? '#e8fff8' : 'rgba(220,220,210,0.6)'; ctx.font = (sel ? 'bold ' : '') + '14px ' + FONT; ctx.fillText(sl.name, 38, y + 18);
      ctx.fillStyle = 'rgba(200,200,200,0.4)'; ctx.font = '9px ' + MONO; ctx.fillText(sl.en, 38, y + 31);
      this.addHot(24, y, 170, 38, () => { if (this.invTab !== i) { this.invTab = i; this.invSel = 0; Sound.sfx.select(); } });
      const hasNew = ITEMDEFS.some((d) => d.slot === sl.key && Inventory.isNew(d.id));
      if (hasNew) { ctx.fillStyle = '#fc6'; ctx.beginPath(); ctx.arc(182, y + 19, 4, 0, 7); ctx.fill(); }
    });
    // 物品列表
    const items = this.invItems(), lx = 210, lw = 400;
    items.forEach((d, i) => {
      const y = 80 + i * 44, sel = i === this.invSel, own = Inventory.owns(d.id), r = RARITY[d.rarity];
      ctx.fillStyle = sel ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.035)'; ctx.fillRect(lx, y, lw, 38);
      ctx.fillStyle = own ? r.color : 'rgba(120,120,120,0.5)'; ctx.fillRect(lx, y, 4, 38);
      if (sel) { ctx.strokeStyle = r.color; ctx.lineWidth = 1; ctx.strokeRect(lx + 0.5, y + 0.5, lw - 1, 37); }
      // 单击选中；再次单击已选中的物品 = 装备
      this.addHot(lx, y, lw, 38, () => { if (this.invSel === i) this.equipItem(d); else { this.invSel = i; Sound.sfx.select(); } });
      ctx.font = 'bold 14px ' + FONT; ctx.fillStyle = own ? '#f0ece0' : 'rgba(160,160,160,0.55)';
      ctx.fillText(own ? d.name : '？？？ · 未获得', lx + 16, y + 17);
      ctx.font = '10px ' + FONT; ctx.fillStyle = own ? r.color : 'rgba(150,150,150,0.5)';
      ctx.fillText(r.name + (d.tradable ? ' · 可交易' : ' · 账号绑定'), lx + 16, y + 31);
      ctx.textAlign = 'right';
      const cnt = Inventory.count(d.id);
      if (own && d.tradable) { ctx.fillStyle = 'rgba(220,220,210,0.7)'; ctx.font = '12px ' + MONO; ctx.fillText('×' + cnt, lx + lw - 12, y + 24); }
      if (d.slot !== 'ability' && d.slot !== 'exhibit' && Inventory.equipped(d.slot).id === d.id && !(Inventory.preview)) { ctx.fillStyle = '#7ff'; ctx.font = 'bold 11px ' + FONT; ctx.fillText('已装备', lx + lw - 52, y + 24); }
      else if (d.slot !== 'ability' && d.slot !== 'exhibit' && Inventory.p.equipped[d.slot] === d.id) { ctx.fillStyle = '#7ff'; ctx.font = 'bold 11px ' + FONT; ctx.fillText('已装备', lx + lw - 52, y + 24); }
      if (d.weapon && own && Inventory.weapon() === d.key) { ctx.fillStyle = '#7ff'; ctx.font = 'bold 11px ' + FONT; ctx.fillText('当前武器', lx + lw - 52, y + 24); }
      if (Inventory.isNew(d.id) && !sel) { ctx.fillStyle = '#fc6'; ctx.font = 'bold 10px ' + MONO; ctx.fillText('NEW', lx + lw - 100, y + 24); }
      ctx.textAlign = 'left';
    });
    // 详情
    const d = items[this.invSel]; if (!d) return;
    const own = Inventory.owns(d.id), r = RARITY[d.rarity], dx = 630, dw = 306;
    ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(dx, 80, dw, 180);
    ctx.strokeStyle = own ? r.color : '#444'; ctx.strokeRect(dx + 0.5, 80.5, dw - 1, 179);
    const g = ctx.createRadialGradient(dx + dw / 2, 170, 10, dx + dw / 2, 170, 140);
    ctx.globalAlpha = 0.25; g.addColorStop(0, own ? r.color : 'rgb(80,80,80)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(dx, 80, dw, 180); ctx.globalAlpha = 1;
    ctx.save(); ctx.beginPath(); ctx.rect(dx, 80, dw, 180); ctx.clip();
    if (!own) ctx.globalAlpha = 0.35;
    if (d.slot === 'paint' || d.slot === 'trail' || d.slot === 'blade') {
      Inventory.preview = { slot: d.slot, id: d.id, weapon: d.slot === 'blade' ? 'sabre' : null };
      const abil = Inventory.p.abilities.sabre;
      if (d.slot === 'blade') Inventory.p.abilities.sabre = true;
      this.drawMannequin(ctx, dx + dw / 2 + (d.slot === 'trail' ? 30 : d.slot === 'blade' ? -30 : 0), 244, 4, { trail: d.slot === 'trail', slash: d.slot === 'blade' && Math.floor(this.t * 1.2) % 2 === 0 });
      Inventory.p.abilities.sabre = abil;
      Inventory.preview = null;
    } else if (d.slot === 'rebuild') {
      ctx.textAlign = 'center';
      if (d.omega) { ctx.fillStyle = 'rgba(255,40,40,0.15)'; ctx.font = 'bold 160px ' + MONO; ctx.fillText('Ω', dx + dw / 2, 230); }
      ctx.fillStyle = d.color; ctx.font = 'bold 18px ' + MONO; ctx.fillText(d.title, dx + dw / 2 + rand(-1, 1), 150);
      ctx.font = '11px ' + FONT; ctx.fillText(d.sub, dx + dw / 2, 174);
      ctx.strokeStyle = d.color; ctx.strokeRect(dx + 53, 188, 200, 10);
      ctx.fillRect(dx + 55, 190, 196 * ((this.t * 0.7) % 1), 6);
      ctx.textAlign = 'left';
    } else if (d.slot === 'ability') {
      if (!ItemArt.draw(ctx, d.key, dx + dw / 2, 160, this.t, own)) {
        ctx.textAlign = 'center'; ctx.fillStyle = own ? '#fc6' : '#666'; ctx.font = 'bold 60px ' + FONT;
        ctx.fillText('⚔', dx + dw / 2, 195); ctx.textAlign = 'left';
      }
    } else {
      const cx = dx + dw / 2, cy = 170;
      ctx.fillStyle = '#3a3226'; ctx.fillRect(cx - 50, cy + 30, 100, 16);
      ctx.fillStyle = 'rgba(150,220,235,0.15)'; ctx.fillRect(cx - 44, cy - 50, 88, 80);
      ctx.strokeStyle = '#bfe8f0'; ctx.strokeRect(cx - 44, cy - 50, 88, 80);
      ctx.save(); ctx.translate(cx, cy - 10); ctx.rotate(Math.sin(this.t) * 0.2);
      ctx.fillStyle = d.icon; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20); } ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-8, -10, 6, 4);
      ctx.restore();
    }
    ctx.restore(); ctx.globalAlpha = 1;
    ctx.fillStyle = own ? r.color : '#888'; ctx.font = 'bold 20px ' + FONT; ctx.fillText(own ? d.name : '？？？', dx, 292);
    ctx.font = '11px ' + FONT; ctx.fillStyle = 'rgba(220,220,210,0.7)';
    ctx.fillText(`${r.name} · ${SLOTS[this.invTab].name}` + (own && d.tradable ? ` · 持有 ×${Inventory.count(d.id)}` : ''), dx, 312);
    ctx.font = '13px ' + FONT; ctx.fillStyle = '#e6dcc0';
    const where = d.desc && d.desc.match(/【(.+?)】/);
    const desc = own ? d.desc : (d.tradable ? '尚未获得。可通过 Boss 掉落、零重构通关、游玩时长掉落获得，或在 Steam 市场与其他玩家交易。' : `尚未获得。获得地点：${where ? where[1] : '后续关卡'}。`);
    wrapText(ctx, desc, dw).slice(0, 5).forEach((l, i) => ctx.fillText(l, dx, 338 + i * 20));
    // 交易属性徽章
    const by = 450;
    ctx.fillStyle = d.tradable ? 'rgba(255,200,90,0.12)' : 'rgba(120,255,230,0.1)'; ctx.fillRect(dx, by, dw, 30);
    ctx.fillStyle = d.tradable ? '#fc6' : '#7ff'; ctx.font = 'bold 12px ' + FONT;
    ctx.fillText(d.tradable ? '⇄ 可交易 · 可上架 Steam 社区市场' : '🔒 账号绑定 · 不可交易 · 不可上架市场', dx + 10, by + 20);
    if (own && d.weapon) {
      if (Inventory.weapon() === d.key) { ctx.fillStyle = '#7ff'; ctx.font = '12px ' + FONT; ctx.fillText('✔ 当前武器（游戏中按 ' + Input.glyph('swap') + ' 切换）', dx, by + 50); }
      else {
        ctx.fillStyle = 'rgba(120,255,230,0.12)'; ctx.fillRect(dx, by + 36, 170, 26); ctx.strokeStyle = 'rgba(120,255,230,0.5)'; ctx.strokeRect(dx + 0.5, by + 36.5, 169, 25);
        drawHintLine(ctx, dx + 8, by + 54, [{ k: 'confirm' }, '设为当前武器'], { color: 'rgba(220,240,235,0.9)' });
        this.addHot(dx, by + 36, 170, 26, () => this.equipItem(d));
      }
    }
    if (own && d.slot !== 'ability' && d.slot !== 'exhibit') {
      const eq = Inventory.p.equipped[d.slot] === d.id || (d.def && !DEF_BY_ID[Inventory.p.equipped[d.slot]]);
      ctx.fillStyle = eq ? '#7ff' : 'rgba(220,220,210,0.8)'; ctx.font = '12px ' + FONT;
      if (eq) ctx.fillText('✔ 当前已装备', dx, by + 50);
      else {
        ctx.fillStyle = 'rgba(120,255,230,0.12)'; ctx.fillRect(dx, by + 36, 150, 26); ctx.strokeStyle = 'rgba(120,255,230,0.5)'; ctx.strokeRect(dx + 0.5, by + 36.5, 149, 25);
        drawHintLine(ctx, dx + 8, by + 54, [{ k: 'confirm' }, '装备 / 点击装备'], { color: 'rgba(220,240,235,0.9)' });
        this.addHot(dx, by + 36, 150, 26, () => this.equipItem(d));
      }
    }
    ctx.fillStyle = 'rgba(200,200,200,0.5)'; ctx.font = '12px ' + FONT;
    drawHintLine(ctx, 24, VH - 20, [{ k: 'tab' }, '切换分类', { k: 'select' }, '选择', { k: 'confirm' }, '装备', { k: 'back' }, '返回', ' · 鼠标可直接点击']);
    this.drawBackButton(ctx, () => { Sound.sfx.select(); this.closeInventory(); });
    ctx.drawImage(Art.scan, 0, 0);
  },

  // ---------------- 章节选择 ----------------
  selChapters() { const out = []; for (let c = 1; CHAPTERS[c]; c++) if (c === 1 || Inventory.p['ch' + (c - 1) + 'Clear']) out.push(c); return out; },
  selList() { const ch = this.selCh || 1; return LEVELS.map((L, i) => ({ L, i })).filter((o) => chapterOf(o.L) === ch); },
  setSelCh(ch) { if (ch !== this.selCh) { this.selCh = ch; this.selSel = 0; Sound.sfx.select(); } },
  updateSelect() {
    const chs = this.selChapters();
    if (!chs.includes(this.selCh)) this.selCh = chs[chs.length - 1];
    const list = this.selList(), n = list.length, half = Math.ceil(n / 2), ci = chs.indexOf(this.selCh);
    if (Input.hit('mu')) { this.selSel = (this.selSel + n - 1) % n; Sound.sfx.select(); }
    if (Input.hit('md')) { this.selSel = (this.selSel + 1) % n; Sound.sfx.select(); }
    // ← → 在两列之间切换；已经在最左 / 最右列时切换章节
    if (Input.hit('ml')) { if (this.selSel >= half) { this.selSel -= half; Sound.sfx.select(); } else if (ci > 0) this.setSelCh(chs[ci - 1]); }
    if (Input.hit('mr')) { if (this.selSel < half && this.selSel + half < n) { this.selSel += half; Sound.sfx.select(); } else if (ci < chs.length - 1) this.setSelCh(chs[ci + 1]); }
    if (Input.hit('confirm') && list[this.selSel]) { Sound.sfx.confirm(); this.startLevel(list[this.selSel].i); }
    if (Input.hit('pause') || Input.hit('back')) { Sound.sfx.select(); this.toTitle(); }
  },
  renderSelect(ctx) {
    const chs = this.selChapters();
    if (!chs.includes(this.selCh)) this.selCh = chs[chs.length - 1];
    const ch = this.selCh;
    drawBackground(ctx, { x: this.t * 10, y: 0 }, CHAPTERS[ch].theme || THEMES.hall, this.t);
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#f2ead6'; ctx.font = 'bold 28px ' + FONT; ctx.fillText('章节选择', 70, 72);
    // 章节标签
    let tx = 210;
    for (let c = 1; CHAPTERS[c]; c++) {
      const open = chs.includes(c), sel = c === ch, label = `${CH_NUM[c]} ${CHAPTERS[c].name}`;
      ctx.font = (sel ? 'bold ' : '') + '15px ' + FONT; const w = ctx.measureText(label).width + 28;
      ctx.fillStyle = sel ? 'rgba(120,255,230,0.16)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(tx, 50, w, 30);
      if (sel) { ctx.fillStyle = '#7ff'; ctx.fillRect(tx, 78, w, 2); }
      ctx.fillStyle = !open ? 'rgba(160,160,160,0.4)' : sel ? '#e8fff8' : 'rgba(220,220,210,0.7)';
      ctx.fillText(open ? label : `${CH_NUM[c]} 🔒`, tx + 14, 70);
      if (open) this.addHot(tx, 50, w, 30, () => this.setSelCh(c));
      tx += w + 8;
    }
    ctx.fillStyle = 'rgba(255,210,120,0.8)'; ctx.font = '13px ' + FONT;
    ctx.fillText('重玩时可使用所有已解锁的武器与能力。零重构通关可获得额外掉落。', 70, 118);
    const list = this.selList(), half = Math.ceil(list.length / 2);
    list.forEach(({ L, i }, k) => {
      const col = k < half ? 0 : 1, row = k % half;
      const sel = k === this.selSel, x = 70 + col * 420, y = 150 + row * 64, w = 400;
      ctx.fillStyle = sel ? 'rgba(120,255,230,0.12)' : 'rgba(255,255,255,0.04)'; ctx.fillRect(x, y, w, 52);
      if (sel) { ctx.fillStyle = '#7ff'; ctx.fillRect(x, y, 4, 52); }
      this.addHot(x, y, w, 52, () => { Sound.sfx.confirm(); this.startLevel(i); }, () => { this.selSel = k; });
      ctx.fillStyle = sel ? '#7ff' : '#c9b88a'; ctx.font = 'bold 16px ' + MONO; ctx.fillText(L.id, x + 18, y + 32);
      ctx.fillStyle = sel ? '#fff' : 'rgba(230,230,220,0.75)'; ctx.font = (sel ? 'bold ' : '') + '18px ' + FONT; ctx.fillText(L.name, x + 78, y + 26);
      ctx.fillStyle = 'rgba(200,190,160,0.55)'; ctx.font = '11px ' + MONO; ctx.fillText(L.en, x + 78, y + 43);
      if (L._chips == null) { const B = makeBuilder(L.w, L.h); L.build(B); L._chips = B.grid.flat().filter((c) => c === 'o').length; }
      const got = [...this.chips].filter((c) => c.startsWith(L.id + '#')).length;
      ctx.textAlign = 'right'; ctx.font = '12px ' + FONT;
      if (!L.boss) { ctx.fillStyle = '#fc6'; ctx.fillText(`芯片 ${got}/${L._chips}`, x + w - 14, y + 24); }
      const tag = L.weapon; if (tag) { ctx.fillStyle = '#f96'; ctx.font = '11px ' + FONT; ctx.fillText(tag, x + w - 14, y + 42); }
      ctx.textAlign = 'left';
    });
    drawHintLine(ctx, 70, VH - 30, [{ k: 'select' }, '选择', { k: 'tab' }, '换列 / 换章', { k: 'confirm' }, '开始', { k: 'back' }, '返回']);
    this.drawBackButton(ctx, () => { Sound.sfx.select(); this.toTitle(); });
    ctx.drawImage(Art.vignette, 0, 0); ctx.drawImage(Art.scan, 0, 0);
  },
});
