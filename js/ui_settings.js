'use strict';
// ============================================================
//  设置（标题画面）：按键 / 声音 / 显示 / 语言；暂停菜单里各项直接列出
//  显示设置：全屏 / 窗口、画面清晰度、失去焦点时自动暂停
//  · F11 或 Alt + Enter 随时切换全屏（见 input.js）
//  · 桌面版的全屏由主进程切换窗口（desktop/main.js），启动时按上次的设置打开；网页版用浏览器的全屏接口
// ============================================================
const Display = {
  opt: { fullscreen: true, hires: false, focusPause: true },
  init() {
    Object.assign(this.opt, Store.getJSON('lazarus_display') || {});
    if (DESKTOP) DESKTOP.onFullscreen((on) => { this.opt.fullscreen = on; this.save(); }); // 窗口按钮、系统快捷键改的也记下来
  },
  save() { Store.setJSON('lazarus_display', this.opt); },
  isFull() { return DESKTOP ? DESKTOP.isFullscreen() : !!document.fullscreenElement; },
  toggleFull() {
    if (DESKTOP) { DESKTOP.setFullscreen(!this.isFull()); return; }
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => { /* 浏览器拒绝（例如不是由按键 / 点击触发） */ });
    } catch (e) { /* 不支持全屏 */ }
  },
  // 画面清晰度：Canvas 最多按几倍分辨率绘制（标准 2 倍；高 4 倍，4K 屏幕更清晰，但更吃显卡）
  maxScale() { return this.opt.hires ? 4 : 2; },
};

const DISPLAY_ROWS = [
  { type: 'full', n: '显示模式' },
  { type: 'hires', n: '画面清晰度' },
  { type: 'focus', n: '失去焦点时自动暂停' },
  { type: 'back', n: '返回' },
];

Object.assign(Game, {
  openDisplay(from) { this.displayFrom = from; this.state = 'display'; this.dispRow = 0; Sound.sfx.select(); },
  closeDisplay() { if (this.displayFrom === 'settings') this.backToSettings(); else this.state = 'paused'; },
  dispValue(R) {
    if (R.type === 'full') return tr(Display.isFull() ? '全屏' : '窗口');
    if (R.type === 'hires') return tr(Display.opt.hires ? '高（最高 4 倍）' : '标准（最高 2 倍）');
    if (R.type === 'focus') return tr(Display.opt.focusPause ? '开' : '关');
    return '';
  },
  activateDisplayRow(i) {
    const R = DISPLAY_ROWS[i];
    Sound.sfx.select();
    if (R.type === 'full') Display.toggleFull();
    else if (R.type === 'hires') { Display.opt.hires = !Display.opt.hires; Display.save(); this.resize(); }
    else if (R.type === 'focus') { Display.opt.focusPause = !Display.opt.focusPause; Display.save(); }
    else this.closeDisplay();
  },
  updateDisplay() {
    const I = Input, n = DISPLAY_ROWS.length;
    if (I.hit('mu')) { this.dispRow = (this.dispRow + n - 1) % n; Sound.sfx.select(); }
    if (I.hit('md')) { this.dispRow = (this.dispRow + 1) % n; Sound.sfx.select(); }
    if ((I.hit('ml') || I.hit('mr')) && DISPLAY_ROWS[this.dispRow].type !== 'back') this.activateDisplayRow(this.dispRow);
    if (I.hit('confirm')) this.activateDisplayRow(this.dispRow);
    if (I.hit('back') || I.hit('pause')) { Sound.sfx.select(); this.closeDisplay(); }
  },
  renderDisplay(ctx) {
    drawBackground(ctx, { x: this.t * 8, y: 0 }, THEMES.gallery, this.t);
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#f2ead6'; ctx.font = 'bold 26px ' + FONT; ctx.fillText('显示设置', 60, 60);
    ctx.fillStyle = 'rgba(200,190,160,0.6)'; ctx.font = '12px ' + MONO; if (!I18N.en) ctx.fillText('DISPLAY', 172, 60);
    DISPLAY_ROWS.forEach((R, i) => {
      const y = 130 + i * 62, sel = i === this.dispRow;
      if (sel) { ctx.fillStyle = 'rgba(120,255,230,0.07)'; ctx.fillRect(56, y - 26, VW - 112, 48); ctx.fillStyle = '#7ff'; ctx.fillRect(56, y - 26, 3, 48); }
      ctx.fillStyle = sel ? '#fff' : 'rgba(230,230,220,0.8)'; ctx.font = (sel ? 'bold ' : '') + '18px ' + FONT;
      ctx.fillText((sel ? '▶ ' : '') + R.n, 80, y + 6);
      if (R.type !== 'back') {
        ctx.fillStyle = sel ? '#7ff' : 'rgba(230,230,220,0.8)'; ctx.font = 'bold 16px ' + FONT; ctx.textAlign = 'right';
        ctx.fillText('◀  ' + this.dispValue(R) + '  ▶', VW - 80, y + 6); ctx.textAlign = 'left';
      }
      this.addHot(56, y - 26, VW - 112, 48, () => { this.dispRow = i; this.activateDisplayRow(i); }, () => { this.dispRow = i; });
    });
    ctx.fillStyle = 'rgba(200,200,190,0.6)'; ctx.font = '13px ' + FONT;
    ctx.fillText('F11 或 Alt + Enter 可随时切换全屏', 80, VH - 90);
    if (Display.opt.hires) ctx.fillText('高清晰度在 4K 屏幕上更锐利，但更吃显卡；卡顿时请改回标准', 80, VH - 66);
    drawHintLine(ctx, 60, VH - 30, [{ k: 'select' }, '选择', { k: 'confirm' }, '切换', { k: 'back' }, '返回']);
    this.drawBackButton(ctx, () => { Sound.sfx.select(); this.closeDisplay(); });
  },
});

