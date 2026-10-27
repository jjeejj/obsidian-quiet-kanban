'use strict';
const { BasesView, Notice, setIcon } = require('obsidian');
const model = require('./model.cjs');
const { showCardMenu } = require('./card-actions.cjs');
const { mountQuickEditor } = require('./quick-edit.cjs');
const { normalizeSettings } = require('../settings/defaults.cjs');
const { TYPE } = require('./options.cjs');
const { showNewItemMenu } = require('../files/item-template.cjs');
const fields = require('./fields.cjs');
const { typedValues, values, resolvedFields, renderField } = require('./values.cjs');
const { FieldConfigModal } = require('./field-config.cjs');
function el(parent, tag, cls, text) {
  const node = parent.ownerDocument.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  parent.appendChild(node);
  return node;
}
class BoardView extends BasesView {
  constructor(controller, container, plugin) {
    super(controller);
    this.type = TYPE;
    this.plugin = plugin;
    this.host = container;
    container.classList.add('qk-host');
    this.root = el(container, 'div', 'qk-board');
    this.root.setAttribute('aria-label', this.plugin.t('增强看板'));
    this.instanceId = Math.random().toString(36).slice(2);
    this.plugin.views.add(this);
    this.register(() => { this.plugin.views.delete(this); this.root.remove(); this.host.classList.remove('qk-host'); });
    // Activating an inactive Bases leaf can refresh its query on mousedown.
    // Keep the pressed card in the DOM until the subsequent click is delivered.
    this.registerDomEvent(this.root, 'pointerdown', event => {
      if (event.button === 0 && event.target.closest('.qk-card')) this.cardPointerDown = true;
    }, true);
    const releaseCard = () => {
      this.cardPointerDown = false;
      if (this.renderPending) { this.renderPending = false; this.render(); }
    };
    this.registerDomEvent(container.ownerDocument, 'pointerup', () => {
      if (!this.cardPointerDown) return;
      clearTimeout(this.cardReleaseTimer);
      this.cardReleaseTimer = setTimeout(releaseCard, 0);
    }, true);
    this.registerDomEvent(container.ownerDocument, 'pointercancel', releaseCard, true);
    this.registerDomEvent(container.ownerDocument.defaultView, 'blur', releaseCard);
    this.register(() => clearTimeout(this.cardReleaseTimer));
    // One delegated handler per view. Renders do not accumulate event listeners.
    this.registerDomEvent(this.root, 'click', event => this.onClick(event));
    this.registerDomEvent(this.root, 'keydown', event => {
      if (event.target.closest('button, input, textarea, select')) return;
      if (event.key === 'Enter' || event.key === ' ') {
        if (event.target.closest('.qk-card')) { event.preventDefault(); this.onClick(event); }
      }
    });
    this.registerDomEvent(this.root, 'dragstart', event => this.onDragStart(event));
    this.registerDomEvent(this.root, 'dragend', () => {
      this.plugin.drag = null;
      this.root.querySelectorAll('.qk-drop-target').forEach(n => n.classList.remove('qk-drop-target'));
    });
    this.registerDomEvent(this.root, 'dragover', event => {
      const column = event.target.closest('.qk-column');
      if (!column || this.plugin.drag?.view !== this) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      this.root.querySelectorAll('.qk-drop-target').forEach(n => n.classList.remove('qk-drop-target'));
      column.classList.add('qk-drop-target');
    });
    this.registerDomEvent(this.root, 'dragleave', event => {
      const column = event.target.closest('.qk-column');
      if (column && !column.contains(event.relatedTarget)) column.classList.remove('qk-drop-target');
    });
    this.registerDomEvent(this.root, 'drop', event => this.onDrop(event).catch(error => this.fail(error)));
  }
  options() {
    return fields.resolveViewSettings(this.plugin.settings, this.config, normalizeSettings);
  }

