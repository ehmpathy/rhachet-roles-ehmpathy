agreed on both. pushed in 55325430; every check on the pr passed.

**mechanic 101 now carries the heart.** the bar moved from "rules no hook enforces" to what the readme says the mechanic maximizes, in cue form. 26 say rows:

- who: the seaturtle · wick-dense
- names: ubiqlang · treestruct · no gerunds · get/set/gen verbs
- readable for the 3am on-call engineer: narrative flow · no else · no inline decode friction · what/why headers
- evolvable: (input, context) · arrow-only · immutable vars
- errors, mutation, types (the prior cues): failfast · failloud · no failhide · exit codes · qualified headers · idempotent mutations · no `as` cast
- tests: given/when/then · no integration mocks
- work: trust-but-verify · clamp-edge-cases · scouts-honor

**architect and ergonomist each gain a `subject.101`**, which sheds `always` the same way:

- architect (8 say): solve at the cause · the three operation grains · no decode friction in orchestrators · idempotent operations · domain discovery + term proposals · wick-dense + brevity. the garden philosophy, transformer/orchestrator, fewer-paths, and the discovery howtos sit at ref
- ergonomist (5 say): `def.ergonomic` (the rubric, which names every rule) · discoverability · status feedback · errors name the fix · safe by default. the rest of the rubric's rules and the canon sit at ref

**numbers** (`roles cost --subject 101`): mechanic 7,926 / 10k · architect 4,769 / 6k · ergonomist 2,936 / 3.5k. caps in `SUBJECT_BUDGETS`; a per-subject `budget:` is asked of rhachet (see the snapshot thread).

**two calls to flag for you:**

- every 101 say row is already say elsewhere in its role (the budget test asserts it), so no role gains a brief body. but rhachet renders each re-claimed row as one roster line (~14 tokens), so the full mechanic boot reads 30,185. its `budget` goes to **30,500**, a one-line, commented change; `always` and every other section keep main's rows. the efficiency director ruled that this stands; the other levers (more `not:` rows, a smaller heart) remain clean swaps
- the heart rows and the 6k / 3.5k caps are my best guess, and stand per the efficiency director. a row moves between say and ref in one line

proof, in ci on 55325430: build, types, lint, format, unit, integration, and acceptance all pass. `boot.budget` caps all three 101s; `blackbox/role.subject.101.acceptance.test.ts` boots the architect and ergonomist 101 from the built package (exact say rows, exact ref roster, no `always` row); the mechanic 101 suite passes. the pr body names the 30,500 raise beside the 30,185 read.
