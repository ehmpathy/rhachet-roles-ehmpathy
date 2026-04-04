### .rule = forbid-nonidempotent-mutations

#### .what
all mutations must explicitly use the terms `findsert`, `upsert`, or `delete` — no synonyms

#### .scope
- applies to all procedures that modify state (database, external apis, file system)
- applies to dao methods, domain operations, and contract endpoints

#### .why

**idempotency is mandatory, not optional**
- retries happen: network failures, user double-clicks, queue redelivery
- without idempotent semantics, retries cause duplicate records, double charges, corrupted state
- explicit labels force the author to think through retry behavior

**ambiguous verbs hide danger**
- `create` — what happens on retry? duplicate record?
- `update` — what if it doesn't exist? error? silent no-op?
- `save` — is this insert or update? what's the idempotency key?
- `insert` — explicitly non-idempotent — duplicates on retry

**explicit verbs communicate intent**
- `findsert` — find existing or insert new; safe to retry; returns same result
- `upsert` — update if exists, insert if not; safe to retry; last write wins
- `delete` — remove if exists; safe to retry; no-op if already gone

#### .allowed verbs — exactly these terms, no synonyms

| verb | semantics | on retry |
|------|-----------|----------|
| `findsert` | find existing by unique key, or insert if not found | returns existing — no duplicate |
| `upsert` | update existing by unique key, or insert if not found | overwrites — no duplicate |
| `delete` | remove by unique key if exists | no-op if already deleted |

**no synonyms** — use exactly `findsert`, `upsert`, `delete`:
- not `findOrCreate` — use `findsert`
- not `createOrUpdate` — use `upsert`
- not `saveOrUpdate` — use `upsert`
- not `remove` — use `delete`
- not `destroy` — use `delete`

**exception**: `del` is allowed as shorthand for `delete` when used alongside `get`/`set` for symmetry:
```ts
// 👍 ok — del alongside get/set for consistent trio
interface DaoTask {
  get: { byRef(ref: Ref<typeof Task>): Promise<Task | null> };
  set: { findsert(task: Task): Promise<Task>; upsert(task: Task): Promise<Task> };
  del: { byRef(ref: Ref<typeof Task>): Promise<void> };
}
```

#### .forbidden verbs

| verb | problem |
|------|---------|
| `create` | ambiguous — implies insert-only, duplicates on retry |
| `insert` | explicitly non-idempotent — duplicates on retry |
| `add` | ambiguous — same as create/insert |
| `save` | ambiguous — unclear if findsert or upsert |
| `update` | ambiguous — unclear behavior if not exists |
| `set` | ambiguous for mutations — ok for in-memory state |
| `put` | ambiguous — unclear if findsert or upsert |
| `write` | ambiguous — unclear idempotency semantics |

#### .examples

##### 👍 good — explicit idempotent verbs
```ts
// findsert — find or insert, safe to retry
export const findsertTask = async (
  input: { exid: string; title: string; assignedTo: Ref<typeof Delegate> | null },
  context: { daoTask: DaoTask },
) => {
  const taskFound = await context.daoTask.findByUnique({ exid: input.exid });
  if (taskFound) return taskFound;
  return context.daoTask.insert({ ...input });
};

// upsert — update or insert, safe to retry
export const upsertCustomerPhone = async (
  input: { customerExid: string; phone: string },
  context: { daoCustomer: DaoCustomer },
) => {
  return context.daoCustomer.upsert({
    exid: input.customerExid,
    phone: input.phone,
  });
};

// delete — remove if exists, safe to retry
export const deleteTask = async (
  input: { exid: string },
  context: { daoTask: DaoTask },
) => {
  await context.daoTask.deleteByUnique({ exid: input.exid });
};
```

##### 👎 bad — ambiguous mutation verbs
```ts
// 👎 create — what happens on retry?
export const createTask = async (input: { title: string }) => {
  return daoTask.insert(input);  // duplicates on retry!
};

// 👎 save — is this findsert or upsert?
export const saveCustomer = async (input: Customer) => {
  return daoCustomer.save(input);  // unclear semantics
};

// 👎 update — what if customer doesn't exist?
export const updateCustomerPhone = async (input: { id: string; phone: string }) => {
  return daoCustomer.update(input);  // error? silent no-op? unclear
};

// 👎 add — same problem as create
export const addLineItem = async (input: LineItem) => {
  return daoLineItem.insert(input);  // duplicates on retry!
};
```

#### .dao method naming

dao methods should also follow idempotent naming:

```ts
interface DaoTask {
  // queries (naturally idempotent)
  findByUnique(input: { exid: string }): Promise<Task | null>;
  findByRef(input: Ref<typeof Task>): Promise<Task | null>;

  // mutations (explicit idempotent semantics)
  findsert(input: Task): Promise<Task>;
  upsert(input: Task): Promise<Task>;
  deleteByUnique(input: { exid: string }): Promise<void>;
}
```

#### .exception
- in-memory state setters (`setState`, `setConfig`) — these are naturally idempotent
- pure transformers that don't persist — no mutation = no idempotency concern

#### .enforcement
- `create*`, `insert*`, `add*`, `save*` mutation procedures = **BLOCKER**
- ambiguous `update*` without clear upsert semantics = **BLOCKER**
- dao methods with non-idempotent names = **BLOCKER**

#### .see also
- `rule.require.idempotent-procedures` — broader idempotency requirements
- `rule.require.idempotency.[seed]` — why idempotency matters
