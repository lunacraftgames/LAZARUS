'use strict';
// ============================================================
//  调试面板（仅供开发测试，发布前删除）
//  删除方法：删掉本文件，以及 index.html 里加载 js/debug.js 的那一行 <script>。其他文件不依赖它。
//
//  F9 或左下角的「DEBUG」按钮：打开 / 关闭面板
//  可以选择任意角色、任意关卡、任意难度直接开始（无视解锁条件）
//  「补齐武器 / 模块」：拉撒路补上这一关之前能拿到的武器和能力（其他角色的专属模块本来就会自动补上）；会写进存档
// ============================================================
(() => {
  const css = `
    #dbg-btn { position: fixed; left: 8px; bottom: 8px; z-index: 50; font: bold 11px monospace; color: #ff7; background: rgba(40,20,0,0.75);
      border: 1px solid #aa6; padding: 4px 8px; cursor: pointer; opacity: 0.55; }
    #dbg-btn:hover { opacity: 1; }
    #dbg { position: fixed; left: 8px; bottom: 40px; z-index: 51; width: 300px; font: 13px sans-serif; color: #eee; background: rgba(12,12,16,0.95);
      border: 1px solid #aa6; padding: 12px 14px; display: none; box-shadow: 0 4px 24px rgba(0,0,0,0.6); }
    #dbg h3 { margin: 0 0 8px; font: bold 13px monospace; color: #ff7; }
    #dbg label { display: block; margin: 8px 0 3px; color: #bbb; font-size: 12px; }
    #dbg select { width: 100%; padding: 4px; background: #222; color: #eee; border: 1px solid #555; font-size: 13px; }
    #dbg .chk { display: flex; align-items: center; gap: 6px; margin-top: 10px; color: #ccc; font-size: 12px; }
    #dbg .row { display: flex; gap: 8px; margin-top: 12px; }
    #dbg button { flex: 1; padding: 6px; background: #3a3a20; color: #ff7; border: 1px solid #aa6; cursor: pointer; font-size: 13px; }
    #dbg button.sec { background: #222; color: #ccc; border-color: #555; }
    #dbg .note { margin-top: 8px; color: #888; font-size: 11px; line-height: 1.4; }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const btn = document.createElement('div'); btn.id = 'dbg-btn'; btn.textContent = 'DEBUG (F9)';
  const P = document.createElement('div'); P.id = 'dbg';
  P.innerHTML = `
    <h3>调试面板 · DEBUG</h3>
    <label>角色</label><select id="dbg-char"></select>
    <label>关卡</label><select id="dbg-level"></select>
    <label>难度</label><select id="dbg-diff"></select>
    <div class="chk"><input type="checkbox" id="dbg-fill" checked><span>补齐这一关之前的武器 / 模块（写进存档）</span></div>
    <div class="row"><button id="dbg-go">开始</button><button id="dbg-close" class="sec">关闭</button></div>
    <div class="note">无视解锁条件。从这里开始的游玩不算完整周目（不会记录通关难度）。发布前删除 js/debug.js。</div>`;
  document.body.appendChild(btn); document.body.appendChild(P);
  const $ = (id) => document.getElementById(id);

  // 选项：角色 / 关卡（按章分组）/ 难度
  for (const id of CHAR_ORDER) { const c = charDef(id), o = document.createElement('option'); o.value = id; o.textContent = `${c.name} · ${c.en}`; $('dbg-char').appendChild(o); }
  let grp = null, gch = 0;
  LEVELS.forEach((L, i) => {
    const ch = chapterOf(L);
    if (ch !== gch) { gch = ch; grp = document.createElement('optgroup'); grp.label = `第${ch}章 · ${CHAPTERS[ch] ? CHAPTERS[ch].name : ''}`; $('dbg-level').appendChild(grp); }
    const o = document.createElement('option'); o.value = i; o.textContent = `${L.id}  ${L.name}${L.boss ? '（Boss）' : ''}`; grp.appendChild(o);
  });
  for (const d of DIFFS) { const o = document.createElement('option'); o.value = d.id; o.textContent = `${d.name} · ${d.en}`; $('dbg-diff').appendChild(o); }

  let pausedByUs = false;
  const open = () => {
    $('dbg-char').value = Game.charId || 'lazarus';
    $('dbg-level').value = Game.level ? String(Game.levelIndex) : '0';
    $('dbg-diff').value = Game.diff || DIFF_DEFAULT;
    P.style.display = 'block';
    if (Game.state === 'play') { Game.state = 'paused'; Game.pauseSel = 0; pausedByUs = true; if (Game.boss) Game.boss.stopSounds(); }
  };
  const close = () => {
    P.style.display = 'none';
    if (pausedByUs && Game.state === 'paused') Game.state = 'play';
    pausedByUs = false;
    Game.canvas.focus && Game.canvas.focus();
  };
  const toggle = () => (P.style.display === 'block' ? close() : open());

  // 拉撒路：补上目标关卡之前的拾取点能拿到的武器 / 能力（拾取点与模块共用 MOD_SOURCE）
  const fillLazarus = (idx) => {
    for (const [key, src] of Object.entries(MOD_SOURCE)) {
      const i = LEVELS.findIndex((L) => L.id === src);
      if (i >= 0 && i < idx) Inventory.p.abilities[key] = true;
    }
    Inventory.save();
  };

  const start = () => {
    const ch = $('dbg-char').value, idx = +$('dbg-level').value, diff = $('dbg-diff').value;
    Sound.init(); Sound.sfx.confirm();
    Inventory.preview = null;
    Game.charId = ch; Game.diff = diffDef(diff).id;
    Game.runFull = false; Game.radioHeard = new Set(); Game.bossSave = null;
    if ($('dbg-fill').checked && ch === 'lazarus') fillLazarus(idx);
    pausedByUs = false;
    P.style.display = 'none';
    Game.startLevel(idx);
    Game.toast('调试面板', `${charDef(ch).name} · ${LEVELS[idx].id} ${LEVELS[idx].name} · ${diffDef(diff).name}`);
  };

  btn.addEventListener('click', toggle);
  $('dbg-go').addEventListener('click', start);
  $('dbg-close').addEventListener('click', close);
  // 面板里的按键不传给游戏（否则方向键会同时移动角色 / 菜单）
  for (const t of ['keydown', 'keyup']) P.addEventListener(t, (e) => { if (e.code !== 'F9') e.stopPropagation(); });
  P.addEventListener('pointerdown', (e) => e.stopPropagation());
  addEventListener('keydown', (e) => {
    if (e.code === 'F9') { e.preventDefault(); if (!e.repeat) toggle(); }
    else if (e.code === 'Escape' && P.style.display === 'block') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
  }, true);
})();
