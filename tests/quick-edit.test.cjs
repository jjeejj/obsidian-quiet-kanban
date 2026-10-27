const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./helpers/load-module.cjs');
const { saveCardEdits, mountQuickEditor } = loadModule('src/board/quick-edit.cjs', { Modal: class {} });
const options = { titleProperty: 'file.name', dateProperty: 'note.start', projectProperty: 'note.projects' };
const initial = { title: 'Task', date: '2026-10-26', projects: 'One' };
const t = text => text;
function fixture() {
  const file = { path: 'Tasks/Task.md', name: 'Task.md', basename: 'Task', extension: 'md', parent: { path: 'Tasks' } };
  const fm = { start: '2026-10-26', projects: ['One'], status: ['Doing', 'Other'], unrelated: 42 };
  const writes = [];
  const app = { vault: { getAbstractFileByPath: () => null }, fileManager: {
    renameFile: async (file, target) => { file.path = target; writes.push('rename'); },
    processFrontMatter: async (_file, fn) => { fn(fm); writes.push('properties'); }
  } };
  return { file, fm, writes, app };
}
test('quick edit saves title/date/projects and preserves unrelated frontmatter', async () => {
  const f = fixture();
  await saveCardEdits(f.app, f.file, options, initial,
    { title: 'Renamed', date: '2026-11-01', projects: 'One\nTwo\nOne' }, t);
  assert.equal(f.file.path, 'Tasks/Renamed.md');
  assert.deepEqual(f.fm, { start: '2026-11-01', projects: ['One', 'Two'], status: ['Doing', 'Other'], unrelated: 42 });
  const untouched = fixture();
  await saveCardEdits(untouched.app, untouched.file, options, initial, { ...initial }, t);
  assert.deepEqual(untouched.writes, []);
});
test('quick edit validates before writing and clears optional properties explicitly', async () => {
  const f = fixture();
  for (const draft of [{ ...initial, title: '../bad' }, { ...initial, title: 'New', date: '2026-02-30' }]) {
    await assert.rejects(saveCardEdits(f.app, f.file, options, initial, draft, t));
    assert.deepEqual(f.writes, []);
  }
  await saveCardEdits(f.app, f.file, options, initial, { ...initial, date: '', projects: '' }, t);
  assert.deepEqual(f.fm, { status: ['Doing', 'Other'], unrelated: 42 });
});
test('custom note titles update frontmatter; computed fields are not written', async () => {
  const f = fixture();
  await saveCardEdits(f.app, f.file, { titleProperty: 'note.title', dateProperty: 'file.ctime', projectProperty: 'formula.projects' },
    initial, { title: 'Custom', date: 'ignored', projects: 'ignored' }, t);
  assert.equal(f.file.path, 'Tasks/Task.md');
  assert.equal(f.fm.title, 'Custom');
  assert.equal(f.fm.start, initial.date);
  assert.deepEqual(f.fm.projects, ['One']);
});

function element(tag, doc) {
  return { tag, ownerDocument: doc, children: [], handlers: {}, dataset: {},
    appendChild(node) { this.children.push(node); }, setAttribute() {},
    replaceChildren(...nodes) { this.children = nodes; }, focus() {},
    addEventListener(type, fn) { this.handlers[type] = fn; }
  };
}
function editorFixture() {
  const f = fixture();
  const doc = { createElement: tag => element(tag, doc) };
  const card = element('article', doc);
  let renders = 0;
  const entry = { file: f.file, getValue: key => key === 'note.start' ? [initial.date] : ['One'] };
  const view = { app: f.app, plugin: { t }, options: () => options, render() { renders++; }, root: { querySelectorAll: () => [] } };
  mountQuickEditor(view, card, entry, value => value);
  const form = card.children[0];
  const inputs = form.children.filter(node => node.tag === 'label').map(label => label.children[1]);
  return { ...f, view, form, inputs, renders: () => renders };
}
test('inline editor cancel and Escape discard the draft without writing', () => {
  for (const escape of [false, true]) {
    const f = editorFixture();
    f.inputs[0].value = 'Unsaved'; f.inputs[0].handlers.input();
    if (escape) f.form.handlers.keydown({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
    else f.form.children.at(-1).children[0].handlers.click();
    assert.equal(f.view.editing, null);
    assert.equal(f.renders(), 1);
    assert.deepEqual(f.writes, []);
  }
});
test('inline editor keeps failed drafts open and saves only on submit', async () => {
  const f = editorFixture();
  f.inputs[1].value = 'bad date'; f.inputs[1].handlers.input();
  const event = { preventDefault() {}, stopPropagation() {} };
  await f.form.handlers.submit(event);
  assert.ok(f.view.editing);
  assert.deepEqual(f.writes, []);
  f.inputs[1].value = '2026-11-02'; f.inputs[1].handlers.input();
  await f.form.handlers.submit(event);
  assert.equal(f.view.editing, null);
  assert.equal(f.fm.start, '2026-11-02');
});
