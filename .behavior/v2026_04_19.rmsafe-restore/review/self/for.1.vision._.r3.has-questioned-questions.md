# self-review r3: has-questioned-questions

slowed down. tea. fresh eyes on each question.

---

## found issues

### issue: path structure was triaged as [wisher] but can be answered

**what I found:**
- r2 marked path structure as [wisher] — "aesthetic choice"
- but on deeper reflection: mirrored structure is clearly better
- no strong argument for flat structure
- this isn't a preference question, it's a usability question

**why this was wrong:**
- I deferred to wisher out of caution
- but the answer is derivable from first principles
- mirrored = intuitive, browsable, matches mental model
- flat = harder to navigate, encodes path awkwardly

**how it was fixed:**
1. changed triage from [wisher] to [answered: mirrored structure]
2. updated vision: removed path structure from wisher questions
3. vision already has "path structure preserved" in assumptions — this is sufficient

---

## non-issues (why they hold)

### timestamped trash remains [wisher]

**why it holds as [wisher]:**
- no objective "right answer" — genuine tradeoff
- timestamp = keeps history but grows disk, adds complexity
- overwrite = simple but loses prior versions
- depends on wisher's tolerance for complexity vs data preservation
- cannot derive answer from logic or docs

---

### auto-cleanup remains [wisher]

**why it holds as [wisher]:**
- no objective "right answer" — genuine tradeoff
- auto = bounded disk but risk of losing "old" trash user wanted
- manual = unbounded but user controls when to clean
- depends on wisher's preference for automation vs control
- could research industry patterns but decision is preference-based

---

### dedicated restore remains [answered]

**why it holds as [answered]:**
- wish.md explicitly says "(i.e., cpsafe out of the trash cache)"
- wisher already answered this — use cpsafe
- no ambiguity, no interpretation needed

---

### worktrees remains [answered]

**why it holds as [answered]:**
- verified via inspection: worktree has own `.agent/` dir
- `git rev-parse --show-toplevel` returns worktree root
- answer derivable from code + inspection
- trash at worktree root is correct behavior

---

## final triage

| question | triage | rationale |
|----------|--------|-----------|
| timestamped trash | [wisher] | genuine preference, no objective answer |
| auto-cleanup | [wisher] | genuine preference, no objective answer |
| path structure | [answered] | mirrored is clearly better UX |
| dedicated restore | [answered] | wisher explicit in wish.md |
| worktrees | [answered] | derived from code inspection |

---

## changes made to vision

1. removed path structure from wisher questions (was already answered)
2. 2 questions remain for wisher: timestamps and auto-cleanup
3. all other questions answered and documented in assumptions
