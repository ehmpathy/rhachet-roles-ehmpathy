# rule.forbid.retroactive-replay

## .what

never set a late or wrong fact right by a rewind: no replay from a "branch point" where the fact should have landed, no fact inserted into the past or rejected out of it, no merge of the difference into the live records. a correction lands at the head of the stream, as a newer version or a new fact.

## .why

- **it rewrites the past** — a rejected fact is "effectively a delete to the event log" (fowler); the stream stops to be evidence of what we said, and when
- **the peers already acted** — every reaction since the branch point must be undone, and every email or charge it caused countered by hand
- **it rests on a replay as the read path** — every event must be reversible, every record derived by replay (`rule.forbid.replay-on-read`)
- **the merge is its own system** — fowler: "this merge processing can get very involved"

## .not a retroactive replay

a fixed consumer that replays the stream as it is, forward, to repair its own records (`pattern=replayable-fact-stream`). it never rewinds, inserts, or rejects.

## .the cure

| the case | publish |
|---|---|
| our report was wrong | a newer version under the same unique key and `occurredAt`, with a newer `observedAt` — the newer overrules (`pattern=corrected-version`) |
| the world moved on | a new fact that answers the old — the apology (`pattern=correction-event`) |
| a fact arrived late | naught new: the consumer applies it when it arrives, by key and version (`pattern=latest-version-wins`) |

## .enforcement

- a correction applied by a rewind, an insert into the past, or a reject from the stream = **blocker**
- a published fact edited in place or deleted = **blocker**

## .see also

- `rule.require.corrected-versions`, `rule.require.correction-events` — the require twins: the two forward corrections
- `catalog.of=pattern.event._` — the `correction` facet
- `rule.forbid.order-dependent-consumers` — the consumer that makes a rewind unnecessary
- `rule.forbid.sagas` — step 5, the apology: a fix forward, never a revert
