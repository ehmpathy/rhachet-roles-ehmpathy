# self-review r11: has-role-standards-adherance

## the question

> does the blueprint follow mechanic role standards correctly?

check for violations of required patterns, anti-patterns, and bad practices.

---

## step 1: enumerate relevant rule directories

the blueprint creates markdown rule files in `briefs/practices/` directories.

relevant rule categories from mechanic briefs:

| directory | relevance | rules checked |
|-----------|-----------|---------------|
| `code.prod/readable.comments/` | rule files need `.what` and `.why` headers | rule.require.what-why-headers |
| `code.prod/evolvable.procedures/` | file structure, contracts | rule.require.clear-contracts |
| `lang.terms/` | name conventions | rule.require.treestruct, rule.forbid.gerunds |
| `lang.tones/` | lowercase, no buzzwords | rule.prefer.lowercase, rule.forbid.buzzwords |
| `code.prod/readable.narrative/` | early returns, no else | rule.forbid.else-branches |

**completeness check:** ✓ all relevant brief directories enumerated

**why it's complete:**
- the blueprint creates rule files (→ readable.comments)
- the blueprint specifies file names (→ lang.terms)
- the blueprint contains prose (→ lang.tones)
- the blueprint shows code examples (→ readable.narrative)
- no other brief directories apply to markdown rule files

---

## step 2: check blueprint sections

### rule file format

**standard:** mechanic briefs use `# header` format with `## .what`, `## .why`, `## .pattern`, `## .enforcement` sections.

**blueprint file specs show:**

```markdown
# rule.require.failloud

## .what
errors must use proper error classes with full context.

## .why
- enables immediate diagnosis without debug sessions
...

## .pattern
...

## .enforcement
- error without proper class = blocker
```

**check:** ✓ follows extant rule format (matches `rule.require.exit-code-semantics.md`)

**why it holds:**
- header is `# rule.{verb}.{name}`
- sections follow `.what`, `.why`, `.pattern`, `.enforcement` order
- matches extant rules in same directory

