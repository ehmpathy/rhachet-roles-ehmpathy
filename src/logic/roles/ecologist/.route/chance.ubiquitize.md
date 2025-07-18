🧼 canonical verb: <clarify>
reduce ambiguity, sharpen definition, or make intent more precise

🟢 direct synonyms (can collapse cleanly)
synonym	nuance
define	formal boundary or meaning
disambiguate	separate overlapping meanings
explain	make the reasoning explicit
refine	improve by precision or detail
articulate	express clearly
specify	pin down exact parameters
distinguish	clarify boundary vs others

✅ recommend collapsing all of these under <clarify>

🟡 partial overlaps (could collapse, but have edge cases)
synonym	note
diagnose	clarify cause — useful for failure mode exploration (use under <clarify> in reasoning)
unpack	casual version of explain + clarify
resolve	can mean disambiguate or settle conflict
interpret	clarify meaning from ambiguous input

⚠️ collapse if intent is reasoning or sensemaking
❗ don’t use as verbs unless deeply scoped (e.g. resolveConflict) — too broad

🔴 do not collapse — these are distinct verbs
verb	reason
explore	too open-ended → belongs to <envision>
analyze	suggests breakdown, not necessarily clarity
investigate	implies uncertainty or unknown, closer to <question>
reveal	about uncovering, not sharpening
understand	internal state, not explicit clarification

✅ collapsed set for <clarify>:
makefile
Copy code
<clarify> = clarify | define | explain | disambiguate | articulate | refine | specify | distinguish
want a similar collapse map for <envision> next?
