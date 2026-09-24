'use strict';
// ============================================================
//  按键设置（键盘 3 个键位 + 手柄按钮，可恢复默认）
// ============================================================
const KEY_ROWS = [
  { a: 'left', n: '向左' },
  { a: 'right', n: '向右' },
  { a: 'up', n: '向上（冲刺方向）' },
  { a: 'down', n: '向下 / 下落 / 下劈' },
  { a: 'jump', n: '跳跃', pad: true },
  { a: 'dash', n: '冲刺', pad: true },
  { a: 'attack', n: '攻击', pad: true },
  { a: 'inv', n: '仓库', pad: true },
  { a: 'restart', n: '自毁重构' },
  { a: 'mute', n: '静音' },
  { type: 'upJump', n: '「向上」键同时作为跳跃' },
  { type: 'reset', n: '恢复默认键位' },
  { type: 'back', n: '返回' },
];
const KEY_ACTION_NAMES = { left: '向左', right: '向右', up: '向上', down: '向下', jump: '跳跃', dash: '冲刺', attack: '攻击', inv: '仓库', restart: '自毁重构', mute: '静音' };
const KCOL_X = [290, 420, 550, 690], KCOL_W = [120, 120, 120, 200];

Object.assign(Game, {
  openKeys(from) { this.keysFrom = from; this.state = 'keys'; this.keyRow = 0; this.keyCol = 0; this.keyMsg = ''; this.keyMsgT = 0; this.keyWait = null; Sound.sfx.select(); },
  closeKeys() {
    Input.capture = null; this.keyWait = null;
    if (this.keysFrom === 'title') this.toTitle(); else this.state = 'paused';
  },
  keyNote(msg) { this.keyMsg = msg; this.keyMsgT = 3; },
  padLabel(btn) { const g = PAD_GLYPHS[Input.usingPad ? Input.device : 'xbox'] || PAD_GLYPHS.xbox; return g[btn] || ('按钮' + btn); },
  // 激活一个格子：开始捕获按键 / 切换开关 / 恢复默认 / 返回
  activateKeyCell(row, col) {
    const R = KEY_ROWS[row];
    if (R.type === 'upJump') { Input.binds.upJump = !Input.binds.upJump; Input.saveBinds(); Sound.sfx.equip(); return; }
    if (R.type === 'reset') { Input.resetBinds(); Sound.sfx.confirm(); this.keyNote('已恢复默认键位'); return; }
    if (R.type === 'back') { Sound.sfx.select(); this.closeKeys(); return; }
    if (col === 3) {
      if (!R.pad) return;
      this.keyWait = { row, col, kind: 'pad' }; Sound.sfx.select();
      Input.startCapture('pad', (btn) => {
        this.keyWait = null;
        if (btn == null) { this.keyNote('已取消'); return; }
        const moved = Input.bindPad(R.a, btn);
        Sound.sfx.equip();
        this.keyNote(`「${R.n}」→ ${this.padLabel(btn)}` + (moved ? `（已从「${KEY_ACTION_NAMES[moved]}」移除）` : ''));
      });
      return;
    }
    this.keyWait = { row, col, kind: 'key' }; Sound.sfx.select();
    const cb = (code) => {
      if (code && code.startsWith('reserved:')) { this.keyNote(`${keyName(code.slice(9))} 是菜单专用键，不能改绑。请按其他键（Esc 取消）`); Input.startCapture('key', cb); return; }
      this.keyWait = null;
      if (!code) { this.keyNote('已取消'); return; }
      const moved = Input.bindKey(R.a, col, code);
      Sound.sfx.equip();
      this.keyNote(`「${R.n}」→ ${keyName(code)}` + (moved ? `（已从「${KEY_ACTION_NAMES[moved]}」移除）` : ''));
    };
    Input.startCapture('key', cb);
  },
  updateKeys(dt) {
    this.keyMsgT = Math.max(0, (this.keyMsgT || 0) - dt);
    if (this.keyWait) return; // 等待玩家按下新按键
    const I = Input, n = KEY_ROWS.length;
    if (I.hit('mu')) { this.keyRow = (this.keyRow + n - 1) % n; Sound.sfx.select(); }
    if (I.hit('md')) { this.keyRow = (this.keyRow + 1) % n; Sound.sfx.select(); }
    const R = KEY_ROWS[this.keyRow], maxCol = R.type ? 0 : R.pad ? 3 : 2;
    if (I.hit('ml')) { this.keyCol = Math.max(0, this.keyCol - 1); Sound.sfx.select(); }
    if (I.hit('mr')) { this.keyCol = Math.min(3, this.keyCol + 1); Sound.sfx.select(); }
    const col = Math.min(this.keyCol, maxCol);
    if (I.hit('confirm')) this.activateKeyCell(this.keyRow, col);
    if (I.code('Delete') && !R.type && col < 3) { Input.clearKey(R.a, col); Sound.sfx.select(); this.keyNote(`已清除「${R.n}」的第 ${col + 1} 个键位`); }
    if (I.hit('back') || I.hit('pause')) { Sound.sfx.select(); this.closeKeys(); }
  },
  renderKeys(ctx) {
    drawBackground(ctx, { x: this.t * 8, y: 0 }, THEMES.gallery, this.t);
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#f2ead6'; ctx.font = 'bold 26px ' + FONT; ctx.fillText('按键设置', 60, 48);
    ctx.fillStyle = 'rgba(200,190,160,0.6)'; ctx.font = '12px ' + MONO; ctx.fillText('CONTROLS', 172, 48);
    ctx.font = '11px ' + FONT; ctx.fillStyle = 'rgba(200,200,200,0.55)';
    ctx.fillText('Esc / Enter / 退格 为菜单专用键，不能改绑 · 手柄的移动固定为左摇杆和十字键，Start 固定为暂停', 60, 70);
    // 表头
    const hy = 92;
    ctx.font = 'bold 12px ' + FONT; ctx.fillStyle = 'rgba(200,220,215,0.7)';
    ['键位 1', '键位 2', '键位 3', Input.usingPad ? Input.padName : '手柄（Xbox 布局显示）'].forEach((h, i) => ctx.fillText(h, KCOL_X[i] + 8, hy));
    const rowY = (i) => 100 + i * 28;
    KEY_ROWS.forEach((R, i) => {
      const y = rowY(i), selRow = i === this.keyRow;
      if (selRow) { ctx.fillStyle = 'rgba(120,255,230,0.07)'; ctx.fillRect(56, y, VW - 112, 26); }
      ctx.font = (selRow ? 'bold ' : '') + '14px ' + FONT;
      if (R.type) {
        ctx.fillStyle = selRow ? '#7ff' : R.type === 'reset' ? '#f96' : '#e8e4d8';
        let label = R.n;
        if (R.type === 'upJump') label += `：${Input.binds.upJump ? '开' : '关'}`;
        ctx.fillText((selRow ? '▶ ' : '') + label, 66, y + 18);
        this.addHot(56, y, 420, 26, () => this.activateKeyCell(i, 0), () => { if (!this.keyWait) { this.keyRow = i; this.keyCol = 0; } });
        return;
      }
      const unbound = !Input.binds.keys[R.a].some(Boolean) && ['left', 'right', 'jump', 'dash'].includes(R.a);
      ctx.fillStyle = unbound ? '#f66' : selRow ? '#fff' : 'rgba(230,230,220,0.8)';
      ctx.fillText(R.n + (unbound ? '（未绑定！）' : ''), 66, y + 18);
      for (let c = 0; c < 4; c++) {
        if (c === 3 && !R.pad) continue;
        const x = KCOL_X[c], w = KCOL_W[c], sel = selRow && Math.min(this.keyCol, R.pad ? 3 : 2) === c;
        const waiting = this.keyWait && this.keyWait.row === i && this.keyWait.col === c;
        ctx.fillStyle = waiting ? 'rgba(255,200,90,0.25)' : sel ? 'rgba(120,255,230,0.18)' : 'rgba(255,255,255,0.05)';
        ctx.fillRect(x, y + 2, w, 22);
        if (sel || waiting) { ctx.strokeStyle = waiting ? '#fc6' : '#7ff'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 2.5, w - 1, 21); }
        let label;
        if (waiting) label = (this.t * 2) % 2 < 1 ? (c === 3 ? '按下手柄按钮…' : '按下新按键…') : '';
        else if (c === 3) label = Input.binds.pad[R.a].map((b) => this.padLabel(b)).join(' / ');
        else label = keyName(Input.binds.keys[R.a][c]);
        ctx.fillStyle = waiting ? '#fc6' : label === '—' ? 'rgba(160,160,160,0.5)' : '#e8f4f0';
        ctx.font = '13px ' + FONT; ctx.textAlign = 'center'; ctx.fillText(label, x + w / 2, y + 18); ctx.textAlign = 'left';
        this.addHot(x, y + 2, w, 22, () => { if (!this.keyWait) { this.keyRow = i; this.keyCol = c; this.activateKeyCell(i, c); } }, () => { if (!this.keyWait) { this.keyRow = i; this.keyCol = c; } });
      }
    });
    // 提示 / 结果
    if (this.keyWait) {
      ctx.fillStyle = '#fc6'; ctx.font = 'bold 14px ' + FONT;
      ctx.fillText(this.keyWait.kind === 'pad' ? '请按下手柄按钮（Start 取消）' : '请按下新按键（Esc 取消）', 60, VH - 44);
    } else if (this.keyMsgT > 0) {
      ctx.globalAlpha = Math.min(1, this.keyMsgT); ctx.fillStyle = '#8fe'; ctx.font = '13px ' + FONT; ctx.fillText(this.keyMsg, 60, VH - 44); ctx.globalAlpha = 1;
    }
    const hp = [{ k: 'select' }, '选择', { k: 'tab' }, '切换列', { k: 'confirm' }, '修改'];
    if (!Input.usingPad) hp.push('Delete 清除');
    hp.push({ k: 'back' }, '返回', ' · 鼠标可直接点击');
    drawHintLine(ctx, 60, VH - 18, hp);
    this.drawBackButton(ctx, () => { if (!this.keyWait) { Sound.sfx.select(); this.closeKeys(); } });
  },
});
