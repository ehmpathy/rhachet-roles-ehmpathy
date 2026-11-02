import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { genWatchSkillCopy } from '../../skills/git.pull.watch/__test_utils__/genWatchSkillCopy';
import { genWatchTestScene } from '../../skills/git.pull.watch/__test_utils__/genWatchTestScene';
import { getAllWatchDaemonPids } from '../../skills/git.pull.watch/__test_utils__/getAllWatchDaemonPids';
import { isPidAlive } from '../../skills/git.pull.watch/__test_utils__/isPidAlive';
import { waitForWatch } from '../../skills/git.pull.watch/__test_utils__/waitForWatch';

/**
 * .what = the session start hook brings back the pr-watch daemon of a clone
 *         that holds a watch, and says naught otherwise
 * .why  = a reboot or a kill ends the daemon; the clone's next session must
 *         serve its watches again with no push to prompt it
 */
jest.setTimeout(400_000);

const SERIAL = 'a1a1a1a1-0000-4000-8000-00000000000a';
const HOOK = path.join(__dirname, 'sessionstart.git-pull-watch.sh');

describe('sessionstart.git-pull-watch.sh', () => {
  given('[case1] a box with one repo and one clone', () => {
    const scene = genWatchTestScene({
      slug: 'watch-boot',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL, slug: 'mechanic', reachState: 'LIVE' },
      ];
      store.github.prs['ehmpathy/surf-demo#1220'] = {
        state: 'open',
        merged: false,
        headSha: 'sha-1220',
        closedBy: null,
      };
    });
    afterAll(() => scene.stopAllDaemons());
    const runHook = (serial: string | null) =>
      scene.runScript({
        path: HOOK,
        args: [],
        root: scene.roots['surf-demo']!,
        serial,
      });

    when('[t0] a session with no clone serial starts', () => {
      const result = useThen('the hook runs', async () => runHook(null));
      then('it exits 0 and says naught', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toEqual('');
      });
    });

    when('[t1] the clone starts a session and holds no watch', () => {
      const result = useThen('the hook runs', async () => runHook(SERIAL));
      then('it exits 0, says naught, and spawns no daemon', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toEqual('');
        expect(getAllWatchDaemonPids({ home: scene.home })).toEqual([]);
      });
    });

    when('[t2] the clone holds a watch whose daemon was killed', () => {
      const result = useThen('the hook brings it back', async () => {
        scene.runSkill({
          verb: 'set',
          args: ['--pr', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL,
        });
        const [killed] = getAllWatchDaemonPids({ home: scene.home });
        scene.stopAllDaemons();
        await waitForWatch({
          label: 'daemon killed',
          check: () => !isPidAlive(killed!),
        });
        const hook = runHook(SERIAL);
        return {
          killed: killed!,
          hook,
          pids: getAllWatchDaemonPids({ home: scene.home }),
        };
      });
      then('it exits 0 and names the daemon it replaced', () => {
        expect(result.hook.status).toEqual(0);
        expect(result.hook.stdout).toContain(
          `replaced stale pid ${result.killed}`,
        );
        expect(result.hook.stdout).toContain('for 1 watch(es)');
        expect(scene.asMasked(result.hook.stdout)).toMatchSnapshot();
      });
      then('one fresh daemon runs', () => {
        expect(result.pids).toHaveLength(1);
        expect(result.pids[0]).not.toEqual(result.killed);
      });
    });

    when('[t3] the next session starts while the daemon lives', () => {
      const result = useThen('the hook runs', async () => ({
        before: getAllWatchDaemonPids({ home: scene.home }),
        hook: runHook(SERIAL),
        after: getAllWatchDaemonPids({ home: scene.home }),
      }));
      then('it says naught and leaves the one daemon be', () => {
        expect(result.hook.status).toEqual(0);
        expect(result.hook.stdout).toEqual('');
        expect(result.after).toEqual(result.before);
      });
    });
  });

  given('[case2] a hook that cannot serve its watches', () => {
    const scene = genWatchTestScene({
      slug: 'watch-boot-faults',
      repos: ['surf-demo'],
      store: {},
    });
    scene.setStore((store) => {
      store.clones[scene.roots['surf-demo']!] = [
        { serial: SERIAL, slug: 'mechanic', reachState: 'LIVE' },
      ];
      store.github.prs['ehmpathy/surf-demo#1220'] = {
        state: 'open',
        merged: false,
        headSha: 'sha-1220',
        closedBy: null,
      };
    });
    afterAll(() => scene.stopAllDaemons());

    /**
     * .what = a copy of this hook at its install place beside a skill copy
     * .why  = the hook finds its skill by its own path, so each fault needs a copy
     */
    const genHookCopy = (input: { pkgDir: string }): string => {
      const hookDir = path.join(input.pkgDir, 'dist', 'inits', 'claude.hooks');
      fs.mkdirSync(hookDir, { recursive: true });
      const hook = path.join(hookDir, path.basename(HOOK));
      fs.copyFileSync(HOOK, hook);
      return hook;
    };
    const runHookAt = (hook: string) =>
      scene.runScript({
        path: hook,
        args: [],
        root: scene.roots['surf-demo']!,
        serial: SERIAL,
      });

    when('[t0] the skill beside the hook is absent', () => {
      const result = useThen('the hook runs', async () => {
        const bare = fs.realpathSync(
          genTempDir({ slug: 'watch-boot-bare', git: false }),
        );
        return runHookAt(genHookCopy({ pkgDir: bare }));
      });
      then('it exits 0, so the session lives, and names the reinstall', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('💥 MalfunctionError: ');
        expect(result.stdout).toContain('pr watches are unserved');
        expect(result.stdout).toContain('reinstall the mechanic role');
        expect(result.stderr).toEqual(result.stdout);
      });
      then('it names the load fault itself as the cause', () => {
        expect(result.stdout).toContain('├─ cause: ');
        expect(result.stdout).toContain('No such file or directory');
      });
    });

    when('[t1] the clone holds a watch whose daemon cannot boot', () => {
      const result = useThen('the hook runs', async () => {
        const copy = genWatchSkillCopy({
          slug: 'watch-boot-defect',
          version: '6.6.6',
          daemonPrefix: 'echo "boot defect: the copy is corrupt"; exit 1',
        });
        // the set records the watch, though its own findsert fails at boot
        scene.runSkill({
          verb: 'set',
          args: ['--pr', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL,
          skillDir: copy.skillDir,
        });
        return runHookAt(genHookCopy({ pkgDir: copy.pkgDir }));
      });
      then('it exits 0, and names the boot death with its cause', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('could not start: it died at boot');
        expect(result.stdout).toContain(
          'cause: boot defect: the copy is corrupt',
        );
        expect(result.stdout).toContain('1 watch(es) unserved');
        expect(result.stderr).toEqual(result.stdout);
        expect(scene.asMasked(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] the clone holds a watch whose daemon lock is held', () => {
      const result = useThen('the hook runs', async () => {
        const copy = genWatchSkillCopy({
          slug: 'watch-boot-lock',
          version: '6.6.7',
        });
        scene.runSkill({
          verb: 'set',
          args: ['--pr', '1220', '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL,
          skillDir: copy.skillDir,
        });
        scene.stopAllDaemons();
        // a live holder of the key's lock, past the findsert's wait
        const found = scene
          .getAllWatchRecords()
          .find((one) => one.key.startsWith('6.6.7+'));
        const keyDir = path.dirname(path.dirname(found!.path));
        const holder = spawn('sleep', ['60'], { stdio: 'ignore' });
        fs.mkdirSync(path.join(keyDir, 'daemon.lock'), { recursive: true });
        fs.writeFileSync(
          path.join(keyDir, 'daemon.lock/owner'),
          String(holder.pid),
        );
        const hook = runHookAt(genHookCopy({ pkgDir: copy.pkgDir }));
        holder.kill();
        return hook;
      });
      then('it exits 0, and names the lock, not an empty log', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('could not start: its lock timed out');
        expect(result.stdout).toContain('daemon.lock');
        expect(result.stderr).toEqual(result.stdout);
        expect(scene.asMasked(result.stdout)).toMatchSnapshot();
      });
    });
  });
});
