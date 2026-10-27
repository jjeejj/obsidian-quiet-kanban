**English** | [简体中文](cards_zh.md)

# Create and Manage Cards

Cards represent real documents. Editing, moving, or deleting a card changes vault files, not just the board display.

## Create a Document

1. Click **+** in the destination column.
2. Choose **New document** or **Create document from linked template**.
3. Name and edit the note in the native creation interface.

The new document receives the destination column's grouping value. Without a grouping property, no extra grouping property is written. See [Templates](templates.md) for template behavior.

## Quick Editing

Hover over a card and click the pencil icon:

1. Edit its title and display properties according to the field configuration.
2. Click **Save**, or press `Cmd/Ctrl + Enter`.
3. Click **Cancel** or press `Esc` to discard the draft.

| Field | Editing behavior |
| --- | --- |
| File-name title | Renames the document |
| Regular note property | Updates that property |
| List | One value per line |
| Date | Choose from the native date picker or enter `YYYY-MM-DD` |
| Number | Validated and saved as a number, including `0` |
| Checkbox | Saved as a boolean |
| Formula or file metadata | Read-only |

Only changed fields are updated. Unrelated properties and the document body are preserved. Validation failures leave the draft open so you can correct and save it.

## Drag Between Columns

Dragging a card to another column updates the current grouping property.

- A scalar property becomes the destination value.
- A list loses the source value, gains the destination value, and retains other values.
- Moving to **Ungrouped** clears the corresponding source value.
- Numbers and booleans retain their types.

This works only for regular note properties on Markdown documents. Formula and file-property groups cannot be modified by dragging.

Order within a column follows Bases sorting. Free manual ordering of cards within a column is not supported.

## Reorder Columns

Drag column headers to reorder columns with grouping values. The order saves automatically in the board file without a separate Save action, and remains when switching documents or reopening the board. The order belongs to that grouping property and does not carry over when you switch to another property.

**Hide empty status columns** controls whether empty configured columns appear. A column also needs a saved grouping value, such as one provided by a preset.

## Rename, Move, or Delete

Use the card's **…** menu:

- **Rename:** enter a new file name without path separators.
- **Move to folder:** enter an existing vault folder, or leave blank for the vault root.
- **Delete:** check the document name in the confirmation, then confirm deletion.

Rename and move operations check for name conflicts. Deletion follows Obsidian's deletion settings; whether recovery is available depends on those settings.

If a move or edit makes a document stop matching the filters, it disappears from this board without necessarily being deleted. Use Obsidian search to locate it first.

[Back to documentation](README.md)
