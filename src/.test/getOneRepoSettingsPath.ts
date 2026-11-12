import { existsSync } from 'fs';
import * as path from 'path';

/**
 * .what = the path of the settings file that holds a repo's own allowlist and hooks
 * .why = rhachet >= 1.49.2 splits `.claude/` into layers: the repo's generated settings live in
 *        `settings.of.repo.json`, and `settings.json` becomes a link to the home defaults (a link
 *        with no target where no home file exists, e.g. ci). the old layout keeps one real
 *        `settings.json`.
 * .note = the same one signal `permissions.layers.operations.sh` reads: a `settings.of.repo.json`
 *         in the dir means the split layout
 */
export const getOneRepoSettingsPath = (input: { claudeDir: string }): string => {
  const splitPath = path.join(input.claudeDir, 'settings.of.repo.json');
  if (existsSync(splitPath)) return splitPath;
  return path.join(input.claudeDir, 'settings.json');
};
