const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/settings/defaults.cjs');
const i18n = require('../src/i18n/index.cjs');

test('new and legacy settings follow Obsidian; invalid language falls back to auto', () => {
  assert.equal(core.normalizeSettings().language, 'auto');
  assert.equal(core.normalizeSettings({ language: 'fr' }).language, 'auto');
  for (const appLanguage of ['zh', 'zh-TW', 'zh_CN', 'ZH']) {
    assert.equal(i18n.resolveLanguage('auto', appLanguage), 'zh');
  }
  for (const appLanguage of ['en', 'fr', '', undefined]) {
    assert.equal(i18n.resolveLanguage('auto', appLanguage), 'en');
  }
  assert.equal(i18n.resolveLanguage('en', 'zh'), 'en');
  assert.equal(i18n.resolveLanguage('zh', 'en'), 'zh');
});

test('translations interpolate values without translating note content', () => {
  assert.equal(i18n.translate('auto', 'en', '打开需求：{title}', { title: '开发中 {title} <hello>' }), 'Open item: 开发中 {title} <hello>');
  assert.equal(i18n.translate('zh', 'en', '打开需求：{title}', { title: 'Test' }), '打开需求：Test');
  assert.equal(i18n.translate('en', 'en', 'Custom text'), 'Custom text');
  const original = core.normalizeSettings({ statusProperty: '状态', colors: { '开发中': 'blue' } });
  const changed = core.normalizeSettings({ ...original, language: 'en' });
  assert.deepEqual({ ...changed, language: 'auto' }, original);
  for (const [source, english] of Object.entries(i18n.EN)) {
    assert.equal(typeof english, 'string');
    assert.ok(english.length);
    assert.deepEqual(english.match(/\{\w+\}/g), source.match(/\{\w+\}/g));
  }
});

