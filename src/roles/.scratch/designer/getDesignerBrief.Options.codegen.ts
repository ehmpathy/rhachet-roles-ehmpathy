/**
 * .what = the options for the briefs available to role Designer
 * .note = codegened via:
 * ```sh
 *  npx tsx src/contract/commands/codegenBriefOptions.ts
 * ```
 */
const options = [
  'declarative-over-imperative.md',
  'pit-of-success.md',
] as const;

export type BriefOptionDesigner = (typeof options)[number];
