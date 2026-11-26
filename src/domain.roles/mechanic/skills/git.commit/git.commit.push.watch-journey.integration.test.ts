import { spawnSync } from 'child_process';
import * as fs from 'fs';
import { MalfunctionError } from 'helpful-errors';
import * as path from 'path';
import { given, then, useThen, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

import { genWatchTestScene } from '../git.pull.watch/__test_utils__/genWatchTestScene';
import { getAllWatchDaemonPids } from '../git.pull.watch/__test_utils__/getAllWatchDaemonPids';
import { waitForWatch } from '../git.pull.watch/__test_utils__/waitForWatch';

/**
 * .what = one journey from push to alert: a real `git.commit.push --mode apply`
 *         calls the real `git.pull.watch set`, whose daemon spawns, reads a failed
 *         check, and says the alert into the clone
 * .why  = the push suite stubs `set` and the watch suites start at `set`; only this
 *         journey proves the seam between them carries a watch to an alert
 */
/**
 * .mock = github (`gh api`), the clone registry and `clone say` (`rhachet`), and the
 *         keyrack read answer from genWatchTestScene stub bins; `gh pr list|create`
 *         and the `git push` transport answer from a thin wrapper in front of them.
 *         the push, the set, the daemon, and the filesystem run for real
 * .why  = a pr cannot be opened, nor a check failed, on real github on demand, and a
 *         real `clone say` would bill a brain per run
 * .real = git.pull.watch.github.real.integration.test.ts (TEST_LIVE=github) and
 *         git.pull.watch.rhachet.real.integration.test.ts
 * .note = an integration test of the src scripts, not an acceptance test: the built
 *         `rhx` resolves the skill through the installed role, which cannot see the
 *         per-scene stub store the daemon must read
 */
jest.setTimeout(400_000);

const SERIAL = 'a1a1a1a1-0000-4000-8000-00000000000a';
const PUSH = path.join(__dirname, 'git.commit.push.sh');

describe('git.commit.push → git.pull.watch journey', () => {
  given('[case1] an enrolled clone on a feature branch of surf-demo', () => {
    const scene = genWatchTestScene({
      slug: 'watch-journey',
      repos: ['surf-demo'],
      store: {},
    });
    const root = scene.roots['surf-demo']!;
    scene.setStore((store) => {
      store.clones[root] = [
        { serial: SERIAL, slug: 'mechanic', reachState: 'LIVE' },
      ];
      store.github.prs['ehmpathy/surf-demo#1230'] = {
        state: 'open',
        merged: false,
        headSha: 'sha-1230',
        closedBy: null,
      };
      store.github.checks['sha-1230'] = [];
    });
    afterAll(() => scene.stopAllDaemons());

    // the push grant: a local meter with push allowed, and the org allowed in the home
    fs.mkdirSync(path.join(root, '.meter'), { recursive: true });
    fs.writeFileSync(
      path.join(root, '.meter', 'git.commit.uses.jsonc'),
      JSON.stringify({ uses: 3, push: 'allow' }, null, 2),
    );
    const orgMeterDir = path.join(
      scene.home,
      '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
    );
    fs.mkdirSync(orgMeterDir, { recursive: true });
    fs.writeFileSync(
      path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
      JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
    );

    // the repo's keyrack manifest, as an ehmpathy repo holds it
    fs.mkdirSync(path.join(root, '.agent'), { recursive: true });
    fs.writeFileSync(
      path.join(root, '.agent', 'keyrack.yml'),
      'org: ehmpathy\nenv.all:\n  - EHMPATHY_SEATURTLE_GITHUB_TOKEN\nenv.prod:\n  # required for valid schema\n',
    );

    // a seaturtle commit on a feature branch, as git.commit.set would leave it
    configureTestGitUser({ cwd: root });
    fs.writeFileSync(
      path.join(root, '.gitignore'),
      '.meter/\n.agent/\nnode_modules/\n',
    );
    spawnSync('git', ['add', '.gitignore'], { cwd: root });
    spawnSync('git', ['commit', '-m', 'setup: gitignore'], { cwd: root });
    spawnSync('git', ['checkout', '-b', 'turtle/wave-report'], { cwd: root });
    fs.writeFileSync(path.join(root, 'wave.txt'), 'swell 6ft');
    spawnSync('git', ['add', 'wave.txt'], { cwd: root });
    spawnSync(
      'git',
      [
        'commit',
        '--author=seaturtle[bot] <seaturtle@ehmpath.com>',
        '-m',
        'feat(wave): add wave report',
      ],
      { cwd: root },
    );

    // .mock = gh repo view|pr list|create and git push, in front of the scene's stub gh.
    //         surf-demo is private, so the push meets no public-repo text gate
    fs.renameSync(
      path.join(scene.fakeBin, 'gh'),
      path.join(scene.fakeBin, 'gh.api'),
    );
    fs.writeFileSync(
      path.join(scene.fakeBin, 'gh'),
      `#!/bin/bash
if [[ "$1" == "repo" && "$2" == "view" ]]; then echo "ehmpathy/surf-demo PRIVATE"; exit 0; fi
if [[ "$1" == "pr" && "$2" == "list" ]]; then exit 0; fi
if [[ "$1" == "pr" && "$2" == "create" ]]; then echo "https://github.com/ehmpathy/surf-demo/pull/1230"; exit 0; fi
exec "$(dirname "$0")/gh.api" "$@"
`,
    );
    fs.chmodSync(path.join(scene.fakeBin, 'gh'), '755');
    fs.writeFileSync(
      path.join(scene.fakeBin, 'git'),
      `#!/bin/bash
if [[ "$1" == "push" ]]; then echo "To github.com:ehmpathy/surf-demo.git"; exit 0; fi
exec /usr/bin/git "$@"
`,
    );
    fs.chmodSync(path.join(scene.fakeBin, 'git'), '755');
    fs.writeFileSync(path.join(scene.home, '.bash_aliases.ductwork.sh'), '');
    fs.writeFileSync(path.join(scene.home, '.bash_aliases.termwork.sh'), '');

    when('[t0] the clone pushes, then test-unit fails on the pr', () => {
      const result = useThen('the alert lands in the clone', async () => {
        const push = scene.runScript({
          path: PUSH,
          args: ['--mode', 'apply', '--auth', 'as-human'],
          root,
          serial: SERIAL,
        });
        // a push that set no watch has naught to prime; name its output, not a timeout
        if (!push.stdout.includes('watch: set'))
          throw new MalfunctionError('the push set no watch', {
            status: push.status,
            stdout: push.stdout,
            stderr: push.stderr,
          });
        await scene.waitForPrimed();
        scene.setStore((store) => {
          store.github.checks['sha-1230']!.push({
            id: 931,
            name: 'test-unit',
            status: 'completed',
            conclusion: 'failure',
            html_url: 'https://github.com/ehmpathy/surf-demo/runs/931',
          });
        });
        await waitForWatch({
          label: 'the alert said into the clone',
          check: () => scene.getSays().length >= 1,
          scene,
        });
        return {
          push,
          says: scene.getSays(),
          pids: getAllWatchDaemonPids({ home: scene.home }),
          records: scene.getAllWatchRecords(),
        };
      });
      then('the push opens the pr and names the watch it set', () => {
        expect(result.push.status).toEqual(0);
        expect(result.push.stdout).toContain('pr #1230 (created)');
        expect(result.push.stdout).toMatch(
          /watch: set → @:mechanic \(daemon v\S+ pid \d+, spawned\)/,
        );
        expect(scene.asMasked(result.push.stdout)).toMatchSnapshot();
      });
      then('one daemon runs, and it holds the watch of #1230', () => {
        expect(result.pids).toHaveLength(1);
        expect(result.records).toHaveLength(1);
        expect(result.records[0]!.record.pr).toEqual(1230);
        expect(result.records[0]!.record.cloneSerial).toEqual(SERIAL);
      });
      then('one alert lands in the clone, with the failed check', () => {
        expect(result.says).toHaveLength(1);
        expect(result.says[0]!.serial).toEqual(SERIAL);
        expect(result.says[0]!.verdict).toEqual('released');
        expect(result.says[0]!.text).toContain('ci failed on #1230');
        expect(result.says[0]!.text).toContain('check: test-unit (failure)');
        expect(scene.asMasked(result.says[0]!.text)).toMatchSnapshot();
      });
    });
  });
});
