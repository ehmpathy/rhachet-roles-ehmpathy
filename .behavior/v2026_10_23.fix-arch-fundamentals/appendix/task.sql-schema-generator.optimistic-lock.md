## .what

let the generated upsert act as an optimistic lock: it accepts an optional expected version hash, and inserts the next version only if the current version still matches it.

## .why

a read-modify-write on a versioned entity can lose an update today. two writers read the same current version, each computes a new value, and both upsert. the first inserts a new version; the second either inserts over it or matches it and inserts naught. no write is refused, so the first change can be lost in silence (the last board in a slot is reserved twice).

the architect role (rhachet-roles-ehmpathy, `rule.require.optimistic-locks`) treats this guard as supported by our upsert. this task makes that true.

## .shape

- no new column. the hash is computed on the fly, from the updatable values of the current version (the one the current version pointer names): the same values the change check already compares
- the upsert takes an optional input, e.g. `in_expected_version_hash`
- input absent: behavior exactly as today
- input present: compute the hash of the current version; on a mismatch, raise a conflict (e.g. SQLSTATE `40001`) and insert naught; on a match, proceed as today
- the read path exposes the same computed hash, so a caller can read it and pass it back on write

## .proof

- two writers read the same hash; the first upsert lands; the second raises the conflict and inserts no version
- a stale hash raises even when the new values equal the current ones
- no expected hash: every extant upsert test passes unchanged
