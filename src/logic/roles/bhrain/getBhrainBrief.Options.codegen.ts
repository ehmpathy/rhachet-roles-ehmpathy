/**
 * .what = the options for the briefs available to role Bhrain
 * .note = codegened via:
 * ```sh
 *  npx tsx src/contract/commands/codegenBriefOptions.ts
 * ```
 */
const options = [
  'distilisys.grammar.compressed.md',
  'terms.motive.intent.goal.md',
  'trait.ocd.md',
] as const;

export type BriefOptionBhrain = typeof options[number];
