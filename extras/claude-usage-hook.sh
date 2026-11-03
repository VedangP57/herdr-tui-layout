#!/bin/sh
# Claude Code statusLine command for the herdr-tui-layout layout.
# Claude Code pipes its status JSON (model, context window, rate limits,
# session, folder) on stdin each time it redraws. This saves it as
# ~/.local/state/herdr-tui-layout/claude/<session_id>.json for the sidebar's
# usage line to read, and prints nothing, so Claude Code's own bottom area
# stays as it is.
dir="$HOME/.local/state/herdr-tui-layout/claude"
mkdir -p "$dir" || exit 0
tmp=$(mktemp "$dir/.in.XXXXXX") || exit 0
cat > "$tmp"
id=$(python3 -I -c 'import json,sys,re; print(re.sub(r"[^A-Za-z0-9_-]", "", json.load(open(sys.argv[1])).get("session_id") or ""))' "$tmp" 2>/dev/null)
if [ -n "$id" ]; then mv -f "$tmp" "$dir/$id.json"; else rm -f "$tmp"; fi
exit 0
