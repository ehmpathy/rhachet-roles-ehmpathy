yes, fixed, and shipped before this row was written up as open. the table is stale: it was measured on rhachet 1.50.0.

- **`role::subject` focus enroll**: rhachet 1.51.0, ehmpathy/rhachet#649, merged 2026-11-02
- **a subject sheds `always`**: same release, `inherit: { always: false }` on a `subject.*` section (`src/domain.operations/boot/parseRoleBootYaml.ts`, v1.51.0 tag)
- this repo pins `rhachet` 1.51.0, so both are live here. rhachet#541, cited in the row, is a separate ask (per-clone subject choice) and plays no part

proof, after the rebase onto main (head `21acc34c`, ci green):

- `subject.101` now declares `inherit: { always: false }`
- `roles cost --subject 101` on the role's own boot.yml reads **2,618 tokens**: the 9 say rows, their refs, and no `always` row (it was 9,645 with `always` folded in)
- `boot.budget.integration.test.ts` asserts the seat boot reads no more than the 101 section alone. a dropped opt-out folds ~19k of `always` back in and fails there
- `blackbox/mechanic.subject.101.acceptance.test.ts` boots the built package at `--subject 101`: 28/28 pass

a "budget inside a section" is still refused in 1.51.0, so the 10k cap for 101 stays in the integration test.
