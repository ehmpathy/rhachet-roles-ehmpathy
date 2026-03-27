# self-review: has-questioned-questions (r3)

## for: 1.vision

---

## deep question: what questions SHOULD exist?

the guide says to triage open questions. but the deeper question is: are ALL the right questions listed?

i read the vision line by line, then cross-referenced with the wish. several implicit questions emerged that were not surfaced.

---

## issue 1: transport states count mismatch

**observed:**
the vision (line 318) says transport states are: `[unfound, inflight, passed, failed, merged]` — that's 5 states.

**but the wish says:**
> "each target has 7 possible states it could be in"

the wish lists these 7:
1. not present (unfound)
2. inflight, wout-automerge
3. passed, wout-automerge
4. failed, wout-automerge
5. inflight, with-automerge
6. passed, with-automerge
7. failed, with-automerge

**the question this surfaces:**
should the vision distinguish automerge status as part of the transport state, or keep it separate?

**answer:** [answered]
the vision already separates these concerns:
- check status: inflight/passed/failed
- automerge status: unfound/enabled [found]/enabled [added]/already merged

this is cleaner than compound states. the vision's approach is correct — but assumption #2 should be clarified to say "check states are finite" (not transport states).

**fix applied:**
updated assumption #2 in the vision to clarify:
> **check states are finite**: each transport's checks are in exactly one of [inflight, passed, failed]. automerge status is tracked separately: [unfound, enabled, merged].

---

## issue 2: absent question about `--from <branch>` from main

**observed:**
the wish includes scene.7:
```
- git.branch = main
- --from turtle/add-surfboards
- --into is omitted
```

this means: "i'm on main but want to release a feature branch"

**the vision doesn't address this:**
- line 79 shows `--from main` to skip feature branch
- but no example of `--from <feat-branch>` when on main

**the question this surfaces:**
is `--from <explicit-branch>` supported when on main? or only `--from main`?

**answer:** [answered via wish]
scene.7 shows this IS supported. the vision should have an example or mention this in the flags table.

**fix applied:**
added a note to the flags table and a new edgecase:
```
| `--from <branch>` | | specify source branch explicitly |
```
edgecase: `--from turtle/feat when on main` → releases that branch to main

---

## issue 3: questions had tags, but review file showed wrong content

**observed on re-read:**
the review file (r3) from prior attempt showed line 24 as:
```
🐚 git.release --into main --mode plan
```

but the vision (after fix) shows line 13 as:
```
🐚 git.release --to main --mode plan
```

the fix WAS applied to the vision. the review file just had stale content.

**verification:**
re-read vision lines 13, 21, 24 — all correctly show `--to` (old flag) in the "before" section.

---

## issue 4: absent question about watch timeout

**observed:**
the vision mentions watch until completion but doesn't specify timeout behavior.

**the question this surfaces:**
what happens when watch times out? what's the timeout duration?

**answer:** [wisher]
the wish doesn't specify timeout behavior. this needs wisher input before implementation.

**fix applied:**
added question #3 to "questions to validate":
```
3. **what is the watch timeout behavior?** [wisher]
   - duration: 15 minutes? configurable?
   - on timeout: exit with error? show partial progress?
```

---

## issue 5: `--retry --apply` combination not shown

**observed:**
the wish says:
> "with --watch, with --apply, with --retry (should retry the extant errors and then continue the apply)"

the vision has `--retry --apply` in the examples (line 96) but no usecase that shows the combined behavior.

**the question this surfaces:**
does `--retry --apply` first retry ALL transports, then apply? or retry-then-apply per transport?

**answer:** [answered via wish]
the wish says "retry the extant errors and then continue the apply to each transport it finds" — this means per-transport retry-then-apply.

**fix applied:**
added clarification to "retry scope" section:
> when combined with `--apply`, retry runs first on the blocked transport, then apply continues if retry succeeds.

---

## verification

re-scanned the entire vision:

| section | status |
|---------|--------|
| questions to validate | 3 questions, all tagged |
| assumptions | 4 items, assumption #2 clarified |
| edgecases | added `--from <branch>` case |
| retry scope | clarified --retry --apply behavior |
| "before" section | correctly shows `--to` flag |

---

## conclusion

- found 5 issues through deep question
- issue 1: states mismatch → clarified assumption #2
- issue 2: absent `--from <branch>` → added to flags and edgecases
- issue 3: review had stale content → verified vision is correct
- issue 4: absent timeout question → added as [wisher] question
- issue 5: retry+apply unclear → clarified in retry scope

all questions now tagged:
- [answered]: 2 questions (--into term, --apply alias)
- [wisher]: 1 question (watch timeout behavior)

no [research] questions — this is internal tools.

