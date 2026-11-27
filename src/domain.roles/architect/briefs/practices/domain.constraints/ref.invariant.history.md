# ref.invariant.history

## .what

the chain of how "invariant", and the tools beside it, entered thought, mathematics, and software — each with the year it was introduced and a citation.

every entry carries a grade and a `ref` slug. the slug names the evidence file (full citation, where the browser saw it, the verbatim quote) under `.behavior/v2026_10_23.fix-arch-fundamentals/refs/`.

| grade | means |
|---|---|
| ✅ | metadata from the doi registrar or publisher; quote from the publisher or the author's own text |
| ☑️ | metadata verified; quote secondary, or none |
| 🟡 | secondary only, or unverified — hedge before you cite |

## .the through-line

every era asks one question: **what stays true while all else changes?**

- philosophy names the question
- mathematics makes it exact: what a group of transformations leaves unchanged
- physics ties it to symmetry: each continuous symmetry yields a conserved quantity
- software makes it a duty: declare what stays true across each step, then enforce it
- composition makes it scale: each part assumes what its neighbors guarantee, and the whole is proved from the parts

## .the chain

### philosophy — the question

| year | who | contribution | ref | ✓ |
|---|---|---|---|---|
| c. 500 BCE | heraclitus | all things pass and none stays; "you could not step twice into the same river" (via plato, *cratylus* 402a) | c500bce.heraclitus | ☑️ |
| c. 475 BCE | parmenides | what is, is; on the strict monist interpretation, change in reality is impossible | c475bce.parmenides | ☑️ |

### mathematics — invariance made exact

| year | who | contribution | citation | ref | ✓ |
|---|---|---|---|---|---|
| 1841 | george boole | the paper cayley credits as the prompt for his theory | *cambridge mathematical journal* (vol. not verified) | 1841.boole | 🟡 |
| 1845–46 | arthur cayley | two papers "regarded as laying the foundations for invariant theory" | "on the theory of linear transformations", *cambridge mathematical journal* | 1845.cayley | 🟡 |
| 1851 | j. j. sylvester | **coins the word**: "as I propose henceforth to call them, the two Invariants"; "if I(a, b,..l) = I(a', b',..l'), then I is defined to be an invariant of f" | *philosophical magazine*, 4th ser., 2, 391–410 | 1851.sylvester | 🟡 |
| 1872 | felix klein | **erlangen program**: a geometry = the properties invariant under a group of transformations | republished *math. annalen* 43(1), 63–100 (1893), doi:10.1007/BF01446615 | 1872.klein | ☑️ |
| 1888 / 1890 | david hilbert | **basis theorem**: a finite basis of invariants exists — proved 1888, published 1890; existence shown, no construction | *math. annalen* 36(4), 473–534, doi:10.1007/BF01208503 | 1890.hilbert | ☑️ |

### physics — invariance as conservation

| year | who | contribution | citation | ref | ✓ |
|---|---|---|---|---|---|
| 1918 | emmy noether | **noether's theorem**: to each infinitesimal symmetry transformation corresponds a conservation theorem | *nachr. ges. wiss. göttingen* 1918, 235–257; tr. tavel 1971, doi:10.1080/00411457108231446 | 1918.noether | ✅ |

### physics — why the start and the edges carry the claim

the reason an entry declares only its baseline and boundary cases. physics never lists the interior: a law, a start, and the edges fix it.

