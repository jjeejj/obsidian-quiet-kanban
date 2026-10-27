'use strict';
const { PluginSettingTab, Setting } = require('obsidian');
const { FieldConfigModal } = require('../board/field-config.cjs');
const { renderColorSettings } = require('./colors.cjs');
const i18n = require('../i18n/index.cjs');
const { CreateBoardModal } = require('../files/create-modal.cjs');
const { TemplatePicker } = require('../files/item-template.cjs');
class BoardSettings extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    this.containerEl.empty();
    this.containerEl.classList.add('qk-settings');
    this.containerEl.createEl('h2', { text: 'Quiet Kanban' });
    new Setting(this.containerEl).setName(this.plugin.t('语言')).setDesc(this.plugin.t('默认跟随 Obsidian；其他语言使用英文。'))
      .addDropdown(d => d.addOptions({ auto: this.plugin.t('跟随 Obsidian'), zh: '中文', en: 'English' })
        .setValue(this.plugin.settings.language).onChange(async language => {
          this.plugin.settings.language = i18n.normalizeLanguage(language);
          await this.plugin.save();
          this.plugin.refreshLanguage();
          this.display();
        }));
    this.containerEl.createEl('p', { cls: 'qk-settings-intro', text: this.plugin.t('以下是新看板的默认设置；每个看板也可以在视图选项中单独覆盖。') });
    new Setting(this.containerEl).setName(this.plugin.t('默认字段配置'))
      .setDesc(this.plugin.t('选择场景预设，或自定义分组、标题和展示字段。单个看板可覆盖。'))
      .addButton(button => button.setButtonText(this.plugin.t('配置字段')).onClick(() => new FieldConfigModal(this.plugin).open()));
    const saveTemplate = async templateFile => {
      this.plugin.settings.templateFile = templateFile;
      await this.plugin.save();
      this.plugin.refresh();
    };
    const templateSetting = new Setting(this.containerEl).setName(this.plugin.t('全局新建需求模板'))
      .setDesc(this.plugin.t('所有未单独设置模板的看板默认使用此模板；清空则不使用全局模板。'))
      .addText(input => input.setValue(this.plugin.settings.templateFile).onChange(value => saveTemplate(value.trim())))
      .addButton(button => button.setButtonText(this.plugin.t('选择模板')).onClick(() => {
        new TemplatePicker(this.app, text => this.plugin.t(text), async file => {
          await saveTemplate(file.path);
          this.display();
        }).open();
      }))
      .addButton(button => button.setButtonText(this.plugin.t('清除关联')).onClick(async () => {
        await saveTemplate('');
        this.display();
      }));
    templateSetting.settingEl.classList.add('qk-template-setting');
    new Setting(this.containerEl).setName(this.plugin.t('隐藏空状态列')).addToggle(t => t.setValue(this.plugin.settings.hideEmpty).onChange(async hideEmpty => {
      this.plugin.settings.hideEmpty = hideEmpty; await this.plugin.save(); this.plugin.refresh();
    }));
    new Setting(this.containerEl).setName(this.plugin.t('详情打开方式')).addDropdown(d => d.addOptions({ split: this.plugin.t('右侧分栏（复用）'), tab: this.plugin.t('新标签页（复用）') }).setValue(this.plugin.settings.openMode).onChange(async openMode => {
      this.plugin.settings.openMode = openMode; await this.plugin.save(); this.plugin.refresh();
    }));
    new Setting(this.containerEl).setName(this.plugin.t('再次点击同一需求时收起详情')).addToggle(t => t.setValue(this.plugin.settings.togglePreview).onChange(async value => {
      this.plugin.settings.togglePreview = value; await this.plugin.save();
    }));
    new Setting(this.containerEl).setName(this.plugin.t('默认列宽')).addSlider(s => s.setLimits(220, 520, 10).setValue(this.plugin.settings.columnWidth).setDynamicTooltip().onChange(async columnWidth => {
      this.plugin.settings.columnWidth = columnWidth; await this.plugin.save(); this.plugin.refresh();
    }));
    new Setting(this.containerEl).setName(this.plugin.t('卡片背景浓度')).addSlider(s => s.setLimits(0, 35, 1).setValue(this.plugin.settings.cardTint).setDynamicTooltip().onChange(async cardTint => {
      this.plugin.settings.cardTint = cardTint; await this.plugin.save(); this.plugin.refresh();
    }));
    renderColorSettings(this.containerEl, this.plugin);
    new Setting(this.containerEl).setName(this.plugin.t('创建看板')).addButton(b => b.setButtonText(this.plugin.t('创建增强看板')).onClick(() => new CreateBoardModal(this.plugin).open()));
  }
}
module.exports = { BoardSettings };
