# F11 — brief placement

- **the fork**: where the 9 new briefs and 2 amends live.
- **taken** (by primary noun, per architect `rule.require.directory.by-primary-noun`):

| dir | brief | lessons |
|---|---|---|
| architect `briefs/practices/invariants/` | `define.invariant.md` (+ `.min`) | I01 |
| | `rule.require.invariant-before-mechanism.md` (+ `.min`) | I02 |
| | `philosophy.invariant-is-the-fundamental.[seed].md` | I03 |
| | `define.invariant-mechanisms.md` | I04 |
| | `rule.require.compose-additively.md` | I05 |
| architect `briefs/practices/abstractions/` | `philosophy.abstraction-creates-precision.md` | I07 |
| | `ref.abstraction-tactics.md` | I08 |
| architect `briefs/practices/transactions/` | `ref.transactional-patterns.md` | I09 |
| architect `briefs/practices/domains/` | `define.software-domain-taxonomy.md` | I06 |
| mechanic `practices/lang.terms/` | `define.invariant.md` (+ `.min`), the I01 twin | I01 |
| mechanic `work.flow/diagnose/` (extant file) | amend `rule.require.clamp-edge-cases.md` (+ `.min`) | I10 |
| mechanic `code.prod/evolvable.architecture/` (extant file) | amend `rule.prefer.wet-over-dry.md` | I11 |

- **why the I01 twin**: both roles use the term at the keyboard, and a role boots only its own briefs (`boot.yml` paths are role-relative). the `lang.prose` briefs set the precedent: one brief per role, kept in step.
- **rework**: clean — a move before release.
- **confidence**: 70%. `invariants/` could nest under `domain.operations/`; the twin could drift unless one cites the other as source.
- **where**: execution
- **verdict**: **ruled by the wisher (2026-11-23)** — *"why is abstraction inside invariants? those seem different"*; *"skepticize your domain boundaries"*. one dir per primary noun, under architect `briefs/practices/`:

| dir | holds | why this noun |
|---|---|---|
| `domain.constraints/` (was `domain.invariants/`) | define.invariant, define.enforcement, the inventory howto + templates, assumptions (forbid + require), invariant-before-operation, scattered-invariant-guards, invariants-are-the-source, the history, `philosophy.constraints-shrink-the-space` | the dir holds all three constraint kinds; `invariants` named one of them, so a reader in search of assumptions missed the dir |
| `domain.abstractions/` | `philosophy.abstraction-creates-precision`, `catalog.of=tactic.abstraction._` + 14 `kind=` members, I05 compose-additively | abstraction serves local change and a lighter read as well as constraints; enforcement is one use (rung 2), not the definition |
| `domain.transactions/` | `catalog.of=pattern.transaction._` + 13 `tier=.kind=` members, `rule.forbid.check-then-write` | concurrency and failure control is its own field; each pattern enforces a constraint and cites it, but does not live inside it |
| `domain.taxonomy/`, `domain.privacy/` | unchanged | the taxonomy rules apply the taxonomy; privacy is one noun |
| mechanic `lang.terms/`, `work.flow/refactor/` | the I01 twin, converge-contrast, I28 | unchanged — term rules and refactor rules |

- **the miss**: the first skeptic pass (90%) graded placement against "what landed and was approved", not against the primary-noun test. what landed carried the earlier error forward. the original guess above had `abstractions/` and `transactions/` apart, and was closer.
- **I08 / I09 shape**: catalogs per the librarian (`rule.require.catalog-is-an-index`, `rule.forbid.itemization-without-coordinates`), not flat refs. names per the wisher: `catalog.of=tactic.abstraction`, noun hierarchy first.
- **I05 placement**: `domain.abstractions/` — additive composition is a property of how parts and their contracts are cut. 75%: it could sit in `domain.constraints/`, since the cases it counts are constraint cases. clean rework.
