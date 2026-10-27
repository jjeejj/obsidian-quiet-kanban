'use strict';
const { Menu, Modal, Setting, Notice } = require('obsidian');

function destinationPath(app, file, mode, value, t) {
  let target;
  if (mode === 'rename') {
    const name = value.trim().replace(new RegExp(`\\.${file.extension}$`, 'i'), '');
    if (!name || /[\\/:*?"<>|]/.test(name) || name === '.' || name === '..') {
      throw Error(t('请填写不含路径分隔符的文件名'));
    }
    const folder = file.parent?.path === '/' ? '' : file.parent?.path || '';
    target = `${folder ? folder + '/' : ''}${name}.${file.extension}`;
  } else {
    const folder = value.trim().replace(/^\/+|\/+$/g, '');
    if (folder.split('/').some(part => part === '.' || part === '..') || folder.includes('\\')) {
      throw Error(t('请选择仓库中已有的文件夹'));
    }
    if (folder && !app.vault.getFolderByPath(folder)) throw Error(t('请选择仓库中已有的文件夹'));
    target = `${folder ? folder + '/' : ''}${file.name}`;
  }
  if (target !== file.path && app.vault.getAbstractFileByPath(target)) throw Error(t('目标位置已存在同名文件'));
  return target;
}

class FileActionModal extends Modal {
  constructor(plugin, file, mode) {
    super(plugin.app);
    this.plugin = plugin; this.file = file; this.mode = mode;
  }
  onOpen() {
    const t = text => this.plugin.t(text);
    const rename = this.mode === 'rename';
    let value = rename ? this.file.basename : (this.file.parent?.path === '/' ? '' : this.file.parent?.path || '');
    this.contentEl.createEl('h2', { text: t(rename ? '重命名需求' : '移动需求') });
    new Setting(this.contentEl).setName(t(rename ? '文件名' : '目标文件夹'))
      .setDesc(rename ? this.file.path : t('填写仓库中的文件夹路径；留空移到仓库根目录。'))
      .addText(input => input.setValue(value).onChange(next => { value = next; }));
    new Setting(this.contentEl)
      .addButton(button => button.setButtonText(t('取消')).onClick(() => this.close()))
      .addButton(button => button.setButtonText(t(rename ? '重命名' : '移动')).setCta().onClick(async () => {
        button.setDisabled(true);
        try {
          const target = destinationPath(this.app, this.file, this.mode, value, t);
          if (target !== this.file.path) await this.app.fileManager.renameFile(this.file, target);
          this.close();
        } catch (error) { new Notice(error.message); button.setDisabled(false); }
      }));
  }
  onClose() { this.contentEl.empty(); }
}

class DeleteCardModal extends Modal {
  constructor(plugin, file) { super(plugin.app); this.plugin = plugin; this.file = file; }
  onOpen() {
    const t = text => this.plugin.t(text);
    this.modalEl.classList.add('qk-confirm-delete');
    this.modalEl.setAttribute('aria-label', t('删除需求'));
    this.contentEl.createEl('p', { cls: 'qk-delete-question', text: this.plugin.t('确定删除「{title}」？', { title: this.file.basename }) });
    new Setting(this.contentEl)
      .addButton(button => button.setButtonText(t('取消')).onClick(() => this.close()))
      .addButton(button => button.setButtonText(t('删除')).setWarning().onClick(async () => {
        button.setDisabled(true);
        try { await this.app.fileManager.trashFile(this.file); this.close(); }
        catch (error) { new Notice(error.message); button.setDisabled(false); }
      }));
  }
  onClose() { this.contentEl.empty(); }
}

function showCardMenu(plugin, file, event, anchor) {
  const menu = new Menu();
  for (const [title, icon, action] of [
    ['重命名', 'pencil', () => new FileActionModal(plugin, file, 'rename').open()],
    ['移动到文件夹', 'folder-input', () => new FileActionModal(plugin, file, 'move').open()],
    ['删除', 'trash-2', () => new DeleteCardModal(plugin, file).open()]
  ]) menu.addItem(item => item.setTitle(plugin.t(title)).setIcon(icon).onClick(action));
  if (event.detail === 0) {
    const rect = anchor.getBoundingClientRect();
    menu.showAtPosition({ x: rect.left, y: rect.bottom });
  } else menu.showAtMouseEvent(event);
}
module.exports = { destinationPath, showCardMenu, DeleteCardModal };
