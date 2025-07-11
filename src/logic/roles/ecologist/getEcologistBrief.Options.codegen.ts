/**
 * .what = the options for the briefs available to role Ecologist
 * .note = codegened via:
 * ```sh
 *  npx tsx src/contract/commands/codegenBriefOptions.ts
 * ```
 */
const options = [
  'analysis.behavior-reveals-system.md',
  'core.term.price.v1.md',
  'core.term.price.v2.md',
  'distilisys.md',
  'distilisys.usecases.v1.md',
  'distilisys.usecases.v2.md',
  'distill.refine.terms.symmetry.md',
  'distill.refine.terms.ubiqlang.md',
  'eco001.overview.md',
  'eco101.core-system-understanding.md',
  'eco101.p1.ecosystem-structure.md',
  'eco101.p2.trophic-dynamics.md',
  'eco101.p3.population-ecology.md',
  'eco101.p4.community-interactions.md',
  'eco505.systems-thinking.md',
  'econ001.overview.md',
  'econ101.core-mechanics.md',
  'econ101.p1.supply-and-demand.md',
  'econ101.p2.opportunity-cost.md',
  'econ101.p3.marginal-analysis.md',
  'econ101.p4.rational-choice.md',
  'econ201.market-structures-and-failures.md',
  'econ301.production-and-growth.md',
  'econ401.macro-systems.md',
  'econ501.global-and-institutional.md',
  'econ501.p1.game-theory.md',
  'econ501.p4.behavioral-economics.md',
] as const;

export type BriefOptionEcologist = typeof options[number];
