import { View, div } from "gpui-kit";
import { hc, terminals } from "herdr";
import { SHELL, plan } from "./plan.js";

// Terminals with an `hc` call in flight, so a slow call is never repeated by the next tick.
const busy = new Set();

async function run(args) {
  const { code, stderr } = await hc(args);
  if (code !== 0) throw new Error(stderr.trim() || `hc ${args[0]} exited ${code}`);
}

async function apply(address, step) {
  busy.add(address);
  try {
    // Stamp before sending: once the label names this shell, no later tick resumes again.
    await run(["label", address, `${SHELL}=${step.pid}`]);
    if (step.action === "resume") await run(["send", address, step.command]);
  } catch (e) {
    console.log(`claude-resume: ${address}: ${e.message}`);
  } finally {
    busy.delete(address);
  }
}

function sync() {
  for (const terminal of terminals()) {
    if (busy.has(terminal.address)) continue;
    const step = plan(terminal);
    if (step) apply(terminal.address, step);
  }
}

export default class ClaudeResume extends View {
  init(_props, cx) {
    cx.timer.every(2000, sync);
  }

  render() {
    return div();
  }
}
