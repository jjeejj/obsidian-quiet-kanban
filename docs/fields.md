**English** | [简体中文](fields_zh.md)

# Configure Grouping and Display Fields

This guide explains how to use arbitrary document properties rather than a fixed status, date, and project layout.

## Open Configuration

Click the configuration icon beside the first column header, or run **Quiet Kanban: Configure board fields**. Global defaults are under **Settings → Quiet Kanban → Default fields**.

Choose a preset or edit the configuration directly, then click **Save**.

## Grouping Property

Columns come from values in the grouping property. For example:

| Property | Columns |
| --- | --- |
| Status | To do, In progress, Done |
| Owner | One column per owner |
| Platform | One column per platform |
| Completed | false, true |

Leave grouping blank to show all documents in one column. Documents without a grouping value appear under **Ungrouped**. A list property can place the same document in multiple columns, so column counts may add up to more than the document total.

The plugin's **Group by** property determines its columns. Native Bases filters and sorting still apply, but the native grouping menu does not configure this plugin's grouping property.

Grouping can use a note property, file property, or formula. File and formula groups are read-only: column creation buttons and cross-column drag writes are unavailable.

## Title Property

The default is `file.name`. You can choose another property; empty titles still fall back to the file name. Titles are rendered as plain text.

## Display Field List

With **Custom field list** selected:

1. Click **Add field**.
2. Enter a property name, or use **Choose property** to search existing properties.
3. Select a presentation and optionally set a display name and empty-value behavior.
4. Use the arrow buttons to reorder fields, or **Remove** to remove a display entry.
5. Save.

Removing a display field does not delete the property from any document.

Examples include `owner`, `note.owner`, `file.ctime`, and `formula.total`. Names without a source prefix are treated as note properties.

| Option | Purpose |
| --- | --- |
| Display name | Card label alias; blank uses the property's display name |
| Show field name | Show the label alongside the value |
| Hide empty values | Omit the row when no value exists |
| Show placeholder | Use custom empty text, or “Not set” if none is entered |

`0` and `false` are valid values and are not hidden as empty.

## Presentation Styles

| Style | Suitable content |
| --- | --- |
| Auto | Chooses based on the value type returned by Bases |
| Text | Text or short descriptions |
| Tags | People, projects, or tags; list values appear separately |
| Date | Date properties |
| Number | Amounts, counts, and other numbers |
| Checkbox | Boolean `true` / `false` values |

Choosing a style does not convert existing data in bulk. Use appropriate document property types for dates, numbers, and checkboxes. Quick editing processes and validates changed values when saved.

## Follow the Bases Property Menu

Choose **Follow Bases property menu** to use native property selection and order.

Then select and reorder properties in the toolbar's **Properties** menu. Cards follow that list and use native display names. The title property is not repeated among body fields. The custom display list is not used in this mode.

## Example

A project board can group by `note.owner` and show:

1. `note.status` as tags.
2. `note.dueDate` as a date, labeled “Due.”
3. `note.budget` as a number.

Next: [Card Operations](cards.md)

[Back to documentation](README.md)
