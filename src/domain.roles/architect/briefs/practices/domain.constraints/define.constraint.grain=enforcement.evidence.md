# define.constraint.grain=enforcement.evidence

the term evidence behind `define.constraint.grain=enforcement`: where the word comes from, why it beat its rivals, and the precedent that backs it. a zoom of that brief; the definition itself lives there.

## .etymology

old french *enforcier*, "to strengthen, to make good by force". in law, *enforcement* is the act that makes a declared rule bite: a statute declares, its enforcement holds people to it, and a statute with no enforcement is a dead letter.

the noun names the act and its mechanism, not an agent. so one word covers a type that refuses to compile, an optimistic lock that refuses a commit, a test that proves a guarantee before release, and a monitor that pages after the fact.

## .evidence

### the dimensional walk

| axis | values |
|---|---|
| grain | declaration · enforcement |
| constraint enforced | invariant (keep it true) · assumption (assert it, fail fast) · guarantee (prove it before release) |
| how it asserts | by structure (no path) · by operation (a check) |
| structure | compilation · abstraction |
| when the check runs (operational only) | a deliberate run (devtime) · in the path (runtime) · after the fact (monitor) |
| where a devtime run points | test · prep · prod |
| breadth (devtime only) | one case · a property over generated cases · every case (induction, a solver) |

forbidden cell: a guard in one caller is not an enforcement of either kind — it catches the break only on its own path.

### precedent

| kind | precedent | citation |
|---|---|---|
| structural · compilation | "make illegal states unrepresentable" | minsky 2011 |
| structural · abstraction | "push the burden of proof upward as far as possible" (parse at the boundary) | king 2019 |
| structural · abstraction (storage) | keys and constraints hold data-level invariants; a transaction keeps them across each change | codd 1970 · haerder & reuter 1983 |
| operational · runtime | a contract violation at runtime "will be served immediately with an exception" | meyer 1992 (eiffel docs) |
| operational · devtime (universal) | the program derived from "the invariant relation" and "the variant function" | dijkstra 1975 |
| operational · devtime (property) | a property checked over generated cases | claessen & hughes 2000 |
| operational · runtime (local) | "an assertion checks a small, local part of an overall system invariant" | newcombe et al. 2015 |

each citation, with its doi and verbatim quote: `ref.invariant.history`.

## .rejected alternatives

| term | why rejected |
|---|---|
| guardian | an agent noun, so it does not pair with **declaration**, a grain; and it collides with a minor's legal guardian |
| enforcer | an agent noun, like guardian; and it reads as structural force alone |
| detector | names only the reactive flavors; a type detects naught |
| asserter | fits every kind, but reads as a code construct (`assert`) and an agent |
| guard | overloaded with route guards, type guards, guard clauses; and a guard in one caller is the antipattern this term must exclude |
| keeper | vague; reads as a custodian, not a mechanism |
| mechanism | overloaded: every piece of code is a mechanism |
| guarantor | collides with **guarantee**, one of the three constraints an enforcement holds |
| constraint | the generic for what is enforced (`define.constraint._`), never for what enforces it |
| safeguard | soft; reads as optional |

## .collisions, settled

- **route guards** (`*.guard`, bhrain). a route guard gates a stone; it is not an enforcement of a domain constraint
- **a brief's `.enforcement` section** (blocker / nitpick grades). that section grades a rule on a reviewer's read; this term names what enforces a domain constraint in code. one is a section title, the other a noun in prose

## .invariants of the term

- every constraint has at least one enforcement in code; a route review checks it, and the constraint's own declaration never names it
- an `.enforcement=$slug` zoom-in cites an enforcement; it is never the enforcement, and never exhaustive
- a devtime enforcement names its breadth: case, property, or universal
- devtime, runtime, and monitor are peers: each names when a check runs, never where
- a guard in one caller is never called an enforcement

## .see also

- `define.constraint.grain=enforcement` — the definition this zoom backs
- `define.constraint._` — the generic, and the kind × grain dimensions
- `ref.invariant.history` — precedent per rung: minsky 2011, king 2019, codd 1970, meyer 1992, claessen & hughes 2000, dijkstra 1975
