import fs from "node:fs";
import { noticeText, currentBrief } from "../lib/bridge/student.mjs";
const data = JSON.parse(fs.readFileSync("public/data/student.json"));
const clean = (s) => String(s).replace(/\s+/gu, " ").trim();
for (const b of data.briefs) {
  const n = data.notices.find((n) => n.id === b.notice_id);
  if (!n) throw Error("Brief without source " + b.notice_id);
  if (
    currentBrief(b, n) &&
    b.evidence_quote &&
    !clean(noticeText(n)).includes(clean(b.evidence_quote))
  )
    throw Error("Missing brief evidence: " + b.notice_id);
  if (
    !b.summary ||
    !b.steps?.length ||
    !b.review_status.includes("not independently reviewed")
  )
    throw Error("Incomplete draft " + b.notice_id);
}
for (const a of data.actions) {
  const n = data.notices.find((n) => n.id === a.notice_id);
  if (!n) continue;
  if (a.source_hash !== n.source_hash) continue;
  for (const q of [a.date_quote, a.evidence_quote].filter(Boolean)) {
    if (!clean(noticeText(n)).includes(clean(q)))
      throw Error("Missing action evidence " + a.id);
  }
  if (a.kind === "unknown_deadline" && a.end)
    throw Error("Unknown deadline has a date");
}
console.log(
  "Validated public data: " +
    data.briefs.length +
    " source-linked English briefs. No semantic sign-off implied.",
);
