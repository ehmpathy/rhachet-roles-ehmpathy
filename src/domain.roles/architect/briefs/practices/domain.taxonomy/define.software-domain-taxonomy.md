# define.software-domain-taxonomy

## .what

software splits by what it does with information:

| kind | does | its tools |
|---|---|---|
| **operations research** | optimizes over scarce resources: schedules, routes, allocations, rosters | a declared formulation + a solver (linear, integer, constraint) |
| **information logistics** | records and moves information | storage, queues, apis |
| ├─ **transactional** | live writes; each change keeps the domain's invariants | storage with structural enforcements: transactions, constraints, optimistic locks, status edges |
| └─ **analytical** | reads over history: reports, aggregates, trends | a warehouse (redshift, athena, bigquery), fed one way from the transactional storage |

most of our systems are transactional information logistics. some own an analytical warehouse. few have an optimization at their core.

the transactional storage is the source of truth. the warehouse is a derived copy: it lags, it never feeds back, and no live read or write-time check reads it. a read replica is not the warehouse — it is the transactional storage again, lagged.

## .why

the kind decides the tools. name it wrong and every later choice is wrong with it:

- operations research written as information logistics → nested search loops over the resources, which blow up on a real roster
- analytical reads run on the transactional storage → a report scan locks the records the live writes need
- information logistics treated as operations research → a solver where a lookup would do

## .the two hazards

| hazard | tell | cure | forbid |
|---|---|---|---|
| a hand-written search over scarce resources | loops that try combinations of instructors, slots, boards | declare the formulation; hand it to a solver | `rule.forbid.handrolled-search-over-scarce-resources` |
| an analytical scan on the live storage | an aggregate query over history against the write path | export one way into a warehouse; query there | `rule.forbid.analytical-scans-on-live-storage` |

## .the test

before the first design choice, name the kind in one word: optimize, transact, or analyze. a system of two kinds splits into two parts, each with its own tools.

## .source

the split follows the two disciplines' own names: operations research (optimize scarce resources) and information logistics (move and keep records), the latter split by workload into transactional and analytical.

## .see also

- `define.constraint.kind=invariant` — what a transactional system must keep
- `catalog.of=pattern.transaction._` — the enforcements for transactional invariants
