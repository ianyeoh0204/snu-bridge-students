export const degreeNames = {
  unsure: "All students",
  undergraduate: "Undergraduate",
  masters: "Master’s",
  phd: "PhD",
  integrated: "Integrated MS–PhD",
};
export function noticeText(n) {
  return (n?.original || [])
    .map((b) =>
      b.t === "p"
        ? b.text
        : b.t === "table"
          ? b.rows.map((r) => r.join(" | ")).join("\n")
          : "[Image not read]",
    )
    .join("\n");
}
export function noticeEvidence(n) {
  return [n?.korean_title || "", noticeText(n)].filter(Boolean).join("\n");
}
export function currentBrief(b, n) {
  return Boolean(n && b.source_hash === n.source_hash && !b.source_changed);
}
const bound = (s, end = false) =>
  s
    ? Date.parse(
        s.length === 10 ? s + (end ? "T23:59:59+09:00" : "T00:00:00+09:00") : s,
      )
    : NaN;
export function classify(a, now = Date.now()) {
  if (!a.end && a.kind === "event" && a.start) {
    return bound(a.start, a.start.length === 10) < now ? "past" : "event";
  }
  if (!a.end) return "check";
  if (
    a.end.length === 10 &&
    a.end ===
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now)
  )
    return "today";
  if (bound(a.end, true) < now) return "past";
  if (a.kind === "event") return bound(a.start) <= now ? "ongoing" : "event";
  if (a.start && bound(a.start) > now) return "later";
  return "open";
}
export function selectActions(
  data,
  {
    degree = "unsure",
    query = "",
    includePast = false,
    days = 120,
    answers = {},
  } = {},
  now = Date.now(),
) {
  const notices = new Map(data.notices.map((n) => [n.id, n]));
  const briefs = new Map(data.briefs.map((b) => [b.notice_id, b]));
  const groups = { due: [], check: [], events: [], past: [] };
  for (const a of data.actions) {
    const n = notices.get(a.notice_id),
      b = briefs.get(a.notice_id);
    if (!b || !currentBrief(b, n) || a.source_hash !== n.source_hash) continue;
    if (degree !== "unsure" && !a.degrees.includes(degree)) continue;
    if (
      Object.entries(a.conditions || {}).some(
        ([k, v]) => typeof answers[k] === "boolean" && answers[k] !== v,
      )
    )
      continue;
    if (
      query &&
      !`${a.title} ${b.summary} ${b.topic} ${n.korean_title}`
        .toLowerCase()
        .includes(query.toLowerCase())
    )
      continue;
    const state = classify(a, now),
      date = a.kind === "event" ? a.start || a.end : a.end;
    if (state === "past" && !includePast) continue;
    if (bound(date) > now + days * 864e5) continue;
    const item = { ...a, state, brief: b, notice: n };
    groups[
      state === "past"
        ? "past"
        : a.kind === "unknown_deadline"
          ? "check"
          : a.kind === "event" || a.kind === "information"
            ? "events"
            : "due"
    ].push(item);
  }
  for (const g of Object.values(groups))
    g.sort(
      (a, b) =>
        bound(a.kind === "event" ? a.start || a.end : a.end, true) -
        bound(b.kind === "event" ? b.start || b.end : b.end, true),
    );
  return groups;
}
export function askPrompt({
  degree = "unsure",
  brief = null,
  question = "Help me work out my next step.",
} = {}) {
  return `Use SNU Bridge’s source-grounded method. My selected degree/profile is ${degreeNames[degree]} at SNU ECE. ${question}\n${brief ? `Official notice: ${brief.source_url}\nAcademic period: ${brief.period}\nRead the current original before using these dates.\n` : "SNU Bridge student homepage: https://ianyeoh0204.github.io/snu-bridge-students/\nOfficial ECE academic board: https://ece.snu.ac.kr/community/academics\nStart with the linked source material; the saved briefs are a selected pilot and some dates are historical.\n"}Explain who this applies to, each action and its own deadline (Asia/Seoul), exceptions, and the source evidence. Ask only for missing facts needed to decide applicability. Keep application deadlines separate from event dates. If an image or file cannot be read, say what remains unknown. Do not infer exemption from English-taught coursework.`;
}
const escapeICS = (s) =>
  String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/[,;]/g, "\\$&");
export function calendarFile(a, now = Date.now()) {
  if ((!a.end && !(a.kind === "event" && a.start)) || a.kind === "unknown_deadline")
    throw Error("No known date to export.");
  const stamp = (x) =>
    new Date(x)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const point = a.kind === "event" && !a.end;
  const mixed = Boolean(a.start && a.end && a.start.length !== a.end.length);
  const allDay = (a.end || a.start).length === 10 || mixed;
  let dates;
  if (allDay) {
    const start = (a.kind === "event" ? a.start || a.end : a.end).slice(0, 10);
    const end = new Date((a.kind === "event" ? (a.end || start).slice(0, 10) : start) + "T00:00:00Z");
    end.setUTCDate(end.getUTCDate() + 1);
    dates = [
      `DTSTART;VALUE=DATE:${start.replaceAll("-", "")}`,
      `DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replaceAll("-", "")}`,
    ];
  } else {
    const start = a.kind === "event" ? a.start || a.end : a.end;
    dates = [
      `DTSTART:${stamp(start)}`,
      ...(point || a.kind !== "event" ? [] : [`DTEND:${stamp(a.end)}`]),
    ];
  }
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SNU Bridge//Student action//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${a.id}@snu-bridge`,
    `DTSTAMP:${stamp(now)}`,
    ...dates,
    `SUMMARY:${escapeICS(a.title)}`,
    `DESCRIPTION:${escapeICS("Conditional action — check whether this applies to you. " + (mixed ? "This date-only calendar entry represents an interval with mixed precision. Check the source for the stated exact time. " : "") + (point ? "The source gives a start but no end time. " : "") + (allDay && !mixed ? "The source does not state an exact cutoff time. " : "") + "AI draft; verify the current source. This is a one-time calendar copy, not an updating subscription.\n" + (a.source_url || a.notice?.source_url || ""))}`,
    `URL:${a.source_url || a.notice?.source_url || ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
