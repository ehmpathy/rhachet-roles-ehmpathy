# rule.forbid.broken-role-composition-order

## .what

role packages compose in one direction. a consumer may know its suppliers; a supplier may never
know its consumers.

```
rhachet-roles-bhrain      ─┐
                           ├─▶ rhachet-roles-bhuild ─▶ (its consumers, e.g. a director)
rhachet-roles-ehmpathy    ─┘
```

bhuild consumes ehmpathy and bhrain. so ehmpathy can not know about bhuild, nor about any role
that composes on top of it.

in this repo, no brief, skill, init, or test may name a role, skill, file, path, or term that a
consumer owns. examples of a breach:

- a skill that prints a consumer's verb (e.g. a director's `git.crew.grant`)
- a skill that reads a file a consumer writes (e.g. a director's charter in the tree)
- a brief that tells a mechanic about a role it can not see from here

## .why

- a supplier that names its consumer couples itself to a repo it does not depend on. a rename
  there goes stale here, and no test here can catch it
- the cycle breaks the order every other role relies on: a consumer upgrades the supplier, never
  the other way round
- the supplier is no longer reusable: each new consumer would need its own branch in the supplier

## .the cure

reach for a term this repo already owns, general enough to cover every consumer:

| 👎 names the consumer | 👍 names what this repo owns |
|---|---|
| "ask your director; it runs `rhx git.crew.grant …`" | "ask your sponsor to grant more: `git.commit.uses set …`" |
| detect a director charter in the tree | no detection: one generic voice for every tree |

the consumer then maps the general term onto itself (a director that sponsors a clone grants via
its own verbs). the supplier stays blind to who that is.

## .the test

> does this change name aught that lives only in a repo which depends on this one?

yes → forbidden. generalize to a term this repo owns, or move the change into the consumer.

## .enforcement

- a brief, skill, init, or test in this repo that names a consumer's role, skill, file, or term = **blocker**
- a consumer-specific branch in a skill (detect consumer X, print consumer X's fix) = **blocker**

## .see also

- `rule.forbid.term.addition.synonym` (architect) — reuse the extant term (`sponsor`) before a new one
- `.agent/repo=.this/role=any/briefs/repo.structure.md` — this repo is the source for `repo=ehmpathy`
