#!/usr/bin/env npx tsx

/**
 * .what = compress markdown via LLMLingua-2 token classification
 * .why = remove redundant tokens while semantic intent is preserved
 *
 * usage:
 *   compress.via.llmlingua.ts --from path/to/brief.md --via tinybert --rate 0.25 --json
 *   compress.via.llmlingua.ts --check --via tinybert
 */

import * as fs from 'fs/promises';
import { parseArgs } from 'util';

import { countTokens } from './compress.shared';

// parse cli args
const { values } = parseArgs({
  options: {
    from: { type: 'string' },
    into: { type: 'string' },
    via: { type: 'string', default: 'tinybert' },
    rate: { type: 'string', default: '0.25' },
    check: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
  },
});

// model configuration
const MODEL_CONFIG: Record<
  string,
  {
    id: string;
    factory: 'bert' | 'xlm-roberta';
    options?: Record<string, unknown>;
  }
> = {
  tinybert: {
    id: 'atjsh/llmlingua-2-js-tinybert-meetingbank',
    factory: 'bert',
  },
  mobilebert: {
    id: 'atjsh/llmlingua-2-js-mobilebert-meetingbank',
    factory: 'bert',
  },
  bert: {
    id: 'Arcoldd/llmlingua4j-bert-base-onnx',
    factory: 'bert',
    options: { subfolder: '' },
  },
  'xlm-roberta': {
    id: 'atjsh/llmlingua-2-js-xlm-roberta-large-meetingbank',
    factory: 'xlm-roberta',
    options: { use_external_data_format: true },
  },
};

/**
 * .what = create compressor instance via LLMLingua-2 factory
 * .why = abstract model-specific factory selection
 */
const createCompressor = async (input: { mech: string }) => {
  const { LLMLingua2 } = await import('@atjsh/llmlingua-2');
  const { getEncoding } = await import('js-tiktoken');

  const config = MODEL_CONFIG[input.mech] ?? MODEL_CONFIG['tinybert']!;
  const oaiTokenizer = getEncoding('cl100k_base');

  const factoryOptions = {
    transformerJSConfig: {
      device: 'cpu' as const,
      dtype: 'fp32' as const,
    },
    oaiTokenizer,
    modelSpecificOptions: config.options ?? null,
    logger: () => {}, // suppress verbose output
  };

  if (config.factory === 'xlm-roberta') {
    const { promptCompressor } = await LLMLingua2.WithXLMRoBERTa(
      config.id,
      factoryOptions,
    );
    return promptCompressor;
  }

  const { promptCompressor } = await LLMLingua2.WithBERTMultilingual(
    config.id,
    factoryOptions,
  );
  return promptCompressor;
};

/**
 * .what = compress content via LLMLingua-2
 * .why = reduce tokens while intent is preserved
 */
const computeCompression = async (input: {
  content: string;
  mech: string;
  rate: number;
}): Promise<{
  compressed: string;
  tokensBefore: number;
  tokensAfter: number;
  ratio: number;
}> => {
  // create compressor
  const compressor = await createCompressor({ mech: input.mech });

  // compress with rate
  const rawCompressed = await compressor.compress_prompt(input.content, {
    rate: input.rate,
    force_tokens: ['\n', '.', '!', '?', ',', '```', '#', '*', '-', '|', ':'],
    chunk_end_tokens: ['.', '\n'],
    drop_consecutive: true,
  });

  // strip BERT vocabulary artifacts (e.g., "new0", "unused0") that leak through reconstruction
  const compressed = rawCompressed
    .replace(/\bnew\d+\b/g, '')
    // collapse consecutive punctuation chains (e.g., ".,,.  -.,.,") → "." if period present, else ","
    .replace(/[\s]*[.,-]{2,}[\s.,-]*/g, (match) =>
      match.includes('.') ? '.' : ',',
    )
    .replace(/ {2,}/g, ' ')
    .trim();

  // count tokens
  const tokensBefore = await countTokens({ text: input.content });
  const tokensAfter = await countTokens({ text: compressed });

  return {
    compressed,
    tokensBefore,
    tokensAfter,
    ratio: Math.round((tokensBefore / tokensAfter) * 100) / 100,
  };
};

/**
 * .what = check if mech is available
 * .why = early detection of absent dependencies
 */
const checkMech = async (input: { mech: string }): Promise<boolean> => {
  try {
    await createCompressor({ mech: input.mech });
    return true;
  } catch {
    return false;
  }
};

// main
const main = async (): Promise<void> => {
  const mech = values.via ?? 'tinybert';
  const rate = parseFloat(values.rate ?? '0.25');

  // handle --check mode
  if (values.check) {
    const available = await checkMech({ mech });
    if (available) {
      console.log(JSON.stringify({ available: true, mech }));
      process.exit(0);
    } else {
      console.error(
        JSON.stringify({
          available: false,
          mech,
          error: 'model not found',
          message: `${mech} model not available`,
          install: 'npm install @atjsh/llmlingua-2',
        }),
      );
      process.exit(1);
    }
  }

  // require --from for compression
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

  // compress
  const result = await computeCompression({ content, mech, rate });

  // write output file directly if --into specified (avoids shell string issues)
  if (values.into) {
    await fs.mkdir(require('path').dirname(values.into), { recursive: true });
    await fs.writeFile(values.into, result.compressed, 'utf-8');
  }

  // emit result (without compressed content when --into is used, to keep json small)
  if (values.json) {
    const output = values.into
      ? {
          tokensBefore: result.tokensBefore,
          tokensAfter: result.tokensAfter,
          ratio: result.ratio,
          wrote: values.into,
        }
      : result;
    console.log(JSON.stringify(output));
  } else {
    console.log(`tokens.before: ${result.tokensBefore}`);
    console.log(`tokens.after: ${result.tokensAfter}`);
    console.log(`ratio: ${result.ratio}x`);
    if (values.into) {
      console.log(`wrote: ${values.into}`);
    } else {
      console.log('---');
      console.log(result.compressed);
    }
  }
};

main().catch((error) => {
  console.error(
    JSON.stringify({
      error: 'compression failed',
      message: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
});
