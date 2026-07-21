# rule.require.timeless-comments

## .what

comments and doc-notes must be **timeless**: they must make full sense to a reader with zero knowledge of the conversation, session, or decision-process that produced them.

write every comment for a reader who was never in the room: state what IS and its durable why; never react to a conversation.

## .why

a comment that reacts to an in-progress debate rots once the debate is forgotten. a reader 3 months out sees a note that argues against a choice with no context for what, or says "yet" with no sense of when. the note becomes noise.

## .the test

strip the comment of every temporal or reactive word — "yet", "now", "still", "recently", "we decided", "we deliberately", "as discussed". does it still stand as a statement of what IS and why?

- references a decision-in-progress → rewrite to the durable principle
- references only durable anchors (other briefs, named anti-patterns, invariants) → good

## .smells to catch

- "yet" / "for now" / "not ... yet"
- "we deliberately" / "we decided" / "we chose not to"
- "as discussed" / "per the conversation" / "per what we just discussed"
- a term named only to say we do NOT adopt it, with no durable reason
- a note whose reason is "because of what we just did" rather than "because X is true"

## .examples

### 👎 bad — reactive to a live conversation

```ts
// no purpose vocabulary — yet. a Transaction carries no kind. ...
// we deliberately do not declare a purpose enum here — the moment we
// would, it collapses back to the moneyType muddle.
```

a future reader has no idea what kind debate this reacts to; "yet" and "we deliberately do not" are artifacts of a live conversation, not durable facts.

### 👍 good — durable statement of what IS and why

```ts
// purpose is derived, never stamped. a Transaction has no purpose field.
// each motion {move, dimension, participant} already fixes what happened;
// a purpose label is only that triple seen from one participant, so it is
// a read, not a fact to store. a stamped purpose enum re-couples a
// flow-word to a perspective or a balance — the moneyType anti-pattern
// (define.money-moves.md).
```

## .enforcement

- a comment that references a decision-in-progress or reacts to a conversation = **nitpick** (readability)
- a comment that will actively mislead a future reader (its reason no longer holds once the conversation is gone) = **blocker**

## .see also

- `rule.require.what-why-headers` — the .what/.why comment discipline this refines
