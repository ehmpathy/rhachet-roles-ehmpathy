# rule.require.dimensional-decomposition

## .what

when a system's variants span **two or more independent dimensions**, decompose the space into its orthogonal axes and account for **every cell** of the Cartesian product — before you name or build any subset of them.

the technique is `howto.dimensional-decomposition.md`. this rule makes it a **requirement** on any variant space that extends past a couple of ad-hoc members.

## .why

an ad-hoc list of named variants silently omits two classes of cell:

- **gaps** — valid combinations left unbuilt (opportunities lost by oversight, not by decision)
- **forbidden** — impossible combinations whose reason was never recorded (constraints that should be checkable invariants)

when you only name the cells that came to mind, a reviewer cannot tell a *deliberate* omission from a *forgotten* one. the product makes the whole space visible, so every omission is on record as a choice.

## .when it applies

| applies | does not apply |
|---------|----------------|
| variants span 2+ orthogonal axes (method × target, role × action × scope, …) | a single linear dimension (one enum, no cross-product) |
| the space extends one ad-hoc name at a time | a fixed, closed set that will not extend |
| some combinations must be impossible (safety / structural constraints) | no impossible combinations exist |

## .what it requires

1. **name the orthogonal axes** — small closed value-sets; no axis implies another
2. **enumerate the full product** — every cell, not the subset already built
3. **verdict every cell** — `filled` · `gap` · `forbidden` (each forbidden cell records *why*)
4. **derive names from the axes** — not ad-hoc (`rule.require.ubiqlang`)

## .the caveat — consider all, build only what is needed

this rule mandates **consideration**, not **implementation**. it does **not** require a fill of every cell — that would be over-build, in conflict with `rule.prefer.wet-over-dry`. a gap left deliberately, on record, satisfies the rule. an unaccounted-for cell does not.

## .enforcement

- a variant space over 2+ axes presented as a flat ad-hoc list, with no product walked = **blocker**
- a forbidden combination with no recorded reason = **blocker** (it should be a checkable invariant)
- a fill of every cell purely because the matrix has it, absent a real need = **nitpick** (over-build)

## .see also

- `howto.dimensional-decomposition.md` — the method, the three verdicts, a worked example
- `def.dimensional-decomposition.history.morphological-analysis.md` — the origin (Zwicky's morphological box) and citations
- `howto.domain-discovery.md` — decomposition is one of its premier discovery tactics
- `rule.require.ubiqlang` — axis-derived names
- `rule.prefer.wet-over-dry` — the build-only-what-is-needed caveat
