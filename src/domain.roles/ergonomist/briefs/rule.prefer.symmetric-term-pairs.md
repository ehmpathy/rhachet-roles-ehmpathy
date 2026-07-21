# rule.prefer.symmetric-term-pairs

## .what

when two labels denote complementary halves of one action (read↔write, from↔into, before↔after, in↔out), give them the **same grammatical shape** (verb+preposition, or noun+state) so the pair is scannable at a glance.

## .why

symmetric term pairs make complementary actions instantly legible. when one side of a pair reads `articulate into` and the other reads `read the critique`, the asymmetry creates cognitive friction — the reader cannot pattern-match the pair at a glance. matched verb+preposition shapes (`contemplate from` ↔ `articulate into`) let the eye lock onto the relationship immediately.

asymmetry surprises the reader (`rule.forbid.surprises`) — the eye expects a matched shape and stumbles when it finds a bare verb beside a verb+preposition.

## .scope

applies to human-read surfaces:

- cli / treestruct output
- labels
- prompts
- help text
- error messages

## .worked example

from a peer-review "conversation" halt message — each reviewer block shows two pointers, one above the other:

### 👎 first draft — asymmetric (bare verb vs verb+preposition)

```
   ├─ read the critique       <- where to READ the reviewer's critique
   │  └─ ..._.given.by_peer.architect.md
   └─ articulate into         <- where to WRITE the response
      └─ ..._.taken.by_self.architect.md
```

`read the critique` / `articulate into` is functional but asymmetric — a bare verb beside a verb+preposition. the eye cannot lock the pair.

### 👍 fixed — symmetric (both verb+preposition)

```
   ├─ contemplate from        <- where to READ the reviewer's critique
   │  └─ ..._.given.by_peer.architect.md
   └─ articulate into         <- where to WRITE the response
      └─ ..._.taken.by_self.architect.md
```

`contemplate from` ↔ `articulate into` — both verb+preposition, both point at a path, both hold the voice. the pair is scannable at a glance.

## .enforcement

- two complementary human-read labels given mismatched grammatical shapes = **nitpick** (prefer)

## .see also

- `rule.forbid.surprises` — asymmetry surprises the reader
- `rule.require.treestruct-output` — the output form these labels live in
- architect `rule.prefer.symmetric-term-pairs` — the contract-name counterpart
