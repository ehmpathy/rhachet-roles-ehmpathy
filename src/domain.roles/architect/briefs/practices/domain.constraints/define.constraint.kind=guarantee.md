# define.constraint.kind=guarantee

## .what

a **guarantee** = a constraint we keep for consumers at a release boundary: a promise a published contract makes, which a consumer may lean on across releases. one of three constraints (`define.constraint._`).

a guarantee entry holds:

| part | says |
|---|---|
| the promise | what the published contract does, in the consumer's words (an invariant it exposes, a transition such as idempotency, or a liveness promise such as "every queued task eventually runs") |
| the exclusions | what a consumer must not lean on (the order of a list, an internal id shape), so a change there ships as a minor |
| the proof | a blackbox acceptance test through the published contract, which cites the entry (`[g001]`) |

a consumer cites our guarantee as an **assumption** in its own inventory. that is the chain: one component's guarantee discharges the next one's assumption.

an amended guarantee is a break for every consumer: amend the entry first, then the test, and release-note it as a major (`rule.forbid.test-edit-without-named-proof`, mechanic).

usage: *"is this a guarantee, or an internal contract free to change?"* · *"which acceptance test proves `g001`?"* · *"the list order is an exclusion"*.

## .see also

- `define.constraint._` — the generic over the three peers
- `define.constraint.kind=assumption` — the downstream half of the chain
- `rule.require.acceptance.blackbox` (mechanic) — the proof
- `define.constraint.kind=guarantee.evidence` — the term's etymology, precedent, and rejected alternatives
