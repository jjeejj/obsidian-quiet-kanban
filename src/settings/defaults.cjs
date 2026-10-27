'use strict';
const { PALETTE } = require('../board/model.cjs');
const { normalizeLanguage } = require('../i18n/index.cjs');
const { propertyId, layoutFrom } = require('../board/fields.cjs');
const DEFAULTS = {
  language: 'auto', templateFile: '',
  statusProperty: 'note.状态', dateProperty: 'note.开始开发时间',
  projectProperty: 'note.项目', titleProperty: 'file.name',
  columnWidth: 310, hideEmpty: true, openMode: 'split', togglePreview: true,
  cardTint: 17,
  colors: { '开发中': 'blue', '测试中': 'purple', '调研中': 'cyan', '开发完成': 'green',
    '讨论中': 'orange', '已上线': 'green', '已完成': 'green', '暂停': 'yellow', '废弃': 'red' }
};
function bounded(value, fallback, min, max) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
function normalizeSettings(input = {}) {
  const s = { ...DEFAULTS, ...input };
  s.language = normalizeLanguage(s.language);
  s.templateFile = typeof s.templateFile === 'string' ? s.templateFile.trim() : '';
  for (const key of ['statusProperty', 'dateProperty', 'projectProperty', 'titleProperty']) {
    s[key] = propertyId(s[key], DEFAULTS[key]);
  }
  s.statusProperty ||= DEFAULTS.statusProperty;
  s.titleProperty ||= 'file.name';
  s.columnWidth = bounded(s.columnWidth, 310, 220, 520);
  s.cardTint = bounded(s.cardTint, 17, 0, 35);
  s.hideEmpty = typeof s.hideEmpty === 'boolean' ? s.hideEmpty : true;
  s.togglePreview = typeof s.togglePreview === 'boolean' ? s.togglePreview : true;
  s.openMode = s.openMode === 'tab' ? 'tab' : 'split';
  s.colors = Object.fromEntries(Object.entries(s.colors || {}).filter(([key, color]) => key && PALETTE.includes(color)));
  return { ...s, ...layoutFrom(input) };
}
module.exports = { DEFAULTS, normalizeSettings, propertyId };
