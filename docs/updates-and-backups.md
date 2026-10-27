**English** | [简体中文](updates-and-backups_zh.md)

# Updates, Backups, and Recovery

This guide distinguishes plugin updates, board-conversion backups, and document deletion.

## Update Manually

1. Finish any open configuration or editing drafts.
2. Back up the installed `main.js`, `manifest.json`, and `styles.css`, plus `data.json` if you need to preserve plugin data.
3. Replace the three distribution files with files from the same new version.
4. Reload the plugin and reopen the board if necessary.

Do not replace your existing `data.json` with an empty file. It stores plugin settings and detail records. Per-board configuration is mainly stored in `.base` files.

For automatic installation, see [Development and Testing](development.md).

## Two Different Backups

| Backup | Contents | Default location |
| --- | --- | --- |
| Installer backup | Previous distribution files being replaced | `.obsidian/plugins/.quiet-kanban-dev-backups/<timestamp-UUID>/` |
| Board-conversion backup | Original `.base` text before conversion | `.obsidian/plugins/quiet-kanban/backups/` |

Neither is a backup of all vault notes. Replace `.obsidian` with your actual configuration directory if customized.

## Restore Plugin Files

Copy the previous distribution files from the backup directory printed by the installer into:

```text
<config-directory>/plugins/quiet-kanban/
```

Restore only files that actually exist in that backup, then reload the plugin. The installer does not roll back automatically after failure.

## Restore a Board Before Conversion

1. Find the matching conversion backup JSON.
2. Check that `path` identifies the intended board.
3. Read the decoded text in `content` and write that text back to the corresponding `.base` file.
4. Reopen the board and confirm that the native view is restored.

Do not copy the entire backup JSON over the `.base` file. Restore the original text stored inside `content`.

## Recovery Scope

- Field layout, aliases, and styles change display configuration without updating documents in bulk.
- Dragging, quick editing, renaming, and moving operate on actual documents.
- Recovery after deletion depends on Obsidian's deletion settings.
- Disabling or uninstalling the plugin does not automatically convert its views back to native views.

Keep a separate vault backup strategy for important documents.

[Back to documentation](README.md)
