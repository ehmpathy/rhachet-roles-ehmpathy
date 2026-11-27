# philosophy.invariants-are-the-source

## .what

a system's invariants, assumptions, and guarantees are its source. the code is compiled from them — today by robot brains, semi-lossy. the inventory is the higher-level language; checked-in code is one build of it.

## .why now

| before | now |
|---|---|
| humans wrote the code; code was the scarce work | robots write the code; the definition of correct is the scarce work |
| a spec drifted from the code: each upkeep pass cost a human's hours, so few paid it | a robot reads the inventory on every route review: upkeep costs one review pass |
| the reader of a test was a human who knew the intent | the reader of a test is a robot, which can meet the letter and miss the intent |

a robot under pressure can meet the literal check and miss the intent behind it — even when it grasps the intent. specification gaming "satisfies the literal specification of an objective without achieving the intended outcome" (krakovna et al. 2020). frontier brains get a higher score "by modifying the tests or scoring code" (von arx, chan & barnes, metr 2025). a test alone cannot tell intent from letter. the invariant declares the intent the test stands for.

## .the source moved up a layer

| layer | artifact | author | fidelity |
|---|---|---|---|
| source | invariants, assumptions, guarantees | humans and robots, by discovery | declarative, stable across rewrites |
| build | code and tests | robots compile | semi-lossy: a compile can drop or bend an invariant |
| run | the deployed system | — | what consumers observe |

the compile is not trusted to carry an invariant. so every invariant needs an enforcement, and each route's review walks the writers to find it (`howto.itemize-constraints._`). the entry never names the enforcement; the enforcement is the code of the day.

## .the arbiter of a red test

a red test asks: is the code broken, or is the test wrong? the layers answer. each test proves one of two things:

- an **implementation contract** — glue: a fact the chosen implementation needs, below the invariants, so a robot compiled code that leans on it. most tests are glue. glue carries no inventory entry; the test says its contract in words
- a **domain invariant** — a rule the domain holds whatever the implementation. the test cites the entry (`[i001]`)

not every test needs an invariant. a test needs a named proof.

| the test proves | verdict |
|---|---|
| a domain invariant the change kept | the code is wrong. fix the code |
| a domain invariant the change amended on record | the test follows the amended entry |
| an implementation contract the change replaced | the test retires with the implementation |
| an implementation contract the change kept | the code is wrong. fix the code |
| a domain rule no entry names | derive the answer (below) |

### .silence is a cue to derive

where a test asserts a domain rule and the inventory is silent, skepticize the omission. glue never reaches this step — an invariant minted for an implementation fact goes stale on the next refactor.

1. an **implicit invariant** — does the domain hold a rule no one wrote down?
2. an **implicit assumption** — does the test lean on a fact the world keeps?
3. a **derived invariant** — does one follow, by deduction or induction, from the invariants, assumptions, and guarantees already on record?

a clear answer → record the entry, then act on it. no clear answer → record the likeliest entry as a best guess, act on it, and itemize it as a fulcrum for a human to verify.

a **halt** to ask a human mid-work is the defect; a human who verifies a recorded guess is the normal close. each guess a human overturns marks a place the inventory could not yet answer: reflect on which entry was absent and why the analysis could not reach it, then add it, so the next robot guesses right.

## .the domain lights up one room at a time

a team enters a new domain as a dark room. each discovered invariant lights one corner, so the theory is declared iteratively — no inventory holds the whole domain on day one. the question an entry answers never gets asked again; the next traveler reads the answer, not the person who knew it.

## .guarantees sit only at release boundaries

- **inside** a release boundary: invariants and assumptions for the key domain behavior — internal consistency at rest. internal contracts are mutable; they carry no backcompat promise
- **at** a release boundary: guarantees. each is what a consumer cites as an assumption in its own invariant chain. each is proven by a blackbox acceptance test, and each lists its exclusions

the depth of internal proof follows the system's taxonomy. information logistics rarely needs a contract chain proven end to end inside one release; concurrent and distributed cores may.

## .converge or contrast

each source weighed against the claims above (`rule.prefer.converge-contrast`). ☑️ = metadata verified, text not captured; cited by title only.

