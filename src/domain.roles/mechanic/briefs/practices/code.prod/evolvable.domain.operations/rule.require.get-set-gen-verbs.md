### .rule = require-get-set-gen-verbs

#### .what
all domain operations must use one of the sanctioned verb prefixes:

- **core verbs** — `get`, `set`, `gen`, `del` (retrieval + the mutation triad)
- **transformer prefixes** — `as*`, `is*` (pure, single-value shape work)

domain-specific action verbs (e.g., `dispatch`, `enqueue`, `disrupt`) are allowed only for imperative commands that don't fit the patterns above.

the transformer prefixes are the de-facto ehmpathy convention for pure transformers and are formalized in `rule.require.named-transformers`; this brief sanctions them here so the two briefs agree (an `as*` transformer must NOT be forced to `getOne*`).

#### .scope
- applies to all operations in `domain.operations/`
- applies to all dao methods
- exempt: contract/cli entry points (e.g., `invokeAct`), imperative action commands (e.g., `dispatchTask`, `enqueueTask`), and HOF wrappers with `with*` prefix (e.g., `withLogTrail`, `withRetry`, `withSimpleCache`)

#### .why

**symmetry makes mutations explicit**

the four core verbs form a **closed system** — a quad: `get` reads, and `set` / `gen` / `del` are the mutation triad. one read axis, three mutation axes. this symmetry does real work:

1. **`get` declares zero side effects** — one axis reads, the other three mutate. any operation prefixed with `get` is guaranteed pure: no hidden writes, no state changes. this is a promise to the caller.

2. **`gen` and `del` mirror each other** — `gen` is *ensure-present* (findsert: create if absent, preserve if present); `del` is *ensure-absent* (idempotent delete: remove if present, no-op if absent). both are idempotent, and both converge to a **declared existence state** — they are the declastruct control primitives. the mirror prompts the question: "if i can `gen` this resource, can i `del` it?" a lifecycle with a create but no idempotent teardown is a gap the symmetry exposes. (this is the same convergence pressure as `rule.require.idempotent-operations`.)

3. **where there's a `set`, there should probably be a `gen`** — the symmetry prompts "should callers findsert or upsert?" and forces a conscious answer. without the system, this question is never asked.

4. **`set` / `gen` / `del` force you to name what you mutate** — `setTerminalToWatchClone` is explicit about the mutation target (terminal state). a custom verb like `watchClone` _implies_ the mutation but hides it. the mutation-verb prefix is a contract: "this operation mutates X."

5. **custom verbs obscure mutation targets** — `enrollClone` sounds like it creates a clone, but what state does it actually mutate? crew registry? daemon? filesystem? `setClone` declares: "i mutate clone state." the reader knows immediately what changed.

**additional benefits:**
- eliminates verb ambiguity across the codebase
- prevents synonym drift (`find`, `fetch`, `lookup`, `load`, `ensure`, `derive`, `compute` all collapse into `get` or `gen`)
- every operation's intent is clear from its name alone

---

#### .the core verbs

| verb | semantics | creates? | idempotent? | analogy |
|------|-----------|----------|-------------|---------|
| `get` | retrieve, lookup | never | yes (pure read) | select |
| `set` | mutate state, always write | yes (always writes) | yes (upsert) | upsert |
| `gen` | find extant or create new | only if not found | yes (findsert) | findsert |
| `del` | remove state, no-op if absent | never | yes (idempotent delete) | delete |

all four are idempotent. `set` and `gen` differ only in mutation semantics:
- `set` = upsert — always writes, overwrites if extant
- `gen` = findsert — returns extant if found, only writes if absent
- `del` = idempotent delete — removes if extant, no-op if absent (findsert-inverse)

`del` is the canonical delete verb across the declastruct ecosystem (e.g. `delVpc`, `delEc2Instance`, `delOrganization`). it maps to the `delete` mutation semantic in `rule.forbid.nonidempotent-mutations` — a `del*` operation must NOT be flagged as a forbidden `set`.

---

#### .get = retrieve extant

`get` retrieves, looks up, or deterministically derives data from what already exists. it never creates or mutates.

pure shape work (parse, cast, boolean check) uses a **transformer prefix** (`as*` / `is*`), not `get` — see `.the transformer prefixes` below.

**cardinality is required**: always `getOne*` or `getAll*`.

| subtype | description | example |
|---------|-------------|---------|
| lookup | find by key in known source | `getOneSiteBySlug({ orchestrator, slug })` |
| compute | deterministic derivation from inputs | `getOneCloneSlug({ role, index })` |
| enumerate | list all of a resource | `getAllClonesForZone({ zone })` |
| assemble | compose from multiple extant sources | `getOneContextCli({ cwd })` |

