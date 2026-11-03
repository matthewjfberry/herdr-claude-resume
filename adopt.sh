#!/bin/sh
# Labels Claude Code sessions that were already running when the plugin was
# installed, so the claude-resume mod covers them too. Run it once.
#
# A running session never loads hooks added after it started, so its id comes
# from Claude Code's per-process file, ~/.claude/sessions/<pid>.json.

set -eu

for tool in hc jq; do
  command -v "$tool" >/dev/null 2>&1 || { echo "adopt: needs $tool on PATH" >&2; exit 1; }
done

uuid='^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$'
found=0

for terminal in $(hc ls --json | jq -r '.terminals[] | select(.state == "live") | .address'); do
  # Tab-separated: the Claude pid in the foreground, and its session label if any.
  row=$(hc get "$terminal" --json | jq -r '
    select((.foreground.argv[0] // "") | test("(^|/)claude$"))
    | [.foreground.pid, (.labels["claude.session"] // "-")] | @tsv')
  [ -n "$row" ] || continue
  found=$((found + 1))
  pid=${row%%"$(printf '\t')"*}
  labelled=${row#*"$(printf '\t')"}

  if [ "$labelled" != "-" ]; then
    echo "$terminal  already covered"
    continue
  fi

  file="$HOME/.claude/sessions/$pid.json"
  session=$(jq -r '.sessionId // empty' "$file" 2>/dev/null || true)
  cwd=$(jq -r '.cwd // empty' "$file" 2>/dev/null || true)

  if ! printf '%s' "$session" | grep -Eq "$uuid"; then
    echo "$terminal  skipped: no session file for pid $pid"
  elif ! ls "$HOME"/.claude/projects/*/"$session.jsonl" >/dev/null 2>&1; then
    echo "$terminal  skipped: no conversation saved yet"
  else
    hc label "$terminal" "claude.session=$session" "claude.cwd=$cwd" >/dev/null
    echo "$terminal  adopted ${cwd##*/} ($session)"
  fi
done

[ "$found" -gt 0 ] || echo "No Claude sessions running in Herdr terminals."
