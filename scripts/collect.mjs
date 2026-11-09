import fs from "node:fs/promises";
import { collect, staleBriefs } from "../lib/pipeline/collector.mjs";
const args = process.argv.slice(2),
  urls = [];
let pages = 8,
  limit = 30,
  since = null,
  all = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--url") urls.push(args[++i]);
  else if (a === "--url-file")
    urls.push(...JSON.parse(await fs.readFile(args[++i], "utf8")));
  else if (a === "--pages") pages = Number(args[++i]);
  else if (a === "--limit") limit = Number(args[++i]);
  else if (a === "--since") since = args[++i];
  else if (a === "--all") all = true;
  else throw new Error("Unknown argument: " + a);
}
if (
  !Number.isInteger(pages) ||
  pages < 1 ||
  pages > 30 ||
  !Number.isInteger(limit) ||
  limit < 1 ||
  limit > 200
)
  throw new Error(
    "Bound collection to 1–30 list pages and 1–200 detail reads.",
  );
const previous = JSON.parse(await fs.readFile("data/notices.json", "utf8"));
const result = await collect({
  previous,
  urls,
  pages,
  limit,
  since,
  all,
  onProgress: (p) => console.log(JSON.stringify(p)),
});
await fs.mkdir("data/history", { recursive: true });
const stamp = result.report.checked_at.replace(/[:.]/g, "-");
await fs.writeFile(
  "data/history/" + stamp + ".json",
  JSON.stringify(result.report, null, 2),
);
await fs.writeFile(
  "data/notices.json",
  JSON.stringify(result.records, null, 2) + "\n",
);
await fs.writeFile(
  "data/collection-status.json",
  JSON.stringify(result.report, null, 2) + "\n",
);
try {
  const b = JSON.parse(await fs.readFile("data/briefs.json", "utf8"));
  await fs.writeFile(
    "data/briefs.json",
    JSON.stringify(staleBriefs(b, result.records), null, 2) + "\n",
  );
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
console.log(JSON.stringify(result.report));
if (result.report.failures.length) process.exitCode = 2;
