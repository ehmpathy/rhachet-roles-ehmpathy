# F13 — title and description boot as `ref`

- **fork**: boot the two dispatchers as `say` (headers in context at session start, flags and the
  attribution guarantee visible) or as `ref` (name only; `--help` on demand).
- **taken**: `ref`. the mechanic boot sits at 29,988 of its 30,000-token clamp
  (`boot.budget.integration.test.ts`); two more `say` headers break the clamp. the names show in
  every boot, and each verb's `--help` carries its flags and the attribution line.
- **rework**: clean — one line per verb in `boot.yml`, once budget frees (or a `say` demoted).
- **confidence**: 85%. a reviewer (r011) noted the booted driver sees names, not flags.
- **where**: `src/domain.roles/mechanic/boot.yml`.
- **verdict**: open, for the pr review.
