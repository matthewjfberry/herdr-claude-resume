import assert from "node:assert/strict";
import { test } from "node:test";
import { plan, quote } from "./plan.js";

const SESSION = "61f732aa-6a89-4df3-9cc4-1394cfe74832";
const shell = { shell: true };
const claude = { shell: false };

function terminal({ labels = {}, pid = 200, state = "live", program = shell } = {}) {
  return { labels, pid, state, program };
}

test("ignores terminals without a Claude session", () => {
  assert.equal(plan(terminal()), null);
});

test("stamps the shell a new session runs under", () => {
  const t = terminal({ labels: { "claude.session": SESSION }, program: claude });
  assert.deepEqual(plan(t), { action: "stamp", pid: 200 });
});

test("leaves a session alone while its shell lives", () => {
  const labels = { "claude.session": SESSION, "claude.shell": "200" };
  assert.equal(plan(terminal({ labels, program: claude })), null);
  assert.equal(plan(terminal({ labels })), null, "Claude crashed: same shell, no resume");
});

test("resumes in a new shell, in the session's folder", () => {
  const labels = { "claude.session": SESSION, "claude.shell": "100", "claude.cwd": "/work/web" };
  assert.deepEqual(plan(terminal({ labels })), {
    action: "resume",
    pid: 200,
    command: `cd '/work/web' && claude --resume ${SESSION}`,
  });
});

test("resumes without a folder when none was recorded", () => {
  const labels = { "claude.session": SESSION, "claude.shell": "100" };
  assert.equal(plan(terminal({ labels })).command, `claude --resume ${SESSION}`);
});

test("waits while the new shell runs something else", () => {
  const labels = { "claude.session": SESSION, "claude.shell": "100" };
  assert.equal(plan(terminal({ labels, program: claude })), null);
});

test("ignores finished terminals and malformed session ids", () => {
  const labels = { "claude.session": SESSION, "claude.shell": "100" };
  assert.equal(plan(terminal({ labels, state: "finished" })), null);
  assert.equal(plan(terminal({ labels, pid: null })), null);
  const injected = { ...labels, "claude.session": `${SESSION}; rm -rf ~` };
  assert.equal(plan(terminal({ labels: injected })), null);
});

test("quotes folders with spaces and apostrophes", () => {
  assert.equal(quote("/Users/me/Matt's Work"), `'/Users/me/Matt'\\''s Work'`);
});
