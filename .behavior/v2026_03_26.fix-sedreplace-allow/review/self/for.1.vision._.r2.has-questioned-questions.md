# self-review r2: has-questioned-questions (triage)

## questions from the vision

### question 1: does `permissionDecision: allow` bypass safety heuristics?

**can this be answered via logic now?** no — requires empirical test.

**can this be answered via extant docs?** partially — docs mention `permissionDecision` but don't clarify if it bypasses *heuristics* vs just *permissions*.

**should this be answered via external research later?** yes.

**verdict: [research]** — test needed to verify hook behavior.

---

### question 2: what's the hook execution order?

**can this be answered via logic now?** no.

**can this be answered via extant docs?** check claude code docs for hook lifecycle.

**should this be answered via external research later?** yes — read official docs or source code.

**verdict: [research]** — check docs for hook order relative to heuristic checks.

---

### question 3: are there known bugs with allow?

**can this be answered via extant docs?** yes — we already found github issues.

**answer now:** yes, issue #18312 mentions "permissionDecision ignored when tool in allow list". this is a red flag for the hook approach.

**verdict: [answered]** — yes, bugs extant. hook approach is risky.

---

### question 4: is this sedreplace-specific or all rhx skills?

**does only the wisher know?** yes — only they know their actual usage patterns.

**verdict: [wisher]** — ask wisher about scope.

---

### question 5: does a simple sedreplace run without prompts?

**can this be answered via logic now?** no — requires test.

**can this be answered via extant code?** test it.

**verdict: [research]** — test simple case to verify baseline.

---

## new questions from r2 review

### question 6: does stdin approach bypass heuristics?

**can this be answered via logic now?** probably yes — if arguments come via stdin, they're not in the command string that heuristics scan.

**answer now:** likely yes. heuristics scan the bash command string. stdin content is a separate stream, not part of the command.

**verdict: [answered]** — stdin likely bypasses heuristics. validate with test.

---

### question 7: does sedreplace already support @stdin?

**can this be answered via extant code?** yes — check sedreplace.sh source.

**action:** read sedreplace.sh to verify.

**verdict: [research]** — check sedreplace source for stdin support.

---

## summary of question triage

| question | status | action |
|----------|--------|--------|
| does `permissionDecision: allow` bypass heuristics? | [research] | test hook |
| what's hook execution order? | [research] | check docs |
| are there known bugs with allow? | [answered] | yes, issue #18312 |
| sedreplace-specific or all skills? | [wisher] | ask |
| does simple sedreplace work? | [research] | test |
| does stdin bypass heuristics? | [answered] | likely yes |
| does sedreplace support @stdin? | [research] | check source |

---

## updates needed for vision

the vision's "open questions" section should be updated with these triaged questions and their statuses.

---

*questions triaged. 3 answered, 4 need research, 1 needs wisher input.*
