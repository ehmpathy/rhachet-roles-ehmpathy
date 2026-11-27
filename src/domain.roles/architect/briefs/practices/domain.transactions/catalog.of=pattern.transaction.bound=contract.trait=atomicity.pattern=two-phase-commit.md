# catalog.of=pattern.transaction.bound=contract.trait=atomicity.pattern=two-phase-commit

a member of `catalog.of=pattern.transaction._` · bound `contract` · trait `atomicity` · verdict **`forbid`**.

## .what it is

a coordinator asks every participant to prepare — hold its change, locked, ready to commit — then tells all to commit, or all to abort. it fakes one transaction across many storages.

## .why it is an antipattern

- **availability** — every participant holds its locks until the coordinator speaks. one slow or dead participant, or a dead coordinator, stalls them all
- **concern boundaries** — each service hands control of its own commit to an outsider
- **third parties** — the third parties we call (stripe, a queue, an email api) offer no prepare phase. the pattern cannot span the contracts we actually cross
- **consistency at rest, deferred** — a participant that prepared, then lost the coordinator, holds a change it can neither commit nor drop

## .the smell

- an `xa` or distributed-transaction manager in the dependency list
- a `prepare*` / `commit*` pair exposed over an api
- a transaction context passed across a service call

## .what the smell reveals

an invariant drawn across a contract, the same root as `pattern=saga`. the domain asks two storages to agree in one instant, which means one rule was split between them.

## .the cure

redraw the bound so the rule lives in one storage; carry the rest across the contract as an async task and its facts (`pattern=async-task`, `pattern=transactional-outbox`, `pattern=idempotent-consumer`). see `pattern=saga` for the full cure.

`rule.forbid.two-phase-commits` holds the ban; `rule.forbid.sagas` boots the shared cure.

## .source

converge — the canon agrees, the saga's own proponent among it:

> "To participate in an ACID transaction requires a willingness to hold database locks until the transaction coordinator decides to commit or abort the transaction. For the non-coordinator, this is a serious ceding of independence" … "can be devastating for the availability of a system." — helland 2005, "data on the outside versus data on the inside", cidr 2005 ✅

> "Real world almost-infinite scale applications would love the luxury of a global scope of serializability as is promised by two phase commit and other related algorithms. Unfortunately, the fragility of these leads to unacceptable pressure on availability." — helland 2007, "life beyond distributed transactions: an apostate's opinion", cidr 2007 ✅

> "Guarantees of transactional atomicity come only within an entity identified by a unique key." — helland 2016, the acm queue reprint, 14(5), doi:10.1145/3012426.3025012 ✅

> "Distributed transactions (especially using the Two Phase Commit protocol [3]) result in fragile systems and reduced availability. For this reason, they are rarely used in production systems" — helland & campbell 2009, "building on quicksand", arXiv:0909.1788 ✅

> "Problem How to implement transactions that span services? Forces 2PC is not an option" — richardson, microservices.io, "pattern: saga" ✅

the real world does not block on a prepare round either: hohpe 2004, "starbucks does not use two-phase commit" ✅

origin: gray 1978, "notes on data base operating systems", in *operating systems: an advanced course*, lncs 60, 393–481, doi:10.1007/3-540-08755-9_9 (cited by title; the text sits behind springer) ☑️
