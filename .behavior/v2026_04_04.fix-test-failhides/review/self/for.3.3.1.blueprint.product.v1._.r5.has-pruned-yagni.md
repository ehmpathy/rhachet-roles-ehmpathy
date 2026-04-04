# self-review r5: has-pruned-yagni

## the question

> did we add any extras that were not prescribed?

YAGNI = "you ain't gonna need it"

---

## step 1: enumerate blueprint components

from the blueprint, the components are:

1. **filediff tree** — shows files to create/update/retain
2. **codepath tree** — shows logical structure
3. **file specifications** — markdown specs for new rules
4. **boot.yml changes** — before/after yaml
5. **test coverage section** — describes what to test
6. **behavior guard handoff** — document for guard update
7. **execution order** — sequence of steps

---

## step 2: trace each component to vision

| component | vision source | prescribed? |
|-----------|---------------|-------------|
| filediff tree | vision table of 6 rules | yes — need to know what files |
| codepath tree | vision describes rule content | yes — need to know logical structure |
| file specifications | vision describes rule content | yes — need exact rule content |
| boot.yml changes | "all 6 rules must be in say" | yes — explicitly prescribed |
| test coverage | vision "acceptance tests" section | maybe — vision mentions manual tests |
| behavior guard handoff | wish asks for guard update | yes — explicitly prescribed |
| execution order | not in vision | no — this is extra |

---

## step 3: question each component

### is filediff tree needed?

**prescribed?** yes

**evidence:** vision lists 6 rules with their status (extant/rename/new). filediff tree shows exactly which files to create, rename, or retain.

**verdict:** keep — minimum viable way to show file changes.

### is codepath tree needed?

**prescribed?** yes

**evidence:** vision describes the content of each rule (forbidden patterns, error classes, etc.). codepath tree shows the logical structure.

**verdict:** keep — minimum viable way to show logical structure.

### are file specifications needed?

**prescribed?** yes

**evidence:** vision describes what each rule should contain. the specifications provide the actual content to create.

**question:** could the specifications be simpler?

review of each specification section:
- `.what` — essential, describes purpose
- `.why` — essential, provides rationale for adoption
- `.forbidden patterns` — essential, the core of forbid rules
- `.legitimate alternatives` — essential, guides toward pit of success
- `.pattern` — essential, shows code examples
- `.enforcement` — essential, defines severity

**verdict:** keep — all sections are minimum viable for rule adoption.

### is boot.yml changes needed?

**prescribed?** yes

**evidence:** vision explicitly says "all 6 rules must be in boot.yml `say` section (not `ref`)".

**verdict:** keep — explicitly prescribed.

### is test coverage section needed?

**prescribed?** maybe

**evidence:** vision has an "evaluation" section that mentions "acceptance tests are manual — run `rhx route.drive` on a PR with failhide patterns to verify guard blocks".

**question:** is the test coverage section in the blueprint YAGNI?

the section states:
```
### unit tests
none — rules are briefs (markdown), not code.

### integration tests
none — rules are briefs (markdown), not code.

### acceptance tests
...
```

this documents that rules don't need code tests because they're markdown briefs. this is helpful clarification but is it prescribed?

**verdict:** borderline — keep for now, but could remove without violating requirements.

### is behavior guard handoff needed?

**prescribed?** yes

**evidence:** wish explicitly asks to "ensure that the behavior guard on 5.1 execution and 3.3.1 blueprint both include each of those rules".

**verdict:** keep — explicitly prescribed.

### is execution order needed?

**prescribed?** no

**evidence:** vision does not prescribe an execution order. the blueprint added it as "helpful" guidance.

**question:** is this YAGNI?

the section states:
```
## execution order

1. create code.test/pitofsuccess.errors/ directory
2. create new rule files (prod failloud, test failhide/failfast/failloud)
3. rename fail-fast → failfast files
4. update boot.yml
5. create handoff for behavior guard update
```