| year | who | contribution | citation | ref | ✓ |
|---|---|---|---|---|---|
| 1814 | pierre-simon laplace | **determinism**: the present is "the effect of its anterior" and the cause of the next; given the forces and one start, "nothing would be uncertain" | *essai philosophique sur les probabilités*; tr. truscott & emory, wiley, 1902 (no doi) | 1814.laplace | ✅ |
| 1902 | jacques hadamard | **well-posed problem**: a solution exists, is unique, and changes continuously with its initial or boundary values | *princeton university bulletin* 13, 49–52 (no doi) | 1902.hadamard | 🟡 |
| classical | potential theory | **uniqueness theorem**: sources plus boundary conditions fix the field inside | textbook (poisson, dirichlet) | nd.uniqueness-poisson | 🟡 |
| 1927 | eberhard hopf | **maximum principle**: solutions "achieve their maxima at the boundary" — bound the edge and the inside is bounded | *sitzungsber. preuss. akad. wiss.* 1927, 147–152; protter & weinberger 1984 | 1927.hopf | 🟡 |
| 1904 | ludwig prandtl | **boundary layer**: the flow splits into a thin layer at the surface, where viscosity acts, and an interior where it "can be neglected" | *verh. III. int. math.-kongr.*, 484–491; reprint doi:10.1007/978-3-662-11836-8_43 | 1904.prandtl | ☑️ |
| 1979 | glenford myers | **boundary-value analysis** (software's twin): one case per equivalence class; test both sides of each class edge, where faults cluster | *the art of software testing*, wiley; 3rd ed. doi:10.1002/9781119202486 | 1979.myers | ☑️ |

### software — invariance as a duty of the program

| year | who | contribution | citation | ref | ✓ |
|---|---|---|---|---|---|
| 1949 | alan turing | first program proof: assertions about values at points of a routine | "checking a large routine"; reprint doi:10.1016/B978-0-12-386980-7.50019-8; dated by morris & jones 1984, doi:10.1109/MAHC.1984.10017 | 1949.turing · 1984.morris-jones | ☑️ |
| 1966 | peter naur | **general snapshots**: "static conditions existing whenever the execution of the algorithm reaches particular points" — for proof and for construction | *bit* 6(4), 310–316, doi:10.1007/BF01966091 | 1966.naur | ✅ |
| 1967 | robert floyd | assertions attached to flowchart edges; naur credits his parallel work | *proc. symp. applied math.* 19, 19–32, doi:10.1090/psapm/019/0235771 | 1967.floyd | ☑️ |
| 1969 | c. a. r. hoare | **precondition / postcondition**: `{P} C {Q}`; the while rule names the **loop invariant**; runtime limits left to the implementation to detect | *cacm* 12(10), 576–580, doi:10.1145/363235.363259 | 1969.hoare | ☑️ |
| 1972 | edsger dijkstra | no loop "without stating the relation whose invariance will not be destroyed"; abstraction creates "a new semantic level in which one can be absolutely precise" | "the humble programmer", EWD 340, *cacm* 15(10) | 1972.dijkstra | ✅ |
| 1972 | c. a. r. hoare | correctness of an abstract type proved through its concrete representation | *acta informatica* 1(4), 271–281, doi:10.1007/BF00289507 | 1972.hoare | ✅ |
| 1972 | david parnas | decomposition by hidden decision — a boundary that can own one invariant | *cacm* 15(12), 1053–1058, doi:10.1145/361598.361623 | 1972.parnas | ☑️ |
| 1974 | liskov & zilles | **abstract data types**: data reachable only through the type's operations | *sigplan notices* 9(4), 50–59, doi:10.1145/942572.807045 | 1974.liskov-zilles | ☑️ |
| 1975 | edsger dijkstra | **"the invariant relation" and "the variant function"** by name; **weakest precondition**; the program derived from the invariant | *cacm* 18(8), 453–457, doi:10.1145/360933.360975 | 1975.dijkstra | ✅ |

### data — invariance kept by the storage

| year | who | contribution | citation | ref | ✓ |
|---|---|---|---|---|---|
| 1970 | e. f. codd | relational model — keys and constraints as data-level invariants | *cacm* 13(6), 377–387, doi:10.1145/362384.362685 | 1970.codd | ☑️ |
| 1983 | haerder & reuter | transactions move the storage from one consistent snapshot to the next (acid; acronym origin 🟡) | *acm computing surveys* 15(4), 287–317, doi:10.1145/289.291 | 1983.haerder-reuter | ☑️ |
| 2011 | shapiro et al. | **crdts**: replicas converge by construction | lncs, 386–400, doi:10.1007/978-3-642-24550-3_29 | 2011.shapiro | ☑️ |
| 2014 | bailis et al. | **invariant confluence**: "a necessary and sufficient condition for safe, coordination-free execution" | *pvldb* 8(3), 185–196, doi:10.14778/2735508.2735509 | 2014.bailis | ✅ |

### concurrency and composition — the assume → guarantee chain

| year | who | contribution | citation | ref | ✓ |
|---|---|---|---|---|---|
| 1977 | leslie lamport | invariants for concurrent programs; later, in his own words: "it's better to write a global invariant" | *ieee tse* SE-3(2), 125–143, doi:10.1109/TSE.1977.229904 | 1977.lamport | ✅ |
| 1981 | misra & chandy | **assume / guarantee**: each process specified "by a pair of assertions"; the network proved "by applying inference rules to the specifications of component processes" | *ieee tse* SE-7(4), 417–426, doi:10.1109/TSE.1981.230844 | 1981.misra-chandy | ✅ |
| 1981 / 1983 | cliff jones | **rely / guarantee** for programs that interfere (the terms 🟡 from recall) | tech. rep. PRG-25, oxford (1981); *toplas* 5(4), 596–619, doi:10.1145/69575.69577 (1983) | 1983.jones | ☑️ |
| 1985 | amir pnueli | the move from global to modular temporal proofs | lncs/nato asi f13, 123–144, doi:10.1007/978-3-642-82453-1_5 | 1985.pnueli | ☑️ |
| 1985 | alpern & schneider | "every property is ... the intersection of a safety property and a liveness property" — an invariant is a safety property | *ipl* 21(4), 181–185, doi:10.1016/0020-0190(85)90056-0 | 1985.alpern-schneider | ✅ |
| 1993 | abadi & lamport | "a component need behave correctly only when its environment does, and each component is part of the others' environments" — the proof rule that breaks the circle | *toplas* 15(1), 73–132, doi:10.1145/151646.151649 | 1993.abadi-lamport | ✅ |
| 1994 | leslie lamport | **tla**: system and invariants as one temporal formula | *toplas* 16(3), 872–923, doi:10.1145/177492.177726 | 1994.lamport | ☑️ |
| 1995 | abadi & lamport | "[a s]ystem is the conjunction of its components' specifications. Properties of the system are proved by reasoning about its components." | *toplas* 17(3), 507–535, doi:10.1145/203095.201069 | 1995.abadi-lamport | ✅ |
| 2018 | benveniste et al. | **contract-based design** as a meta-theory for software and whole systems | *fnt eda* 12(2–3), 124–400, doi:10.1561/1000000053 | 2018.benveniste | ✅ |

### contracts and invariant-driven design

| year | who | contribution | citation | ref | ✓ |
|---|---|---|---|---|---|
| 1986 / 1992 | bertrand meyer | **design by contract**: precondition, postcondition, **class invariant** — "only one per class"; a violation at runtime raises at once | TR-EI-12/CO (1986); *computer* 25(10), 40–51, doi:10.1109/2.161279 (1992) | 1992.meyer | ☑️ |
| 1994 | liskov & wing | **behavioral subtypes**: a subtype may strengthen invariants, never weaken them | *toplas* 16(6), 1811–1841, doi:10.1145/197320.197383 | 1994.liskov-wing | ☑️ |
| 1996 | j.-r. abrial | **b method**: an abstract machine declares its invariant; refinement carries it to code (paris métro line 14, ariane 5) | *the b-book*, cup, doi:10.1017/CBO9780511624162 | 1996.abrial | ☑️ |
| 2010 | j.-r. abrial | **event-b**: system-level refinement, each level proved consistent with the one above | *modeling in event-b*, cup, doi:10.1017/CBO9781139195881 | 2010.abrial | ☑️ |

### tools and types — enforcements in daily practice

| year | who | contribution | citation | ref | ✓ |
|---|---|---|---|---|---|
| 2000 | claessen & hughes | **quickcheck**: declare the invariant as a property; a generator hunts the counterexample | *icfp*, 268–279, doi:10.1145/351240.351266 | 2000.claessen-hughes | ☑️ |
| 2002 | daniel jackson | **alloy**: bounded search for the smallest instance that breaks an invariant | *tosem* 11(2), 256–290, doi:10.1145/505145.505149 | 2002.jackson | ☑️ |
| 2003 | eric evans | **aggregate**: the consistency boundary around one set of invariants | *domain-driven design*, addison-wesley (no doi) | 2003.evans | 🟡 |
| 2011 | yaron minsky | **"make illegal states unrepresentable"** (byline and year 🟡) | jane street tech blog, "effective ml revisited" | 2011.minsky | ☑️ |
| 2019 | alexis king | **parse, don't validate**: "push the burden of proof upward as far as possible, but no further" | blog, 2019-11-05 | 2019.king | ✅ |

## .the compositional chain, plainly

each component is a contract: **assume A, guarantee G**.

- misra & chandy (1981): a component is specified by a pair of assertions; the network is proved from the pairs by inference rules
- jones (1981/83): the same split for shared-variable programs — rely on the environment, guarantee back to it
- pnueli (1985): proofs move from the global system to its components
- abadi & lamport (1993): the rule is subtle — each component's guarantee is another's assumption, so the proof rule must break the circle; they give it for safety and liveness specs
- abadi & lamport (1995): the payoff — the system spec is the conjunction of its component specs
- benveniste et al. (2018): the same idea as a general contract theory for system design

the shape: where each component's guarantee discharges its neighbor's assumption, the system guarantees the conjunction, under only the assumptions no component discharges — the ones the outside world must keep. 🟡 the exact side conditions (which properties may close the circle) are in abadi & lamport 1993; read it before you rely on a circular case.

for us: an **assumption no component discharges** is an assumption about the world. we cannot make it hold, so we hold evidence for it and enforce it by **assertion** — a break surfaces at once and fails fast (hoare 1969 left limits to the implementation to detect; meyer's contracts raise at once).

## .invariant-driven design

the design order the chain implies: **declare the invariant, then write the operation that keeps it.**

- dijkstra (1975): "the formal machinery only gets in motion, once we have chosen our invariant relation" — the program is derived from the invariant
- meyer (1986): the class invariant is the contract every routine keeps
- abrial (1996, 2010): each operation is proved to keep the machine's invariant, at every refinement level
- bailis (2014): the stated invariant decides which operations need coordination at all

## .the neighbors, by role

| tool | relation to the invariant | introduced |
|---|---|---|
| precondition | what the caller must make true first | hoare 1969 |
| postcondition | what the step promises after | hoare 1969 |
| variant | the measure that falls each step, so the process ends | dijkstra 1975 (by name) |
| weakest precondition | derive the before from the after | dijkstra 1975 |
| class invariant | the invariant of an object at every stable point | meyer 1986 |
| safety / liveness | an invariant is a safety property; progress needs liveness | alpern & schneider 1985 |
| assume / rely | what a component takes from its environment — an **assumption** | misra & chandy 1981; jones 1981/83 |
| guarantee | what a component gives back — its invariants and postconditions | same |
| transaction | the storage keeps every invariant across each unit of change | haerder & reuter 1983 |
| aggregate | the boundary one set of invariants lives in | evans 2003 🟡 |
| property test · bounded search | proof by generated cases; proof by bounded search | claessen & hughes 2000; jackson 2002 |
| baseline · boundary case | the start and the class edges an entry declares; the interior is induced | laplace 1814; hadamard 1902 🟡; hopf 1927 🟡; myers 1979 |
| precise type | the invariant kept by construction | minsky 2011; king 2019 |
| invariant confluence | which invariants need coordination | bailis 2014 |

## .what it means for us

- **invariant + enforcement** — ours to enforce (`define.constraint.kind=invariant`)
- **assumption + evidence + assertion** — the rely half; the world keeps it, so we hold evidence and enforce it by assertion: fail fast on a break (`rule.require.assumptions-with-evidence`)
- **precondition** — an assumption made a contract term, owned by the caller; a parse at the boundary moves it into the enforced column

## .not cited

- goldstine & von neumann (1947) assertion boxes — unverified; no primary source captured (`ref.1947.goldstine-vonneumann`)
- lamport (1977) as the origin of the words "safety" and "liveness" — from recall; the capture does not show it

## .see also

- `define.constraint.kind=invariant` · `philosophy.abstraction-creates-precision` · `howto.itemize-constraints` · `rule.require.assumptions-with-evidence`
