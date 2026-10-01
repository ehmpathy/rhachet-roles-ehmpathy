# F3 · bound the fallback expansion to git-tracked files

- **rework**: clean
- **status**: 🔴 ruled 2026-09-04 — option D. my option A rejected
- **confidence**: 70% → overruled

## .the fork

when the fallback expanded a slashed glob, what file set did it hand `grep`?

| option | shape |
|--------|-------|
| A (my call) | intersect the expansion with git-tracked files — matches `rg`'s default |
| B | raw bash expansion |
| C | raw expansion plus a hardcoded exclude list |
| **D (ruled)** | raw expansion, **and** `rg` searches a named ignored path too |

## .my call, and why it lost

A rested on acceptance 1's equivalence claim: both engines return the same files, and `rg` skips
gitignored paths. a second reason — `ARG_MAX` blowup — measured weak: bash `globstar` does not descend
pnpm's symlinked `node_modules`, and `**` skips dot-directories, so only a literal `.pnpm` path
detonates (`node_modules/.pnpm/**/*.js` = 31,926 operands).

the entry itself noted that a wrong filter creates a new false zero. two engines that agree on a false
zero are consistently wrong. acceptance 1 asks for the files a **correct** search returns, and `rg`'s
default is one engine's policy, not the definition of correct.

## .the verdict

the wisher:

> *"if that dir, e.g. `.agent/repo=ehmpathy/` is gitignored, we should still be able to glob inside
> it; same with `node_modules`, that's even more common."*
> **"it's an automatic opt-into gitignore-ignore."**

rule: **to name a path in a glob is the opt-in.** the ignore rules do not apply to what a caller named.

| | A | **D** |
|---|---|---|
| fallback expansion | intersect with tracked | raw |
| `rg` on a named ignored path | skips it | searches it (`--no-ignore`, scoped to the named path) |
| a gitignored path a caller names | false zero | found |

consequences:

- the `ARG_MAX` guard (case=7 `[t2]`) became a real guard: D reaches `.pnpm` by design.
- case=7 `[t1]` is deleted. it asserted set equality under `rg`'s ignore policy, which is now wrong.
- the rule surfaced axis **D7 · path ignorance**.

## .where

- `1.vision.experience.case=7.vast-expansion.md` · `case=9`
- `src/domain.roles/mechanic/skills/claude.tools/grepsafe.sh`
