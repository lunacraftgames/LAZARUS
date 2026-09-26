'use strict';
// ============================================================
//  LAZARUS 桌面版（Electron）主进程
//  · 加载仓库根目录的网页版游戏（打包后在 app.asar/game/ 里）
//  · 存档：写到用户目录下的文件，进度存档按 Steam 账号分目录，供 Steam 云同步（Auto-Cloud）
//  · Steam：成就、Steam 界面（Overlay）；Steam 没有运行时游戏照常能玩，只是不解锁 Steam 成就
//  · 显示：全屏 / 窗口，启动时按上次的设置打开
// ============================================================
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const PKG = require('./package.json');

const STEAM_APP_ID = Number(process.env.LAZARUS_STEAM_APPID || PKG.lazarus.steamAppId);
// 测试功能（标题画面数字键跳关、F12 开发者工具）：只在未打包时用 --debug 打开，玩家改启动参数也打不开
const DEBUG = !app.isPackaged && process.argv.includes('--debug');
// 游戏文件：打包后在 game/ 里；开发时直接用仓库根目录
const GAME_DIR = fs.existsSync(path.join(__dirname, 'game', 'index.html')) ? path.join(__dirname, 'game') : path.join(__dirname, '..');

// 用户目录固定为 <系统应用数据目录>/LAZARUS（Windows：%APPDATA%\LAZARUS；Linux：~/.config/LAZARUS），Steam 云同步的路径按这个配置
app.setName('LAZARUS');
app.setPath('userData', path.join(app.getPath('appData'), 'LAZARUS'));
// Linux（含 Steam Deck）：Steam 下载的文件不带 chrome-sandbox 需要的 setuid 权限，在 Steam 运行时里沙盒会启动失败；游戏只加载本地文件
if (process.platform === 'linux' && app.isPackaged) app.commandLine.appendSwitch('no-sandbox');

if (!app.requestSingleInstanceLock()) app.exit(0);

// ------------------------------------------------------------
//  Steam
// ------------------------------------------------------------
let steam = null, steamId = null;
function initSteam() {
  if (process.env.LAZARUS_NO_STEAM) return true;
  let sw;
  try { sw = require('steamworks.js'); } catch (e) { console.warn('[steam] 无法加载 steamworks.js：', e.message); return true; }
  // 正式版不是从 Steam 启动的：交给 Steam 重新启动游戏（480 是 Valve 的测试 AppID，开发时不这样做）
  try { if (app.isPackaged && STEAM_APP_ID !== 480 && sw.restartAppIfNecessary(STEAM_APP_ID)) return false; } catch (e) { /* 继续尝试初始化 */ }
  try {
    steam = sw.init(STEAM_APP_ID);
    steamId = steam.localplayer.getSteamId().steamId64.toString();
    sw.electronEnableSteamOverlay();
  } catch (e) {
    console.warn('[steam] 未连接（Steam 没有运行？）：', e.message);
    steam = null; steamId = null;
  }
  return true;
}
if (!initSteam()) app.exit(0);

// ------------------------------------------------------------
//  存档（每个键一个文件，内容就是网页版 localStorage 里的字符串）
//  · 进度（CLOUD_KEYS）：userData/save/<SteamID64>/  —— Steam 云同步这个目录；没连上 Steam 时用 save/local/
//  · 设置（键位、音量、语言、显示）：userData/settings/  —— 跟着这台电脑走，不同步
// ------------------------------------------------------------
const CLOUD_KEYS = new Set(['lazarus_ch1_save', 'lazarus_profile']);
const SAVE_DIR = path.join(app.getPath('userData'), 'save', steamId || 'local');
const CFG_DIR = path.join(app.getPath('userData'), 'settings');
const EXT = '.dat';
const validKey = (k) => typeof k === 'string' && /^[a-z0-9_]+$/i.test(k);
const fileOf = (k) => path.join(CLOUD_KEYS.has(k) ? SAVE_DIR : CFG_DIR, k + EXT);

function loadStore() {
  const data = {};
  for (const dir of [CFG_DIR, SAVE_DIR]) {
    let names = [];
    try { names = fs.readdirSync(dir); } catch (e) { continue; }
    for (const n of names) {
      if (!n.endsWith(EXT)) continue;
      const k = n.slice(0, -EXT.length);
      if (!validKey(k)) continue;
      try { data[k] = fs.readFileSync(path.join(dir, n), 'utf8'); } catch (e) { /* 读不了就当没有 */ }
    }
  }
  return data;
}
// 先写临时文件再改名：写到一半断电也不会把旧存档写坏
function writeKey(k, v) {
  const f = fileOf(k), tmp = f + '.tmp';
  try {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(tmp, v, 'utf8');
    fs.renameSync(tmp, f);
  } catch (e) { console.error('[store] 写入失败', k, e.message); }
}
function removeKey(k) { try { fs.unlinkSync(fileOf(k)); } catch (e) { /* 本来就没有 */ } }
function readDisplay() { try { return JSON.parse(fs.readFileSync(fileOf('lazarus_display'), 'utf8')) || {}; } catch (e) { return {}; } }

// ------------------------------------------------------------
//  窗口
// ------------------------------------------------------------
let win = null;
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 720, useContentSize: true, minWidth: 640, minHeight: 360,
    fullscreen: readDisplay().fullscreen !== false, // 默认全屏
    backgroundColor: '#050607', show: false, title: 'LAZARUS',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      devTools: DEBUG, spellcheck: false,
    },
  });
  win.once('ready-to-show', () => win.show());
  const sendFull = () => { if (!win.isDestroyed()) win.webContents.send('display:fullscreen', win.isFullScreen()); };
  win.on('enter-full-screen', sendFull);
  win.on('leave-full-screen', sendFull);
  // 只显示游戏本身：不跳转、不开新窗口、不能缩放页面
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('did-finish-load', () => win.webContents.setVisualZoomLevelLimits(1, 1));
  if (DEBUG) win.webContents.on('before-input-event', (e, input) => { if (input.type === 'keyDown' && input.key === 'F12') win.webContents.toggleDevTools(); });
  win.on('closed', () => { win = null; });
  win.loadFile(path.join(GAME_DIR, 'index.html'));
}

// 渲染进程启动时同步取一次：调试开关、Steam 状态、全部存档
ipcMain.on('desktop:init', (e) => {
  e.returnValue = { debug: DEBUG, steam: !!steam, platform: process.platform, fullscreen: !!(win && win.isFullScreen()), store: loadStore() };
});
ipcMain.on('store:set', (e, k, v) => { if (validKey(k) && typeof v === 'string') writeKey(k, v); });
ipcMain.on('store:remove', (e, k) => { if (validKey(k)) removeKey(k); });
ipcMain.on('display:fullscreen', (e, on) => { if (win) win.setFullScreen(!!on); });
ipcMain.on('app:quit', () => app.quit());
ipcMain.on('steam:achievement', (e, id) => {
  if (!steam || typeof id !== 'string') return;
  try { if (!steam.achievement.isActivated(id)) steam.achievement.activate(id); } catch (err) { console.warn('[steam] 成就解锁失败', id, err.message); }
});

Menu.setApplicationMenu(null); // 没有菜单栏，也就没有 Ctrl+R 刷新、Ctrl+W 关闭这类默认快捷键
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
