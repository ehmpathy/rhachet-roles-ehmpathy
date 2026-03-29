# self-review (r2): has-questioned-assumptions

deeper reflection after first pass. wisher feedback included.

## reviewed artifacts

- `.behavior/v2026_03_27.fix-git-release-p3/0.wish.md`
- `.behavior/v2026_03_27.fix-git-release-p3/1.vision.md`
- wisher feedback: "use repeatable mockGh test infra"
- wisher feedback: "align stdouts with extant --watch shapes and vibes"

---

## new hidden assumptions surfaced

### assumption 9: test infra uses mockGh

**what we assume**: tests will mock gh CLI calls somehow

**evidence**: wish doesn't specify test infra

**wisher said this?**: yes — "ensure all uses the repeatable mockGh test infra"

**what this means**: the tests should use extant mockGh patterns, not invent new test patterns

**issue found**: vision doesn't specify test infra requirements

**fix applied**: added to vision section "### implementation requirements":
> **test infra**: tests must use the repeatable `mockGh` test infra pattern from extant git.release tests. no new test patterns — build on what exists.

---

### assumption 10: stdout must match extant --watch shapes

**what we assume**: new output will fit with extant output patterns

**evidence**: wish shows output examples, but doesn't reference extant patterns

**wisher said this?**: yes — "all stdouts aligned with extant --watch shapes and vibes"

**what this means**: don't invent new output conventions. follow what `--watch` already does.

**issue found**: vision proposes output without reference to extant patterns

**research needed**: read extant --watch output to understand the shapes and vibes (deferred to implementation)

**fix applied**: added to vision section "### implementation requirements":
> **output alignment**: all stdout must align with extant `--watch` shapes and vibes. research extant patterns before implementation; don't invent new output conventions.

---

## previous assumptions revisited

### assumption 3: 90s timeout — already fixed

the unsupported "<30s" claim was removed from vision. now says "per wish examples; configurability raised as open question".

### assumption 5: mergeCommit API — needs verification

still need to verify `gh pr view --json mergeCommit` returns the squash commit on main. this is implementation-time research, not a vision blocker.

---

## actions completed

1. ✅ **update vision** — added test infra requirement (mockGh) to section "### implementation requirements"
2. ✅ **update vision** — added output alignment requirement (extant --watch shapes) to section "### implementation requirements"
3. 🔜 **research** — read extant --watch output patterns (deferred to implementation phase)

---

## summary of r2 findings

| assumption | status | action |
|------------|--------|--------|
| mockGh test infra | FIXED | added to vision |
| --watch output alignment | FIXED | added to vision; research deferred |
| 90s timeout | FIXED | claim removed |
| mergeCommit API | noted | verify at implementation |

## what i missed in r1

i reviewed the wish in isolation. i didn't consider:
- extant test patterns in the codebase
- extant output patterns from `--watch`

the vision must build on what exists, not propose in a vacuum.
