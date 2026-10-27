[English](publishing.md) | **简体中文**

# 发布到官方社区插件目录

本文面向 Quiet Kanban 的维护者。插件通过目录审核并发布后，普通用户就可以在 Obsidian 的社区插件页面安装。

## 准备仓库

1. 创建公开的 GitHub 仓库，包含插件源码。
2. 仓库根目录保留 `README.md`、`LICENSE` 和 `manifest.json`。
3. 在 `manifest.json` 中填写公开展示的作者名称，首次发布前替换开发占位名称 `Local`。
4. 在社区目录检查 `quiet-kanban` 是否可用。提交时插件 ID 必须唯一。
5. 阅读官方[开发者政策](https://docs.obsidian.md/community-directory/developer-policies)和[插件提交要求](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins)。

本次桌面版本保留 `isDesktopOnly: true`。`minAppVersion` 应填写实际支持并验证过的最低 Obsidian 版本，包括插件使用的 Bases API。

## 构建与验证

使用 Node.js 20+，在项目目录执行：

```sh
npm run check
```

按[开发与测试](development_zh.md)完成界面验证。在测试仓库中检查创建看板、分组、拖拽、模板、快速编辑、详情交互和中英文界面。

每次发布前同步更新：

| 文件 | 内容 |
| --- | --- |
| `manifest.json` | 插件版本和最低支持的 Obsidian 版本 |
| `package.json` | 相同的插件版本 |
| `versions.json` | 新增“插件版本 → 最低支持的 Obsidian 版本”的映射 |

版本号使用 `x.y.z`。例如版本为 `0.1.0` 时，Git 标签必须是 **`0.1.0`**，不加 `v` 前缀。

## 创建 GitHub Release

将确认好的源码和元数据发布到仓库默认分支。社区目录会读取该分支的清单文件。

在 GitHub 打开 **Releases → Draft a new release**，选择准备发布的源码版本，创建与 `manifest.json` 完全一致的标签。将验证后的三个文件分别上传为附件：

- `main.js`
- `manifest.json`
- `styles.css`

填写版本说明并发布正式 Release。草稿或只有源码压缩包的 Release 无法提供可安装的插件。Obsidian 会从与清单版本对应的 Release 下载这些独立附件。

## 首次提交

1. 使用 Obsidian 账号登录[官方社区网站](https://community.obsidian.md)。
2. 在个人资料中关联拥有或管理该仓库的 GitHub 账号。
3. 通过目录中的提交入口添加插件，选择对应仓库。
4. 检查导入的清单和插件介绍。
5. 按自动审核提示处理错误；修改后递增版本号，再发布新的 GitHub Release。
6. 在目录中完成发布。审核错误处理完毕并发布后，插件才会在 Obsidian 内提供安装。

上架后，用户打开 **设置 → 第三方插件 → 浏览**，搜索 **Quiet Kanban**，安装并启用即可。目录条目可用后，再更新[安装文档](installation_zh.md)。

## 后续更新

同步版本信息、运行检查，再发布包含三个附件和匹配标签的新 GitHub Release。后续版本无需重新进行首次目录提交，用户可在 Obsidian 中检查更新。

最新流程以官方[插件提交指南](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin)为准。

[返回文档目录](README_zh.md)
