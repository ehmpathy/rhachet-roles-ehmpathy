# catalog.of=pattern.event.facet=correction.pattern=retroactive-replay

a member of `catalog.of=pattern.event._` · facet `correction` · verdict **`forbid`**.

fowler's name is "retroactive event". ours names the act: a replay that rewrites the past.

## .what it is

to set a late or wrong fact right, rewind or rebuild to the point where it should have landed — fowler's "branch point" — insert or reject it there, replay forward, and merge the difference into the live records.

## .why it is forbidden

- **it rewrites the past** — a rejected event is, in fowler's words, "effectively a delete to the event log". the stream stops to be evidence of what we said, and when
- **the peers already acted** — every reaction since the branch point must be undone or recomputed, and each external act it caused — an email, a charge — must be detected and countered by hand
- **it rests on a replay as the read path** — the rewind needs every event reversible and the owner's records derived by replay (`pattern=replay-on-read`, forbid)
- **the merge is its own system** — "this merge processing can get very involved"
- **it makes order matter** — the rewind exists to put facts in their place; a consumer that needs that is order-dependent (`pattern=order-dependent-consumer`, forbid)

## .not a retroactive replay

a fixed consumer that replays the stream as it is, forward, to repair its own records (`pattern=replayable-fact-stream`). it never rewinds the stream, never inserts into it, never rejects from it.

## .the cure

| the case | the cure |
|---|---|
| our report was wrong | publish a newer version under the same unique key (`pattern=corrected-version`) |
| the world moved on | publish a new fact that answers the old (`pattern=correction-event`) |
| a fact arrived late | apply it when it arrives, by unique key and version (`pattern=latest-version-wins`); a status moves only by a guarded edge (`pattern=guarded-status-transitions`) |

## .source

> "In rewind/replay we reverse the events backwards from the latest event to the branch point." — fowler, "retroactive event", 2005 ✅

> "For rejected events we reverse the event and mark it as rejected. Effectively a delete to the event log" — same ✅

> "If we use a Parallel Model we will have the correct branch in the Parallel Model and need to make changes to the live application state to turn it into the corrected reality, essentially merging the differences into the live state." — same ✅

> "Clearly this merge processing can get very involved, and the complexity of the merge processing is an important factor to bear in mind when you're deciding how to handle your retroactive events." — same ✅

### contrast

fowler's page names the three cases we name — out of order, rejected, incorrect — and answers all three with one rewind. we answer each without one: a late fact is applied when it arrives, a wrong report is overruled by a newer version, and a change in the world is a new fact.
