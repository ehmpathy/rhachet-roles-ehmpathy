# self-review r1: has-questioned-deletables

## features review

### feature.1: brief (rule.require.trust-but-verify.md)

**does this feature trace to a requirement in the criteria?**

yes. criteria 2.1 usecase.1 explicitly requires:
> given(mechanic has the brief in context)
>   when(mechanic encounters an inherited claim)
>     then(brief reminds: verify claims before you act)

**did the wisher explicitly ask for this feature?**

yes. wish 0.wish.md states:
> ### 1. brief: rule.require.trust-but-verify
>
> location: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/work.flow/`

**verdict:** [KEEP]

**why it holds:**
- wish line 21 says "1. brief: rule.require.trust-but-verify"
- criteria 2.1 usecase.1 has 4 then clauses all about the brief
- if deleted: mechanic has no guidance, lesson not institutionalized
- deletion would violate the wish's done-when: "brief exists and is booted"

---

### feature.2: hook (postcompact.trust-but-verify.sh)

**does this feature trace to a requirement in the criteria?**

yes. criteria 2.1 usecase.2 explicitly requires:
> given(mechanic is in a session)
>   when(compaction occurs)
>     then(mechanic sees reminder before they respond)

**did the wisher explicitly ask for this feature?**

yes, marked as optional. wish 0.wish.md states:
> ### 2. sessionstart hook (optional)
>
> location: `.agent/repo=ehmpathy/role=mechanic/inits/claude.hooks/`

**verdict:** [KEEP]

**why it holds:**
- wish line 48 says "2. sessionstart hook (optional)"
- criteria 2.1 usecase.2 explicitly covers post-compaction reminder
- optional means: can skip if infeasible, but wisher prefers to have it
- if deleted: no reminder at critical moment, mechanic may still forget
- deletion would lose the "nudge at moment of need" value

---

### feature.3: boot.yml registration

**does this feature trace to a requirement in the criteria?**

implicitly. wish done-when says:
> - [ ] brief exists and is booted with mechanic role

without boot.yml registration, the brief won't be booted.

**did the wisher explicitly ask for this feature?**

not explicitly, but it's required for the brief to function.

**verdict:** [KEEP]

**why it holds:**
- boot.yml registration is not a feature, it's infrastructure
- without it: brief wouldn't load on session start
- the brief must appear in "say" section so content is visible
- if ref section: mechanic would have to explicitly read it, defeating purpose
- this is mechanical necessity, not a design choice

---

### feature.4: getMechanicRole.ts hook registration

**does this feature trace to a requirement in the criteria?**

implicitly required for the hook to fire.

**did the wisher explicitly ask for this feature?**

no, but it's standard infrastructure for hook registration.

**verdict:** [KEEP]

**why it holds:**
- hook registration is not a feature, it's infrastructure
- without it: hook wouldn't fire on compaction
- may need direct settings.json registration if rhachet lacks onCompact
- this is mechanical necessity, not a design choice

---

## components review

### component.1: brief content structure

**can this be removed entirely?**

no. the brief is the primary deliverable.

**what is the simplest version that works?**

the brief could be minimal:
- .what
- .why
- verification table
- mantra

currently planned sections:
- .what
- .why
- .the rule (table)
- .pattern
- .antipattern (orphan processes story)
- .enforcement

**question:** is the antipattern section necessary?

**analysis:** the wish explicitly mentions the orphan processes story as an antipattern example. to retain it aligns with the wish.

**verdict:** [KEEP]

**why it holds:**
- wish line 36 says "antipattern: the orphan processes story from this session"
- the story is concrete: mechanic trusted "orphan processes" diagnosis blindly
- concrete examples stick in memory better than abstract rules
- if deleted: brief loses its most powerful teaching tool
- the story is the origin; without it the brief loses context

---

### component.2: hook output format

**can this be removed entirely?**

no. the hook must emit output.

**what is the simplest version that works?**

current plan:
```
⚠️ compaction occurred

inherited claims may be stale:
- diagnoses ("X is the problem")
- objectives ("we need to do Y")
- state claims ("file contains Z")
- conclusions ("the fix is W")

verify before you act.

see: rule.require.trust-but-verify
```

simplest version:
```
⚠️ verify inherited claims before you act.
see: rule.require.trust-but-verify
```

**analysis:** the wish explicitly lists claim types to include:
> - diagnoses ("X is the problem")
> - objectives ("we need to do Y")
> - state ("PR is Z", "file contains W")
> - conclusions ("the fix is V")

**verdict:** [KEEP]

**why it holds:**
- wish lines 49-52 list exact claim types to include in hook output
- the list is the value: mechanic sees "diagnoses, objectives, state, conclusions"
- simpler version ("verify claims") loses specificity
- wisher explicitly enumerated these; we should honor that
- if deleted: mechanic sees vague warning, not actionable categories

---

### component.3: integration tests

**can this be removed entirely?**

not recommended. tests prove the behavior works.

**what is the simplest version that works?**

minimal test coverage:
- brief appears in boot output (1 test)
- hook emits reminder (1 test)

blueprint specifies 4 hook tests — may be over-specified.

**analysis:** criteria doesn't specify test requirements. tests are implementation detail.

**changes made:**
- simplified test coverage from 4 hook tests to 2 essential tests
- brief test and hook test are sufficient

---

## deletions

| component | decision | reason |
|-----------|----------|--------|
| brief | keep | explicitly requested |
| hook | keep | explicitly requested (optional) |
| antipattern section | keep | wish mentions orphan processes story |
| claim types in hook | keep | wish explicitly lists them |
| 2 extra hook tests | delete | over-specified, not in criteria |

## changes made

### issue.1: over-specified hook tests

**what was wrong:**
blueprint specified 4 hook tests:
- emits reminder to stdout
- exits 0
- contains claim types list
- contains brief reference

**how fixed:**
simplified to 2 essential tests:
- hook emits reminder to stdout (covers content)
- hook exits 0 (covers behavior)

the claim types and brief reference are part of the reminder content — no need for separate tests.

**lesson:** test behavior, not implementation details

---

## what i'll remember

- wish and criteria are the authority for what to build
- features without traceability should be flagged or deleted
- tests should verify behavior, not implementation details
- "simplest version that works" is a good question to ask
