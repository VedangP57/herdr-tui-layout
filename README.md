# herdr-tui

A layout for the [Herdr](https://herdr.dev) desktop app that looks and works
like the terminal herdr: spaces by machine with their branches and worktrees
in a sidebar, agents under them, one thin line of numbered tabs on top, and
the old `ctrl-b` keys. Melange colours, Menlo throughout.

Not affiliated with Herdr. Six of its mods are modified copies of Herdr's own
(Apache-2.0; see NOTICE).

![herdr-tui](preview.png)

**Install:** in Herdr, ask your agent to add `herdr.dev/layouts/VedangP57/herdr-tui`
(or this repo). It copies the layout, mods and theme, merges `keys.json`, and
switches to it; `ctrl-shift-l` switches back. `RECIPE.md` is the brief it
can rebuild it from. The top line's usage numbers need the optional
`extras/claude-usage-hook.sh`.
