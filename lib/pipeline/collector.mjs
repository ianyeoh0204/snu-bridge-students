import { createHash } from "node:crypto";
import { fetchHTML, parseListing, parseSource } from "../bridge/sources.mjs";
export const boards = {
  ece: {
    key: "ece",
    url: "https://ece.snu.ac.kr/community/academics",
    idParameter: "bbsidx",
  },
  english: {
    key: "ece-english",
    url: "https://ece.snu.ac.kr/en/community/notice",
    idParameter: "bbsidx",
  },
};
export const digest = (value) =>
  createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value))
    .digest("hex");
export function canonicalURL(raw) {
  const u = new URL(raw);
  u.hash = "";
  u.searchParams.delete("page");
  u.searchParams.delete("hl");
  u.searchParams.sort();
  return u.href;
}
// IDs identify a source, never an English equivalent. New departments supply their own extractor.
export function recordID(url, config = boards.ece) {
  const u = new URL(url);
  return (
    config.extractID?.(u) ||
    u.searchParams.get(config.idParameter) ||
    "url-" + digest(canonicalURL(url)).slice(0, 20)
  );
}
export function material(source) {
  return {
    title: source.title,
    blocks: source.blocks,
    attachments: source.attachments.map((a) => ({
      name: a.name,
      url: a.source_url,
    })),
    images: source.images.map((i) => i.source_url),
  };
}
export function revisedRecord(previous, source, listing = {}) {
  const hash = digest(material(source));
  const changed = Boolean(
    previous?.source_hash && previous.source_hash !== hash,
  );
  return {
    ...previous,
    id: previous?.id || recordID(source.source_url),
    korean_title: source.title,
    posting_date: listing.date || previous?.posting_date || null,
    source_url: canonicalURL(source.source_url),
    source_hash: hash,
    source_checked_at: new Date().toISOString(),
    original: source.blocks.map((b) =>
      b.kind === "text"
        ? { t: "p", text: b.text }
        : b.kind === "table"
          ? { t: "table", rows: b.rows }
          : { t: "image", url: b.source_url },
    ),
    attachments: source.attachments,
    images: source.images,
    links: source.links,
    reading_status: source.reading_status,
    changes: changed
      ? [
          ...(previous.changes || []),
          {
            at: new Date().toISOString(),
            previous_hash: previous.source_hash,
            source_hash: hash,
          },
        ].slice(-12)
      : previous?.changes || [],
  };
}
export async function collect({
  previous = [],
  urls = [],
  pages = 8,
  since = null,
  limit = 30,
  fetcher = fetch,
  all = false,
  onProgress = () => {},
} = {}) {
  const map = new Map(previous.map((n) => [canonicalURL(n.source_url), n]));
  const candidates = new Map();
  const failures = [];
  let scannedPages = 0;
  if (!urls.length) {
    for (let p = 1; p <= pages; p++) {
      const u = boards.ece.url + (p === 1 ? "" : "?page=" + p);
      try {
        const rows = parseListing(await fetchHTML(u, fetcher), u);
        scannedPages++;
        for (const row of rows) {
          if (
            !since ||
            row.date.replaceAll(".", "-") >= since ||
            map.has(canonicalURL(row.source_url))
          )
            candidates.set(canonicalURL(row.source_url), row);
        }
      } catch (e) {
        failures.push({ url: u, error: e.message });
        break;
      }
    }
  }
  for (const url of urls)
    candidates.set(canonicalURL(url), { source_url: url });
  const selected = [...candidates.values()]
    .sort((a, b) => {
      const pa = map.get(canonicalURL(a.source_url)),
        pb = map.get(canonicalURL(b.source_url));
      return (
        Number(Boolean(pa)) - Number(Boolean(pb)) ||
        String(pa?.source_checked_at || "").localeCompare(
          pb?.source_checked_at || "",
        )
      );
    })
    .slice(0, all ? 1000 : limit);
  const updated = [],
    added = [],
    unchanged = [];
  for (const row of selected) {
    const url = canonicalURL(row.source_url);
    try {
      const parsed = parseSource(await fetchHTML(url, fetcher), url);
      const prev = map.get(url);
      const next = revisedRecord(prev, parsed, row);
      map.set(url, next);
      (!prev
        ? added
        : prev.source_hash === next.source_hash
          ? unchanged
          : updated
      ).push(next.id);
      onProgress({
        id: next.id,
        status: !prev
          ? "new"
          : prev.source_hash === next.source_hash
            ? "unchanged"
            : "changed",
      });
    } catch (e) {
      failures.push({ url, error: e.message });
      onProgress({ url, status: "failed" });
    }
  }
  if (!selected.length && !failures.length)
    failures.push({
      error:
        "No source candidates found; scan is not a successful empty update.",
    });
  return {
    records: [...map.values()],
    report: {
      started_scope: {
        listing_pages: pages,
        since,
        requested_urls: urls.length,
        detail_limit: all ? selected.length : limit,
      },
      checked_at: new Date().toISOString(),
      scanned_pages: scannedPages,
      checked_details: added.length + updated.length + unchanged.length,
      added,
      updated,
      unchanged,
      failures,
      status: failures.length ? "partial_or_failed" : "succeeded",
      edit_detection:
        "Only successfully fetched detail pages are checked for edits. Older/unfetched pages are not covered by this run.",
    },
  };
}
export function staleBriefs(briefs, notices) {
  const map = new Map(notices.map((n) => [n.id, n]));
  return briefs.map((b) => ({
    ...b,
    source_changed: Boolean(
      map.get(b.notice_id) &&
        b.source_hash !== map.get(b.notice_id).source_hash,
    ),
  }));
}
