// 本地化检查：node tools/check_i18n.js
// 扫描 js/ 下所有含中文的字符串字面量（跳过注释），检查英文词典（js/lang/en_*.js）里能不能查到。
// 中文原文就是翻译的键：改了中文却忘了改英文词典，这里会列出来（退出码 1）。
// 带 ${} 的模板字符串不检查（代码里应该改用 tr('……%{x}……', { x })）。
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '../js');
const read = (f) => fs.readFileSync(path.join(JS, f), 'utf8');
const ctx = { Store: { get: () => null, set() {}, getJSON: () => null, setJSON() {} } }; vm.createContext(ctx);
const langs = fs.readdirSync(path.join(JS, 'lang')).filter((f) => f.endsWith('.js'));
vm.runInContext('var wrapText;' + read('i18n.js') + langs.map((f) => read('lang/' + f)).join('\n') + ';this.lookup=i18nLookup;', ctx);
vm.runInContext('var Game={};' + read('char_lines.js') + ';this.CT=CHAR_TEXT;', ctx);
// 不会直接显示的字符串：角色台词表的键（就是其他文件里的原文）和称呼替换的片段
const skip = new Set();
for (const T of Object.values(ctx.CT)) { Object.keys(T.lines).forEach((k) => skip.add(k)); (T.subs || []).forEach(([a, b]) => { skip.add(a); skip.add(b); }); }
skip.add('拉撒路协议');
const CJK = /[㐀-鿿]/;
let missing = 0;
for (const f of fs.readdirSync(JS).filter((f) => f.endsWith('.js'))) {
  const src = read(f); const found = new Set(); let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2) + 2; continue; }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1, s = '';
      while (src[j] !== c) { if (src[j] === '\\') { s += src[j + 1] === 'n' ? '\n' : src[j + 1]; j += 2; } else s += src[j++]; }
      if (CJK.test(s) && !(c === '`' && s.includes('${'))) found.add(s);
      i = j + 1; continue;
    }
    i++;
  }
  const miss = [...found].filter((s) => !skip.has(s) && !s.startsWith('语言 / Language') && !s.startsWith('Language / ') && ctx.lookup(s) == null);
  if (miss.length) { console.log(`## ${f}`); miss.forEach((s) => console.log('  ' + JSON.stringify(s))); missing += miss.length; }
}
console.log(missing ? `缺少英文翻译：${missing} 条` : '英文词典覆盖全部中文字符串');
process.exit(missing ? 1 : 0);
