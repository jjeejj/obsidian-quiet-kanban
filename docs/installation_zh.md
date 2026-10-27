[English](installation.md) | **简体中文**

# 安装插件

本篇说明如何手动安装并启用 Quiet Kanban。自动安装脚本见[开发与测试](development_zh.md)。

## 环境要求

- Obsidian 桌面端；当前插件仅声明支持桌面使用。
- 最低版本以 `manifest.json` 为准，当前为 `1.10.2`。
- 启用 Obsidian 核心插件“数据库 / Bases”。

## 准备安装文件

需要同一版本的三个文件：

```text
main.js
manifest.json
styles.css
```

如果从源码获取项目，使用 Node.js 20+ 在项目目录执行：

```sh
npm run check
```

检查通过后，根目录的 `main.js` 就是构建产物。无需安装第三方 npm 依赖。

## 放入仓库

在目标仓库中创建以下目录，并放入三个文件：

```text
<仓库>/.obsidian/plugins/quiet-kanban/
  main.js
  manifest.json
  styles.css
```

如果仓库使用自定义配置目录，请把 `.obsidian` 替换成实际目录。三个文件应直接位于 `quiet-kanban` 下，不要再嵌套一层同名文件夹。

## 启用

1. 打开目标仓库。
2. 在“设置 → 核心插件”中启用 Bases。
3. 在“设置 → 第三方插件”中允许社区插件运行，并启用 Quiet Kanban。
4. 打开命令面板，确认能找到“Quiet Kanban: 创建增强看板”。

## 安装后会改变什么

安装本身不会转换已有 `.base` 文件，也不会修改笔记属性。新建看板和转换已有看板是独立操作。

下一步：[新建看板](create-board_zh.md) · [转换已有看板](convert-board_zh.md)

[返回文档目录](README_zh.md)
