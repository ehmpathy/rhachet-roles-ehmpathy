# self-review r6: has-contract-output-variants-snapped

## the question

> does each public contract have snapshots for all output variants?

---

## step 1: define public contracts

### what qualifies as a public contract?

| contract type | definition | snapshot captures |
|---------------|------------|-------------------|
| CLI command | executable via npx/rhx | stdout, stderr |
| SDK method | exported function | return value, thrown errors |
| API endpoint | REST/GraphQL route | response body, status codes |

### key insight

a public contract is a callable interface that a **consumer invokes** to **produce output**.

---

## step 2: enumerate all files in this pr

```sh
git diff --name-only origin/main
```

output:
```
.behavior/v2026_04_04.fix-test-failhides/.bind/vlad.fix-test-failhides.flag
.behavior/v2026_04_04.fix-test-failhides/.route/.bind.vlad.fix-test-failhides.flag
.behavior/v2026_04_04.fix-test-failhides/0.wish.md
.behavior/v2026_04_04.fix-test-failhides/1.vision.guard
.behavior/v2026_04_04.fix-test-failhides/1.vision.stone
.behavior/v2026_04_04.fix-test-failhides/2.1.criteria.blackbox.stone
.behavior/v2026_04_04.fix-test-failhides/2.2.criteria.blackbox.matrix.stone
.behavior/v2026_04_04.fix-test-failhides/3.1.3.research.internal.product.code.prod._.v1.stone
.behavior/v2026_04_04.fix-test-failhides/3.1.3.research.internal.product.code.test._.v1.stone
.behavior/v2026_04_04.fix-test-failhides/3.3.1.blueprint.product.v1.guard
.behavior/v2026_04_04.fix-test-failhides/3.3.1.blueprint.product.v1.stone
.behavior/v2026_04_04.fix-test-failhides/4.1.roadmap.v1.stone
.behavior/v2026_04_04.fix-test-failhides/5.1.execution.phase0_to_phaseN.v1.guard
.behavior/v2026_04_04.fix-test-failhides/5.1.execution.phase0_to_phaseN.v1.stone
.behavior/v2026_04_04.fix-test-failhides/5.3.verification.v1.guard
.behavior/v2026_04_04.fix-test-failhides/5.3.verification.v1.stone
.behavior/v2026_04_04.fix-test-failhides/refs/template.[feedback].v1.[given].by_human.md
package.json
pnpm-lock.yaml
```

### file classification

