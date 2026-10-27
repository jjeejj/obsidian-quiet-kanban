'use strict';
const { Setting } = require('obsidian');
const { PALETTE } = require('../board/model.cjs');

function renderColorSettings(container, plugin) {
  const t = text => plugin.t(text);
  new Setting(container).setName(t('分组颜色')).setDesc(t('为分组选择颜色，未配置的分组自动配色。'));
  const section = container.createDiv({ cls: 'qk-color-settings' });
  const colorNames = ['蓝色', '紫色', '青色', '绿色', '橙色', '粉色', '黄色', '红色'];
  const options = Object.fromEntries(PALETTE.map((color, index) => [color, t(colorNames[index])]));
  const save = async colors => {
    plugin.settings.colors = colors;
    await plugin.save();
    plugin.refresh();
  };
  function draw() {
    section.empty();
    const list = section.createDiv({ cls: 'qk-color-list' });
    for (const [name, color] of Object.entries(plugin.settings.colors)) {
      const row = new Setting(list).setName(name);
      row.settingEl.classList.add('qk-color-row');
      row.settingEl.style.setProperty('--qk-group-color', `var(--color-${color})`);
      row.addDropdown(dropdown => dropdown.addOptions(options).setValue(color).onChange(async next => {
        if (!PALETTE.includes(next)) return;
        await save({ ...plugin.settings.colors, [name]: next });
        row.settingEl.style.setProperty('--qk-group-color', `var(--color-${next})`);
      })).addButton(button => button.setButtonText(t('移除')).onClick(async () => {
        await save(Object.fromEntries(Object.entries(plugin.settings.colors).filter(([key]) => key !== name)));
        draw();
      }));
    }
    let name = ''; let color = 'blue'; let addButton;
    const add = new Setting(section).setName(t('添加分组颜色'));
    add.settingEl.classList.add('qk-color-add');
    add.addText(input => input.setPlaceholder(t('分组名称')).onChange(value => {
      name = value.trim(); addButton?.setDisabled(!name);
    })).addDropdown(dropdown => dropdown.addOptions(options).setValue(color).onChange(value => { color = value; }))
      .addButton(button => {
        addButton = button;
        button.setButtonText(t('添加')).setDisabled(true).onClick(async () => {
          if (!name || !PALETTE.includes(color)) return;
          await save({ ...plugin.settings.colors, [name]: color }); draw();
        });
      });
  }
  draw();
}
module.exports = { renderColorSettings };