  ownerLeaf() {
    let owner = null;
    this.app.workspace.iterateAllLeaves(leaf => {
      if (leaf.view.containerEl?.contains(this.root)) owner = leaf;
    });
    return owner;
  }
  onDataUpdated() { this.render(); }
  render() {
    if (this.cardPointerDown) { this.renderPending = true; return; }
    if (this.editing) return;
    this.root.setAttribute('aria-label', this.plugin.t('增强看板'));
    if (!this.data) return;
    const options = this.options();
    const scrollLeft = this.root.scrollLeft;
    const scrollTops = new Map([...this.root.querySelectorAll('.qk-column-body')].map(n => [n.dataset.status, n.scrollTop]));
    this.root.replaceChildren();
    this.root.style.setProperty('--qk-column-width', `${options.columnWidth}px`);
    this.root.style.setProperty('--qk-card-tint', `${options.cardTint}%`);
    this.entries = new Map();
    const rows = this.data.data.map(entry => {
      this.entries.set(entry.file.path, entry);
      return { id: entry.file.path, entry, statuses: options.groupProperty ? typedValues(entry.getValue(options.groupProperty)).map(fields.groupKey) : [] };
    });
    let groups = model.buildGroups(rows, options.groupOrder.map(fields.groupKey), options.hideEmpty);
    if (!groups.length && !rows.length) groups = [{ key: fields.groupKey(options.groupOrder[0] ?? null), rows: [] }];
    this.groups = groups;
    if (!groups.length) {
      el(this.root, 'div', 'qk-empty', this.plugin.t('没有匹配的文档'));
      const configure = el(this.root, 'button', 'qk-configure', this.plugin.t('配置字段'));
      configure.type = 'button';
      configure.dataset.action = 'configure';
      return;
    }
    for (const group of groups) {
      const column = el(this.root, 'section', 'qk-column');
      column.dataset.status = group.key;
      column.style.setProperty('--qk-accent', `var(--color-${model.stableColor(String(fields.groupValue(group.key) ?? ''), options.colors)})`);
      const header = el(column, 'header', 'qk-column-header');
      header.draggable = !!group.key;
      header.title = this.plugin.t('拖动标题可调整列顺序');
      const heading = el(header, 'div', 'qk-status-pill');
      el(heading, 'span', 'qk-status-dot');
      el(heading, 'span', '', group.key ? String(fields.groupValue(group.key)) : this.plugin.t(options.groupProperty ? '未分组' : '全部文档'));
      el(header, 'span', 'qk-count', String(group.rows.length));
      if (group === groups[0]) {
        const configure = el(header, 'button', 'qk-add qk-configure');
        configure.type = 'button'; configure.dataset.action = 'configure';
        configure.setAttribute('aria-label', this.plugin.t('配置字段'));
        configure.title = this.plugin.t('配置字段'); setIcon(configure, 'settings-2');
      }
      const add = el(header, 'button', 'qk-add');
      add.type = 'button'; add.dataset.action = 'add'; add.setAttribute('aria-label', this.plugin.t('新建文档'));
      add.disabled = !!options.groupProperty && !options.groupProperty.startsWith('note.');
      if (add.disabled) add.title = this.plugin.t('只读分组不支持在列中新建或拖动');
      setIcon(add, 'plus');
      const body = el(column, 'div', 'qk-column-body');
      body.dataset.status = group.key;
      for (const row of group.rows) this.renderCard(body, row.entry, options);
      body.scrollTop = scrollTops.get(group.key) || 0;
      if (!group.rows.length) el(body, 'div', 'qk-column-empty', this.plugin.t('暂无文档'));
    }
    this.root.scrollLeft = scrollLeft;
  }
  renderCard(body, entry, options) {
    const card = el(body, 'article', 'qk-card');
    card.dataset.path = entry.file.path;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.draggable = options.groupProperty.startsWith('note.') && entry.file.extension === 'md';
    const title = values(entry.getValue(options.titleProperty)).join(this.plugin.t('、')) || entry.file.basename;
    card.setAttribute('aria-label', this.plugin.t('打开文档：{title}', { title }));
    // Text-only rendering prevents frontmatter or filenames from injecting HTML.
    const top = el(card, 'div', 'qk-card-top');
    el(top, 'div', 'qk-card-title', title);
    const actions = el(top, 'div', 'qk-card-actions');
    for (const [action, icon, label] of [['edit', 'pencil', '编辑需求'], ['more', 'ellipsis', '更多操作']]) {
      const button = el(actions, 'button', 'qk-card-action');
      button.type = 'button'; button.draggable = false; button.dataset.action = action;
      button.setAttribute('aria-label', this.plugin.t(label));
      button.title = this.plugin.t(label);
      setIcon(button, icon);
    }
    for (const field of resolvedFields(entry, options, this.config)) {
      renderField(card, entry, field, text => this.plugin.t(text));
    }
  }

