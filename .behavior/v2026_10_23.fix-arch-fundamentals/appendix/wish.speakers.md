# appendix: wish speakers

the wish (`0.wish.md`) is a pasted chat transcript. it holds three voices. the transcript marks no turns, so this index assigns each line range to its voice. `0.wish.md` stays verbatim; this file only labels it.

## .the voices

| voice | who | weight in the vision |
|---|---|---|
| **wisher** | the human. 13 years a programmer (line 1101). asks, doubts, synthesizes | **primary**. a lesson the wisher stated or confirmed is a candidate as-is |
| **ai** | a search-engine chat assistant ("AI Mode", line 9) | **hearsay**. a claim from this voice is a lead to verify, never a premise |
| **dijkstra** | quotes of EWD 340, pasted by the wisher (lines 15, 682) or cited by the ai | **primary source**, once checked against the archive |

lines 9–14 are page chrome (`AI Mode`, `All`, `Forums` …). lines 1–3 are the wisher's directive: *"read this convo. extract fundamental lessons we should teach architects and mechanics based on it."*

## .the turn index

| # | wisher line | the wisher's turn (verbatim) | ai reply lines |
|---|---|---|---|
| t01 | 15 | (pastes dijkstra, EWD 340) *"define invariance and relation in this usage; …"* | 16–40 |
| t02 | 41 | *"yeah its a little ambiguous what they mean right now. use a simple surfschool example"* | 42–68 |
| t03 | 69 | *"show an anti example"* | 70–105 |
| t04 | 106 | *"oh so the 'relation' = the fundamental objective, invariant = upleld ? i.e., in this case, the code provably does not achieve the invariant"* | 107–127 |
| t05 | 128 | *"so hes just saying 'the code must fulfill the intent' ? in math words?"* | 129–148 |
| t06 | 149 | *"seems a little heavy handed. e.g., the mathmatical proof is gonna be harder to prove than the code itself can be tested, no?"* | 150–173 |
| t07 | 174 | *"ok so the bridge here is we define invariants and then test all the ways they could be violated?"* | 175–192 |
| t08 | 193 | *"isnt the combinatorial nature of reallife domains such that it could be impossible to define a mathmatical invariant ?"* | 194–215 |
| t09 | 216 | *"yeah even under decomposition and isolation, the composers still must be tested no?"* | 217–244 |
| t10 | 245 | *"so what was dijkstra's thoguht on the composition proofs?"* | 246–279 |
| t11 | 280 | *"so, then, how can we write mathmatical proofs against langs like typescript?"* | 281–331 |
| t12 | 332 | *"demonstrate via surfschool example; …"* | 333–398 |
| t13 | 399 | *"nah not via typescript specifically, just for the surfschool domain with the most ergo proof lang"* | 400–462 |
| t14 | 463 | *"this seems harder to read than the code itself"* | 464–483 |
| t15 | 484 | *"possible to write typescript, prove via other?"* | 485–522 |
| t16 | 523 | *"show this example"* | 524–603 |
| t17 | 604 | *"so it uses induction always?"* | 605–622 |
| t18 | 623 | *"yeah, demonstrate"* | 624–681 |
| t19 | 682 | (pastes dijkstra's argument three) *"doesnt this imply that we can simply clamp the boundary conditions via tests and prove that our solution satisfies the boundaires?"* | 683–709 |
| t20 | 710 | *"this seems totally impractiacl"* | 711–731 |
| t21 | 732 | *"yeah exaclty, test driven development - via boundary tests . so, proof against invariants is the fundamental; mathematical proof via induction is one mechanis. boundary tests is another. right?"* | 733–764 |
| t22 | 765 | *"did Dijkstra ever bless boundary tests ? or stayed zealous about induction?"* | 766–795 |
| t23 | 796 | *"so he cared more about philosophical correctness than pragmatic correctness?"* | 797–815 |
| t24 | 816 | *"how does mathmatics simplify the fundamental domain? how we describe it cant possibly change the bounds"* | 817–855 |
| t25 | 856 | *"yes. surf school though"* | 857–925 |
| t26 | 926 | *"implement the mathmatical approach in typescript"* | 927–1031 |
| t27 | 1032 | *"what is 'solver' ? and where is the math relationship declared in the example above? all i see are the variables and constraints"* | 1033–1100 |
| t28 | 1101 | *"how come these s cases are so rare in practice? i've programmed for 13 years and never had an optimization problem where this was relevant"* | 1102–1142 |
| t29 | 1143 | *"information logistics vs operations research? is that the breakdown?"* | 1144–1167 |
| t30 | 1168 | *"information logicstics then has subsets of alanytical and transactional?"* | 1169–1212 |
| t31 | 1213 | *"can you summarize our whole conversation with citations and fundamental lessons … full inventory plz, itemized as rules and lessons"* | 1214–1279 |

## .what the wisher concluded, in the wisher's own words

these turns carry the wisher's synthesis. the vision treats them as the thesis.

- **t04** — relation = the objective; invariance = it is upheld
- **t07** — define invariants, then test every way they could be violated
- **t08** — a real domain's combinatorics may bar one whole-system invariant
- **t09** — decomposed parts still leave the composers to test
- **t19** — clamp the boundary conditions via tests
- **t21** — *"proof against invariants is the fundamental; mathematical proof via induction is one mechanis. boundary tests is another."* ← the central thesis
- **t24** — a description cannot change the domain's bounds
- **t27** — the solver example hides the relation in matched key names
- **t28–t30** — the taxonomy: operations research vs information logistics; transactional vs analytical

what the wisher doubted, and never conceded: proof-first is practical (t06, t14, t20); dijkstra's purism serves daily work (t22, t23).

## .the ai's claims, audited

the ai voice asserts much. each claim below feeds a lesson, so each carries a verdict.

| ai claim | lines | verdict | evidence |
|---|---|---|---|
| EWD 340 holds the loop-invariant + termination passage | 16–36 | ✅ verified | wisher's paste at line 15 matches the archive; arguments three and four fetched from `cs.utexas.edu/~EWD/transcriptions/EWD03xx/EWD340.html` (2026-10-23) |
| tests show the presence of bugs, never their absence | 155 | ✅ verified | EWD 340, argument three (pasted by the wisher at line 682) |
| dijkstra: proof effort must combine *"additively, rather than multiplicatively"* | 246–254 | ✅ verified | EWD 288 fetched 2026-10-23 (`cs.utexas.edu/~EWD/transcriptions/EWD02xx/EWD288.html`): *"the number of cases … combine additively, rather than multiplicatively"*. the ai's "Layer 0/1/2" gloss (lines 255–262) is its own; not checked |
| Mars Climate Orbiter lost to a units mismatch | 225 | ✅ well known | the units fact holds. the ai's add-on *"both … mathematically verified"* is invented → ❌ overclaim |
| coq-of-ts / LemmaScript exist | 310–311 | 🟡 unverified | named with links; not fetched → `[research]` |
| the shown `surfSchool.v` is *"the real output"* of coq-of-ts | 524–598 | ❌ unreliable | the proof cites `count_beginners_pure_math`, which no file defines; reads as invented |
| AWS Zelkova + Z3 checks IAM policies | 624–668 | 🟡 plausible | cites an AWS blog + talks; not fetched → `[research]` |
| a proof-guided build makes boundary tests obsolete | 708 | ❌ overclaim | the wisher rejected it (t20); EWD 340 does not say it |
| dijkstra *"never blessed boundary tests … until the day he died"* | 766 | 🟡 unsourced | cites reddit threads; strong claim, no primary source → do not teach |
| LP example: 2 beginner + 4 advanced = 1800 is optimal | 918 | ✅ checked by hand | 5·x1 ≤ 20, x2 ≤ 4, x1+x2 ≤ 6 → x2=4, x1=2, 200·2+350·4 = 1800 |
| the LP solver is an SMT engine (line 996 calls it both) | 996 | ❌ conflation | an LP solver (simplex, branch-and-bound) is not an SMT solver |
| ~95% of commercial work is information logistics | 1102 | 🟡 unsourced figure | the split is sound; the number is a guess → teach the split, drop the number |
| OLTP vs OLAP split; analytical scans on a live transactional store lock it | 1169–1199 | ✅ industry canon | cites Databricks, Google Cloud; matches standard texts. "lock" depends on the engine and isolation level → teach as a contention hazard, not a universal lock |
