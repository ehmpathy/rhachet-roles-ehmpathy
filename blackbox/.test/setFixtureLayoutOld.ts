import * as fs from 'fs';
import * as path from 'path';

import { ConstraintError } from 'helpful-errors';

/**
 * .what = pin a linked fixture repo to the old (pre-1.49.2) settings layout
 * .why = `rhachet roles link` seeds the split layout: `.claude/settings.of.repo.json` ({}) and a
 *        `.claude/settings.json` link to the home defaults. a suite whose subject is the old layout
 *        (a real project settings.json + settings.local.json) needs neither
 * .note = the link is unlinked, never followed, so no write ever reaches the home file;
 *         the split layout keeps its own cases
 */
export const setFixtureLayoutOld = (input: { dir: string }): void => {
  const claudeDir = path.join(input.dir, '.claude');

  // refuse a linked .claude: a removal below would follow it and delete a
  // file outside the fixture repo
  const claudeStat = fs.lstatSync(claudeDir, { throwIfNoEntry: false });
  if (claudeStat?.isSymbolicLink())
    throw new ConstraintError('fixture layout refused: .claude is a link', {
      claudeDir,
      linkTo: fs.readlinkSync(claudeDir),
      hint: 'the fixture repo must own a real .claude dir',
    });
  fs.mkdirSync(claudeDir, { recursive: true });

  // drop the split-layout signal
  fs.rmSync(path.join(claudeDir, 'settings.of.repo.json'), { force: true });

  // drop a settings.json link, so the suite writes a real file in its place
  const settingsPath = path.join(claudeDir, 'settings.json');
  const settingsStat = fs.lstatSync(settingsPath, { throwIfNoEntry: false });
  if (settingsStat?.isSymbolicLink()) fs.unlinkSync(settingsPath);
};
