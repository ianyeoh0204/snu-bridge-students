import test from "node:test";
import assert from "node:assert/strict";
import {
  recordID,
  canonicalURL,
  revisedRecord,
  staleBriefs,
  collect,
} from "../lib/pipeline/collector.mjs";
import { validateDraft } from "../lib/pipeline/generation.mjs";
const s = {
  title: "공문",
  source_url: "https://ece.snu.ac.kr/community/academics?md=v&bbsidx=58022",
  blocks: [{ kind: "text", text: "대상은 석사. 2026.11.20. 17:00까지 제출." }],
  attachments: [],
  images: [],
  links: [],
  reading_status: { html: "read" },
};
test("record identity is per-department configurable with a URL-hash fallback", () => {
  assert.equal(recordID(s.source_url), "58022");
  assert.equal(
    recordID("https://example.edu/notice/abc", {
      extractID: (u) => u.pathname.split("/").at(-1),
    }),
    "abc",
  );
  assert.equal(
    recordID("https://example.edu/x?a=1&b=2", {}),
    recordID("https://example.edu/x?b=2&a=1", {}),
  );
  assert.match(recordID("https://example.edu/x", {}), /^url-/);
});
test("query order does not make a duplicate notice", () =>
  assert.equal(
    canonicalURL(s.source_url),
    canonicalURL("https://ece.snu.ac.kr/community/academics?bbsidx=58022&md=v"),
  ));
test("same URL with an edited body invalidates the English version", () => {
  const a = revisedRecord(null, s);
  const unchanged = revisedRecord(a, s);
  assert.equal(a.source_hash, unchanged.source_hash);
  const b = revisedRecord(a, {
    ...s,
    blocks: [
      { kind: "text", text: "대상은 석사. 2026.11.21. 17:00까지 제출." },
    ],
  });
  assert.notEqual(a.source_hash, b.source_hash);
  assert.equal(b.changes.length, 1);
  assert.equal(
    staleBriefs([{ notice_id: a.id, source_hash: a.source_hash }], [b])[0]
      .source_changed,
    true,
  );
});
test("a failed source read preserves the previous source and reports failure", async () => {
  const old = revisedRecord(null, s);
  const r = await collect({
    previous: [old],
    urls: [s.source_url],
    fetcher: async () => new Response("down", { status: 503 }),
  });
  assert.equal(r.report.status, "partial_or_failed");
  assert.equal(r.records[0].source_hash, old.source_hash);
  assert.ok(r.report.failures.length);
});
const n = revisedRecord(null, s);
const draft = {
  title: "Submit the document",
  degrees: ["masters"],
  period: "November 2026",
  topic: "Academic",
  summary: "Master’s students must submit.",
  steps: ["Submit the document."],
  notes: ["Check eligibility."],
  evidence_quote: "대상은 석사.",
  actions: [
    {
      title: "Submit",
      kind: "deadline",
      degrees: ["masters"],
      start: null,
      end: "2026-11-20T17:00:00+09:00",
      date_label: "20 November, 17:00",
      date_quote: "2026.11.20. 17:00까지 제출.",
      evidence_quote: "대상은 석사.",
      precision: "minute",
      conditions_note: "Only master’s students covered by this notice.",
      steps: ["Submit."],
    },
  ],
};
test("validated model drafts keep immutable source provenance and an honest review label", () => {
  const r = validateDraft(
    { ...draft, review_status: "officially approved" },
    n,
  );
  assert.equal(r.brief.source_hash, n.source_hash);
  assert.match(r.brief.review_status, /not independently reviewed/);
});
test("a fabricated source quote rejects the entire generated draft", () => {
  assert.throws(
    () => validateDraft({ ...draft, evidence_quote: "staff approved this" }, n),
    /absent/,
  );
});
test("unsupported precise time and fabricated unknown-date deadline are rejected", () => {
  const bad = structuredClone(draft);
  bad.actions[0].date_quote = "대상은 석사.";
  assert.throws(() => validateDraft(bad, n), /Exact time/);
  bad.actions[0].kind = "unknown_deadline";
  assert.throws(() => validateDraft(bad, n), /fabricated/);
});


test("standing rules keep unknown dates without inventing a deadline", () => {
  const raw = structuredClone(draft);
  Object.assign(raw.actions[0], { kind: "information", start: null, end: null, precision: "unknown", date_quote: "" });
  assert.equal(validateDraft(raw, n).actions[0].end, null);
  raw.actions[0].kind = "deadline";
  assert.throws(() => validateDraft(raw, n), /missing its date/);
});
test("invalid calendar dates and inconsistent precision are rejected", () => {
  const raw = structuredClone(draft);
  raw.actions[0].end = "2026-02-30T17:00:00+09:00";
  assert.throws(() => validateDraft(raw, n), /calendar/);
  raw.actions[0].end = "2026-11-20T24:00:00+09:00";
  assert.throws(() => validateDraft(raw, n), /clock/);
  Object.assign(raw.actions[0], { kind: "information", end: null, precision: "day" });
  assert.throws(() => validateDraft(raw, n), /precision/);
  Object.assign(raw.actions[0], { end: "2026-11-20", precision: "unknown" });
  assert.throws(() => validateDraft(raw, n), /precision/);
});

// Production regression: Sol correctly quoted the official title of notice 58183.
test('verbatim official-title evidence is accepted and title edits change the source version', () => {
  const v=structuredClone(draft);v.actions[0].evidence_quote=n.korean_title;
  assert.equal(validateDraft(v,n).actions[0].evidence_quote,n.korean_title);
  v.actions[0].evidence_quote=n.korean_title+' — an invented exemption';
  assert.throws(()=>validateDraft(v,n),/absent/);
  const revised=revisedRecord(n,{...s,title:s.title+' 수정'});
  assert.notEqual(revised.source_hash,n.source_hash);
});
