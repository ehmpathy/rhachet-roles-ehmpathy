import type { InvokeOpts } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { isPresent, omit } from 'type-fns';

import { extname } from 'node:path';

/**
 * .what = saves an artifact of the .src that created an output file
 * .why =
 *   - a .src file helps callers trace the sequence that lead to some output. it makes outputs easier to repeat, since you always have the exact input at hand, for record
 */
export const setSkillOutputSrc = async (input: {
  skillUri: string;
  opts: InvokeOpts<{ ask: string; output: string }>;
}) =>
  await genArtifactGitFile(
    {
      uri: asOutputWithExtension({
        output: asOutputWithoutAttempts(input.opts.output),
        extension: '.src',
      }),
    },
    { versions: true },
  ).set({
    content: castInvokeOptsToSrcFileContents(input),
  });

/**
 * .what = a procedure to cast from invoke opts into .src file contents
 */
const castInvokeOptsToSrcFileContents = (input: {
  skillUri: string;
  opts: InvokeOpts<{ ask: string; output: string }>;
}) => {
  // detect the attempt number
  const attempts = process.env.RHACHET_ATTEMPTS ?? null;
  const output = asOutputWithoutAttempts(input.opts.output);

  // rebuild the request
  const sections = [
    `
ASK=$(cat <<'ASK_EOF'

${input.opts.ask}

ASK_EOF
)
    `.trim(),
    `
npx rhachet act -s ${input.skillUri} \\
    `.trim(),
    attempts
      ? `
  --attempts ${attempts} \\
    `.trim()
      : null,
    `
  --output     '${output}' \\
    `.trim(),
    input.opts.references
      ? `
  --references '${input.opts.references}' \\
    `.trim()
      : null,
    ...Object.entries(
      omit(input.opts, ['attempts', 'ask', 'output', 'references']),
    ).map(([key, value]) =>
      `
  --${key} '${value}' \\
    `.trim(),
    ),
    `
  --ask "$ASK";
    `.trim(),
  ].filter(isPresent);
  return sections.join('\n');
};

/**
 * detect the trailing extension (with the dot), or null if none
 */
export const detectOutputExtension = (output: string): string | null => {
  const ext = extname(output);
  return ext || null;
};

/**
 * .what = removes the attempt value, regardless of extension
 * - if there's a real extension: strip ".iN" before it
 * - if no real extension but ends with ".iN": strip it
 */
export const asOutputWithoutAttempts = (output: string): string => {
  const ext = detectOutputExtension(output);

  // case: has real extension (like .md, .json, etc.)
  if (ext && !/\.i\d+$/.test(ext))
    return output.replace(new RegExp(`\\.i\\d+${ext}$`), ext);

  // case: no extension, or extension is itself ".iN"
  return output.replace(/\.i\d+$/, '');
};

/**
 * .what = replaces the extension of an output file
 * - if extension is real: replace it
 * - if extension is ".iN": append new extension instead of replacing
 */
export const asOutputWithExtension = ({
  output,
  extension,
}: {
  output: string;
  extension: `.${string}`;
}): string => {
  const ext = detectOutputExtension(output);

  // if no original extension, just append this new one
  if (!ext) return output + extension;

  // otherwise, replace the extension
  return output.slice(0, -ext.length) + extension;
};
