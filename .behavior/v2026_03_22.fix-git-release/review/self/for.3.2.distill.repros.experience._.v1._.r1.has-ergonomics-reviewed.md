# review.self: has-ergonomics-reviewed

## the artifact reviewed

file: `.behavior/v2026_03_22.fix-git-release/3.2.distill.repros.experience._.v1.i1.md`

i re-read the ergonomics review section (lines 199-210) and verified each journey against input/output ergonomics.

---

## ergonomics review verification

### journey 1: plan mode (feat → main)

**input ergonomics** (line 203):
- "natural — no flags needed"
- verified: snapshot at line 30 shows `$ rhx git.release` with zero flags
- the default (no flags) does the most common action (check status of current branch)

**output ergonomics** (line 203):
- "natural — status tree"
- verified: snapshot at lines 36-39 shows uniform `🌊 release:` header with tree structure
- check status `👌`, automerge status `🌴`, hint — all visible at a glance

**friction notes**: none claimed, none found.

---

### journey 2: watch mode (feat → main with inflight)

**input ergonomics** (line 204):
- "natural — single flag"
- verified: snapshot at line 69 shows `$ rhx git.release --watch`
- one flag (`--watch`) is minimal input for observation behavior

**output ergonomics** (line 204):
- "natural — poll lines"
- verified: snapshot at lines 79-82 shows exactly 3 `💤` poll lines before `👌`
- each poll line shows `N left, Xs in action, Xs watched` — consistent format

**friction notes**: none claimed, none found.

---

### journey 3: apply mode (feat → main)

**input ergonomics** (line 205):
- "improved — `--apply` alias"
- verified: snapshot at line 44 shows `$ rhx git.release --apply`
- `--apply` (7 chars) vs `--mode apply` (12 chars) — 42% fewer characters
- the vision (line 40-46 of 1.vision.md) confirms `--apply` is alias for `--mode apply`

**output ergonomics** (line 205):
- "natural — clear status"
- verified: snapshot at lines 50-54 shows automerge `[added]` annotation
- watch completion shows `✨ done!` — clear terminal state

**friction notes**: "`--mode apply` still works" — backwards compat preserved.

---

### journey 4: prod release (feat → prod)

**input ergonomics** (line 206):
- "natural — `--into prod`"
- verified: snapshot at line 100 shows `$ rhx git.release --into prod --apply`
- two flags for the most complex operation — minimal for the scope

**output ergonomics** (line 206):
- "natural — chain visible"
- verified: snapshot at lines 106-125 shows all 3 transports sequentially
- each transport uses same `🌊 release:` shape — uniform mental model
- `🫧 and then...` transitions make the chain explicit

**friction notes**: none claimed, none found.

---

### journey 5: from main (skip feat branch)

**input ergonomics** (line 207):
- "natural — `--from main`"
- verified: the vision (lines 55-57 of 1.vision.md) confirms `--from main` skips feature branch
- inference rules (domain distill lines 106-119) show 12 scenarios all natural

**output ergonomics** (line 207):
- "natural — skips feat"
- verified: when `--from main`, no feature-branch transport is shown
- starts directly at release-branch transport

**friction notes**: none claimed, none found.

---

### journey 6: retry (recover from failure)

**input ergonomics** (line 208):
- "natural — `--retry`"
- verified: snapshot at line 158 shows `$ rhx git.release --retry`
- single flag to recover from transient failures

**output ergonomics** (line 208):
- "natural — shows rerun"
- verified: snapshot at line 169 shows `👌 rerun triggered` annotation
- failure output gives sufficient context to diagnose without excess detail

**friction notes**: none claimed, none found.

---

## overall assessment (line 210)

the artifact claims: "input ergonomics improved by `--apply` alias and `--into` clarity"

**verified**:
- `--apply` alias reduces typing by 42% for the most common mutation action
- `--into` replaces `--to` per wish requirement — clearer destination semantics
- all journeys have natural input ergonomics (0-2 flags for common operations)
- all journeys have natural output ergonomics (uniform tree structure)

---

## summary

| journey | input | output | friction |
|---------|-------|--------|----------|
| plan mode | ✅ zero flags | ✅ status tree | none |
| watch mode | ✅ single flag | ✅ poll lines | none |
| apply mode | ✅ alias shortcut | ✅ clear status | backwards compat |
| prod release | ✅ two flags | ✅ chain visible | none |
| from main | ✅ explicit flag | ✅ skips feat | none |
| retry | ✅ single flag | ✅ shows rerun | none |

**no ergonomics issues found.** the artifact accurately assessed each journey.

