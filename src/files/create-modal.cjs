'use strict';
const { Modal, Setting, Notice, stringifyYaml } = require('obsidian');
const { TYPE } = require('../board/options.cjs');
const { makePreset, presetLabels, viewLayout } = require('../board/fields.cjs');
const { FolderSuggest } = require('./folder-suggest.cjs');
class CreateBoardModal extends Modal {
  constructor(plugin, { targetFolder = '' } = {}) {
    super(plugin.app); this.plugin = plugin;
    this.targetFolder = targetFolder === '/' ? '' : targetFolder;
  }
  onOpen() {
    let name = this.plugin.t('增强看板'); let folder = this.targetFolder; let preset = 'global';
    this.contentEl.createEl('h2', { text: this.plugin.t('创建增强看板') });
    new Setting(this.contentEl).setName(this.plugin.t('场景预设')).addDropdown(d => d.addOptions({ global: this.plugin.t('使用全局默认'), ...presetLabels(text => this.plugin.t(text)) }).setValue(preset).onChange(value => { preset = value; }));
    new Setting(this.contentEl).setName(this.plugin.t('看板文件名')).addText(input => input.setValue(name).onChange(v => name = v));
    new Setting(this.contentEl).setName(this.plugin.t('文档所在文件夹'))
      .setDesc(this.plugin.t('输入或选择文件夹路径；留空显示全部文档。'))
      .addText(input => {
        input.setValue(folder).onChange(value => { folder = value.trim(); });
        this.folderSuggest = new FolderSuggest(this.app, input, value => { folder = value; }, text => this.plugin.t(text));
      });
    new Setting(this.contentEl).addButton(button => button.setButtonText(this.plugin.t('创建')).setCta().onClick(async () => {
      try {
        const safeName = name.trim().replace(/\.base$/i, '');
        if (!safeName || /[\\/:]/.test(safeName)) throw Error(this.plugin.t('请填写不含路径分隔符的文件名'));
        if (this.targetFolder && !this.app.vault.getFolderByPath(this.targetFolder)) throw Error(this.plugin.t('目标文件夹不存在'));
        const filters = ['file.ext == "md"'];
        if (folder) {
          if (!this.app.vault.getFolderByPath(folder)) throw Error(this.plugin.t('需求文件夹不存在'));
          filters.push(`file.inFolder(${JSON.stringify(folder)})`);
        }
        const prefix = this.targetFolder ? `${this.targetFolder}/` : '';
        let path = `${prefix}${safeName}.base`; let i = 1;
        while (this.app.vault.getAbstractFileByPath(path)) path = `${prefix}${safeName} ${i++}.base`;
        const file = await this.app.vault.create(path, stringifyYaml({ views: [{ type: TYPE, name: this.plugin.t('增强看板'), filters: { and: filters }, ...viewLayout(preset === 'global' ? this.plugin.settings : makePreset(preset, text => this.plugin.t(text))) }] }));
        await this.app.workspace.getLeaf('tab').openFile(file);
        this.close();
      } catch (error) { new Notice(error.message); }
    }));
  }
  onClose() { this.folderSuggest?.close(); this.contentEl.empty(); }
}
module.exports = { CreateBoardModal };
