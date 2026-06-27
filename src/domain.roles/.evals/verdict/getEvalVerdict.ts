import { genContextBrain } from 'rhachet';
import * as yaml from 'yaml';

import type {
  CheckResult,
  EvalCase,
  EvalVerdict,
  ReviewResult,
} from '../schemas';
import { schemaOfEvalVerdict } from '../schemas';

/**
 * .what = compute eval verdict via evaluator brain
 * .why  = semantic judgment of generator output against checks
 *
 * .note = follows generator + evaluator pattern:
 *         - generator (rubric skill) produces review output
 *         - evaluator (brain.choice.ask) judges output against checks
 *         - verdict uses confusion matrix: TP, FP, TN, FN
 */
export const getEvalVerdict = async (input: {
  /** eval case with checks */
  evalCase: EvalCase;
  /** actual review result from generator */
  reviewResult: ReviewResult;
}): Promise<EvalVerdict> => {
  const { evalCase, reviewResult } = input;

  // create evaluator brain context
  const contextBrain = await genContextBrain({
    choice: { atom: evalCase.evaluator.brain },
  });

  // format checks for evaluator prompt
  const checksYaml = yaml.stringify(evalCase.checks);

  // ask evaluator brain to judge generator output
  const { output } = await contextBrain.brain.choice.ask({
    role: { briefs: [] },
    prompt: `analyze the review output and determine the result for each check.

## generator output (review results)
${reviewResult.stdout}

## code that was reviewed
\`\`\`typescript
${evalCase.code}
\`\`\`

## checks to verify
${checksYaml}

for each check:
1. read the \`reason\` field to understand what specific issue to look for
2. search the generator output for a flagged issue that matches the reason
3. if \`severity: blocker|nitpick\`, match either severity level
4. set \`observed: present\` if found, \`observed: absent\` if not
5. extract evidence (quote from generator output) if observed=present
6. compute result via confusion matrix:
   - expected=present, observed=present → true-positive
   - expected=present, observed=absent → false-negative
   - expected=absent, observed=absent → true-negative
   - expected=absent, observed=present → false-positive

pass = true iff all results are true-positive or true-negative`,
    schema: { output: schemaOfEvalVerdict },
  });

  // extract check results
  const checkResults: CheckResult[] = output.checks;

  // compute sensitivity: TP / (TP + FN)
  const truePositives = checkResults.filter(
    (c) => c.result === 'true-positive',
  );
  const falseNegatives = checkResults.filter(
    (c) => c.result === 'false-negative',
  );
  const tp = truePositives.length;
  const fn = falseNegatives.length;
  const sensitivity = tp + fn > 0 ? tp / (tp + fn) : 1;

  // compute specificity: TN / (TN + FP)
  const trueNegatives = checkResults.filter(
    (c) => c.result === 'true-negative',
  );
  const falsePositives = checkResults.filter(
    (c) => c.result === 'false-positive',
  );
  const tn = trueNegatives.length;
  const fp = falsePositives.length;
  const specificity = tn + fp > 0 ? tn / (tn + fp) : 1;

  return {
    evalCase,
    reviewResult,
    checkResults,
    passed: output.pass,
    sensitivity,
    specificity,
    summary: output.summary,
  };
};
