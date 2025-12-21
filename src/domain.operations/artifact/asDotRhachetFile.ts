import { basename, dirname, join } from 'path';

/**
 * .what = computes dir from input path as `.rhachet/{key}/` next to the given file
 * .why = allows tools to store metadata or config files locally and consistently
 */
export const asDotRhachetDir = (from: string): string => {
  const baseDir = dirname(from);
  const baseKey = basename(from);
  const rhachetDir = join(baseDir, '.rhachet', baseKey);
  return rhachetDir;
};
