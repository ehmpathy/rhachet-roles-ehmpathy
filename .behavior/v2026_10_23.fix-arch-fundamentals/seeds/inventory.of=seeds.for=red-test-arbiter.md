# seeds: the arbiter of a red test

the wisher's words, chat. verbatim.

seeds: the arbiter section of `philosophy.invariants-are-the-source` (I27) · `rule.forbid.test-edit-without-named-proof` (mechanic, I28).

## .the arbiter between code and test

> also, its finaly a layer that enables us to dismabiguate between 'is the code broken? or is the test wrong?' and what happens when its ambiguous what to do

## .implementation contracts sit below the invariants — the correction

the ai proposed: a test that asserts beyond what the invariant states is a wrong test. the wisher:

> thats not nessessarily true. theres plenty of required code which does not get specified by invariants, is simply consequence of a specific implementation that solves the invariants

## .not every test needs an invariant — the correction

the ai named the rule `rule.forbid.test-edit-without-invariant`. the wisher:

> doesnt this counter what we said about not all tests need invariatns? some are just glue that enable us to fulfill invariants? rule.forbid.test-edit-without-invariant

## .silence is a cue to derive, not to escalate — the correction

the ai proposed: where the invariant is silent on the point, neither code nor test may change; it is a gap, so ask a human, record the new invariant, then fix. the wisher:

> no, ont ask the human . skepticize whats omitted. was there an implicit invariant? and implicit assumption? is there a clear induced or deduced invariant baseed on the extant invariants and guarantees and assumptions we have already inventoried? is there a clear answer via skeptical analysis? this should all be slef sufficient. escalation to human should be a special scenario treated as a defect which we later reflect on to figure out why we couldnt sufficiently figure it out/
