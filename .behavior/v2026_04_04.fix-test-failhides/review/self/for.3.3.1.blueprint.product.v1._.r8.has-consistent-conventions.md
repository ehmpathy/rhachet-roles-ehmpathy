# self-review r8: has-consistent-conventions

## the question

> do we diverge from extant name conventions and patterns?

unless the ask was to refactor, be consistent with extant conventions.

---

## step 1: identify extant name conventions

searched for name patterns in `src/domain.roles/mechanic/briefs/practices/`:

### directory conventions

```
code.prod/           # scope prefix
code.test/           # scope prefix
pitofsuccess.errors/ # domain.subdomain
pitofsuccess.procedures/
pitofsuccess.typedefs/
```

### file name conventions

```
rule.forbid.{name}.md      # forbid pattern
rule.require.{name}.md     # require pattern
rule.prefer.{name}.md      # prefer pattern
rule.{verb}.{name}.[seed].md   # seed suffix for examples
rule.{verb}.{name}.[demo].md   # demo suffix for examples
rule.{verb}.{name}.md.pt1.md   # part suffix for multi-part rules
```

### term conventions

| extant term | what it describes |
|-------------|-------------------|
| failhide | hide errors silently |
| fail-fast | exit early on bad state |
| exit-code-semantics | what exit codes express |
| helpful-error-wrap | wrap errors with context |

---

## step 2: examine each name choice

### term: failhide (test rule)

**extant:** `failhide` used in `rule.forbid.failhide.md.pt1.md`

**proposed:** `rule.forbid.failhide.md` (test)

**is this consistent?** yes — same term, different scope

**verdict:** consistent — reuses extant term for same concept in different context

### term: failfast (renamed from fail-fast)

**extant:** `fail-fast` used in `rule.require.fail-fast.md`

**proposed:** `failfast` (no hyphen) in new rules

**is this consistent?** no — introduces new form of extant term

**but is the inconsistency intentional?**
- vision explicitly says "rename from fail-fast"
- the rename creates symmetry: failhide/failfast/failloud
- the hyphen in fail-fast was inconsistent with failhide

**verdict:** intentional divergence — explicitly prescribed to create symmetry

### term: failloud (new term)

**extant:** no extant term for "use proper error class with full context"

**proposed:** `failloud` completes the triad

**is this consistent?** yes — follows failhide/failfast pattern

**verdict:** consistent — new term that follows extant pattern

### directory: code.test/pitofsuccess.errors/

**extant:** `code.prod/pitofsuccess.errors/`

**proposed:** `code.test/pitofsuccess.errors/`

**is this consistent?** yes — mirrors extant structure

**verdict:** consistent — follows scope.domain.subdomain pattern

### file suffix: .md (no part suffix)

**extant:** some rules use `.md.pt1.md`, `.md.pt2.md`

**proposed:** new rules use plain `.md`

**is this consistent?** yes — part suffix is for multi-part rules; new rules are single-part

**verdict:** consistent — single-part rules don't need part suffix

---

## step 3: search for convention violations

| question | answer |
|----------|--------|
| different namespace? | no — uses extant `pitofsuccess.errors` |
| different prefix? | no — uses extant `rule.{verb}.` |
| different suffix? | no — uses extant `.md` |
| new terms when extant exist? | no — only `failloud` is new, and it fills a gap |

---

## issues found

### issue: fail-fast → failfast is intentional divergence

**what:** the blueprint renames `fail-fast` to `failfast`

**is this requested?** yes — vision explicitly says "rename from fail-fast"

**why it's acceptable:**
- creates symmetry: failhide/failfast/failloud
- removes inconsistent hyphen (failhide has no hyphen)
- extant fail-fast files are renamed, not duplicated

**verdict:** not an issue — this is an explicitly requested refactor

---

## why each convention holds

### failhide reuse

**why it holds:**
- `failhide` is an extant term with clear definition
- test failhide is the same concept applied to test code
- reuse of term reinforces the connection

**lesson:** when the concept is the same, use the same term. don't invent `test-error-hide` or `silent-test-pass`.

### failfast symmetry

**why it holds:**
- vision prescribes rename from fail-fast to failfast
- the hyphen was inconsistent with failhide
- failhide/failfast/failloud forms a symmetric triad

**lesson:** when extant conventions have inconsistencies, a vision that explicitly prescribes cleanup is the right place to fix them.

### failloud as new term

**why it holds:**
- completes the triad: failhide (forbid), failfast (require), failloud (require)
- follows same compound pattern: fail + {hide|fast|loud}
- describes the concept: fail loud = error with full context

**lesson:** new terms should follow extant patterns. `failloud` follows `failhide` pattern (single compound word, fail prefix).

### pitofsuccess.errors directory

**why it holds:**
- extant: `code.prod/pitofsuccess.errors/`
- proposed: `code.test/pitofsuccess.errors/`
- same subdomain name, different scope

**lesson:** symmetric directories for symmetric concerns. prod rules and test rules for the same domain live in parallel directories.

---

## what could have gone wrong (avoided mistakes)

### could have: invented new term for test failhide

**bad alternative:** `rule.forbid.silent-test-pass.md`

**why it would be wrong:**
- introduces synonym drift: failhide (prod) vs silent-test-pass (test)
- future reader must learn two terms for same concept
- breaks the principle: same concept = same term

**what we did instead:** reused `failhide` for test context

### could have: kept fail-fast hyphen inconsistency

**bad alternative:** keep `fail-fast` while `failhide` has no hyphen

**why it would be wrong:**
- inconsistent within the triad: failhide/fail-fast/failloud
- vision explicitly prescribed the rename
- future terms would be unclear: hyphen or no hyphen?

**what we did instead:** renamed to `failfast` for symmetry

### could have: used different directory name for test rules

**bad alternative:** `code.test/errors/` instead of `code.test/pitofsuccess.errors/`

**why it would be wrong:**
- breaks symmetry with `code.prod/pitofsuccess.errors/`
- loses the "pitofsuccess" namespace that groups these rules
- future reader can't predict where test rules are

**what we did instead:** mirrored extant directory structure exactly

### could have: added new rule type prefix

**bad alternative:** `guideline.forbid.failhide.md` instead of `rule.forbid.failhide.md`

**why it would be wrong:**
- introduces new prefix when extant prefix works
- breaks the `rule.{verb}.{name}.md` convention
- confuses: is guideline different from rule?

**what we did instead:** used extant `rule.{verb}.{name}.md` pattern

---

## summary

- 5 name conventions examined
- 0 unintentional divergences found
- 1 intentional divergence (fail-fast → failfast) explicitly prescribed in vision
- 4 potential mistakes avoided (synonym drift, hyphen inconsistency, directory divergence, new prefix)
- all new names follow extant patterns