| source | stance | the independent path, or the point | response |
|---|---|---|---|
| krakovna et al. 2020, *specification gaming* | converge | an optimizer meets the literal spec and misses the intent | — |
| von arx, chan & barnes 2025, metr | converge | frontier brains modify tests and scorers to pass | — |
| karpathy 2017, *software 2.0* | converge | the human specifies "some goal on the behavior of a desirable program"; a machine searches for the program | — |
| karpathy 2023, post on x | converge | "The hottest new programming language is English" | — |
| lamport 2015, *who builds a house without drawing blueprints?* | converge | understand the task above the code; "writing tests in code does not get us thinking above the code level"; most code needs only "a couple of prose sentences" | — |
| newcombe et al. 2015, aws | converge | correctness properties stand apart from "all properties of the environment on which the system relies"; "an assertion checks a small, local part of an overall system invariant" | — |
| brooks 1987, *no silver bullet* ☑️ | converge | essence vs accident: the conceptual construct vs its representation | — |
| parnas & clements 1986, *how and why to fake it* ☑️ | converge | a design record kept as if the design were rational repays its upkeep | — |
| parnas 1972 ☑️ | converge | a part hides a design decision: the mutable implementation below the contract | — |
| meyer 1992 ☑️ | converge | design by contract: the caller owes the precondition, the supplier the postcondition, the class invariant holds at every stable point | — |
| preston-werner, semver 2.0.0 | converge | "MUST declare a public API"; an incompatible change = a major version | — |
| robinson 2006, *consumer-driven contracts* | converge | the provider contract holds what consumers expect "throughout the service's lifetime" | — |
| lewis & fowler 2014, *microservices* | converge | a component is "independently replaceable and upgradeable"; contracts evolve independently | — |
| leach 2017, stripe | converge | compatibility kept per dated version since 2011; each account pinned to one | — |
| google aip-180 | converge | "APIs are fundamentally contracts with users"; a surface whose callers update in lockstep weighs its own compatibility needs | — |
| naur 1985, *programming as theory building* | contrast | the theory lives in the programmers; documentation is "an auxiliary, secondary product" | **rebut**: the theory is declared iteratively. no entry holds the whole theory; each retires one question for good |
| reeves 1992, *what is software design?* | contrast | "final source code is the real software design"; the compiler does the build | **rebut**: reeves' frame, one layer up. the inventory is the design; the code is the build a robot compiles from it |
| dijkstra, EWD 667 (undated, after 1977) | contrast | formal texts rule out nonsense that a native tongue admits | **bound**: each entry declares a checkable predicate; prose carries only the why |
| *hyrum's law* (hyrumslaw.com) | contrast | "all observable behaviors of your system will be depended on by somebody" | **bound**: each guarantee lists its exclusions and is proven by a blackbox test; reliance past it is an assumption with no upstream guarantee |
| thomson & schinazi 2023, RFC 9413 | contrast | deployed behavior becomes "a de facto conformance test suite" | **bound**: as above — keep the declared and the observed surface close |
| jones 1983; abadi & lamport 1993, 1995; benveniste et al. 2018 | contrast | assume/guarantee per component, composed into one system proof | **bound**: the depth follows the taxonomy; information logistics proves guarantees only at release boundaries |
| newcombe et al. 2015 | contrast | formal specs inside the boundary, checked via tla+, at aws | **bound**: as above — a concurrent, distributed core earns internal proof |
| karpathy 2017 | contrast | the source is "the dataset that defines the desirable behavior" — examples, not a rule | **narrow**: examples define behavior only where an example exists; an invariant declares the rule for every scenario, and tests prove it at points |

## .see also

- `define.constraint.kind=invariant` — the term
- `howto.itemize-constraints._` — the three peer inventories
- `rule.require.invariant-before-operation` — name the invariant before the operation
- `rule.require.assumptions-with-evidence` — the assumption half
- `ref.invariant.history` — the lineage, cayley to benveniste
- `rule.forbid.test-edit-without-named-proof` (mechanic) — the arbiter at the keyboard
- `rule.prefer.converge-contrast` (mechanic) — the table's two stances
- `philosophy.entities-are-materialized-from-events` (domain.events) — what an invariant governs: each entity is the conclusion of its facts, and its invariants are what make that conclusion correct
