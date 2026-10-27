**English** | [简体中文](presets_zh.md)

# Use Scene Presets

Presets provide editable field configurations. They do not create or update documents in bulk.

## Built-In Presets

These are the field names used when applying presets in the English interface:

| Preset | Group by | Display fields |
| --- | --- | --- |
| Blank board | No grouping | Title only |
| Task management | Status | Owner, Due date, Priority |
| Project management | Owner | Status, Due date, Budget |
| Content planning | Platform | Publish date, Tags, Published |

All presets use the file name as the title by default.

Task management provides an initial **To do, In progress, Done** column order. With empty columns hidden, unused columns disappear. A completely empty board still retains one column for creating a document.

## Where to Apply a Preset

- **When creating a board:** choose a **Scene preset**.
- **For global defaults:** open **Default fields**, apply a preset, and save.
- **For an existing board:** open its **Configure fields** dialog, apply a preset, and save.

You can then change grouping, title, properties, field order, or the list itself. A preset does not lock the layout.

## Match Existing Documents

If your notes use names such as `status` or `dueDate`, map the preset to those actual properties. You do not need to rename properties across the vault.

For example, a task note can contain:

```yaml
---
Status: To do
Owner:
  - Alex
Due date: 2026-11-01
Priority: High
---
```

Switching interface languages does not change existing property names. Applying a preset in the Chinese interface uses corresponding Chinese names; check the mapping before saving.

## Before Switching

Applying a preset replaces grouping, title, display fields, and initial column order in the configuration draft. It does not change filters, templates, or document bodies. You can cancel before saving. After saving, you can configure the board again, but there is no separate “undo last preset” button.

Back up the `.base` file first if you want to retain a previous layout.

Next: [Fields](fields.md) · [Templates](templates.md)

[Back to documentation](README.md)
