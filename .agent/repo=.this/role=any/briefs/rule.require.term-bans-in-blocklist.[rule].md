# rule.require.term-bans-in-blocklist

## .what

whenever someone says a term should be banned, the ban lands in `src/domain.roles/mechanic/inits/claude.hooks/terms.blocklist.jsonc` — in the same change. a ban kept only in a brief, a review, or a chat is not a ban.

## .why

- **the hook is the enforcement** — a brief tells a clone the term is banned; the blocklist hook stops the write. a brief alone is a wish (`define.constraint.grain=enforcement`: a declaration with no enforcement)
- **it reaches every repo** — the hook ships with the mechanic role, so one record guards every clone that boots it
- **it is one place to look** — "is X banned?" is answered by one file, never by a hunt through briefs
- **why a word earns a ban at all** — `philosophy.why-we-ban-terms` (mechanic)

## .what one ban owes

`$slug` = the first form in the record's `label`, or its `term` when it has no label.

| # | artifact | where |
|---|---|---|
| 1 | a record: `term` (a word-boundary regex for every form), `label` (the forms, for humans), `why` (each sense it conflates), `alt` (one sharper word per sense, no inner comma) | `terms.blocklist.jsonc` |
| 2 | a rule: what, scope, why, a senses table (one sharper word per sense), exempt, enforcement, see also. it carries no examples | `src/domain.roles/mechanic/briefs/practices/lang.terms/rule.forbid.term=$slug.md` |
| 3 | one or more example files beside it: the 👎/👍 demo, and any real case. the rule cites each in its `.see also`; none boot | `rule.forbid.term=$slug.example=$case.md`, same dir |
| 4 | a test case that pins the blocked forms and the near-words that must pass, plus a snapshot of the render | `pretooluse.forbid-terms.blocklist.integration.test.ts` |
| 5 | a `ref` boot entry for the rule, and boot.lessons plan rows: `ref` for the rule, `absent` for each example file (the boot.yml `not:` glob keeps them out) | `src/domain.roles/mechanic/boot.yml`, `boot.lessons.integration.test.ts` |
| 6 | the forkbudget measured; raise its cap only by the measured cost | `pretooluse.forbid-terms.forkbudget.integration.test.ts` |

one record per term family: one regex covers the noun, the plural, and the verb, since each record costs one grep on a tripped write.

## .the test of the regex

every blocked form blocks; every near-word lands. pin both in the test case. e.g. `stores?` blocks `store` and `stores`, and passes `storage`, `stored`, `restore`.

spell each form whole where an optional piece would sit mid-word: `dryrun|dry-run`, never `dry-?run`. the term's own text must still match the joined gate, and `dry-?run` does not match itself.

## .enforcement

- a term declared banned with no blocklist record = **blocker**
- a blocklist record with no `rule.forbid.term=$slug` rule, or no test case = **blocker**
- a term rule with no example file = **blocker**
- the rule and example-file checks are clamped: a test in `pretooluse.forbid-terms.blocklist.integration.test.ts` reads the live blocklist and fails on any record whose rule or example file is absent

## .see also

- `philosophy.why-we-ban-terms` (mechanic) — why a heavy word gets banned
- `rule.forbid.term=dryrun` · `=existing` · `=helpers` · `=map` · `=model` · `=normalize` · `=resolve` · `=state` · `=store` · `=property` · `=hold` · `=row` · `=fold` · `=nothing` · `=staging` · `=script` (mechanic) — the full set, each in this shape
- `howto.block-writes-via-hooks.[lesson].md` — how the hook works
