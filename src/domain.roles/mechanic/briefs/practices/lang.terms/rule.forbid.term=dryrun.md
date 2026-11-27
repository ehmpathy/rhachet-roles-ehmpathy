### .rule = forbid-term-dryrun

#### .what
the term `dryrun` (and variants `dry-run`, `dry_run`, `dryRun`) is forbidden. never control execution vs preview with a boolean — use `mode: 'PLAN' | 'APPLY'` instead

#### .scope
- code: variable names, function names, parameters, comments
- every operation parameter that controls execution vs preview: cli flags, api parameters, internal function signatures
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
- an enum explains itself; a boolean needs context

**plan | apply aligns with established patterns**
- terraform uses `plan` then `apply` — industry standard for infrastructure
- the pattern communicates: "show me what would happen" vs "make it happen"
- this repo's skills say the same: `--mode plan` (the default), `--mode apply`

**unclear semantics**
- "dry run" is jargon — not everyone knows it means "simulate"
- `PLAN` and `APPLY` are self-evident

**readability at call sites**
- `await sync({ mode: 'PLAN' })` — reads as intent
- `await sync({ dryRun: true })` — reads as implementation detail

#### .pattern: `mode: 'PLAN' | 'APPLY'`

the enum scales to new modes:

```ts
type DeployMode =
  | 'PLAN'      // show what would happen
  | 'VALIDATE'  // check preconditions only
  | 'DIFF'      // show changes as diff
  | 'APPLY';    // execute for real
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

#### .enforcement
- use of `dryrun` variants = **BLOCKER**
- a boolean that controls execution vs preview (`execute`, `preview`, `simulate`) = **BLOCKER**

#### .see also
- `philosophy.why-we-ban-terms` — why a heavy word gets banned
- `rule.forbid.term=dryrun.example=demo` — a 👎/👍 demo
- `rule.prefer.terraform` — terraform's plan/apply flow
- `rule.require.ubiqlang` — use precise domain terms
- `rule.forbid.term=normalize` — similar overloaded term
