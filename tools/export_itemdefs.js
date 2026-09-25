// 用法：node tools/export_itemdefs.js [你的AppID]
// 生成 steam_itemdefs.json，可在 Steamworks 后台「Steam 库存服务 → 道具定义」处上传。
// 上传前请把 icon_url 换成你自己托管的图标地址。
const fs = require('fs');
const path = require('path');
const { toSteamSchema } = require('../js/inventory.js');
// 英文名称 / 描述来自 js/lang/en_items.js（默认语言是英文）
const I18N = { EN: {} }; new Function('I18N', fs.readFileSync(path.join(__dirname, '../js/lang/en_items.js'), 'utf8'))(I18N);
const appid = parseInt(process.argv[2] || '480', 10); // 480 = Valve 的测试 AppID（Spacewar）
const out = path.join(__dirname, 'steam_itemdefs.json');
fs.writeFileSync(out, JSON.stringify(toSteamSchema(appid, I18N.EN), null, 2), 'utf8');
console.log('已导出 ->', out);
