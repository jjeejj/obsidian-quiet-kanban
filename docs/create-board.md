**English** | [简体中文](create-board_zh.md)

# Create a Board

This guide explains how to create a Quiet Kanban `.base` file.

## Prepare Your Documents

Decide which documents the board should show. Keeping related documents in one folder, such as `Tasks` or `Projects/App`, makes the scope easier to manage.

The folder entered in the creation form must already exist. It limits the board's query scope.

## Choose a Creation Entry

- **Folder context menu → Create board:** creates the board in the selected folder and uses that folder as the initial document scope.
- **Command Palette → Quiet Kanban: Create enhanced Kanban board:** creates the board in the vault root.
- **Settings → Quiet Kanban → Create enhanced Kanban board:** also creates it in the vault root.

Enter a document-folder path or select a folder suggestion. This controls which documents the board shows, independently of where the board file is created.

## Create the Board

1. Open the creation form through one of the entries above.
2. Choose a **Scene preset**.
3. Enter a board file name, such as `Task Board`. Do not include folder separators; the `.base` suffix is optional.
4. Enter the **Document folder**, such as `Tasks`. Leave it blank to query Markdown documents across the vault.
5. Click **Create**. The plugin creates and opens the board.

The selected entry determines the board file location. If the name is already taken there, a numeric suffix is added. You can move the board file later using Obsidian's file explorer.

## Choose an Initial Layout

- **Use global defaults** copies the current global field layout into the new board.
- **Task management / Project management / Content planning** uses the corresponding field preset.
- **Blank board** has no grouping property and shows document titles only.

Presets do not create properties or update existing notes in bulk. You can adjust their property names after creating the board.

A preset applied in the English interface uses the corresponding English property names. Check that they match the actual properties in your documents.

## Check the Result

1. Confirm that the board shows the intended documents.
2. Click **Configure fields** beside the first column header and check the grouping and title properties.
3. Adjust display fields as needed, then click **Save**.
4. If you want new documents to use a template, [link one](templates.md).

The column's **+** uses the native Bases creation flow, which determines where the new note is stored. Check the new file's path afterward and use the card menu to move it if needed.

Next: [Scene Presets](presets.md) · [Field Configuration](fields.md)

[Back to documentation](README.md)
