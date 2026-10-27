'use strict';
const { Modal, Setting, FuzzySuggestModal, Notice } = require('obsidian');
const { FIELD_STYLES, layoutFrom, viewLayout, makePreset, presetLabels } = require('./fields.cjs');

class PropertyPicker extends FuzzySuggestModal {
  constructor(app, properties, choose, t) {
    super(app); this.properties = properties; this.choose = choose;
    this.setPlaceholder(t('选择属性'));
  }
  getItems() { return this.properties; }
  getItemText(property) { return property; }
  onChooseItem(property) { this.choose(property); }
}
function availableProperties(app, view) {
  const properties = new Set(['file.name', 'file.ctime', 'file.mtime', 'file.folder', ...(view?.allProperties || [])]);
  if (!view) for (const file of app.vault.getMarkdownFiles()) {
    for (const key of Object.keys(app.metadataCache.getFileCache(file)?.frontmatter || {})) {
      if (key !== 'position') properties.add(`note.${key}`);
    }
  }
  return [...properties].sort();
}
class FieldConfigModal extends Modal {
  constructor(plugin, view = null) {
    super(plugin.app); this.plugin = plugin; this.board = view;
    this.draft = structuredClone(layoutFrom(view ? view.options() : plugin.settings));
  }
  onOpen() { this.modalEl.classList.add('qk-field-config'); this.draw(); }
  draw() {
    this.contentEl.empty();
    const t = text => this.plugin.t(text);
    this.contentEl.createEl('h2', { text: t(this.board ? '看板字段配置' : '默认字段配置') });
    new Setting(this.contentEl).setName(t('场景预设')).setDesc(t('应用预设只更改字段配置，不修改文档内容。'))
      .addDropdown(d => d.addOptions({ custom: t('自定义'), ...presetLabels(t) }).setValue(this.preset || 'custom').onChange(id => {
        if (id !== 'custom') { this.preset = id; this.draft = makePreset(id, t); this.draw(); }
      }));
    const pick = callback => new PropertyPicker(this.app, availableProperties(this.app, this.board), callback, t).open();
    for (const [key, label] of [['groupProperty', '分组字段'], ['titleProperty', '标题字段']]) {
      new Setting(this.contentEl).setName(t(label)).setDesc(key === 'groupProperty' ? t('留空时所有文档显示在同一列；公式和文件属性只能查看。') : '')
        .addText(input => input.setValue(this.draft[key]).onChange(value => { if (key === 'groupProperty' && value.trim() !== this.draft[key]) this.draft.groupOrder = []; this.draft[key] = value.trim(); if (key === 'groupProperty') this.draft.groupOrderProperty = this.draft[key]; }))
        .addButton(b => b.setButtonText(t('选择属性')).onClick(() => pick(property => { if (key === 'groupProperty' && property !== this.draft[key]) this.draft.groupOrder = []; this.draft[key] = property; if (key === 'groupProperty') this.draft.groupOrderProperty = property; this.draw(); })));
    }
    new Setting(this.contentEl).setName(t('展示字段来源')).addDropdown(d => d.addOptions({ custom: t('自定义字段列表'), bases: t('跟随 Bases 属性菜单') })
      .setValue(this.draft.fieldsSource).onChange(source => { this.draft.fieldsSource = source; this.draw(); }));
    if (this.draft.fieldsSource === 'custom') {
      const styles = Object.fromEntries(FIELD_STYLES.map((value, i) => [value, t(['自动', '文本', '标签样式', '日期', '数字', '复选框'][i])]));
      this.draft.fields.forEach((field, index) => {
        const row = this.contentEl.createDiv({ cls: 'qk-field-config-row' });
        new Setting(row).setName(`${index + 1}. ${t('展示字段')}`)
          .addText(input => input.setPlaceholder(t('属性名或 note.property')).setValue(field.property).onChange(value => { field.property = value.trim(); }))
          .addButton(b => b.setButtonText(t('选择属性')).onClick(() => pick(property => { field.property = property; this.draw(); })))
          .addButton(b => b.setButtonText('↑').setTooltip(t('上移')).setDisabled(index === 0).onClick(() => { [this.draft.fields[index - 1], this.draft.fields[index]] = [field, this.draft.fields[index - 1]]; this.draw(); }))
          .addButton(b => b.setButtonText('↓').setTooltip(t('下移')).setDisabled(index === this.draft.fields.length - 1).onClick(() => { [this.draft.fields[index], this.draft.fields[index + 1]] = [this.draft.fields[index + 1], field]; this.draw(); }))
          .addButton(b => b.setButtonText(t('移除')).onClick(() => { this.draft.fields.splice(index, 1); this.draw(); }));
        new Setting(row).setName(t('显示名称')).addText(input => input.setValue(field.label).onChange(value => { field.label = value; }))
          .addDropdown(d => d.addOptions(styles).setValue(field.display).onChange(value => { field.display = value; }));
        new Setting(row).setName(t('显示字段名')).addToggle(toggle => toggle.setValue(field.showLabel).onChange(value => { field.showLabel = value; }))
          .setDesc(t('空值可隐藏，或显示占位文案。'))
          .addDropdown(d => d.addOptions({ hide: t('隐藏空值'), show: t('显示占位') }).setValue(field.hideEmpty ? 'hide' : 'show').onChange(value => { field.hideEmpty = value === 'hide'; }))
          .addText(input => input.setPlaceholder(t('占位文案')).setValue(field.emptyText).onChange(value => { field.emptyText = value; }));
      });
      new Setting(this.contentEl).addButton(b => b.setButtonText(t('添加字段')).onClick(() => {
        this.draft.fields.push({ property: '', label: '', display: 'auto', hideEmpty: true, emptyText: '', showLabel: true });
        this.draw();
      }));
    }
    const footer = this.contentEl.createDiv({ cls: 'qk-field-config-footer' });
    new Setting(footer)
      .addButton(b => b.setButtonText(t('取消')).onClick(() => this.close()))
      .addButton(b => b.setButtonText(t('保存')).setCta().onClick(async () => {
        try {
          const layout = layoutFrom(this.draft);
          if (this.board) for (const [key, value] of Object.entries(viewLayout(layout))) this.board.config.set(key, value);
          else { this.plugin.settings = { ...this.plugin.settings, ...layout }; await this.plugin.save(); }
          this.plugin.refresh(); this.close();
        } catch (error) { new Notice(error.message || String(error)); }
      }));
  }
  onClose() { this.contentEl.empty(); }
}
module.exports = { FieldConfigModal, availableProperties };
