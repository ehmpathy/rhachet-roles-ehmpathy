import * as path from 'path';

/**
 * .what = computes the relative path, in relation to some relative modifier
 * .how =
 *   - path(path/to/file.md) + relation(../) => path/file.md
 *   - path(path/to/file.md) + relation(../now) => path/now/file.md
 *   - path(path/to/file.md) + relation(@gitroot/dist) => dist/file.md
 */
export const relateDocOutputPath = (input: {
  path: string;
  relation: string;
}): string => {
  const { path: inputPath, relation } = input;

  // split into dir + base
  const dir = path.posix.dirname(inputPath);
  const base = path.posix.basename(inputPath);

  // check if relation starts with @gitroot
  if (relation.startsWith('@gitroot')) {
    // extract the path after @gitroot/ (or @gitroot)
    const gitrootPath = relation.replace(/^@gitroot\/?/, '');

    // if gitrootPath is empty, place file at git root
    if (!gitrootPath) {
      return base;
    }

    // otherwise, join gitroot path with base filename
    return path.posix.normalize(path.posix.join(gitrootPath, base));
  }

  // default behavior: relative path manipulation
  // join dir with relation and normalize
  const newDir = path.posix.normalize(path.posix.join(dir, relation));

  // recombine with base filename
  return path.posix.normalize(path.posix.join(newDir, base));
};
