# define.constraint.kind=guarantee.evidence

the term evidence behind `define.constraint.kind=guarantee`: where the word comes from, why it beat its rivals, and the precedent that backs it. a zoom of that brief; the definition itself lives there.

## .etymology

old french *garantie*, "a warrant, a surety"; from *garant*, "one who answers for". a guarantee answers to someone outside: it exists only where a consumer relies on it. so it sits only at a release boundary — an internal contract has no outside party to answer to.

## .evidence

### the dimensional walk

| axis | values |
|---|---|
| place | internal · release boundary |
| shape of the promise | an invariant exposed · a transition · a liveness promise |
| change to it | kept · amended |

forbidden cell: a guarantee at an internal place. internal contracts change freely, so they carry no backcompat promise.

### precedent

| precedent | the half it names | citation |
|---|---|---|
| jones's guarantee | what a component gives back to its environment | jones 1981/83 |
| abadi and lamport's assume-guarantee specs | the system spec is the conjunction of its components' specs | abadi & lamport 1995 |
| alpern and schneider's safety and liveness | some promises are not predicates over one moment: "eventually runs" is liveness | alpern & schneider 1985 |
| benveniste et al.'s contract-based design | a guarantee under assumptions, as the unit of system design | benveniste et al. 2018 |
| semantic version, major for a break | a broken promise to consumers ships as a major release | semver 2.0.0, semver.org |

each citation but semver, with its doi: `ref.invariant.history`, `.the assume → guarantee chain`.

## .rejected alternatives

| term | why rejected |
|---|---|
| promise | the plain sense fits, but it collides with a js `Promise` in every code example |
| sla | names an operational target with penalties, not a behavior; and it shouts |
| contract | the container that holds guarantees, not one guarantee |
| postcondition | names one clause of one operation; a guarantee may span operations (idempotency) or time (liveness) |
| warranty | legal sense: a remedy after a defect, not a promise of behavior |

## .invariants of the term

- a guarantee sits only at a release boundary
- every guarantee has a blackbox acceptance test through the published contract that cites it
- every guarantee names what it does not promise
- an amended guarantee ships as a major release, with a release note

## .see also

- `define.constraint.kind=guarantee` — the definition this zoom backs
- `define.constraint._` — the generic, and the kind × grain dimensions
- `ref.invariant.history` — every citation above, in full
