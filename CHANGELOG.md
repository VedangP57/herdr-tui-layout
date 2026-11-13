# Changelog

## Unreleased

- **Fixed:** a worktree could sit under the wrong repo, and move when spaces
  were reordered: nesting matched folder names. It now asks git which repo
  each space's live folder belongs to.
- **New:** `▾` / `▸` at the right of a repo's row folds its worktrees.
- **Removed:** `ctrl-b 1`…`9` for tabs; click a tab, or use Herdr's own
  tab keys.
- **New:** each repo's local branches show as a tree under its space, the
  checked-out one in accent; clicking one goes to its worktree's space, or
  asks the worktree dialog to make it.
- **New:** an agent's live workers show under its row behind `▾` / `▸`;
  clicking one peeks that terminal.

## v0.1.0 — 2026-11-03

First release. Built and tested with herdr-app 0.1.12 and hc 0.1.17 on macOS.

- **Sidebar:** spaces grouped by machine on rounded blocks, one line each with
  branch and tab count; worktrees drawn as a tree under their repo; fold a
  machine; drag spaces to reorder; right-click for rename, worktrees and close;
  connection state per machine (connected, reconnecting, unreachable).
- **Agents:** below the spaces, behind a draggable divider; status mark, space
  and tab, and the agent's task; `priority` / `spaces` order.
- **Top line:** numbered tabs (drag to reorder, double-click to rename), the
  focused agent's model and context, Claude 5-hour and weekly use, the shown
  space's machine and the time.
- **Fold strip:** `«` / `»` fold the sidebar to a 40px rail of space numbers
  and agent letters.
- **Keys:** herdr-tui's `ctrl-b` prefix for tabs, spaces, panes, worktrees,
  the picker, help and lazygit / btop / yazi popups.
- **Look:** Melange colours, Menlo 12.5 everywhere, rounded panes; menus and
  dialogs that draw their own rounded boxes.
- **Install:** `scripts/install.sh`, with `--force` (backs up first) and
  `--usage-hook` (sets up the usage numbers).
- **Checks:** `scripts/check.sh` runs `herdr-app check` and a TypeScript check
  on every mod.

Not yet tried on screen: the `ctrl-b` keys, the popups, the picker, help,
the `+` menu and the reconnecting state.
