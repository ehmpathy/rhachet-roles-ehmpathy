### .rule = forbid-undefined-inputs

#### .what
never use `undefined` for internal contract inputs; always use `null` (or empty array `[]` for arrays)

#### .scope
- applies to the `input` argument of the `(input, context)` pattern
- applies to all internal contracts (anything outside `src/contract/`)
- does NOT apply to `context` or `options` arguments — those are explicitly designed for optional configuration

#### .why

**forces discoverability of configuration**
- if an attribute is important enough to modify behavior, it's important to never forget it exists
- `undefined` attributes are invisible at compiletime — they can be silently omitted
- `null` attributes are required at compiletime — this forces them to be consciously supplied

**prevents propagation hazards**
- someone may forget to forward an input down the call stack if it's optional
- with nullable (not optional), the compiler forces them to pass it through
- eliminates "forgot to thread this value" bugs

**enforces deliberate design**
- with non-optional but nullable inputs, developers are forced to:
  - discover that the configuration exists
  - think through what value to provide
  - make a conscious decision (even if that decision is `null`)

#### .exception
boundary user-facing contracts in `src/contract/` may use optional (`?:`) attributes to maximize consumer experience — we want external apis to be easy to use with sensible defaults

#### .examples

##### 👍 good — internal contract with nullable input
```ts
// internal operation — all inputs explicit
export const findsertTask = async (
  input: {
    exid: string;                             // 👍 required — idempotency key
    title: string;
    assignedTo: Ref<typeof Delegate> | null;  // 👍 nullable — task may be unassigned
    dueDate: Date | null;                     // 👍 nullable — task may have no deadline
    parent: Ref<typeof Task> | null;          // 👍 nullable — task may be top-level
  },
  context: { daoTask: DaoTask; log: LogMethods },
) => { ... };

// caller must think about every input
await findsertTask({
  exid: 'task-abc-123',
  title: 'review pr',
  assignedTo: { exid: 'delegate-123' },  // explicit: assigned to someone
  dueDate: null,                          // explicit: no deadline
  parent: null,                           // explicit: top-level task
}, context);
```

##### 👍 good — empty array instead of undefined
```ts
export const processItems = async (
  input: {
    items: Item[];           // 👍 empty array [] if none, not undefined
    excludeIds: string[];    // 👍 empty array [] if none, not undefined
  },
  context: Context,
) => { ... };

// caller explicitly provides empty arrays
await processItems({
  items: [],
  excludeIds: [],
}, context);
```

##### 👍 good — external contract with optional for ux
```ts
// src/contract/endpoints/findsertTask.ts
// external api — optional is ok for consumer convenience
export const findsertTaskEndpoint = async (
  input: {
    exid: string;              // 👍 required even at boundary — idempotency key
    title: string;
    assignedToExid?: string;   // 👍 optional ok at boundary
    dueDate?: Date;            // 👍 optional ok at boundary
    parentExid?: string;       // 👍 optional ok at boundary
  },
) => {
  // internally, convert to explicit nullable refs
  return findsertTask({
    exid: input.exid,
    title: input.title,
    assignedTo: input.assignedToExid ? { exid: input.assignedToExid } : null,
    dueDate: input.dueDate ?? null,
    parent: input.parentExid ? { exid: input.parentExid } : null,
  }, context);
};
```

##### 👎 bad — optional input in internal contract
```ts
// internal operation with optional inputs
export const findsertTask = async (
  input: {
    exid: string;
    title: string;
    assignedTo?: Ref<typeof Delegate>;  // 👎 optional — can be silently forgotten
    dueDate?: Date;                     // 👎 optional — invisible configuration
    parent?: Ref<typeof Task>;          // 👎 optional — invisible configuration
  },
  context: Context,
) => { ... };

// caller can accidentally omit important config
await findsertTask({
  exid: 'task-abc-123',
  title: 'review pr',
  // oops, forgot assignedTo, dueDate, parent — no compiler warning
  // did we mean unassigned? no deadline? top-level? or did we just forget?
}, context);
```

##### 👎 bad — undefined instead of empty array
```ts
export const processItems = async (
  input: {
    items?: Item[];          // 👎 undefined array — invisible
    excludeIds?: string[];   // 👎 undefined array — can forget to pass
  },
  context: Context,
) => { ... };
```

#### .enforcement
- optional (`?:`) attributes in internal `input` arguments = **BLOCKER**
- `undefined` as valid value for internal inputs = **BLOCKER**
- exception: `context` and `options` arguments may have optional attributes

#### .see also
- `rule.require.input-context-pattern` — the standard procedure signature
- `rule.forbid.undefined-attributes` — related rule for domain objects
