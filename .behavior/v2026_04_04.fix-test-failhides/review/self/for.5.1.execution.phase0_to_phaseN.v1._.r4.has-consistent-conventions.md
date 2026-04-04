# self-review r4: has-consistent-conventions

## the question

> do we diverge from extant names and patterns?

---

## step 1: enumerate name choices made

| name | context | decision |
|------|---------|----------|
| `rule.require.failloud.md` | file name | new term for "use proper error class" |
| `rule.forbid.failhide.md` | file name (test) | matches extant prod name |
| `rule.require.failfast.md` | file name (test + rename) | hyphen removed for consistency |
| `pitofsuccess.errors/` | directory | matches extant prod directory |
| `handoff.behavior-guard-update.md` | file name | follows handoff convention |

---

## step 2: check name conventions

### file name pattern

**extant pattern:** `rule.{directive}.{name}.md` where directive is `forbid`, `require`, `prefer`, `avoid`

**our names follow this pattern:**
- `rule.require.failloud.md` — yes
- `rule.forbid.failhide.md` — yes
- `rule.require.failfast.md` — yes

**verdict:** consistent with extant convention.

### term choices

**failhide vs fail-hide:**
- extant: `rule.forbid.failhide.md.pt1.md` — no hyphen
- ours: `rule.forbid.failhide.md` — matches

**failfast vs fail-fast:**
- extant: `rule.require.fail-fast.md` — had hyphen
- ours: `rule.require.failfast.md` — hyphen removed
- why: vision explicitly prescribed this rename for symmetry with "failhide"

**failloud:**
- extant: no prior term
- ours: `rule.require.failloud.md` — new term
- why: follows fail* pattern established by failhide and failfast
- consistent: fail + {hide,fast,loud} = symmetric set

**verdict:** term choices are consistent with extant patterns or explicitly prescribed.

### directory structure

**extant pattern:** `briefs/practices/code.{prod,test}/{category}/`

**our structure:**
- `code.prod/pitofsuccess.errors/` — extant, reused
- `code.test/pitofsuccess.errors/` — new, mirrors prod

**verdict:** consistent with extant directory convention.

### handoff name

**extant pattern:** `handoff.{purpose}.md` for documents that describe work for future sessions

**our handoff:** `handoff.behavior-guard-update.md`

**verdict:** follows handoff convention.

---

## step 3: check for divergences

| potential divergence | found? | verdict |
|---------------------|--------|---------|
| different directive prefixes | no | used forbid/require consistently |
| hyphenated vs single-word | addressed | renamed fail-fast to failfast per vision |
| different directory structure | no | mirrors extant prod structure |
| new undefined terms | no | failloud follows fail* pattern |

---

## issues found

none. all names follow extant conventions.

---

## why conventions hold

| check | result |
|-------|--------|
| file names match pattern? | yes — rule.{directive}.{name}.md |
| terms match extant? | yes — failhide, failfast (renamed), failloud (new but consistent) |
| directory mirrors prod? | yes — code.test/pitofsuccess.errors/ |
| handoff follows convention? | yes — handoff.{purpose}.md |

---

## deeper reflection: the fail* family

the three terms form a semantic family:

| term | definition | directive |
|------|------------|-----------|
| failhide | hide errors, continue as if ok | forbid |
| failfast | detect bad state, exit early | require |
| failloud | use proper error class with details | require |

**why this name approach works:**
- all start with "fail" — signals they're about error situations
- each suffix describes the behavior: hide (conceal), fast (early), loud (clear)
- symmetric: one word, no hyphens, same pattern

**the rename justification:**
- `fail-fast` → `failfast` aligns with `failhide` (no hyphen)
- this was explicitly prescribed in vision
- not a convention divergence — a convention alignment

---

## what could have been divergent (avoided)

### could have: kept fail-fast hyphenated

**why wrong:** breaks symmetry with failhide
**what we did:** renamed to failfast per vision

### could have: used "failloud" as "fail-loud"

**why wrong:** breaks symmetry with failhide and failfast
**what we did:** single word "failloud"

### could have: different directory name

**why wrong:** would diverge from extant prod structure
**what we did:** exact mirror of code.prod/pitofsuccess.errors/

---

## verification: actual file enumeration

### prod rules (extant + new)

searched: `src/domain.roles/mechanic/briefs/practices/code.prod/pitofsuccess.errors/rule.*.md`

found:
- rule.forbid.failhide.md.pt1.md — extant
- rule.forbid.failhide.md.pt2.md — extant
- rule.require.failfast.md — renamed (was fail-fast)
- rule.require.failfast.[demo].shell.md — renamed (was fail-fast)
- rule.require.failfast.[seed].md — renamed (was fail-fast)
- rule.require.exit-code-semantics.md — extant
- rule.prefer.helpful-error-wrap.md — extant
- rule.require.failloud.md — new

**pattern confirmed:** all files follow `rule.{directive}.{name}.md` pattern.

### test rules (all new)

searched: `src/domain.roles/mechanic/briefs/practices/code.test/pitofsuccess.errors/rule.*.md`

found:
- rule.forbid.failhide.md — new
- rule.require.failfast.md — new
- rule.require.failloud.md — new

**pattern confirmed:** all new files follow same convention as prod.

### convention alignment verified

| convention | prod example | test example | aligned? |
|------------|--------------|--------------|----------|
| directive prefix | rule.forbid.* | rule.forbid.* | yes |
| directive prefix | rule.require.* | rule.require.* | yes |
| single-word terms | failhide, failfast | failhide, failfast | yes |
| directory name | pitofsuccess.errors | pitofsuccess.errors | yes |

---

## discovered: internal structure variance (not a violation)

### the variance

**extant prod rules use different internal structures:**

| file | structure |
|------|-----------|
| rule.forbid.failhide.md.pt1.md | informal prose |
| rule.require.failfast.md | `.tactic = ...` YAML-like format |
| rule.require.failloud.md (new) | `## .what` markdown headers |

**new test rules all use same structure:**

| file | structure |
|------|-----------|
| rule.forbid.failhide.md | `## .what` markdown headers |
| rule.require.failfast.md | `## .what` markdown headers |
| rule.require.failloud.md | `## .what` markdown headers |

### why this is not a convention violation

1. **blueprint said [○] retain for extant rules** — I did not modify extant content
2. **my new files are internally consistent** — all 4 new files use markdown header format
3. **variance is pre-extant** — extant prod rules already had different formats before this work
4. **aligning extant files was out of scope** — would be a refactor, not part of this wish

### if asked to align

if vision had said "unify rule formats", I would:
- convert all rules to `## .what` markdown header format
- update extant prod rules to match

but this was not requested, so I preserved extant content and created new files with consistent format among themselves.

### recommendation for future

consider a separate refactor to unify rule file internal structure across all briefs.