**the test**: if you remove the operation and the world is unchanged — it's a `get` (or a transformer).

##### .forbidden synonyms

these are all `get` in disguise:

| synonym | use instead |
|---------|-------------|
| `find` | `getOne` or `getAll` |
| `fetch` | `getOne` or `getAll` |
| `lookup` | `getOne` |
| `load` | `getOne` |
| `list` | `getAll` |
| `enumerate` | `getAll` |

these look like `get` but are pure shape transformers — use a transformer prefix, not `getOne`:

| synonym | use instead |
|---------|-------------|
| `parse` | `as*` (e.g. `asZoneAddress`) |
| `cast` | `as*` (e.g. `asStripeCustomer`, or `as$Noun1From$Noun2` for direction) |

deterministic derivation stays a `get` (compute subtype): `derive` / `infer` → `getOne*`.

---

#### .set = mutate state (upsert)

`set` always writes. it persists, registers, spawns, or overwrites state. it is the upsert primitive.

| subtype | description | example |
|---------|-------------|---------|
| persist | write to dao/filesystem | `setZone({ site, branch, path })` |
| register | add to registry | `setSite({ orchestrator, site })` |
| spawn | start a process | `setZoneDaemon({ zone })` |
| overwrite | always replace | `setTaskPriority({ task, clone })` |

**every `set` that operates on data entities should have a `gen` wrapper** — callers should default to `gen` (findsert) unless they explicitly need `set` (upsert). both are idempotent — the difference is whether extant state is preserved or overwritten. exceptions where `set` without `gen` is fine:
- explicit upserts where overwrite is always intended (e.g., `setTaskPriority`)
- terminal/ui state mutations that aren't data entities (e.g., `setTerminalToWatchClone`)

##### .forbidden synonyms

| synonym | use instead |
|---------|-------------|
| `create` | `set` (wrapped by `gen`) |
| `insert` | `set` (wrapped by `gen`) |
| `save` | `set` |
| `update` | `set` |
| `register` | `set` |
| `enroll` | `set` |
| `spawn` | `set` |
| `write` | `set` |
| `persist` | `set` |

---

#### .gen = find-or-create (findsert)

`gen` has findsert semantics — it checks for extant state first, and only calls `set` if no match is found. unlike `set` (which always overwrites), `gen` preserves extant state.

| subtype | description | example |
|---------|-------------|---------|
| findsert entity | find extant or enroll/init new | `genClone({ zone, address, config })` |
| findsert process | find alive or spawn fresh | `genZoneDaemon({ zone })` |
| findsert registry | find in registry or load + register | `genSite({ path, orchestrator })` |
| scaffold | generate new resource from defaults | `genSiteManifest({ path })` |
| construct | build new domain object with generated id | `genTask({ mode, prompt, clone, zone })` |

**the test**: if the resource already exists, `gen` returns it without mutation. if it doesn't exist, `gen` creates it via `set`.

**`gen` is the caller-faced verb** — `set` is the internal primitive. external callers should almost always use `gen`.

##### .forbidden synonyms

| synonym | use instead |
|---------|-------------|
| `ensure` | `gen` |
| `findOrCreate` | `gen` |
| `init` | `gen` (or `set` if always-write) |
| `provision` | `gen` |
| `bootstrap` | `gen` |
| `setup` | `gen` |

---

#### .del = delete (idempotent)

`del` removes state. it is idempotent: it removes the resource if extant, and is a no-op if already absent. this is the findsert-inverse — the fourth member of the mutation model documented in `rule.forbid.nonidempotent-mutations` (findsert / upsert / **delete**).

| subtype | description | example |
|---------|-------------|---------|
| remove entity | delete a persisted resource | `delVpc({ vpc })` |
| remove registry | drop from a registry | `delSite({ orchestrator, site })` |
| remove alias | remove a named handle | `delUnixSshAlias({ alias })` |

`del` is the authoritative delete verb across the declastruct ecosystem (`delEc2Instance`, `delOrganization`, `delLambdaVersion`, …). do NOT rename `del*` to `set*` — a delete is not an upsert.

##### .forbidden synonyms

| synonym | use instead |
|---------|-------------|
| `delete` | `del` |
| `remove` | `del` |
| `destroy` | `del` |
| `drop` | `del` |
| `teardown` | `del` |
| `deprovision` | `del` |

---

#### .the transformer prefixes

pure single-value **shape** work does NOT use the core verbs. it uses a **transformer prefix**. these are the de-facto ehmpathy convention (see `rule.require.named-transformers`) and are first-class here — a reviewer must NOT demand a `getOne*` rename.

