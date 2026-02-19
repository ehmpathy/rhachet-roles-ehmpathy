### .rule = require-get-set-gen-verbs

#### .what
all domain operations must use exactly one of three verb prefixes: `get`, `set`, or `gen`

domain-specific action verbs (e.g., `dispatch`, `enqueue`, `disrupt`) are allowed only for imperative commands that don't fit the get/set/gen pattern.

#### .scope
- applies to all operations in `domain.operations/`
- applies to all dao methods
- exempt: contract/cli entry points (e.g., `invokeAct`) and imperative action commands (e.g., `dispatchTask`, `enqueueTask`)

#### .why

**symmetry makes mutations explicit**

the three verbs form a closed system. this symmetry does real work:

1. **where there's a `set`, there should probably be a `gen`** — the symmetry prompts the question "should callers findsert or upsert?" and forces a conscious answer. without the system, this question is never asked.

2. **`set` and `gen` force you to name what you mutate** — `setTerminalToWatchClone` is explicit about the mutation target (terminal state). a custom verb like `watchClone` _implies_ the mutation but hides it. the `set`/`gen` prefix is a contract: "this operation mutates X."

3. **custom verbs obscure mutation targets** — `enrollClone` sounds like it creates a clone, but what state does it actually mutate? crew registry? daemon? filesystem? `setClone` declares: "i mutate clone state." the reader knows immediately what changed.

4. **`get` declares zero side effects** — any operation prefixed with `get` is guaranteed pure. no hidden writes, no state changes. this is a promise to the caller.

**additional benefits:**
- eliminates verb ambiguity across the codebase
- prevents synonym drift (`find`, `fetch`, `lookup`, `load`, `ensure`, `derive`, `compute` all collapse into `get` or `gen`)
- every operation's intent is clear from its name alone

---

#### .the three verbs

| verb | semantics | creates? | idempotent? | analogy |
|------|-----------|----------|-------------|---------|
| `get` | retrieve, parse, cast, lookup, compute | never | yes (pure read) | select |
| `set` | mutate state, always write | yes (always writes) | yes (upsert) | upsert |
| `gen` | find extant or create new | only if not found | yes (findsert) | findsert |

all three are idempotent. `set` and `gen` differ only in mutation semantics:
- `set` = upsert — always writes, overwrites if extant
- `gen` = findsert — returns extant if found, only writes if absent

---

#### .get = retrieve extant

`get` retrieves, parses, casts, looks up, or computes from data that already exists. it never creates or mutates.

**cardinality is required**: always `getOne*` or `getAll*`.

| subtype | description | example |
|---------|-------------|---------|
| parser/cast | parse text into typed shape | `getOneZoneAddress({ raw })` |
| lookup | find by key in known source | `getOneSiteBySlug({ orchestrator, slug })` |
| compute | deterministic derivation from inputs | `getOneCloneSlug({ role, index })` |
| enumerate | list all of a resource | `getAllClonesForZone({ zone })` |
| assemble | compose from multiple extant sources | `getOneContextCli({ cwd })` |

**the test**: if you remove the operation and the world is unchanged — it's a `get`.

##### .forbidden synonyms

these are all `get` in disguise:

| synonym | use instead |
|---------|-------------|
| `find` | `getOne` or `getAll` |
| `fetch` | `getOne` or `getAll` |
| `lookup` | `getOne` |
| `load` | `getOne` |
| `parse` | `getOne` |
| `cast` | `getOne` |
| `derive` | `getOne` |
| `compute` | `getOne` |
| `infer` | `getOne` |
| `list` | `getAll` |
| `enumerate` | `getAll` |

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

#### .decision tree

```
does it modify state?
├── no → get (getOne* or getAll*)
└── yes (both set and gen are idempotent)
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
getOneZoneAddress({ raw: '@feat/auth' })              // → ZoneAddress
getAllClonesForZone({ zone })                          // → Clone[]
getOneSiteBySlug({ orchestrator, slug })               // → Site | null

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
computeNextIndex({ zone, role }) // 👎 use getOneCloneNextIndex
listTasks({ zone })              // 👎 use getAllTasksForZone
```

#### .enforcement
- operation name that doesn't use get/set/gen prefix = **BLOCKER**
- `get` without `One`/`All` cardinality = **BLOCKER**
- `set` on data entity without `gen` wrapper = **BLOCKER** (unless explicit upsert)
- synonym verb instead of get/set/gen = **BLOCKER**
