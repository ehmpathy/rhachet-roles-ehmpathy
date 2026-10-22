import * as fs from 'fs';
import * as path from 'path';

import { getError, genTempDir, given, then, when } from 'test-fns';

import { setFixtureLayoutOld } from './.test/setFixtureLayoutOld';
import { setFixtureFile } from './.test/setFixtureFile';

/**
 * .what = clamp: a fixture write never follows a link out of the fixture repo
 * .why = a linked fixture's `.claude/settings.json` points (via settings.of.grove.json) at the
 *        runner's `$HOME/.claude/settings.json`. a plain write through it once replaced a
 *        human's home settings with `{ broken` (rule.require.clamp-edge-cases)
 */
describe('fixture writes stay inside the fixture repo', () => {
  given('[case1] a repo whose .claude/settings.json links to a file outside the repo', () => {
    const scene = (() => {
      const outside = genTempDir({ slug: 'fixture-home' });
      const homeFile = path.join(outside, 'settings.json');
      fs.writeFileSync(homeFile, '{"sentinel":true}');
      const repo = genTempDir({ slug: 'fixture-repo' });
      fs.mkdirSync(path.join(repo, '.claude'), { recursive: true });
      fs.symlinkSync(homeFile, path.join(repo, '.claude', 'settings.json'));
      fs.writeFileSync(path.join(repo, '.claude', 'settings.of.repo.json'), '{}');
      return { repo, homeFile };
    })();

    when('[t0] a suite writes the link path directly', () => {
      then('the write is refused, and the outside file is untouched', async () => {
        const error = await getError(async () =>
          setFixtureFile({ dir: scene.repo, relPath: '.claude/settings.json', content: '{ broken' }),
        );
        expect(error.message).toContain('target is a link');
        expect(fs.readFileSync(scene.homeFile, 'utf-8')).toBe('{"sentinel":true}');
      });
    });

    when('[t1] the suite pins the old layout first, then writes', () => {
      then('the link is replaced by a real file, and the outside file is untouched', () => {
        setFixtureLayoutOld({ dir: scene.repo });
        setFixtureFile({ dir: scene.repo, relPath: '.claude/settings.json', content: '{ broken' });
        const target = path.join(scene.repo, '.claude', 'settings.json');
        expect(fs.lstatSync(target).isSymbolicLink()).toBe(false);
        expect(fs.readFileSync(target, 'utf-8')).toBe('{ broken');
        expect(fs.readFileSync(scene.homeFile, 'utf-8')).toBe('{"sentinel":true}');
        expect(fs.existsSync(path.join(scene.repo, '.claude', 'settings.of.repo.json'))).toBe(false);
      });
    });
  });

  given('[case2] a repo whose .claude dir links outside the repo', () => {
    const scene = (() => {
      const outside = genTempDir({ slug: 'fixture-outdir' });
      const repo = genTempDir({ slug: 'fixture-repo-outdir' });
      fs.symlinkSync(outside, path.join(repo, '.claude'));
      return { repo, outside };
    })();

    when('[t0] a suite writes into it', () => {
      then('the write is refused, and naught lands outside', async () => {
        const error = await getError(async () =>
          setFixtureFile({ dir: scene.repo, relPath: '.claude/settings.json', content: '{}' }),
        );
        expect(error.message).toContain('resolves outside the repo');
        expect(fs.existsSync(path.join(scene.outside, 'settings.json'))).toBe(false);
      });
    });
  });
});
