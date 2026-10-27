**English** | [简体中文](convert-board_zh.md)

# Convert an Existing Board

This guide explains how to convert a native Kanban view inside a `.base` file to Quiet Kanban.

## Convert the View

1. Open an existing `.base` file.
2. Select the native Kanban view you want to convert.
3. Run **Quiet Kanban: Convert current native Kanban board (with backup)**.
4. Wait for the success notice, then check grouping, fields, and document counts.

The plugin converts the selected native Kanban view first. If the selected view is not native Kanban, it converts the first native Kanban view in the file. If none exists, it shows a notice and does not convert tables or other view types.

## What Is Preserved

- The original file and its other views.
- Filters, sorting, and unrelated configuration.
- The native grouping property and column order.
- Document bodies and properties.

If the original view defines a display property order, the converted view uses **Follow Bases property menu**. Otherwise, it uses the current global display fields as a starting point.

## Automatic Backup

Before writing, the original file content is saved to:

```text
<config-directory>/plugins/quiet-kanban/backups/<timestamp>-<original-file-name>.json
```

For a file named `Task Board.base`, the backup name ends in `.base.json`.

The backup JSON contains the original path in `path` and the complete original text in `content`. If the source file changes during conversion, the operation stops rather than overwriting concurrent changes.

To restore a converted board, see [Updates and Recovery](updates-and-backups.md).

[Back to documentation](README.md)
