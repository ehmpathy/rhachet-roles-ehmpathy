import { BadRequestError } from 'helpful-errors';

type DocVersions = { variant: number | null; instance: number | null };
type Decoded = {
  prefix: string; // everything up to (and including) the dot before [doctype]
  doctype: string; // the name inside [ ... ]
  versions: DocVersions;
  extension: string | null; // final token after the last dot (e.g., "md", "src"), or null if absent
};

/**
 * parses a doc output path like:
 *   ...persp_pro.v1i2.[stories].v1.i3.md
 * into:
 *   - doctype: "stories"
 *   - prefix:  "...persp_pro.v1i2."
 *   - versions: { variant: 1, instance: 3 }
 *   - extension: "md"
 */
export const decodeDocOutputPath = (inputPath: string): Decoded => {
  // find the LAST [doctype], where [doctype] cant be before a `/`
  const lastDoctypeMatch = inputPath.match(/^(.*)\[(\w+)\]([^/]*)$/i);
  if (!lastDoctypeMatch) {
    throw new BadRequestError(
      'could not find any [doctype] in referenced path',
      { path: inputPath },
    );
  }

  const beforeAndDot = lastDoctypeMatch[1]!; // should end with the dot before [doctype], e.g., "...v1i2."
  const doctype = lastDoctypeMatch[2]!; // inside the brackets
  const after = lastDoctypeMatch[3] || ''; // tail after the closing ]

  // ensure prefix ends exactly before the bracket (without dot suffix, if any)
  const prefix = beforeAndDot.endsWith('.')
    ? beforeAndDot.slice(0, -1)
    : beforeAndDot;

  // parse tail tokens after the closing bracket, e.g. ".v1.i3.md", "._.md", ".md", etc.
  // we’ll split on '.' and ignore empties so ".v1.i3.md" -> ["v1","i3","md"]
  const tokens = after.split('.').filter(Boolean);

  let variant: number | null = null;
  let instance: number | null = null;
  let extension: string | null = null;

  for (const t of tokens) {
    if (/^v\d+$/i.test(t)) {
      variant = parseInt(t.slice(1), 10);
      continue;
    }
    if (/^i\d+$/i.test(t)) {
      instance = parseInt(t.slice(1), 10);
      continue;
    }
    if (t === '_') {
      // explicit “no attempt” marker – ignore for versions; not an extension
      continue;
    }
    // anything else we treat as the extension; if multiple remain, the last wins
    extension = t;
  }

  return {
    prefix,
    doctype,
    versions: { variant, instance },
    extension,
  };
};
