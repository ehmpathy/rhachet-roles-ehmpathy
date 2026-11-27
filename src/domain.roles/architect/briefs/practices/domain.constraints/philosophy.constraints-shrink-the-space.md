# philosophy.constraints-shrink-the-space

## .what

a **constraint** = a rule we add onto a system for how it must behave. three kinds, sorted by who keeps it true:

| constraint | kept by |
|---|---|
| **invariant** | us, inside |
| **assumption** | the world |
| **guarantee** | us, to consumers at a release boundary |

an **enforcement** asserts that a constraint is not broken — **structural** (by compilation, as a type; or by abstraction, as a domain object or one write path) or **operational** (proactive at devtime, as a test or a play; reactive at runtime, as an assertion in the path; or reactive by monitor, after the fact). the constraint says what must be true; the enforcement is the implementer's choice of how (`define.constraint.kind=invariant`).

at root, a constraint **shrinks the space of scenarios and behaviors the system can reach**. every benefit below follows from that one move.

## .the benefits, derived

| the smaller space gives… | benefit | in practice |
|---|---|---|
| less to hold in mind | **comprehension** | cases add rather than multiply; a reader reasons about one part without the rest |
| one sense | **communication** | one sense per rule, shared by human, robot, and consumer |
| decided once | **decisions** | never re-decided at each call site, so no fatigue from the repeat; independent workers converge on one answer |
| wrong is defined | **correctness** | a defect is nameable and falsifiable, caught at its cause; whole classes ruled out. it narrows the rope we could hang ourselves with |
| what is unconstrained is free | **change** | all outside the constraint is the implementer's choice, so a refactor is safe. left undeclared, each observed behavior hardens into a constraint by accident |
| checkable by another party | **delegation** | a robot, a team, or a consumer can be handed the work, because the constraint checks them; constraints compose across release boundaries |
| outlives the code | **memory** | the domain's knowledge survives every rewrite |

## .why the last three matter most now

robots write the code.

- **change** — the implementer's choice is now the robot's choice; the constraint marks where that freedom ends
- **delegation** — we trust code we did not write only as far as the enforcements of its constraints reach
- **memory** — the code is a build; the constraints are the source (`philosophy.invariants-are-the-source`)

## .the bound — constrain what the domain holds, no more

a constraint costs: an enforcement to build, a declaration to keep current. a constraint the domain does not hold freezes what should stay free, and spends the change benefit on no one.

- discover constraints; never invent them (`def.domain-discovery`)
- declare the baseline and the boundary cases, and induce the rest (`define.constraint.kind=invariant`)
- leave the rest unconstrained on purpose; where a consumer could lean on it, list it as an exclusion (`howto.itemize-constraints.template=guarantee`)

## .converge or contrast

each source weighed against the claims above (`rule.prefer.converge-contrast`). ☑️ = metadata verified, text not captured; cited by title only.

| source | stance | the point | response |
|---|---|---|---|
| dijkstra 1970, EWD 288 | converge | "the number of cases between which we have to distinguish … combine additively, rather than multiplicatively" | — |
| dijkstra 1972, EWD 340 | converge | abstraction creates "a new semantic level in which one can be absolutely precise" | — |
| hick 1952 ☑️ | converge | the time to choose grows with the number of options | — |
| danziger, levav & avnaim-pesso 2011 | converge | favorable parole rulings drop "from ≈65% to nearly zero within each decision session" | — |
| weinshall-margel & shapard 2011 ☑️ | contrast | the parole-session effect has other explanations | **bound**: we claim fewer decisions, never a mechanism of fatigue |
| lamport 2015 | converge | "If we do not start with a specification, every line of code we write is a patch." | — |
| parnas 1972 ☑️ | converge | a part hides a design decision, free to change behind its contract | — |
| *hyrum's law* (hyrumslaw.com) | converge | "all observable behaviors of your system will be depended on by somebody" — the undeclared hardens by accident | — |
| newcombe et al. 2015 | converge | "an assertion checks a small, local part of an overall system invariant" | — |
| krakovna et al. 2020; von arx, chan & barnes 2025 | contrast | an optimizer meets the letter of a check and misses the intent | **narrow**: delegation holds only as far as the enforcements reach. a constraint with no enforcement is a wish |

## .see also

- `define.constraint.kind=invariant` — the three constraints, the two grains, the enforcement kinds
- `howto.itemize-constraints._` — where constraints are declared
- `philosophy.invariants-are-the-source` — why the constraints are the source now
- `philosophy.abstraction-creates-precision` — an abstraction as the home of a constraint
- `philosophy.domain-as-a-garden` — constraints as the atoms that compose
