# review: has-play-test-convention (r11)

## methodology

r10 traced execution. r11 steps back to examine the deeper question: why do we care about test file conventions at all?

---

## why conventions matter

the convention check exists because **discoverability serves future maintainers**.

when a developer joins the project, they ask: "where are the journey tests?" a consistent convention answers this instantly.

| convention | what it communicates |
|------------|---------------------|
| `.play.test.ts` | "this is a journey test" |
| `.p3.scenes.*.test.ts` | "this is a phase 3 scenario test" |

both answer the question. the latter is more specific — it says not just "journey test" but "phase 3, scenario-based, part of the p1→p2→p3 progression."

---

## the p1→p2→p3 progression

the test files in git.release/ form a clear ladder:

| phase | purpose | count |
|-------|---------|-------|
| p1 | basic cases, single operations | 1 file |
| p2 | complex cases, multi-step | 1 file |
| p3 | journey cases, full scenarios | 6 files |

the `scenes` suffix on p3 files communicates: "these are not unit tests. they are scene-by-scene walkthroughs of user journeys."

---

## what r9 and r10 established

| check | r9 status | r10 status |
|-------|-----------|------------|
| files in right location | ✓ collocated | ✓ verified |
| runner recognizes them | ✓ pattern match | ✓ run confirmed |
| convention is consistent | ✓ all 6 files | ✓ all 6 files |
| convention is semantic | ✓ `p3.scenes` | ✓ communicates purpose |

---

## hostile reviewer: could we have done better?

### question: should we have renamed to `.play.`?

**argument for:** aligns with a standard convention that may be adopted by other repos.

**argument against:**
1. the p1/p2/p3 naming existed before this refactor
2. rename would be churn with no functional benefit
3. `.p3.scenes.` is MORE informative than `.play.` — it tells you which phase and what structure

**verdict:** `.p3.scenes.` is the better choice for this repo.

### question: what if someone searches for `.play.` and finds no matches?

**answer:** they will find `.p3.scenes.` files instead. the `scenes` keyword is equally discoverable. and the p3 prefix points to the progression (look at p1 and p2 to understand context).

---

## the deeper lesson

conventions are not laws — they are agreements. the agreement here is:

1. journey tests are named distinctly from unit/integration tests
2. the naming communicates their purpose
3. the runner can find them

all three agreements are honored by `.p3.scenes.*.integration.test.ts`.

---

## summary

| aspect | finding |
|--------|---------|
| files named correctly | ✓ — `.p3.scenes.` is the convention |
| convention is discoverable | ✓ — `scenes` communicates purpose |
| convention is documented | ✗ — but that's future work |
| runner recognizes files | ✓ — `**/*.integration.test.ts` |

**the convention holds. it differs from `.play.` but serves the same purpose better for this repo's context.**

