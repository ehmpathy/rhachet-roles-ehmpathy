/**
 * .what = the options for the briefs available to role Ecologist
 * .note = codegened via:
 * ```sh
 *  npx tsx src/contract/commands/codegenBriefOptions.ts
 * ```
 */
const options = [
  'econ501.p4.behavioral-economics.md',
  'econ501.p1.game-theory.md',
  'econ501.global-and-institutional.md',
  'econ401.macro-systems.md',
  'econ301.production-and-growth.md',
  'econ201.market-structures-and-failures.md',
  'econ101.p4.rational-choice.md',
  'econ101.p3.marginal-analysis.md',
  'econ101.p2.opportunity-cost.md',
  'econ101.p1.supply-and-demand.md',
  'econ101.core-mechanics.md',
  'econ001.overview.md',
  'eco505.systems-thinking.md',
  'eco101.p4.community-interactions.md',
  'eco101.p3.population-ecology.md',
  'eco101.p2.trophic-dynamics.md',
  'eco101.p1.ecosystem-structure.md',
  'eco101.core-system-understanding.md',
  'eco001.overview.md',
  'distill.refine.terms.ubiqlang.md',
  'distill.refine.terms.symmetry.md',
  'distilisys.usecases.v2.md',
  'distilisys.usecases.v1.md',
  'distilisys.md',
  'core.term.price.v2.md',
  'core.term.price.v1.md',
  'analysis.behavior-reveals-system.md',
] as const;

export type BriefOptionEcologist = typeof options[number];
