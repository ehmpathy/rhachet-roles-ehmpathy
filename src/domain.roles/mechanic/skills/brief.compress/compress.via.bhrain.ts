#!/usr/bin/env npx tsx

/**
 * .what = compress markdown via brain-powered sitrep distillation
 * .why = semantic compression that preserves decision-critical content
 *
 * usage:
 *   compress.via.bhrain.ts --from path/to/brief.md --via xai/grok/code-fast-1 --json
 *   compress.via.bhrain.ts --from path/to/brief.md --via xai/grok/code-fast-1 --force
 *
 * note:
 *   - results are cached to .rhachet/bhrain/cache/compress/
 *   - cache key is based on content hash + brain + mechanisms
 *   - cache auto-invalidates when source content changes
 *   - use --force to bypass cache and re-compress
 */

import { createHash } from 'crypto';
import { existsSync } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BrainChoiceNotFoundError, genContextBrain } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { createCache } from 'simple-on-disk-cache';
import { parseArgs } from 'util';
import { withSimpleCachingAsync } from 'with-simple-caching';
import { withTimeout } from 'wrapper-fns';
import { z } from 'zod';

import { countTokens } from './compress.shared';

/**
 * .what = find git repo root directory (sync)
 * .why = cache setup needs sync resolution at module load time
 */
const getGitRepoRootSync = (from: string): string => {
  let dir = from;
  while (dir !== '/') {
    if (existsSync(path.join(dir, '.git'))) return dir;
    dir = path.dirname(dir);
  }
  return from;
};

// setup on-disk cache for compression results
const CACHE_DIR = path.join(
  getGitRepoRootSync(__dirname),
  '.rhachet',
  'bhrain',
  'cache',
  'compress',
);
const compressionCache = createCache({
  directory: { mounted: { path: CACHE_DIR } },
});

// resolve paths to briefs (collocated with this module)
export const SITREP_BRIEF_PATH = path.join(
  __dirname,
  'briefs',
  'sitrep.methodology.md',
);
export const TELEGRAPHIC_BRIEF_PATH = path.join(
  __dirname,
  'briefs',
  'tsc.methodology.md',
);

// experimental methodology variants
export const SITREP_AGGRESSIVE_BRIEF_PATH = path.join(
  __dirname,
  'briefs',
  'sitrep.aggressive.methodology.md',
);
export const SITREP_TASKAWARE_BRIEF_PATH = path.join(
  __dirname,
  'briefs',
  'sitrep.taskaware.methodology.md',
);
export const SITREP_ITERATIVE_BRIEF_PATH = path.join(
  __dirname,
  'briefs',
  'sitrep.iterative.methodology.md',
);
export const KERNELIZE_BRIEF_PATH = path.join(
  __dirname,
  'briefs',
  'kernelize.methodology.md',
);
export const SITREP_AGGRO_AWARE_BRIEF_PATH = path.join(
  __dirname,
  'briefs',
  'sitrep.aggro-aware.methodology.md',
);

// lang.tones briefs for lowercase + turtle vibes
const LANG_TONES_DIR = path.join(
  __dirname,
  '../../briefs/practices/lang.tones',
);
export const LOWERCASE_BRIEF_PATH = path.join(
  LANG_TONES_DIR,
  'rule.prefer.lowercase.md',
);
export const TURTLE_BRIEF_PATH = path.join(
  LANG_TONES_DIR,
  'rule.im_an.ehmpathy_seaturtle.md',
);

/**
 * .what = methodology brief identifiers for compression
 * .why = enables configurable combinations for perfeval comparison
 */
export type MechanismBrief =
  | 'sitrep'
  | 'telegraphic'
  | 'sitrep-aggressive'
  | 'sitrep-taskaware'
  | 'sitrep-iterative'
  | 'sitrep-aggro-aware'
  | 'kernelize';

/**
 * .what = map methodology names to brief paths
 * .why = enables dynamic brief selection
 */
export const METHODOLOGY_BRIEF_PATHS: Record<MechanismBrief, string> = {
  sitrep: SITREP_BRIEF_PATH,
  telegraphic: TELEGRAPHIC_BRIEF_PATH,
  'sitrep-aggressive': SITREP_AGGRESSIVE_BRIEF_PATH,
  'sitrep-taskaware': SITREP_TASKAWARE_BRIEF_PATH,
  'sitrep-iterative': SITREP_ITERATIVE_BRIEF_PATH,
  'sitrep-aggro-aware': SITREP_AGGRO_AWARE_BRIEF_PATH,
  kernelize: KERNELIZE_BRIEF_PATH,
};

/**
 * .what = generate prompt based on methodology combination
 * .why = prompt should reflect which mechanisms are in use
 */
