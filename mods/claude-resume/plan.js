// What the mod does with each terminal. Pure, so it runs under Node's test runner.

export const SESSION = "claude.session";
export const CWD = "claude.cwd";
export const SHELL = "claude.shell";

const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** POSIX single quotes, safe for any folder name. */
export function quote(text) {
  return `'${text.replaceAll("'", `'\\''`)}'`;
}

/**
 * One step for a terminal as `terminals()` describes it, or null:
 *  - stamp:  a Claude session is running here, so record the shell it runs under.
 *  - resume: that shell is gone, a new one waits at a prompt, so reopen the session.
 *
 * Quitting Claude clears the labels (the hook's SessionEnd). Claude crashing leaves the
 * same shell, so only a new shell, the sign of a lost terminal, triggers a resume.
 */
export function plan({ labels = {}, pid, state, program }) {
  const session = labels[SESSION];
  if (!UUID.test(session ?? "") || state !== "live" || !pid) return null;

  const shell = labels[SHELL];
  if (!shell) return { action: "stamp", pid };
  if (shell === String(pid) || !program?.shell) return null;

  const cwd = labels[CWD];
  const resume = `claude --resume ${session}`;
  return { action: "resume", pid, command: cwd ? `cd ${quote(cwd)} && ${resume}` : resume };
}
