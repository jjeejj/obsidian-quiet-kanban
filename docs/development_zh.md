[English](development.md) | **简体中文**

# 构建、自动安装与测试

本篇面向从源码开发或本地更新插件的用户。普通手动安装见[安装](installation_zh.md)。

## 本地构建

要求 Node.js 20+。在项目目录执行：

```sh
# 单元测试与使用模拟 Obsidian API 的集成测试
npm test

# 从源码生成根目录 main.js
npm run build

# 检查构建脚本、构建并检查产物语法，再运行全部测试
npm run check
```

构建会自动收集 `src/main.cjs` 的本地模块依赖。发布或安装时只需要 `main.js`、`manifest.json`、`styles.css`。

## 自动安装前准备

- 在 Obsidian 中打开目标仓库。
- 启用 Obsidian CLI，确认 `obsidian help` 可以运行。
- 目标仓库已有配置目录，且允许运行社区插件；启用 Bases。
- 安装脚本会重载插件，先结束配置弹窗和未提交的快捷编辑草稿。

## 预览安装计划

```sh
npm run dev:install -- --vault "/absolute/path/to/vault" --dry-run
```

此模式不构建、不写文件、不调用 Obsidian。路径仍需指向真实存在的仓库及配置目录。

## 安装并检查加载

```sh
npm run dev:install -- --vault "/absolute/path/to/vault"
```

脚本依次完成：

1. 执行 `npm run check`。
2. 验证 CLI 指向同一仓库和配置目录。
3. 备份安装前的发布文件。
4. 复制三个发布文件，保留 `data.json` 和原有插件备份。
5. 重载已经加载的插件，或启用未加载的插件。
6. 检查插件版本以及创建、转换、收起命令是否注册。
7. 刷新已打开的看板，保留视图状态和活动标签页。

退出码为 0 表示检查通过。终端会输出安装位置和备份路径。

## 可选参数

| 参数 | 用途 |
| --- | --- |
| `--vault <路径>` | 必填，目标仓库路径 |
| `--vault-name <名称>` | 指定 CLI 仓库选择器，默认使用目录名 |
| `--config-dir <相对路径>` | 自定义仓库配置目录，默认 `.obsidian` |
| `--cli <可执行文件>` | 指定 Obsidian CLI 路径 |
| `--copy-only` | 检查、备份和复制，不调用 CLI |
| `--dry-run` | 只显示计划 |
| `--help` | 查看完整说明 |

例如：

```sh
npm run dev:install -- --vault "/absolute/path/to/vault" --copy-only
npm run dev:install -- --vault "/absolute/path/to/vault" --config-dir ".obsidian-dev"
npm run dev:install -- --help
```

## 实际界面测试

自动检查覆盖逻辑和加载状态，不等于完成真实鼠标或视觉测试。可在独立文件夹准备测试文档和 `.base` 文件，依次验证：

1. 场景预设及字段增删排序。
2. 自定义字段来源和 Bases 属性来源。
3. 模板新增、当前列值和其他默认属性。
4. 列间拖动保留其他属性及数据类型。
5. 快捷编辑保存、取消、校验失败及只读字段。
6. 右侧详情复用、再次点击收起、手动导航保护。
7. 重载后重新点击卡片仍正常。

若本机 CLI 支持开发命令，可辅助检查：

```sh
obsidian vault="VaultName" dev:dom selector=".qk-board"
obsidian vault="VaultName" dev:errors
obsidian vault="VaultName" dev:screenshot path="/tmp/quiet-kanban-test.png"
```

开发命令用于辅助定位，完整界面回归仍需逐项操作验证。测试后等待写入完成，关闭测试标签页，再把测试目录移入回收站。

[返回文档目录](README_zh.md)
