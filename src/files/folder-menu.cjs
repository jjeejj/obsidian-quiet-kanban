'use strict';
const { TFolder } = require('obsidian');
const { CreateBoardModal } = require('./create-modal.cjs');

function addFolderMenuItem(plugin, menu, file) {
  if (!(file instanceof TFolder)) return;
  menu.addItem(item => {
    item.setSection?.('action-primary');
    item.setTitle(plugin.t('创建看板')).setIcon('columns-3')
      .onClick(() => new CreateBoardModal(plugin, { targetFolder: file.path }).open());
  });
}
module.exports = { addFolderMenuItem };
