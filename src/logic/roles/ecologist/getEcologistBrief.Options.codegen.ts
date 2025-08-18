/**
 * .what = the options for the briefs available to role Ecologist
 * .note = codegened via:
 * ```sh
 *  npx tsx src/contract/commands/codegenBriefOptions.ts
 * ```
 */
const options = [
  'term.distillation.md',
  'distilisys/sys101.distilisys.grammar.md',
  'distilisys/sys201.actor.motive._.summary.md',
  'distilisys/sys201.actor.motive.p1.reversibility.entropy.md',
  'distilisys/sys201.actor.motive.p2.option.chance.choice.md',
  'distilisys/sys201.actor.motive.p3.chance.motive.polarity.threat.md',
  'distilisys/sys201.actor.motive.p4.motive.horizon.md',
  'distilisys/sys201.actor.motive.p5.motive.grammar.md',
  'distilisys/sys211.actor.resources._.primitives.summary.md',
  'distilisys/sys211.actor.resources.pt1.primitive.time.md',
  'distilisys/sys211.actor.resources.pt2.primitive.energy.md',
  'distilisys/sys211.actor.resources.pt3.primitive.space.md',
  'distilisys/sys211.actor.resources.pt4.primitive.claim.md',
  'distilisys/sys211.actor.resources.pt5.composites.md',
  'distilisys/sys231.actor.claims.p1.primitive.exchange.md',
  'economy/econ001.overview.md',
  'economy/econ101.core-mechanics.md',
  'economy/econ101.p1.supply-and-demand.md',
  'economy/econ101.p2.opportunity-cost.md',
  'economy/econ101.p3.marginal-analysis.md',
  'economy/econ101.p4.rational-choice.md',
  'economy/econ201.market-structures-and-failures.md',
  'economy/econ301.production-and-growth.md',
  'economy/econ401.macro-systems.md',
  'economy/econ501.global-and-institutional.md',
  'economy/econ501.p1.game-theory.md',
  'economy/econ501.p4.behavioral-economics.md',
  'product/user.journey.[article].frame2.md',
  'product/user.journey.[article].md',
  'ecology/eco001.overview.md',
  'ecology/eco101.core-system-understanding.md',
  'ecology/eco101.p1.ecosystem-structure.md',
  'ecology/eco101.p2.trophic-dynamics.md',
  'ecology/eco101.p3.population-ecology.md',
  'ecology/eco101.p4.community-interactions.md',
  'ecology/eco505.systems-thinking.md',
] as const;

export type BriefOptionEcologist = typeof options[number];
