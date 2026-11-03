# For coding agents working on this repo

herdr-tui-layout is a layout for herdr-app (the Herdr desktop app) that looks
and works like herdr-tui (the terminal herdr). It is plain files: a layout
JSON, a theme, eight mods in JavaScript on Herdr's gpui-kit, and a keys file.

## Read first

- `RECIPE.md`: what the person sees, how it behaves, how it's built, and
  **Watch out**, the mistakes that already happened once.
- `~/.config/herdr-app/AGENTS.md`: Herdr's own guide to layouts, mods,
  commands and the look. Its type files (`gpui-kit.d.ts`, `herdr.d.ts`) are
  the truth about the API; don't guess a style method or an argument.

## Rules

- **Check before calling a change done:** `./scripts/check.sh`, then look at
  the window (`herdr-app shot`, and compare the clock in the shot with the
  time: a window that isn't on screen returns its last frame).
- **Never publish anything personal.** Screenshots and examples use made-up
  spaces (`web`, `api`, `docs`), not real project, client or machine names.
  No home paths, hostnames, emails or tokens in files or commits.
- **The six copied mods** (`-menu`, `-prompt`, `-worktree`, `-new-menu`,
  `-picker`, `-help`) are Herdr's code under Apache-2.0: keep the note at the
  top of each `main.js` current, and keep changes small.
- **Say what a mod runs.** If a change makes a mod run a program, read a file
  outside its folder or use the network, update "What it runs" in the README
  and `SECURITY.md`.
- **One change per commit**, and update `RECIPE.md`, the README and
  `CHANGELOG.md` when what people see or do changes.