this is implementation guidance for the executor. but is it needed? the filediff tree already shows what to create. the executor can derive the order from the file types.

**verdict:** YAGNI — the execution order can be derived from the filediff tree. remove it.

---

## issue found

**component:** execution order section

**why it's YAGNI:** the filediff tree already shows what to create. the executor can infer the logical order from file types:
1. directories before files
2. new files before updates
3. boot.yml after rules extant

**action:** remove the execution order section from the blueprint.

---

## fix applied

**what was removed:** the "execution order" section from the blueprint.

**before:**
```markdown
## execution order

1. create code.test/pitofsuccess.errors/ directory
2. create new rule files (prod failloud, test failhide/failfast/failloud)
3. rename fail-fast → failfast files
4. update boot.yml
5. create handoff for behavior guard update
```

**after:** section deleted entirely.

**why this fix is correct:**
- the filediff tree already encodes the order via file types (`[+]` create, `[~]` update, `[○]` retain)
- directories are implied by file paths (create `code.test/pitofsuccess.errors/` before files within it)
- explicit order sections duplicate information and risk drift if filediff changes but order section doesn't
- the executor's job is to interpret the tree, not follow a separate checklist

**lesson:** when a blueprint contains a summary section that restates information from another section in a different form, question whether both are needed. the authoritative source is the tree; the order section was a redundant restatement.

---

## why non-issues hold

for each component kept, articulation of why it is not YAGNI:

### filediff tree — not YAGNI

| aspect | articulation |
|--------|--------------|
| **vision source** | vision table lists 6 rules with status (extant/rename/new) |
| **minimum viable** | filediff tree is the canonical way to show file changes in a blueprint |
| **no alternative** | without it, executor must guess which files to create/update/retain |
| **standard pattern** | all blueprint artifacts use filediff trees |

### codepath tree — not YAGNI

| aspect | articulation |
|--------|--------------|
| **vision source** | vision describes rule content (forbidden patterns, error classes, etc.) |
| **minimum viable** | codepath tree shows logical structure distinct from file structure |
| **no alternative** | without it, executor must read each file spec to understand relationships |
| **added value** | shows what changes within files, not just which files change |

### file specifications — not YAGNI

| aspect | articulation |
|--------|--------------|
| **vision source** | vision describes what each rule should contain |
| **minimum viable** | each spec section serves a distinct purpose |
| **no alternative** | without specs, executor must invent rule content from scratch |
| **section audit** | each section (.what, .why, .forbidden patterns, .legitimate alternatives, .pattern, .enforcement) is essential for rule adoption |

### boot.yml changes — not YAGNI

| aspect | articulation |
|--------|--------------|
| **vision source** | vision explicitly says "all 6 rules must be in boot.yml `say` section" |
| **minimum viable** | before/after diff is the standard way to show yaml changes |
| **no alternative** | without it, executor must interpret vision prose into yaml |
| **explicitly prescribed** | vision prescribes this exact artifact |

### test coverage section — borderline, kept

| aspect | articulation |
|--------|--------------|
| **vision source** | vision mentions "acceptance tests are manual" |
| **minimum viable** | documents that rules don't need code tests |
| **why kept** | clarifies a common question: "where are the unit tests?" |
| **borderline because** | could be inferred from context (rules are markdown, not code) |
| **decision** | keep — the clarification prevents confusion for future readers |

### behavior guard handoff — not YAGNI

| aspect | articulation |
|--------|--------------|
| **vision source** | wish explicitly asks for guard update |
| **minimum viable** | handoff document is the standard way to request cross-boundary changes |
| **no alternative** | without it, guard update request is lost after blueprint merge |
| **explicitly prescribed** | wish prescribes this exact artifact |

---

## summary

- 7 components examined
- 1 YAGNI component found (execution order)
- 1 fix applied (removed execution order)
- the other 6 components are minimum viable or explicitly prescribed
