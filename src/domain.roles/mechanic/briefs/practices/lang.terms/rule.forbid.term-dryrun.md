### .rule = forbid-term-dryrun

#### .what
never use `dryRun` — always use `mode: 'PLAN' | 'EXECUTE'` semantics instead

#### .why

**`dryRun` is a boolean — booleans obscure intent**
- `dryRun: true` — what does "true" mean? you have to remember
- `dryRun: false` — double negative: "not dry" = "wet" = actually run?
- `mode: 'PLAN'` — instantly clear: we're planning, not executing

**PLAN | EXECUTE aligns with established patterns**
- terraform uses `plan` then `apply` — industry standard for infrastructure
- the pattern communicates: "show me what would happen" vs "make it happen"
- extends naturally: `'PLAN' | 'EXECUTE' | 'ROLLBACK'` if needed

**mode is enumerable — dryRun is not**
- `mode` can grow: add `'VALIDATE'`, `'PREVIEW'`, `'SIMULATE'` as needed
- `dryRun` is stuck as boolean — any extension requires new parameters
- enums are self-documenting; booleans require context

**readability at call sites**
- `await sync({ mode: 'PLAN' })` — reads as intent
- `await sync({ dryRun: true })` — reads as implementation detail

#### .scope
- applies to all operation parameters that control execution vs preview
- applies to cli flags, api parameters, and internal function signatures

#### .pattern

```ts
type ExecutionMode = 'PLAN' | 'EXECUTE';

const syncCustomer = async (
  input: {
    customerId: string;
    mode: ExecutionMode;
  },
  context: Context,
) => {
  if (input.mode === 'PLAN') {
    // return what would happen without side effects
    return { decision: 'UPDATE', planned: true };
  }

  // actually execute
  await context.customerDao.update(...);
  return { decision: 'UPDATE', planned: false };
};
```

#### .examples

##### 👍 good — mode with PLAN | EXECUTE
```ts
// clear intent at definition
export const syncPhone = async (
  input: {
    customerId: string;
    mode: 'PLAN' | 'EXECUTE';
  },
  context: Context,
) => { ... };

// clear intent at call site
const preview = await syncPhone({ customerId, mode: 'PLAN' });
const result = await syncPhone({ customerId, mode: 'EXECUTE' });
```

##### 👍 good — cli with plan/execute subcommands
```sh
# terraform-style semantics
mycli sync --plan      # show what would happen
mycli sync --execute   # make it happen
```

##### 👎 bad — dryRun boolean
```ts
// unclear at definition
export const syncPhone = async (
  input: {
    customerId: string;
    dryRun: boolean;  // 👎 what does true mean again?
  },
  context: Context,
) => { ... };

// unclear at call site
await syncPhone({ customerId, dryRun: true });   // 👎 true = don't run?
await syncPhone({ customerId, dryRun: false });  // 👎 false = do run?
```

##### 👎 bad — other boolean variants
```ts
// all of these have the same problem
execute: boolean;     // 👎 false = don't execute?
preview: boolean;     // 👎 true = just preview?
simulate: boolean;    // 👎 confusing negation
actuallyRun: boolean; // 👎 desperate clarity attempt
```

#### .enforcement
- `dryRun` parameter = **BLOCKER**
- boolean execution control parameters = **BLOCKER**
- prefer `mode: 'PLAN' | 'EXECUTE'` pattern

#### .see also
- `rule.prefer.terraform` — terraform's plan/apply model
- `rule.require.ubiqlang` — consistent terminology
