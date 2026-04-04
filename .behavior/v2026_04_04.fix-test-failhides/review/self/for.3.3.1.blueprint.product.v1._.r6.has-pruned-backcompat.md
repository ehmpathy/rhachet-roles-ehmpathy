# self-review r6: has-pruned-backcompat

## the question

> did we add backwards compatibility that was not explicitly requested?

backwards compat adds complexity. if not requested, it may be YAGNI.

---

## step 1: identify potential backcompat concerns

scan the blueprint for patterns that suggest backwards compatibility:
- aliases (old name → new name, keep both)
- deprecation warnings (warn but allow old behavior)
- feature flags (toggle between old and new)
- migration shims (translate old format to new)
- version checks (if old version, do X)

---

## step 2: examine each blueprint change

### rename fail-fast → failfast

**the change:** rename files from `rule.require.fail-fast.md` to `rule.require.failfast.md`

**potential backcompat concern:** could add alias so both names work

**is this backcompat requested?** no — vision says "rename from fail-fast", not "add failfast while keeping fail-fast"

**evidence:** vision table row 2 says "rename from fail-fast"

**verdict:** no backcompat concern — this is a clean rename, no alias added

### retain prod failhide rule

**the change:** `[○]` retain `rule.forbid.failhide.md.pt1.md` and `.pt2.md`

**potential backcompat concern:** none — retain means "don't change"

**verdict:** not a backcompat concern — just preserves extant behavior

### create new test rules

**the change:** `[+]` create 3 new rules in `code.test/pitofsuccess.errors/`

**potential backcompat concern:** none — these are new files, no old behavior to maintain

**verdict:** not a backcompat concern — pure addition

### create new prod failloud rule

**the change:** `[+]` create `rule.require.failloud.md` in `code.prod/pitofsuccess.errors/`

**potential backcompat concern:** none — new file, no old behavior

**verdict:** not a backcompat concern — pure addition

### boot.yml changes

**the change:** update boot.yml to reference new rule names and add new rules

**potential backcompat concern:** could keep old fail-fast reference as alias

**is this backcompat requested?** no — vision says "all 6 rules must be in say section" with new names

**verdict:** no backcompat concern — boot.yml references are updated to match renames, no aliases

### behavior guard handoff

**the change:** document that guards should update their rule glob

**potential backcompat concern:** could suggest supporting both old and new globs

**is this backcompat requested?** no — wish says to "include each of those rules" (the new ones)

**verdict:** no backcompat concern — clean glob update, no dual-support

---

## step 3: search for backcompat language

search the blueprint for backcompat keywords:
- "backwards" — not found
- "compatible" — not found
- "legacy" — not found
- "deprecated" — not found
- "alias" — not found
- "shim" — not found
- "migration" — not found
- "fallback" — not found
- "previous" — not found

**no backcompat language found in blueprint.**

---

## issues found

none. the blueprint contains no backwards compatibility that was not explicitly requested.

---

## why no backcompat is correct

| change | why no backcompat is appropriate |
|--------|----------------------------------|
| fail-fast → failfast rename | vision explicitly prescribes rename, not alias; keeping both names would add confusion |
| new test rules | new additions don't require backcompat — no old behavior extant |
| new prod failloud rule | new addition, no old behavior to maintain |
| boot.yml updates | references must match file names; stale references would cause boot failure |
| guard glob update | guards must find the rules; old glob wouldn't find new test rules |

**key insight:** this blueprint is primarily additive (new rules) with one rename (fail-fast → failfast). additive changes don't require backwards compatibility. renames that are explicitly prescribed should be clean renames, not aliases.

---

## the test for backcompat YAGNI

> if the wisher didn't ask for backwards compatibility, don't add it.

| question | answer |
|----------|--------|
| did wisher ask to maintain old fail-fast name? | no — "rename from fail-fast" |
| did wisher ask for gradual rollout? | no |
| did wisher mention migration period? | no |
| is there evidence old consumers depend on fail-fast? | no — internal repo |

**conclusion:** no backwards compatibility concerns in this blueprint. all changes are either:
1. new additions (no old behavior to maintain)
2. explicitly prescribed renames (clean rename, not alias)

---

## summary

- 6 changes examined
- 0 backcompat concerns found
- 0 backcompat issues to fix
- all changes are either additive or explicitly prescribed renames
