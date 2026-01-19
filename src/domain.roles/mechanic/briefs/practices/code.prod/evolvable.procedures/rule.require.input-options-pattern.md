# input-options pattern

## .what

`(input, options?)` is a narrowed `(input, context)` for pure operations — when second arg holds **configuration**, not dependencies.

```ts
// context = dependencies (injectable)
const sendInvoice = async (
  input: { invoice: Invoice },
  context: { emailService: EmailService; log: LogMethods },
) => { ... };

// options = configuration (pure values)
const setPricePrecision = (
  input: { of: IsoPrice; to: IsoPriceExponent },
  options?: { round?: IsoPriceRoundMode; format?: 'words' | 'shape' },
) => { ... };
```

## .when

| pattern            | second arg contains              | use when                          |
| ------------------ | -------------------------------- | --------------------------------- |
| `(input, context)` | db, log, services                | runtime injection needed          |
| `(input, options)` | format, mode, flags              | pure computation, static config   |

**rule**: if second arg could be a constant → `options`. if it needs runtime state → `context`.

## .anatomy

**input** = what to operate on (required, named keys)
```ts
input: { of: IsoPrice; to: IsoPriceExponent }
```

**options** = how to operate (optional, pure values, sensible defaults)
```ts
options?: { round?: IsoPriceRoundMode; format?: 'words' | 'shape' }
```

## .comparison

| aspect       | `context`                 | `options`             |
| ------------ | ------------------------- | --------------------- |
| purpose      | dependency injection      | operation config      |
| contents     | services, connections     | formats, modes, flags |
| testability  | swap for mocks            | no swap needed (pure) |
| optionality  | often required            | always optional       |
| statefulness | runtime state             | pure values only      |

## .examples

```ts
// context: has dependencies
const syncPhone = async (
  input: { customerId: string },
  context: { customerDao: CustomerDao; log: LogMethods },
) => {
  const phone = await context.whodisClient.getPhone(input.customerId);
  await context.customerDao.update({ id: input.customerId, phone });
};

// options: pure computation
const setPricePrecision = (
  input: { of: IsoPrice; to: IsoPriceExponent },
  options?: { round?: IsoPriceRoundMode; format?: 'words' | 'shape' },
) => {
  const mode = options?.round ?? 'half-up';
  // deterministic — no external deps
};
```

## .hybrid (rare)

when both config and deps needed, prefer split into pure + orchestration layers:

```ts
// avoid: three args
const generateInvoice = async (input, options, context) => { ... };

// prefer: split
const computeInvoiceTotals = (input, options) => { ... };  // pure
const generateInvoice = async (input, context) => { ... }; // orchestrates
```

## .summary

> `(input, options)` = `(input, context)` for pure operations
>
> no dependencies to inject → call it `options`
