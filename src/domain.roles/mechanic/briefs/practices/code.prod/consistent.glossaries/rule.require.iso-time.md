# rule.require.iso-time

## .what

represent every time, date, and duration value with the **`iso-time`** glossary types.
`iso-time` is the adopted ubiqlang glossary for time; its types are the one canonical
representation a time value takes when it is declared on a domain object, passed through a
contract, or stored.

cast raw inputs into the glossary at the boundary with the `as*` casts; from there on, the
value is an `iso-time` type.

## .why

`iso-time` is adopted for **ergonomics** and **safety** — the same two reasons the whole
glossary family exists:

- **safety** — a strict iso 8601 type is unambiguous. `'2024-06-15'` reads one way in every
  locale; a bare `'06/15/2024'` string or a `Date` with an implicit zone does not. the type
  also draws the **stamp vs float** line the domain actually has (an absolute instant vs a
  detached pattern), so a re-read never confuses "when it happened" with "when it repeats".
- **ergonomics** — one obvious cast (`asIsoTimeStamp(new Date())`), one obvious duration
  (`'PT30M'` or `{ minutes: 30 }`), one obvious arithmetic (`addDuration`, `getDuration`).
  the common case is a one-liner and the names read as a human expects.

a raw `number` epoch or `Date` is a map some prior code drew; the `iso-time` type is the
territory — one validated shape the whole codebase shares.

## .the glossary

| kind | type | shape |
|------|------|-------|
| absolute instant | `IsoTimeStamp` | `2024-06-15T14:30:00Z` |
| absolute date | `IsoDateStamp` | `2024-06-15` |
| absolute month | `IsoMonthStamp` | `2024-06` |
| detached time | `IsoTimeFloat` | `14:30:00` |
| detached weekday | `IsoWeekdayFloat` | `1` (monday) |
| duration | `IsoDuration` (`IsoDurationWords` `'PT30M'` \| `IsoDurationShape` `{ minutes: 30 }`) |
| range | `IsoTimeStampRange`, `IsoDateStampRange` | `{ since, until }` |

## .the operations

| kind | operation | does |
|------|-----------|------|
| cast | `asIsoTimeStamp`, `asIsoDateStamp`, `asIsoMonthStamp` | any input → strict iso stamp |
| cast | `asIsoTimeFloat`, `asIsoHourFloat`, `asIsoWeekdayFloat`, … | extract a detached time component |
| cast | `asIsoTimeStampRange`, `asIsoDateStampRange` | `{ since, until }` → strict range |
| guard | `isIsoTimeStamp`, `isIsoDateStamp`, … | validate/narrow a string's format |
| arithmetic | `addDuration(stamp, dur)` | shift a stamp forward |
| arithmetic | `subDuration(stamp, dur)` | shift a stamp back |
| arithmetic | `getDuration({ of: { range } })` | the duration between two stamps |
| arithmetic | `sumDurations(...durs)` | add durations together |
| convert | `toMilliseconds(dur)` | a duration → raw ms (boundary use only) |
| observe | `now()`, `today()` | read the clock as a stamp — use these, not `new Date()` |
| sleep | `sleep(dur)` | await a duration |

> read the full glossary:
> `rhx git.repo.get lines --in ehmpathy/iso-time --paths 'readme.md'`

## .caveats

- **stamp vs float is the core split.** a **stamp** is an absolute instant (`IsoTimeStamp`
  `'2024-06-15T14:30:00Z'`); a **float** is a detached pattern (`IsoTimeFloat` `'09:00:00'`,
  every day at 9). pick the one the domain means — "when it happened" is a stamp, "when it
  repeats" is a float.
- **durations have two forms.** `IsoDurationWords` (`'PT30M'`) is concise for inputs;
  `IsoDurationShape` (`{ minutes: 30 }`) is easy to manipulate, so operations return it by
  default. `IsoDuration` accepts either.
- **read the clock through `now()` / `today()`**, never `new Date()` in domain logic — it
  keeps the value in the glossary and keeps tests deterministic.
- **`toMilliseconds` is a boundary escape hatch** — use it to hand a duration to a raw api
  that wants ms; do not route domain arithmetic through it.

## .scope

applies to the **representation** of a time value:

- a field on a domain object or type
- an input/output shape on a contract or operation
- a value persisted or passed between operations

a bare `Date` or `number` is allowed **only** as transient input to an `as*` cast at a
boundary (an sdk that returns unix seconds, a `new Date()` read of the clock). the declared,
stored, passed shape is an `iso-time` type.

## .how

- **declare** time fields as `iso-time` types, never `Date` / `number` / bare string
- **cast at the boundary** — `asIsoTimeStamp(sdkValue)` the moment a raw time enters
- **read the clock** through `now()` / `today()`, not `new Date()` in domain logic
- **durations** as `IsoDuration`; **arithmetic** through `addDuration` / `getDuration`, never
  hand-rolled millisecond math

## .examples

### 👎 bad — raw primitives as the representation

```ts
interface SurfLesson {
  bookedAt: Date;          // implicit zone; ambiguous on the wire
  startsAt: string;        // '06/15/2024'? '15/06'? unknowable
  duration: number;        // 30? minutes? seconds? ms?
}
```

### 👍 good — the iso-time glossary as the representation

```ts
import type { IsoTimeStamp, IsoTimeFloat, IsoDuration } from 'iso-time';

interface SurfLesson {
  bookedAt: IsoTimeStamp;  // '2024-06-15T14:30:00Z' — absolute, unambiguous
  startsAt: IsoTimeFloat;  // '09:00:00' — detached daily pattern
  duration: IsoDuration;   // { minutes: 30 } or 'PT30M'
}
```

### 👍 good — cast at the boundary, compute through the glossary

```ts
import { asIsoTimeStamp, addDuration, now } from 'iso-time';

// sdk hands back a Date; cast it once at the boundary
const bookedAt = asIsoTimeStamp(sdkReservation.createdAt);

// arithmetic through the glossary, never raw ms math
const endsAt = addDuration(asIsoTimeStamp(now()), { minutes: 30 });
```

## .exceptions

- **transient cast input** — a `Date` / `number` handed to an `as*` cast at a boundary
- **third-party contracts** — an sdk/api type you do not own; cast to `iso-time` the moment
  it crosses into our code

## .enforcement

- a time / date / duration declared as `Date`, `number`, or bare string in a domain object,
  contract, or stored value = **blocker**
- hand-rolled millisecond arithmetic where `addDuration` / `getDuration` applies = **blocker**

## .see also

- `rule.forbid.any-time` — the negative pair (what not to use)
- `.readme` (consistent.glossaries) — why the glossary family exists
- `rule.require.ubiqlang` — one canonical representation per concept
- `rule.require.read-package-docs-before-use` — read the iso-time readme first
