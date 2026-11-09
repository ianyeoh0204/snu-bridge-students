import fs from "node:fs";
import { generate } from "../lib/pipeline/generation.mjs";
const read = (p) => JSON.parse(fs.readFileSync(p)),
  write = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n");
const notices = read("data/notices.json");
let briefs = read("data/briefs.json"),
  actions = read("data/actions.json");
const todo = notices.filter(
  (n) =>
    !briefs.some(
      (b) =>
        b.notice_id === n.id &&
        b.source_hash === n.source_hash &&
        !b.source_changed,
    ),
);
const configured = Boolean(
  process.env.BRIDGE_LLM_ENDPOINT &&
    process.env.BRIDGE_LLM_API_KEY &&
    process.env.BRIDGE_LLM_MODEL,
);
const limit = Number(process.env.BRIDGE_MAX_BRIEFS_PER_RUN || 4);
if (!Number.isInteger(limit) || limit < 1 || limit > 12)
  throw Error("Set a per-run brief limit from 1 to 12.");
if (!configured) {
  write("data/automation-status.json", {
    collector: process.env.GITHUB_ACTIONS ? "cloud_run" : "local_run",
    translator: "needs_configuration",
    pending_briefs: todo.length,
    last_attempt_at: new Date().toISOString(),
    note: "Source collection does not require a model key. Unattended English generation requires a configured provider. No model requests were made.",
  });
  console.log(
    "No model credential configured. " +
      todo.length +
      " notices remain queued. No paid call made.",
  );
  process.exit(0);
}
const failures = [],
  usage = [];
let count = 0;
for (const n of todo
  .sort((a, b) => String(b.posting_date).localeCompare(String(a.posting_date)))
  .slice(0, limit)) {
  try {
    const result = await generate(n, {
      endpoint: process.env.BRIDGE_LLM_ENDPOINT,
      key: process.env.BRIDGE_LLM_API_KEY,
      model: process.env.BRIDGE_LLM_MODEL,
    });
    briefs = briefs.filter((b) => b.notice_id !== n.id).concat(result.brief);
    actions = actions
      .filter((a) => a.notice_id !== n.id)
      .concat(result.actions);
    usage.push({ notice_id: n.id, usage: result.usage });
    count++;
    console.log("Generated validated draft for notice " + n.id);
  } catch (e) {
    failures.push({ notice_id: n.id, error: e.message });
    console.log("Draft generation needs attention for " + n.id);
  }
}
write("data/briefs.json", briefs);
write("data/actions.json", actions);
write("data/automation-status.json", {
  collector: process.env.GITHUB_ACTIONS ? "cloud_run" : "local_run",
  translator: failures.length ? "error" : "enabled",
  pending_briefs: todo.length - count,
  last_attempt_at: new Date().toISOString(),
  generated: count,
  failures,
  usage,
  note: "Automated quote/shape checks are not independent semantic review.",
});
if (failures.length) process.exitCode = 2;
