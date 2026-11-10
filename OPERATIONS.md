# SNU Bridge operations and handover

## Canonical product

Public website: https://ianyeoh0204.github.io/snu-bridge-students/
Public source: https://github.com/ianyeoh0204/snu-bridge-students
Local checkout: `public-site/` inside the independent SNU Bridge folder.

The static website, source collector and daily cloud workflow are independently transferable. No student database is required. The separate `app/` Sites snapshot and browsing plugin do not automatically follow this public checkout. Do not overwrite the live data by re-exporting an old snapshot.

## Cloud lifecycle

`.github/workflows/daily.yml` requests 07:17 KST daily and supports a manual run. Scheduled collection, build and public deployment were observed on 10 November: https://github.com/ianyeoh0204/snu-bridge-students/actions/runs/42753750217 . That run did not generate paid English drafts. Report collection, generation and publication separately.

The workflow collects bounded official HTML, refreshes the English-board evidence, runs tests, prepares a generation plan, and commits its budget reservation **before** calling a model. It then saves accepted drafts or individual review failures, exports data, checks and publishes. Both publication workflows share one concurrency group. A failed source read or build preserves the last good website; it must not be described as an empty successful scan.

The public library starts with 25 drafts. The collector knows additional sources; missing English versions are explicitly listed on the homepage. Do not claim complete semester or university coverage.

## Approved generation budget

The owner approved a separate US$10 token-cost cap for 30 days beginning 10 November 2026. The policy expires at 2026-12-10 05:25:50 UTC (14:25:50 KST); no automatic renewal. This is separate from the completed US$3 trial. No paid daily-generation call had been made when this release was prepared.

`data/generation-policy.json` selects SNU BAZE GPT-6.1 Sol, initially one new/changed notice per run. `data/generation-ledger.json` retains conservative reservations for every planned part, including failed or interrupted calls. Input bytes and the output token limit bound each reservation. Existing current briefs cost nothing. A repeated run ID or already attempted source version cannot spend again automatically. Long notices are divided by degree, with the full source supplied to every part. All parts must validate before that notice is published.

Confirmed returned usage releases unused reservation bounds. Failed or interrupted requests keep their bounds. The US$10 figure is a token-cost bound, not a guarantee about tax, currency conversion or gateway credit charges. Keep any provider account limit as well. Do not reset the ledger or erase a failure to make the workflow retry. Expiry, missing credentials or exhaustion stops paid generation but allows source updates and publication.

## SNU BAZE provider

The owner selected SNU BAZE for both coding and website generation, using OpenAI GPT models. The key's model list verified `gpt-6.1-sol` at USD 2 input / 10 output per million tokens on 10 November. Production rechecks model availability and pricing before reserving paid work. Price increases, missing models or authentication failure stop generation before a request.

The website uses repository secret `BAZE_API` and sends it only to `https://api.baze.co/v1/gateway`. GPT Responses requests contain the public source text, a strict output schema, a 16,000-token output bound, no tools and `store:false`. A complete model response still has to pass source/date validation. The personal Anthropic provider is no longer used by the daily workflow.

The temporary setup form is only on the owner's Mac. It writes the key to the encrypted GitHub secret; local Keychain storage was declined. Keys must never appear in source, public artifacts or chat. A provider-backed cloud run must still be observed before claiming automatic English generation works. Keep SNU's actual quota, external-use policy and post-finals availability distinct from the implementation.

The optional local Codex launcher uses per-run BAZE provider settings and asks for a key for each new session. It does not switch the provider of an already-running desktop chat. The website's cap does not meter independent interactive coding sessions.

## Failure recovery

1. Inspect the failed workflow and `data/automation-status.json`, `generation-queue.json` and `generation-ledger.json`.
2. For 401/403/429, correct the account/model/quota issue; the runner stops further requests and retains reservations. Do not blindly rerun paid work.
3. For incomplete, invalid or ungrounded output, read the retained diagnostic artifact (14 days) and current original. The failed notice is not published. A different eligible notice can still succeed.
4. If a cloud run stops after reserving but before saving results, the next preparation surfaces that source version for review. It does not reclaim uncertain spending or automatically repeat it.
5. A deliberate new attempt needs an explicit recorded retry decision and a new reservation within the remaining approved cap. The current release intentionally has no automatic retry override.
6. Pull `origin/main` before local edits because successful cloud runs commit data. Rebase or fast-forward carefully; never force-push away the ledger or new sources.

## Audit maintenance

Run `node scripts/audit-english.mjs` to fetch the bounded English corpus and selected Korean sources. Full working bodies are ignored under `audit-runs/`; the public `english-coverage.json` contains short evidence, provenance and limitations. Comparisons in `english-audit-review.json` are AI-assisted content judgments, not Korean-reader sign-offs. Changed corpus/source hashes invalidate previous absence findings. Review actual content before updating judgments; never update hashes alone to keep old claims visible.

The initial audit covers 22 English-board posts dated 2026 and 14 selected procedures. It does not read linked files/images, establish translation delay, measure university-wide coverage or measure office workload. The public evidence page includes positive English examples and English-labelled attachments.

## Review, student pilot and distribution

Run `npm test` and `npm run build` before publication. The release has 37 meaningful regressions for source changes, dates, budget boundaries, interrupted runs, evidence validity and update feeds. Passing them is not semantic review.

Use the private 30-notice review pack and five-student protocol before reporting accuracy or time savings. The old invitation-code study site remains paused. Keep responses and reviewer identity private. The plugin remains an optional access-limited extension; a public homepage and ChatGPT question handoff work without installing it. Do not claim a successful second-student plugin installation or weekly scheduled plugin run until tested.

A transfer archive should include this public source, lockfile, workflows, prompt/validation logic, example data, tests, evidence method and this handover. Exclude keys, private proposals, student responses, full audit working caches, Git metadata, dependencies and model raw-output diagnostics. The archive is a development handover, not a claim of a completed reviewed competition submission.