**lesson:** when the codebase has multiple rule formats (prose, .tactic, # header), pick one and be consistent. the blueprint chose `# header` format because it matches the most recent rules in the directory.

### name conventions

**standard:** use `rule.{verb}.{name}.md` pattern with verbs: forbid, require, prefer

**blueprint file names:**

| file | pattern | valid? |
|------|---------|--------|
| `rule.forbid.failhide.md` | rule.forbid.{name}.md | ✓ |
| `rule.require.failfast.md` | rule.require.{name}.md | ✓ |
| `rule.require.failloud.md` | rule.require.{name}.md | ✓ |

**check:** ✓ all file names follow extant convention

**why it holds:**
- verbs are from the allowed set (forbid, require, prefer)
- names use no hyphens (failhide not fail-hide)
- suffixes are `.md` (not `.md.pt1.md` for new single-part rules)

**lesson:** the `rule.{verb}.{name}.md` pattern is canonical. part suffixes (`.md.pt1.md`) are only for multi-part rules that already exist.

### lowercase convention

**standard:** prefer lowercase in prose and comments (rule.prefer.lowercase)

**blueprint content check:**

- section headers: `.what`, `.why`, `.pattern` — lowercase ✓
- prose: "errors must use proper error classes" — lowercase ✓
- table headers: "who fixes", "class" — lowercase ✓

**check:** ✓ follows lowercase convention

**why it holds:**
- no unnecessary capitalization
- sentence starts are lowercase (per rule.prefer.lowercase)
- code literals in backticks are case-sensitive (ConstraintError is correct)

**lesson:** class names like `ConstraintError` retain their case because they're code references, not prose. the rule allows capitalization for code constructs.

### no gerunds convention

**standard:** avoid gerunds in names (rule.forbid.gerunds)

**blueprint check:**

| term used | is gerund? | ok? |
|-----------|------------|-----|
| failhide | no (compound noun) | ✓ |
| failfast | no (compound noun) | ✓ |
| failloud | no (compound noun) | ✓ |

**check:** ✓ no gerunds in rule names

**why it holds:**
- `failhide` is not a gerund — it's a compound noun (fail + hide)
- same for `failfast` and `failloud`
- terms describe concepts, not actions in progress

**lesson:** compound nouns like `failhide` are acceptable because they name a concept, not a present-tense action. a gerund would be something like "failing" used as a noun.

### treestruct convention

**standard:** use `[verb][...noun]` for mechanisms, `[...noun][state]` for resources (rule.require.treestruct)

**blueprint file spec names:**

| name | pattern | analysis |
|------|---------|----------|
| `rule.forbid.failhide` | rule = category, forbid = verb, failhide = noun | ✓ |
| `rule.require.failfast` | rule = category, require = verb, failfast = noun | ✓ |
| `rule.require.failloud` | rule = category, require = verb, failloud = noun | ✓ |

**check:** ✓ follows treestruct for rule names

**why it holds:**
- `rule.{verb}.{noun}` is the extant pattern for briefs
- this is not a domain operation, so get/set/gen verbs don't apply
- the pattern enables sorted and grouped views

**lesson:** briefs have their own treestruct variant: `rule.{verb}.{noun}`. this differs from operations (`{verb}{noun}`) but serves the same purpose: predictable sort and group.

---

## step 3: check for anti-patterns

### buzz words

**standard:** avoid buzzwords (rule.forbid.buzzwords)

**blueprint prose check:**

| phrase | buzzword? |
|--------|-----------|
| "proper error classes" | no — "proper" is specific here (refers to class taxonomy) |
| "full context" | no — "full" means complete error details |
| "immediately" | no — specific time (throw at detection) |

**check:** ✓ no buzzwords detected

**why it holds:**
- each term has specific referent in the blueprint
- no vague terms like "scalable", "robust", "enterprise"

**lesson:** words that seem general can be specific in context. "proper" in "proper error classes" refers to the specific ConstraintError/MalfunctionError taxonomy, not a vague quality.

### early returns pattern

**standard:** prefer early returns, forbid else branches (rule.forbid.else-branches)

**blueprint code examples:**

```ts
// 👎 failhide — silent skip
if (!hasApiKey) {
  return; // test passes without verification
}

// 👍 failfast — loud failure
if (!hasApiKey) {
  throw new ConstraintError('API key required for this test', {
    hint: 'run: source .agent/repo=.this/role=any/skills/use.apikeys.sh',
  });
}
```

**check:** ✓ examples use early returns/throws, no else branches

**why it holds:**
- the "bad" example shows early return (to critique it as failhide)
- the "good" example shows early throw (the preferred pattern)
- no else branches in either example

**lesson:** when a rule shows "bad" examples, they should still follow format conventions. the early return is shown to critique its semantics (silent skip), not its structure.

---

## issues found

none. blueprint follows mechanic role standards.

---

## why adherance holds (summary)

| standard | check |
|----------|-------|
| rule file format | `# header` with `.what`/`.why`/`.pattern`/`.enforcement` |
| file name | `rule.{verb}.{name}.md` pattern |
| lowercase | all prose and headers lowercase |
| no gerunds | compound nouns, not gerunds |
| treestruct | `rule.{verb}.{noun}` variant for briefs |
| no buzzwords | all terms have specific referents |
| early returns | examples follow narrative flow |

**key insight:** the blueprint is authored by someone familiar with mechanic conventions. no anti-patterns detected because the rule file format and name follow extant patterns exactly.

---

## what could have gone wrong (avoided mistakes)

### could have: used "best practices" buzzword

**bad alternative:** "this rule enforces best practices for error handle"

**why it would be wrong:** "best practices" is a buzzword — vague, overused, adds no information.

**what the blueprint does instead:** uses specific language like "proper error classes with full context" — refers to the concrete ConstraintError/MalfunctionError taxonomy.

### could have: used gerund in rule name

**bad alternative:** `rule.forbid.silent-fail.md`

**why it would be wrong:** hyphen breaks sort; less clear than compound noun.

**what the blueprint does instead:** uses compound noun `failhide` — clear, sortable, no gerund.

### could have: inconsistent section headers

**bad alternative:** some rules use `.what`, others use `## What`, others use `### Purpose`

**why it would be wrong:** inconsistent headers break the reader's expectations and automation.

**what the blueprint does instead:** all rules use `## .what`, `## .why`, `## .pattern`, `## .enforcement` consistently.

---

## summary

- 7 standards checked (format, name, lowercase, gerunds, treestruct, buzzwords, early returns)
- 0 violations found
- 3 potential mistakes identified and avoided
- blueprint follows mechanic role standards correctly

