# howto.itemize-constraints

## .what

keep a repo's invariants, assumptions, and guarantees as briefs: one file per entry, grouped by subdomain. every role reads the same list, and every test can cite an entry by id.

## .the three peers

| peer | declares | who keeps it true |
|---|---|---|
| **invariant** | what holds in every scenario a reader can observe — internal consistency at rest | us |
| **assumption** | what our correctness rests on, and our evidence for it | the world |
| **guarantee** | what we promise at a release boundary, for consumers to build on | us, to them: a break needs a major version |

the sort test, per fact:

- holds in every scenario a reader can observe → invariant
- kept by a party outside our control → assumption
- promised to a consumer across a release boundary → guarantee

**a release boundary** is a contract whose two sides release apart: a package export, a public endpoint, a cli, an emitted event. contracts inside one release are mutable — both sides change in one commit — so they carry no guarantee and get no entry.

**a guarantee is what a consumer cites as an assumption.** our `g001` is their `a00n`, its evidence tier `an upstream guarantee`. invariant chains compose across repos through this link alone.

## .every entry is declarative

an entry declares **what** holds, is relied on, or is promised. never **how** it is enforced: that is the code's job, and the code changes.

- stable over time: a rewrite of the code leaves every entry unchanged
- independent of the implementation: no table, column, dao, operation, or test name
- the test: would this sentence change if we swapped the implementation? yes → it names a mechanism. cut it; the mechanism belongs in the code

## .the layout

```
.agent/repo=.this/role=any/briefs/domain/
└── subdomain=reservations/
    ├── inventory.of=invariant._.md
    ├── inventory.of=invariant.case=i001-reserved-boards-within-stock.md
    ├── inventory.of=invariant.case=i001-reserved-boards-within-stock.example=double-click-at-slot-open.md
    ├── inventory.of=invariant.case=i001-reserved-boards-within-stock.enforcement=slot-optimistic-lock.md
    ├── inventory.of=invariant.case=i002-reservation-carries-consent.md
    ├── inventory.of=assumption._.md
    ├── inventory.of=assumption.case=a001-birth-date-is-true.md
    ├── inventory.of=assumption.case=a002-stripe-delivers-at-least-once.md
    ├── inventory.of=assumption.case=a002-stripe-delivers-at-least-once.enforcement=charge-event-reconcile.md
    ├── inventory.of=guarantee._.md
    ├── inventory.of=guarantee.case=g001-reservation-id-stable.md
    └── inventory.of=guarantee.case=g001-reservation-id-stable.enforcement=acceptance-get-reservation.md
```

- `repo=.this/role=any` — a domain fact belongs to the repo, shared by every role
- `subdomain=$slug` — one directory per subdomain; a coordinate, like `repo=` and `role=`
- `._` — the summary: axes, census, one line per entry
- `case=i001-$slug` — one entry. id + slug joined by a hyphen (a dot separates segments). ids lowercase, unique across the repo: `i` invariant, `a` assumption, `g` guarantee
- `example=$slug` — a zoom-in: one scenario, as narrative then bdd, in domain words. only where the entry is subtle or costly
- `enforcement=$slug` — a zoom-in that cites one enforcement: the code that asserts the entry is not broken. not exhaustive: cite the main enforcements, and every non-obvious one. a citation beside the entry, never part of it

## .the inventory declares; the rules hold the code to it

two grains, never mixed:

| grain | says | lives in |
|---|---|---|
| **declaration** | what must be true, what we rely on, what we promise | the entries — no mechanism, no pointer to an enforcement, no enforcement status, no review status (that lives in the route that authored it) |
| **enforcements** | the mechanisms that assert each entry is not broken — the implementer's choice | the code; each route's review checks it. the main and non-obvious ones cited by `.enforcement=$slug` zoom-ins beside the entry |

the rules give every entry an enforcement: `rule.require.invariant-before-operation` (each invariant), `rule.require.assumptions-with-evidence` (each assumption), `rule.require.acceptance.blackbox` (each guarantee, mechanic). a route that changes a writer of governed data, or an external surface, walks it in its review: which entries it touches, the break cases, the enforcement of each. an entry with no enforcement is a gap the route closes before it passes.

so the code churns while the declarations stay put.

each proof test cites the id in its name — `given('[i001] two reservations race for the last board', …)` — so `rhx grepsafe --pattern 'i001'` finds the entry and every test that proves it.

every guarantee is proven by a blackbox acceptance test against its surface (`rule.require.acceptance.blackbox`, mechanic). consumers build on all they can observe, promised or not, so the entry lists its **exclusions** too.

## .the summary is an inventory

one line per entry, refs only — id-slug plus one or two address columns. the statement lives in the entry. a line that grows a preview turns the summary into a catalog; keep it lean, or rename it `catalog.of=` on purpose.

## .the templates

- `.template=invariant` — one invariant entry
- `.template=assumption` — one assumption entry, with its evidence and what a break must cause
- `.template=guarantee` — one guarantee entry, with its exclusions
- `.template=summary` — the three `._` summaries
- `.template=example` — a scenario zoom-in: narrative, then a bdd timeline
- `.template=enforcement` — a zoom-in on one enforcement

## .boot

entries and zoom-ins boot as `ref`. only the `._` summaries may boot as `say`, and only in the repo that owns them.

## .see also

- `define.constraint.kind=invariant` — what an invariant is, and what an enforcement is
- `rule.require.assumptions-with-evidence` — what an assumption entry holds
- `rule.require.invariant-before-operation` — the per-change walk a route review runs
- `rule.require.persist-domain-term-evidence` — the peer convention for terms, at `domain.terms/`
- `ref.invariant.history` — where the assume → guarantee split comes from
