#!/usr/bin/env npx tsx

/**
 * .what = compress markdown via brain-powered sitrep distillation
 * .why = semantic compression that preserves decision-critical content
 *
 * usage:
 *   compress.via.bhrain.ts --from path/to/brief.md --via xai/grok/code-fast-1 --json
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { BrainChoiceNotFoundError, genContextBrain } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { parseArgs } from 'util';
import { withTimeout } from 'wrapper-fns';
import { z } from 'zod';

import { countTokens } from './compress.shared';

// resolve paths to briefs (collocated with this module)
const SITREP_BRIEF_PATH = path.join(
  __dirname,
  'briefs',
  'sitrep.methodology.md',
);

// lang.tones briefs for lowercase + turtle vibes
const LANG_TONES_DIR = path.join(
  __dirname,
  '../../briefs/practices/lang.tones',
);
const LOWERCASE_BRIEF_PATH = path.join(
  LANG_TONES_DIR,
  'rule.prefer.lowercase.md',
);
const TURTLE_BRIEF_PATH = path.join(
  LANG_TONES_DIR,
  'rule.im_an.ehmpathy_seaturtle.md',
);

/**
 * .what = sitrep prompt for brief compression
 * .why = instructs the brain to compress the source brief via sitrep methodology
 *        (the full methodology is passed via role.briefs)
 */
const SITREP_PROMPT = `compress this source brief via sitrep methodology.

first, analyze what content is decision-critical and what can be cut.
then, output the compressed brief.

source brief:`;

// parse cli args
const { values } = parseArgs({
  options: {
    from: { type: 'string' },
    via: { type: 'string' },
    into: { type: 'string' },
    json: { type: 'boolean', default: false },
  },
});

/**
 * .what = compress content via brain-powered sitrep distillation
 * .why = leverage llm to produce semantically coherent compressed output
 */
const compressViaBhrain = async (input: {
  content: string;
  brainSlug: string;
}): Promise<{
  compressed: string;
  forethought: string;
  rationale: string;
  tokensBefore: number;
  tokensAfter: number;
  ratio: number;
}> => {
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

  // load briefs as artifacts
  const sitrepBrief = genArtifactGitFile({ uri: SITREP_BRIEF_PATH });
  const lowercaseBrief = genArtifactGitFile({ uri: LOWERCASE_BRIEF_PATH });
  const turtleBrief = genArtifactGitFile({ uri: TURTLE_BRIEF_PATH });

  // compose prompt with source content
  const prompt = `${SITREP_PROMPT}\n\n${input.content}`;

  // resolve brain via auto-discovery
  const contextBrain = await genContextBrain({
    choice: { atom: input.brainSlug },
  });

  // ask brain to distill via sitrep (methodology passed via role.briefs)
  const { output } = await withTimeout(
    async () =>
      contextBrain.brain.choice.ask({
        role: { briefs: [sitrepBrief, lowercaseBrief, turtleBrief] },
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
 * .what = main entrypoint for bhrain compression mechanism
 * .why = cli interface that matches the same json contract as llmlingua mechanism
 */
const main = async (): Promise<void> => {
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

  // compress via brain
  const result = await compressViaBhrain({ content, brainSlug });

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
      prompt: SITREP_PROMPT,
      briefs: [SITREP_BRIEF_PATH, LOWERCASE_BRIEF_PATH, TURTLE_BRIEF_PATH],
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
