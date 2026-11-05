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
npm ci --ignore-scripts
npm run check
```

按[开发与测试](development_zh.md)完成界面验证。在测试仓库中检查创建看板、分组、拖拽、模板、快速编辑、详情交互和中英文界面。

发布工作流以推送的 tag 为版本号，自动在构建环境中更新：

| 文件 | 内容 |
| --- | --- |
| `manifest.json` | tag 对应的插件版本 |
| `package.json` | 相同的插件版本 |
| `package-lock.json` | 顶层版本和根包版本 |
| `versions.json` | 新增“tag 版本 → manifest.minAppVersion”的映射 |

打 tag 前不再需要手动修改这些版本号。插件的最低 Obsidian 版本要求发生变化时，仍需自行修改 `minAppVersion`。tag 使用 `x.y.z`，不加 `v` 前缀或预发布后缀。

## 创建 GitHub Release

仓库包含 `.github/workflows/release.yml`。提交并推送源码改动和重新构建的 `main.js` 后，创建并推送新版本 tag，例如 `0.1.4`，即可触发自动发布。

tag 指向的提交必须包含新工作流和 `scripts/release-version.cjs`；旧 tag 仍使用旧工作流。

`release` 任务先按 tag 更新四个版本文件，再安装依赖、构建并测试、检查已提交的构建产物与源码一致，为以下三个安装文件生成来源证明并发布 Release：

- `main.js`
- `manifest.json`
- `styles.css`

发布成功后，独立的 `sync-version` 任务读取当前默认分支，仅将四个版本文件作为 `github-actions[bot]` 提交回默认分支。这样默认分支的清单与已发布附件保持一致。Obsidian 社区目录读取默认分支 HEAD 的清单，并从版本号对应的 Release 安装附件，见[官方提交指南](https://docs.obsidian.md/plugins/releasing/submit-plugin)。

同步任务最多尝试三次，每次重新读取默认分支，处理其他发布或维护者提交导致的推送冲突。较旧的 tag 不会降低默认分支的版本。同步时保留其他元数据；如果默认分支的最低 Obsidian 版本要求已与 tag 中不同，任务会停止，避免写入与发布包不一致的信息。

默认分支需要允许工作流 token 推送这些版本提交。任务使用普通推送，不会强制覆盖分支。如果分支保护或其他人的并发提交阻止推送，此时 Release 已经存在：处理分支问题后，选择 **Re-run failed jobs**，只重试 `sync-version`。本地工作目录不会自动变化，继续开发前需拉取机器人提交。

## 首次提交

1. 使用 Obsidian 账号登录[官方社区网站](https://community.obsidian.md)。
2. 在个人资料中关联拥有或管理该仓库的 GitHub 账号。
3. 通过目录中的提交入口添加插件，选择对应仓库。
4. 检查导入的清单和插件介绍。
5. 按自动审核提示处理错误；修改后递增版本号，再发布新的 GitHub Release。
6. 在目录中完成发布。审核错误处理完毕并发布后，插件才会在 Obsidian 内提供安装。

上架后，用户打开 **设置 → 第三方插件 → 浏览**，搜索 **Quiet Kanban**，安装并启用即可。目录条目可用后，再更新[安装文档](installation_zh.md)。

## 后续更新

运行检查，提交并推送源码和构建产物，再创建并推送新的 `x.y.z` tag。Actions 自动更新版本、发布附件并同步默认分支。后续版本无需重新进行首次目录提交，用户可在 Obsidian 中检查更新。

最新流程以官方[插件提交指南](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin)为准。

[返回文档目录](README_zh.md)

## 自动构建与来源证明

工作流通过 `npm ci --ignore-scripts` 按更新后的锁文件安装依赖，Actions 使用固定提交 SHA。版本号来自 tag，构建来源证明对应本次构建生成的安装文件。

手动从 GitHub 页面创建 Release 不会触发此流程，也不会生成来源证明。工作流不会覆盖已有 Release；失败重试前请检查发布状态。手动触发工作流时必须选择版本标签，选择分支会跳过发布。

下载文件后，可以使用 `gh attestation verify 文件路径 --repo jjeejj/obsidian-quiet-kanban` 验证。现有 `0.1.0` 是手动发布，没有来源证明；需要通过此流程发布 `0.1.1`，才能处理这项审核建议。详细流程及验证命令见[英文发布文档](publishing.md)。
