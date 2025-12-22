/**
 * .what = the options for the briefs available to role Mechanic
 * .note = codegened via:
 * ```sh
 *  npx tsx src/contract/commands/codegenBriefOptions.ts
 * ```
 */
const options = [
  'style.compressed.md',
  'style.compressed.prompt.md',
  'style.names.treestruct.md',
  'style.names.ubiqlang.md',
  'style.words.lowercase.md',
  'architecture/bounded-contexts.md',
  'architecture/directional-dependencies.md',
  'architecture/domain-driven-design.md',
  'architecture/ubiqlang.md',
  'engineer/dependency-injection.md',
  'codestyle/_mech.compressed.md',
  'codestyle/_mech.compressed.prompt.md',
  'codestyle/flow.failfast.md',
  'codestyle/flow.idempotency.md',
  'codestyle/flow.immutability.md',
  'codestyle/flow.narratives.md',
  'codestyle/flow.single-responsibility.md',
  'codestyle/flow.transformers_over_conditionals.[lesson].md',
  'codestyle/mech.args.input-context.md',
  'codestyle/mech.args.input-inline.md',
  'codestyle/mech.arrowonly.md',
  'codestyle/mech.clear-contracts.md',
  'codestyle/mech.tests.given-when-then.md',
  'codestyle/mech.what-why.md',
  'codestyle/mech.what-why.v2.md',
  'codestyle/pit-of-success.via.minimize-surface-area.md',
] as const;

export type BriefOptionMechanic = (typeof options)[number];
