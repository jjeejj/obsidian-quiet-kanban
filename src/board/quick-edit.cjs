'use strict';
const { destinationPath } = require('./card-actions.cjs');
const { resolvedFields, typedValues, valueKind } = require('./values.cjs');

function editFields(options) {
  const fields = Array.isArray(options.fields) ? options.fields.map(field => ({ ...field, key: field.property })) : [
    { key: 'date', property: options.dateProperty, label: '开始时间', kind: 'date' },
    { key: 'projects', property: options.projectProperty, label: '项目（每行一个）', kind: 'list' }
  ];
  return [{ key: 'title', property: options.titleProperty, label: '标题', kind: 'text' }, ...fields].filter(field => field.property);
}

async function saveCardEdits(app, file, options, initial, draft, t) {
  const patches = [];
  let rename;
  for (const field of editFields(options)) {
    const key = field.key; const property = field.property;
    if (draft[key] === initial[key]) continue;
    if (key === 'title' && property === 'file.name') {
      rename = destinationPath(app, file, 'rename', draft.title, t); continue;
    }
    if (!property?.startsWith('note.')) continue;
    const kind = field.kind || valueKind(initial[key], field.display);
    let value = typeof draft[key] === 'string' ? draft[key].trim() : draft[key];
    if (key === 'title' && !value) throw Error(t('标题不能为空'));
    if (kind === 'date' && value) {
      const date = new Date(`${value}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        throw Error(t('请使用 YYYY-MM-DD 格式的有效日期'));
      }
    }
    if (kind === 'list') value = value ? [...new Set(String(value).split(/\r?\n/).map(v => v.trim()).filter(Boolean))] : '';
    if (kind === 'number' && value !== '') {
      value = Number(value);
      if (!Number.isFinite(value)) throw Error(t('请输入有效数字'));
    }
    if (kind === 'boolean' && typeof value !== 'boolean') {
      if (value !== 'true' && value !== 'false') throw Error(t('请输入 true 或 false'));
      value = value === 'true';
    }
    patches.push([property.slice(5), value]);
  }
  // Validate the complete draft before making any writes. Only changed fields
  // are patched; concurrent changes to unrelated metadata and note body survive.
  if (rename && rename !== file.path) await app.fileManager.renameFile(file, rename);
  if (patches.length) await app.fileManager.processFrontMatter(file, frontmatter => {
    for (const [key, value] of patches) {
      if (value === '') delete frontmatter[key];
      else frontmatter[key] = value;
    }
  });
}

function mountQuickEditor(view, card, entry, readValues) {
  const options = view.options();
  const t = text => view.plugin.t(text);
  if (Array.isArray(options.fields)) options.fields = resolvedFields(entry, options, view.config);
  const fields = editFields(options);
  const initial = {};
  for (const field of fields) {
    const value = entry.getValue(field.property);
    const items = typedValues(value);
    initial[field.key] = field.key === 'title' && field.property === 'file.name' ? entry.file.basename :
      field.kind === 'boolean' ? items[0] ?? false : items.map(String).join('\n');
  }
  const draft = { ...initial };
  const doc = card.ownerDocument;
  const form = doc.createElement('form');
  form.className = 'qk-inline-editor';
  form.setAttribute('aria-label', t('快捷编辑'));
  const make = (tag, parent, text) => {
    const node = doc.createElement(tag);
    if (text) node.textContent = text;
    parent.appendChild(node); return node;
  };
  const controls = [];
  for (const field of fields) {
    const { key, property } = field;
    const wrapper = make('label', form);
    make('span', wrapper, t(field.label || property));
    const input = make(field.kind === 'list' || key === 'title' ? 'textarea' : 'input', wrapper);
    if (field.kind === 'boolean') { input.type = 'checkbox'; input.checked = initial[key]; }
    else {
      if (field.kind === 'date' && (!initial[key] || /^\d{4}-\d{2}-\d{2}$/.test(initial[key]))) input.type = 'date';
      if (field.kind === 'number') { input.type = 'number'; input.step = 'any'; }
      input.value = initial[key];
    }
    input.rows = key === 'title' ? 2 : 3;
    input.readOnly = !(property.startsWith('note.') || (key === 'title' && property === 'file.name'));
    if (field.kind === 'boolean' && input.readOnly) input.disabled = true;
    if (input.readOnly) input.title = t('此字段由文件属性或公式计算，无法直接编辑');
    if (field.kind === 'date') input.placeholder = 'YYYY-MM-DD';
    input.addEventListener('input', () => { draft[key] = field.kind === 'boolean' ? input.checked : input.value; });
    controls.push(input);
  }
  const error = make('div', form);
  error.className = 'qk-edit-error'; error.setAttribute('role', 'alert');
  const actions = make('div', form); actions.className = 'qk-edit-buttons';
  const cancel = make('button', actions, t('取消')); cancel.type = 'button';
  const save = make('button', actions, t('保存')); save.type = 'submit'; save.className = 'mod-cta';
  let saving = false;
  const finish = () => {
    view.editing = null;
    view.render();
    const previous = [...view.root.querySelectorAll('.qk-card')].find(node => node.dataset.path === entry.file.path);
    previous?.focus();
  };
  cancel.addEventListener('click', () => { if (!saving) finish(); });
  form.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); if (!saving) finish(); }
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); form.requestSubmit(); }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault(); event.stopPropagation();
    if (saving) return;
    saving = true; save.disabled = true; cancel.disabled = true;
    controls.forEach(input => { input.disabled = true; });
    try { await saveCardEdits(view.app, entry.file, options, initial, draft, t); finish(); }
    catch (problem) {
      error.textContent = problem.message || String(problem);
      saving = false; save.disabled = false; cancel.disabled = false;
      controls.forEach(input => { input.disabled = input.readOnly && input.type === 'checkbox'; });
    }
  });
  view.editing = { path: entry.file.path };
  card.draggable = false;
  card.setAttribute('role', 'group'); card.setAttribute('aria-label', t('快捷编辑'));
  card.replaceChildren(form);
  controls.find(input => !input.readOnly)?.focus();
}
module.exports = { saveCardEdits, mountQuickEditor };
