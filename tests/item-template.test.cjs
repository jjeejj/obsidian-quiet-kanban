const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./helpers/load-module.cjs');
const { normalizeSettings } = require('../src/settings/defaults.cjs');
const { getViewOptions } = require('../src/board/options.cjs');

// Use JSON frontmatter (valid YAML) so these tests focus on merging and creation.
function getFrontMatterInfo(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  return { exists: !!match, frontmatter: match?.[1] || '', contentStart: match?.[0].length || 0 };
}
const { createItem, parseTemplate, showNewItemMenu } = loadModule('src/files/item-template.cjs', {
  FuzzySuggestModal: class {}, getFrontMatterInfo, parseYaml: JSON.parse,
  Menu: class {
    constructor() { this.items = []; }
    addItem(fn) { const item = { setTitle(title) { this.title = title; return this; }, setIcon() { return this; }, onClick(fn) { this.click = fn; return this; } }; fn(item); this.items.push(item); }
    addSeparator() {}
    showAtPosition() { lastMenu = this; }
  }
});
let lastMenu;

function fixture(templateFile = 'Templates/Item.md') {
  let created = 0;
  let result;
  let frontmatter;
  const template = '---\n{"status":"Wrong","project":"Template","tags":["task"],"start":"2026-10-26"}\n---\n# Description\n\n- [ ] Task\n';
  const view = {
    options: () => ({ templateFile, statusProperty: 'note.status' }),
    plugin: { t: text => text },
    app: { vault: {
      getFileByPath: path => path === 'Templates/Item.md' ? { path, extension: 'md' } : null,
      read: async () => template,
      process: async (_file, update) => { result = update(result); }
    } },
    async createFileForView(_name, update) {
      created++;
      frontmatter = { project: 'Filtered project' };
      update(frontmatter, { path: 'Created.md', extension: 'md' });
      result = '---\n' + JSON.stringify(frontmatter) + '\n---\n';
    }
  };
  return { view, created: () => created, result: () => result, frontmatter: () => frontmatter };
}

test('linked template supplies body and defaults; Bases filters and target column win', async () => {
  const f = fixture();
  await createItem(f.view, 'Doing');
  assert.equal(f.created(), 1);
  assert.deepEqual(f.frontmatter(), { project: 'Filtered project', status: ['Doing'], tags: ['task'], start: '2026-10-26' });
  assert.equal(parseTemplate(f.result()).body, '# Description\n\n- [ ] Task\n');
});

test('missing or invalid templates abort before creating; empty association uses native creation', async () => {
  const f = fixture('missing.md');
  await assert.rejects(createItem(f.view, 'Doing'), /模板笔记不存在/);
  assert.equal(f.created(), 0);
  const g = fixture();
  g.view.app.vault.read = async () => '---\n["invalid frontmatter"]\n---\nBody';
  await assert.rejects(createItem(g.view, 'Doing'), /YAML object/);
  assert.equal(g.created(), 0);
  const h = fixture('');
  await createItem(h.view, 'Doing');
  assert.deepEqual(h.frontmatter(), { project: 'Filtered project', status: ['Doing'] });
});

test('no-status column clears template status and body insertion preserves concurrent content', async () => {
  const f = fixture();
  const process = f.view.app.vault.process;
  f.view.app.vault.process = (_file, update) => process(_file, current => update(current + 'User content'));
  await createItem(f.view, '');
  assert.equal(Object.hasOwn(f.frontmatter(), 'status'), false);
  assert.match(f.result(), /# Description[\s\S]*User content$/);
});

test('template association is exposed per board and can be explicitly cleared in the add menu', () => {
  assert.equal(normalizeSettings({ templateFile: 123 }).templateFile, '');
  assert.equal(normalizeSettings({ templateFile: ' Templates/Item.md ' }).templateFile, 'Templates/Item.md');
  const option = getViewOptions({ settings: normalizeSettings(), t: text => text }).find(o => o.key === 'templateFile');
  assert.equal(option.type, 'file');
  assert.equal(option.filter({ extension: 'md' }), true);
  assert.equal(option.filter({ extension: 'png' }), false);
  const f = fixture();
  let changed;
  f.view.config = { set: (key, value) => { changed = [key, value]; } };
  showNewItemMenu(f.view, { getBoundingClientRect: () => ({ left: 10, bottom: 20 }) }, 'Doing', {});
  assert.deepEqual(lastMenu.items.map(i => i.title), ['使用关联模板新建文档', '关联模板…', '打开关联模板', '取消关联模板']);
  lastMenu.items[3].click();
  assert.deepEqual(changed, ['templateFile', '']);
});

test('generic creation writes boolean/number groups as typed scalars and allows no grouping', async () => {
  for (const group of [false, 0]) {
    const f = fixture('');
    f.view.options = () => ({ groupProperty: 'note.bucket', templateFile: '' });
    await createItem(f.view, group);
    assert.equal(f.frontmatter().bucket, group);
  }
  const blank = fixture('');
  blank.view.options = () => ({ groupProperty: '', templateFile: '' });
  await createItem(blank.view, null);
  assert.deepEqual(blank.frontmatter(), { project: 'Filtered project' });
  const readOnly = fixture('');
  readOnly.view.options = () => ({ groupProperty: 'formula.bucket', templateFile: '' });
  await assert.rejects(createItem(readOnly.view, 'A'), /只读分组/);
  assert.equal(readOnly.created(), 0);
});