| prefix | semantics | example |
|--------|-----------|---------|
| `as*` | cast/parse one shape into another | `asKeyrackKeyOrg({ slug })`, `asStripeCustomer(customer)` |
| `is*` | boolean check | `isEligibleForPremiumFeatures({ user })` |

`as*` is the single canonical cast prefix. two forms:

- **`as$Noun`** — the target shape names the cast: `asStripeCustomer`, `asZoneAddress`, `asDeclaredAwsIamRole`
- **`as$Noun1From$Noun2`** — when you need to spell the source for clarity or to disambiguate a pair: `asStripeCustomerFromDeclaredCustomer`, `asDeclaredCustomerFromStripeCustomer`

notes:
- prefer plain `as$Noun`; reach for `as$Noun1From$Noun2` only when the source matters (a bidirectional pair, or an ambiguous target).
- the `cast*` prefix (`castFrom*` / `castInto*`) is **deprecated** — migrate to `as*`. do NOT introduce new `cast*` operations.
- these are pure and side-effect-free, like `get`, but they transform a shape rather than retrieve — so they carry their own prefix instead of `getOne*`.
- deterministic *derivation* (a calculated value, not a shape conversion) stays a `get` compute-subtype (`getOneCloneSlug`, `getOneInvoiceTotal`), not a transformer prefix.

---

#### .decision tree

```
does it modify state?
├── no
│   ├── does it transform a value's shape? (parse, cast, bool)
│   │   └── yes → transformer prefix (as* / is*)
│   └── does it retrieve or derive extant data?
│       └── yes → get (getOne* or getAll*)
└── yes (set, gen, del are all idempotent)
    ├── does it remove state? → del (no-op if absent)
    ├── should extant state be preserved? (findsert)
    │   └── yes → gen (wraps set internally)
    └── should extant state be overwritten? (upsert)
        └── yes → set
```

---

#### .examples

##### positive
```ts
// get = pure retrieval, no side effects
getOneCloneSlug({ role: 'mechanic', index: 1 })     // → 'mechanic.1'
getAllClonesForZone({ zone })                          // → Clone[]
getOneSiteBySlug({ orchestrator, slug })               // → Site | null
getOneContextCli({ cwd })                              // → ContextCli (assemble)

// set = always mutate
setClone({ zone, role, brain, index })                 // → Clone (enroll)
setZoneDaemon({ zone })                                // → ZoneDaemon (spawn)
setSite({ orchestrator, site })                        // → Site (register)

// gen = find-or-create (idempotent default)
genClone({ zone, address, config })                    // find extant or setClone
genZoneDaemon({ zone })                                // find alive or setZoneDaemon
genSite({ path, orchestrator })                        // find in registry or setSite
```

##### negative
```ts
findClone({ zone, role })        // 👎 use getOneClone
loadSite({ path })               // 👎 use getOneSite
ensureClone({ zone, address })   // 👎 use genClone
createTask({ mode, prompt })     // 👎 use genTask
parseZoneAddress({ raw })        // 👎 use asZoneAddress (transformer)
computeNextIndex({ zone, role }) // 👎 use getOneCloneNextIndex (derivation is a get)
removeVpc({ vpc })               // 👎 use delVpc
listTasks({ zone })              // 👎 use getAllTasksForZone
```

##### positive — transformers & delete
```ts
asZoneAddress({ raw: '@feat/auth' })                  // cast: raw → ZoneAddress
asDeclaredAwsIamRole(sdk)                              // cast: sdk → domain
asStripeCustomerFromDeclaredCustomer(customer)        // cast with source spelled out
isEligibleForPremiumFeatures({ user })                // boolean check
delVpc({ vpc })                                       // idempotent delete
```

#### .enforcement
- operation name that doesn't use a sanctioned prefix (`get`/`set`/`gen`/`del`, or transformer `as*`/`is*`) = **BLOCKER**
- `get` without `One`/`All` cardinality = **BLOCKER**
- `set` on data entity without `gen` wrapper = **BLOCKER** (unless explicit upsert)
- synonym verb instead of a sanctioned prefix = **BLOCKER**
- an `as*` transformer flagged and forced to `getOne*` = **false positive**, not a violation
- a `del*` delete flagged and forced to `set*` = **false positive**, not a violation
- a new `cast*` operation = **BLOCKER** (deprecated — use `as*` / `as$Noun1From$Noun2`)

#### .see also
- `rule.require.named-transformers` — the transformer prefixes (`as*`/`is*`) in full
- `rule.forbid.nonidempotent-mutations` — the findsert/upsert/delete mutation model `del` maps onto
- `rule.require.idempotent-operations` (architect) — the `gen`↔`del` convergence pressure at contract scale
