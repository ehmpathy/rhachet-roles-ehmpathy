# self-review: has-questioned-requirements

## deep review of vision document

i read through 1.vision.md line by line, cross-referenced with 0.wish.md.

## issue found and fixed

### issue: wish uses wrong file extensions

the wish says:
> "took a `pnpm-lock.yml` or a `package-lock.yml`"

but the correct names are:
- `pnpm-lock.yaml` (not .yml)
- `package-lock.json` (not .yml or .yaml)

**fix:** vision uses correct names. the wish has a typo but the vision corrects it. no action needed on vision — but noted for wisher awareness.

## requirements examined

### requirement 1: `git.branch.rebase lock refresh` command

**who said this?** wisher, in 0.wish.md line 7-13

**evidence?**
- wish states "95% of the time, the lock file is now stale and will fail on cicd"
- this matches real-world experience: lock files track dependency resolution state, and after conflict resolution that state is often invalid

**what if we didn't?**
- mechanics hit CI failures
- have to diagnose "why did my lock file fail?"
- run pnpm install manually
- create another commit
- push again
- total waste: 10-30 minutes per occurrence

**scope?**
- one command
- one purpose
- no scope creep

**simpler way?**
- auto-refresh after `take` would be simpler but:
  - `pnpm install` is slow (can be 30+ seconds)
  - unexpected side effects
  - user loses control
- manual command with suggestion is the right balance

**verdict:** requirement holds ✓

---

### requirement 2: proactive suggestion after `take` on lock files

**who said this?** wisher, in 0.wish.md line 9: "recommend that the caller of `git.branch.rebase take` runs that command"

**evidence?**
- without prompt, mechanics may not know to refresh
- the connection between "i took theirs lock" and "now i need to regenerate" is not obvious
- proactive suggestion fills knowledge gap

**what if we didn't?**
- defeats the purpose
- mechanics would need to remember on their own
- same CI failures continue

**scope?** minimal — one extra output line in `take`

**simpler way?** no — a suggestion is the minimum viable intervention

**verdict:** requirement holds ✓

---

### requirement 3: detect package manager automatically

**who said this?** inferred from wish (mentions both pnpm-lock and package-lock)

**evidence?**
- repos use different package managers
- detection is simple: check which lock file extant

**what if we didn't?**
- user would need `--pm pnpm` flag
- extra friction
- error-prone

**scope?** appropriate

**simpler way?**
- pnpm-only would be simpler
- but excludes npm repos
- detection logic is trivial (< 10 lines)

**verdict:** requirement holds ✓

---

### requirement 4: stage the lock file after refresh

**who said this?** not explicit in wish — inferred from rebase flow

**evidence?**
- `git rebase --continue` requires all conflicts staged
- if we refresh but don't stage, user must manually `git add`
- that defeats the purpose of the skill

**what if we didn't?**
- user must remember to stage
- if they forget, rebase continue fails
- frustration

**verdict:** requirement holds ✓

---

### requirement 5: only work in rebase

**who said this?** wish says "when theres an inflight rebase" (line 7)

**evidence?** wish is specifically about rebase scenarios

**what if we didn't?**
- could work after merge conflicts too
- but that's scope creep
- different contexts may need different handling

**verdict:** requirement holds ✓ — but documented as open question for wisher

---

## why these hold

1. **clear provenance**: each requirement traces to wish or necessary implication
2. **minimal scope**: no gold-plating, no "while we're at it" additions
3. **user-centric**: focuses on mechanic's workflow, not implementation convenience
4. **pit of success**: proactive suggestion catches the case before CI fails

## no further issues found

the vision accurately captures the wish. scope is appropriate. no bloat.
