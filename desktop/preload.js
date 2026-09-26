'use strict';
// ============================================================
//  LAZARUS 桌面版 preload：给网页版游戏注入
//  · window.LAZARUS_DESKTOP：存档读写、全屏、退出游戏、调试开关（js/core.js 的 DESKTOP / Store 使用）
//  · window.LAZARUS_STEAM：Steam 成就（js/game.js 的 checkChipRewards 使用；Steam 没连上时不注入）
// ============================================================
const { contextBridge, ipcRenderer } = require('electron');

const init = ipcRenderer.sendSync('desktop:init');
// 存档在内存里留一份：读取是同步的（和 localStorage 一样），写入交给主进程落盘
const data = Object.assign(Object.create(null), init.store);
let full = init.fullscreen;
const fullCbs = [];
ipcRenderer.on('display:fullscreen', (e, on) => { full = on; for (const cb of fullCbs) cb(on); });

contextBridge.exposeInMainWorld('LAZARUS_DESKTOP', {
  debug: init.debug,
  platform: init.platform,
  store: {
    get: (k) => (k in data ? data[k] : null),
    set: (k, v) => { v = String(v); if (data[k] === v) return; data[k] = v; ipcRenderer.send('store:set', k, v); },
    remove: (k) => { if (!(k in data)) return; delete data[k]; ipcRenderer.send('store:remove', k); },
  },
  isFullscreen: () => full,
  setFullscreen: (on) => ipcRenderer.send('display:fullscreen', !!on),
  onFullscreen: (cb) => { fullCbs.push(cb); },
  quit: () => ipcRenderer.send('app:quit'),
});

if (init.steam) {
  contextBridge.exposeInMainWorld('LAZARUS_STEAM', {
    setAchievement: (id) => ipcRenderer.send('steam:achievement', String(id)),
  });
}