// ---------------- 设置（从标题画面进入） ----------------
const SETTINGS_ROWS = [
  { act: 'keys', n: '按键设置' },
  { act: 'audio', n: '声音设置' },
  { act: 'display', n: '显示设置' },
  { act: 'lang' },
  { act: 'back', n: '返回' },
];

Object.assign(Game, {
  openSettings() { this.state = 'settings'; this.setRow = 0; },
  backToSettings() { this.state = 'settings'; },
  closeSettings() { const sel = this.menuSel; this.toTitle(); this.menuSel = sel; },
  settingsLabel(R) { return R.act === 'lang' ? (I18N.en ? 'Language / 语言: English' : '语言 / Language：简体中文') : R.n; }, // 语言名称不翻译，两种语言都认得出
  activateSettingsRow(i) {
    const R = SETTINGS_ROWS[i];
    if (R.act === 'keys') this.openKeys('settings');
    else if (R.act === 'audio') this.openAudio('settings');
    else if (R.act === 'display') this.openDisplay('settings');
    else if (R.act === 'lang') { Sound.sfx.select(); I18N.set(I18N.en ? 'zh' : 'en'); }
    else { Sound.sfx.select(); this.closeSettings(); }
  },
  updateSettings() {
    const I = Input, n = SETTINGS_ROWS.length;
    if (I.hit('mu')) { this.setRow = (this.setRow + n - 1) % n; Sound.sfx.select(); }
    if (I.hit('md')) { this.setRow = (this.setRow + 1) % n; Sound.sfx.select(); }
    if ((I.hit('ml') || I.hit('mr')) && SETTINGS_ROWS[this.setRow].act === 'lang') this.activateSettingsRow(this.setRow);
    if (I.hit('confirm')) this.activateSettingsRow(this.setRow);
    if (I.hit('back') || I.hit('pause')) { Sound.sfx.select(); this.closeSettings(); }
  },
  renderSettings(ctx) {
    drawBackground(ctx, { x: this.t * 8, y: 0 }, THEMES.gallery, this.t);
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#f2ead6'; ctx.font = 'bold 26px ' + FONT; ctx.fillText('设置', 60, 60);
    ctx.fillStyle = 'rgba(200,190,160,0.6)'; ctx.font = '12px ' + MONO; if (!I18N.en) ctx.fillText('SETTINGS', 120, 60);
    SETTINGS_ROWS.forEach((R, i) => {
      const y = 130 + i * 62, sel = i === this.setRow;
      if (sel) { ctx.fillStyle = 'rgba(120,255,230,0.07)'; ctx.fillRect(56, y - 26, VW - 112, 48); ctx.fillStyle = '#7ff'; ctx.fillRect(56, y - 26, 3, 48); }
      ctx.fillStyle = sel ? '#fff' : 'rgba(230,230,220,0.8)'; ctx.font = (sel ? 'bold ' : '') + '18px ' + FONT;
      ctx.fillText((sel ? '▶ ' : '') + this.settingsLabel(R), 80, y + 6);
      this.addHot(56, y - 26, VW - 112, 48, () => { this.setRow = i; this.activateSettingsRow(i); }, () => { this.setRow = i; });
    });
    drawHintLine(ctx, 60, VH - 30, [{ k: 'select' }, '选择', { k: 'confirm' }, '确认', { k: 'back' }, '返回']);
    this.drawBackButton(ctx, () => { Sound.sfx.select(); this.closeSettings(); });
  },
});
