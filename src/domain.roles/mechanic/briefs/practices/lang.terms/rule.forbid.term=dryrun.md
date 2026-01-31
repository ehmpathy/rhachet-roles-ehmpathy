### .rule = forbid-term-dryrun

#### .what
the term `dryrun` (and variants `dry-run`, `dry_run`, `dryRun`) is forbidden

#### .scope
- code: variable names, function names, parameters, comments
- files: filenames, directory names
- docs: markdown, briefs, prompts
- comms: commit messages, pr descriptions

#### .why

**double negatives**
- `dryRun: false` means "actually do it" — a double negative
- `dryRun: true` means "don't actually do it" — confuses intent
- negatives require mental gymnastics to parse

**boolean limits extensibility**
- what if you need `VALIDATE` mode? `DIFF` mode? `PREVIEW` mode?
- a boolean can't grow — you end up with `dryRun` + `validateOnly` + `diffMode`
- an enum scales cleanly: `mode: 'PLAN' | 'VALIDATE' | 'DIFF' | 'APPLY'`

**unclear semantics**
- "dry run" is jargon — not everyone knows it means "simulate"
- `PLAN` and `APPLY` are self-evident

#### .enforcement
use of `dryrun` variants = **BLOCKER**

#### .pattern: `mode: 'PLAN' | 'APPLY'`

the recommended alternative:

```ts
// instead of boolean
const result = await deploy({ dryRun: true });   // 👎
const result = await deploy({ dryRun: false });  // 👎 double negative

// use explicit modes
const result = await deploy({ mode: 'PLAN' });   // 👍 clear: just plan
const result = await deploy({ mode: 'APPLY' });  // 👍 clear: actually do it
```

#### .extensibility

the enum pattern scales to new modes:

```ts
type DeployMode =
  | 'PLAN'      // show what would happen
  | 'VALIDATE'  // check preconditions only
  | 'DIFF'      // show changes as diff
  | 'APPLY';    // execute for real

const result = await deploy({ mode: 'DIFF' });
```

with a boolean, you'd need:
```ts
// 👎 boolean explosion
deploy({ dryRun: true, diffMode: true, validateOnly: false })
```

#### .common usecases

| 👎 dryrun pattern | 👍 mode pattern |
| ----------------- | --------------- |
| `dryRun: true` | `mode: 'PLAN'` |
| `dryRun: false` | `mode: 'APPLY'` |
| `--dry-run` flag | `--mode plan` |
| `DRY_RUN=1` env | `MODE=plan` env |

#### .variants (all forbidden)

- `dryRun`
- `dryrun`
- `dry_run`
- `dry-run`
- `isDryRun`
- `DRY_RUN`

#### .see also
- `rule.require.ubiqlang` — use precise domain terms
- `rule.forbid.term=normalize` — similar overloaded term
