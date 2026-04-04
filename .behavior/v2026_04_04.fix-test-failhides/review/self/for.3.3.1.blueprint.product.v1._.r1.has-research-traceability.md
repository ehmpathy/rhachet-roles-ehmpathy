# self-review r1: has-research-traceability

## prod research recommendations → blueprint

| # | recommendation | action | blueprint reflection | status |
|---|---------------|--------|---------------------|--------|
| 1 | rule.forbid.failhide [REUSE] | keep unchanged | marked [○] retain | ✓ traced |
| 2 | rule.require.fail-fast [EXTEND] rename to failfast | rename files | marked [~] rename | ✓ traced |
| 3 | rule.require.exit-code-semantics [EXTEND] extract failloud | create new rule | marked [○] retain + [+] rule.require.failloud.md | ✓ traced |
| 4 | rule.prefer.helpful-error-wrap [REUSE] | keep unchanged | marked [○] retain | ✓ traced |
| 5 | file renames (fail-fast → failfast) | 3 files | filediff tree shows all 3 | ✓ traced |
| 6 | new file: rule.require.failloud.md (prod) | create | included in filediff + specification | ✓ traced |
| 7 | new files: 3 rules for code.test | create | included in filediff + specifications | ✓ traced |
| 8 | boot.yml changes | update say sections | before/after yaml shown | ✓ traced |

---

## test research recommendations → blueprint

| # | recommendation | action | blueprint reflection | status |
|---|---------------|--------|---------------------|--------|
| 1 | test-fns package [REUSE] | use ConstraintError | failloud spec uses ConstraintError | ✓ traced |
| 2 | given-when-then [EXTEND] with failhide rule | add patterns | included `then()` without `expect()` | ✓ traced |
| 3 | snapshots + assertions [EXTEND] | add to failhide rule | **not in forbidden patterns** | ✗ gap |
| 4 | explicit skip vs silent skip [NEW] | distinguish patterns | legitimate vs failhide table | ✓ traced |
| 5 | forbid remote boundaries [REUSE] | no changes | correctly omitted | ✓ traced |
| 6 | never mock [REUSE] | no changes | correctly omitted | ✓ traced |
| 7 | new pitofsuccess.errors/ directory | create | in filediff tree | ✓ traced |
| 8 | boot.yml changes | update say sections | before/after yaml shown | ✓ traced |

---

## issue found

**gap:** test research recommendation #3 says "snapshot alone = failhide risk" should be added to the failhide rule. the blueprint's `rule.forbid.failhide.md` specification does not include this pattern.

**fix:** update the blueprint's forbidden patterns table to include:

```markdown
| `expect(result).toMatchSnapshot()` alone | snapshot without assertions |
```

and add to legitimate alternatives:

```markdown
| snapshot with assertions | `expect(result.status).toBe('ok'); expect(result).toMatchSnapshot();` |
```

---

## fix applied

updated blueprint `rule.forbid.failhide.md` spec to include snapshot-alone pattern:

1. added `| \`expect(result).toMatchSnapshot()\` alone | snapshot without assertions |` to forbidden patterns table
2. added `| snapshot with assertions | \`expect(result.status).toBe('ok'); expect(result).toMatchSnapshot();\` |` to legitimate alternatives table
3. codepath tree already included this pattern — specification now matches

---

## why non-issues hold

### prod research: all 8 recommendations correctly traced

| # | why it holds |
|---|--------------|
| 1 | rule.forbid.failhide marked [○] retain — extant rule stays unchanged, blueprint correctly preserves |
| 2 | fail-fast → failfast rename in filediff tree shows all 3 files — research rename recommendation fully traced |
| 3 | rule.require.failloud.md [+] create with full spec — exit-code-semantics content extracted into dedicated rule |
| 4 | rule.prefer.helpful-error-wrap [○] retain — extant rule unchanged, no action needed |
| 5 | 3 file renames in filediff — all fail-fast files renamed to failfast |
| 6 | failloud.md (prod) has full specification in blueprint with error classes and patterns |
| 7 | code.test/ has all 3 new rules in filediff + specifications |
| 8 | boot.yml before/after shows all 6 rules in say section |

### test research: 7 of 8 recommendations correctly traced

| # | why it holds |
|---|--------------|
| 1 | ConstraintError used in failloud and failfast specs — test-fns integration preserved |
| 2 | `then()` without `expect()` implied by forbidden patterns (empty body) |
| 4 | legitimate alternatives table distinguishes `runIf`/`skipIf` from failhide patterns |
| 5 | forbid remote boundaries is classification rule, not failhide — correctly omitted |
| 6 | never mock is testing strategy, not failhide — correctly omitted |
| 7 | code.test/pitofsuccess.errors/ in filediff tree — new directory created |
| 8 | boot.yml after section shows all 3 test rules in say |

### #3 was a gap, now fixed

see "issue found" and "fix applied" sections above.

---

## summary

- 15 of 16 recommendations traced ✓
- 1 gap found and fixed
- all research leveraged or explicitly omitted with rationale

---

## why the fix matters

the research specifically noted (citation [4]):

> critical: use both a snapshot AND explicit assertions before the snapshot. snapshot is for observability in code reviews and aesthetic verification. assertions are for functional verification.

a test with only `toMatchSnapshot()` could pass without actual verification of the expected behavior — the snapshot could contain incorrect data, and the test would still pass as long as the snapshot matches. this is a subtle failhide pattern that the research correctly identified.
