# self-review: has-questioned-questions

## triage of open questions

re-read vision "open questions & assumptions" section. triage each question.

---

### question 1: should `lock refresh` work outside of rebase?

**original:** vision asked "should `lock refresh` work outside of rebase? (e.g., after merge conflict)"

**triage:**
- can be answered via logic? no — depends on user preference
- can be answered via docs/code? no
- should be researched? no — not a technical question
- does wisher know? yes — this is a scope decision

**verdict:** [wisher] — asked wisher

**wisher answer:** "it should specifically NOT work outside a refresh... not yet! but maybe in the future."

**action:** updated vision. rebase-only for v1, merge support maybe later.

---

### question 2: should we auto-refresh after `take` on lock files?

**original:** vision asked "should we auto-refresh after `take` on lock files? or just suggest?"

**triage:**
- can be answered via logic? yes — auto-refresh is risky (slow, a surprise), suggestion is safer
- vision already states this in "tradeoffs" section: "auto vs manual | manual with suggestion | safer, user controls when"

**verdict:** [answered] — manual with suggestion. already decided in vision tradeoffs.

**wisher confirmed:** "not yet! but maybe in the future."

**action:** no change needed — vision already had this right.

---

### question 3: should we support yarn.lock?

**original:** vision asked "should we support yarn.lock as well?"

**triage:**
- can be answered via logic? partially — yarn is less common in ehmpathy repos
- does wisher know? yes — scope decision

**verdict:** [wisher] — asked wisher

**wisher answer:** "yeah, why not"

**action:** updated vision to support pnpm, npm, and yarn. added yarn.lock edgecases.

---

### question 4: does `pnpm install` in rebase behave differently?

**current:** vision asks in "research needed"

**triage:**
- can be answered via logic? no — need to test
- can be answered via docs? maybe — check pnpm docs
- should be researched? yes

**verdict:** [research] — test pnpm install mid-rebase in research phase

---

### question 5: what flags ensure we regenerate lock without fetch of new versions?

**current:** vision asks in "research needed"

**triage:**
- can be answered via logic? no
- can be answered via docs? yes — pnpm/npm/yarn documentation
- should be researched? yes

**verdict:** [research] — check pnpm/npm/yarn docs for correct flags

---

## summary

| question | verdict | resolution |
|----------|---------|------------|
| merge support | [wisher] | NO for v1, maybe later — vision updated |
| auto vs manual | [answered] | manual with suggestion — confirmed |
| yarn support | [wisher] | YES — vision updated |
| pnpm mid-rebase | [research] | to be tested in research phase |
| install flags | [research] | to be checked in research phase |

## update to vision

vision updated with wisher decisions:
- "decisions (from wisher)" section added with all three answers
- yarn.lock support added to pros, edgecases, and tradeoffs
- assumption 4 updated to reflect rebase-only is by design, not just assumed
