#!/bin/sh
# Labels the Herdr terminal running this Claude Code session with the session id,
# so the claude-resume mod can reopen it if the terminal is lost.
#   prompt (UserPromptSubmit): the session has a saved conversation, so label it.
#   end    (SessionEnd):       the person ended it, so remove the labels.

[ -n "${HC_TERMINAL_ID:-}" ] || exit 0
PATH="$PATH:$HOME/.local/bin"
command -v hc >/dev/null 2>&1 || exit 0

# Reads one string field from the hook's JSON payload on stdin.
field() {
  sed -n "s/.*\"$1\" *: *\"\([^\"]*\)\".*/\1/p" | head -n 1
}

case "${1:-}" in
  prompt)
    session=$(field session_id)
    [ -n "$session" ] || exit 0
    hc label "$HC_TERMINAL_ID" "claude.session=$session" "claude.cwd=$PWD"
    ;;
  end)
    # "other" is Claude being killed: a hangup, a reboot, a core restart. Those are
    # exactly the losses to recover from, so the labels stay.
    [ "$(field reason)" = other ] && exit 0
    hc label "$HC_TERMINAL_ID" "claude.session=" "claude.cwd=" "claude.shell="
    ;;
esac >/dev/null 2>&1

exit 0
