# rule.forbid.ambiguous-labels

## .what

no name, flag, field, or output label may read more than one way. each reads exactly one
sense; no term does double duty, no result invites a re-read. one word, one sense,
everywhere on the surface.

grounds the *unambiguous* quality of `def.ergonomic` (and, with `rule.require.discoverability`,
its *intuitive* quality). from nielsen's **consistency and standards** and norman's
**intuition** — the control-to-effect relationship must be unambiguous so the guess is
right (`ref.ergonomics.fundamentals`).

## .why

- an ambiguous label forces the human to stop and disambiguate — friction at every read
- the same word for two concepts (or two words for one concept) breaks the human's mental model
- a result that reads two ways invites the wrong read, then the wrong action

## .the test

"can a human read this label exactly one way, without context?"

- yes → unambiguous
- no → rename it so its one sense is plain

## .how

- **one term per concept** — do not call it `spot` here and `location` there (`rule.require.ubiqlang`)
- **one concept per term** — do not overload `session` to mean both a lesson and a login
- **plain domain words** — the human's vocabulary, not internal jargon or a cryptic abbreviation
- **unambiguous output** — a value reads one way; label units and states so `3` is never "3 what?"

## .examples

### 👎 bad — one flag, two readings

```bash
# does --clean remove old reports, or produce a "clean" (fresh) set?
$ wavereports --clean
# the surfer cannot tell if this is destructive or generative
```

### 👍 good — the flag names its one sense

```bash
# each flag reads exactly one way
$ wavereports --purge-stale     # clearly destructive
$ wavereports --fetch-fresh     # clearly generative
```

### 👎 bad — an overloaded term

```
"session" means a surf lesson here, but a login elsewhere in the same cli —
the surfer must guess which "session" each command touches
```

### 👍 good — one concept, one word

```
surf lesson  → "lesson"   (booklesson, cancellesson)
auth login   → "login"    (login, logout)
```

## .enforcement

- a label that reads more than one way in context = **blocker**
- one term overloaded across two concepts, or two terms for one concept = **blocker**
- an output value with no unit/state label where its sense is ambiguous = **blocker**

## .see also

- `ref.ergonomics.fundamentals` — consistency (nielsen 4), intuition (norman)
- `rule.require.ubiqlang` (mechanic) — one canonical word per concept
- `rule.prefer.symmetric-term-pairs` — matched shapes for complementary labels
- `def.ergonomic` — the *unambiguous* quality this backs