  async onClick(event) {
    if (event.target.closest('.qk-inline-editor')) return;
    try {
      if (event.target.closest('[data-action="configure"]')) {
        new FieldConfigModal(this.plugin, this).open(); return;
      }
      const add = event.target.closest('[data-action="add"]');
      if (add) {
        const status = add.closest('.qk-column').dataset.status;
        showNewItemMenu(this, add, fields.groupValue(status), event);
        return;
      }
      const card = event.target.closest('.qk-card');
      if (!card) return;
      const file = this.entries.get(card.dataset.path)?.file;
      if (!file) return;
      const action = event.target.closest('.qk-card-action');
      if (action) {
        event.preventDefault(); event.stopPropagation();
        if (action.dataset.action === 'edit') {
          if (this.editing) return;
          mountQuickEditor(this, card, this.entries.get(card.dataset.path), values);
          return;
        }
        if (action.dataset.action === 'more') {
          showCardMenu(this.plugin, file, event, action);
          return;
        }
      }
      const board = this.ownerLeaf();
      if (!board) return new Notice(this.plugin.t('请在主窗口的标签页中打开看板后查看详情'));
      const options = this.options();
      const modified = event.metaKey || event.ctrlKey || event.shiftKey;
      await this.plugin.previews.open(board, file, modified ? 'tab' : options.openMode, modified ? false : options.togglePreview);

    } catch (error) { this.fail(error); }
  }
  onDragStart(event) {
    if (event.target.closest('button, input, textarea, .qk-inline-editor')) { event.preventDefault(); return; }
    const card = event.target.closest('.qk-card');
    const header = event.target.closest('.qk-column-header');
    const column = event.target.closest('.qk-column');
    if (!column || (!card && !header)) return;
    if (card && !card.draggable) { event.preventDefault(); return; }
    this.plugin.drag = { view: this, kind: card ? 'card' : 'column', path: card?.dataset.path, from: column.dataset.status };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', card ? card.dataset.path : column.dataset.status);
  }
  async onDrop(event) {
    const column = event.target.closest('.qk-column');
    const drag = this.plugin.drag;
    if (!column || drag?.view !== this) return;
    event.preventDefault();
    this.plugin.drag = null;
    column.classList.remove('qk-drop-target');
    const to = column.dataset.status;
    if (to === drag.from) return;
    if (drag.kind === 'column') {
      // Keep saved empty statuses in the order; append newly discovered statuses.
      const order = this.options().groupOrder.map(fields.groupKey);
      for (const group of this.groups) if (group.key && !order.includes(group.key)) order.push(group.key);
      if (!drag.from || !to) return;
      const fromIndex = order.indexOf(drag.from);
      if (fromIndex < 0) return;
      order.splice(fromIndex, 1);
      order.splice(order.indexOf(to), 0, drag.from);
      this.config.set('groupOrderProperty', this.options().groupProperty);
      this.config.set('columnOrder', order.map(fields.groupValue));
      return;
    }
    const file = this.entries.get(drag.path)?.file;
    const property = this.options().groupProperty;
    if (!file || !property.startsWith('note.') || file.extension !== 'md') return;
    const key = property.slice(5);
    // Atomic frontmatter update preserves unrelated properties and other statuses.
    await this.app.fileManager.processFrontMatter(file, frontmatter => {
      const next = fields.nextGroupValue(frontmatter[key], fields.groupValue(drag.from), fields.groupValue(to));
      if (next == null || (Array.isArray(next) && !next.length)) delete frontmatter[key];
      else frontmatter[key] = next;
    });
  }
  fail(error) { console.error('Quiet Kanban', error); new Notice(this.plugin.t('看板操作失败：{error}', { error: error.message || error })); }
}
module.exports = { BoardView };
