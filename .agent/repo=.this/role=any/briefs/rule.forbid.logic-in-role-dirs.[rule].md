# rule.forbid.logic-in-role-dirs

## .what

`src/domain.roles/<role>/` is reserved for that role's **specification** — the briefs, skills,
inits, and the `get<Role>Role.ts` that assembles them, plus the tests of that assembly.

a domain operation does **not** live there. not at the role root, not nested inside it. it lives
in `src/domain.operations/<subdomain>/`.

## .why

- **a role dir is a published contract, not a workspace.** the build rsyncs `src/domain.roles/`
  into `dist/`, which is symlinked into `.agent/` and read by every consumer repo. a util parked
  beside the role spec is noise in a surface other people read.
- **the role root is the path of least resistance, so it silently accretes.** a transformer
  written for one role's test lands next to that test, and six months later the role dir holds a
  dozen files no role describes. nobody set out to make that mess; each single file was the
  obvious place at the time.
- **a role-named op is a reuse barrier.** name a generic transformer `asMechanicHookEvents` and
  the next role writes its own copy rather than import one that reads as somebody else's.
- **the layers already exist.** `src/domain.operations/` is the declared home for operations
  (`rule.require.directional-deps`). a role dir that holds logic is not a new layer — it is a
  second, undeclared one.

## .the test

> **does this file describe WHAT THE ROLE IS, or does it ACT?**

- describes the role — a brief, a skill, an init, the role assembly, a test of that assembly
  → `src/domain.roles/<role>/`
- acts — a transformer, a communicator, an orchestrator → `src/domain.operations/`

a test **of the role spec** is a description of the role and stays collocated. a transformer that
test happens to call is not.

## .where the operation goes

follow `rule.prefer.most-common-denominator`: the farthest outermost leaf it can live at.

| the operation serves | it lives at |
|---|---|
| one skill | beside that skill |
| one subdomain | `src/domain.operations/<subdomain>/` |
| two or more subdomains | their common ancestor |

## .the name clause

an operation that leaves a role dir must also leave the role's **name** behind, unless the role
is genuinely part of the concept.

```ts
// 👎 bad — generic op, role-shaped name, in the generic dir
src/domain.operations/hooks/asMechanicHookEvents.ts

// 👍 good — the name matches the scope
src/domain.operations/hooks/asHookEvents.ts
```

same for a role literal baked into the body. take it as an input instead:

```ts
// 👎 bad — a generic op that only works for one role
const shape = /^\.agent\/repo=ehmpathy\/role=mechanic\/inits\/.../;

// 👍 good — the caller names its own tree
export const asMalformedHookPaths = (input: { paths: string[]; role: string }) => { ... };
```

## .examples

### 👎 bad — six transformers at the role root

```
src/domain.roles/mechanic/
├── asBashInvokedPaths.ts        ← acts
├── asMalformedHookPaths.ts      ← acts
├── asMechanicHookEvents.ts      ← acts, and names a role it does not need
├── asUnaccountedCommands.ts     ← acts
├── asWrappedCommands.ts         ← acts
├── isBashInvokedCommand.ts      ← acts
└── getMechanicRole.ts           ← describes the role
```

### 👍 good — the role dir holds the role

```
src/domain.roles/mechanic/
├── getMechanicRole.ts
├── getMechanicRole.test.ts                            ← tests the role spec
└── getMechanicRole.hooks-reachable.integration.test.ts ← tests the role spec

src/domain.operations/hooks/
├── asBashInvokedPaths.ts
├── asHookEvents.ts
├── asMalformedHookPaths.ts
├── asUnaccountedCommands.ts
├── asWrappedCommands.ts
└── isBashInvokedCommand.ts
```

## .enforcement

- a domain operation under `src/domain.roles/` = **blocker**
- an operation at a role **root** = **blocker** (the root is the sharpest case — it is where
  accretion starts)
- an operation outside a role dir that still carries a role's name or a role literal = **blocker**
- a test collocated with the role spec it grades = **false positive** (that is correct)

## .see also

- `repo.structure.md` — the src → dist → `.agent/` flow a role dir feeds
- `rule.prefer.most-common-denominator` (architect) — how far out the operation goes once it leaves
- `rule.require.directional-deps` (mechanic) — the layers this rule keeps distinct
- `rule.require.ubiqlang` (mechanic) — why a role-shaped name on a generic op is a defect
