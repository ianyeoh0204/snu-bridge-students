# SNU Bridge — ECE student essentials

An independent English information service for SNU ECE students: a useful homepage before a chat, conditional actions by degree, a searchable English brief library, source-linked degree guidance and course-prerequisite examples. Optional ChatGPT handoff copies the notice URL, degree and evidence requirements into a reusable question. Plugin access is not required to read the site.

## Run and hand over

Node 22.13 or later. Run `npm ci`, `node scripts/export-student-data.mjs`, `npm test`, then `npm run dev`. `npm run build` creates the portable static site in `public-build/`. Serve it on any static host. No database, account or model API key is required to read the published briefs.

Source collection: `npm run collect -- --pages 8 --limit 30`. Specific notices: repeat `--url FULL_OFFICIAL_URL`, or use `--url-file FILE.json` with a JSON array of full URLs. `--since YYYY-MM-DD` filters listing candidates; it is not proof of a complete backfill. Detail refreshes are bounded and oldest checked candidates rotate first. Only fetched pages are checked for edits. Source IDs are per-board configuration; a URL hash is used when no stable ID is available. IDs never determine translation equivalence.

The daily workflow is configured for 07:17 Asia/Seoul, subject to GitHub scheduling delays. It fetches official HTML, detects changes, queues missing English drafts, validates, builds, saves data and publishes. A failed collection/generation/build prevents deployment and preserves the last live site. Images and attachments are listed but not downloaded; ECE's `/webdata` exclusion is respected. An edited source invalidates its old English brief and removes stale action dates from the current board until regenerated.

## Unattended English generation

No paid model call is made without all three settings. Configure repository variables `BRIDGE_LLM_ENDPOINT` (the complete HTTPS chat-completions endpoint) and `BRIDGE_LLM_MODEL`, and repository secret `BRIDGE_LLM_API_KEY` only after choosing and approving the provider. This adapter expects an OpenAI-compatible JSON response protocol. An SNU gateway must be checked for protocol, permitted external use, limits and post-finals access; compatibility is not assumed. The default workflow limits generation to four notices per run and each request has bounded input/output. These limits do not guarantee a monetary cap; configure the provider's budget as well.

Without the provider settings, collection and publication can still run, and the website honestly shows that English generation awaits configuration. Do not claim daily English translation is operational until a real provider-backed run has been tested. Current briefs are original AI-written action summaries, not full official translations or independently reviewed content. Quote checks do not prove correct interpretation.

## Coverage and limits

ECE academics only. The initial release has 25 original English briefs, including ten proposal evaluation notices plus the two flagship September examples. Archived dates are explicitly historical. Degree filters do not certify eligibility. Missing attachment-only dates remain unknown. Calendar exports are one-time copies, not updating reminders. The peer course map is unofficial; mandatory prerequisites are sourced separately, including AND/OR logic and cohort conditions.

The English-board comparison is a bounded content audit, not an ID match or a subtraction of board totals. It read 22 English-board HTML posts dated 2026 and compared three procedures on 10 November 2026; attachments were not read. No university-wide coverage percentage, human review or student study result is claimed.

This repository includes only the independently authored web/pipeline code and public notice evidence. It excludes application documents, student study responses, invitation codes, credentials and the supplied raw peer image. University notices remain the authoritative source; this is an independent student project, not an official university service.
