# SNU Bridge — ECE student essentials

A public English information service for SNU ECE students: degree-filtered actions, a searchable English notice library, source-linked newcomer guidance and an optional ChatGPT question handoff. Students can read it without an account, plugin or API key.

- Student homepage: https://ianyeoh0204.github.io/snu-bridge-students/
- Project presentation and poster QR destination: https://ianyeoh0204.github.io/snu-bridge-students/project/
- Evidence behind the English information gap: https://ianyeoh0204.github.io/snu-bridge-students/evidence/
- Optional update feeds: https://ianyeoh0204.github.io/snu-bridge-students/updates/

## Run, verify and transfer

Use Node 22.13 or later. Run `npm ci`, `npm test`, then `npm run build`. The build exports the data, checks source quotations and produces a portable `public-build/` directory. Any static host can serve it. `npm run dev` starts a local preview. See [OPERATIONS.md](OPERATIONS.md) for cloud setup, budget controls, failure recovery and handover.

As of 11 November 2026, the product has 34 English AI drafts, including the ten proposal evaluation notices and the two September examples. The scheduled cloud run added three drafts and held two rejected outputs for review. Earlier collection discovered a new notice and detected replacement attachment links on an existing notice. The source files themselves remain unread. The private 30-case review pack now has a draft for every selected case, with no independent reviews completed. Counts grow only after successful generation. English briefs are action summaries, not complete official translations or independently reviewed guidance. No personal profile is sent to a server. Student feedback collection is separate and paused.

## Daily operation

The cloud schedule requests an update at 07:17 Asia/Seoul; GitHub can delay schedules. A real scheduled collection/build/publication run succeeded on 10 November 2026. SNU BAZE GPT-6.1 Sol generation is now enabled, using the encrypted BAZE_API repository secret. A manual cloud run completed collection, generation, validation and publication on 10 November: https://github.com/ianyeoh0204/snu-bridge-students/actions/runs/42769277215 . A scheduled invocation with generation enabled completed on 11 November, publishing three accepted drafts and retaining two validation failures: https://github.com/ianyeoh0204/snu-bridge-students/actions/runs/42942412073 . The cap is US$10 estimated token cost through 10 December 2026, 14:25:50 KST, with no renewal; initial activation accounted for US$0.084206. See the ledger and operations guide for current usage.

The collector reads at most eight listing pages and thirty detail pages per run, rotating older checks. Only successfully read detail pages are checked for edits. A changed source invalidates the saved English brief and removes its old action dates from the current board. Missing and changed briefs enter the generation queue; current source versions are reused without paid calls. One rejected model result is kept for review while unrelated notices continue. Collection/build failure keeps the last live publication.

Specific fetch: `npm run collect -- --url FULL_OFFICIAL_URL` (repeatable), or `--url-file FILE.json` with an array of full URLs. `--since YYYY-MM-DD` filters candidates; it does not prove complete historical coverage. Record identity is configured per board, falling back to a URL hash. IDs are never used to decide translation equivalence.

## Evidence and limits

The dated audit reads 22 English-board HTML posts from 2026 and compares 14 purposefully selected academic procedures. It compares content, audience, period and actions. English attachments and bilingual posts remain visible as counterevidence. No random-sample coverage percentage or translation-delay statistic is claimed. Source-version changes withhold the earlier absence judgments until they are checked again.

Scope is ECE academic HTML. Images, PDFs, HWP and other attachments are inventoried but not automatically read; ECE’s `/webdata` restriction is respected. Unknown dates remain unknown. A course-flow diagram is unofficial; mandatory prerequisite examples are separately linked to official sources and cohort conditions. This is not a complete graduation audit.

Calendar exports are one-time copies. Optional Atom feeds follow English additions and source changes, with degree-specific subscriptions in the student’s own reader. Feeds are not personal deadline reminders or guaranteed email delivery. The site does not subscribe anyone automatically.

This repository contains independently authored product code and public notice evidence. It excludes application documents, private student responses, invitation codes, credentials and the raw peer-supplied image. SNU Bridge is an independent student project; the current official notice controls.

## Project presentation

`/project/` is a separate, scroll-driven explanation of the product for a poster QR or walkthrough. The student homepage stays focused on student actions. Wide, sufficiently tall screens show a pinned Korean-notice-to-English sequence; mobile, reduced-motion and no-JavaScript views retain a readable document. There is no video or simulated model-processing indicator.

The example uses notice 58022 and explicitly labels its September 2026 submission window as historical and its English explanation as unreviewed. The build withholds that example if its saved source version, required quotes or brief freshness change. Counts and the collection date come from current public data on every build. Independent review and student-trial results are not claimed.
