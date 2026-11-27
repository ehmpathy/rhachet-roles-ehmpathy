# seeds: transaction catalog — the axes, the tiers, the ban on sagas

the wisher's words, chat. verbatim.

seeds: `catalog.of=pattern.transaction._` · `rule.forbid.sagas` · `define.term-pair.root-leaf` · `pattern=async-task` · `pattern=supplied-exid` · fulcrum F31.

## .the tiers

> seems like the tiers should be core vs leaf. maybe even root vs leaf. lets also enbrief the term pair prefered is root and leaf; also, these seem like htey need some nountree and axial decomposition; just like we did with abstraction

> fwhat was the dimensional decomposition applied to the transactions catalog? i'm waiting on you to do that

## .the axes were broken

> this is unclear to me. ⛔ means forbidden; also, value vs reference? and wtf is a partial break? those 'break' attributes seem broken

## .the taught-elsewhere patterns join the walk

> include them into the catalog formally too, undrs the same dimensional decomposition

## .names

> supplied-exid,, not caller-supplied-id.

> what is this? dao-over-active-record; what is an active record?

> one-write-path reads as a term smell

> not fundamental enough

## .the axes, recut

> so why not call it isolation, atomicity, idempotency, consistency?

> isnt check-constraint and version-check · row-lock , arent each of these storage based tactic ?

> and cant these be blended into consistency?

> endpoint -> contract ?

> bound x aspect ? trait? property is ambiguos. in fact, lts ban the temr property. attribute, trait, etc - theres always a clearer one

> residence

> etc

## .the forbid members

> yeah, and for the forbid ones, we explain why those are anti-patterns and arch smells, right?

## .sagas are an antipattern

> sagas are an antipattern. do yo udisagree?

> sagas mean theres too much couplaage. and we're not speaking in atomic facts. saga is a violation of good event driven domain decomposition

> right.

> yeah, sagas are bullshit because they abandon idempotency.

> but also, they abandon concern boundaries

## .async tasks are the orchestrator

> also, how do async tasks fit into these transaction considerations? async tasks seem to give us a lot of transactional guarantees. and are one of the reasons that sagas are an antipattern

> if an async task needs some dependency tasks, it can wait on them to make the final decision

> it can get retriggered. it's still the orchestrator

> it just shouldnt make irreveersable decisions until all lights are green

## .consistency at rest

> not this bullshit intermitent inconsistent persisted states. we always require consistency at rest
