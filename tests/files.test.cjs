const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSettings } = require('../src/settings/defaults.cjs');
const { loadModule } = require('./helpers/load-module.cjs');

function fixture() {
  const originalDoc = {
    filters: { and: ['file.ext == "md"'] }, properties: { status: { displayName: 'Status' } },
    views: [
      { type: 'kanban', name: 'First', groupBy: { property: 'other' } },
      { type: 'kanban', name: 'Selected', groupBy: { property: 'status' }, groupOrder: [['Doing'], 'Done'], sort: [{ property: 'file.name' }], filters: 'note.active' },
      { type: 'table', name: 'Table' }
    ]
  };
  const original = JSON.stringify(originalDoc);
  let current = original;
  const writes = [];
  const file = { name: 'Board.base', path: 'Boards/Board.base' };
  const plugin = {
    settings: normalizeSettings(), manifest: { id: 'quiet-kanban' }, t: text => text,
    app: {
      workspace: { getMostRecentLeaf: () => ({ view: { getState: () => ({ viewName: 'Selected' }) } }) },
      vault: {
        configDir: '.obsidian', read: async () => original,
        adapter: { exists: async () => true, write: async (path, content) => writes.push({ path, content }) },
        process: async (_file, update) => { current = update(current); }
      }
    }
  };
  // JSON is valid YAML; use a JSON fixture to isolate the conversion from the host YAML parser.
  const { convertBase } = loadModule('src/files/convert.cjs', {
    parseYaml: JSON.parse, stringifyYaml: JSON.stringify, Notice: class {}
  });
  return { plugin, file, writes, original, originalDoc, convertBase,
    current: () => current, modify: text => { current = text; } };
}

test('conversion backs up the original before replacing only the selected native view', async () => {
  const f = fixture();
  const backup = await f.convertBase(f.plugin, f.file);
  assert.match(backup, /^\.obsidian\/plugins\/quiet-kanban\/backups\/\d+-Board.base.json$/);
  assert.equal(f.writes[0].path, backup);
  assert.deepEqual(JSON.parse(f.writes[0].content), { path: f.file.path, content: f.original });
  const converted = JSON.parse(f.current());
  assert.deepEqual(converted.filters, f.originalDoc.filters);
  assert.deepEqual(converted.properties, f.originalDoc.properties);
  assert.deepEqual(converted.views[0], f.originalDoc.views[0]);
  assert.deepEqual(converted.views[2], f.originalDoc.views[2]);
  assert.deepEqual(converted.views[1], { ...f.originalDoc.views[1], type: 'quiet-kanban',
    groupProperty: 'note.status', columnOrder: ['Doing', 'Done'], groupOrderProperty: 'note.status', fields: f.plugin.settings.fields, fieldsSource: 'custom', titleProperty: 'file.name' });
});

test('conversion preserves concurrent changes and aborts if backup fails', async () => {
  const f = fixture();
  f.modify('concurrent edit');
  await assert.rejects(f.convertBase(f.plugin, f.file), /看板已被其他操作修改/);
  assert.equal(f.current(), 'concurrent edit');
  const g = fixture();
  g.plugin.app.vault.adapter.write = async () => { throw Error('backup failed'); };
  await assert.rejects(g.convertBase(g.plugin, g.file), /backup failed/);
  assert.equal(g.current(), g.original);
});
