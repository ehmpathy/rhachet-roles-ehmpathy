import * as fs from 'fs';
import * as path from 'path';

import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genTestDir, invokeHook } from './.test/invokeHook';

/**
 * .what = acceptance tests for the sessionstart.git-pull-watch hook, run from the linked role
 * .why  = claude code runs the hook from the linked `.agent/` dir, never from src; the
 *         link, the relative source of the watch skill, and the silence a session sees
 *         with naught to do must hold on that road. the spawn, replace, boot-death and
 *         lock faults are proven in sessionstart.git-pull-watch.integration.test.ts
 * .note = HOME points at a temp dir, so the hook reads a box with no watches and
 *         never sees the runner's own pr-watch state
 */
describe('sessionstart.git-pull-watch, via the linked role', () => {
  given('[case1] a repo with the mechanic role linked, on a box with no watches', () => {
    const scene = useBeforeAll(async () => ({
      dir: await genTestDir({ slug: 'sessionstart-git-pull-watch-acceptance' }),
      home: genTempDir({ slug: 'sessionstart-git-pull-watch-home', git: false }),
    }));

    when('[t0] the session is not an enrolled clone', () => {
      const result = useThen('the hook runs', async () =>
        invokeHook({
          hookName: 'sessionstart.git-pull-watch.sh',
          stdin: '{}',
          cwd: scene.dir,
          env: { HOME: scene.home, RHACHET_CLONE_SERIAL: undefined },
        }),
      );
      then('it exits 0 and says naught', () => {
        expect(result.code).toBe(0);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toEqual('');
      });
    });

    when('[t1] the session is a clone that holds no watch', () => {
      const result = useThen('the hook runs', async () =>
        invokeHook({
          hookName: 'sessionstart.git-pull-watch.sh',
          stdin: '{}',
          cwd: scene.dir,
          env: {
            HOME: scene.home,
            RHACHET_CLONE_SERIAL: 'a1a1a1a1-0000-4000-8000-0000000000ac',
          },
        }),
      );
      then('it exits 0 and says naught', () => {
        expect(result.code).toBe(0);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toEqual('');
      });
      then('it spawns no daemon: the box holds no pr-watch state', () => {
        const stateRoot = path.join(
          scene.home,
          '.rhachet',
          'storage',
          'repo=ehmpathy',
          'role=mechanic',
          'skill=git.pull.watch',
        );
        const pids = fs.existsSync(stateRoot)
          ? fs
              .readdirSync(stateRoot, { recursive: true })
              .map(String)
              .filter((name) => name.endsWith('daemon.pid'))
          : [];
        expect(pids).toEqual([]);
      });
    });
  });
});
