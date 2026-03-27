# review.self: has-critical-paths-identified

## the artifact reviewed

file: `.behavior/v2026_03_22.fix-git-release/3.2.distill.repros.experience._.v1.i1.md`

i re-read the critical paths section (lines 187-195) and verified each against the pit of success criteria.

---

## review of critical paths

### path 1: feat → main plan (most common usage)

**why critical**: this is the read-only status check that mechanics run first. if this fails or shows confusing output, the mechanic cannot proceed. it is the gateway to all other operations.

**evidence from artifact** (lines 28-40): the snapshot shows uniform `🌊 release:` header with clear status tree. no flags required.

| criterion | holds? | why |
|-----------|--------|-----|
| narrower inputs | ✅ | zero flags required. branch context infers `--from feat --into main`. see journey 1 snapshot at line 30: `$ rhx git.release` with no args. |
| convenient | ✅ | the default (no flags) does the most common action. mechanic types 3 words: `rhx git release`. |
| expressive | ✅ | can override inference with `--from`, `--into`, `--from main` to release from any state. flags are additive, not required. |
| failsafes | ✅ | plan mode is read-only — no mutations to PR state. if gh CLI fails, shows error with link. if PR not found, shows `🫧 no open branch pr` with hint. |
| failfasts | ✅ | if no PR, fails immediately with clear message (line 152-153 shows the hint pattern). does not hang or poll forever. |
| idempotency | ✅ | read-only operation. run it 100 times, same result. no side effects. |

**no issues found.** the default plan mode is a safe, read-only pit of success.

---

### path 2: feat → main apply (core mechanic workflow)

**why critical**: this is the action mechanics take most often — enable automerge and watch until merged. if this path has friction, mechanics cannot release autonomously.

**evidence from artifact** (lines 42-55): the snapshot shows automerge added and watch completion.

| criterion | holds? | why |
|-----------|--------|-----|
| narrower inputs | ✅ | single flag: `--apply`. no need for `--mode apply` verbose form. see line 44: `$ rhx git.release --apply`. |
| convenient | ✅ | `--apply` is 7 characters vs `--mode apply` at 12 characters. alias saves typing. also implies `--watch` so mechanic doesn't need both. |
| expressive | ✅ | can combine with `--into prod` for full chain, `--retry` to fix failures first. flags compose naturally. |
| failsafes | ✅ | if automerge enable fails (e.g., branch protection), shows gh error with link. watch continues until timeout or success. |
| failfasts | ✅ | requires commit quota from `.meter/git.commit.uses.jsonc`. if quota exhausted, fails immediately with clear message. does not attempt mutation without permission. |
| idempotency | ✅ | automerge is idempotent: if already enabled, shows `[found]`; if not, shows `[added]`. see vision line ~150. re-run safe. |

**no issues found.** automerge idempotency is the key design insight.

---

### path 3: feat → prod apply (release day workflow)

**why critical**: this is the full release chain used on release day. if any transport in the chain fails without clear feedback, the release is blocked and mechanic cannot recover.

**evidence from artifact** (lines 98-126): the snapshot shows all 3 transports: feat PR → release PR → tag workflows.

| criterion | holds? | why |
|-----------|--------|-----|
| narrower inputs | ✅ | two flags: `--into prod --apply`. see line 100. no need to specify each transport individually. |
| convenient | ✅ | single command releases through 3 transports. mechanic doesn't need to remember transport order. system chains them. |
| expressive | ✅ | can add `--retry` to recover from failures. can use `--from main` to skip feat transport. flags are additive. |
| failsafes | ✅ | if any transport fails, chain stops and shows state. mechanic sees which transport failed and can retry with `--retry`. |
| failfasts | ✅ | each transport fails independently. if feat PR fails, we don't wait for release PR. shows failure and exits. |
| idempotency | ✅ | re-run safe: merged transports show `🌴 already merged` and are skipped. see line 107-108. mechanic can re-run after fix. |

**no issues found.** chain composition with early exit on failure is correct.

---

### path 4: watch inflight (proves responsiveness)

**why critical**: the wish mandates "at least 3 poll cycles" visible. if watch doesn't show progress, mechanic thinks the command is frozen. responsiveness builds trust.

**evidence from artifact** (lines 67-84): the snapshot shows exactly 3 `💤` poll lines before the final `👌`.

| criterion | holds? | why |
|-----------|--------|-----|
| narrower inputs | ✅ | single flag: `--watch`. see line 69. no poll interval or timeout config needed. |
| convenient | ✅ | defaults: 5s poll < 60s, then 15s poll. 15 min timeout. all built-in. mechanic just says "watch". |
| expressive | ✅ | can combine with `--apply` to watch and automerge in one command. |
| failsafes | ✅ | timeout after 15 min. shows partial progress (which checks passed, which inflight). does not hang forever. |
| failfasts | ✅ | if checks fail mid-watch, stops immediately and shows failure details. does not wait for timeout. |
| idempotency | ✅ | without `--apply`, watch is read-only. can re-run to check current state. |

**verified**: lines 79-82 show exactly 3 poll cycles (`💤 1 left...` three times) before line 82 shows `👌 all checks passed`. this matches the wish requirement.

**no issues found.** 3+ poll cycles visible by design.

---

### path 5: retry failed (deflake support)

**why critical**: transient CI failures happen. if mechanic cannot recover without browser, workflow is broken. retry must be one command.

**evidence from artifact** (lines 156-170): the snapshot shows rerun triggered with `👌 rerun triggered` annotation.

| criterion | holds? | why |
|-----------|--------|-----|
| narrower inputs | ✅ | single flag: `--retry`. see line 158. no workflow ID needed — infers from PR's failed checks. |
| convenient | ✅ | mechanic doesn't need to find the workflow ID or go to browser. just `--retry`. |
| expressive | ✅ | can combine with `--watch --apply` to retry, then watch, then automerge. full recovery in one command. |
| failsafes | ✅ | if rerun also fails, shows new failure details. mechanic can investigate or retry again. |
| failfasts | ✅ | if no failed checks to retry, shows status and takes no action. does not error. line 169 shows hint for next step. |
| idempotency | ✅ | re-run same workflow is safe. github accepts duplicate rerun requests. |

**no issues found.** clean recovery path with clear feedback.

---

## what if each critical path failed?

| path | failure mode | user experience |
|------|--------------|-----------------|
| feat → main plan | gh CLI unavailable | shows gh error, exits non-zero |
| feat → main apply | quota exhausted | fails fast with quota error before mutation |
| feat → prod apply | feat transport fails | stops at feat, shows failure, hint to retry |
| watch inflight | timeout | shows partial progress, exits with timeout error |
| retry failed | no failed checks | no-op, shows current status |

all failure modes have clear feedback. no silent failures. no hangs.

---

## summary

all 5 critical paths pass pit of success review.

- **narrower inputs**: all paths use minimal flags (0-2). no verbose required forms.
- **convenient**: defaults do the common action. no config needed.
- **expressive**: flags compose additively. can express complex workflows.
- **failsafes**: all failures show clear feedback with hints.
- **failfasts**: all paths exit early on errors.
- **idempotency**: all mutation paths are idempotent (found vs added).

**no friction found. no issues to fix.**

the design is sound. i verified each claim against the artifact snapshots.

