#!/usr/bin/env npx tsx

/**
 * .what = standalone perfeval runner for compression pipeline evaluation
 * .why = runs outside jest to avoid timeouts, streams logs to disk
 *
 * usage:
 *   npx tsx src/domain.roles/librarian/skills/brief.compress/runPerfevals.evals.ts
 *
 * output:
 *   .log/evals/compress.bhrain/$isotime/
 *     ├── progress.log   # stream progress
 *     ├── results.md     # summary markdown
 *     └── results.json   # full results
 */

import Bottleneck from 'bottleneck';
import { createHash } from 'crypto';
import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createCache } from 'simple-on-disk-cache';
import { withSimpleCachingAsync } from 'with-simple-caching';

import {
  type ConceptKernel,
  checkKernelRetention as checkKernelRetentionRaw,
  extractKernels as extractKernelsRaw,
} from '../../../../domain.operations/kernelize/extractKernels';
import { TEST_BRIEFS } from './.test/fixtures/briefs';
import {
  compressViaBhrain as compressViaBhrainRaw,
  type MechanismBrief,
} from './compress.via.bhrain';

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
  'compress.bhrain',
  ISODATE,
);
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
// rate limiter and cache setup
// ═══════════════════════════════════════════════════════════════════════════

const limiter = new Bottleneck({
  maxConcurrent: 100,
});

const CACHE_DIR = path.join(
  GIT_ROOT,
  '.rhachet',
  'bhrain',
  'cache',
  'compress',
);
const perfevalCache = createCache({
  directory: { mounted: { path: CACHE_DIR } },
});

// wrap compressViaBhrain with on-disk cache
const compressViaBhrain = withSimpleCachingAsync(
  async (input: {
    content: string;
    brainSlug: string;
    mechanisms: MechanismBrief[];
    attemptIndex: number;
    supplements?: string[];
  }) => {
    return compressViaBhrainRaw({
      content: input.content,
      brainSlug: input.brainSlug,
      mechanisms: input.mechanisms,
      supplements: input.supplements,
    });
  },
  {
    cache: perfevalCache,
    serialize: {
      key: ({ forInput }) => {
        const input = forInput[0];
        const hash = createHash('sha256')
          .update(input.content)
          .update(input.brainSlug)
          .update(JSON.stringify(input.mechanisms))
          .update(String(input.attemptIndex))
          .update(JSON.stringify(input.supplements ?? []))
          .digest('hex')
          .slice(0, 24);
        return `compress-${hash}`;
      },
    },
  },
);

// wrap extractKernels with on-disk cache
const extractKernels = withSimpleCachingAsync(extractKernelsRaw, {
  cache: perfevalCache,
  serialize: {
    key: ({ forInput }) => {
      const input = forInput[0];
      const hash = createHash('sha256')
        .update(input.content)
        .update(input.brainSlug)
        .digest('hex')
        .slice(0, 24);
      return `kernels-${hash}`;
    },
  },
});

