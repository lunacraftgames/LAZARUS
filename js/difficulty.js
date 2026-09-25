'use strict';
// ============================================================
//  难度
//  · 简单：每关有多个备份终端（存档点），被摧毁后在最近的存档点重构（原来的玩法）
//  · 普通：没有存档点，被摧毁后从当前关卡的起点重新开始（默认）
//  · 困难：没有存档点，被摧毁后从当前章节第一关的起点重新开始（通关普通后解锁）
//  · 噩梦：没有存档点，被摧毁后从 1-1 的起点重新开始（通关困难后解锁）
//  难度和角色一样，只能在开始「新的游戏」时选择，写进周目存档；
//  「通关」= 从 1-1 开始的完整周目打完最终章（章节选择重玩不算）
// ============================================================
const DIFFS = [
  { id: 'easy', name: '简单', en: 'Easy', color: '#8fe', desc: '每关有多个备份终端（存档点）。被摧毁后在最近的存档点重构。', unlocked: () => true },
  { id: 'normal', name: '普通', en: 'Normal', color: '#fc6', desc: '没有存档点。被摧毁后从当前关卡的起点重新开始。', unlocked: () => true },
  { id: 'hard', name: '困难', en: 'Hard', color: '#f96', desc: '没有存档点。被摧毁后从当前章节第一关的起点重新开始。', unlockText: '通关普通难度后解锁', unlocked: () => !!(Inventory.p && Inventory.p.diffClear && Inventory.p.diffClear.normal) },
  { id: 'nightmare', name: '噩梦', en: 'Nightmare', color: '#f45', desc: '没有存档点。被摧毁后从第一章第一关（1-1）的起点重新开始。', unlockText: '通关困难难度后解锁', unlocked: () => !!(Inventory.p && Inventory.p.diffClear && Inventory.p.diffClear.hard) },
];
const DIFF_DEFAULT = 'normal';
// 难度名直接用 en 字段（「普通」在词典里已经是稀有度 Common）
function diffName(id) { const d = diffDef(id); return I18N.en ? d.en : d.name; }
function diffDef(id) { return DIFFS.find((d) => d.id === id) || DIFFS.find((d) => d.id === DIFF_DEFAULT); }
// 被摧毁后从哪一关重来（null = 原地在存档点重构）
function diffRestartLevel(id, levelIndex) {
  if (id === 'easy') return null;
  if (id === 'normal') return levelIndex;
  if (id === 'hard') return chapterStart(chapterOf(LEVELS[levelIndex]));
  return 0;
}
// 通关某个难度后解锁的下一个难度
const DIFF_NEXT = { normal: 'hard', hard: 'nightmare' };
