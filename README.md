**English** | [简体中文](README_zh.md)

# Quiet Kanban

A configurable Kanban view for Obsidian Bases, with compact cards, group colors, templates, and reusable detail panes.

## Features

- Choose any grouping and title property, and add, remove, or reorder display fields.
- Start with task, project, content, or blank-board presets.
- Show text, tags, dates, numbers, and checkboxes with optional labels and empty-value placeholders.
- Drag column headers to set an order that is saved per board.
- Drag cards between columns to update writable grouping properties.
- Edit card properties inline, including dates through a native date picker.
- Link a global template or a separate template for each board.
- Open documents in a reusable right split or tab; click the same card again to collapse details.
- Rename, move, and delete documents through the card menu.
- Use an English or Chinese interface, following Obsidian by default.

## Requirements

- Obsidian desktop, version `1.10.2` or later.
- The **Bases** core plugin enabled.

## Installation

Copy the following files into your vault:

```text
<vault>/.obsidian/plugins/quiet-kanban/
  main.js
  manifest.json
  styles.css
```

Use your actual configuration directory if it differs from `.obsidian`. Enable **Quiet Kanban** under **Settings → Community plugins**.

For a source checkout, run `npm run check` first to build `main.js`. See [Installation](docs/installation.md) for the full process.

## Quick Start

1. Create a folder for your documents, such as `Tasks`.
2. Right-click the folder and choose **Create board**, or run **Quiet Kanban: Create enhanced Kanban board** from the Command Palette.
3. Enter a name, choose a scene preset, and set the document folder.
4. Use a column's **+** menu to create a document or link a template.
5. Click a card to open details. Click the same card again to collapse them when click-to-collapse is enabled.

Creating from a folder menu places the board in that folder. Creating from the command or plugin settings places it in the vault root. The document-folder setting controls query scope separately.

## Configuration

Open **Settings → Quiet Kanban** for language, default fields, the global template, colors, column width, and detail behavior.

For a single board, click the first column's configuration icon or run **Quiet Kanban: Configure board fields**. Choose **Custom field list** to manage the layout directly, or **Follow Bases property menu** to use native property selection and order.

| Preset | Group by | Display fields |
| --- | --- | --- |
| Blank board | No grouping | Title only |
| Task management | Status | Owner, Due date, Priority |
| Project management | Owner | Status, Due date, Budget |
| Content planning | Platform | Publish date, Tags, Published |

Presets are editable starting points. Match their properties to your documents before saving.

Drag column headers to arrange columns; the order saves automatically and remains when switching documents or reopening the board. Card order within a column follows Bases sorting.

Note properties are writable. Formula and file metadata fields are read-only; a file-name title is changed through renaming. File and formula grouping does not support column creation or drag writes.

## Documentation

Start at the [documentation hub](docs/README.md) ([简体中文](docs/README_zh.md)).

| Topic | Guide |
| --- | --- |
| Install and enable | [Installation](docs/installation.md) |
| Create a new board | [Create a Board](docs/create-board.md) |
| Use an existing native Kanban view | [Convert a Board](docs/convert-board.md) |
| Global defaults and board overrides | [Configuration](docs/configuration.md) |
| Grouping and card fields | [Fields](docs/fields.md) |
| Task, project, and content layouts | [Scene Presets](docs/presets.md) |
| Create documents from notes | [Templates](docs/templates.md) |
| Edit and organize documents | [Card Operations](docs/cards.md) |
| Reuse and collapse detail panes | [Detail Previews](docs/preview.md) |
| Maintain the installation and backups | [Updates and Backups](docs/updates-and-backups.md) |
| Build and run checks | [Development and Testing](docs/development.md) |

## Development

Node.js 20+ is required. No third-party npm dependencies are needed.

```sh
npm test
npm run build
npm run check
```

To build, install into an open vault, reload, and check plugin loading:

```sh
npm run dev:install -- --vault "/absolute/path/to/vault"
```

See [Development and Testing](docs/development.md) for options and interface test steps.

## License

[MIT](LICENSE).
