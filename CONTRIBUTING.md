# Contributing

Thanks for helping. Bug reports, ideas and pull requests are all welcome.

## Reporting a bug

Open an issue with:

- what you did and what you saw, with a screenshot (`herdr-app shot` saves
  one of the window, even when it's covered);
- for a panel that shows "This view could not be rendered", the output of
  `herdr-app check ~/.config/herdr-app/mods/<that mod>`;
- `herdr-app --version` and `hc --version`.

Please crop or blur anything private in screenshots: space names, folders and
agent titles show your projects.

## Changing it

The layout is plain files; there's nothing to build.

```
layouts/herdr-tui-layout.json   the window's tree and look
themes/herdr-tui-layout.json    the colours
mods/herdr-tui-layout-*/        the panels (JavaScript on Herdr's gpui-kit)
keys.json                       the ctrl-b keys
```

1. Edit the files, then install your copy: `./scripts/install.sh --force`.
   Herdr reloads a mod when its file is saved, so later edits can go straight
   into `~/.config/herdr-app/mods/` while you try them, and back here when
   they work.
2. Run `./scripts/check.sh`. It runs `herdr-app check` on every mod and
   type-checks each against the `gpui-kit.d.ts` your Herdr app writes. Both
   matter: `herdr-app check` renders once without agents, so a bad call in
   an agent row passes it, and the type check is what catches it.
3. Look at the window. Some mistakes are the right type with the wrong
   meaning (`line_height(15)` is fifteen times the text size, not 15px); only
   seeing it shows them.
4. If you changed what someone sees or does, update `RECIPE.md` (it's the
   brief another agent rebuilds the layout from) and the README.

Things that are easy to get wrong are in `RECIPE.md` under **Watch out**.

## The six copied mods

`herdr-tui-layout-menu`, `-prompt`, `-worktree`, `-new-menu`, `-picker` and
`-help` are modified copies of mods shipped with Herdr (Apache-2.0). Keep
their changes small, and keep the note at the top of each `main.js` saying
what changed, as the license asks. `scripts/check.sh` compares each with the
original in your Herdr app, so only errors you added count.

## Pull requests

Keep one change per pull request, say what you saw before and after (a
screenshot helps), and include the `./scripts/check.sh` output.

## License

By contributing you agree your work is licensed under Apache-2.0, like the
rest of the repo.
