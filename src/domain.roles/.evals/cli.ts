#!/usr/bin/env npx tsx

/**
 * .what = CLI entrypoint for review eval infrastructure
 * .why = enables shell skill to invoke evals and emit results to cache
 */
import * as fs from 'fs';
import * as path from 'path';

import { getAllEvalCasesForRubric } from './case/getAllEvalCasesForRubric';
import {
  compareBrains,
  formatBrainComparisonTable,
} from './eval/compareBrains';
import { runReviewEval } from './eval/runReviewEval';
import type { EvalSummary } from './schemas';

/**
 * .what = format eval summary as markdown
 */
const formatEvalSummary = (input: { summary: EvalSummary }): string => {
  const { summary } = input;
  const lines: string[] = [];

  lines.push(`# eval: ${summary.rubric}`);
  lines.push('');
  lines.push(`- brain: ${summary.brain ?? '(default)'}`);
  lines.push(`- cases: ${summary.passedCases}/${summary.totalCases} passed`);
  lines.push(`- sensitivity: ${(summary.avgSensitivity * 100).toFixed(0)}%`);
  lines.push(`- specificity: ${(summary.avgSpecificity * 100).toFixed(0)}%`);
  lines.push(`- duration: ${(summary.totalDurationMs / 1000).toFixed(1)}s`);
  lines.push('');
  lines.push('## verdicts');
  lines.push('');
  lines.push('| case | sensitivity | specificity | exit |');
  lines.push('|------|-------------|-------------|------|');

  for (const verdict of summary.verdicts) {
    const sens = `${(verdict.sensitivity * 100).toFixed(0)}%`;
    const spec = `${(verdict.specificity * 100).toFixed(0)}%`;
    lines.push(
      `| ${verdict.evalCase.id} | ${sens} | ${spec} | ${verdict.reviewResult.exitCode} |`,
    );
  }

  return lines.join('\n');
};

const usage = `
usage:
  npx tsx cli.ts list                                    # list available rubrics
  npx tsx cli.ts run --rubric <slug> --role <role>       # run eval for rubric
  npx tsx cli.ts compare --rubric <slug> --role <role> --brains <b1,b2>  # compare brains

options:
  --rubric    rubric slug (e.g., mech-failhides)
  --role      role name (e.g., mechanic, architect, ergonomist)
  --brains    comma-separated brain list (e.g., fireworks/deepseek/v4-flash,xai/grok/3-mini)
  --output    output directory (default: stdout)
`;

const parseArgs = (
  args: string[],
): { command: string; options: Record<string, string> } => {
  const command = args[0] ?? 'help';
  const options: Record<string, string> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        options[key] = value;
        i++;
      }
    }
  }

  return { command, options };
};

const listRubrics = async (): Promise<void> => {
  const evalsDir = __dirname;
  const domainRolesDir = path.join(__dirname, '..');

  const roles = ['mechanic', 'architect', 'ergonomist'];
  const rubrics: Array<{ role: string; rubric: string; cases: number }> = [];

  for (const role of roles) {
    const skillsDir = path.join(domainRolesDir, role, 'skills', 'review');
    if (!fs.existsSync(skillsDir)) continue;

    const files = fs.readdirSync(skillsDir);
    for (const file of files) {
      const match = file.match(/^review\.rubric=(.+)\.sh$/);
      if (match) {
        const rubric = match[1]!;
        try {
          const cases = getAllEvalCasesForRubric({ rubric, evalsDir });
          rubrics.push({ role, rubric, cases: cases.length });
        } catch {
          rubrics.push({ role, rubric, cases: 0 });
        }
      }
    }
  }

  console.log('\navailable rubrics:\n');
  console.log('| role | rubric | eval cases |');
  console.log('|------|--------|------------|');
  for (const r of rubrics) {
    console.log(`| ${r.role} | ${r.rubric} | ${r.cases} |`);
  }
  console.log('');
};

const runEval = async (options: Record<string, string>): Promise<void> => {
  const { rubric, role, output } = options;

  if (!rubric || !role) {
    console.error('error: --rubric and --role are required');
    process.exit(2);
  }

  const evalsDir = __dirname;
  const domainRolesDir = path.join(__dirname, '..');

  console.log(`\neval: ${rubric} (role=${role})\n`);

  const summary = await runReviewEval({
    rubric,
    role,
    domainRolesDir,
    evalsDir,
  });

  const formatted = formatEvalSummary({ summary });

  if (output) {
    const outputPath = path.join(output, `eval.${rubric}.${Date.now()}.md`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, formatted);
    console.log(`output: ${outputPath}`);
  } else {
    console.log(formatted);
  }
};

const runCompare = async (options: Record<string, string>): Promise<void> => {
  const { rubric, role, brains, output } = options;

  if (!rubric || !role || !brains) {
    console.error('error: --rubric, --role, and --brains are required');
    process.exit(2);
  }

  const brainList = brains.split(',');
  const evalsDir = __dirname;
  const domainRolesDir = path.join(__dirname, '..');

  console.log(`\ncompare: ${rubric} (role=${role})`);
  console.log(`brains: ${brainList.join(', ')}\n`);

  const comparison = await compareBrains({
    rubric,
    role,
    brains: brainList,
    domainRolesDir,
    evalsDir,
  });

  const formatted = formatBrainComparisonTable({ comparison });

  if (output) {
    const outputPath = path.join(output, `compare.${rubric}.${Date.now()}.md`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, formatted);
    console.log(`output: ${outputPath}`);
  } else {
    console.log(formatted);
  }
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const { command, options } = parseArgs(args);

  switch (command) {
    case 'list':
      await listRubrics();
      break;
    case 'run':
      await runEval(options);
      break;
    case 'compare':
      await runCompare(options);
      break;
    case 'help':
    default:
      console.log(usage);
      break;
  }
};

main().catch((err) => {
  console.error('error:', err.message);
  process.exit(1);
});
