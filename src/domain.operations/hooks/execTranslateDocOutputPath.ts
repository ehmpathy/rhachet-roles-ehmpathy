import type { ContextLogTrail } from 'as-procedure';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { InvokeOpts } from 'rhachet';
import { isPresent } from 'type-fns';

import { decodeDocOutputPath } from './decodeDocOutputPath';
import { relateDocOutputPath } from './relateDocOutputPath';

/**
 * .what = execute the translation of a doc output path
 * .why =
 *   - given @translate(references.1)
 *   - then, want to apply a standard transformation onto it
 * .how =
 *   - .[doctype] replaced
 *   - .vNiN trail markers preserved as prefix before .[doctype]
 *   - .v1 always started with, to facilitate subsequent trails
 *   - .rel(...) optionally re-roots the prefix directory relatively
 */
export const execTranslateDocOutputPath = (
  opts: InvokeOpts<{ ask: string; config: string }>,
  context?: ContextLogTrail,
): InvokeOpts<{ ask: string; config: string }> => {
  // if no .output or not a string, nothing to do
  if (typeof opts.output !== 'string') return opts;

  // if not starts with @translate(, nothing to do
  if (!opts.output.startsWith('@translate(')) return opts;

  // if not @translate(references.0), fail fast
  if (!opts.output.startsWith('@translate(references.0)'))
    throw new BadRequestError(
      'unsupported @translation source. today, only "references.0" is supported',
      { opts },
    );

  // grab the "as" doctype, from @translate(references.0).as(doctype)
  const doctypeAs =
    opts.output.match(/\.as\(([^)]+)\)/i)?.[1] ??
    UnexpectedCodePathError.throw(
      '.as(doctype) was not part of output. can not translate',
      { opts },
    );

  // grab the extension override, if specified
  const extensionOverride = opts.output.match(/\.ext\(([^)]+)\)/i)?.[1] ?? null;

  // optional: starting variant override via .v(n)
  const startVariantStr = opts.output.match(/\.v\((\d+)\)/i)?.[1] ?? null;
  const startVariant =
    startVariantStr === null ? 1 : Number.parseInt(startVariantStr, 10);
  if (!Number.isInteger(startVariant) || startVariant < 1) {
    throw new BadRequestError('.v(n) must be a positive integer (e.g. .v(2))', {
      opts,
      startVariantStr,
    });
  }

  // grab the optional relative directory augmenter, e.g. .rel(../step_2.format)
  const relAugment =
    opts.output
      .match(/\.rel\(([^)]+)\)/i)?.[1]
      ?.trim()
      .replace(/^['"]|['"]$/g, '') ?? null;

  // verify that references.0 exists and extract it
  const inputPath = (() => {
    if (typeof opts.references !== 'string')
      throw new BadRequestError('opts.references is not a string', { opts });

    return (
      opts.references.split(',')[0] ||
      BadRequestError.throw('opts.references is not a string', { opts })
    );
  })();

  // attempt to grab doctype and versions from it
  const { prefix, versions, extension } = decodeDocOutputPath(inputPath);

  // compose new output path
  const outputPath = [
    prefix,
    versions.variant || versions.instance
      ? [
          versions.variant ? `v${versions.variant}` : '',
          versions.instance ? `i${versions.instance}` : '',
        ].join('')
      : null,
    `[${doctypeAs}]`,
    `v${startVariant}`,
    extensionOverride ?? extension,
  ]
    .filter(isPresent)
    .join('.');

  // relate the output path, if requested
  const outputPathRelated = relAugment
    ? relateDocOutputPath({ path: outputPath, relation: relAugment })
    : outputPath;

  // swap out the opts
  return { ...opts, output: outputPathRelated };
};
