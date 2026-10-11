# F48 — a hung openrouter brain call times out at 60s and retries once

## .the fork

- **retry once:** wrap each kernelize/compress ask in `withRetry(withTimeout(…, 60s))`, as
  `imagineIsContentAdmissible` already does; suites bound two attempts at 180s
- **raise the threshold:** give each ask 120–170s and no retry
- **retry ci only:** rerun the failed shard until the tail misses

raised at release: openrouter's `deepseek/flash` answers this repo's asks in ~13s or hangs past 60s.
three ci runs in a row each lost one ask to a hang (`clusterKernels`, then two `checkRetention`
cases). the swap off fireworks is forced — that account is suspended (`blocker/5.3.verification.md`).

## .taken — retry once, and why at the time

- a measured hang never answered inside 60s, while a normal ask answered in 13s; a longer threshold
  only waits longer on a host that will not answer
- the retry pattern already guards `guardBorder`; six call sites share one defect class, so all six
  take it
- no clamp test: the retry is `wrapper-fns`' own behavior, and a hang is only reproducible with a
  faked brain, which the integration suites forbid

## .why the confidence is low

- a hang that recurs across both attempts (seen once locally, two attempts back to back) still fails
- the root cause is the upstream provider choice per ask; F43's reseed owns it

## .rework

**clean** — drop the `withRetry` wrap, or raise the threshold instead.

## .confidence — 70%

## .where

- `src/domain.operations/kernelize/{extractKernels,clusterKernels}.ts`
- `src/domain.roles/librarian/skills/brief.compress/compress.via.bhrain.ts`
- `clusterKernels.integration.test.ts`, `checkRetention.integration.test.ts` — 180s hang guard