// wrap checkKernelRetention with on-disk cache
const checkKernelRetention = withSimpleCachingAsync(checkKernelRetentionRaw, {
  cache: perfevalCache,
  serialize: {
    key: ({ forInput }) => {
      const input = forInput[0];
      const hash = createHash('sha256')
        .update(JSON.stringify(input.kernels))
        .update(input.compressed)
        .update(input.brainSlug)
        .digest('hex')
        .slice(0, 24);
      return `retention-${hash}`;
    },
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// pipeline configuration
// ═══════════════════════════════════════════════════════════════════════════

interface Pipeline {
  press: MechanismBrief[][];
  supply?: 'kernelize';
}

const SITREP_VARIANTS: MechanismBrief[] = [
  'sitrep',
  'sitrep-aggressive',
  'sitrep-taskaware',
  'sitrep-iterative',
  'sitrep-aggro-aware',
];

const pipeline = (
  press: MechanismBrief[][],
  supply?: 'kernelize',
): Pipeline => ({ press, supply });

const PIPELINES: Pipeline[] = [
  // 1. single-pass: each sitrep variant alone
  ...SITREP_VARIANTS.map((v) => pipeline([[v]])),
  pipeline([['telegraphic']]),

  // 2. single-pass pairs: sitrep + telegraphic (both orders)
  ...SITREP_VARIANTS.flatMap((v) => [
    pipeline([[v, 'telegraphic']]),
    pipeline([['telegraphic', v]]),
  ]),

  // 3. 2-pass: sitrep → telegraphic
  ...SITREP_VARIANTS.map((v) => pipeline([[v], ['telegraphic']])),

  // 4. 2-pass with kernelize mutator: kernelize → sitrep
  ...SITREP_VARIANTS.map((v) => pipeline([['kernelize'], [v]])),

  // 5. 3-pass with kernelize mutator: kernelize → sitrep → telegraphic
  ...SITREP_VARIANTS.map((v) =>
    pipeline([['kernelize'], [v], ['telegraphic']]),
  ),

  // 6. supplement mode: kernelize as context (single-pass)
  ...SITREP_VARIANTS.map((v) => pipeline([[v]], 'kernelize')),

  // 7. supplement mode: kernelize as context (2-pass with telegraphic)
  ...SITREP_VARIANTS.map((v) => pipeline([[v], ['telegraphic']], 'kernelize')),

  // 8. supplement mode: kernelize as context (3-pass with double tele)
  ...SITREP_VARIANTS.map((v) =>
    pipeline([[v], ['telegraphic'], ['telegraphic']], 'kernelize'),
  ),

  // 9. experimental: double telegraphic final pass (no supply)
  pipeline([['sitrep-aggressive'], ['telegraphic'], ['telegraphic']]),
  pipeline([['sitrep-aggro-aware'], ['telegraphic'], ['telegraphic']]),

  // 10. experimental: 2-pass reverse order (telegraphic first)
  pipeline([['telegraphic'], ['sitrep-aggressive']]),
  pipeline([['telegraphic'], ['sitrep-aggro-aware']]),

  // 11. experimental: double sitrep reinforcement
  pipeline([['sitrep-aggressive'], ['sitrep-aggressive'], ['telegraphic']]),
  pipeline([['sitrep-aggressive'], ['sitrep-taskaware'], ['telegraphic']]),

  // 12. experimental: 4-pass deep compression
  pipeline([
    ['kernelize'],
    ['sitrep-aggressive'],
    ['telegraphic'],
    ['telegraphic'],
  ]),
];

const BRAIN_SLUGS = ['xai/grok/code-fast-1'] as const;
type BrainSlug = (typeof BRAIN_SLUGS)[number];

const RUNS_PER_PAIR = 3;

// ═══════════════════════════════════════════════════════════════════════════
// result types
// ═══════════════════════════════════════════════════════════════════════════

interface PipelineResult {
  briefName: string;
  briefType: string;
  runIndex: number;
  pipeline: string;
  passes: MechanismBrief[][];
  brainSlug: BrainSlug;
  tokensBefore: number;
  tokensAfter: number;
  kernelsBefore: number;
  kernelsRetained: number;
  ratio: number;
  passRatios: number[];
  durationMs: number;
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// pipeline runners
// ═══════════════════════════════════════════════════════════════════════════

const formatPipeline = (pipeline: MechanismBrief[][]): string =>
  `[${pipeline.map((pass) => `[${pass.join(', ')}]`).join(', ')}]`;

const formatPipelineConfig = (config: Pipeline): string => {
  const pressStr = config.press
    .map((pass) => `[${pass.join(', ')}]`)
    .join(', ');
  return config.supply ? `sup:${config.supply}, ${pressStr}` : `[${pressStr}]`;
};

const runPipeline = async (input: {
  content: string;
  briefName: string;
  briefType: string;
  passes: MechanismBrief[][];
  brainSlug: BrainSlug;
  runIndex: number;
  sourceKernels: ConceptKernel[];
}): Promise<PipelineResult> => {
  const pipelineStr = formatPipeline(input.passes);
  const startTime = Date.now();

  try {
    let currentContent = input.content;

    const tokensBefore = (
      await compressViaBhrain({
        content: input.content,
        brainSlug: input.brainSlug,
        mechanisms: ['sitrep'],
        attemptIndex: 0,
      })
    ).tokensBefore;

    const passRatios: number[] = [];
    let tokensAfterPrevious = tokensBefore;

    for (let passIndex = 0; passIndex < input.passes.length; passIndex++) {
      const passMethodologies = input.passes[passIndex]!;
      const result = await compressViaBhrain({
        content: currentContent,
        brainSlug: input.brainSlug,
        mechanisms: passMethodologies,
        attemptIndex: input.runIndex * 100 + passIndex,
      });
      currentContent = result.compressed;
      passRatios.push(result.ratio);
      tokensAfterPrevious = result.tokensAfter;
    }

    const tokensAfter = tokensAfterPrevious;
    const ratio = Math.round((tokensBefore / tokensAfter) * 100) / 100;

    const retentionResult = await checkKernelRetention({
      kernels: input.sourceKernels,
      compressed: currentContent,
      brainSlug: input.brainSlug,
    });

    const durationMs = Date.now() - startTime;

    return {
      briefName: input.briefName,
      briefType: input.briefType,
      runIndex: input.runIndex,
      pipeline: pipelineStr,
      passes: input.passes,
      brainSlug: input.brainSlug,
      tokensBefore,
      tokensAfter,
      kernelsBefore: input.sourceKernels.length,
      kernelsRetained: retentionResult.retained.length,
      ratio,
      passRatios,
      durationMs,
      error: null,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    return {
      briefName: input.briefName,
      briefType: input.briefType,
      runIndex: input.runIndex,
      pipeline: pipelineStr,
      passes: input.passes,
      brainSlug: input.brainSlug,
      tokensBefore: 0,
      tokensAfter: 0,
      kernelsBefore: input.sourceKernels.length,
      kernelsRetained: 0,
      ratio: 0,
      passRatios: [],
      durationMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

const runSupplyPipeline = async (input: {
  content: string;
  briefName: string;
  briefType: string;
  config: Pipeline;
  brainSlug: BrainSlug;
  runIndex: number;
  sourceKernels: ConceptKernel[];
}): Promise<PipelineResult> => {
  const pipelineStr = formatPipelineConfig(input.config);
  const startTime = Date.now();

  try {
    let currentContent = input.content;
    let supplements: string[] | undefined;

    const tokensBefore = (
      await compressViaBhrain({
        content: input.content,
        brainSlug: input.brainSlug,
        mechanisms: ['sitrep'],
        attemptIndex: 0,
      })
    ).tokensBefore;

    if (input.config.supply === 'kernelize') {
      const kernelDoc = input.sourceKernels
        .map((k) => `- [${k.category}] ${k.concept}`)
        .join('\n');
      supplements = [`# kernels to preserve\n\n${kernelDoc}`];
    }

    const passRatios: number[] = [];
    let tokensAfterPrevious = tokensBefore;

    for (
      let passIndex = 0;
      passIndex < input.config.press.length;
      passIndex++
    ) {
      const passMechanisms = input.config.press[passIndex]!;
      const result = await compressViaBhrain({
        content: currentContent,
        brainSlug: input.brainSlug,
        mechanisms: passMechanisms,
        supplements,
        attemptIndex: input.runIndex * 100 + passIndex,
      });
      currentContent = result.compressed;
      passRatios.push(result.ratio);
      tokensAfterPrevious = result.tokensAfter;
    }

    const tokensAfter = tokensAfterPrevious;
    const ratio = Math.round((tokensBefore / tokensAfter) * 100) / 100;

    const retentionResult = await checkKernelRetention({
      kernels: input.sourceKernels,
      compressed: currentContent,
      brainSlug: input.brainSlug,
    });

    const durationMs = Date.now() - startTime;

    return {
      briefName: input.briefName,
      briefType: input.briefType,
      runIndex: input.runIndex,
      pipeline: pipelineStr,
      passes: input.config.press,
      brainSlug: input.brainSlug,
      tokensBefore,
      tokensAfter,
      kernelsBefore: input.sourceKernels.length,
      kernelsRetained: retentionResult.retained.length,
      ratio,
      passRatios,
      durationMs,
      error: null,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    return {
      briefName: input.briefName,
      briefType: input.briefType,
      runIndex: input.runIndex,
      pipeline: pipelineStr,
      passes: input.config.press,
      brainSlug: input.brainSlug,
      tokensBefore: 0,
      tokensAfter: 0,
      kernelsBefore: input.sourceKernels.length,
      kernelsRetained: 0,
      ratio: 0,
      passRatios: [],
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
  log('🐢 brief compression perfeval');
  log(`📁 output: ${LOG_DIR}`);
  log('');

  const totalStartTime = Date.now();

  // pre-compute source kernels
  const sourceKernelCache = new Map<string, ConceptKernel[]>();
  const brainSlug = BRAIN_SLUGS[0];
  log('🧠 pre-compute source kernels for each brief...');
  for (const brief of TEST_BRIEFS) {
    const kernelResult = await extractKernels({
      content: brief.content,
      brainSlug,
    });
    const kernels = kernelResult.kernels ?? [];
    sourceKernelCache.set(brief.name, kernels);
    log(`   ├── ${brief.name}: ${kernels.length} kernels`);
  }

  // build tasks
  const tasks: Promise<PipelineResult>[] = [];
  const taskDescriptions: string[] = [];

  for (const brainSlugTask of BRAIN_SLUGS) {
    for (const pipelineConfig of PIPELINES) {
      for (const brief of TEST_BRIEFS) {
        const sourceKernels = sourceKernelCache.get(brief.name) ?? [];
        for (let runIndex = 0; runIndex < RUNS_PER_PAIR; runIndex++) {
          const desc = `${brief.name} × ${formatPipelineConfig(pipelineConfig)} × run${runIndex}`;
          taskDescriptions.push(desc);

          if (pipelineConfig.supply) {
            tasks.push(
              limiter.schedule(() =>
                runSupplyPipeline({
                  content: brief.content,
                  briefName: brief.name,
                  briefType: brief.type,
                  config: pipelineConfig,
                  brainSlug: brainSlugTask,
                  runIndex,
                  sourceKernels,
                }),
              ),
            );
          } else {
            tasks.push(
              limiter.schedule(() =>
                runPipeline({
                  content: brief.content,
                  briefName: brief.name,
                  briefType: brief.type,
                  passes: pipelineConfig.press,
                  brainSlug: brainSlugTask,
                  runIndex,
                  sourceKernels,
                }),
              ),
            );
          }
        }
      }
    }
  }

  log('');
  log(
    `📊 run ${tasks.length} compressions (${BRAIN_SLUGS.length} brains × ${PIPELINES.length} pipelines × ${TEST_BRIEFS.length} briefs × ${RUNS_PER_PAIR} runs)`,
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
        if (completed % 50 === 0 || completed === tasks.length) {
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
  const byBrain = new Map<BrainSlug, Map<string, PipelineResult[]>>();
  for (const result of results) {
    if (!byBrain.has(result.brainSlug)) {
      byBrain.set(result.brainSlug, new Map());
    }
    const brainMap = byBrain.get(result.brainSlug)!;
    const group = brainMap.get(result.pipeline) ?? [];
    group.push(result);
    brainMap.set(result.pipeline, group);
  }

  // log comparison table for each brain
  for (const [brainSlugKey, byPipeline] of byBrain) {
    const statsPerPipeline: Array<{
      pipeline: string;
      stats: ReturnType<typeof computeStats>;
      kernelStats: { sourceAvg: number; minifiedAvg: number };
    }> = [];

    for (const [pipelineKey, pipelineResults] of byPipeline) {
      const successful = pipelineResults.filter((r) => r.error === null);
      const successfulRatios = successful.map((r) => r.ratio);

      const kernelSourceAvg =
        successful.length > 0
          ? successful.reduce((a, r) => a + r.kernelsBefore, 0) /
            successful.length
          : 0;
      const kernelMinifiedAvg =
        successful.length > 0
          ? successful.reduce((a, r) => a + r.kernelsRetained, 0) /
            successful.length
          : 0;

      statsPerPipeline.push({
        pipeline: pipelineKey,
        stats: computeStats(successfulRatios),
        kernelStats: {
          sourceAvg: kernelSourceAvg,
          minifiedAvg: kernelMinifiedAvg,
        },
      });
    }

    statsPerPipeline.sort((a, b) => b.stats.mean - a.stats.mean);

    log(`📊 methodology comparison [${brainSlugKey}]:`);
    log('');
    log('| pipeline | mean | min | max | kern.ret |');
    log('|----------|------|-----|-----|----------|');

    for (const {
      pipeline: pipelineKey,
      stats,
      kernelStats,
    } of statsPerPipeline) {
      const retentionPct =
        kernelStats.sourceAvg > 0
          ? Math.round((kernelStats.minifiedAvg / kernelStats.sourceAvg) * 100)
          : 0;
      log(
        `| ${pipelineKey.padEnd(50)} | ${stats.mean.toFixed(2)}x | ${stats.min.toFixed(2)}x | ${stats.max.toFixed(2)}x | ${retentionPct}% |`,
      );
    }

    log('');

    // rank top 10
    log(`🏆 top 10 [${brainSlugKey}]:`);
    statsPerPipeline.slice(0, 10).forEach((entry, index) => {
      log(
        `   ${index + 1}. ${entry.pipeline}: ${entry.stats.mean.toFixed(2)}x`,
      );
    });
    log('');
  }

  // duration metrics
  log('⏱️  duration metrics:');
  log(`   total: ${(totalDurationMs / 1000).toFixed(1)}s`);
  log(
    `   avg per compression: ${(totalDurationMs / tasks.length).toFixed(0)}ms`,
  );
  log(`   success: ${successCount}/${tasks.length}`);
  log(`   failed: ${failCount}/${tasks.length}`);
  log('');

  // write results to files
  const mdPath = path.join(LOG_DIR, 'results.md');
  const jsonPath = path.join(LOG_DIR, 'results.json');

  // build markdown
  const mdLines: string[] = [];
  mdLines.push(`# perfeval results: ${ISODATE}`);
  mdLines.push('');
  mdLines.push('## summary');
  mdLines.push('');
  mdLines.push(`- **brains**: ${BRAIN_SLUGS.join(', ')}`);
  mdLines.push(`- **pipelines**: ${PIPELINES.length}`);
  mdLines.push(`- **briefs**: ${TEST_BRIEFS.length}`);
  mdLines.push(`- **runs per pair**: ${RUNS_PER_PAIR}`);
  mdLines.push(`- **total compressions**: ${tasks.length}`);
  mdLines.push(`- **duration**: ${(totalDurationMs / 1000).toFixed(1)}s`);
  mdLines.push(`- **success**: ${successCount}/${tasks.length}`);
  mdLines.push('');

  for (const [brainSlugKey, byPipeline] of byBrain) {
    mdLines.push(`## results: ${brainSlugKey}`);
    mdLines.push('');

    const statsPerPipeline: Array<{
      pipeline: string;
      stats: ReturnType<typeof computeStats>;
      kernelStats: { sourceAvg: number; minifiedAvg: number };
    }> = [];

    for (const [pipelineKey, pipelineResults] of byPipeline) {
      const successful = pipelineResults.filter((r) => r.error === null);
      const successfulRatios = successful.map((r) => r.ratio);

      const kernelSourceAvg =
        successful.length > 0
          ? successful.reduce((a, r) => a + r.kernelsBefore, 0) /
            successful.length
          : 0;
      const kernelMinifiedAvg =
        successful.length > 0
          ? successful.reduce((a, r) => a + r.kernelsRetained, 0) /
            successful.length
          : 0;

      statsPerPipeline.push({
        pipeline: pipelineKey,
        stats: computeStats(successfulRatios),
        kernelStats: {
          sourceAvg: kernelSourceAvg,
          minifiedAvg: kernelMinifiedAvg,
        },
      });
    }

    statsPerPipeline.sort((a, b) => b.stats.mean - a.stats.mean);

    mdLines.push('| pipeline | mean | min | max | stddev | kern.ret |');
    mdLines.push('|----------|------|-----|-----|--------|----------|');

    for (const {
      pipeline: pipelineKey,
      stats,
      kernelStats,
    } of statsPerPipeline) {
      const retentionPct =
        kernelStats.sourceAvg > 0
          ? Math.round((kernelStats.minifiedAvg / kernelStats.sourceAvg) * 100)
          : 0;
      mdLines.push(
        `| ${pipelineKey} | ${stats.mean.toFixed(2)}x | ${stats.min.toFixed(2)}x | ${stats.max.toFixed(2)}x | ${stats.stddev.toFixed(2)} | ${retentionPct}% |`,
      );
    }

    mdLines.push('');
  }

  await fs.writeFile(mdPath, mdLines.join('\n'));
  await fs.writeFile(
    jsonPath,
    JSON.stringify(
      {
        config: {
          brains: BRAIN_SLUGS,
          pipelines: PIPELINES.map((p) => formatPipelineConfig(p)),
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
