#!/bin/sh
# Install herdr-tui-layout into the Herdr app (herdr-app).
#
#   ./scripts/install.sh                 install and switch to it
#   ./scripts/install.sh --force         replace an earlier install (backed up first)
#   ./scripts/install.sh --usage-hook    also set up the top line's Claude usage numbers
#   ./scripts/install.sh --no-switch     install without switching layouts
#
# Copies layouts/, themes/ and mods/ into the app's home (HERDR_APP_HOME, else
# ~/.config/herdr-app), adds the layout's keys to keys.json (backed up first),
# checks every mod with `herdr-app check`, then switches to the layout.
# Nothing of yours is overwritten without --force; ctrl-shift-l switches back.
set -eu

here=$(cd "$(dirname "$0")/.." && pwd)
home="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
name=herdr-tui-layout
force=0 hook=0 switch=1
for a in "$@"; do
  case "$a" in
    --force) force=1 ;;
    --usage-hook) hook=1 ;;
    --no-switch) switch=0 ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    *) echo "unknown option: $a (see --help)"; exit 2 ;;
  esac
done

command -v herdr-app >/dev/null 2>&1 || { echo "herdr-app isn't on PATH. Install the Herdr app first: https://herdr.dev"; exit 1; }
[ -d "$home" ] || { echo "no Herdr app home at $home: open Herdr once first"; exit 1; }
stamp=$(date +%Y%m%d-%H%M%S)

# What this would replace.
taken=""
for p in "layouts/$name.json" "themes/$name.json"; do
  if [ -e "$home/$p" ]; then taken="$taken $p"; fi
done
for m in "$here"/mods/*/; do
  m=$(basename "$m")
  if [ -e "$home/mods/$m" ]; then taken="$taken mods/$m"; fi
done
if [ -n "$taken" ]; then
  if [ "$force" -eq 0 ]; then
    echo "already installed:$taken"; echo "run again with --force to replace them (they're backed up first)"; exit 1
  fi
  # Outside mods/, layouts/ and themes/: Herdr would load a copy left there.
  backup="$home/backups/$name-$stamp"
  for p in $taken; do
    mkdir -p "$backup/$(dirname "$p")"; mv "$home/$p" "$backup/$p"
  done
  echo "backed up the earlier install to $backup"
fi

mkdir -p "$home/layouts" "$home/themes" "$home/mods"
cp "$here/layouts/$name.json" "$here/layouts/$name.png" "$home/layouts/"
cp "$here/themes/$name.json" "$home/themes/"
for m in "$here"/mods/*/; do cp -R "$m" "$home/mods/$(basename "$m")"; done
echo "copied the layout, its theme and $(ls -d "$here"/mods/*/ | wc -l | tr -d ' ') mods into $home"

# Keys: add this layout's section; keep everything else as it is.
if [ -f "$home/keys.json" ]; then
  mkdir -p "$home/backups"; cp "$home/keys.json" "$home/backups/keys.json.$stamp"
  echo "backed up keys.json to backups/keys.json.$stamp"
fi
python3 -I - "$home/keys.json" "$here/keys.json" "$force" <<'PY'
import json, os, sys
dest, src, force = sys.argv[1], sys.argv[2], sys.argv[3] == "1"
mine = json.load(open(dest)) if os.path.exists(dest) else {}
theirs = json.load(open(src))
for section, keys in theirs.items():
    if section in mine and mine[section] != keys and not force:
        sys.exit(f"keys.json already has a different [{section}]; run with --force to replace it")
    mine[section] = keys
tmp = dest + ".tmp"
json.dump(mine, open(tmp, "w"), indent=2)
os.replace(tmp, dest)
print("added " + ", ".join(theirs) + " to keys.json")
PY

# Every mod must load before we switch to it.
bad=0
for m in "$here"/mods/*/; do
  m=$(basename "$m")
  if herdr-app check "$home/mods/$m" >/dev/null 2>&1; then echo "ok   $m"; else echo "FAIL $m:"; herdr-app check "$home/mods/$m" 2>&1 | tail -4; bad=1; fi
done
[ "$bad" -eq 0 ] || { echo "not switching: fix the mod above, or report it with its output"; exit 1; }

if [ "$hook" -eq 1 ]; then
  dir="${XDG_DATA_HOME:-$HOME/.local/share}/$name"
  mkdir -p "$dir" && cp "$here/extras/claude-usage-hook.sh" "$dir/" && chmod +x "$dir/claude-usage-hook.sh"
  settings="$HOME/.claude/settings.json"
  python3 -I - "$settings" "$dir/claude-usage-hook.sh" "$stamp" <<'PY'
import json, os, shutil, sys
path, hook, stamp = sys.argv[1], sys.argv[2], sys.argv[3]
data = json.load(open(path)) if os.path.exists(path) else {}
current = (data.get("statusLine") or {}).get("command")
if current and current != hook:
    print(f"note: Claude Code already has a statusLine ({current}); left it alone. "
          f"For the usage numbers, have it also run {hook} (it reads the same JSON on stdin).")
    sys.exit(0)
if os.path.exists(path):
    shutil.copy(path, f"{path}.bak-{stamp}")
data["statusLine"] = {"type": "command", "command": hook}
os.makedirs(os.path.dirname(path), exist_ok=True)
tmp = path + ".tmp"; json.dump(data, open(tmp, "w"), indent=2); os.replace(tmp, path)
print(f"Claude Code's statusLine now runs {hook} (prints nothing; Claude sessions started from now on report usage)")
PY
fi

if [ "$switch" -eq 1 ]; then
  if herdr-app status >/dev/null 2>&1; then
    herdr-app do layout.switch --name "$name" >/dev/null && echo "switched to $name (ctrl-shift-l switches back)"
  else
    echo "Herdr isn't running: open it, then pick $name in Settings > Look"
  fi
fi
