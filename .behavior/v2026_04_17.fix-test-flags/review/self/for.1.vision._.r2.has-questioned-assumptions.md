# self-review r2: has-questioned-assumptions (deeper)

## fresh perspective

the wish says "failfast guide away" - not "replace with better option".

i assumed we NEED to add `--filter`. but what if the solution is simpler?

## deeper assumption: we must provide an alternative

**what the wish actually says:**
> failfast guide away from this -- --testNamePattern "..." type of usage

it doesn't say "provide a replacement". it says "guide away".

**what if we just blocked it?**

```bash
rhx git.repo.test --what acceptance -- --testNamePattern "..."

🐢 hold up, dude...

🐚 git.repo.test
   └─ ✋ blocked: -- --testNamePattern not supported

use --scope to filter by file path instead.
if you need to filter by test name, run jest directly.
```

**counterargument:** this is user-hostile. we block a capability without a replacement.

**verdict:** i still think we need `--filter` or equivalent. but i should acknowledge that "block with no replacement" is a valid interpretation of the wish.

## deeper assumption: the use case is valid

**who used `-- --testNamePattern`?** unknown.

**why did they use it?** 
- the pattern was `driver.route.bind|driver.route.failsafe`
- these look like describe block names, not file paths
- user wanted to run specific describe blocks, not whole files

**what if this use case shouldn't exist?**

maybe the test structure is wrong. if you need `--testNamePattern` to run a subset:
- tests may be too coarse (one big describe instead of many files)
- test organization may need refactor

**verdict:** valid point. the guidance could say "consider test split" instead of "use --filter". but that's prescriptive about test structure. safer to provide the escape hatch.

## deeper assumption: engineers use this CLI

**what if CI scripts use this pattern?**

CI might have:
```yaml
- run: rhx git.repo.test --what acceptance -- --testNamePattern "$SUBSET"
```

block would break CI. that's worse than awkward CLI usage.

**action needed:** check if any CI in this repo or related repos uses this pattern.

**verdict:** critical assumption. if CI uses this, we must provide migration path (deprecation warn) not immediate block.

## deeper assumption: `--filter` maps cleanly to jest

**what if jest changes `--testNamePattern`?**

jest could:
- deprecate the flag
- rename it
- change semantics

we'd be stuck with an abstraction over a target that moves.

**counterargument:** jest is stable. `--testNamePattern` has existed for years.

**verdict:** low risk but worth note. abstraction adds maintenance.

## deeper assumption: one flag is enough

**the wish pattern:** `"driver.route.bind|driver.route.failsafe"`

this is a regex OR pattern. jest `--testNamePattern` accepts regex.

**what if user wants:**
- exact match (not regex)?
- AND logic (run tests that match A AND B)?
- exclude pattern (run all EXCEPT X)?

`--filter` as a simple string doesn't handle all cases.

**verdict:** scope creep. the wish shows regex usage. support regex like jest does.

## summary of deeper assumptions

| assumption | status |
|------------|--------|
| must provide alternative | questioned - "guide away" could mean block-only |
| use case is valid | questioned - maybe test structure is the issue |
| engineers use CLI | critical - check if CI uses this pattern |
| jest API is stable | low risk |
| one flag is enough | reasonable - mirror jest regex behavior |

## action items surfaced

1. check if CI uses `-- --testNamePattern` pattern anywhere
2. decide: block-only vs block-with-alternative
3. if alternative, decide: `--filter` (familiar) vs `--name` (explicit)

## revision to vision

should add a "validate before implement" step: grep for `-- --testNamePattern` in CI configs.
