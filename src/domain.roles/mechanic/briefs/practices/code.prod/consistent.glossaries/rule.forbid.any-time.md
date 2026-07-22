# rule.forbid.any-time

## .what

do not represent a time, date, or duration value with an **any-time** shape — a bare `Date`,
a `number` epoch, an ad-hoc time string, a `moment`/`dayjs` object, or a hand-rolled
`{ hours; mins }` bag — when that value is the declared, stored, or passed shape.

**any-time** = any representation *other than* the canonical `iso-time` glossary. it is the
loose, unconstrained twin of the strict `iso-time` type (`rule.require.iso-time`) — the same
sense `any` carries in typescript: it could be anything, so the compiler guarantees no shape
at all.

## .why

`iso-time` is the adopted glossary for **ergonomics** and **safety**; an any-time shape
forfeits both:

- **ambiguity** — a `Date` carries an implicit zone; a `'06/15/2024'` string reads as june
  or as the 6th per the reader's locale; a bare `number` hides its unit (seconds? ms?).
  each forces a re-read, and a wrong read is a wrong time.
- **drift** — an any-time duration invites hand-rolled millisecond math, where an off-by-1000
  hides for months. the glossary's `addDuration` / `getDuration` cannot drift.
- **sprawl** — every any-time shape is a private map; ten files grow ten slightly-different
  time shapes. the glossary is one shared territory.

## .the forbidden shapes

| forbidden (any-time) | why | use instead (iso-time) |
|----------------------|-----|------------------------|
| `bookedAt: Date` | implicit zone, ambiguous on the wire | `IsoTimeStamp` |
| `startsAt: string` | format unknowable (`'06/15'`?) | `IsoDateStamp` / `IsoTimeFloat` |
| `expiresAt: number` | unit hidden (s? ms?) | `IsoTimeStamp` |
| `duration: number` | unit hidden | `IsoDuration` |
| `{ hrs, mins }` ad-hoc bag | reinvents the glossary | `IsoDurationShape` |
| `moment()` / `dayjs()` object | heavyweight, mutable, non-serializable | `iso-time` cast |
| `Date.now() + 3600_000` | hand-rolled ms math, drift-prone | `addDuration(now(), { hours: 1 })` |

## .the one allowed use of an any-time value

a bare `Date` or `number` is allowed **only** as transient input to an `as*` cast at a
boundary — the instant a time enters from the clock or an sdk. it is cast to an `iso-time`
type at once and never stored or passed as any-time.

```ts
import { asIsoTimeStamp } from 'iso-time';

// ✅ the Date lives only long enough to be cast at the boundary
const paddledOutAt = asIsoTimeStamp(sdkSession.startedAt); // Date -> IsoTimeStamp
```

## .reach for instead

the `iso-time` operations that replace each any-time habit:

| any-time habit | reach for |
|----------------|-----------|
| `new Date(x)` to parse | `asIsoTimeStamp` / `asIsoDateStamp` |
| `Date.now()` / `new Date()` | `now()` / `today()` |
| `a.getTime() + ms` | `addDuration(a, dur)` |
| `a.getTime() - ms` | `subDuration(a, dur)` |
| `b.getTime() - a.getTime()` | `getDuration({ of: { range: { since: a, until: b } } })` |
| `ms1 + ms2` | `sumDurations(dur1, dur2)` |
| a hand-rolled `isValidDate` | `isIsoTimeStamp` / `isIsoDateStamp` |

> read the full glossary:
> `rhx git.repo.get lines --in ehmpathy/iso-time --paths 'readme.md'`

## .caveats

- **the boundary cast is the escape hatch, not a loophole** — a `Date` may enter and be cast
  at once; it may not linger as a field, a return, or a passed value.
- **`toMilliseconds(dur)` is the sanctioned way to hand a duration to a raw-ms api** — use it
  at the boundary; do not resort to `Date.now()` math inside domain logic.
- **stamp vs float** — if you reach for a bare `'09:00:00'` string for a daily pattern, the
  answer is `IsoTimeFloat`, not a raw string (see `rule.require.iso-time`).

## .examples

### 👎 bad — any-time shapes stored and computed

```ts
interface WaveReport {
  observedAt: Date;                       // ambiguous zone
  windowMs: number;                       // unit hidden
}

// hand-rolled ms math — a silent off-by-1000 waits here
const staleAfter = report.observedAt.getTime() + report.windowMs;
```

### 👍 good — the glossary holds the shape and the math

```ts
import type { IsoTimeStamp, IsoDuration } from 'iso-time';
import { addDuration } from 'iso-time';

interface WaveReport {
  observedAt: IsoTimeStamp;               // '2024-06-15T14:30:00Z'
  window: IsoDuration;                    // { minutes: 20 }
}

const staleAfter = addDuration(report.observedAt, report.window);
```

## .enforcement

- a time / date / duration declared as `Date`, `number`, or bare string in a domain object,
  contract, or stored value = **blocker**
- a `moment` / `dayjs` object as a stored or passed representation = **blocker**
- hand-rolled millisecond arithmetic on an any-time value = **blocker**
- an any-time value is a **false positive** only when it is transient input to an `as*` cast
  at a boundary

## .see also

- `rule.require.iso-time` — the positive pair (what to use)
- `.readme` (consistent.glossaries) — why the glossary family exists
- `rule.forbid.magic-values` — the adjacent rule on hidden-unit primitives