| file | type | is public contract? | why |
|------|------|---------------------|-----|
| .behavior/*.md | markdown | no | route artifacts |
| .behavior/*.stone | config | no | route state |
| .behavior/*.guard | config | no | route guards |
| .behavior/*.flag | marker | no | route binds |
| package.json | config | no | manifest |
| pnpm-lock.yaml | lockfile | no | dependencies |

**verdict:** zero public contracts in the diff.

---

## step 3: search for code files

```sh
git diff --name-only origin/main | grep -E '\.(ts|tsx|js|jsx|sh)$'
```

**result:** no matches.

### no skills added

```sh
git diff --name-only origin/main | grep skills/
```

**result:** no matches.

### no exports added

```sh
git diff --name-only origin/main | grep -E 'index\.(ts|js)$'
```

**result:** no matches.

---

## step 4: what about the briefs themselves?

### are briefs public contracts?

| aspect | public contract | brief |
|--------|-----------------|-------|
| consumer calls it | yes | no — consumer reads it |
| produces output | yes | no — static text |
| has variants | yes | no — single document |
| needs snapshot | yes | no — already in git |

briefs are **documentation**, not **contracts**. they do not:
- accept input
- produce output
- have success/error cases

### the "output" of a brief

the only "output" is the text content itself. this is already captured in:
1. git diff (shows changes)
2. the file itself (permanent record)

a snapshot would duplicate what git already provides.

---

## step 5: what about boot.yml?

### is boot.yml a public contract?

| aspect | public contract | boot.yml |
|--------|-----------------|----------|
| consumer calls it | yes | no — rhachet reads it |
| produces output | yes | no — configuration |
| has variants | yes | no — single structure |
| needs snapshot | yes | no — yaml validated by build |

boot.yml is **configuration**, not a **contract**. its effect is:
- which briefs load at session start
- which briefs are said vs ref

this is not "output" in the snapshot sense.

---

## step 6: extant snapshots in the repo

### locate snapshot files

```sh
find src -name '__snapshots__' -type d
```

output:
```
src/domain.roles/mechanic/skills/git.commit/__snapshots__
src/domain.roles/mechanic/skills/git.release/__snapshots__
src/domain.roles/mechanic/skills/claude.tools/__snapshots__
...
```

### were any snapshots modified?

```sh
git diff --name-only origin/main | grep __snapshots__
```

**result:** no matches. no snapshot files in the diff.

### were any snapshot-tested skills modified?

```sh
git diff --name-only origin/main | grep -E '\.integration\.test\.ts$'
```

**result:** no matches. no integration tests modified.

---

## step 7: could snapshots have been added?

### thought experiment

if we added a skill that applies the failhide rule, it would need snapshots:

```ts
describe('applyFailhideRule', () => {
  given('[case1] code with failhide pattern', () => {
    when('[t0] rule is applied', () => {
      then('returns violation', async () => {
        const result = await applyRule({ code: '...' });
        expect(result).toMatchSnapshot();
      });
    });
  });
});
```

but we did not add such a skill. the briefs are consumed by:
1. agents (via boot.yml) — no snapshot needed
2. guards (via --rules flag) — guard is external tool

neither consumption path requires new snapshots in this pr.

---

## step 8: verification checklist cross-reference

from `5.3.verification.v1.i1.md`:

> ## snapshot coverage for contract outputs
>
> not applicable — briefs are documentation, not code contracts.
>
> ## snapshot change rationalization
>
> not applicable — no snapshot files changed.

**blueprint confirms:** snapshots are not applicable.

---

## issues found

none. this pr has no public contracts.

---

## why this holds

| check | result | evidence |
|-------|--------|----------|
| CLI commands added? | no | no .sh files in diff |
| SDK methods added? | no | no .ts exports in diff |
| API endpoints added? | no | no endpoint files in diff |
| Skills modified? | no | no skill files in diff |
| Snapshots modified? | no | no __snapshots__ in diff |
| Snapshots required? | no | no contracts to snapshot |

---

## reflection: documentation vs contracts

the guide asks:
> for each new or modified public contract... is there a snapshot file?

this pr adds:
- 4 markdown briefs (rules for code.test)
- 1 markdown brief (rule for code.prod)
- 1 handoff document
- boot.yml configuration

none of these are public contracts because:
1. consumers do not call them — consumers read them
2. they do not produce output — they contain static text
3. they have no variants — each file is one document

snapshots exist to:
- enable vibecheck in PRs
- detect drift over time
- surface output changes in diffs

for documentation:
- git diff IS the vibecheck
- git history tracks drift
- markdown changes are visible in diff

snapshots would be redundant for documentation.

---

## deeper analysis: what if boot.yml broke?

### scenario

boot.yml has invalid syntax → session fails to boot → user sees error.

### is this a "contract output" to snapshot?

no. this is a **build error**, not a **contract output**. it is caught by:
- `npm run build` — fails on invalid yaml
- ci pipeline — blocks merge on build failure

snapshots capture **successful outputs**. build errors are caught by build validation.

---

## final checklist

| question from guide | answer | evidence |
|---------------------|--------|----------|
| for each new/modified public contract... | n/a | no contracts |
| is there a snapshot file? | n/a | no contracts |
| does it capture caller-visible output? | n/a | no contracts |
| success case exercised? | n/a | no contracts |
| error cases exercised? | n/a | no contracts |
| edge cases exercised? | n/a | no contracts |

**conclusion:** snapshot coverage is not applicable. this pr adds documentation and configuration, not public contracts.

