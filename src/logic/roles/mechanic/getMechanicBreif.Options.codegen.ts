/**
 * .what = the options for the briefs available to role Mechanic
 * .note = codegened via:
 * ```sh
 *  npx tsx src/contract/commands/codegenBriefOptions.ts
 * ```
 */
const options = [
  'style.words.lowercase.md',
  'style.names.ubiqlang.md',
  'style.names.treestruct.md',
  'style.compressed.prompt.md',
  'style.compressed.md',
  'codestyle/mech.what-why.v2.md',
  'codestyle/mech.what-why.md',
  'codestyle/mech.tests.given-when-then.md',
  'codestyle/mech.clear-contracts.md',
  'codestyle/mech.arrowonly.md',
  'codestyle/mech.args.input-context.md',
  'codestyle/flow.single-responsibility.md',
  'codestyle/flow.narratives.md',
  'codestyle/flow.immutability.md',
  'codestyle/flow.idempotency.md',
  'codestyle/flow.failfast.md',
  'codestyle/_mech.compressed.prompt.md',
  'codestyle/_mech.compressed.md',
  'architecture/ubiqlang.md',
  'architecture/domain-driven-design.md',
  'architecture/directional-dependencies.md',
  'architecture/bounded-contexts.md',
] as const;

export type BriefOptionMechanic = typeof options[number];