const genCompressionPrompt = (
  mechanisms: MechanismBrief[],
  supplements?: string[],
): string => {
  const methodologyList = mechanisms.join(' + ');

  // base prompt
  let prompt = `compress this source brief via ${methodologyList} mechanisms.

target: at least 2x compression ratio (output MUST be ≤50% of input tokens)

output format: raw markdown, no preamble, no wrapper.`;

  // add supplement context if provided
  if (supplements && supplements.length > 0) {
    prompt += `

SUPPLEMENT CONTEXT (use this to inform your compression):
---
${supplements.join('\n---\n')}
---`;
  }

  prompt += `

source brief:`;

  return prompt;
};

/**
 * .what = default methodology combination for single-pass compression
 * .why = sitrep-aggressive achieves 2.84x mean compression vs 1.30x for sitrep+telegraphic
 *
 * .note = perfeval results (2026-02-12) show multi-pass pipelines perform even better:
 *   - [[kernelize], [sitrep-aggro-aware], [telegraphic]] = 3.73x (best ratio, 45% kernel retention)
 *   - [[kernelize], [sitrep-aggressive], [telegraphic]] = 3.03x (balanced, 54% kernel retention)
 *   - [[sitrep-aggro-aware], [telegraphic]] = 2.87x (fast, no kernelize pass)
 *   multi-pass support would require chained compression implementation
 */
const DEFAULT_METHODOLOGIES: MechanismBrief[] = ['sitrep-aggressive'];

/**
 * .what = parse cli args only when run directly
 * .why = avoid conflicts when module is imported by tests
 */
