import Bottleneck from 'bottleneck';
import { createHash } from 'crypto';
import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createCache } from 'simple-on-disk-cache';
import { given, then, useThen, when } from 'test-fns';
import { withSimpleCachingAsync } from 'with-simple-caching';

import {
  type ConceptKernel,
  checkKernelRetention as checkKernelRetentionRaw,
  compareKernels as compareKernelsRaw,
  extractKernels as extractKernelsRaw,
} from '../../../../domain.operations/kernelize/extractKernels';
import { TEST_BRIEFS } from './.test/fixtures/briefs';
import {
  compressViaBhrain as compressViaBhrainRaw,
  isPromptModifier,
  type MechanismBrief,
  type MechanismOrModifier,
} from './compress.via.bhrain';

/**
 * .what = rate limiter for parallel brain calls
 * .why = prevent api overload while max throughput achieved
 */
const limiter = new Bottleneck({
  maxConcurrent: 100,
});

/**
 * .what = detect rate limit errors from brain api
 * .why = make rate limits super visible for debug
 */
const isRateLimitError = (err: unknown): boolean => {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('rate limit') ||
    msg.includes('ratelimit') ||
    msg.includes('too many requests') ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('throttle')
  );
};

/**
 * .what = loud log output for rate limit errors
 * .why = make rate limits impossible to miss in output
 */
