# handoff: review.by skill for bhrain

## .what

bhrain should implement an `rhx review.by --role $role` skill that wraps the extant `rhx review` skill with named focus presets.

## .why

- roles define focuses (sets of rules grouped by concern)
- `review.by` invokes the correct focuses for a given role
- enables evals: same inputs → compare outputs across brains
- enables route guard integration via parseable stdout

## .architecture

```
rhx review.by --role mechanic
    │
    ├─ lookup role package path
    │     └─ .agent/repo=ehmpathy/role=mechanic/
    │
    ├─ load focuses from role
    │     └─ briefs/reviews/focuses.yml
    │
    └─ for each focus:
          └─ rhx review --rules $focus.rules --paths $paths --output $output
```

### ownership

| layer | owner | what |
|-------|-------|------|
| `review.by` skill | bhrain | the how: orchestration, stdout, parallelism |
| `focuses.yml` | each role | the what: which rules to run |
| `rhx review` | bhrain | the engine: rule application |

## .focus config format

each role defines `briefs/reviews/focuses.yml`:

```yaml
focuses:
  - slug: failfast
    purpose: verify errors surface immediately with context
    rules:
      - briefs/practices/**/rule.require.failfast*.md
      - briefs/practices/**/rule.forbid.failhide*.md

  - slug: test-scopes
    purpose: verify test coverage by grain
    rules:
      - briefs/practices/**/rule.require.test-coverage*.md
      - briefs/practices/**/rule.forbid.*mocks*.md
```

## .cli interface

```bash
# run all focuses for role (default)
rhx review.by --role mechanic --paths 'src/**/*.ts'

# run specific focus
rhx review.by --role mechanic --for failfast --paths 'src/**/*.ts'

# forward args to underlying review
rhx review.by --role mechanic --mode pull --diffs since-main
```

### arguments

| arg | required | description |
|-----|----------|-------------|
| `--role` | yes | role slug (mechanic, ergonomist, architect) |
| `--for` | no | specific focus slug (default: all) |
| `--paths` | no | target paths (forwarded to review) |
| `--diffs` | no | diff scope (forwarded to review) |
| `--mode` | no | pull or push (forwarded to review) |
| `--output` | no | output dir (default: .reviews/) |

## .stdout format

must match bhrain patterns and integrate with route guard `reviewed?` mechanism.

### success (no findings)

```
🐢 cowabunga!

🐚 review.by --role mechanic
   └─ focuses
      ├─ f1 failfast ✓
      ├─ f2 failhide ✓
      └─ f3 test-scopes ✓
```

### findings (blockers/nitpicks)

```
🐢 bummer dude...

🐚 review.by --role mechanic
   ├─ focuses
   │  ├─ f1 failfast ✓
   │  ├─ f2 failhide ✗
   │  │  ├─ 2 blockers 🔴
   │  │  └─ at .reviews/failhide.md
   │  ├─ f3 test-scopes ✗
   │  │  ├─ 1 blocker 🔴
   │  │  ├─ 3 nitpicks 🟠
   │  │  └─ at .reviews/test-scopes.md
   │  └─ f4 test-frames ✗
   │     ├─ 1 nitpick 🟠
   │     └─ at .reviews/test-frames.md
   └─ summary
      ├─ 3 blockers 🔴
      └─ 4 nitpicks 🟠
```

### guard compatibility

route guard `reviewed?` parses stdout via regex:

```
blockers: N
nitpicks: N
```

the summary section must include these parseable lines (can be in tree format):

```
└─ summary
   ├─ 3 blockers 🔴    ← regex: /(\d+)\s*blockers?/i
   └─ 4 nitpicks 🟠   ← regex: /(\d+)\s*nitpicks?/i
```

### emoji conventions

| emoji | meaning |
|-------|---------|
| ✓ | focus passed (no findings) |
| ✗ | focus failed (has findings) |
| 🔴 | blocker count |
| 🟠 | nitpick count |

## .output files

each focus writes its review to `$output/$slug.md`:

```
.reviews/
├─ failfast.md
├─ failhide.md
├─ test-scopes.md
└─ test-frames.md
```

## .execution

### parallel by default

all focuses run in parallel. wait for all to complete before stdout.

### exit codes

| code | meaning |
|------|---------|
| 0 | all focuses passed |
| 2 | blockers found |

## .ground truth

reference implementations in ehmpathy/rhachet-roles-bhrain:

| file | purpose |
|------|---------|
| `src/domain.operations/review/genReviewOutputStdout.ts` | review skill stdout format |
| `src/domain.operations/route/guard/formatGuardTree.ts` | guard tree emoji conventions |
| `src/domain.operations/route/guard/getReviewCountsFromContent.ts` | regex patterns to parse blockers/nitpicks |
| `src/domain.operations/route/guard/runStoneGuardReviews.ts` | how guards invoke peer reviews |

## .mvp scope

phase 1: implement `review.by` with:
- [x] focus config loading
- [x] parallel focus execution
- [x] stdout format with guard compatibility
- [x] exit code semantics

phase 2: add to ehmpathy roles:
- [ ] mechanic focuses.yml
- [ ] ergonomist focuses.yml
- [ ] architect focuses.yml

## .note

this skill lives in bhrain because it orchestrates reviews. the focus definitions live in each role because they define domain-specific rule groupings.
