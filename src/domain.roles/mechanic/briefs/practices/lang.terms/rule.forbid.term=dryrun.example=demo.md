# rule.forbid.term=dryrun.example=demo

a 👎/👍 demo for `rule.forbid.term=dryrun`.

## .the call site

```ts
// instead of boolean
const result = await deploy({ dryRun: true });   // 👎
const result = await deploy({ dryRun: false });  // 👎 double negative

// use explicit modes
const result = await deploy({ mode: 'PLAN' });   // 👍 clear: just plan
const result = await deploy({ mode: 'APPLY' });  // 👍 clear: actually do it
```

## .the definition

##### 👍 good — mode with PLAN | APPLY
```ts
// clear intent at definition
export const syncPhone = async (
  input: {
    customerId: string;
    mode: 'PLAN' | 'APPLY';
  },
  context: Context,
) => { ... };

// clear intent at call site
const preview = await syncPhone({ customerId, mode: 'PLAN' });
const result = await syncPhone({ customerId, mode: 'APPLY' });
```

##### 👍 good — the body branches on the mode
```ts
type ExecutionMode = 'PLAN' | 'APPLY';

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

##### 👍 good — cli with a plan/apply mode
```sh
# terraform-style semantics
mycli sync --mode plan    # show what would happen
mycli sync --mode apply   # make it happen
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

## .extensibility

```ts
const result = await deploy({ mode: 'DIFF' });
```

with a boolean, you'd need:
```ts
// 👎 boolean explosion
deploy({ dryRun: true, diffMode: true, validateOnly: false })
```
