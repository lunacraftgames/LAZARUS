'use strict';
// ============================================================
//  本地化（英文 / 简体中文，默认英文）
//  · 中文原文就是翻译的键：代码和关卡数据里继续写中文，显示时按当前语言查 I18N.EN 词典（js/lang/en_*.js）
//  · tr(zh, vars)：翻译并填入变量，变量写成 %{name}（{jump} 这类花括号留给按键提示）
//  · 文字进入显示的三个入口都会自动翻译：
//      1. 无线电 / 剧情 / 提示框 / 自动换行（wrapText）——进入队列或换行前整句翻译
//      2. Canvas 的 fillText / measureText——静态界面文字在绘制时翻译（去掉前后的符号、按「 · 」拆开再查）
//      3. 带数字的动态文字——代码里直接用 tr('……%{n}……', { n })
//  · 缺少翻译时显示中文原文，I18N.missing 会记下来（测试用）
// ============================================================
const I18N = {
  lang: 'en',
  EN: {},
  missing: new Set(),
  init() {
    let l = null;
    l = Store.get('lazarus_lang');
    this.lang = l === 'zh' ? 'zh' : 'en'; // 默认英文
    if (typeof document !== 'undefined') document.documentElement.lang = this.lang === 'zh' ? 'zh-CN' : 'en';
  },
  set(l) {
    this.lang = l === 'zh' ? 'zh' : 'en';
    Store.set('lazarus_lang', this.lang);
    if (typeof document !== 'undefined') document.documentElement.lang = this.lang === 'zh' ? 'zh-CN' : 'en';
    this.applyDom();
  },
  get en() { return this.lang === 'en'; },
};
// 网页上的触屏按键（HTML 文字，不经过 Canvas）
I18N.applyDom = function () {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('#touch .tb').forEach((el) => {
    if (el.dataset.zh == null) el.dataset.zh = el.textContent;
    if (el.dataset.zh) el.textContent = tr(el.dataset.zh);
  });
};
I18N.init();
if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', () => I18N.applyDom());
const CJK_RE = /[㐀-鿿　-〿！-～]/;
const i18nFill = (s, vars) => (vars ? s.replace(/%\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)) : s);

// 查词典：整句 → 去掉前后的符号 / 数字再查 → 按「 · 」拆开逐段查
function i18nLookup(s) {
  const D = I18N.EN;
  if (Object.prototype.hasOwnProperty.call(D, s)) return D[s];
  // 前后缀（符号、数字、空格）：从中文的第一个 / 最后一个字往外扩，找词典里有的那一段
  let fi = -1, li = -1;
  for (let i = 0; i < s.length; i++) if (CJK_RE.test(s[i])) { if (fi < 0) fi = i; li = i; }
  if (fi >= 0 && (fi > 0 || li < s.length - 1)) {
    for (let a = fi; a >= 0; a--) for (let b = li + 1; b <= s.length; b++) {
      if (a === 0 && b === s.length) continue;
      const mid = s.slice(a, b);
      if (Object.prototype.hasOwnProperty.call(D, mid)) return s.slice(0, a) + D[mid] + s.slice(b);
    }
  }
  for (const sep of [' · ', '  ', '　']) {
    if (!s.includes(sep)) continue;
    const parts = s.split(sep).map((p) => (CJK_RE.test(p) ? i18nLookup(p) : p));
    if (parts.every((p) => p != null)) return parts.join(sep);
  }
  return null;
}
function tr(s, vars) {
  if (typeof s !== 'string') return s;
  if (!I18N.en || !CJK_RE.test(s)) return i18nFill(s, vars);
  const t = i18nLookup(s);
  if (t == null) { I18N.missing.add(s); return i18nFill(s, vars); }
  return i18nFill(t, vars);
}

// Canvas 绘制时翻译（只在英文模式、并且文字里有中文时才查表）
(() => {
  if (typeof CanvasRenderingContext2D === 'undefined') return;
  const P = CanvasRenderingContext2D.prototype, fill = P.fillText, measure = P.measureText;
  P.fillText = function (s, ...a) { return fill.call(this, typeof s === 'string' && I18N.en && CJK_RE.test(s) ? tr(s) : s, ...a); };
  P.measureText = function (s) { return measure.call(this, typeof s === 'string' && I18N.en && CJK_RE.test(s) ? tr(s) : s); };
})();

// 自动换行：先整句翻译；英文按单词换行，中文按字换行
wrapText = function (ctx, text, maxW) {
  text = tr(text);
  const lines = [];
  for (const para of String(text).split('\n')) {
    if (CJK_RE.test(para)) {
      let line = '';
      for (const ch of para) { const test = line + ch; if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = ch; } else line = test; }
      lines.push(line);
    } else {
      let line = '';
      for (const w of para.split(' ')) {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
      }
      lines.push(line);
    }
  }
  return lines.filter((l, i) => l || i < lines.length - 1);
};
