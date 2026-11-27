# research.abstraction-tactics

fetch date: 2026-10-24. legend: ✅ = text fetched in this session and the quote appears in it · 🟡 = UNVERIFIED (quote or claim reached only via a search snippet or a paraphrase page, or fetch failed).

note on provenance: several primary texts (parnas pdf, ousterhout book, evans book, sicp pdf) could not be fetched in full. where a secondary page quotes the primary, the row says so. a ✅ on a secondary page proves the quote sits on that page, not that this agent read the primary.

## .what abstraction is

six converged definitions. all say: expose a smaller, truer surface; keep the rest out of the caller's head.

1. **access without detail** — "In software, an abstraction provides access while hiding details that otherwise might make access more challenging." ✅ [wikipedia: abstraction (computer science)]
2. **a name for a combination** — sicp lists three mechanisms of a powerful language: primitive expressions, "means of combination", and "means of abstraction" ("by which compound elements can be named and manipulated as units"). a user of the named unit "should not need to know how the procedure is implemented in order to use it." ✅ [sicp 1.1, 1.1.8, via mit text]
3. **a barrier between use and representation** — "Constraining the dependence on the representation to a few interface procedures helps us design programs as well as modify them, because it allows us to maintain the flexibility to consider alternate implementations." ✅ [sicp 2.1.2]
4. **a new semantic level, for precision** — "the purpose of abstracting is _not_ to be vague, but to create a new semantic level in which one can be absolutely precise." ✅ [dijkstra, EWD340]
5. **behavior defined by contract, not by shape** — an abstract data type is "a mathematical model for data types, defined by its behavior (semantics) from the point of view of a user of the data". ✅ [wikipedia: abstract data type, citing liskov & zilles 1974]
6. **a decision hidden from all others** — "Every module in the second decomposition is characterized by its knowledge of a design decision which it 'hides from all others.'" ✅ (via acolyer quote of parnas 1972)

synthesis: an abstraction = a named, precise, smaller surface over a hidden decision; the caller reasons at the new level and need not look below. the quality of an abstraction = how much cognitive load the surface removes versus how often the caller must look below anyway.

## .the tactics

columns: id · tactic · what it buys · smell when absent · sources · quote.

