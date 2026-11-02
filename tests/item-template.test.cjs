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
  Modal: class {}, getFrontMatterInfo, parseYaml: JSON.parse,
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
  let popoverCloses = 0;
  let popoverSuppressed = false;
  const opens = [];
  const board = { id: 'board' };
  const body = { dataset: {} };
  const template = '---\n{"status":"Wrong","project":"Template","tags":["task"],"start":"2026-10-26"}\n---\n# Description\n\n- [ ] Task\n';
  const view = {
    options: () => ({ templateFile, statusProperty: 'note.status', openMode: 'split' }),
    ownerLeaf: () => board,
    root: { ownerDocument: { body } },
    queryController: { newItemMenu: { close: () => { popoverCloses++; } } },
    plugin: { t: text => text, previews: { open: async (...args) => opens.push(args) } },
    app: { vault: {
      getFileByPath: path => path === 'Templates/Item.md' ? { path, extension: 'md' } : null,
      read: async () => template,
      process: async (_file, update) => { result = update(result); }
    } },
    async createFileForView(_name, update) {
      popoverSuppressed = body.dataset.qkSuppressNewItemPopover === '1';
      created++;
      frontmatter = { project: 'Filtered project' };
      update(frontmatter, { path: 'Created.md', extension: 'md' });
      result = '---\n' + JSON.stringify(frontmatter) + '\n---\n';
    }
  };
  return { view, created: () => created, result: () => result, frontmatter: () => frontmatter,
    popoverCloses: () => popoverCloses, popoverSuppressed: () => popoverSuppressed, body, opens, board };
}

test('linked template supplies body and defaults; Bases filters and target column win', async () => {
  const f = fixture();
  await createItem(f.view, 'Doing');
  assert.equal(f.created(), 1);
  assert.deepEqual(f.frontmatter(), { project: 'Filtered project', status: ['Doing'], tags: ['task'], start: '2026-10-26' });
  assert.deepEqual(Object.keys(f.frontmatter()), ['status', 'project', 'tags', 'start']);
  assert.equal(parseTemplate(f.result()).body, '# Description\n\n- [ ] Task\n');
  assert.equal(f.popoverCloses(), 1);
  assert.equal(f.popoverSuppressed(), true);
  assert.equal(f.body.dataset.qkSuppressNewItemPopover, undefined);
  assert.deepEqual(f.opens, [[f.board, { path: 'Created.md', extension: 'md' }, 'split', false]]);
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

function pickerFixture({ initialPath = '', active = { path: 'Templates/当前笔记.md', extension: 'md' }, save } = {}) {
  const rows = [];
  const lookups = [];
  const files = new Map([
    ['Templates/Task.md', { path: 'Templates/Task.md', extension: 'md' }],
    ['Templates/当前笔记.md', { path: 'Templates/当前笔记.md', extension: 'md' }],
    ['image.png', { path: 'image.png', extension: 'png' }]
  ]);
  class Modal {
    constructor(app) { this.app = app; this.contentEl = { createEl: () => ({ textContent: '' }), empty() {} }; }
    close() { this.closed = true; this.onClose(); }
  }
  class Setting {
    constructor() { rows.push(this); this.buttons = []; }
    setName(name) { this.name = name; return this; }
    setDesc() { return this; }
    addText(fn) {
      this.input = { setPlaceholder() { return this; }, setValue(value) { this.value = value; return this; }, onChange(fn) { this.change = fn; return this; } };
      fn(this.input); return this;
    }
    addButton(fn) {
      const button = { setButtonText(text) { this.text = text; return this; }, setCta() { return this; }, onClick(fn) { this.click = fn; return this; } };
      fn(button); this.buttons.push(button); return this;
    }
  }
  const { TemplatePicker } = loadModule('src/files/item-template.cjs', { Modal, Setting, normalizePath: path => path.replaceAll('\\', '/') });
  let selected;
  const picker = new TemplatePicker({
    workspace: { getActiveFile: () => active },
    vault: new Proxy({ getFileByPath(path) { lookups.push(path); return files.get(path); } }, {
      get(target, key) { if (!(key in target)) throw Error(`Unexpected vault access: ${key}`); return target[key]; }
    })
  }, text => text, save || (file => { selected = file; }), initialPath);
  picker.onOpen();
  return { picker, rows, lookups, selected: () => selected };
}

test('template dialog resolves only the entered path, without enumeration or content reads', async () => {
  const f = pickerFixture({ initialPath: 'Templates/Task.md' });
  assert.equal(f.rows[0].input.value, 'Templates/Task.md');
  assert.deepEqual(f.lookups, []);
  f.rows[0].input.change('  Templates/当前笔记.md  ');
  await f.picker.submit();
  assert.deepEqual(f.lookups, ['Templates/当前笔记.md']);
  assert.equal(f.selected().path, 'Templates/当前笔记.md');
  assert.equal(f.picker.closed, true);
});

test('template dialog can use the current Markdown note; cancelling never saves', async () => {
  const f = pickerFixture();
  f.rows[1].buttons[0].click();
  assert.equal(f.rows[0].input.value, 'Templates/当前笔记.md');
  await f.picker.submit();
  assert.equal(f.selected().path, 'Templates/当前笔记.md');
  const cancelled = pickerFixture({ active: { path: 'board.base', extension: 'base' } });
  assert.equal(cancelled.rows.length, 2);
  cancelled.rows.at(-1).buttons[0].click();
  assert.equal(cancelled.selected(), undefined);
  assert.deepEqual(cancelled.lookups, []);
});

test('invalid template paths leave the dialog open and existing association untouched', async () => {
  for (const path of ['', 'missing.md', 'image.png', '../outside.md', '/absolute.md']) {
    const f = pickerFixture({ initialPath: path });
    await f.picker.submit();
    assert.match(f.picker.errorEl.textContent, /模板笔记不存在/);
    assert.equal(f.picker.closed, undefined);
    assert.equal(f.selected(), undefined);
  }
});

test('failed template saves can be retried and repeated clicks do not submit twice', async () => {
  let attempts = 0;
  let finish;
  const f = pickerFixture({ initialPath: 'Templates/Task.md', save: async () => {
    attempts++;
    if (attempts === 1) throw Error('Save failed');
    await new Promise(resolve => { finish = resolve; });
  } });
  await f.picker.submit();
  assert.equal(f.picker.errorEl.textContent, 'Save failed');
  assert.equal(f.picker.closed, undefined);
  const saving = f.picker.submit();
  await f.picker.submit();
  assert.equal(attempts, 2);
  finish();
  await saving;
  assert.equal(f.picker.closed, true);
});
