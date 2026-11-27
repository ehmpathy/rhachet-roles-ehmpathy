# inventory.of=refs

one file per source: `ref.$year.$author.md`. each holds the full citation, where the browser saw it, a verbatim quote, and the claim it supports.

## .grades

| grade | means |
|---|---|
| ✅ | metadata from the doi registrar (crossref) or the publisher page; quote from the publisher page or the author's own text |
| ☑️ | metadata verified as above; quote from a secondary page, or none captured |
| 🟡 | secondary only, or unverified — never cite as fact without a hedge |

## .evidence

- `.raw/*.crossref.json` — crossref records (`api.crossref.org/works`), fetched by `.playbooks/fetch-sources.play.ts`
- `.raw/page.*.json` — page captures: final url, status, citation meta, ±400-char windows around keywords
- `.raw/_open-tabs.md` — tabs a human cleared past bot walls, read by `.playbooks/read-open-tabs.play.ts`; `.playbooks/open-captcha-tabs.play.ts` holds the list of walled urls of the latest round
- `.playbooks/sources.json` — the source list of the latest fetch round; earlier rounds persist as their raw records
- `.raw/_digest.md` — one-page digest of all the above

## .index

| era | ref | grade | supports |
|---|---|---|---|
| antiquity | ref.c500bce.heraclitus | ☑️ | all things flow — change is the default |
| antiquity | ref.c475bce.parmenides | ☑️ | what is, is — the unchanged as the knowable |
| algebra | ref.1841.boole | 🟡 | the paper that prompted cayley |
| algebra | ref.1845.cayley | 🟡 | invariant theory founded, 1845–46 |
| algebra | ref.1851.sylvester | 🟡 | the word "invariant" coined |
| algebra | ref.1872.klein | ☑️ | geometry = what a group of transformations preserves |
| algebra | ref.1890.hilbert | ☑️ | basis theorem: proved 1888, published 1890 |
| physics | ref.1918.noether | ✅ | each continuous symmetry yields a conserved quantity |
| programs | ref.1947.goldstine-vonneumann | 🟡 | unverified — do not assert |
| programs | ref.1949.turing | ☑️ | first program proof with assertions |
| programs | ref.1966.naur | ✅ | general snapshots: static conditions at program points |
| programs | ref.1967.floyd | ☑️ | assertions attached to flowchart edges |
| programs | ref.1969.hoare | ☑️ | {P} C {Q}; the while rule names the loop invariant |
| programs | ref.1972.dijkstra | ✅ | no loop without its invariant relation; abstraction = precision |
| programs | ref.1972.hoare | ✅ | proof of data representations (the data invariant) |
| modules | ref.1972.parnas | ☑️ | modules hide a design decision |
| modules | ref.1974.liskov-zilles | ☑️ | abstract data types |
| programs | ref.1975.dijkstra | ✅ | "the invariant relation" and "the variant function", by name |
| data | ref.1970.codd | ☑️ | relational model; integrity as data-level invariants |
| concurrency | ref.1977.lamport | ✅ | invariants for concurrent programs; "write a global invariant" |
| composition | ref.1981.misra-chandy | ✅ | a process specified by a pair of assertions; networks composed by rules |
| composition | ref.1983.jones | ☑️ | rely/guarantee for programs that interfere (tech report 1981) |
| data | ref.1983.haerder-reuter | ☑️ | transactions preserve consistency (acid) |
| composition | ref.1985.pnueli | ☑️ | from global to modular temporal proofs |
| properties | ref.1985.alpern-schneider | ✅ | every property = safety ∩ liveness |
| contracts | ref.1992.meyer | ☑️ | design by contract (from 1986); class invariant |
| composition | ref.1993.abadi-lamport | ✅ | a component behaves only when its environment does |
| specs | ref.1994.lamport | ☑️ | tla: specs as temporal formulas |
| subtypes | ref.1994.liskov-wing | ☑️ | subtypes preserve invariants |
| modules | ref.2018.ousterhout | ✅ | deep modules; pass-through methods; simple interface over simple implementation; define errors out of existence (book snippets, pp. 23, 46, 55, 79) |
| composition | ref.1995.abadi-lamport | ✅ | a system spec = the conjunction of its component specs |
| refinement | ref.1996.abrial | ☑️ | b method: invariant proved per operation, kept through refinement |
| tools | ref.2000.claessen-hughes | ☑️ | property-based tests |
| tools | ref.2002.jackson | ☑️ | alloy: bounded model search for invariant breaks |
| domain | ref.2003.evans | 🟡 | aggregates guard invariants (isbn only, no doi) |
| refinement | ref.2010.abrial | ☑️ | event-b: system-level refinement with proof |
| types | ref.2011.minsky | ☑️ | make illegal states unrepresentable |
| replication | ref.2011.shapiro | ☑️ | crdts: convergence by construction |
| data | ref.2014.bailis | ✅ | invariant confluence: when coordination is necessary |
| composition | ref.2018.benveniste | ✅ | contract meta-theory: assume/guarantee for system design |
| types | ref.2019.king | ✅ | parse, don't validate |
| source | ref.1978.dijkstra | ✅ | formal texts rule out nonsense a native tongue admits (EWD 667) |
| source | ref.1985.naur | ✅ | the theory lives in the programmers; documentation is secondary |
| source | ref.1986.parnas-clements | ☑️ | keep the design record as if the design were rational (title only) |
| source | ref.1987.brooks | ☑️ | essence vs accident (no text captured) |
| source | ref.1992.reeves | ✅ | the source code is the design; the compiler does the build |
| source | ref.2015.lamport | ✅ | specs above the code; tests in code are not the spec; 95% of code needs only prose |
| source | ref.2015.newcombe | ✅ | correctness properties apart from environment properties; an assertion checks part of a system invariant |
| source | ref.2017.karpathy | ✅ | software 2.0: the human states the goal on behavior; a machine searches for the program |
| source | ref.2023.karpathy | ✅ | "the hottest new programming language is English" |
| robots | ref.2020.krakovna | ✅ | specification gaming: the literal spec met, the intent missed |
| robots | ref.2025.metr | ✅ | frontier models modify tests and scorers to pass |
| releases | ref.2006.robinson | ✅ | consumer-driven contracts: the consumer's expectations shape the provider contract |
| releases | ref.2013.semver | ✅ | declare a public api; incompatible change = major version |
| releases | ref.2014.fowler-lewis | ✅ | components independently replaceable; contracts evolve independently |
| releases | ref.2017.stripe | ✅ | compatibility kept per version since 2011; accounts pinned to a version |
| releases | ref.2023.rfc9413 | ✅ | deployed behavior can supersede the written spec |
| releases | ref.nd.hyrum-wright | ✅ | every observable behavior gets depended on |
| releases | ref.nd.google-aip180 | ✅ | apis are contracts; minor and patch must not break clients |
| constraints | ref.1970.dijkstra | ✅ | cases combine additively, not multiplicatively (EWD 288) |
| constraints | ref.1952.hick | ☑️ | the time to choose grows with the number of options (title only) |
| constraints | ref.2011.danziger | ✅ | favorable rulings fall from ≈65% to near zero within each decision session |
| constraints | ref.2011.weinshall-margel | ☑️ | the session effect has other explanations — a contrast (title only) |
| boundaries | ref.1814.laplace | ✅ | a law plus one start determines every later scenario — induction, in physics |
| boundaries | ref.1902.hadamard | 🟡 | well-posed: initial and boundary values fix one solution, which moves continuously with them |
| boundaries | ref.nd.uniqueness-poisson | 🟡 | sources plus boundary conditions fix the field inside |
| boundaries | ref.1927.hopf | 🟡 | maximum principle: extremes sit on the boundary |
| boundaries | ref.1904.prandtl | ☑️ | the action concentrates in a thin layer at the edge; the interior is simple |
| boundaries | ref.1979.myers | ☑️ | boundary-value analysis: one case per class; defects cluster at class edges |
| transactions | ref.nd.postgresql | ✅ | a transaction bundles steps into one all-or-none unit; unique, check, foreign-key constraints; `for update` row locks; advisory locks ("the system does not enforce their use"), session vs transaction scope; lock modes are the set of modes each conflicts with |
| transactions | ref.1981.kung-robinson | ✅ | optimistic concurrency control, the origin: read, validate, write; a conflict met by backup, against locks that make a transaction wait (author's copy of the paper, read) |
| transactions | ref.2002.fowler | ✅ | optimistic offline lock: detect a conflict, roll back. pessimistic offline lock (by david rice): acquire a lock before use, so only one business transaction at a time accesses the data |
| transactions | ref.nd.fowler-aggregate | ✅ | transactions should not cross aggregate boundaries |
| transactions | ref.2016.helland | ✅ | an idempotent recipient remembers each message; atomicity only within one uniquely keyed entity |
| transactions | ref.nd.richardson | ✅ | idempotent consumer, saga (orchestration, compensation), transactional outbox |
| transactions | ref.nd.simple-async-tasks | ✅ | the async task as a domain entity with a unique key; a guarded queue and execute lifecycle; an execute left `ATTEMPTED` counts as a failure |
| transactions | ref.nd.sql-schema-generator | ✅ | our upsert is insert only: find or insert the static row, append a version only on change, move the pointer forward only |
| transactions | ref.nd.postgresql-insert | ✅ | the contrast: `on conflict do update` is one atomic insert-or-update that overwrites |
| transactions | ref.2015.brooker | ✅ | backoff alone leaves clusters of calls; add jitter; optimistic concurrency degrades under high contention |
| transactions | ref.nd.stripe-idempotency | ✅ | the client mints one key per operation; a retry with the same key charges once |
| transactions | ref.2026.ietf-idempotency-key | ✅ | a client-minted key makes post and patch fault-tolerant; a concurrent retry gets a conflict (draft-09, not yet an rfc) |
| transactions | ref.2016.kleppmann | ✅ | a distributed lock is unsafe under any lock service; the fix is a token the storage checks on each write. a lock for efficiency (a duplicate is a minor cost) vs for correctness (a corrupt record) |
| transactions | ref.nd.jepsen-monotonic-writes | ✅ | write order holds only within one process |
| transactions | ref.1978.gray | ☑️ | two-phase commit, the origin (title only) |
| transactions | ref.1976.gray-lorie-putzolu-traiger | ✅ | lock modes: share and exclusive, defined by what the grantee and others may do and which requests are compatible; the mode is independent of the granule locked (ocr text of the author-hosted report; 1976 print venue unverified) |
| transactions | ref.nd.mysql | ✅ | `GET_LOCK` is a cooperative advisory lock on a name, session-scoped, open to a stranger that takes the name; `FOR SHARE` / `FOR UPDATE` lock the records the search met, released at transaction end |
| transactions | ref.nd.microsoft-sp-getapplock | ✅ | sql server application lock: a lock on a name the application keeps unique; owner is the transaction (default) or the session |
| transactions | ref.nd.oracle-dbms-lock | ✅ | oracle user lock: an application-named lock apart from the locks on data; released at session end, or at commit by a flag (release 19 docs) |
| transactions | ref.nd.pgbouncer | ✅ | transaction pool mode breaks session-level advisory locks ("Never"); the application must not use the features that break |
| transactions | ref.2020.mihalcea | 🟡 | practitioner's use case: an advisory lock as a mutex on a document that has no record to lock |
| transactions | ref.1994.terry | ☑️ | the session guarantees, the origin (title only) |
| transactions | ref.1983.haerder-reuter | ☑️ | atomicity, consistency, isolation, durability — the paper that named the four (title only) |
| transactions | ref.2005.helland | ✅ | converge, two-phase commit: a non-coordinator cedes its independence; locks kept through the wait devastate availability |
| transactions | ref.2007.helland | ✅ | converge, both forbids: two-phase commit too fragile; a tentative operation the domain records, then confirms or cancels |
| transactions | ref.2009.helland-campbell | ✅ | converge: two-phase commit rarely used in production; a reversal is an apology, a forward business act |
| transactions | ref.2004.hohpe | ✅ | converge on two-phase commit; partial on saga — compensation is "the last option", after retry with an idempotent receiver |
| transactions | ref.nd.hohpe-process-manager | ✅ | converge, async task: a central unit holds the sequence and picks the next step from intermediate results |
| transactions | ref.nd.azure-saga | ✅ | contrast: recommends the saga; concedes a compensation may fail and leave records inconsistent, with no isolation |
| transactions | ref.nd.azure-compensating-transaction | ✅ | contrast: concedes records are inconsistent between steps, and an undo cannot restore the past |
| transactions | ref.1987.garcia-molina-salem | ☑️ | sagas, the origin of the term (title only) |
| transactions | ref.nd.jepsen | ✅ | read your writes: a process sees its own prior write |
| transactions | ref.nd.wikipedia-double-entry | ☑️ | equal and opposite entries; pacioli 1494 (secondary) |
| events | ref.2017.fowler-event-driven | ✅ | "event" names four patterns teams conflate; the passive-aggressive command; a flow no program text shows; async is orthogonal |
| events | ref.2006.fowler-event-narrative | ✅ | a domain event is a fact with immutable source data and two time points; event collaboration is implicit; a log as the record is hard against external systems |
| events | ref.2005.fowler-domain-event | ✅ | immutable source data; a wrong event is answered by a separate event; name each time point |
| events | ref.2006.fowler-event-collaboration | ✅ | one component posts the update events for each datum; requests go to the manager, confirmed updates to all; the event cascade |
| events | ref.2005.fowler-event-sourcing | ✅ | every change as an event; the log may be the record, or only an audit beside it; replay breaks against external systems |
| events | ref.2005.fowler-retroactive-event | ✅ | converge: never delete an event; a correction is a new event |
| events | ref.2011.fowler-cqrs | ✅ | for most systems cqrs adds risky complexity; use an analytical copy instead |
| events | ref.2005.fowler-event-poster | ✅ | a copy never writes itself; it asks the source, then waits for the source's event |
| events | ref.2011.fowler-memory-image | ✅ | a log as the record owes snapshots, restore, concurrency, and event shapes that evolve |
| events | ref.2011.fowler-lmax | ✅ | the leaf case where a log as the record earns its cost: one in-memory processor, one thread |
| events | ref.2013.kreps | ✅ | converge: the log is the record of what happened; each table is a projection of it; tables and events are dual; a replica replays the log (wayback capture; the live url 404s) |
| events | ref.2015.helland | ✅ | converge: "the truth is the log"; the database caches the latest value of each record; a correction is a new entry, never an erasure |
| events | ref.2015.kleppmann | ✅ | converge: the database already turns writes into immutable events; a view is a cached subset of the log. contrast: views lag the write, and reads split from writes |
| abstractions | ref.1985.abelson-sussman | ✅ | sicp: abstractions over procedures and over data; abstraction barriers (§2.1.2, 2nd ed. full text) |
| abstractions | ref.2002.spolsky | ✅ | all non-trivial abstractions leak |
| abstractions | ref.2014.martin | ✅ | gather what changes for the same reasons; separate what changes for different ones |
| abstractions | ref.nd.wikipedia-abstraction-inversion | 🟡 | callers re-implement a hidden primitive on top of the interface; origin of the term unknown |