| id | tactic | what it buys | smell when absent | sources | quote |
|----|--------|--------------|-------------------|---------|-------|
| A01 | name each concept in the domain's own words, one word per concept; name the effect and purpose, never the mechanism | a reader and a domain expert grasp it with no gloss; names resist drift | vague names; synonym sprawl; a reader opens the body to learn what a call does | evans ubiquitous language ✅ (fowler); evans intention-revealing interfaces 🟡 (paraphrase via search + vdoc summary); beck "reveals intention" ✅ (fowler); ousterhout red flags "vague name", "hard to pick name" ✅ (dev.to red-flag page) | "Ubiquitous Language is the term Eric Evans uses in Domain Driven Design for the practice of building up a common, rigorous language between developers and users." (fowler) |
| A02 | hide the design decision most likely to change behind one module; list the volatile decisions first | a change touches one module; callers survive it | one decision (format, store, vendor) known by many files; shotgun edits | parnas 1972 ✅ (via acolyer quotes); sicp 2.1.2 ✅ | "There are a number of design decisions which are questionable and 'likely to change' under many circumstances." (parnas, via acolyer) |
| A03 | make the module deep: a small interface over a large capability | callers carry little; the complexity is paid once | many tiny classes, each with a surface near the size of its body ("classitis"); every caller learns every piece | ousterhout ✅ (via csruiliu notes + aiocean notes quote; and ousterhout's own words in the aposd-vs-clean-code repo) | "The best methods are those that provide a lot of functionality but have a very simple interface: they replace a large cognitive load with a much smaller cognitive load." (ousterhout) |
| A04 | pull complexity downward: absorb it in the implementation; do not export it as options, flags, or config | one author pays, many callers gain | knobs the caller cannot set well; "configuration parameters" that push choice upward | ousterhout ✅ p. 55 (the tail, in the book; see `refs/ref.2018.ousterhout.md`) | "It is more important for a module to have a simple interface than a simple implementation." (ousterhout, via binaryphile) |
| A05 | define errors out of existence: shape the operation so the common failure case is a valid, defined result | fewer exceptions for callers to meet; idempotent verbs fall out | each caller wraps a try/catch for a case that the operation could define away | ousterhout ✅ p. 79 for the phrase "define errors out of existence"; the sentence in the last column is not in the book (`refs/ref.2018.ousterhout.md`). one reviewer on danlebrero notes disputes the move: may hide errors that should not be hidden | "The best way to handle exceptions is to define APIs so they don't have exceptions." (ousterhout, via binaryphile — not verified against the book) |
| A06 | erect an abstraction barrier: callers touch constructors, selectors, and operations only; never the representation | the representation can swap with no caller edit | callers reach into fields; a representation change ripples | sicp 2.1 ✅; liskov & zilles 1974 ADT ✅ (wikipedia) | "The general technique of isolating the parts of a program that deal with how data objects are represented from the parts of a program that deal with how data objects are used" is "data abstraction". (sicp 2.1) |
| A07 | give each layer a distinct abstraction; delete the layer that only forwards | each level adds a new vocabulary; stack depth buys meaning | pass-through methods; adjacent layers with the same signature | ousterhout "pass-through method" ✅ (dev.to red flags); sicp "levels" barriers ✅; wikipedia "levels of abstraction" ✅ | "A pass-through method is one that does nothing except pass its arguments to another method, usually with the same API." (ousterhout, via dev.to) |
| A08 | keep one level of abstraction per unit; order code top-down so a reader descends one level at a time | an orchestrator reads as a narrative; details sit one hop away | a function mixes a business step and a byte-level detail | clean code stepdown rule 🟡 (search snippet only; dzone fetch 403) | "We want the code to read like a top-down narrative." (martin, clean code, via search snippet — UNVERIFIED) |
| A09 | specify the contract by behavior: what holds before, what holds after, what stays true; make every variant honor it | a variant can replace another with no surprise | a subtype that throws on a call its parent accepts; callers branch on type | liskov substitution ✅ (wikipedia); evans assertions 🟡 | "Let φ(x) be a property provable about objects x of type T. Then φ(y) should be true for objects y of type S where S is a subtype of T." (liskov & wing, via wikipedia) |
| A10 | complect no concern: give each construct one role; compose parts, do not braid them | each piece reasons alone; change stays local | one change needs a read of three concerns that never needed to meet | hickey ✅ (infoq page) | "'Complect' means to interleave, to entwine, to braid. Complect results in bad software." (hickey) |
| A11 | choose the type so an illegal state cannot be built | whole classes of check vanish; the compiler holds the invariant | a record of optional fields plus a status enum, with combinations that must never occur | minsky ✅ (jane street: the phrase as a bullet; a worked example confirmed on "effective ml revisited") | "Make illegal states unrepresentable" (minsky, effective ml bullet list) |
| A12 | parse at the boundary into the most precise representation, and carry that proof in the type; do not validate and discard | the check runs once; later code needs no recheck | the same null or shape check repeated deep in the call stack ("shotgun parsing") | king ✅ | "Get your data into the most precise representation you need as quickly as you can." (king) |
| A13 | model a measured fact as a value: immutable, equal by value, with operations that return values and cause no side effect | safe to share and recompose; no alias bug | a mutable bag that two callers edit; equality by id for a pure value | evans/fowler value object ✅; evans side-effect-free functions and closure of operations 🟡 (paraphrase only) | "To avoid aliasing bugs I follow a simple but important rule: value objects should be immutable." (fowler) |
| A14 | wrap a cluster that must change together in one aggregate with one root; allow outside refs to the root only | one place enforces the invariant; one transaction boundary | many writers to inner parts; an invariant that spans objects and has no owner | evans/fowler aggregate ✅ | "Any references from outside the aggregate should only go to the aggregate root." (fowler) |
| A15 | draw a bounded context around one model; translate at the edge; do not unify the whole | a word keeps one sense per context | one `Customer` with fields for five teams; every change is a negotiation | evans/fowler bounded context ✅ | "Total unification of the domain model for a large system will not be feasible or cost-effective" (evans, via fowler) |
| A16 | decompose by knowledge held, not by the step order in which work runs | a module owns a decision; order changes do not split it | modules named parse / transform / write that all know the same format | parnas ✅ (acolyer); ousterhout "temporal decomposition" and "information leakage" ✅ (dev.to) | "It is almost always incorrect to begin the decomposition of a system into modules on the basis of a flowchart." (parnas, via acolyer) |
| A17 | let the shape show before you abstract: duplicate until a third case proves the axis of variation | the abstraction fits the cases that are real | a helper full of flags that serves two callers by luck | metz ✅; rule of three ✅ (wikipedia: fowler, don roberts); yagni ✅ (fowler); AHA ✅ (wikipedia DRY) | "Two instances of similar code do not require refactoring, but when similar code is used three times, it should be extracted into a new procedure." (wikipedia: rule of three) |
| A18 | collapse duplicate knowledge, not duplicate text | one authority per fact; text that only looks alike stays apart | a fact (rate, rule, format) stated in two places that drift | hunt & thomas DRY ✅ (wikipedia); ousterhout "repetition" red flag ✅ | "Every piece of knowledge must have a single, unambiguous, authoritative representation within a system." (hunt & thomas, via wikipedia) |
| A19 | make the interface somewhat general-purpose and the implementation fit today's need | a deeper module; fewer special cases; room to grow without a rewrite | an interface shaped like the first caller; a general mechanism with special-case code mixed in | ousterhout 🟡 (paraphrase on binaryphile and danlebrero; "special-general mixture" red flag quoted ✅ on dev.to) | "when a general-purpose mechanism also contains code specialized for a particular use of that mechanism." (ousterhout, red flag "special-general mixture", via dev.to) |
| A20 | when an abstraction no longer fits, inline it into every caller, cut each copy to what it uses, then re-derive | escape the sunk cost; the next abstraction fits the facts | a shared function with a parameter list that grew one flag per caller | metz ✅ | "When dealing with the wrong abstraction, the fastest way forward is back." (metz, as relayed by the page fetch) |
| A21 | expect the leak: know the layer below, expose an escape hatch, and never force callers to rebuild a low primitive from a high one | callers survive the day the layer fails | users re-implement a lower primitive on top of a higher one; no way past the surface | spolsky ✅; abstraction inversion ✅ (wikipedia) | "All non-trivial abstractions, to some degree, are leaky." (spolsky) |
| A22 | treat every observable behavior as part of the contract; narrow what is observable | the team knows what it may change | an unlisted order, timing, or field that a caller now relies on | hyrum's law ✅ | "With a sufficient number of users of an API, it does not matter what you promise in the contract: all observable behaviors of your system will be depended on by somebody." (hyrum wright) |
| A23 | align module boundary with the team and communication boundary, or choose the boundary and then move the team | a seam that the org can keep | an interface between two modules owned by one head, or one module owned by four teams | conway ✅ (wikipedia) | "[O]rganizations which design systems (in the broad sense used here) are constrained to produce designs which are copies of the communication structures of these organizations." (conway 1968) |

## .the failure modes

| mode | what it is | cited |
|------|------------|-------|
| leaky | the surface fails to hide; the caller must learn below it | spolsky: "Abstractions fail. Sometimes a little, sometimes a lot. There's leakage. Things go wrong." ✅ |
| paradox of savings | an abstraction saves work, not learn time | spolsky: "The abstractions save us time working, but they don't save us time learning." ✅ |
| wrong abstraction | built early; later cases bend it with flags until it is unreadable; sunk cost keeps it | metz: "Duplication is far cheaper than the wrong abstraction" ✅ ; "the more complicated and incomprehensible the code, the more we feel pressure to retain it" ✅ |
| presumptive build | a general shape for a need that has not arrived; cost of build, delay, carry, repair | fowler yagni ✅ (four cost categories: build, delay, carry, repair) |
| shallow module | a surface about as large as its body; it removes no load | ousterhout: "A shallow module is one whose interface is complicated relative to the functionality it provides." ✅ (via dev.to) |
| teeny methods | decomposition past the point of benefit | ousterhout: "As methods get smaller and smaller there is less and less benefit to further subdivision." ✅ (aposd-vs-clean-code) |
| information leakage | one decision known by many modules | ousterhout: "Information leakage is one of the most important red flags in software design." ✅ (via csruiliu notes) |
| temporal decomposition | modules cut along run order, so each holds a piece of the same knowledge | ousterhout red flag ✅ (dev.to); parnas flowchart quote ✅ |
| pass-through layer | a layer with the same abstraction as the next | ousterhout ✅ (dev.to) |
| abstraction inversion | the user must rebuild a hidden primitive from the exposed construct | "An anti-pattern arising when users of a construct need functions implemented within it but not exposed by its interface." ✅ (wikipedia) |
| complected | concerns braided so one cannot be reasoned about alone | hickey ✅ |
| validate-and-forget | the check succeeds, the proof is dropped, and the check repeats later | king: "the difference between validation and parsing lies almost entirely in how information is preserved" ✅ |
| unsound variant | a subtype breaks the parent's contract | liskov substitution ✅ (wikipedia) |
| false unification | one model forced across contexts | evans via fowler ✅ |
| implicit contract | callers depend on an accident of behavior | hyrum ✅ |
| vague name | a name broad enough to refer to many things | ousterhout: "If a variable or method name is broad enough to refer to many different things, then it doesn't convey much information." ✅ (dev.to) |

## .the tensions

| tension | pole one | pole two | read |
|---------|----------|----------|------|
| duplication vs the wrong abstraction | DRY: "Every piece of knowledge must have a single, unambiguous, authoritative representation within a system." ✅ (hunt & thomas via wikipedia) | metz: "Duplication is far cheaper than the wrong abstraction" ✅ | not a true conflict. DRY speaks of knowledge; metz speaks of code that looks alike. AHA ("avoid hasty abstractions", wikipedia ✅) and the rule of three sit between. |
| small functions vs deep modules | martin: "The first rule of functions is that they should be small. The second rule of functions is that they should be smaller than that." ✅ (aposd-vs-clean-code) | ousterhout: "The advice in Clean Code on method length is so extreme that it encourages programmers to create teeny-tiny methods that suffer from both shallow interfaces and entanglement." ✅ | live disagreement, printed side by side in the repo. depth (A03) vs one level per unit (A08). |
| tdd and comments | martin: "Comments are always failures." ✅ | ousterhout: "Comments are crucially important and add enormous value to software." ✅ | out of scope for abstraction, but it shows the same split: what must the surface say that code cannot? |
| general vs yagni | ousterhout: build a somewhat general-purpose interface (A19) 🟡 | fowler yagni: presumptive features carry build, delay, carry, and repair cost ✅ | the middle: general interface, specific body; do not add features. |
| hide vs know below | sicp: a user "should not need to know how the procedure is implemented" ✅ | spolsky: "they don't save us time learning" ✅ | the barrier holds for correct use; the leak forces a look below on failure. design the escape hatch (A21). |
| define away vs fail loud | ousterhout: define errors out of existence (A05) 🟡 | king and minsky: reject bad input at the boundary and make bad state impossible (A11, A12) ✅ | reconcile: define away the benign case (delete of an absent item); reject the invalid case at the boundary. a danlebrero reviewer warns the first can hide errors ✅ (paraphrase page). |
| rule of three vs no duplication | beck rule 3 "No duplication" (rules in priority order) ✅ (fowler) | rule of three: two copies are tolerated ✅ | beck ranks "reveals intention" above "no duplication"; a bad merge loses intention. |
| conway vs bounded context | conway: structure copies org communication ✅ | evans: choose the context from the model ✅ | the inverse conway maneuver is an inference of this agent, not a fetched claim. 🟡 |

## .sources

| # | source | url | fetched 2026-10-24 | status |
|---|--------|-----|--------------------|--------|
| 1 | spolsky, the law of leaky abstractions (2002) | https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/ | yes | ✅ |
| 2 | metz, the wrong abstraction (2016) | https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction | yes | ✅ |
| 3 | hickey, simple made easy (2011), infoq page | https://www.infoq.com/presentations/Simple-Made-Easy/ | yes | ✅ |
| 4 | king, parse don't validate (2019) | https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/ | yes | ✅ |
| 5 | parnas 1972, via acolyer summary with quotes | https://blog.acolyer.org/2016/09/05/on-the-criteria-to-be-used-in-decomposing-systems-into-modules/ | yes | ✅ (secondary; acm pdf returned 403; mit mirror refused connect) |
| 6 | sicp 1.1 (mechanisms), mit text | https://mitp-content-server.mit.edu/books/content/sectbyfn/books_pres_0/6515/sicp.zip/full-text/book/book-Z-H-10.html | yes | ✅ |
| 7 | sicp 2.1 data abstraction, mit text | https://mitp-content-server.mit.edu/books/content/sectbyfn/books_pres_0/6515/sicp.zip/full-text/book/book-Z-H-13.html | yes | ✅ |
| 8 | sicp 2.1.2 abstraction barriers | https://mitp-content-server.mit.edu/books/content/sectbyfn/books_pres_0/6515/sicp.zip/full-text/book/book-Z-H-14.html | yes | ✅ |
| 9 | dijkstra EWD340 | https://www.cs.utexas.edu/~EWD/transcriptions/EWD03xx/EWD340.html | yes | ✅ |
| 10 | hyrum's law | https://www.hyrumslaw.com/ | yes | ✅ |
| 11 | ousterhout vs martin conversation | https://github.com/johnousterhout/aposd-vs-clean-code/blob/main/README.md | yes | ✅ (ousterhout's own words) |
| 12 | ousterhout red flags, dev.to summary | https://dev.to/sportebois/software-design-red-flags-wisdom-nuggets-from-john-ousterhout-43i2 | yes | ✅ (secondary quotes of the book) |
| 13 | ousterhout deep module quote, aiocean notes | https://github.com/aiocean/claude-plugins/blob/main/plugins/aio-advisor/volume-01-foundations/07-deep-vs-shallow-modules.md | yes | ✅ (secondary) |
| 14 | ousterhout info leakage quote, csruiliu notes | https://csruiliu.github.io/blog/20201218-a-philosophy-of-software-design-II/ | yes | ✅ (secondary) |
| 15 | ousterhout quotes, binaryphile guide | https://www.binaryphile.com/2026/01/09/ousterhout-software-design-guide.html | yes | 🟡 (secondary, claims exact; not checked vs book) |
| 16 | ousterhout, danlebrero notes | https://danlebrero.com/2021/02/24/philosophy-of-software-design-summary/ | yes | 🟡 (paraphrase only; used for the dispute on A05) |
| 17 | ousterhout, a philosophy of software design (book), pdf copies (milkov.tech, pdfcoffee, dandelon) | https://milkov.tech/assets/psd.pdf | pdf unreadable by the fetch tool; pdfcoffee 403 | 🟡 UNVERIFIED primary |
| 18 | fowler, ubiquitous language | https://martinfowler.com/bliki/UbiquitousLanguage.html | yes | ✅ |
| 19 | fowler, bounded context | https://martinfowler.com/bliki/BoundedContext.html | yes | ✅ |
| 20 | fowler, ddd aggregate | https://martinfowler.com/bliki/DDD_Aggregate.html | yes | ✅ |
| 21 | fowler, value object | https://martinfowler.com/bliki/ValueObject.html | yes | ✅ |
| 22 | evans, ddd (book): intention-revealing interfaces, side-effect-free functions, closure of operations | https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf | pdf unreadable by the fetch tool; summaries only via web search and vdoc.pub | 🟡 UNVERIFIED (paraphrase) |
| 23 | beck, four rules of simple design, via fowler | https://martinfowler.com/bliki/BeckDesignRules.html | yes | ✅ |
| 24 | fowler, yagni | https://martinfowler.com/bliki/Yagni.html | yes | ✅ |
| 25 | rule of three | https://en.wikipedia.org/wiki/Rule_of_three_(computer_programming) | yes | ✅ (fowler's refactoring book itself not fetched) |
| 26 | dry, aha | https://en.wikipedia.org/wiki/Don%27t_repeat_yourself | yes | ✅ |
| 27 | liskov substitution principle | https://en.wikipedia.org/wiki/Liskov_substitution_principle | yes | ✅ (liskov & wing 1994 via wikipedia) |
| 28 | abstract data type (liskov & zilles 1974) | https://en.wikipedia.org/wiki/Abstract_data_type | yes | ✅ (wikipedia; the 1974 paper not fetched) |
| 29 | minsky, effective ml (2010) | https://blog.janestreet.com/effective-ml/ | yes | ✅ (phrase only; no verbatim lecture transcript found) |
| 30 | abstraction inversion | https://en.wikipedia.org/wiki/Abstraction_inversion | yes | ✅ |
| 31 | conway's law | https://en.wikipedia.org/wiki/Conway%27s_law | yes | ✅ (via wikipedia) |
| 32 | abstraction (computer science) | https://en.wikipedia.org/wiki/Abstraction_(computer_science) | yes | ✅ |
| 33 | martin, clean code stepdown rule | https://dzone.com/articles/the-stepdown-rule | 403 | 🟡 UNVERIFIED (search snippet only) |
| 34 | kramer, is abstraction the key to computing (cacm 2007) | https://cacm.acm.org/research/is-abstraction-the-key-to-computing/ | 403 | 🟡 UNVERIFIED, unused |
| 35 | parnas 1972 acm pdf | https://dl.acm.org/doi/pdf/10.1145/361598.361623 | 403 | 🟡 UNVERIFIED primary |
