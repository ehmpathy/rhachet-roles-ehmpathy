import * as fs from 'fs';
import * as path from 'path';

import { ConstraintError } from 'helpful-errors';

/**
 * .what = write a file inside a fixture repo, and never through a link or outside the repo
 * .why = rhachet >= 1.49.2 links `<repo>/.claude/settings.json` to `settings.of.grove.json`, which
 *        links to `$HOME/.claude/settings.json`. a plain writeFileSync follows both links and
 *        overwrites the runner's own home settings (rule.require.hermetic-tests)
 */
export const setFixtureFile = (input: {
  dir: string;
  relPath: string;
  content: string;
}): void => {
  const target = path.join(input.dir, input.relPath);

  // refuse a target that is itself a link: a write would land wherever it points
  const targetStat = fs.lstatSync(target, { throwIfNoEntry: false });
  if (targetStat?.isSymbolicLink())
    throw new ConstraintError('fixture write refused: target is a link', {
      target,
      linkTo: fs.readlinkSync(target),
      hint: 'unlink it first (setFixtureLayoutOld), or write the real file the layout uses',
    });

  // refuse a target whose parent resolves outside the fixture repo
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const repoReal = fs.realpathSync(input.dir);
  const parentReal = fs.realpathSync(path.dirname(target));
  const isParentWithinRepo =
    parentReal === repoReal || parentReal.startsWith(`${repoReal}${path.sep}`);
  if (!isParentWithinRepo)
    throw new ConstraintError('fixture write refused: target resolves outside the repo', {
      target,
      parentReal,
      repoReal,
    });

  fs.writeFileSync(target, input.content);
};
