#!/usr/bin/env npx tsx

/**
 * .what = perfeval runner for telegraphic pipelines (GOOD density 2-3x)
 * .why = validate that telegraphic achieves target 2-3x compression with low kern.σ
 *
 * usage:
 *   npx tsx src/domain.roles/librarian/skills/brief.condense/runPerfevals.telegraphic.evals.ts
 *
 * output:
 *   .log/evals/condense-telegraphic/$isotime/
 *     ├── progress.log
 *     ├── results.md
 *     └── results.json
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
const LOG_DIR = path.join(
  GIT_ROOT,
  '.log',
  'evals',
  'condense-telegraphic',
  ISODATE,
);
const LOG_FILE = path.join(LOG_DIR, 'progress.log');

fsSync.mkdirSync(LOG_DIR, { recursive: true });
const logStream = fsSync.createWriteStream(LOG_FILE, { flags: 'a' });

const log = (message: string): void => {
  const timestamp = new Date().toJSON();
  const line = `[${timestamp}] ${message}`;
  console.log(message);
  logStream.write(line + '\n');
};

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
  maxConcurrent: 10,
});

// ═══════════════════════════════════════════════════════════════════════════
// pipeline configuration - telegraphic variants (GOOD density 2-3x)
// ═══════════════════════════════════════════════════════════════════════════

interface Pipeline {
  name: string;
  description: string;
  press: MechanismOrModifier[][];
  onVerify: 'restore' | null;
}

const PIPELINES: Pipeline[] = [
  {
    name: 'telegraphic-only',
    description: 'telegraphic compression alone',
    press: [['telegraphic']],
    onVerify: null,
  },
  {
    name: 'req-kernels-telegraphic',
    description: 'kernel-injected telegraphic',
    press: [['req-kernels', 'telegraphic']],
    onVerify: null,
  },
  {
    name: 'telegraphic-restore',
    description: 'telegraphic with kernel restoration',
    press: [['telegraphic']],
    onVerify: 'restore',
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
  onVerify: 'restore' | null;
  brainSlug: BrainSlug;
  tokensBefore: number;
  tokensAfter: number;
  compressionRatio: number;
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
      onVerify: input.pipeline.onVerify,
      attempts: 1,
      force: input.runIndex > 0,
      consensusRuns: 3,
      stabilityThreshold: 0.5,
    });

    const durationMs = Date.now() - startTime;
    const compressionRatio =
      result.tokens.after > 0 ? result.tokens.before / result.tokens.after : 0;

    return {
      briefName: input.briefName,
      briefType: input.briefType,
      runIndex: input.runIndex,
      pipelineName: input.pipeline.name,
      pipelinePress: input.pipeline.press,
      onVerify: input.pipeline.onVerify,
      brainSlug: input.brainSlug,
      tokensBefore: result.tokens.before,
      tokensAfter: result.tokens.after,
      compressionRatio,
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
      onVerify: input.pipeline.onVerify,
      brainSlug: input.brainSlug,
      tokensBefore: 0,
      tokensAfter: 0,
      compressionRatio: 0,
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
  log('🐢 condense telegraphic perfeval (GOOD density 2-3x target)');
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
        if (completed % 5 === 0 || completed === tasks.length) {
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
  log('📊 telegraphic pipeline comparison (GOOD density target: 2-3x)');
  log('═══════════════════════════════════════════════════════════════════');
  log('');

  // group by pipeline
  const byPipeline = new Map<string, CondenseResult[]>();
  for (const result of results) {
    const group = byPipeline.get(result.pipelineName) ?? [];
    group.push(result);
    byPipeline.set(result.pipelineName, group);
  }

  // compute stats per pipeline
  const statsPerPipeline: Array<{
    pipelineName: string;
    pipelinePress: string;
    onVerify: string;
    compressionStats: ReturnType<typeof computeStats>;
    densityStats: ReturnType<typeof computeStats>;
    kernelDeltaStats: ReturnType<typeof computeStats>;
    stabilityAvg: number;
    successRate: number;
  }> = [];

  for (const [pipelineName, pipelineResults] of byPipeline) {
    const successful = pipelineResults.filter((r) => r.error === null);
    const compressionRatios = successful.map((r) => r.compressionRatio);
    const densityDeltas = successful.map((r) => r.densityDelta);
    const kernelDeltas = successful.map((r) => r.kernelDelta);

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
      onVerify: firstResult?.onVerify ?? 'null',
      compressionStats: computeStats(compressionRatios),
      densityStats: computeStats(densityDeltas),
      kernelDeltaStats: computeStats(kernelDeltas),
      stabilityAvg,
      successRate: successful.length / pipelineResults.length,
    });
  }

  // sort by compression ratio (closer to 2-3x target is better)
  statsPerPipeline.sort(
    (a, b) =>
      Math.abs(b.compressionStats.mean - 2.5) -
      Math.abs(a.compressionStats.mean - 2.5),
  );

  log('| pipeline | compress | dens.Δ | kern.Δ | kern.σ | stability |');
  log('|----------|----------|--------|--------|--------|-----------|');

  for (const entry of statsPerPipeline) {
    const compressLabel =
      entry.compressionStats.mean >= 2 && entry.compressionStats.mean <= 3
        ? `${entry.compressionStats.mean.toFixed(1)}x ✓`
        : `${entry.compressionStats.mean.toFixed(1)}x`;
    const kernelLabel =
      entry.kernelDeltaStats.stddev < 1
        ? `${entry.kernelDeltaStats.stddev.toFixed(2)} ✓`
        : `${entry.kernelDeltaStats.stddev.toFixed(2)}`;

    log(
      `| ${entry.pipelineName.padEnd(24)} | ${compressLabel.padEnd(8)} | ${entry.densityStats.mean > 0 ? '+' : ''}${entry.densityStats.mean.toFixed(1)} | ${entry.kernelDeltaStats.mean >= 0 ? '+' : ''}${entry.kernelDeltaStats.mean.toFixed(1)} | ${kernelLabel} | ${(entry.stabilityAvg * 100).toFixed(0)}% |`,
    );
  }

  log('');
  log('target: compress 2-3x, kern.σ < 1');
  log('');

  // detailed per-pipeline
  for (const entry of statsPerPipeline) {
    log(`📋 ${entry.pipelineName}: ${entry.pipelinePress}`);
    if (entry.onVerify !== 'null') {
      log(`   ├── onVerify: ${entry.onVerify}`);
    }
    log(
      `   ├── compression: ${entry.compressionStats.mean.toFixed(2)}x (σ=${entry.compressionStats.stddev.toFixed(2)}, range=[${entry.compressionStats.min.toFixed(1)}, ${entry.compressionStats.max.toFixed(1)}])`,
    );
    log(
      `   ├── dens.Δ: ${entry.densityStats.mean > 0 ? '+' : ''}${entry.densityStats.mean.toFixed(1)} (σ=${entry.densityStats.stddev.toFixed(2)})`,
    );
    log(
      `   ├── kern.Δ: ${entry.kernelDeltaStats.mean >= 0 ? '+' : ''}${entry.kernelDeltaStats.mean.toFixed(1)} (σ=${entry.kernelDeltaStats.stddev.toFixed(2)})`,
    );
    log(
      `   └── stability: ${(entry.stabilityAvg * 100).toFixed(0)}% meanJaccard`,
    );
    log('');
  }

  // per-brief breakdown
  log('═══════════════════════════════════════════════════════════════════');
  log('📋 per-brief breakdown');
  log('═══════════════════════════════════════════════════════════════════');
  log('');

  for (const [pipelineName, pipelineResults] of byPipeline) {
    log(`### ${pipelineName}`);
    log('');
    log('| brief | compress | kern.Δ | kern.σ |');
    log('|-------|----------|--------|--------|');

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

      const compressionRatios = successful.map((r) => r.compressionRatio);
      const kernelDeltas = successful.map((r) => r.kernelDelta);
      const compressStats = computeStats(compressionRatios);
      const kernelStats = computeStats(kernelDeltas);

      log(
        `| ${briefName.padEnd(20)} | ${compressStats.mean.toFixed(1)}x | ${kernelStats.mean >= 0 ? '+' : ''}${kernelStats.mean.toFixed(1)} | ${kernelStats.stddev.toFixed(2)} |`,
      );
    }

    log('');
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
  mdLines.push(`# telegraphic perfeval results: ${ISODATE}`);
  mdLines.push('');
  mdLines.push('## goal');
  mdLines.push('');
  mdLines.push('validate GOOD density (2-3x compression) with kern.σ < 1');
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
    mdLines.push(
      `${formatPipeline(pipeline.press)}${pipeline.onVerify ? `, ver:[${pipeline.onVerify}]` : ''}`,
    );
    mdLines.push('```');
    mdLines.push('');
  }

  mdLines.push('## results');
  mdLines.push('');
  mdLines.push(
    '| pipeline | compress | dens.Δ | kern.Δ | kern.σ | stability |',
  );
  mdLines.push(
    '|----------|----------|--------|--------|--------|-----------|',
  );

  for (const entry of statsPerPipeline) {
    const compressLabel =
      entry.compressionStats.mean >= 2 && entry.compressionStats.mean <= 3
        ? `${entry.compressionStats.mean.toFixed(1)}x ✓`
        : `${entry.compressionStats.mean.toFixed(1)}x`;

    mdLines.push(
      `| ${entry.pipelineName} | ${compressLabel} | ${entry.densityStats.mean > 0 ? '+' : ''}${entry.densityStats.mean.toFixed(1)} | ${entry.kernelDeltaStats.mean >= 0 ? '+' : ''}${entry.kernelDeltaStats.mean.toFixed(1)} | ${entry.kernelDeltaStats.stddev.toFixed(2)} | ${(entry.stabilityAvg * 100).toFixed(0)}% |`,
    );
  }

  mdLines.push('');

  // recommendation
  const bestPipeline = statsPerPipeline.find(
    (p) =>
      p.compressionStats.mean >= 2 &&
      p.compressionStats.mean <= 3 &&
      p.kernelDeltaStats.stddev < 1,
  );

  if (bestPipeline) {
    mdLines.push('## recommendation');
    mdLines.push('');
    mdLines.push(
      `**${bestPipeline.pipelineName}** meets GOOD density target (2-3x) with kern.σ < 1`,
    );
    mdLines.push('');
    mdLines.push('```');
    mdLines.push(
      `${bestPipeline.pipelinePress}${bestPipeline.onVerify !== 'null' ? `, ver:[${bestPipeline.onVerify}]` : ''}`,
    );
    mdLines.push('```');
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
            onVerify: p.onVerify,
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
        statsPerPipeline,
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
  log('🐢 telegraphic perfeval complete');

  logStream.end();
};

// run main
main().catch((err) => {
  logError(`fatal error: ${err instanceof Error ? err.message : String(err)}`);
  logStream.end();
  process.exit(1);
});
