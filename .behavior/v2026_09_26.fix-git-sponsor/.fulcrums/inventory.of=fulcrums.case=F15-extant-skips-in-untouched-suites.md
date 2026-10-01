# F15 — the extant skips in suites this branch never touched: fix the host-bound one, leave the llm and upstream-bound ones

- fork: remove every `.skip` / `skipIf` in the repo and make each pass · leave the extant ones,
  each with its recorded reason
- raised by: 5.3 verification, self review `has-zero-test-skips`; the stone reads "skipped test →
  remove the skip and make it pass NOW"
- taken: **fix every skip that a hermetic test can close; leave the ones no code change can close**

## fixed in this branch

| site | was | now |
|---|---|---|
| mechanic `git.branch.rebase.take` `[case12][t2]` | `then.skipIf(isYarnInstalled)` — skipped on any host with yarn, this one included | a fake `yarn` on PATH fails the way yarn does with no `package.json`, as `[t0]` already does for pnpm. runs on every host. its snapshot now pins the yarn-present failure path the case is named for (it had pinned "yarn not found", from a host without yarn). proof: 17 passed, 0 skipped |

## run on this host — not skipped here

| site | guard | on this host |
|---|---|---|
| `git.branch.rebase.lock` ×5 | `then.runIf(isPnpmAvailable \| isYarnAvailable)` | pnpm + yarn present → all run |
| `git.repo.test.play` `[case18]`, `[case19]` | `given.skipIf(!!process.env.CI)` | no `CI` → both run |
| `cicd.deflake/detect` | `then.runIf(isGhAuthenticated)` | runs where gh is authenticated |

## left in place — no code change in this repo can close them

| file | skip | why it stays |
|---|---|---|
| `.evals/eval/runReviewEval`, `compareBrains` | `describe.skip` | the compiled `require()` cannot load the esm-only anthropic sdk; closes with an upstream rhachet loader fix |
| librarian `compress.via.bhrain.perfeval` | `describe.skip` | a 90-minute eval (1128 compressions) — an eval, not a test |
| librarian `compress.via.bhrain.contract`, `extractKernels` ×2, `compress.via.llmlingua`, `brief.compress`, `cluster`, `domain.operations/kernelize/clusterKernels` | `describe.skip` | snapshots of unpinned llm output. revived, each is a flake by construction — the stone's "if a test is flaky — fix it" forbids that too |
| librarian `restoreKernels` | `describe.skip` | a provider moderation false positive on benign docs |
| librarian `brief.condense` (+ one `when.skip`) | `describe.skip` | waits on a test-fns `repeatably` feature; llm variance |
| mechanic `boot.yml.integration` (the CLI describe) | `describe.skip` | needs a built rhachet cli + `.agent` symlinks that CI does not create — revived, it passes here and fails in CI |

- rework: dirty for the left-in-place set — each needs an upstream fix, a provider change, or a
  pinned llm, per owner (librarian, evals); clean for the one fixed
- confidence: 75% — the stone admits no carve-out; a council may rule the llm suites must be
  rewritten against a fixed brain, which is a separate wish per owner
