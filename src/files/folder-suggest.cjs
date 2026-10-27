'use strict';
const { AbstractInputSuggest } = require('obsidian');

class FolderSuggest extends AbstractInputSuggest {
  constructor(app, input, onChoose, translate) {
    super(app, input.inputEl);
    this.textComponent = input; this.onChoose = onChoose; this.translate = translate;
    this.limit = 30;
  }
  getSuggestions(query) {
    const search = query.trim().replace(/^\/+|\/+$/g, '').toLocaleLowerCase();
    return this.app.vault.getAllFolders(true)
      .filter(folder => !search || (folder.path !== '/' && folder.path.toLocaleLowerCase().includes(search)))
      .sort((a, b) => {
        const prefixA = a.path.toLocaleLowerCase().startsWith(search);
        const prefixB = b.path.toLocaleLowerCase().startsWith(search);
        return Number(prefixB) - Number(prefixA) || a.path.localeCompare(b.path);
      });
  }
  renderSuggestion(folder, element) {
    element.textContent = folder.path === '/' ? this.translate('全部文档') : folder.path;
  }
  selectSuggestion(folder) {
    const path = folder.path === '/' ? '' : folder.path;
    this.textComponent.setValue(path);
    this.onChoose(path);
    this.close();
  }
}
module.exports = { FolderSuggest };
