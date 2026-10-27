**English** | [简体中文](preview_zh.md)

# Open and Collapse Details

This guide explains what happens when you click a card.

## Choose an Opening Mode

Under **Settings → Quiet Kanban → Open details in**, or in the current board's view options, choose:

- **Right split:** open details beside the board.
- **New tab:** show details in a tab.

Each board reuses its own detail pane instead of creating a new one for every card.

## Regular Clicks

1. Click a card to open its document.
2. Click another card to switch documents in the same detail pane.
3. With **Collapse details when clicking the same item again** enabled, click the current card once more to collapse its details.

With that option disabled, clicking the same card again keeps its details open or focuses them.

## Other Ways to Collapse

- Click the collapse button at the top left of the detail pane, before the back and forward buttons.
- Run **Quiet Kanban: Collapse board item details**.

Focus returns to the corresponding board. Use the command while that board or its detail pane is the most recently active pane.

## Modifiers and Keyboard

- `Cmd`, `Ctrl`, or `Shift` plus click uses tab mode and does not collapse details on that click.
- With a card focused, `Enter` or Space acts like a regular click.
- The pencil and **…** buttons perform their own actions without opening or collapsing details.

## Manual Navigation Protection

If you navigate to another document inside a managed detail pane, the plugin stops managing that pane. Later card clicks do not overwrite or close a pane that you have repurposed.

Opening a document from the board again creates a new managed detail record.

## Restart and Reload

Detail records are saved in plugin data. On restart, only panes that still exist and match their recorded document paths are restored. Missing detail windows are not recreated automatically.

[Back to documentation](README.md)
