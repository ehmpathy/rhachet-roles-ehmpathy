# define.eval-confusion-matrix

## .what

evals verify that a brain correctly applies rules to code. the confusion matrix measures both dimensions of review quality: catching real issues AND avoiding false alarms.

## .the mindset

**evals must test both directions.**

a brain that flags everything would pass all positive cases — but that's useless.
a brain that flags none would pass all negative cases — but that's also useless.

without positive cases, we can't prove the brain catches real issues.
without negative cases, we can't prove the brain avoids false alarms.

**every eval suite needs both.**

| case type | proves | without it |
|-----------|--------|------------|
| positive (expected=present) | brain catches real issues | brain could flag none and pass |
| negative (expected=absent) | brain avoids false alarms | brain could flag everything and pass |

this is not optional. an eval suite with only one type of case is incomplete.

## .why

a brain that flags everything would catch all real issues but also waste developer time on false alarms.
a brain that flags none would never waste time but also never catch bugs.

we need to measure both:
- **sensitivity**: does it catch real issues?
- **specificity**: does it avoid false alarms?

## .the confusion matrix

```
┌──────────┬──────────┬────────────────┬─────────────────────────────────────────────┐
│ expected │ observed │     result     │                   meaning                   │
├──────────┼──────────┼────────────────┼─────────────────────────────────────────────┤
│ present  │ present  │ true-positive  │ generator correctly flagged issue           │
├──────────┼──────────┼────────────────┼─────────────────────────────────────────────┤
│ present  │ absent   │ false-negative │ generator missed issue it should catch      │
├──────────┼──────────┼────────────────┼─────────────────────────────────────────────┤
│ absent   │ absent   │ true-negative  │ generator correctly did not flag            │
├──────────┼──────────┼────────────────┼─────────────────────────────────────────────┤
│ absent   │ present  │ false-positive │ generator incorrectly flagged (false alarm) │
└──────────┴──────────┴────────────────┴─────────────────────────────────────────────┘
```

## .sensitivity vs specificity

```
┌─────────────┬────────────────┬──────────────────────────────────┐
│  dimension  │    formula     │           failure mode           │
├─────────────┼────────────────┼──────────────────────────────────┤
│ sensitivity │ TP / (TP + FN) │ too lenient — misses real issues │
├─────────────┼────────────────┼──────────────────────────────────┤
│ specificity │ TN / (TN + FP) │ too strict — flags valid code    │
└─────────────┴────────────────┴──────────────────────────────────┘
```

| metric | what it answers | low score means |
|--------|-----------------|-----------------|
| sensitivity | "of all real issues, how many did we catch?" | brain is too lenient |
| specificity | "of all valid code, how much did we leave alone?" | brain is too strict |

## .the eval balance

every focus needs both types of cases:

### positive cases (expected=present)

scenes with real violations. the brain should flag them.

| result | meaning |
|--------|---------|
| true-positive | brain correctly caught the issue |
| false-negative | brain missed an issue it should catch |

### negative cases (expected=absent)

scenes with valid code. the brain should stay quiet.

| result | meaning |
|--------|---------|
| true-negative | brain correctly stayed quiet |
| false-positive | brain incorrectly flagged valid code |

## .failure modes

| failure | cause | symptom |
|---------|-------|---------|
| low sensitivity | brain too lenient | bugs slip through reviews |
| low specificity | brain too strict | developers ignore review output |

a brain with only true-positive cases would pass if it flags everything.
a brain with only true-negative cases would pass if it flags none.

we need both to prove the brain works.

## .pass criteria

```typescript
pass = checks.every(c =>
  c.result === 'true-positive' ||
  c.result === 'true-negative'
)
```

any false-negative or false-positive = fail.

## .check format

each check specifies:
- `slug` — unique identifier
- `description` — what we're verifying
- `expected` — `present` (should flag) or `absent` (should not flag)
- `severity` — `blocker`, `nitpick`, or `blocker|nitpick` (either)
- `reason` — multiline description of what specific issue to look for

```yaml
# positive case: should flag this specific issue
checks:
  - slug: empty-catch-flagged
    description: should flag empty catch block
    expected: present
    severity: blocker
    reason: |
      the catch block is empty and swallows the error
      keywords: swallow, hidden, empty catch

# negative case: should NOT flag this valid pattern
checks:
  - slug: valid-handler-clean
    description: should NOT flag HelpfulError.wrap
    expected: absent
    severity: blocker|nitpick  # should not flag at any severity
    reason: |
      line 25 uses HelpfulError.wrap which is valid
      this should NOT be flagged
```

**key insight**: each check looks for ONE SPECIFIC finding (or absence). use `reason` to describe exactly what issue should or should not be flagged.

## .see also

- generator + evaluator pattern for eval architecture
- howto.write-review-evals for create new eval cases