const getCliValues = () => {
  const { values } = parseArgs({
    options: {
      from: { type: 'string' },
      via: { type: 'string' },
      into: { type: 'string' },
      json: { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
    },
  });
  return values;
};

/**
 * .what = compression result type
 * .why = shared type for all compression functions
 */
export interface CompressionResult {
  compressed: string;
  forethought: string;
  rationale: string;
  tokensBefore: number;
  tokensAfter: number;
  ratio: number;
}

/**
 * .what = core compression logic (internal, wrapped with cache)
 * .why = leverage llm to produce semantically coherent compressed output
 */
const _compressViaBhrain = async (input: {
  content: string;
  brainSlug: string;
  mechanisms?: MechanismBrief[];
  supplements?: string[];
  force?: boolean;
}): Promise<CompressionResult> => {
  const mechanisms = input.mechanisms ?? DEFAULT_METHODOLOGIES;

  // handle empty content
  const tokensBefore = await countTokens({ text: input.content });
  if (tokensBefore === 0) {
    return {
      compressed: '',
      forethought: '',
      rationale: '',
      tokensBefore: 0,
      tokensAfter: 0,
      ratio: 1,
    };
  }

  // load methodology briefs as artifacts (in specified order)
  const methodologyBriefArtifacts = mechanisms.map((m) =>
    genArtifactGitFile({ uri: METHODOLOGY_BRIEF_PATHS[m] }),
  );

  // load lang.tones briefs for lowercase + turtle vibes
  const lowercaseBrief = genArtifactGitFile({ uri: LOWERCASE_BRIEF_PATH });
  const turtleBrief = genArtifactGitFile({ uri: TURTLE_BRIEF_PATH });

  // compose prompt with source content (include supplements if provided)
  const prompt = `${genCompressionPrompt(mechanisms, input.supplements)}\n\n${input.content}`;

  // resolve brain via auto-discovery
  const contextBrain = await genContextBrain({
    choice: { atom: input.brainSlug },
  });

  // ask brain to distill via specified mechanisms (passed via role.briefs)
  // note: lang tone briefs doubled for emphasis (brain sometimes ignores them)
  const { output } = await withTimeout(
    async () =>
      contextBrain.brain.choice.ask({
        role: {
          briefs: [
            ...methodologyBriefArtifacts,
            lowercaseBrief,
            turtleBrief,
            lowercaseBrief,
            turtleBrief,
          ],
        },
        prompt,
        schema: {
          output: z.object({
            forethought: z
              .string()
              .describe(
                'what is this brief about? what is its purpose? who is the audience?',
              ),
            rationale: z
              .string()
              .describe(
                'what content is decision-critical and must be kept? what can be cut? which examples to keep vs discard?',
              ),
            sitrep: z.string().describe('the compressed brief as raw markdown'),
          }),
        },
      }),
    { threshold: { seconds: 60 } },
  )();

  const compressed = output.sitrep;
  const { forethought, rationale } = output;

  // count tokens after compression
  const tokensAfter = await countTokens({ text: compressed });

  return {
    compressed,
    forethought,
    rationale,
    tokensBefore,
    tokensAfter,
    ratio: Math.round((tokensBefore / tokensAfter) * 100) / 100,
  };
};

/**
 * .what = generate cache key from compression inputs
 * .why = content hash ensures cache auto-invalidates when source changes
 */
const genCacheKey = (input: {
  content: string;
  brainSlug: string;
  mechanisms: MechanismBrief[];
  supplements?: string[];
}): string => {
  const hash = createHash('sha256')
    .update(input.content)
    .update(input.brainSlug)
    .update(JSON.stringify(input.mechanisms))
    .update(JSON.stringify(input.supplements ?? []))
    .digest('hex')
    .slice(0, 24);
  return `compress-${hash}`;
};

/**
 * .what = compress content via brain-powered sitrep distillation
 * .why = leverage llm with on-disk cache to avoid redundant api calls
 *
 * note: cache key is derived from content hash + brain + mechanisms
 *       - cache auto-invalidates when source content changes
 *       - use force=true to bypass cache lookup
 */
export const compressViaBhrain = withSimpleCachingAsync(_compressViaBhrain, {
  cache: compressionCache,
  serialize: {
    key: ({ forInput: [input] }) =>
      genCacheKey({
        content: input.content,
        brainSlug: input.brainSlug,
        mechanisms: input.mechanisms ?? DEFAULT_METHODOLOGIES,
        supplements: input.supplements,
      }),
  },
  bypass: {
    get: ([input]) => input.force === true,
  },
});

/**
 * .what = main entrypoint for bhrain compression mechanism
 * .why = cli interface that matches the same json contract as llmlingua mechanism
 */
const main = async (): Promise<void> => {
  const values = getCliValues();
  const brainSlug = values.via;

  // require --via
  if (!brainSlug) {
    console.error(
      JSON.stringify({
        error: 'absent brain',
        message: '--via is required (brain slug, e.g., xai/grok/code-fast-1)',
      }),
    );
    process.exit(1);
  }

  // require --from
  if (!values.from) {
    console.error(
      JSON.stringify({
        error: 'absent input',
        message: '--from is required',
      }),
    );
    process.exit(1);
  }

  // read input file
  const content = await fs.readFile(values.from, 'utf-8');

  // compress via brain (with force flag for cache bypass)
  const result = await compressViaBhrain({
    content,
    brainSlug,
    force: values.force,
  });

  // write output file directly if --into specified (avoids shell string issues)
  if (values.into) {
    await fs.mkdir(path.dirname(values.into), { recursive: true });
    await fs.writeFile(values.into, result.compressed, 'utf-8');

    // write .meta file for observability
    const metaPath = `${values.into}.meta`;
    const meta = {
      press: 'bhrain/sitrep',
      brain: brainSlug,
      from: values.from,
      into: values.into,
      command: `compress.via.bhrain.ts --from ${values.from} --via ${brainSlug} --into ${values.into}`,
      prompt: genCompressionPrompt(DEFAULT_METHODOLOGIES),
      mechanisms: DEFAULT_METHODOLOGIES,
      briefs: [
        ...DEFAULT_METHODOLOGIES.map((m) => METHODOLOGY_BRIEF_PATHS[m]),
        LOWERCASE_BRIEF_PATH,
        TURTLE_BRIEF_PATH,
      ],
      forethought: result.forethought,
      rationale: result.rationale,
      tokensBefore: result.tokensBefore,
      tokensAfter: result.tokensAfter,
      ratio: result.ratio,
    };
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  }

  // emit result (without compressed content when --into is used, to keep json small)
  if (values.json) {
    const output = values.into
      ? {
          tokensBefore: result.tokensBefore,
          tokensAfter: result.tokensAfter,
          ratio: result.ratio,
          wrote: values.into,
          meta: `${values.into}.meta`,
        }
      : result;
    console.log(JSON.stringify(output));
  } else {
    console.log(`tokens.before: ${result.tokensBefore}`);
    console.log(`tokens.after: ${result.tokensAfter}`);
    console.log(`ratio: ${result.ratio}x`);
    if (values.into) {
      console.log(`wrote: ${values.into}`);
      console.log(`meta: ${values.into}.meta`);
    } else {
      console.log('---');
      console.log(result.compressed);
    }
  }
};

// run main only when executed directly, not when imported
if (require.main === module) {
  main().catch((error) => {
    // catch brain choice resolution errors with clear message
    if (error instanceof BrainChoiceNotFoundError) {
      console.error(
        JSON.stringify({
          error: 'brain not found',
          message: error.message,
        }),
      );
      process.exit(1);
    }

    console.error(
      JSON.stringify({
        error: 'compression failed',
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exit(1);
  });
}
