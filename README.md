# herdr-claude-resume

Your Claude Code conversations survive a reboot. When [Herdr](https://herdr.dev) brings a terminal back after a restart, its Claude session reopens where you left it.

Herdr keeps terminals alive while the app is closed, but a reboot, logout or core restart still ends them. Herdr gives each one a fresh shell in its last folder, and the program that was running there is gone. This puts the conversation back.

## How it works

```
Claude Code plugin                    Herdr mod
──────────────────                    ─────────
first prompt   →  label the terminal  →  note the shell it runs in
you quit       →  remove the labels
terminal lost  →  labels stay         →  new shell at a prompt?
                                         type `claude --resume <id>`
```

Two small parts share labels on the Herdr terminal:

- **The plugin** labels the terminal with the session id and folder when you send the first prompt, and removes them when you quit, `/clear` or log out. When Claude is killed instead (a reboot, a hangup), the labels stay.
- **The mod** records the shell each session runs under. If a labelled terminal later has a different shell, the old one was lost, so the mod types `claude --resume <id>` into the new shell, in the session's folder.

Only a lost terminal triggers a resume. Quitting Claude, or Claude crashing in a shell that is still alive, never does.

## Install

You need Claude Code and the Herdr desktop app.

**1. The Claude Code plugin**

```sh
claude plugin marketplace add matthewjfberry/herdr-claude-resume
claude plugin install herdr-claude-resume@herdr-claude-resume
```

**2. The Herdr mod**

A mod only runs while a layout hosts it, and Herdr's shipped layouts are read-only, so you need a personal copy of your layout. Skip the clone if you already have one.

```sh
git clone https://github.com/matthewjfberry/herdr-claude-resume
cp -R herdr-claude-resume/mods/claude-resume ~/.config/herdr-app/mods/
herdr-app do layout.clone '{"name":"main","as":"my-layout"}'
```

Add the mod to the root node of `~/.config/herdr-app/layouts/my-layout.json`. It renders nothing, so you won't see it:

```json
"floating": [
  { "id": "claude-resume", "content": { "mod": "claude-resume" }, "edge": "bottom", "align": "end" }
]
```

If the layout already has a `floating` list, add the entry to it.

**3. Check it**

```sh
herdr-app check ~/.config/herdr-app/mods/claude-resume
herdr-app status    # claude-resume is listed under "floats", with no errors
```

Start Claude in a Herdr terminal and send a prompt. `hc get <terminal>` now shows `claude.session` and `claude.shell` labels.

## Behaviour

| What happens | Result |
|---|---|
| Reboot, logout or core restart | The session reopens in its terminal |
| You quit with `/exit` or Ctrl-D | Nothing. The labels are removed |
| `/clear` or `/resume` another session | The new session is labelled at its next prompt |
| Claude crashes, the shell lives | Nothing. Run `claude --continue` yourself |
| A session you never sent a prompt | Nothing. Claude saved no conversation to resume |
| Herdr app restart or update | Nothing to do. Terminals keep running |

## Limits

- The mod checks every 2 seconds, so a resume starts up to 2 seconds after the new shell.
- The mod has to run before the loss to record the shell. A session started while the app was closed, then lost before the app opened, isn't resumed.
- Sessions started before you installed the plugin are labelled at their next prompt.
- The resume is typed into the shell, so it shows in the shell's history.
- Tested with local terminals. Remote machines need the plugin installed on that machine too.

## Uninstall

```sh
claude plugin uninstall herdr-claude-resume@herdr-claude-resume
rm -r ~/.config/herdr-app/mods/claude-resume
```

Then remove the `claude-resume` entry from your layout.

## Development

```sh
node --test mods/claude-resume/plan.test.mjs
shellcheck hooks/label.sh
```

`plan.js` holds every decision as a pure function, tested under Node. `main.js` only reads Herdr's terminals and runs `hc`.

## Credit

The mod layout and install follow [herdr-tab-autoname](https://github.com/OliverRC/herdr-tab-autoname) by Oliver Rivett-Carnac.

## License

MIT
