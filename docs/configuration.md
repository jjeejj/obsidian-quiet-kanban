**English** | [简体中文](configuration_zh.md)

# Global and Per-Board Configuration

This guide explains where settings live and how overrides work. For field details, see [Field Configuration](fields.md).

## Global Settings

Open **Settings → Quiet Kanban**.

| Setting | Purpose |
| --- | --- |
| Language | Follow Obsidian, Chinese, or English |
| Default fields | Global grouping, title, display fields, and scene presets |
| Global new item template | Template for boards without a local template setting |
| Hide empty status columns | Hide configured columns that currently contain no documents |
| Open details in | Right split or new tab, reused for the same board |
| Collapse details when clicking the same item again | Allow another click on the current card to close its details |
| Default column width | 220–520px; default 310px |
| Card background intensity | 0–35%; default 17% |
| Group colors | Colors assigned to grouping values |

Regular controls save when changed. Changes in the **Default fields** dialog require **Save**; **Cancel** discards the draft.

## Per-Board Settings

Open the field layout through either:

- The **Configure fields** icon beside the first column header.
- **Quiet Kanban: Configure board fields** in the Command Palette.

Other settings are available in Bases view options, including grouping, title, display field source, template, width, empty columns, and detail opening behavior.

## Precedence and Inheritance

An explicit board setting overrides the global default. A local display field list replaces the whole global list rather than merging with it.

Creating a board with **Use global defaults** copies the current field layout into that board. Later global layout changes therefore do not replace that saved layout automatically. Other options without a local setting continue to use global defaults.

Template inheritance is separate from layout: a board without a local template uses the global template. **Unlink template** explicitly disables templates for that board, even when a global template exists.

## Column Order

Drag column headers to change their order. This is saved automatically per board and survives switching documents or reopening the board. It is separate from Bases sorting, which controls cards inside columns. See [Reorder Columns](cards.md#reorder-columns).

## Language

The default follows Obsidian: Chinese in Chinese environments and English in other environments. You can also choose either language manually.

Switching languages refreshes the interface without renaming existing document properties. Property configurations created from presets are not renamed either.

## Group Colors

Use the **Group colors** section:

1. For an existing mapping, select a color from its dropdown.
2. To add one, enter a group name matching the actual column value, choose a color, and click **Add**.
3. **Remove** deletes only the color mapping. The group and its documents remain and return to automatic colors.

Blue, purple, cyan, green, orange, pink, yellow, and red are supported. Changes save automatically. Groups without explicit mappings receive stable automatic colors.

Next: [Fields](fields.md) · [Detail Previews](preview.md)

[Back to documentation](README.md)
