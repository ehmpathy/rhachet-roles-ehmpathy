# rule.require.domain-event-suffix

## .what

every domain event ends in `Event`: `[Noun][PastVerb]Event`. no entity or literal ends in `Event`.

```ts
class LessonCanceledEvent extends DomainEvent<LessonCanceledEvent> implements LessonCanceledEvent { ... }
class WaveObservedEvent extends DomainEvent<WaveObservedEvent> implements WaveObservedEvent { ... }
```

## .why

- **scannable** — a reader sees at a glance which names are facts that happened and which are records that are. a bare `LessonCanceled` could be a status, a flag, or a literal; `LessonCanceledEvent` reads one way
- **one sense per name** — the past verb says what happened; the suffix says what kind of object carries it. a bare `PaymentRefunded` collides with `payment.status === 'REFUNDED'`
- **autocomplete** — `*Event` groups every event in a search, a file tree, or an import list

## .how

| part | rule | example |
|---|---|---|
| noun | the domain object the fact is about | `Lesson`, `Payment`, `Waiver` |
| past verb | what happened to it, in the past tense | `Canceled`, `Refunded`, `Signed` |
| suffix | always `Event`, once | `LessonCanceledEvent` |

- the file name matches the class: `LessonCanceledEvent.ts`
- never a double suffix, never a prefix (`EventLessonCanceled`)
- the operation and the handler keep their own names: `setLessonCanceled` commits `LessonCanceledEvent`; `onLessonCanceledEvent` reacts to it
- a name for a need (`RefundRequiredEvent`) satisfies the suffix and still breaks the past-verb part: an event declares a fact, never an order (`rule.forbid.command-messages`, architect)

## .evidence

measured 2026-11-26 across ehmpathy repos: 30 of 32 classes that extend `DomainEvent` carry the suffix, and the `domain-objects` readme's own example is `AirQualityMeasuredEvent`. the two without it sit in test assets (`WaveObserved`, `PerformanceReport`). the convention already holds in practice; this rule makes it checkable.

## .enforcement

- a class that extends `DomainEvent` without the `Event` suffix = **blocker**
- an entity or literal whose name ends in `Event` = **blocker**
- an event named for a present or future need rather than a past fact = **blocker**

## .see also

- `ref.package.domain-objects` — `DomainEvent`, beside `DomainEntity` and `DomainLiteral`
- `rule.require.order.noun_adj` — noun first, then what changed
- `rule.require.ubiqlang` — one name, one sense
- `catalog.of=pattern.event._` (architect) — the event catalog, whose every member follows this convention