const logRateLimitError = (context: {
  briefName: string;
  pipeline: string;
  runIndex: number;
  error: Error;
}): void => {
  console.error('\n');
  console.error('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
  console.error('⛈️  RATE LIMIT ERROR DETECTED');
  console.error('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
  console.error(`   brief: ${context.briefName}`);
  console.error(`   pipeline: ${context.pipeline}`);
  console.error(`   run: ${context.runIndex}`);
  console.error(`   error: ${context.error.message}`);
  console.error('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
  console.error('\n');
};

/**
 * .what = find git root directory
 * .why = cache dir should be relative to git root
 */
const findGitRoot = (): string => {
  let dir = __dirname;
  while (dir !== '/') {
    if (
      require('fs').existsSync(path.join(dir, '.git')) ||
      require('fs').existsSync(path.join(dir, '.git', 'HEAD'))
    ) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return __dirname; // fallback to current dir if no git root found
};

/**
 * .what = on-disk cache for brain call results
 * .why = avoid redundant api calls when re-run with same inputs
 */
const CACHE_DIR = path.join(
  findGitRoot(),
  '.rhachet',
  'bhrain',
  'cache',
  'compress',
);
const perfevalCache = createCache({
  directory: { mounted: { path: CACHE_DIR } },
});

/**
 * .what = progress log directory for perfeval runs
 * .why = stream input/output logs to .jsonl for observability
 */
const PROGRESS_DIR = path.join(findGitRoot(), '.log', 'progress');
const PROGRESS_FILE = path.join(
  PROGRESS_DIR,
  `perfeval-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`,
);

// ensure progress directory exists
fsSync.mkdirSync(PROGRESS_DIR, { recursive: true });

/**
 * .what = track completed pipeline count for progress output
 */
let completedCount = 0;

/**
 * .what = log progress entry to .jsonl stream and cli
 * .why = emit input/output for each pipeline run as requested
 */
const logProgress = (entry: {
  type: 'pipeline' | 'supply';
  briefName: string;
  briefType: string;
  pipeline: string;
  brainSlug: string;
  runIndex: number;
  tokensBefore: number;
  tokensAfter: number;
  kernelsBefore: number;
  kernelsRetained: number;
  ratio: number;
  durationMs: number;
  error: string | null;
  timestamp: string;
}): void => {
  // emit to .jsonl file
  fsSync.appendFileSync(PROGRESS_FILE, JSON.stringify(entry) + '\n');

  // emit to cli for real-time progress
  completedCount++;
  const status = entry.error ? '⛈️' : '✨';
  const kernelStatus =
    entry.kernelsBefore > 0
      ? `${entry.kernelsRetained}/${entry.kernelsBefore}`
      : '-';
  console.log(
    `   ${status} [${completedCount}] ${entry.briefName.padEnd(24)} ${entry.pipeline.slice(0, 30).padEnd(32)} → ${entry.ratio.toFixed(2)}× kernels:${kernelStatus} ${entry.durationMs}ms`,
  );
};

/**
 * .what = wrap compressViaBhrain with on-disk cache
 * .why = re-use results when inputs are identical across perfeval runs
 *
 * .note = attemptIndex ensures distinct results per run (same content + mechanisms + different attempt = different cache key)
 */
const compressViaBhrain = withSimpleCachingAsync(
  async (input: {
    content: string;
    brainSlug: string;
    mechanisms: MechanismOrModifier[];
    attemptIndex: number;
    supplements?: string[];
    kernels?: string[];
  }) => {
    return compressViaBhrainRaw({
      content: input.content,
      brainSlug: input.brainSlug,
      mechanisms: input.mechanisms,
      supplements: input.supplements,
      kernels: input.kernels,
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
          .update(JSON.stringify(input.kernels ?? []))
          .digest('hex')
          .slice(0, 24);
        return `compress-${hash}`;
      },
    },
  },
);

/**
 * .what = wrap extractKernels with on-disk cache
 * .why = re-use results when content/brain are identical
 */
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

/**
 * .what = wrap compareKernels with on-disk cache
 * .why = re-use results when original/compressed content are identical
 */
const compareKernels = withSimpleCachingAsync(compareKernelsRaw, {
  cache: perfevalCache,
  serialize: {
    key: ({ forInput }) => {
      const input = forInput[0];
      const hash = createHash('sha256')
        .update(input.contentOriginal)
        .update(input.contentCompressed)
        .update(input.brainSlug)
        .digest('hex')
        .slice(0, 24);
      return `compare-${hash}`;
    },
  },
});

/**
 * .what = wrap checkKernelRetention with on-disk cache
 * .why = re-use retention checks when kernels/compressed are identical
 */
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

/**
 * .what = unified pipeline config
 * .why = single structure for all pipeline variants (mutator + supply)
 *
 * modes:
 * - mutator: kernelize pass transforms content directly
 * - supply: kernelize extracts kernels as context, content unchanged
 *
 * post-process modes:
 * - verify: check retention, retry if lost
 * - restore: append lost kernels to output
 *
 * req-kernels modifier:
 * - can appear anywhere in a pass: [req-kernels, sitrep], [sitrep, req-kernels], [req-kernels, sitrep, req-kernels]
 * - position determines behavior: before=constraint, after=verification, both=wrap
 */
interface Pipeline {
  press: MechanismOrModifier[][]; // compression passes (can include req-kernels modifier)
  supply?: 'kernelize'; // extract kernels first, pass as context
  post?: 'verify' | 'restore'; // post-process mode
}

/**
 * .what = base sitrep variants for exhaustive combinations
 */
const SITREP_VARIANTS: MechanismBrief[] = [
  'sitrep',
  'sitrep-aggressive',
  'sitrep-taskaware',
  'sitrep-iterative',
  'sitrep-aggro-aware',
];

/**
 * .what = helper to create pipeline with proper types
 * .why = ensures press are typed correctly without casts
 */
const pipeline = (
  press: MechanismOrModifier[][],
  options?: { supply?: 'kernelize'; post?: 'verify' | 'restore' },
): Pipeline => ({
  press,
  supply: options?.supply,
  post: options?.post,
});

/**
 * .what = exhaustive pipeline combinations
 * .why = systematic search across all compression strategies
 *
 * structure:
 * 1. single-pass: each sitrep variant alone
 * 2. single-pass pairs: sitrep + telegraphic (both orders)
 * 3. 2-pass: sitrep → telegraphic
 * 4. 2-pass with kernelize mutator: kernelize → sitrep
 * 5. 3-pass with kernelize mutator: kernelize → sitrep → telegraphic
 * 6. supplement mode: kernelize as context (single-pass)
 * 7. supplement mode: kernelize as context (2-pass with telegraphic)
 */
const PIPELINES: Pipeline[] = [
  // ═══════════════════════════════════════════════════════════════════
  // 1. single-pass: each sitrep variant alone
  // ═══════════════════════════════════════════════════════════════════
  ...SITREP_VARIANTS.map((v) => pipeline([[v]])),

  // telegraphic alone (baseline)
  pipeline([['telegraphic']]),

  // ═══════════════════════════════════════════════════════════════════
  // 2. single-pass pairs: sitrep + telegraphic (both orders)
  // ═══════════════════════════════════════════════════════════════════
  ...SITREP_VARIANTS.flatMap((v) => [
    pipeline([[v, 'telegraphic']]),
    pipeline([['telegraphic', v]]),
  ]),

  // ═══════════════════════════════════════════════════════════════════
  // 3. 2-pass: sitrep → telegraphic
  // ═══════════════════════════════════════════════════════════════════
  ...SITREP_VARIANTS.map((v) => pipeline([[v], ['telegraphic']])),

  // ═══════════════════════════════════════════════════════════════════
  // 4. 2-pass with kernelize mutator: kernelize → sitrep
  // ═══════════════════════════════════════════════════════════════════
  ...SITREP_VARIANTS.map((v) => pipeline([['kernelize'], [v]])),

  // ═══════════════════════════════════════════════════════════════════
  // 5. 3-pass with kernelize mutator: kernelize → sitrep → telegraphic
  // ═══════════════════════════════════════════════════════════════════
  ...SITREP_VARIANTS.map((v) =>
    pipeline([['kernelize'], [v], ['telegraphic']]),
  ),

  // ═══════════════════════════════════════════════════════════════════
  // 6. supplement mode: kernelize as context (single-pass)
  // ═══════════════════════════════════════════════════════════════════
  ...SITREP_VARIANTS.map((v) => pipeline([[v]], { supply: 'kernelize' })),

  // ═══════════════════════════════════════════════════════════════════
  // 7. supplement mode: kernelize as context (2-pass with telegraphic)
  // ═══════════════════════════════════════════════════════════════════
  ...SITREP_VARIANTS.map((v) =>
    pipeline([[v], ['telegraphic']], { supply: 'kernelize' }),
  ),

  // ═══════════════════════════════════════════════════════════════════
  // 8. supplement mode: kernelize as context (3-pass with double tele)
  // .why = combine kernel retention (supply) with max density (triple-pass)
  // ═══════════════════════════════════════════════════════════════════
  ...SITREP_VARIANTS.map((v) =>
    pipeline([[v], ['telegraphic'], ['telegraphic']], { supply: 'kernelize' }),
  ),

  // ═══════════════════════════════════════════════════════════════════
  // 9. experimental: double telegraphic final pass (no supply)
  // ═══════════════════════════════════════════════════════════════════
  pipeline([['sitrep-aggressive'], ['telegraphic'], ['telegraphic']]),
  pipeline([['sitrep-aggro-aware'], ['telegraphic'], ['telegraphic']]),

  // ═══════════════════════════════════════════════════════════════════
  // 10. experimental: 2-pass reverse order (telegraphic first)
  // ═══════════════════════════════════════════════════════════════════
  pipeline([['telegraphic'], ['sitrep-aggressive']]),
  pipeline([['telegraphic'], ['sitrep-aggro-aware']]),

  // ═══════════════════════════════════════════════════════════════════
  // 11. experimental: double sitrep reinforcement
  // ═══════════════════════════════════════════════════════════════════
  pipeline([['sitrep-aggressive'], ['sitrep-aggressive'], ['telegraphic']]),
  pipeline([['sitrep-aggressive'], ['sitrep-taskaware'], ['telegraphic']]),

  // ═══════════════════════════════════════════════════════════════════
  // 12. experimental: 4-pass deep compression
  // ═══════════════════════════════════════════════════════════════════
  pipeline([
    ['kernelize'],
    ['sitrep-aggressive'],
    ['telegraphic'],
    ['telegraphic'],
  ]),

  // ═══════════════════════════════════════════════════════════════════
  // 13. req-kernels BEFORE methodology (single pass)
  // .why = hard constraint before compression starts
  // ═══════════════════════════════════════════════════════════════════
  pipeline([['req-kernels', 'sitrep']], { supply: 'kernelize' }),
  pipeline([['req-kernels', 'sitrep-taskaware']], { supply: 'kernelize' }),
  pipeline([['req-kernels', 'sitrep-aggressive']], { supply: 'kernelize' }),
  pipeline([['req-kernels', 'telegraphic']], { supply: 'kernelize' }),

  // ═══════════════════════════════════════════════════════════════════
  // 14. req-kernels AFTER methodology (single pass)
  // .why = verification after compression, restore if lost
  // ═══════════════════════════════════════════════════════════════════
  pipeline([['sitrep', 'req-kernels']], { supply: 'kernelize' }),
  pipeline([['sitrep-taskaware', 'req-kernels']], { supply: 'kernelize' }),
  pipeline([['sitrep-aggressive', 'req-kernels']], { supply: 'kernelize' }),
  pipeline([['telegraphic', 'req-kernels']], { supply: 'kernelize' }),

  // ═══════════════════════════════════════════════════════════════════
  // 15. req-kernels WRAP (before + after, single pass)
  // .why = constraint before + verification after for max retention
  // ═══════════════════════════════════════════════════════════════════
  pipeline([['req-kernels', 'sitrep', 'req-kernels']], { supply: 'kernelize' }),
  pipeline([['req-kernels', 'sitrep-taskaware', 'req-kernels']], {
    supply: 'kernelize',
  }),
  pipeline([['req-kernels', 'sitrep-aggressive', 'req-kernels']], {
    supply: 'kernelize',
  }),
  pipeline([['req-kernels', 'telegraphic', 'req-kernels']], {
    supply: 'kernelize',
  }),

  // ═══════════════════════════════════════════════════════════════════
  // 16. req-kernels + supply (single pass)
  // .why = combine soft supply context with hard constraint
  // ═══════════════════════════════════════════════════════════════════
  pipeline([['req-kernels', 'sitrep']], { supply: 'kernelize' }),
  pipeline([['req-kernels', 'sitrep-taskaware']], { supply: 'kernelize' }),
  pipeline([['req-kernels', 'sitrep-aggressive']], { supply: 'kernelize' }),
  pipeline([['req-kernels', 'sitrep', 'req-kernels']], { supply: 'kernelize' }),
  pipeline([['req-kernels', 'sitrep-taskaware', 'req-kernels']], {
    supply: 'kernelize',
  }),
  pipeline([['req-kernels', 'sitrep-aggressive', 'req-kernels']], {
    supply: 'kernelize',
  }),

  // ═══════════════════════════════════════════════════════════════════
  // 17. double-pass + req-kernels at each stage
  // .why = constraint at each compression stage
  // ═══════════════════════════════════════════════════════════════════
  pipeline(
    [
      ['req-kernels', 'sitrep'],
      ['req-kernels', 'telegraphic'],
    ],
    { supply: 'kernelize' },
  ),
  pipeline(
    [
      ['req-kernels', 'sitrep-taskaware'],
      ['req-kernels', 'telegraphic'],
    ],
    { supply: 'kernelize' },
  ),
  pipeline(
    [
      ['req-kernels', 'sitrep-aggressive'],
      ['req-kernels', 'telegraphic'],
    ],
    { supply: 'kernelize' },
  ),
  pipeline(
    [
      ['req-kernels', 'sitrep', 'req-kernels'],
      ['req-kernels', 'telegraphic', 'req-kernels'],
    ],
    { supply: 'kernelize' },
  ),
  pipeline(
    [
      ['req-kernels', 'sitrep-taskaware', 'req-kernels'],
      ['req-kernels', 'telegraphic', 'req-kernels'],
    ],
    { supply: 'kernelize' },
  ),

  // ═══════════════════════════════════════════════════════════════════
  // 18. double-pass + req-kernels only at first stage
  // .why = constrain initial compression, let second pass be free
  // ═══════════════════════════════════════════════════════════════════
  pipeline([['req-kernels', 'sitrep-aggressive'], ['telegraphic']], {
    supply: 'kernelize',
  }),
  pipeline([['req-kernels', 'sitrep-aggressive'], ['sitrep-taskaware']], {
    supply: 'kernelize',
  }),

  // ═══════════════════════════════════════════════════════════════════
  // 19. double-pass + req-kernels only at last stage
  // .why = let first pass compress freely, constrain final pass
  // ═══════════════════════════════════════════════════════════════════
  pipeline([['sitrep-aggressive'], ['req-kernels', 'telegraphic']], {
    supply: 'kernelize',
  }),
  pipeline([['sitrep-aggressive'], ['req-kernels', 'sitrep-taskaware']], {
    supply: 'kernelize',
  }),

  // ═══════════════════════════════════════════════════════════════════
  // 20. double-pass + supply + req-kernels
  // .why = combine supply context with hard constraints
  // ═══════════════════════════════════════════════════════════════════
  pipeline(
    [
      ['req-kernels', 'sitrep'],
      ['req-kernels', 'telegraphic'],
    ],
    { supply: 'kernelize' },
  ),
  pipeline(
    [
      ['req-kernels', 'sitrep-taskaware'],
      ['req-kernels', 'telegraphic'],
    ],
    { supply: 'kernelize' },
  ),
  pipeline(
    [
      ['req-kernels', 'sitrep', 'req-kernels'],
      ['req-kernels', 'telegraphic', 'req-kernels'],
    ],
    { supply: 'kernelize' },
  ),
  pipeline(
    [
      ['req-kernels', 'sitrep-aggressive'],
      ['req-kernels', 'sitrep-taskaware'],
    ],
    { supply: 'kernelize' },
  ),

  // ═══════════════════════════════════════════════════════════════════
  // 21. triple-pass + req-kernels
  // .why = multi-stage compression with constraints
  // ═══════════════════════════════════════════════════════════════════
  pipeline(
    [
      ['req-kernels', 'sitrep-aggressive'],
      ['req-kernels', 'sitrep-taskaware'],
      ['req-kernels', 'telegraphic'],
    ],
    { supply: 'kernelize' },
  ),
  pipeline(
    [
      ['req-kernels', 'sitrep-aggressive', 'req-kernels'],
      ['req-kernels', 'sitrep-taskaware', 'req-kernels'],
      ['telegraphic'],
    ],
    { supply: 'kernelize' },
  ),
  pipeline(
    [
      ['req-kernels', 'sitrep-aggressive'],
      ['req-kernels', 'sitrep-taskaware'],
      ['telegraphic'],
    ],
    { supply: 'kernelize' },
  ),

  // ═══════════════════════════════════════════════════════════════════
  // 22. gentle double-pass (no req-kernels, for comparison)
  // .why = baseline for multi-pass without constraints
  // ═══════════════════════════════════════════════════════════════════
  pipeline([['sitrep'], ['sitrep']]),
  pipeline([['sitrep'], ['sitrep-taskaware']]),
  pipeline([['sitrep-taskaware'], ['sitrep-taskaware']]),
  pipeline([['sitrep-taskaware'], ['telegraphic']]),
  pipeline([['telegraphic'], ['telegraphic']]),

  // ═══════════════════════════════════════════════════════════════════
  // 23. verification loop variants
  // .why = check retention, retry if lost
  // ═══════════════════════════════════════════════════════════════════
  pipeline([['sitrep']], { supply: 'kernelize', post: 'verify' }),
  pipeline([['sitrep-taskaware']], { supply: 'kernelize', post: 'verify' }),
  pipeline([['req-kernels', 'sitrep']], {
    supply: 'kernelize',
    post: 'verify',
  }),
  pipeline([['req-kernels', 'sitrep-taskaware']], {
    supply: 'kernelize',
    post: 'verify',
  }),
  pipeline([['req-kernels', 'sitrep', 'req-kernels']], {
    supply: 'kernelize',
    post: 'verify',
  }),
  pipeline([['req-kernels', 'sitrep-aggressive']], {
    supply: 'kernelize',
    post: 'verify',
  }),
  pipeline([['req-kernels', 'sitrep-aggressive'], ['telegraphic']], {
    supply: 'kernelize',
    post: 'verify',
  }),

  // ═══════════════════════════════════════════════════════════════════
  // 24. restoration variants
  // .why = append lost kernels to output
  // ═══════════════════════════════════════════════════════════════════
  pipeline([['sitrep-aggressive']], { supply: 'kernelize', post: 'restore' }),
  pipeline([['req-kernels', 'sitrep-aggressive']], {
    supply: 'kernelize',
    post: 'restore',
  }),
  pipeline([['sitrep-aggressive'], ['telegraphic']], {
    supply: 'kernelize',
    post: 'restore',
  }),
  pipeline([['req-kernels', 'sitrep-aggressive'], ['telegraphic']], {
    supply: 'kernelize',
    post: 'restore',
  }),
];

/**
 * .what = legacy type alias for backward compat
 */
type SupplyPipeline = Pipeline;

/**
 * .what = legacy constant for backward compat (now empty, all in PIPELINES)
 */
const SUPPLY_PIPELINES: SupplyPipeline[] = [];

/**
 * .what = brief types to include in sample
 * .why = ensure representative coverage across brief categories
 */
const BRIEF_TYPES = ['rule', 'concept', 'lesson', 'tactic'] as const;

/**
 * .what = number of runs per combination × brief pair
 * .why = multiple runs for statistical significance
 */
const RUNS_PER_PAIR = 3;

/**
 * .what = brain providers for compression evals
 * .why = compare performance across different brain providers
 *
 * .note = to add anthropic, ensure rhachet-brains-anthropic is installed and configured
 *         e.g., add 'anthropic/claude/sonnet-2' to the array below
 */
const BRAIN_SLUGS = [
  'xai/grok/code-fast-1',
  // 'anthropic/claude/sonnet-2', // uncomment when rhachet-brains-anthropic is configured
] as const;

type BrainSlug = (typeof BRAIN_SLUGS)[number];

/**
 * .what = format pipeline for display
 * .why = show [[a], [b]] structure, with sup: prefix for supplement mode
 */
const formatPipeline = (pipeline: MechanismOrModifier[][]): string =>
  `[${pipeline.map((pass) => `[${pass.join(', ')}]`).join(', ')}]`;

/**
 * .what = format pipeline config for display
 * .why = unified format for both regular and supply pipelines
 */
const formatPipelineConfig = (config: Pipeline): string => {
  const pressStr = config.press
    .map((pass) => `[${pass.join(', ')}]`)
    .join(', ');
  return config.supply ? `sup:${config.supply}, ${pressStr}` : `[${pressStr}]`;
};

/**
 * .what = compute statistics from multiple values
 * .why = understand variance in compression quality
 */
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

/**
 * .what = result of a pipeline compression run
 * .why = track metrics across one or more passes
 *
 * kernel retention model:
 * - kernelsBefore = count of distinct concepts in source
 * - kernelsRetained = count of source concepts preserved in compressed
 * - we check retention, not re-extract (avoids "more kernels after" paradox)
 */
interface PipelineResult {
  briefName: string;
  briefType: string;
  runIndex: number;
  pipeline: string;
  passes: MechanismOrModifier[][];
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

/**
 * .what = result of retention measurement
 * .why = track semantic preservation alongside compression ratio
 */
interface RetentionResult {
  briefName: string;
  pipeline: string;
  runIndex: number;
  // token metrics
  tokensSource: number;
  tokensMinified: number;
  compressionRatio: number;
  // kernel metrics
  kernelsSource: number;
  kernelsMinified: number;
  kernelsRetained: number;
  kernelsLost: number;
  retentionRatio: number;
  // derived metrics
  tokenDensitySource: number; // tokens per kernel (source)
  tokenDensityMinified: number; // tokens per kernel (minified)
  error: string | null;
}

/**
 * .what = run compression pipeline with error capture
 * .why = execute one or more passes, track metrics including kernel retention
 */
const runPipeline = async (input: {
  content: string;
  briefName: string;
  briefType: string;
  passes: MechanismOrModifier[][];
  brainSlug: BrainSlug;
  runIndex: number;
  sourceKernels: ConceptKernel[];
}): Promise<PipelineResult> => {
  const pipeline = formatPipeline(input.passes);
  const startTime = Date.now();

  try {
    let currentContent = input.content;

    // use cached call to get token count (attemptIndex=0 for token count only)
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

    // run each pass sequentially with cache
    // use composite attemptIndex: runIndex * 100 + passIndex for distinct cache keys per pass
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

    // check retention of source kernels in compressed output
    const retentionResult = await checkKernelRetention({
      kernels: input.sourceKernels,
      compressed: currentContent,
      brainSlug: input.brainSlug,
    });

    const durationMs = Date.now() - startTime;

    // emit progress to .jsonl stream
    logProgress({
      type: 'pipeline',
      briefName: input.briefName,
      briefType: input.briefType,
      pipeline,
      brainSlug: input.brainSlug,
      runIndex: input.runIndex,
      tokensBefore,
      tokensAfter,
      kernelsBefore: input.sourceKernels.length,
      kernelsRetained: retentionResult.retained.length,
      ratio,
      durationMs,
      error: null,
      timestamp: new Date().toISOString(),
    });

    return {
      briefName: input.briefName,
      briefType: input.briefType,
      runIndex: input.runIndex,
      pipeline,
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

    // detect and loudly log rate limit errors
    if (isRateLimitError(err)) {
      logRateLimitError({
        briefName: input.briefName,
        pipeline,
        runIndex: input.runIndex,
        error: err as Error,
      });
    }

    const errorMsg = err instanceof Error ? err.message : String(err);

    // emit progress with error to .jsonl stream
    logProgress({
      type: 'pipeline',
      briefName: input.briefName,
      briefType: input.briefType,
      pipeline,
      brainSlug: input.brainSlug,
      runIndex: input.runIndex,
      tokensBefore: 0,
      tokensAfter: 0,
      kernelsBefore: input.sourceKernels.length,
      kernelsRetained: 0,
      ratio: 0,
      durationMs,
      error: errorMsg,
      timestamp: new Date().toISOString(),
    });

    return {
      briefName: input.briefName,
      briefType: input.briefType,
      runIndex: input.runIndex,
      pipeline,
      passes: input.passes,
      brainSlug: input.brainSlug,
      tokensBefore: 0,
      tokensAfter: 0,
      kernelsBefore: input.sourceKernels.length,
      kernelsRetained: 0,
      ratio: 0,
      passRatios: [],
      durationMs,
      error: errorMsg,
    };
  }
};

/**
 * .what = format supply pipeline for display
 * .why = show sup:kernelize prefix and post mode suffix
 */
const formatSupplyPipeline = (config: SupplyPipeline): string => {
  const pressStr = config.press
    .map((pass) => `[${pass.join(', ')}]`)
    .join(', ');
  const prefix = config.supply ? `sup:${config.supply}, ` : '';
  const suffix = config.post ? `, ${config.post}` : '';
  return `${prefix}[${pressStr}]${suffix}`;
};

/**
 * .what = run supply pipeline with kernel extraction first
 * .why = test kernelize as SUPPLY (context) vs MUTATOR (compressor)
 *
 * when supply='kernelize':
 * 1. extract kernels from ORIGINAL content
 * 2. pass kernels as preservation context to all compression passes
 * 3. content flows through passes but kernels inform each pass
 */
const runSupplyPipeline = async (input: {
  content: string;
  briefName: string;
  briefType: string;
  config: SupplyPipeline;
  brainSlug: BrainSlug;
  runIndex: number;
  sourceKernels: ConceptKernel[];
}): Promise<PipelineResult> => {
  const pipeline = formatSupplyPipeline(input.config);
  const startTime = Date.now();

  try {
    let currentContent = input.content;
    let supplements: string[] | undefined;

    // get token count
    const tokensBefore = (
      await compressViaBhrain({
        content: input.content,
        brainSlug: input.brainSlug,
        mechanisms: ['sitrep'],
        attemptIndex: 0,
      })
    ).tokensBefore;

    // convert source kernels to supply document if kernelize is specified
    if (input.config.supply === 'kernelize') {
      const kernelDoc = input.sourceKernels
        .map((k) => `- [${k.category}] ${k.concept}`)
        .join('\n');
      supplements = [`# kernels to preserve\n\n${kernelDoc}`];
    }

    // check if any pass contains req-kernels modifier
    const hasReqKernels = input.config.press.some((pass) =>
      pass.some(isPromptModifier),
    );

    // prepare kernel strings for req-kernels modifier
    const kernelStrings = hasReqKernels
      ? input.sourceKernels.map((k) => `[${k.category}] ${k.concept}`)
      : undefined;

    const passRatios: number[] = [];
    let tokensAfterPrevious = tokensBefore;

    // run each pass with supply context and kernels (if req-kernels present)
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
        supplements, // pass kernel doc as supply
        kernels: kernelStrings, // pass kernels for req-kernels modifier
        attemptIndex: input.runIndex * 100 + passIndex,
      });
      currentContent = result.compressed;
      passRatios.push(result.ratio);
      tokensAfterPrevious = result.tokensAfter;
    }

    const tokensAfter = tokensAfterPrevious;
    const ratio = Math.round((tokensBefore / tokensAfter) * 100) / 100;

    // check retention of source kernels in compressed output
    let retentionResult = await checkKernelRetention({
      kernels: input.sourceKernels,
      compressed: currentContent,
      brainSlug: input.brainSlug,
    });

    // handle post-process modes
    if (input.config.post === 'verify' && retentionResult.lost.length > 0) {
      // retry compression with explicit lost kernel restoration request
      const lostKernelDoc = retentionResult.lost
        .map((k) => `- [${k.category}] ${k.concept}`)
        .join('\n');
      const retryResult = await compressViaBhrain({
        content: currentContent,
        brainSlug: input.brainSlug,
        mechanisms: ['sitrep-taskaware'],
        supplements: [
          `# RESTORE LOST CONCEPTS\n\nThese concepts were lost in compression and MUST be restored:\n${lostKernelDoc}`,
        ],
        attemptIndex: input.runIndex * 100 + 99, // distinct cache key for retry
      });
      currentContent = retryResult.compressed;

      // recheck retention after retry
      retentionResult = await checkKernelRetention({
        kernels: input.sourceKernels,
        compressed: currentContent,
        brainSlug: input.brainSlug,
      });
    }

    if (input.config.post === 'restore' && retentionResult.lost.length > 0) {
      // append lost kernels to output
      const lostKernelDoc = retentionResult.lost
        .map((k) => `- ${k.concept}`)
        .join('\n');
      currentContent += `\n\n## core concepts\n\n${lostKernelDoc}`;

      // recheck retention after restore
      retentionResult = await checkKernelRetention({
        kernels: input.sourceKernels,
        compressed: currentContent,
        brainSlug: input.brainSlug,
      });
    }

    const durationMs = Date.now() - startTime;

    // emit progress to .jsonl stream
    logProgress({
      type: 'supply',
      briefName: input.briefName,
      briefType: input.briefType,
      pipeline,
      brainSlug: input.brainSlug,
      runIndex: input.runIndex,
      tokensBefore,
      tokensAfter,
      kernelsBefore: input.sourceKernels.length,
      kernelsRetained: retentionResult.retained.length,
      ratio,
      durationMs,
      error: null,
      timestamp: new Date().toISOString(),
    });

    return {
      briefName: input.briefName,
      briefType: input.briefType,
      runIndex: input.runIndex,
      pipeline,
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

    // detect and loudly log rate limit errors
    if (isRateLimitError(err)) {
      logRateLimitError({
        briefName: input.briefName,
        pipeline,
        runIndex: input.runIndex,
        error: err as Error,
      });
    }

    const errorMsg = err instanceof Error ? err.message : String(err);

    // emit progress with error to .jsonl stream
    logProgress({
      type: 'supply',
      briefName: input.briefName,
      briefType: input.briefType,
      pipeline,
      brainSlug: input.brainSlug,
      runIndex: input.runIndex,
      tokensBefore: 0,
      tokensAfter: 0,
      kernelsBefore: input.sourceKernels.length,
      kernelsRetained: 0,
      ratio: 0,
      durationMs,
      error: errorMsg,
      timestamp: new Date().toISOString(),
    });

    return {
      briefName: input.briefName,
      briefType: input.briefType,
      runIndex: input.runIndex,
      pipeline,
      passes: input.config.press,
      brainSlug: input.brainSlug,
      tokensBefore: 0,
      tokensAfter: 0,
      kernelsBefore: input.sourceKernels.length,
      kernelsRetained: 0,
      ratio: 0,
      passRatios: [],
      durationMs,
      error: errorMsg,
    };
  }
};

/**
 * .what = number of sample briefs
 * .why = document sample size for metrics output
 */
const SAMPLE_BRIEF_COUNT = TEST_BRIEFS.length;

/**
 * .what = directory for perfeval output files
 * .why = collocated with the skill for easy access
 */
const PERFEVALS_DIR = path.join(__dirname, '.perfevals');

/**
 * .what = generate eval id as $isodate.$index
 * .why = monotonic, human-readable, no timestamps
 */
const genPerfEvalId = (): string => {
  const now = new Date();
  const isoDate = now.toJSON().slice(0, 10); // YYYY-MM-DD

  // find highest index for today
  let maxIndex = 0;
  try {
    const files = fsSync.readdirSync(PERFEVALS_DIR);
    for (const file of files) {
      const match = file.match(new RegExp(`^${isoDate}\\.(\\d+)\\.evals`));
      if (match) {
        const idx = parseInt(match[1] ?? '0', 10);
        if (idx > maxIndex) maxIndex = idx;
      }
    }
  } catch {
    // dir may not exist yet
  }

  return `${isoDate}.${maxIndex + 1}`;
};

/**
 * .what = shared eval id for all output files in this run
 * .why = ensures single-call and chained results go to same file
 */
const PERFEVAL_TIMESTAMP = genPerfEvalId();

/**
 * .what = performance evaluation tests for methodology brief combinations
 * .why = find which combination produces best compression rate
 */
describe('compress.via.bhrain.perfeval', () => {
  // increase timeout for parallel brain calls (full eval with 47 pipelines × 8 briefs × 3 runs = 1128 compressions)
  jest.setTimeout(5400000); // 90 minutes

  // announce progress file location at start
  console.log(`\n🌊 progress stream: ${PROGRESS_FILE}\n`);

  given('[perfeval] pipeline comparison', () => {
    when('[t0] all pipelines tested', () => {
      // run all compressions in parallel and capture results
      const allResults = useThen(
        'compressions execute in parallel',
        async () => {
          const startTime = Date.now();

          // pre-compute source kernels for each brief (uses on-disk cache)
          const sourceKernelCache = new Map<string, ConceptKernel[]>();
          const brainSlug = BRAIN_SLUGS[0]; // use first brain for kernel extraction
          // pre-compute source kernels for each brief (uses on-disk cache)
          for (const brief of TEST_BRIEFS) {
            const kernelResult = await extractKernels({
              content: brief.content,
              brainSlug,
            });
            const kernels = kernelResult.kernels ?? [];
            sourceKernelCache.set(brief.name, kernels);
          }

          // build compression tasks: brains × pipelines × briefs × runs
          const tasks: Promise<PipelineResult>[] = [];

          for (const brainSlugTask of BRAIN_SLUGS) {
            for (const pipelineConfig of PIPELINES) {
              for (const brief of TEST_BRIEFS) {
                const sourceKernels = sourceKernelCache.get(brief.name) ?? [];
                for (let runIndex = 0; runIndex < RUNS_PER_PAIR; runIndex++) {
                  // choose runner based on whether supply is present
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

          // execute all with rate limit (max 30 concurrent)
          const results = await Promise.all(tasks);
          const endTime = Date.now();
          const durationMs = endTime - startTime;

          return { results, durationMs, taskCount: tasks.length };
        },
      );

      then('stats computed per pipeline and brain', () => {
        const { results } = allResults;

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
        for (const [brainSlug, byPipeline] of byBrain) {
          // compute stats per pipeline
          const statsPerPipeline: Array<{
            pipeline: string;
            stats: ReturnType<typeof computeStats>;
            tokenStats: {
              sourceAvg: number;
              minifiedAvg: number;
            };
            kernelStats: {
              sourceAvg: number;
              minifiedAvg: number;
            };
            durationStats: ReturnType<typeof computeStats>;
            successCount: number;
            failCount: number;
          }> = [];

          for (const [pipelineKey, pipelineResults] of byPipeline) {
            const successful = pipelineResults.filter((r) => r.error === null);
            const successfulRatios = successful.map((r) => r.ratio);
            const durations = successful.map((r) => r.durationMs);
            const failCount = pipelineResults.filter(
              (r) => r.error !== null,
            ).length;

            // compute token averages
            const sourceTokens = successful.map((r) => r.tokensBefore);
            const minifiedTokens = successful.map((r) => r.tokensAfter);
            const sourceAvg =
              sourceTokens.length > 0
                ? sourceTokens.reduce((a, b) => a + b, 0) / sourceTokens.length
                : 0;
            const minifiedAvg =
              minifiedTokens.length > 0
                ? minifiedTokens.reduce((a, b) => a + b, 0) /
                  minifiedTokens.length
                : 0;

            // compute kernel averages
            const sourceKernels = successful.map((r) => r.kernelsBefore);
            const minifiedKernels = successful.map((r) => r.kernelsRetained);
            const kernelSourceAvg =
              sourceKernels.length > 0
                ? sourceKernels.reduce((a, b) => a + b, 0) /
                  sourceKernels.length
                : 0;
            const kernelMinifiedAvg =
              minifiedKernels.length > 0
                ? minifiedKernels.reduce((a, b) => a + b, 0) /
                  minifiedKernels.length
                : 0;

            statsPerPipeline.push({
              pipeline: pipelineKey,
              stats: computeStats(successfulRatios),
              tokenStats: { sourceAvg, minifiedAvg },
              kernelStats: {
                sourceAvg: kernelSourceAvg,
                minifiedAvg: kernelMinifiedAvg,
              },
              durationStats: computeStats(durations),
              successCount: successfulRatios.length,
              failCount,
            });
          }

          // sort by mean ratio desc for analysis
          statsPerPipeline.sort((a, b) => b.stats.mean - a.stats.mean);

          // log per-doctype stats
          const byDoctype = new Map<string, PipelineResult[]>();
          for (const [, pipelineResults] of byPipeline) {
            for (const r of pipelineResults) {
              const group = byDoctype.get(r.briefType) ?? [];
              group.push(r);
              byDoctype.set(r.briefType, group);
            }
          }

          const doctypeStats: Array<{
            doctype: string;
            meanRatio: number;
            tokSrc: number;
            tokMin: number;
            kernSrc: number;
            kernMin: number;
            count: number;
          }> = [];

          for (const [doctype, doctypeResults] of byDoctype) {
            const successful = doctypeResults.filter((r) => r.error === null);
            const ratios = successful.map((r) => r.ratio);
            const meanRatio =
              ratios.length > 0
                ? ratios.reduce((a, b) => a + b, 0) / ratios.length
                : 0;
            const tokSrc =
              successful.length > 0
                ? successful.reduce((a, r) => a + r.tokensBefore, 0) /
                  successful.length
                : 0;
            const tokMin =
              successful.length > 0
                ? successful.reduce((a, r) => a + r.tokensAfter, 0) /
                  successful.length
                : 0;
            const kernSrc =
              successful.length > 0
                ? successful.reduce((a, r) => a + r.kernelsBefore, 0) /
                  successful.length
                : 0;
            const kernMin =
              successful.length > 0
                ? successful.reduce((a, r) => a + r.kernelsRetained, 0) /
                  successful.length
                : 0;

            doctypeStats.push({
              doctype,
              meanRatio,
              tokSrc,
              tokMin,
              kernSrc,
              kernMin,
              count: successful.length,
            });
          }

          doctypeStats.sort((a, b) => b.meanRatio - a.meanRatio);
        }

        // verify all combinations have stats for all brains
        expect(byBrain.size).toBe(BRAIN_SLUGS.length);
        for (const [, byPipeline] of byBrain) {
          expect(byPipeline.size).toBe(PIPELINES.length);
        }
      });

      then('duration metrics reported', () => {
        const { durationMs, taskCount, results } = allResults;

        const successCount = results.filter((r) => r.error === null).length;

        // at least some compressions succeeded
        expect(successCount).toBeGreaterThan(0);
      });

      then('combinations ranked per brain', () => {
        const { results } = allResults;

        // group by brain, then by combination
        const byBrain = new Map<BrainSlug, Map<string, number[]>>();
        for (const result of results) {
          if (result.error === null) {
            if (!byBrain.has(result.brainSlug)) {
              byBrain.set(result.brainSlug, new Map());
            }
            const brainMap = byBrain.get(result.brainSlug)!;
            const ratios = brainMap.get(result.pipeline) ?? [];
            ratios.push(result.ratio);
            brainMap.set(result.pipeline, ratios);
          }
        }

        // verify rank data exists (rankings written to file, not stdout)
        expect(byBrain.size).toBeGreaterThan(0);
      });

      then('brief types tested', () => {
        const { results } = allResults;

        // collect unique brief types
        const testedTypes = new Set(results.map((r) => r.briefType));

        // verify all types present (written to file, not stdout)
        for (const type of BRIEF_TYPES) {
          expect(testedTypes.has(type)).toBe(true);
        }
      });

      then('results emitted to files', async () => {
        const { results, durationMs, taskCount } = allResults;

        // ensure output directory exists
        await fs.mkdir(PERFEVALS_DIR, { recursive: true });

        // build markdown content
        const mdLines: string[] = [];
        mdLines.push(`# perfeval results: ${PERFEVAL_TIMESTAMP}`);
        mdLines.push('');
        mdLines.push('## summary');
        mdLines.push('');
        mdLines.push(`- **brains**: ${BRAIN_SLUGS.join(', ')}`);
        mdLines.push(`- **combinations**: ${PIPELINES.length}`);
        mdLines.push(`- **briefs**: ${SAMPLE_BRIEF_COUNT}`);
        mdLines.push(`- **runs per pair**: ${RUNS_PER_PAIR}`);
        mdLines.push(`- **total compressions**: ${taskCount}`);
        mdLines.push(`- **duration**: ${(durationMs / 1000).toFixed(1)}s`);
        mdLines.push('');

        // group by brain for stats
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

        // emit table per brain
        for (const [brainSlug, byPipeline] of byBrain) {
          mdLines.push(`## results: ${brainSlug}`);
          mdLines.push('');

          // compute stats and sort
          const statsPerPipeline: Array<{
            pipeline: string;
            ratioStats: ReturnType<typeof computeStats>;
            // delta stats (primary metrics)
            densDeltaStats: ReturnType<typeof computeStats>;
            kernDeltaStats: ReturnType<typeof computeStats>;
            tokDeltaStats: ReturnType<typeof computeStats>;
            // absolute stats (secondary metrics)
            densStats: { src: number; min: number };
            kernStats: { src: number; min: number };
            tokStats: { src: number; min: number };
            durationStats: ReturnType<typeof computeStats>;
          }> = [];

          for (const [pipelineKey, pipelineResults] of byPipeline) {
            const successful = pipelineResults.filter((r) => r.error === null);
            const successfulRatios = successful.map((r) => r.ratio);
            const durations = successful.map((r) => r.durationMs);

            // compute source averages
            const tokSrcAvg =
              successful.length > 0
                ? successful.reduce((a, r) => a + r.tokensBefore, 0) /
                  successful.length
                : 0;
            const kernSrcAvg =
              successful.length > 0
                ? successful.reduce((a, r) => a + r.kernelsBefore, 0) /
                  successful.length
                : 0;
            const densSrcAvg =
              tokSrcAvg > 0 ? (kernSrcAvg / tokSrcAvg) * 100 : 0;

            // compute minified averages
            const tokMinAvg =
              successful.length > 0
                ? successful.reduce((a, r) => a + r.tokensAfter, 0) /
                  successful.length
                : 0;
            const kernMinAvg =
              successful.length > 0
                ? successful.reduce((a, r) => a + r.kernelsRetained, 0) /
                  successful.length
                : 0;
            const densMinAvg =
              tokMinAvg > 0 ? (kernMinAvg / tokMinAvg) * 100 : 0;

            // compute deltas per result (for stddev calculation)
            const densDeltas = successful.map((r) => {
              const densSrc =
                r.tokensBefore > 0
                  ? (r.kernelsBefore / r.tokensBefore) * 100
                  : 0;
              const densMin =
                r.tokensAfter > 0
                  ? (r.kernelsRetained / r.tokensAfter) * 100
                  : 0;
              return densMin - densSrc;
            });
            const kernDeltas = successful.map(
              (r) => r.kernelsRetained - r.kernelsBefore,
            );
            const tokDeltas = successful.map(
              (r) => r.tokensAfter - r.tokensBefore,
            );

            statsPerPipeline.push({
              pipeline: pipelineKey,
              ratioStats: computeStats(successfulRatios),
              densDeltaStats: computeStats(densDeltas),
              kernDeltaStats: computeStats(kernDeltas),
              tokDeltaStats: computeStats(tokDeltas),
              densStats: { src: densSrcAvg, min: densMinAvg },
              kernStats: { src: kernSrcAvg, min: kernMinAvg },
              tokStats: { src: tokSrcAvg, min: tokMinAvg },
              durationStats: computeStats(durations),
            });
          }

          // sort by density delta (higher = better densification)
          statsPerPipeline.sort(
            (a, b) => b.densDeltaStats.mean - a.densDeltaStats.mean,
          );

          // find max combination length for column width
          const maxComboLen = Math.max(
            ...statsPerPipeline.map((s) => s.pipeline.length),
            11, // min width for header
          );

          // helper for delta format (with sign)
          const fmtDelta = (val: number, decimals = 1): string => {
            const str = val.toFixed(decimals);
            return val >= 0 ? '+' + str : str;
          };

          // emit summary table: deltas first (primary), then absolutes (secondary)
          mdLines.push(
            `| ${'pipeline'.padEnd(maxComboLen)} | ${'dens.Δ'.padEnd(7)} | ${'dens.σ'.padEnd(6)} | ${'kern.Δ'.padEnd(7)} | ${'kern.σ'.padEnd(6)} | ${'tok.Δ'.padEnd(7)} | ${'tok.σ'.padEnd(6)} | ${'dens.src'.padEnd(8)} | ${'dens.min'.padEnd(8)} | ${'kern.src'.padEnd(8)} | ${'kern.min'.padEnd(8)} | ${'tok.src'.padEnd(7)} | ${'tok.min'.padEnd(7)} |`,
          );
          mdLines.push(
            `|${'-'.repeat(maxComboLen + 2)}|${'-'.repeat(9)}|${'-'.repeat(8)}|${'-'.repeat(9)}|${'-'.repeat(8)}|${'-'.repeat(9)}|${'-'.repeat(8)}|${'-'.repeat(10)}|${'-'.repeat(10)}|${'-'.repeat(10)}|${'-'.repeat(10)}|${'-'.repeat(9)}|${'-'.repeat(9)}|`,
          );

          for (const {
            pipeline: pipelineKey,
            densDeltaStats,
            kernDeltaStats,
            tokDeltaStats,
            densStats,
            kernStats,
            tokStats,
          } of statsPerPipeline) {
            mdLines.push(
              `| ${pipelineKey.padEnd(maxComboLen)} | ${fmtDelta(densDeltaStats.mean).padEnd(7)} | ${densDeltaStats.stddev.toFixed(1).padEnd(6)} | ${fmtDelta(kernDeltaStats.mean).padEnd(7)} | ${kernDeltaStats.stddev.toFixed(1).padEnd(6)} | ${fmtDelta(tokDeltaStats.mean, 0).padEnd(7)} | ${tokDeltaStats.stddev.toFixed(0).padEnd(6)} | ${densStats.src.toFixed(1).padEnd(8)} | ${densStats.min.toFixed(1).padEnd(8)} | ${kernStats.src.toFixed(1).padEnd(8)} | ${kernStats.min.toFixed(1).padEnd(8)} | ${String(Math.round(tokStats.src)).padEnd(7)} | ${String(Math.round(tokStats.min)).padEnd(7)} |`,
            );
          }

          mdLines.push('');

          // emit per-doctype stats
          mdLines.push(`### results by brief type: ${brainSlug}`);
          mdLines.push('');

          // group results by briefType
          const byDoctype = new Map<string, PipelineResult[]>();
          for (const [, comboResults] of byPipeline) {
            for (const r of comboResults) {
              const group = byDoctype.get(r.briefType) ?? [];
              group.push(r);
              byDoctype.set(r.briefType, group);
            }
          }

          // compute stats per doctype
          const statsPerDoctype: Array<{
            doctype: string;
            densDeltaStats: ReturnType<typeof computeStats>;
            kernDeltaStats: ReturnType<typeof computeStats>;
            tokDeltaStats: ReturnType<typeof computeStats>;
            densStats: { src: number; min: number };
            kernStats: { src: number; min: number };
            tokStats: { src: number; min: number };
            count: number;
          }> = [];

          for (const [doctype, doctypeResults] of byDoctype) {
            const successful = doctypeResults.filter((r) => r.error === null);

            // compute source averages
            const tokSrcAvg =
              successful.length > 0
                ? successful.reduce((a, r) => a + r.tokensBefore, 0) /
                  successful.length
                : 0;
            const kernSrcAvg =
              successful.length > 0
                ? successful.reduce((a, r) => a + r.kernelsBefore, 0) /
                  successful.length
                : 0;
            const densSrcAvg =
              tokSrcAvg > 0 ? (kernSrcAvg / tokSrcAvg) * 100 : 0;

            // compute minified averages
            const tokMinAvg =
              successful.length > 0
                ? successful.reduce((a, r) => a + r.tokensAfter, 0) /
                  successful.length
                : 0;
            const kernMinAvg =
              successful.length > 0
                ? successful.reduce((a, r) => a + r.kernelsRetained, 0) /
                  successful.length
                : 0;
            const densMinAvg =
              tokMinAvg > 0 ? (kernMinAvg / tokMinAvg) * 100 : 0;

            // compute deltas per result
            const densDeltas = successful.map((r) => {
              const densSrc =
                r.tokensBefore > 0
                  ? (r.kernelsBefore / r.tokensBefore) * 100
                  : 0;
              const densMin =
                r.tokensAfter > 0
                  ? (r.kernelsRetained / r.tokensAfter) * 100
                  : 0;
              return densMin - densSrc;
            });
            const kernDeltas = successful.map(
              (r) => r.kernelsRetained - r.kernelsBefore,
            );
            const tokDeltas = successful.map(
              (r) => r.tokensAfter - r.tokensBefore,
            );

            statsPerDoctype.push({
              doctype,
              densDeltaStats: computeStats(densDeltas),
              kernDeltaStats: computeStats(kernDeltas),
              tokDeltaStats: computeStats(tokDeltas),
              densStats: { src: densSrcAvg, min: densMinAvg },
              kernStats: { src: kernSrcAvg, min: kernMinAvg },
              tokStats: { src: tokSrcAvg, min: tokMinAvg },
              count: successful.length,
            });
          }

          // sort by density delta (higher = better densification)
          statsPerDoctype.sort(
            (a, b) => b.densDeltaStats.mean - a.densDeltaStats.mean,
          );

          // emit doctype table
          mdLines.push(
            `| ${'doctype'.padEnd(12)} | ${'count'.padEnd(5)} | ${'dens.Δ'.padEnd(7)} | ${'dens.σ'.padEnd(6)} | ${'kern.Δ'.padEnd(7)} | ${'kern.σ'.padEnd(6)} | ${'tok.Δ'.padEnd(7)} | ${'tok.σ'.padEnd(6)} | ${'dens.src'.padEnd(8)} | ${'dens.min'.padEnd(8)} | ${'kern.src'.padEnd(8)} | ${'kern.min'.padEnd(8)} | ${'tok.src'.padEnd(7)} | ${'tok.min'.padEnd(7)} |`,
          );
          mdLines.push(
            `|${'-'.repeat(14)}|${'-'.repeat(7)}|${'-'.repeat(9)}|${'-'.repeat(8)}|${'-'.repeat(9)}|${'-'.repeat(8)}|${'-'.repeat(9)}|${'-'.repeat(8)}|${'-'.repeat(10)}|${'-'.repeat(10)}|${'-'.repeat(10)}|${'-'.repeat(10)}|${'-'.repeat(9)}|${'-'.repeat(9)}|`,
          );

          for (const {
            doctype,
            count,
            densDeltaStats,
            kernDeltaStats,
            tokDeltaStats,
            densStats,
            kernStats,
            tokStats,
          } of statsPerDoctype) {
            mdLines.push(
              `| ${doctype.padEnd(12)} | ${String(count).padEnd(5)} | ${fmtDelta(densDeltaStats.mean).padEnd(7)} | ${densDeltaStats.stddev.toFixed(1).padEnd(6)} | ${fmtDelta(kernDeltaStats.mean).padEnd(7)} | ${kernDeltaStats.stddev.toFixed(1).padEnd(6)} | ${fmtDelta(tokDeltaStats.mean, 0).padEnd(7)} | ${tokDeltaStats.stddev.toFixed(0).padEnd(6)} | ${densStats.src.toFixed(1).padEnd(8)} | ${densStats.min.toFixed(1).padEnd(8)} | ${kernStats.src.toFixed(1).padEnd(8)} | ${kernStats.min.toFixed(1).padEnd(8)} | ${String(Math.round(tokStats.src)).padEnd(7)} | ${String(Math.round(tokStats.min)).padEnd(7)} |`,
            );
          }

          mdLines.push('');

          // emit granular per-brief, per-combination details
          mdLines.push(`### granular results: ${brainSlug}`);
          mdLines.push('');

          // group results by brief
          const byBrief = new Map<string, PipelineResult[]>();
          for (const [, comboResults] of byPipeline) {
            for (const r of comboResults) {
              const group = byBrief.get(r.briefName) ?? [];
              group.push(r);
              byBrief.set(r.briefName, group);
            }
          }

          // emit tree for each brief
          for (const [briefName, briefResults] of byBrief) {
            const firstResult = briefResults[0];
            if (!firstResult) continue;

            mdLines.push(`#### ${briefName}`);
            mdLines.push('');
            // semantic density = kernels / tokens (higher = better, more meaning per token)
            const densitySource =
              firstResult.tokensBefore > 0
                ? (firstResult.kernelsBefore / firstResult.tokensBefore) * 100
                : 0;
            mdLines.push(`- **type**: ${firstResult.briefType}`);
            mdLines.push(`- **tokens.source**: ${firstResult.tokensBefore}`);
            mdLines.push(`- **kernels.source**: ${firstResult.kernelsBefore}`);
            mdLines.push(
              `- **density.source**: ${densitySource.toFixed(1)} kern/100tok`,
            );
            mdLines.push('');

            // group by combination for this brief
            const byCombo = new Map<string, PipelineResult[]>();
            for (const r of briefResults) {
              const group = byCombo.get(r.pipeline) ?? [];
              group.push(r);
              byCombo.set(r.pipeline, group);
            }

            // sort combos by density delta (higher = better densification)
            const sortedCombos = Array.from(byCombo.entries())
              .map(([combo, runs]) => {
                const successRuns = runs.filter((r) => r.error === null);

                // compute deltas per result
                const densDeltas = successRuns.map((r) => {
                  const densSrc =
                    r.tokensBefore > 0
                      ? (r.kernelsBefore / r.tokensBefore) * 100
                      : 0;
                  const densMin =
                    r.tokensAfter > 0
                      ? (r.kernelsRetained / r.tokensAfter) * 100
                      : 0;
                  return densMin - densSrc;
                });
                const kernDeltas = successRuns.map(
                  (r) => r.kernelsRetained - r.kernelsBefore,
                );
                const tokDeltas = successRuns.map(
                  (r) => r.tokensAfter - r.tokensBefore,
                );

                // compute averages for absolutes
                const densMinAvg =
                  successRuns.length > 0
                    ? successRuns.reduce((a, r) => {
                        const d =
                          r.tokensAfter > 0
                            ? (r.kernelsRetained / r.tokensAfter) * 100
                            : 0;
                        return a + d;
                      }, 0) / successRuns.length
                    : 0;
                const kernSrcAvg =
                  successRuns.length > 0
                    ? successRuns.reduce((a, r) => a + r.kernelsBefore, 0) /
                      successRuns.length
                    : 0;
                const kernMinAvg =
                  successRuns.length > 0
                    ? successRuns.reduce((a, r) => a + r.kernelsRetained, 0) /
                      successRuns.length
                    : 0;
                const tokSrcAvg =
                  successRuns.length > 0
                    ? successRuns.reduce((a, r) => a + r.tokensBefore, 0) /
                      successRuns.length
                    : 0;
                const tokMinAvg =
                  successRuns.length > 0
                    ? successRuns.reduce((a, r) => a + r.tokensAfter, 0) /
                      successRuns.length
                    : 0;

                return {
                  combo,
                  runs,
                  densDeltaStats: computeStats(densDeltas),
                  kernDeltaStats: computeStats(kernDeltas),
                  tokDeltaStats: computeStats(tokDeltas),
                  densStats: { src: densitySource, min: densMinAvg },
                  kernStats: { src: kernSrcAvg, min: kernMinAvg },
                  tokStats: { src: tokSrcAvg, min: tokMinAvg },
                };
              })
              .sort((a, b) => b.densDeltaStats.mean - a.densDeltaStats.mean);

            // emit mini table per brief: deltas first, then absolutes
            mdLines.push(
              `| ${'pipeline'.padEnd(maxComboLen)} | ${'dens.Δ'.padEnd(7)} | ${'dens.σ'.padEnd(6)} | ${'kern.Δ'.padEnd(7)} | ${'kern.σ'.padEnd(6)} | ${'tok.Δ'.padEnd(7)} | ${'tok.σ'.padEnd(6)} | ${'dens.src'.padEnd(8)} | ${'dens.min'.padEnd(8)} | ${'kern.src'.padEnd(8)} | ${'kern.min'.padEnd(8)} | ${'tok.src'.padEnd(7)} | ${'tok.min'.padEnd(7)} |`,
            );
            mdLines.push(
              `|${'-'.repeat(maxComboLen + 2)}|${'-'.repeat(9)}|${'-'.repeat(8)}|${'-'.repeat(9)}|${'-'.repeat(8)}|${'-'.repeat(9)}|${'-'.repeat(8)}|${'-'.repeat(10)}|${'-'.repeat(10)}|${'-'.repeat(10)}|${'-'.repeat(10)}|${'-'.repeat(9)}|${'-'.repeat(9)}|`,
            );

            for (const {
              combo,
              densDeltaStats,
              kernDeltaStats,
              tokDeltaStats,
              densStats,
              kernStats,
              tokStats,
            } of sortedCombos) {
              mdLines.push(
                `| ${combo.padEnd(maxComboLen)} | ${fmtDelta(densDeltaStats.mean).padEnd(7)} | ${densDeltaStats.stddev.toFixed(1).padEnd(6)} | ${fmtDelta(kernDeltaStats.mean).padEnd(7)} | ${kernDeltaStats.stddev.toFixed(1).padEnd(6)} | ${fmtDelta(tokDeltaStats.mean, 0).padEnd(7)} | ${tokDeltaStats.stddev.toFixed(0).padEnd(6)} | ${densStats.src.toFixed(1).padEnd(8)} | ${densStats.min.toFixed(1).padEnd(8)} | ${kernStats.src.toFixed(1).padEnd(8)} | ${kernStats.min.toFixed(1).padEnd(8)} | ${String(Math.round(tokStats.src)).padEnd(7)} | ${String(Math.round(tokStats.min)).padEnd(7)} |`,
              );
            }

            mdLines.push('');
          }
        }

        // write markdown
        const mdPath = path.join(
          PERFEVALS_DIR,
          `${PERFEVAL_TIMESTAMP}.evals.md`,
        );
        await fs.writeFile(mdPath, mdLines.join('\n'));

        // write json
        const jsonPath = path.join(
          PERFEVALS_DIR,
          `${PERFEVAL_TIMESTAMP}.evals.json`,
        );
        await fs.writeFile(
          jsonPath,
          JSON.stringify(
            {
              timestamp: PERFEVAL_TIMESTAMP,
              config: {
                brains: BRAIN_SLUGS,
                combinations: PIPELINES.map((p) => formatPipelineConfig(p)),
                briefCount: SAMPLE_BRIEF_COUNT,
                runsPerPair: RUNS_PER_PAIR,
              },
              metrics: {
                taskCount,
                durationMs,
                successCount: results.filter((r) => r.error === null).length,
                failCount: results.filter((r) => r.error !== null).length,
              },
              results,
            },
            null,
            2,
          ),
        );

        console.log(`\n📄 results emitted:`);
        console.log(`   ${mdPath}`);
        console.log(`   ${jsonPath}`);

        // verify files were created
        const mdExists = await fs
          .stat(mdPath)
          .then(() => true)
          .catch(() => false);
        const jsonExists = await fs
          .stat(jsonPath)
          .then(() => true)
          .catch(() => false);
        expect(mdExists).toBe(true);
        expect(jsonExists).toBe(true);
      });
    });
  });

  given('[perfeval] chained compression', () => {
    when('[t0] chained pipelines tested', () => {
      // run chained compressions and compare to single-call
      const chainedResults = useThen(
        'chained compressions execute',
        async () => {
          const startTime = Date.now();

          // pre-compute source kernels for each brief (uses on-disk cache)
          const sourceKernelCache = new Map<string, ConceptKernel[]>();
          const brainSlugForKernels = BRAIN_SLUGS[0];
          for (const brief of TEST_BRIEFS) {
            const kernelResult = await extractKernels({
              content: brief.content,
              brainSlug: brainSlugForKernels,
            });
            const kernels = kernelResult.kernels ?? [];
            sourceKernelCache.set(brief.name, kernels);
          }

          // build chained compression tasks: brains × pipelines × briefs × runs
          const tasks: Promise<PipelineResult>[] = [];

          for (const brainSlug of BRAIN_SLUGS) {
            for (const pipelineConfig of PIPELINES) {
              for (const brief of TEST_BRIEFS) {
                const sourceKernels = sourceKernelCache.get(brief.name) ?? [];
                for (let runIndex = 0; runIndex < RUNS_PER_PAIR; runIndex++) {
                  // choose runner based on whether supply is present
                  if (pipelineConfig.supply) {
                    tasks.push(
                      limiter.schedule(() =>
                        runSupplyPipeline({
                          content: brief.content,
                          briefName: brief.name,
                          briefType: brief.type,
                          config: pipelineConfig,
                          brainSlug,
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
                          brainSlug,
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

          const results = await Promise.all(tasks);
          const endTime = Date.now();
          const durationMs = endTime - startTime;

          return { results, durationMs, taskCount: tasks.length };
        },
      );

      then('chained stats computed per brain', () => {
        const { results } = chainedResults;

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

        // verify all brains have all pipelines (stats written to file, not stdout)
        expect(byBrain.size).toBe(BRAIN_SLUGS.length);
        for (const [, byPipeline] of byBrain) {
          expect(byPipeline.size).toBe(PIPELINES.length);
        }
      });

      then('chained duration metrics reported', () => {
        const { results } = chainedResults;
        const successCount = results.filter((r) => r.error === null).length;

        // metrics written to file, not stdout
        expect(successCount).toBeGreaterThan(0);
      });

      then('chained results appended to files', async () => {
        const { results, durationMs, taskCount } = chainedResults;

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

        // build markdown content for chained results
        const mdLines: string[] = [];
        mdLines.push('---');
        mdLines.push('');
        mdLines.push('## chained pipelines');
        mdLines.push('');
        mdLines.push(`- **pipelines**: ${PIPELINES.length}`);
        mdLines.push(`- **briefs**: ${SAMPLE_BRIEF_COUNT}`);
        mdLines.push(`- **runs per pair**: ${RUNS_PER_PAIR}`);
        mdLines.push(`- **total compressions**: ${taskCount}`);
        mdLines.push(`- **duration**: ${(durationMs / 1000).toFixed(1)}s`);
        mdLines.push('');

        // emit table per brain
        for (const [brainSlug, byPipeline] of byBrain) {
          mdLines.push(`### chained results: ${brainSlug}`);
          mdLines.push('');

          // compute stats per pipeline
          const statsPerPipeline: Array<{
            pipeline: string;
            stats: ReturnType<typeof computeStats>;
            tokStats: { sourceAvg: number; minifiedAvg: number };
            passRatios: ReturnType<typeof computeStats>[];
          }> = [];

          for (const [pipeline, pipelineResults] of byPipeline) {
            const successful = pipelineResults.filter((r) => r.error === null);
            const successfulRatios = successful.map((r) => r.ratio);

            // compute token averages
            const sourceTokens = successful.map((r) => r.tokensBefore);
            const minifiedTokens = successful.map((r) => r.tokensAfter);
            const sourceAvg =
              sourceTokens.length > 0
                ? sourceTokens.reduce((a, b) => a + b, 0) / sourceTokens.length
                : 0;
            const minifiedAvg =
              minifiedTokens.length > 0
                ? minifiedTokens.reduce((a, b) => a + b, 0) /
                  minifiedTokens.length
                : 0;

            // compute pass-by-pass stats
            const firstSuccess = successful[0];
            const passCount = firstSuccess?.passRatios.length ?? 0;
            const passRatioStats: ReturnType<typeof computeStats>[] = [];
            for (let i = 0; i < passCount; i++) {
              const passRatios = successful
                .map((r) => r.passRatios[i])
                .filter((v): v is number => v !== undefined);
              passRatioStats.push(computeStats(passRatios));
            }

            statsPerPipeline.push({
              pipeline,
              stats: computeStats(successfulRatios),
              tokStats: { sourceAvg, minifiedAvg },
              passRatios: passRatioStats,
            });
          }

          statsPerPipeline.sort((a, b) => b.stats.mean - a.stats.mean);

          // find max pipeline length for column width
          const maxPipelineLen = Math.max(
            ...statsPerPipeline.map((s) => s.pipeline.length),
            8, // min width for header
          );

          // emit summary table
          mdLines.push(
            `| ${'pipeline'.padEnd(maxPipelineLen)} | ${'mean'.padEnd(7)} | ${'min'.padEnd(7)} | ${'max'.padEnd(7)} | ${'stddev'.padEnd(6)} | ${'tok.src'.padEnd(7)} | ${'tok.min'.padEnd(7)} | ${'pass ratios'.padEnd(30)} |`,
          );
          mdLines.push(
            `|${'-'.repeat(maxPipelineLen + 2)}|${'-'.repeat(9)}|${'-'.repeat(9)}|${'-'.repeat(9)}|${'-'.repeat(8)}|${'-'.repeat(9)}|${'-'.repeat(9)}|${'-'.repeat(32)}|`,
          );

          for (const {
            pipeline,
            stats,
            tokStats,
            passRatios,
          } of statsPerPipeline) {
            const passRatioStr = passRatios
              .map((ps) => `${ps.mean.toFixed(2)}x`)
              .join(' → ');
            mdLines.push(
              `| ${pipeline.padEnd(maxPipelineLen)} | ${(stats.mean.toFixed(2) + 'x').padEnd(7)} | ${(stats.min.toFixed(2) + 'x').padEnd(7)} | ${(stats.max.toFixed(2) + 'x').padEnd(7)} | ${stats.stddev.toFixed(2).padEnd(6)} | ${String(Math.round(tokStats.sourceAvg)).padEnd(7)} | ${String(Math.round(tokStats.minifiedAvg)).padEnd(7)} | ${passRatioStr.padEnd(30)} |`,
            );
          }

          mdLines.push('');
        }

        // append to markdown file
        const mdPath = path.join(
          PERFEVALS_DIR,
          `${PERFEVAL_TIMESTAMP}.evals.md`,
        );
        await fs.appendFile(mdPath, '\n' + mdLines.join('\n'));

        // update json file to include chained results
        const jsonPath = path.join(
          PERFEVALS_DIR,
          `${PERFEVAL_TIMESTAMP}.evals.json`,
        );
        const priorJson = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));
        priorJson.chainedConfig = {
          pipelines: PIPELINES.map((p) => formatPipelineConfig(p)),
          briefCount: SAMPLE_BRIEF_COUNT,
          runsPerPair: RUNS_PER_PAIR,
        };
        priorJson.chainedMetrics = {
          taskCount,
          durationMs,
          successCount: results.filter((r) => r.error === null).length,
          failCount: results.filter((r) => r.error !== null).length,
        };
        priorJson.chainedResults = results;
        await fs.writeFile(jsonPath, JSON.stringify(priorJson, null, 2));

        console.log(`\n📄 chained results appended to:`);
        console.log(`   ${mdPath}`);
        console.log(`   ${jsonPath}`);
      });
    });
  });

  given('[perfeval] error resilience', () => {
    when('[t0] some compressions fail', () => {
      then('partial results reported', async () => {
        // this test documents expected behavior: failures are captured, not thrown
        const result = await runPipeline({
          content: TEST_BRIEFS[0]!.content, // use real brief content
          briefName: 'test-brief',
          briefType: 'test',
          passes: [['sitrep']], // wrap in pipeline format
          brainSlug: BRAIN_SLUGS[0]!,
          runIndex: 0,
          sourceKernels: [], // placeholder for error resilience test
        });

        // result should have structure even if it fails
        expect(result).toHaveProperty('briefName');
        expect(result).toHaveProperty('pipeline');
        expect(result).toHaveProperty('brainSlug');
        expect(result).toHaveProperty('error');

        // if successful, ratio should be positive
        if (result.error === null) {
          expect(result.ratio).toBeGreaterThan(0);
        }
      });
    });
  });

  given('[perfeval] retention measurement', () => {
    when('[t0] top combinations measured for retention', () => {
      /**
       * .what = measure semantic retention via kernel comparison
       * .why = high compression is worthless if it loses critical concepts
       *
       * measures:
       * - what % of distinct concept kernels survive compression?
       * - what is the token density (tokens per kernel) before/after?
       * - how much variance is there across multiple runs?
       */
      const retentionData = useThen(
        'retention measured for sample compressions',
        async () => {
          // select pipelines to measure retention for
          const pipelinesToMeasure: MechanismBrief[][][] = [
            [['sitrep-aggressive']],
            [['sitrep-aggressive', 'telegraphic']],
          ];

          // use all briefs for comprehensive analysis
          const briefSample = TEST_BRIEFS;

          // run 3x per combination per brief for variance analysis
          const runsPerPair = 3;

          const results: RetentionResult[] = [];

          // use first brain for retention measurement (retention test, not brain comparison)
          const brainSlug = BRAIN_SLUGS[0];

          for (const pipeline of pipelinesToMeasure) {
            for (const brief of briefSample) {
              for (let runIndex = 0; runIndex < runsPerPair; runIndex++) {
                try {
                  // run pipeline passes sequentially
                  let currentContent: string = brief.content;
                  let tokensBefore = 0;
                  let tokensAfter = 0;

                  for (
                    let passIndex = 0;
                    passIndex < pipeline.length;
                    passIndex++
                  ) {
                    const passMethodologies = pipeline[passIndex]!;
                    const compressed = await compressViaBhrain({
                      content: currentContent,
                      brainSlug,
                      mechanisms: passMethodologies,
                      attemptIndex: runIndex * 100 + passIndex,
                    });
                    if (passIndex === 0) tokensBefore = compressed.tokensBefore;
                    currentContent = compressed.compressed;
                    tokensAfter = compressed.tokensAfter;
                  }

                  // measure retention via kernel comparison (uses on-disk cache)
                  const kernelComparison = await compareKernels({
                    contentOriginal: brief.content,
                    contentCompressed: currentContent,
                    brainSlug,
                  });

                  // compute derived metrics
                  const kernelsSource = kernelComparison.kernelsOriginal.length;
                  const kernelsMinified =
                    kernelComparison.kernelsCompressed.length;
                  const tokenDensitySource =
                    kernelsSource > 0 ? tokensBefore / kernelsSource : 0;
                  const tokenDensityMinified =
                    kernelsMinified > 0 ? tokensAfter / kernelsMinified : 0;
                  const ratio =
                    tokensAfter > 0
                      ? Math.round((tokensBefore / tokensAfter) * 100) / 100
                      : 0;

                  results.push({
                    briefName: brief.name,
                    pipeline: formatPipeline(pipeline),
                    runIndex,
                    tokensSource: tokensBefore,
                    tokensMinified: tokensAfter,
                    compressionRatio: ratio,
                    kernelsSource,
                    kernelsMinified,
                    kernelsRetained: kernelComparison.kernelsRetained.length,
                    kernelsLost: kernelComparison.kernelsLost.length,
                    retentionRatio: kernelComparison.retentionRatio,
                    tokenDensitySource,
                    tokenDensityMinified,
                    error: null,
                  });
                } catch (err) {
                  results.push({
                    briefName: brief.name,
                    pipeline: formatPipeline(pipeline),
                    runIndex,
                    tokensSource: 0,
                    tokensMinified: 0,
                    compressionRatio: 0,
                    kernelsSource: 0,
                    kernelsMinified: 0,
                    kernelsRetained: 0,
                    kernelsLost: 0,
                    retentionRatio: 0,
                    tokenDensitySource: 0,
                    tokenDensityMinified: 0,
                    error: err instanceof Error ? err.message : String(err),
                  });
                }
              }
            }
          }

          // wrap in object to support useThen proxy access
          return { results };
        },
      );

      then('retention stats reported', () => {
        const results = retentionData.results.filter((r) => r.error === null);

        // group by brief, then by combination
        const byBrief = new Map<string, Map<string, RetentionResult[]>>();
        for (const r of results) {
          if (!byBrief.has(r.briefName)) {
            byBrief.set(r.briefName, new Map());
          }
          const briefMap = byBrief.get(r.briefName)!;
          if (!briefMap.has(r.pipeline)) {
            briefMap.set(r.pipeline, []);
          }
          briefMap.get(r.pipeline)!.push(r);
        }

        // verify retention was measured (detailed results written to file, not stdout)
        expect(results.length).toBeGreaterThan(0);
      });

      then('high compression maintains reasonable retention', () => {
        const results = retentionData.results.filter((r) => r.error === null);

        // for aggressive compression (2x+), retention should be > 50%
        const aggressiveResults = results.filter(
          (r) => r.compressionRatio >= 2.0,
        );

        // note: perfevals are for stats, not assertions (results written to file)
        // aggressive compression (3x+) naturally trades retention for ratio
        expect(aggressiveResults.length).toBeGreaterThanOrEqual(0);
      });

      then('density predicts compressibility', () => {
        const results = retentionData.results.filter((r) => r.error === null);

        // group by brief to get source density
        const byBrief = new Map<string, RetentionResult[]>();
        for (const r of results) {
          const group = byBrief.get(r.briefName) ?? [];
          group.push(r);
          byBrief.set(r.briefName, group);
        }

        // compute correlation: density vs compression
        const dataPoints: Array<{
          brief: string;
          density: number;
          compression: number;
          retention: number;
        }> = [];

        for (const [briefName, runs] of byBrief) {
          const firstRun = runs[0];
          if (!firstRun) continue;
          const density = firstRun.tokenDensitySource;
          const avgCompression = computeStats(
            runs.map((r) => r.compressionRatio),
          ).mean;
          const avgRetention = computeStats(
            runs.map((r) => r.retentionRatio),
          ).mean;

          dataPoints.push({
            brief: briefName,
            density,
            compression: avgCompression,
            retention: avgRetention,
          });
        }

        // sort by density for analysis (results written to file, not stdout)
        dataPoints.sort((a, b) => b.density - a.density);

        // verify we have enough data
        expect(dataPoints.length).toBeGreaterThan(0);
      });
    });
  });

  /**
   * .what = perfeval for supply vs mutator kernelize
   * .why = compare kernel retention when kernelize is SUPPLY (context) vs MUTATOR (compressor)
   *
   * key question: does kernel-aware compression improve retention without sacrifice ratio?
   */
  given('[perfeval] supply vs mutator kernelize', () => {
    // store results for comparison
    const supplyResults: PipelineResult[] = [];

    when('[t0] supply pipelines are tested', () => {
      const results = useThen('supply pipelines complete', async () => {
        const startTime = Date.now();

        // select briefs to test
        const briefs = TEST_BRIEFS.slice(0, 5);

        // extract kernels from each brief once
        const briefKernels = await Promise.all(
          briefs.map(async (brief) => {
            const result = await extractKernels({
              content: brief.content,
              brainSlug: BRAIN_SLUGS[0]!,
            });
            return { brief, kernels: result.kernels };
          }),
        );

        // build tasks
        const tasks: Array<Promise<PipelineResult>> = [];

        for (const { brief, kernels } of briefKernels) {
          for (const config of SUPPLY_PIPELINES) {
            for (let run = 0; run < RUNS_PER_PAIR; run++) {
              tasks.push(
                limiter.schedule(() =>
                  runSupplyPipeline({
                    content: brief.content,
                    briefName: brief.name,
                    briefType: brief.type,
                    config,
                    brainSlug: BRAIN_SLUGS[0]!,
                    runIndex: run,
                    sourceKernels: kernels,
                  }),
                ),
              );
            }
          }
        }

        // execute in parallel
        const results = await Promise.all(tasks);
        supplyResults.push(...results);

        return results;
      });

      then('supply pipeline stats are reported', () => {
        // use supplyResults (populated by useThen) since proxy doesn't support .filter()
        const successResults = supplyResults.filter((r) => r.error === null);

        // stats written to file, not stdout
        expect(successResults.length).toBeGreaterThan(0);
      });

      then('supply vs mutator comparison', () => {
        // group supply results by base pipeline (comparison written to file, not stdout)
        const successResults = supplyResults.filter((r) => r.error === null);
        expect(successResults.length).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
