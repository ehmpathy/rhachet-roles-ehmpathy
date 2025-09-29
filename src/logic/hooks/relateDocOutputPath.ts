import * as path from 'path';

/**
 * .what = computes the relative path, in relation to some relative modifier
 * .how =
 *   - path(path/to/file.md) + relation(../) => path/file.md
 *   - path(path/to/file.md) + relation(../now) => path/now/file.md
 */
export const relateDocOutputPath = (input: {
  path: string;
  relation: string;
}): string => {
  const { path: inputPath, relation } = input;

  // split into dir + base
  const dir = path.posix.dirname(inputPath);
  const base = path.posix.basename(inputPath);

  // join dir with relation and normalize
  const newDir = path.posix.normalize(path.posix.join(dir, relation));

  // recombine with base filename
  return path.posix.normalize(path.posix.join(newDir, base));
};
