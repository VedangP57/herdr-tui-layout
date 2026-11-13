# Security

## What this layout can do

Herdr mods are trusted code with your user's permissions. herdr-tui-layout:

- runs `hostname -s` and `hc machine ls --json`, `git rev-parse`, `git for-each-ref refs/heads` and `git worktree list --porcelain` in each space's folder every 15s (to nest worktrees and list branches) and `git` in the worktree dialog, `sh`, `ls` and `stat` over `~/.local/state/herdr-tui-layout/claude/`,
  and lazygit, btop or yazi when you press their keys;
- reads only that folder outside its own;
- writes only through Herdr's own commands (spaces, tabs, panes, layout) and
  its per-mod storage;
- makes no network requests.

The optional `extras/claude-usage-hook.sh` is a Claude Code status-line
command. It saves the status JSON Claude Code passes it (model, context and
rate-limit use, the session's folder and id) to
`~/.local/state/herdr-tui-layout/claude/`, readable only by you, and prints
nothing. It sends nothing anywhere.

Read every file before installing; Herdr's agent guide asks agents to do the
same.

## Reporting a problem

If you find something in this layout that runs, reads or sends more than the
above, please report it privately: on GitHub, open the repo's **Security** tab
and choose **Report a vulnerability**. Please don't open a public issue for it.

For problems in Herdr itself, report to Herdr (`herdr-app feedback`).
