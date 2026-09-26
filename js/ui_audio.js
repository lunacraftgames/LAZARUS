'use strict';
// ============================================================
//  声音设置：主音量 / 音乐 / 音效（← → 调节，鼠标可点击或拖动滑块）
// ============================================================
const AUDIO_ROWS = [
  { k: 'master', n: '主音量', en: 'MASTER' },
  { k: 'music', n: '音乐', en: 'MUSIC' },
  { k: 'sfx', n: '音效', en: 'SOUND FX' },
  { type: 'mute', n: '静音' },
  { type: 'back', n: '返回' },
];
const AUD_BAR = { x: 330, w: 400 };

Object.assign(Game, {
  openAudio(from) { this.audioFrom = from; this.state = 'audio'; this.audRow = 0; this.audPreviewT = 0; Sound.init(); Sound.sfx.select(); },
  closeAudio() { if (this.audioFrom === 'settings') this.backToSettings(); else this.state = 'paused'; },
  setVol(k, v) {
    const before = Sound.volumes[k];
    Sound.setVolume(k, v);
    // 调音效 / 主音量时放一个试听音（限制频率，拖动时不会刺耳）
    if (Sound.volumes[k] !== before && k !== 'music' && this.t - (this.audPreviewT || 0) > 0.09) { this.audPreviewT = this.t; Sound.sfx.pickup(); }
  },
  activateAudioRow(i) {
    const R = AUDIO_ROWS[i];
    if (R.type === 'mute') { Sound.toggleMute(); Sound.sfx.select(); }
    else if (R.type === 'back') { Sound.sfx.select(); this.closeAudio(); }
  },
  updateAudio() {
    const I = Input, n = AUDIO_ROWS.length;
    if (I.hit('mu')) { this.audRow = (this.audRow + n - 1) % n; Sound.sfx.select(); }
    if (I.hit('md')) { this.audRow = (this.audRow + 1) % n; Sound.sfx.select(); }
    const R = AUDIO_ROWS[this.audRow];
    if (R.k) {
      if (I.hit('ml')) this.setVol(R.k, Sound.volumes[R.k] - 0.05);
      if (I.hit('mr')) this.setVol(R.k, Sound.volumes[R.k] + 0.05);
    }
    if (I.hit('confirm')) this.activateAudioRow(this.audRow);
    if (I.hit('back') || I.hit('pause')) { Sound.sfx.select(); this.closeAudio(); }
  },
  renderAudio(ctx) {
    drawBackground(ctx, { x: this.t * 8, y: 0 }, THEMES.gallery, this.t);
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#f2ead6'; ctx.font = 'bold 26px ' + FONT; ctx.fillText('声音设置', 60, 60);
    ctx.fillStyle = 'rgba(200,190,160,0.6)'; ctx.font = '12px ' + MONO; if (!I18N.en) ctx.fillText('AUDIO', 172, 60);
    AUDIO_ROWS.forEach((R, i) => {
      const y = 130 + i * 62, sel = i === this.audRow;
      if (sel) { ctx.fillStyle = 'rgba(120,255,230,0.07)'; ctx.fillRect(56, y - 26, VW - 112, 48); ctx.fillStyle = '#7ff'; ctx.fillRect(56, y - 26, 3, 48); }
      ctx.fillStyle = sel ? '#fff' : 'rgba(230,230,220,0.8)'; ctx.font = (sel ? 'bold ' : '') + '18px ' + FONT;
      if (!R.k) {
        const label = R.type === 'mute' ? tr('静音：%{v}', { v: tr(Sound.muted ? '开' : '关') }) : R.n;
        ctx.fillText((sel ? '▶ ' : '') + label, 80, y + 6);
        this.addHot(56, y - 26, 420, 48, () => { this.audRow = i; this.activateAudioRow(i); }, () => { this.audRow = i; });
        return;
      }
      ctx.fillText(R.n, 80, y + 6);
      ctx.fillStyle = 'rgba(200,190,160,0.55)'; ctx.font = '11px ' + MONO; if (!I18N.en) ctx.fillText(R.en, 170, y + 6);
      const v = Sound.volumes[R.k], dim = Sound.muted && R.k !== 'music' && R.k !== 'sfx' ? 0.4 : 1;
      const { x, w } = AUD_BAR;
      // 滑槽 + 刻度
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x, y - 4, w, 8);
      ctx.globalAlpha = Sound.muted ? 0.4 : dim;
      ctx.fillStyle = sel ? '#7ff' : '#5cc'; ctx.fillRect(x, y - 4, w * v, 8);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; for (let s = 1; s < 10; s++) ctx.fillRect(x + (w / 10) * s, y - 4, 1, 8);
      // 滑块
      ctx.fillStyle = sel ? '#fff' : '#cfd8d4'; ctx.beginPath(); ctx.arc(x + w * v, y, sel ? 9 : 7, 0, 7); ctx.fill();
      ctx.fillStyle = sel ? '#7ff' : 'rgba(230,230,220,0.8)'; ctx.font = 'bold 15px ' + MONO; ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(v * 100)}%`, x + w + 70, y + 6); ctx.textAlign = 'left';
      // 左右小箭头（触屏 / 鼠标可点）
      const arrow = (ax, d) => {
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(ax, y - 13, 26, 26);
        ctx.fillStyle = '#e8e4d8'; ctx.font = 'bold 14px ' + FONT; ctx.textAlign = 'center'; ctx.fillText(d < 0 ? '◀' : '▶', ax + 13, y + 5); ctx.textAlign = 'left';
        this.addHot(ax, y - 13, 26, 26, () => { this.audRow = i; this.setVol(R.k, Sound.volumes[R.k] + d * 0.05); });
      };
      arrow(x - 40, -1); arrow(x + w + 84, 1);
      // 滑槽本身：点击 / 拖动设置数值
      const set = (pt) => { if (pt) { this.audRow = i; this.setVol(R.k, (pt.x - x) / w); } };
      this.addHot(x - 6, y - 16, w + 12, 32, set, () => { this.audRow = i; }, set);
    });
    if (Sound.muted) { ctx.fillStyle = '#f96'; ctx.font = '13px ' + FONT; ctx.fillText('当前处于静音状态（M 键也可以切换）', 80, VH - 70); }
    drawHintLine(ctx, 60, VH - 30, [{ k: 'select' }, '选择', { k: 'tab' }, '调节', { k: 'confirm' }, '确认', { k: 'back' }, '返回', ' · 鼠标可点击或拖动滑块']);
    this.drawBackButton(ctx, () => { Sound.sfx.select(); this.closeAudio(); });
  },
});
