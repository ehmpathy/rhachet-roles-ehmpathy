# catalog.of=pattern.transaction.bound=storage.trait=consistency.pattern=read-your-writes

a member of `catalog.of=pattern.transaction._` · bound `storage` · trait `consistency` · verdict `require` · tier `leaf`.

## .keeps

a caller sees its own write, never an older copy.

## .require when

reads go to a replica, or to an eventually consistent index.

## .the move

route a caller's reads to the primary for a window after its write, or return the written record from the write itself so the caller need not re-read.

across a contract, the cure is not this pattern: wait for the fact to land, never trust a copy kept across a contract (`pattern=async-task`).

## .the failure it prevents

a surfer reserves a lesson, reloads, and sees no reservation.

## .source

> "Read your writes … requires that if a process performs a write w, and that same process performs a subsequent read r, then r must observe w's effects." — jepsen, "read your writes" ✅

## .see also

- `rule.require.read-your-writes` — the rule that enforces this member
