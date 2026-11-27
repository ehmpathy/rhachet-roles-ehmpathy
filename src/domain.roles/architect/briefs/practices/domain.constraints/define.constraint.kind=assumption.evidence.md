# define.constraint.kind=assumption.evidence

the term evidence behind `define.constraint.kind=assumption`: where the word comes from, why it beat its rivals, and the precedent that backs it. a zoom of that brief; the definition itself lives there.

## .etymology

latin *assumere*, "to take up, to take to oneself". an assumption is a claim we take up from outside, not one we make true. the plain sense matches the sort test: if the world keeps it, it is an assumption; if we keep it, it is an invariant or a guarantee.

## .evidence

### the dimensional walk

| axis | values |
|---|---|
| source of the evidence | an upstream published guarantee · a vendor doc · a measurement · none |
| enforcement flavor | runtime assertion at the edge · monitor · none |

forbidden cells: an assumption with no evidence (`rule.forbid.implicit-assumptions`, `rule.require.assumptions-with-evidence`); an assumption with no enforcement — a silent break turns into a defect far from its cause.

### precedent

| precedent | the half it names | citation |
|---|---|---|
| misra and chandy's assume-commit; jones's rely | what a component takes from its environment | misra & chandy 1981 · jones 1981/83 |
| abadi and lamport's assume-guarantee proof rule | an assumption no component discharges is one the outside world must keep | abadi & lamport 1993 |
| hoare's precondition, left for the implementation to detect | a premise the caller owes; its break is detected, not prevented | hoare 1969 |
| meyer's precondition | a violation raises at once | meyer 1992 |

each citation, with its doi: `ref.invariant.history`, `.the assume → guarantee chain`.

## .rejected alternatives

| term | why rejected |
|---|---|
| precondition | names one contract term the caller owns; an assumption about the world has no caller (a webhook, a clock, a vendor's uptime) |
| rely | jones's word, precise in formal methods, but obscure to a domain expert, and a verb |
| dependency | overloaded with package dependencies and dependency injection |
| premise | accurate, but reads as logic jargon; it names the claim and omits the evidence and the response |
| expectation | collides with a test's `expect` |

## .invariants of the term

- every assumption names its evidence and its required response
- every assumption has an enforcement: an assertion at the edge, or a monitor
- a consumer cites an upstream guarantee as an assumption, never as its own invariant

## .see also

- `define.constraint.kind=assumption` — the definition this zoom backs
- `define.constraint._` — the generic, and the kind × grain dimensions
- `ref.invariant.history` — every citation above, in full
