import { buildProject } from './render-project.mjs';
import { buildUpdates } from './export-updates.mjs';
import { buildEvidence } from './render-evidence.mjs';
import fs from "node:fs";
const read = (p) => JSON.parse(fs.readFileSync(p));
const allNotices = read("data/notices.json");
const briefs = read("data/briefs.json"),
  ids = new Set(briefs.map((b) => b.notice_id)),
  notices = allNotices.filter((n) => ids.has(n.id));
const status = fs.existsSync("data/collection-status.json")
  ? read("data/collection-status.json")
  : {};
const guide = read("data/start-guide.json");
guide.needs_recheck = Object.entries(guide.source_versions || {}).some(
  ([id, hash]) => notices.some((n) => n.id === id && n.source_hash !== hash),
);
const data = {
  schema_version: 1,
  published_at: new Date().toISOString(),
  notices,
  briefs,
  pending_sources: allNotices
    .filter(n => !briefs.some(b => b.notice_id === n.id && b.source_hash === n.source_hash && !b.source_changed))
    .sort((a,b) => String(b.posting_date).localeCompare(String(a.posting_date)))
    .map(n => ({id:n.id, korean_title:n.korean_title, posting_date:n.posting_date,
      source_url:n.source_url, source_checked_at:n.source_checked_at,
      reason:ids.has(n.id)?"Official source changed; English recheck pending":"English brief not yet available"})),
  actions: read("data/actions.json"),
  guide,
  coverage: fs.existsSync("data/english-coverage.json")
    ? read("data/english-coverage.json")
    : null,
  status: {
    source_checked_at: status.checked_at || null,
    source_status: status.status || "snapshot",
    details_checked: status.checked_details || 0,
    scan_window: status.edit_detection || "Selected notices only.",
    english_updated_at: briefs
      .map((b) => b.generated_at)
      .sort()
      .at(-1),
    human_review: "Not independently reviewed",
    automation: fs.existsSync("data/automation-status.json")
      ? read("data/automation-status.json")
      : { collector: "not_scheduled", translator: "needs_configuration" },
  },
};
fs.mkdirSync("public/data", { recursive: true });
fs.writeFileSync("public/data/student.json", JSON.stringify(data));
console.log(
  "Public data: " +
    notices.length +
    " notices / " +
    briefs.length +
    " English briefs / " +
    data.actions.length +
    " action records",
);

buildEvidence();
buildProject();

buildUpdates(data);
