#!/usr/bin/env npx tsx

/**
 * .what = standalone perfeval runner for condense skill evaluation
 * .why = runs outside jest to avoid timeouts, streams logs to disk
 *
 * usage:
 *   npx tsx src/domain.roles/librarian/skills/brief.condense/runPerfevals.evals.ts
 *
 * output:
 *   .log/evals/condense/$isotime/
 *     ├── progress.log   # stream progress
 *     ├── results.md     # summary markdown
 *     └── results.json   # full results
 */

import Bottleneck from 'bottleneck';
import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';

import { TEST_BRIEFS } from '../brief.compress/.test/fixtures/briefs';
import type { MechanismOrModifier } from '../brief.compress/compress.via.bhrain';
import { condenseFile } from './brief.condense';

// ═══════════════════════════════════════════════════════════════════════════
// log setup
// ═══════════════════════════════════════════════════════════════════════════

const findGitRoot = (): string => {
  let dir = __dirname;
  while (dir !== '/') {
    if (
      fsSync.existsSync(path.join(dir, '.git')) ||
      fsSync.existsSync(path.join(dir, '.git', 'HEAD'))
    ) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return __dirname;
};

const GIT_ROOT = findGitRoot();
const ISODATE = new Date().toJSON().slice(0, 10);
const LOG_DIR = path.join(GIT_ROOT, '.log', 'evals', 'condense', ISODATE);
const LOG_FILE = path.join(LOG_DIR, 'progress.log');

// ensure log dir exists
fsSync.mkdirSync(LOG_DIR, { recursive: true });

// create log stream
const logStream = fsSync.createWriteStream(LOG_FILE, { flags: 'a' });

/**
 * .what = log to both console and file
 */
const log = (message: string): void => {
  const timestamp = new Date().toJSON();
  const line = `[${timestamp}] ${message}`;
  console.log(message);
  logStream.write(line + '\n');
};

/**
 * .what = log error to both console and file
 */
const logError = (message: string): void => {
  const timestamp = new Date().toJSON();
  const line = `[${timestamp}] ⛈️  ${message}`;
  console.error(`⛈️  ${message}`);
  logStream.write(line + '\n');
};

// ═══════════════════════════════════════════════════════════════════════════
// rate limiter
// ═══════════════════════════════════════════════════════════════════════════

const limiter = new Bottleneck({
  maxConcurrent: 10, // lower concurrency for condense (more expensive per call)
});

// ═══════════════════════════════════════════════════════════════════════════
// pipeline configuration - first two recommended pipelines
// ═══════════════════════════════════════════════════════════════════════════

interface Pipeline {
  name: string;
  description: string;
  press: MechanismOrModifier[][];
}

const PIPELINES: Pipeline[] = [
  {
    name: 'pipeline-1-default',
    description: 'best balance: high density + stable',
    press: [['req-kernels', 'sitrep-aggressive'], ['telegraphic']],
  },
  {
    name: 'pipeline-2-lossless',
    description: 'lossless + stable (3-step req-kernels)',
    press: [
      ['req-kernels', 'sitrep-aggressive'],
      ['req-kernels', 'sitrep-taskaware'],
      ['req-kernels', 'telegraphic'],
    ],
  },
];

const BRAIN_SLUGS = ['xai/grok/3-mini'] as const;
type BrainSlug = (typeof BRAIN_SLUGS)[number];

const RUNS_PER_PAIR = 3;

// ═══════════════════════════════════════════════════════════════════════════
// result types
// ═══════════════════════════════════════════════════════════════════════════

interface CondenseResult {
  briefName: string;
  briefType: string;
  runIndex: number;
  pipelineName: string;
  pipelinePress: MechanismOrModifier[][];
  brainSlug: BrainSlug;
  tokensBefore: number;
  tokensAfter: number;
  kernelsBefore: number;
  kernelsAfter: number;
  kernelDelta: number;
  densityBefore: number;
  densityAfter: number;
  densityDelta: number;
  stabilityMeanJaccard: number;
  durationMs: number;
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// condense runner
// ═══════════════════════════════════════════════════════════════════════════

const formatPipeline = (press: MechanismOrModifier[][]): string =>
  `[${press.map((step) => `[${step.join(', ')}]`).join(', ')}]`;

const runCondense = async (input: {
  content: string;
  briefName: string;
  briefType: string;
  pipeline: Pipeline;
  brainSlug: BrainSlug;
  runIndex: number;
}): Promise<CondenseResult> => {
  const startTime = Date.now();

  try {
    const result = await condenseFile({
      content: input.content,
      brainSlug: input.brainSlug,
      pipeline: input.pipeline.press,
      onVerify: null,
      attempts: 1, // single attempt per run (variance measured across runs)
      force: input.runIndex > 0, // force bypass cache for variance measurement
      consensusRuns: 3,
      stabilityThreshold: 0.5, // lower threshold for perfevals to avoid failures
    });

    const durationMs = Date.now() - startTime;

    return {
      briefName: input.briefName,
      briefType: input.briefType,
      runIndex: input.runIndex,
      pipelineName: input.pipeline.name,
      pipelinePress: input.pipeline.press,
      brainSlug: input.brainSlug,
      tokensBefore: result.tokens.before,
      tokensAfter: result.tokens.after,
      kernelsBefore: result.kernels.before,
      kernelsAfter: result.kernels.after,
      kernelDelta: result.kernels.delta,
      densityBefore: result.density.before,
      densityAfter: result.density.after,
      densityDelta: result.density.delta,
      stabilityMeanJaccard: result.stability.meanJaccard,
      durationMs,
      error: null,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    return {
      briefName: input.briefName,
      briefType: input.briefType,
      runIndex: input.runIndex,
      pipelineName: input.pipeline.name,
      pipelinePress: input.pipeline.press,
      brainSlug: input.brainSlug,
      tokensBefore: 0,
      tokensAfter: 0,
      kernelsBefore: 0,
      kernelsAfter: 0,
      kernelDelta: 0,
      densityBefore: 0,
      densityAfter: 0,
      densityDelta: 0,
      stabilityMeanJaccard: 0,
      durationMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// stats computation
// ═══════════════════════════════════════════════════════════════════════════

const computeStats = (
  values: number[],
): { mean: number; min: number; max: number; stddev: number } => {
  const n = values.length;
  if (n === 0) return { mean: 0, min: 0, max: 0, stddev: 0 };

  const mean = values.reduce((a, b) => a + b, 0) / n;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);

  return { mean, min, max, stddev };
};

// ═══════════════════════════════════════════════════════════════════════════
// main runner
// ═══════════════════════════════════════════════════════════════════════════

const main = async (): Promise<void> => {
  log('🐢 condense perfeval');
  log(`📁 output: ${LOG_DIR}`);
  log('');

  const totalStartTime = Date.now();

  // build tasks
  const tasks: Promise<CondenseResult>[] = [];
  const taskDescriptions: string[] = [];

  for (const brainSlug of BRAIN_SLUGS) {
    for (const pipeline of PIPELINES) {
      for (const brief of TEST_BRIEFS) {
        for (let runIndex = 0; runIndex < RUNS_PER_PAIR; runIndex++) {
          const desc = `${brief.name} × ${pipeline.name} × run${runIndex}`;
          taskDescriptions.push(desc);

          tasks.push(
            limiter.schedule(() =>
              runCondense({
                content: brief.content,
                briefName: brief.name,
                briefType: brief.type,
                pipeline,
                brainSlug,
                runIndex,
              }),
            ),
          );
        }
      }
    }
  }

  log(
    `📊 run ${tasks.length} condenses (${BRAIN_SLUGS.length} brains × ${PIPELINES.length} pipelines × ${TEST_BRIEFS.length} briefs × ${RUNS_PER_PAIR} runs)`,
  );
  log('');

  // track progress
  let completed = 0;
  let successCount = 0;
  let failCount = 0;

  const resultsPromise = Promise.all(
    tasks.map(async (task, index) => {
      const result = await task;
      completed++;

      if (result.error) {
        failCount++;
        log(
          `   [${completed}/${tasks.length}] ⛈️  ${taskDescriptions[index]}: ${result.error.slice(0, 60)}`,
        );
      } else {
        successCount++;
        if (completed % 10 === 0 || completed === tasks.length) {
          log(
            `   [${completed}/${tasks.length}] ✓ ${successCount} success, ${failCount} failed`,
          );
        }
      }

      return result;
    }),
  );

  const results = await resultsPromise;
  const totalDurationMs = Date.now() - totalStartTime;

  log('');
  log('═══════════════════════════════════════════════════════════════════');
  log('📊 results summary');
  log('═══════════════════════════════════════════════════════════════════');
  log('');

  // group by brain, then by pipeline
  const byBrain = new Map<BrainSlug, Map<string, CondenseResult[]>>();
  for (const result of results) {
    if (!byBrain.has(result.brainSlug)) {
      byBrain.set(result.brainSlug, new Map());
    }
    const brainMap = byBrain.get(result.brainSlug)!;
    const group = brainMap.get(result.pipelineName) ?? [];
    group.push(result);
    brainMap.set(result.pipelineName, group);
  }

  // log comparison table for each brain
  for (const [brainSlugKey, byPipeline] of byBrain) {
    const statsPerPipeline: Array<{
      pipelineName: string;
      pipelinePress: string;
      densityStats: ReturnType<typeof computeStats>;
      kernelStats: { beforeAvg: number; afterAvg: number; deltaAvg: number };
      tokenStats: { beforeAvg: number; afterAvg: number; ratioAvg: number };
      stabilityAvg: number;
    }> = [];

    for (const [pipelineName, pipelineResults] of byPipeline) {
      const successful = pipelineResults.filter((r) => r.error === null);
      const densityDeltas = successful.map((r) => r.densityDelta);

      const kernelBeforeAvg =
        successful.length > 0
          ? successful.reduce((a, r) => a + r.kernelsBefore, 0) /
            successful.length
          : 0;
      const kernelAfterAvg =
        successful.length > 0
          ? successful.reduce((a, r) => a + r.kernelsAfter, 0) /
            successful.length
          : 0;
      const kernelDeltaAvg =
        successful.length > 0
          ? successful.reduce((a, r) => a + r.kernelDelta, 0) /
            successful.length
          : 0;

      const tokenBeforeAvg =
        successful.length > 0
          ? successful.reduce((a, r) => a + r.tokensBefore, 0) /
            successful.length
          : 0;
      const tokenAfterAvg =
        successful.length > 0
          ? successful.reduce((a, r) => a + r.tokensAfter, 0) /
            successful.length
          : 0;
      const tokenRatioAvg =
        tokenAfterAvg > 0 ? tokenBeforeAvg / tokenAfterAvg : 0;

      const stabilityAvg =
        successful.length > 0
          ? successful.reduce((a, r) => a + r.stabilityMeanJaccard, 0) /
            successful.length
          : 0;

      const firstResult = successful[0];
      statsPerPipeline.push({
        pipelineName,
        pipelinePress: firstResult
          ? formatPipeline(firstResult.pipelinePress)
          : '',
        densityStats: computeStats(densityDeltas),
        kernelStats: {
          beforeAvg: kernelBeforeAvg,
          afterAvg: kernelAfterAvg,
          deltaAvg: kernelDeltaAvg,
        },
        tokenStats: {
          beforeAvg: tokenBeforeAvg,
          afterAvg: tokenAfterAvg,
          ratioAvg: tokenRatioAvg,
        },
        stabilityAvg,
      });
    }

    // sort by density delta (higher is better)
    statsPerPipeline.sort((a, b) => b.densityStats.mean - a.densityStats.mean);

    log(`📊 pipeline comparison [${brainSlugKey}]:`);
    log('');
    log('| pipeline | dens.Δ | dens.σ | kern.Δ | tok.ratio | stability |');
    log('|----------|--------|--------|--------|-----------|-----------|');

    for (const entry of statsPerPipeline) {
      log(
        `| ${entry.pipelineName.padEnd(20)} | ${entry.densityStats.mean > 0 ? '+' : ''}${entry.densityStats.mean.toFixed(1)} | ${entry.densityStats.stddev.toFixed(1)} | ${entry.kernelStats.deltaAvg >= 0 ? '+' : ''}${entry.kernelStats.deltaAvg.toFixed(1)} | ${entry.tokenStats.ratioAvg.toFixed(2)}x | ${(entry.stabilityAvg * 100).toFixed(0)}% |`,
      );
    }

    log('');

    // detailed per-pipeline
    for (const entry of statsPerPipeline) {
      log(`📋 ${entry.pipelineName}: ${entry.pipelinePress}`);
      log(
        `   ├── dens.Δ: mean=${entry.densityStats.mean.toFixed(1)}, σ=${entry.densityStats.stddev.toFixed(2)}, range=[${entry.densityStats.min.toFixed(1)}, ${entry.densityStats.max.toFixed(1)}]`,
      );
      log(
        `   ├── kern.Δ: ${entry.kernelStats.deltaAvg >= 0 ? '+' : ''}${entry.kernelStats.deltaAvg.toFixed(1)} (${entry.kernelStats.beforeAvg.toFixed(1)} → ${entry.kernelStats.afterAvg.toFixed(1)})`,
      );
      log(
        `   ├── tokens: ${entry.tokenStats.beforeAvg.toFixed(0)} → ${entry.tokenStats.afterAvg.toFixed(0)} (${entry.tokenStats.ratioAvg.toFixed(2)}x)`,
      );
      log(
        `   └── stability: ${(entry.stabilityAvg * 100).toFixed(0)}% meanJaccard`,
      );
      log('');
    }
  }

  // duration metrics
  log('⏱️  duration metrics:');
  log(`   total: ${(totalDurationMs / 1000).toFixed(1)}s`);
  log(`   avg per condense: ${(totalDurationMs / tasks.length).toFixed(0)}ms`);
  log(`   success: ${successCount}/${tasks.length}`);
  log(`   failed: ${failCount}/${tasks.length}`);
  log('');

  // write results to files
  const mdPath = path.join(LOG_DIR, 'results.md');
  const jsonPath = path.join(LOG_DIR, 'results.json');

  // build markdown
  const mdLines: string[] = [];
  mdLines.push(`# condense perfeval results: ${ISODATE}`);
  mdLines.push('');
  mdLines.push('## summary');
  mdLines.push('');
  mdLines.push(`- **brains**: ${BRAIN_SLUGS.join(', ')}`);
  mdLines.push(`- **pipelines**: ${PIPELINES.length}`);
  mdLines.push(`- **briefs**: ${TEST_BRIEFS.length}`);
  mdLines.push(`- **runs per pair**: ${RUNS_PER_PAIR}`);
  mdLines.push(`- **total condenses**: ${tasks.length}`);
  mdLines.push(`- **duration**: ${(totalDurationMs / 1000).toFixed(1)}s`);
  mdLines.push(`- **success**: ${successCount}/${tasks.length}`);
  mdLines.push('');

  mdLines.push('## pipelines tested');
  mdLines.push('');
  for (const pipeline of PIPELINES) {
    mdLines.push(`### ${pipeline.name}`);
    mdLines.push('');
    mdLines.push(`**${pipeline.description}**`);
    mdLines.push('');
    mdLines.push('```');
    mdLines.push(`sup:[kernelize], ${formatPipeline(pipeline.press)}`);
    mdLines.push('```');
    mdLines.push('');
  }

  for (const [brainSlugKey, byPipeline] of byBrain) {
    mdLines.push(`## results: ${brainSlugKey}`);
    mdLines.push('');

    const statsPerPipeline: Array<{
      pipelineName: string;
      pipelinePress: string;
      densityStats: ReturnType<typeof computeStats>;
      kernelStats: { beforeAvg: number; afterAvg: number; deltaAvg: number };
      tokenStats: { beforeAvg: number; afterAvg: number; ratioAvg: number };
      stabilityAvg: number;
    }> = [];

    for (const [pipelineName, pipelineResults] of byPipeline) {
      const successful = pipelineResults.filter((r) => r.error === null);
      const densityDeltas = successful.map((r) => r.densityDelta);

      const kernelBeforeAvg =
        successful.length > 0
          ? successful.reduce((a, r) => a + r.kernelsBefore, 0) /
            successful.length
          : 0;
      const kernelAfterAvg =
        successful.length > 0
          ? successful.reduce((a, r) => a + r.kernelsAfter, 0) /
            successful.length
          : 0;
      const kernelDeltaAvg =
        successful.length > 0
          ? successful.reduce((a, r) => a + r.kernelDelta, 0) /
            successful.length
          : 0;

      const tokenBeforeAvg =
        successful.length > 0
          ? successful.reduce((a, r) => a + r.tokensBefore, 0) /
            successful.length
          : 0;
      const tokenAfterAvg =
        successful.length > 0
          ? successful.reduce((a, r) => a + r.tokensAfter, 0) /
            successful.length
          : 0;
      const tokenRatioAvg =
        tokenAfterAvg > 0 ? tokenBeforeAvg / tokenAfterAvg : 0;

      const stabilityAvg =
        successful.length > 0
          ? successful.reduce((a, r) => a + r.stabilityMeanJaccard, 0) /
            successful.length
          : 0;

      const firstResult = successful[0];
      statsPerPipeline.push({
        pipelineName,
        pipelinePress: firstResult
          ? formatPipeline(firstResult.pipelinePress)
          : '',
        densityStats: computeStats(densityDeltas),
        kernelStats: {
          beforeAvg: kernelBeforeAvg,
          afterAvg: kernelAfterAvg,
          deltaAvg: kernelDeltaAvg,
        },
        tokenStats: {
          beforeAvg: tokenBeforeAvg,
          afterAvg: tokenAfterAvg,
          ratioAvg: tokenRatioAvg,
        },
        stabilityAvg,
      });
    }

    statsPerPipeline.sort((a, b) => b.densityStats.mean - a.densityStats.mean);

    mdLines.push(
      '| pipeline | dens.Δ | dens.σ | kern.Δ | tok.ratio | stability |',
    );
    mdLines.push(
      '|----------|--------|--------|--------|-----------|-----------|',
    );

    for (const entry of statsPerPipeline) {
      mdLines.push(
        `| ${entry.pipelineName} | ${entry.densityStats.mean > 0 ? '+' : ''}${entry.densityStats.mean.toFixed(1)} | ${entry.densityStats.stddev.toFixed(2)} | ${entry.kernelStats.deltaAvg >= 0 ? '+' : ''}${entry.kernelStats.deltaAvg.toFixed(1)} | ${entry.tokenStats.ratioAvg.toFixed(2)}x | ${(entry.stabilityAvg * 100).toFixed(0)}% |`,
      );
    }

    mdLines.push('');

    // per-brief breakdown
    mdLines.push('### per-brief results');
    mdLines.push('');

    for (const [pipelineName, pipelineResults] of byPipeline) {
      mdLines.push(`#### ${pipelineName}`);
      mdLines.push('');
      mdLines.push('| brief | dens.Δ | kern.Δ | tokens | stability |');
      mdLines.push('|-------|--------|--------|--------|-----------|');

      // group by brief
      const byBrief = new Map<string, CondenseResult[]>();
      for (const result of pipelineResults) {
        const group = byBrief.get(result.briefName) ?? [];
        group.push(result);
        byBrief.set(result.briefName, group);
      }

      for (const [briefName, briefResults] of byBrief) {
        const successful = briefResults.filter((r) => r.error === null);
        if (successful.length === 0) continue;

        const densityDeltaAvg =
          successful.reduce((a, r) => a + r.densityDelta, 0) /
          successful.length;
        const kernelDeltaAvg =
          successful.reduce((a, r) => a + r.kernelDelta, 0) / successful.length;
        const tokensBefore = successful[0]!.tokensBefore;
        const tokensAfterAvg =
          successful.reduce((a, r) => a + r.tokensAfter, 0) / successful.length;
        const stabilityAvg =
          successful.reduce((a, r) => a + r.stabilityMeanJaccard, 0) /
          successful.length;

        mdLines.push(
          `| ${briefName} | ${densityDeltaAvg > 0 ? '+' : ''}${densityDeltaAvg.toFixed(1)} | ${kernelDeltaAvg >= 0 ? '+' : ''}${kernelDeltaAvg.toFixed(1)} | ${tokensBefore}→${tokensAfterAvg.toFixed(0)} | ${(stabilityAvg * 100).toFixed(0)}% |`,
        );
      }

      mdLines.push('');
    }
  }

  await fs.writeFile(mdPath, mdLines.join('\n'));
  await fs.writeFile(
    jsonPath,
    JSON.stringify(
      {
        config: {
          brains: BRAIN_SLUGS,
          pipelines: PIPELINES.map((p) => ({
            name: p.name,
            description: p.description,
            press: formatPipeline(p.press),
          })),
          briefCount: TEST_BRIEFS.length,
          runsPerPair: RUNS_PER_PAIR,
        },
        metrics: {
          taskCount: tasks.length,
          durationMs: totalDurationMs,
          successCount,
          failCount,
        },
        results,
      },
      null,
      2,
    ),
  );

  log('📄 results emitted:');
  log(`   ${mdPath}`);
  log(`   ${jsonPath}`);
  log('');
  log('🐢 perfeval complete');

  logStream.end();
};

// run main
main().catch((err) => {
  logError(`fatal error: ${err instanceof Error ? err.message : String(err)}`);
  logStream.end();
  process.exit(1);
});
