#!/bin/sh
# Check every mod in this repo before a change goes in.
#   1. herdr-app check: the mod loads and its first render builds.
#   2. TypeScript against the gpui-kit.d.ts your Herdr app writes: an unknown
#      method (TS2339, e.g. line_clamp) or a missing argument (TS2554, e.g.
#      flex_shrink()) fails, even in rows the first render never draws.
# Mods copied from Herdr's (mod.json "cloned_from") are compared with the
# original in your app, so only errors the original doesn't have count.
# Neither step catches a value of the right type with the wrong meaning
# (line_height(15) is 15x the text size, not 15px): look at the window too.
#
# Needs: herdr-app, pnpm (TypeScript runs through pnpm dlx), and the Herdr
# app opened once (it writes the type files).
set -u
here=$(cd "$(dirname "$0")/.." && pwd)
app="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
orig="$app/mods"
types=$(ls "$orig"/*/gpui-kit.d.ts 2>/dev/null | head -1)
config=$(ls "$orig"/*/jsconfig.json 2>/dev/null | head -1)
command -v herdr-app >/dev/null 2>&1 || { echo "FAIL: herdr-app isn't on PATH"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "FAIL: pnpm isn't on PATH (TypeScript runs through it)"; exit 1; }
[ -n "$types" ] && [ -n "$config" ] || { echo "FAIL: no gpui-kit.d.ts in $orig: open the Herdr app once"; exit 1; }

work=$(mktemp -d "${TMPDIR:-/tmp}/herdr-tui-layout-check.XXXXXX")
trap 'rm -r "$work"' EXIT
NOISE='TS7005|TS7006|TS7008|TS7022|TS7023|TS7031|TS7034|TS7053|not assignable to parameter of type .`#'
tsc() { pnpm --package=typescript@5.6.3 dlx tsc -p "$1/jsconfig.json" 2>&1; }
fail=0 checked=0
for dir in "$here"/mods/*/; do
  name=$(basename "$dir")
  checked=$((checked + 1))
  if ! herdr-app check "$dir" >/dev/null 2>&1; then
    echo "FAIL $name: herdr-app check"; herdr-app check "$dir" 2>&1 | tail -5; fail=1; continue
  fi
  copy="$work/$name"; cp -R "$dir" "$copy"; cp "$types" "$config" "$copy"/
  out=$(tsc "$copy"); code=$?
  if [ "$code" -ne 0 ] && [ "$code" -ne 2 ]; then
    echo "FAIL $name: TypeScript did not run (exit $code)"; printf '%s\n' "$out" | tail -5; fail=1; continue
  fi
  real=$(printf '%s\n' "$out" | grep 'error TS' | grep -v -E "$NOISE")
  from=$(tr -d '\n' < "$dir/mod.json" | sed -n 's/.*"cloned_from": *{ *"name": *"\([^"]*\)".*/\1/p')
  if [ -n "$real" ] && [ -n "$from" ] && [ -f "$orig/$from/main.js" ]; then
    base="$work/orig-$from"; mkdir -p "$base"; cp "$orig/$from"/*.js "$types" "$config" "$base"/
    known=$(tsc "$base" | grep 'error TS' | sed 's/^[^(]*([0-9]*,[0-9]*): //' | sort -u)
    real=$(printf '%s\n' "$real" | while IFS= read -r line; do
      msg=$(printf '%s\n' "$line" | sed 's/^[^(]*([0-9]*,[0-9]*): //')
      printf '%s\n' "$known" | grep -qxF -- "$msg" || printf '%s\n' "$line"
    done)
  fi
  if [ -n "$real" ]; then echo "FAIL $name:"; printf '%s\n' "$real"; fail=1; else echo "ok   $name"; fi
done
[ "$checked" -gt 0 ] || { echo "FAIL: no mods in $here/mods"; exit 1; }
exit $fail
