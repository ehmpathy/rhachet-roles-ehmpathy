# self-review: has-pruned-backcompat

## the question

for each backwards-compat concern in the blueprint, ask:
- did the wisher explicitly say to maintain this compatibility?
- is there evidence this backwards compat is needed?
- or did we assume it "to be safe"?

if backwards compat was not explicitly requested, flag as open question or eliminate.

---

## backwards compatibility concerns in blueprint

### 1. new command: `lock refresh`

**backwards compat concern?** none

**why:** this is a brand new command. it doesn't replace or modify any extant behavior. users who don't use it are unaffected. there is no "old way" to maintain compatibility with.

**lesson:** new additive features have no backwards compat concerns by definition. they extend, not replace.

---

### 2. update to `take.sh` output (add suggestion)

**backwards compat concern?** potential — we're modifying output that scripts might parse

**did wisher request compat?** no explicit mention

**analysis:**
- the suggestion is added *under* the settled file line
- the extant output structure is preserved:
  - `├─ settled` still appears
  - `│  └─ pnpm-lock.yaml ✓` still appears
- the suggestion is a new sub-branch beneath the lock file
- scripts that grep for "settled" or "pnpm-lock.yaml ✓" still work

**why it holds:**
- the output format is additive, not replacement
- we add lines, we don't remove or reformat extant lines
- the turtle vibes tree structure is preserved
- no evidence of scripts that parse `take` output — this is an interactive command

**lesson:** additive output changes are safe. removal or reformatting is risky. we did additive.

---

### 3. dispatcher update (add "lock" case)

**backwards compat concern?** none

**why:** we add a new case to the switch. extant cases (`begin`, `continue`, `take`, `abort`) are unchanged. the `lock` case is orthogonal — it doesn't affect routing for other subcommands.

**lesson:** switch statements grow safely when new cases are independent of extant cases.

---

### 4. package manager priority order

**backwards compat concern?** none

**why:** this is new logic. there is no prior behavior to maintain. the priority order (pnpm > npm > yarn) is documented in the vision and criteria.

---

## summary

| component | backwards compat concern | verdict |
|-----------|-------------------------|---------|
| `lock refresh` command | none — new feature | no action |
| `take.sh` suggestion | additive output | safe — no action |
| dispatcher "lock" case | independent case | safe — no action |
| pm priority order | new logic | no action |

**finding:** no backwards compatibility concerns. all changes are additive.

**open questions for wisher:** none — no backwards compat was assumed "to be safe" because there is no extant behavior to protect.

**lesson:** new features are a gift from the backwards-compat perspective. they have no legacy to maintain. we verified each change is truly additive (new command, new output lines, new case) rather than replacement.
