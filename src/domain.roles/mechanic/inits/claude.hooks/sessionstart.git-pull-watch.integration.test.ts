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
/**
 * .mock = github (`gh api`), the clone registry (`rhachet`), and the keyrack token
 *         read answer from genWatchTestScene stub bins on PATH; the hook, the
 *         skill, the daemon, and the filesystem run for real
 * .why  = a stale pid, a boot death, and a lock timeout cannot be forced on the
 *         real services on demand
 * .real = skills/git.pull.watch/git.pull.watch.github.real.integration.test.ts
 *         (TEST_LIVE=github) and git.pull.watch.rhachet.real.integration.test.ts
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
          args: ['--which', '1220', '--mode', 'apply'],
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

    when('[t4] a watch record under the key will not parse', () => {
      const result = useThen('the hook runs', async () => {
        // a half-written record beside the clone's good one
        const corrupt = path.join(
          path.dirname(scene.getAllWatchRecords()[0]!.path),
          'ehmpathy.surf-demo.pr=9.clone=c3.json',
        );
        fs.writeFileSync(corrupt, '{"repo": "ehmpathy/surf-de');
        const hook = runHook(SERIAL);
        fs.rmSync(corrupt, { force: true });
        return { hook };
      });
      then(
        'it exits 0, so the session lives, and names the unreadable record',
        () => {
          expect(result.hook.status).toEqual(0);
          expect(result.hook.stdout).toContain(
            '💥 MalfunctionError: 1 pr-watch record(s) of v',
          );
          expect(result.hook.stdout).toContain(
            'a watch of this clone may be unserved',
          );
          expect(result.hook.stdout).toContain('rhx git.pull.watch get');
          expect(result.hook.stderr).toContain('are unreadable');
        },
      );
      then('the fault tree reads the same on each run', () => {
        expect(scene.asMasked(result.hook.stdout)).toMatchSnapshot();
      });
    });

    when('[t5] the clone holds a watch, and no daemon record stands', () => {
      const result = useThen('the hook spawns one', async () => {
        const keyDir = path.dirname(
          path.dirname(scene.getAllWatchRecords()[0]!.path),
        );
        const [prior] = getAllWatchDaemonPids({ home: scene.home });
        scene.stopAllDaemons();
        await waitForWatch({
          label: 'daemon stopped',
          check: () => !isPidAlive(prior!),
        });
        fs.rmSync(path.join(keyDir, 'daemon.pid'), { force: true });
        const hook = runHook(SERIAL);
        return { hook, pids: getAllWatchDaemonPids({ home: scene.home }) };
      });
      then('it exits 0 and names the daemon it spawned', () => {
        expect(result.hook.status).toEqual(0);
        expect(result.hook.stdout).toContain(', spawned');
        expect(result.hook.stdout).toContain('for 1 watch(es)');
        expect(result.hook.stdout).not.toContain('replaced');
        expect(scene.asMasked(result.hook.stdout)).toMatchSnapshot();
      });
      then('one daemon runs', () => {
        expect(result.pids).toHaveLength(1);
      });
    });
  });

  given('[case3] a clone whose watch sits under an older key', () => {
    const scene = genWatchTestScene({
      slug: 'watch-boot-older',
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

    when(
      '[t0] the watch was set under v5.5.5, then the box rebooted onto this key',
      () => {
        const result = useThen('the hook runs', async () => {
          const older = genWatchSkillCopy({
            slug: 'watch-boot-older',
            version: '5.5.5',
          });
          scene.runSkill({
            verb: 'set',
            args: ['--which', '1220', '--mode', 'apply'],
            root: scene.roots['surf-demo']!,
            serial: SERIAL,
            skillDir: older.skillDir,
          });
          const [killed] = getAllWatchDaemonPids({ home: scene.home });
          scene.stopAllDaemons();
          await waitForWatch({
            label: 'older daemon stopped',
            check: () => !isPidAlive(killed!),
          });
          // the upgrade: the root's mechanic link now names this install
          const link = path.join(
            scene.roots['surf-demo']!,
            '.agent',
            'repo=ehmpathy',
            'role=mechanic',
            'skills',
            'git.pull.watch',
          );
          fs.mkdirSync(path.dirname(link), { recursive: true });
          fs.symlinkSync(
            path.join(__dirname, '../../skills/git.pull.watch'),
            link,
          );
          const hook = scene.runScript({
            path: HOOK,
            args: [],
            root: scene.roots['surf-demo']!,
            serial: SERIAL,
          });
          await waitForWatch({
            label: 'the watch moved off the older key',
            check: () =>
              scene
                .getAllWatchRecords()
                .every((one) => !one.key.startsWith('5.5.5+')),
          });
          return {
            hook,
            pids: getAllWatchDaemonPids({ home: scene.home }),
            records: scene.getAllWatchRecords(),
          };
        });
        then('it exits 0 and names the watch under the older key', () => {
          expect(result.hook.status).toEqual(0);
          expect(result.hook.stdout).toContain(', spawned');
          expect(result.hook.stdout).toContain(
            'for 1 watch(es), 1 under an older key, taken at its first tick',
          );
          expect(scene.asMasked(result.hook.stdout)).toMatchSnapshot();
        });
        then('one daemon runs, of this key', () => {
          expect(result.pids).toHaveLength(1);
        });
        then('the watch now sits under this key', () => {
          expect(result.records).toHaveLength(1);
          expect(result.records[0]!.key).not.toMatch(/^5\.5\.5\+/);
        });
      },
    );
  });

  given(
    '[case4] older-key records that no daemon of this key would serve (the respawn loop)',
    () => {
      const scene = genWatchTestScene({
        slug: 'watch-boot-orphans',
        repos: ['surf-demo', 'tide-chart'],
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
      const runHook = () =>
        scene.runScript({
          path: HOOK,
          args: [],
          root: scene.roots['surf-demo']!,
          serial: SERIAL,
        });
      const getBootLines = () =>
        fs.existsSync(scene.getStateRoot())
          ? fs
              .readdirSync(scene.getStateRoot())
              .filter((name) => name.startsWith('v='))
              .map((name) =>
                path.join(scene.getStateRoot(), name, 'daemon.log'),
              )
              .filter((log) => fs.existsSync(log))
              .flatMap((log) =>
                fs
                  .readFileSync(log, 'utf-8')
                  .split('\n')
                  .filter((line) => line.includes(' boot: daemon pid ')),
              )
          : [];

      when(
        '[t0] under v5.5.5: an ended watch of a root not yet on this key, a watch whose root is gone, a watch of a root on another key',
        () => {
          const result = useThen('the hook runs', async () => {
            const older = genWatchSkillCopy({
              slug: 'watch-boot-orphans',
              version: '5.5.5',
            });
            scene.runSkill({
              verb: 'set',
              args: ['--which', '1220', '--mode', 'apply'],
              root: scene.roots['surf-demo']!,
              serial: SERIAL,
              skillDir: older.skillDir,
            });
            const [killed] = getAllWatchDaemonPids({ home: scene.home });
            scene.stopAllDaemons();
            await waitForWatch({
              label: 'older daemon stopped',
              check: () => !isPidAlive(killed!),
            });

            // the ended watch: merged, its closure note still held in the outbox
            const ended = scene.getAllWatchRecords()[0]!;
            const record = JSON.parse(fs.readFileSync(ended.path, 'utf-8'));
            fs.writeFileSync(
              ended.path,
              JSON.stringify({ ...record, ended: 'merged' }),
            );
            const keyDir = path.dirname(path.dirname(ended.path));
            const stem = path.basename(ended.path, '.json');
            fs.mkdirSync(path.join(keyDir, 'outbox'), { recursive: true });
            fs.writeFileSync(
              path.join(keyDir, 'outbox', `${stem}.1700000000.1.1.json`),
              JSON.stringify({
                text: '🐢 cowabunga!\n\n🐚 git.pull.watch — #1220 merged; watch ended',
                tries: 0,
                heldAt: '2026-11-21T00:00:00Z',
              }),
            );

            // a watch whose repo root was a worktree, since removed
            fs.writeFileSync(
              path.join(
                path.dirname(ended.path),
                `ehmpathy.surf-demo.pr=1221.clone=${SERIAL}.json`,
              ),
              JSON.stringify({
                ...record,
                pr: 1221,
                watchId: 'gone.1.1',
                repoRoot: path.join(scene.home, 'worktree-removed'),
              }),
            );

            // a watch whose repo root runs no link to this key
            fs.writeFileSync(
              path.join(
                path.dirname(ended.path),
                `ehmpathy.tide-chart.pr=312.clone=${SERIAL}.json`,
              ),
              JSON.stringify({
                ...record,
                repo: 'ehmpathy/tide-chart',
                pr: 312,
                watchId: 'other.1.1',
                repoRoot: scene.roots['tide-chart'],
              }),
            );

            const bootsBefore = getBootLines().length;
            const hook = runHook();
            return {
              hook,
              pids: getAllWatchDaemonPids({ home: scene.home }),
              bootsNew: getBootLines().length - bootsBefore,
            };
          });
          then('it exits 0 and says naught', () => {
            expect(result.hook.status).toEqual(0);
            expect(result.hook.stdout).toEqual('');
          });
          then('it spawns no daemon: none would serve these records', () => {
            expect(result.pids).toEqual([]);
            expect(result.bootsNew).toEqual(0);
          });
        },
      );

      when(
        '[t1] the ended watch root moves onto this key, and a session starts',
        () => {
          const result = useThen('the hook runs', async () => {
            const link = path.join(
              scene.roots['surf-demo']!,
              '.agent',
              'repo=ehmpathy',
              'role=mechanic',
              'skills',
              'git.pull.watch',
            );
            fs.mkdirSync(path.dirname(link), { recursive: true });
            fs.symlinkSync(
              path.join(__dirname, '../../skills/git.pull.watch'),
              link,
            );
            const hook = runHook();
            await waitForWatch({
              label: 'the ended watch leaves, and the gone root is reaped',
              check: () =>
                scene
                  .getAllWatchRecords()
                  .every((one) => one.record.pr === 312),
              scene,
            });
            await waitForWatch({
              label: 'the daemon exits at zero watches',
              check: () =>
                getAllWatchDaemonPids({ home: scene.home }).length === 0,
              scene,
            });
            return { hook, says: scene.getSays() };
          });
          then('it spawns one daemon, for the one servable record', () => {
            expect(result.hook.stdout).toContain(
              'for 1 watch(es), 1 under an older key, taken at its first tick',
            );
            expect(scene.asMasked(result.hook.stdout)).toMatchSnapshot();
          });
          then(
            'the held closure note of the ended watch reaches the clone',
            () => {
              expect(
                result.says.filter((say) =>
                  say.text.includes('#1220 merged; watch ended'),
                ),
              ).toHaveLength(1);
            },
          );
          then('the watch of the other key stays, for that key', () => {
            const left = scene.getAllWatchRecords();
            expect(left).toHaveLength(1);
            expect(left[0]!.key).toMatch(/^5\.5\.5\+/);
            expect(left[0]!.record.pr).toEqual(312);
          });
        },
      );

      when('[t2] another session starts', () => {
        const result = useThen('the hook runs', async () => {
          const bootsBefore = getBootLines().length;
          const hook = runHook();
          return {
            hook,
            pids: getAllWatchDaemonPids({ home: scene.home }),
            bootsNew: getBootLines().length - bootsBefore,
          };
        });
        then('it spawns no daemon and says naught: the loop is closed', () => {
          expect(result.hook.stdout).toEqual('');
          expect(result.pids).toEqual([]);
          expect(result.bootsNew).toEqual(0);
        });
      });

      when(
        '[t3] under v5.5.5: a record that will not parse, and one that names no repo root; a daemon of this key ticks',
        () => {
          const result = useThen('the steal passes run', async () => {
            const olderDir = fs
              .readdirSync(scene.getStateRoot())
              .find((name) => name.startsWith('v=5.5.5'));
            const watchesDir = path.join(
              scene.getStateRoot(),
              olderDir!,
              'watches',
            );
            const corrupt = path.join(
              watchesDir,
              `ehmpathy.surf-demo.pr=1222.clone=${SERIAL}.json`,
            );
            const rootless = path.join(
              watchesDir,
              `ehmpathy.surf-demo.pr=1223.clone=${SERIAL}.json`,
            );
            fs.writeFileSync(corrupt, '{ "repo": "ehmpathy/surf-demo", "pr": ');
            fs.writeFileSync(
              rootless,
              JSON.stringify({
                repo: 'ehmpathy/surf-demo',
                pr: 1223,
                cloneSerial: SERIAL,
                cloneSlug: 'mechanic',
                watchId: 'rootless.1.1',
              }),
            );
            // a live watch under this key, so a daemon of this key ticks and steals
            scene.runSkill({
              verb: 'set',
              args: ['--which', '1220', '--mode', 'apply'],
              root: scene.roots['surf-demo']!,
              serial: SERIAL,
            });
            // the steal pass that meets both records, then more ticks (the killed v5.5.5
            // daemon keeps its pid file, so a tick wait would wait on a dead key)
            const getLeftLines = () =>
              fs
                .readdirSync(scene.getStateRoot())
                .filter((name) => !name.startsWith('v=5.5.5'))
                .map((name) =>
                  path.join(scene.getStateRoot(), name, 'daemon.log'),
                )
                .filter((log) => fs.existsSync(log))
                .flatMap((log) =>
                  fs
                    .readFileSync(log, 'utf-8')
                    .split('\n')
                    .filter((line) =>
                      line.includes(
                        'names no repo root; ehmpathy.surf-demo.pr=1223',
                      ),
                    ),
                );
            await waitForWatch({
              label: 'the steal pass leaves the rootless record',
              check: () => getLeftLines().length >= 1,
              scene,
            });
            const getPullReads = () =>
              scene
                .getGhCalls()
                .filter((call) =>
                  call.argv.some((a) => a.endsWith('/pulls/1220')),
                ).length;
            const readsAtPass = getPullReads();
            await waitForWatch({
              label: 'three more ticks read #1220',
              check: () => getPullReads() >= readsAtPass + 3,
              scene,
            });
            return {
              corrupt: fs.existsSync(corrupt),
              rootless: fs.existsSync(rootless),
            };
          });
          then(
            'neither is reaped: a record the steal cannot read is no proof its root is gone',
            () => {
              expect(result.corrupt).toEqual(true);
              expect(result.rootless).toEqual(true);
            },
          );
        },
      );
    },
  );

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
      then('the fault tree reads the same on each run', () => {
        // the header and the cause name a temp path that differs per run; the tree does not
        expect(
          scene
            .asMasked(result.stdout)
            .replace(
              /could not load \S+?\/dist\//,
              'could not load <bare>/dist/',
            )
            .replace(/cause: .*/, 'cause: <the load error, at its temp path>'),
        ).toMatchSnapshot();
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
          args: ['--which', '1220', '--mode', 'apply'],
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
          args: ['--which', '1220', '--mode', 'apply'],
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

  given(
    '[case5] a day on one seat: upgrade, a 404, the seaturtle-to-grove swap, a keyrack lock, a merge (vision case=8)',
    () => {
      const scene = genWatchTestScene({
        slug: 'watch-boot-journey',
        repos: ['surf-demo'],
        store: { keyrackAmbient: 'granted' },
      });
      scene.setStore((store) => {
        store.clones[scene.roots['surf-demo']!] = [
          { serial: SERIAL, slug: 'mechanic', reachState: 'LIVE' },
        ];
        ['1260', '1261'].forEach((pr) => {
          store.github.prs[`ehmpathy/surf-demo#${pr}`] = {
            state: 'open',
            merged: false,
            headSha: `sha-${pr}`,
            closedBy: null,
          };
        });
      });
      afterAll(() => scene.stopAllDaemons());
      const runHook = () =>
        scene.runScript({
          path: HOOK,
          args: [],
          root: scene.roots['surf-demo']!,
          serial: SERIAL,
        });
      const setWatch = (pr: string) =>
        scene.runSkill({
          verb: 'set',
          args: ['--which', pr, '--mode', 'apply'],
          root: scene.roots['surf-demo']!,
          serial: SERIAL,
        });
      const getSaysOf = (needle: string) =>
        scene.getSays().filter((say) => say.text.includes(needle));
      const getPrs = () =>
        scene
          .getAllWatchRecords()
          .map((one) => one.record.pr)
          .sort();

      when(
        '[t0] two watches set under v5.5.5; the box reboots onto this key and a session starts',
        () => {
          const result = useThen('the watches move to this key', async () => {
            const older = genWatchSkillCopy({
              slug: 'watch-boot-journey',
              version: '5.5.5',
            });
            ['1260', '1261'].forEach((pr) =>
              scene.runSkill({
                verb: 'set',
                args: ['--which', pr, '--mode', 'apply'],
                root: scene.roots['surf-demo']!,
                serial: SERIAL,
                skillDir: older.skillDir,
              }),
            );
            const [killed] = getAllWatchDaemonPids({ home: scene.home });
            scene.stopAllDaemons();
            await waitForWatch({
              label: 'older daemon stopped',
              check: () => !isPidAlive(killed!),
            });
            const link = path.join(
              scene.roots['surf-demo']!,
              '.agent',
              'repo=ehmpathy',
              'role=mechanic',
              'skills',
              'git.pull.watch',
            );
            fs.mkdirSync(path.dirname(link), { recursive: true });
            fs.symlinkSync(
              path.join(__dirname, '../../skills/git.pull.watch'),
              link,
            );
            const hook = runHook();
            await waitForWatch({
              label: 'both watches on this key, primed',
              check: () => {
                const found = scene.getAllWatchRecords();
                return (
                  found.length === 2 &&
                  found.every(
                    (one) => !one.key.startsWith('5.5.5+') && one.record.primed,
                  )
                );
              },
              scene,
            });
            return { hook };
          });
          then('one daemon is spawned, and takes both watches', () => {
            expect(result.hook.stdout).toContain(', spawned');
            expect(result.hook.stdout).toContain('2 under an older key');
          });
        },
      );

      when('[t1] #1261 answers 404', () => {
        const result = useThen('its watch ends', async () => {
          scene.setStore((store) => {
            store.github.faultByPr = { 'ehmpathy/surf-demo#1261': 'notfound' };
          });
          await waitForWatch({
            label: 'the #1261 watch leaves',
            check: () => !getPrs().includes(1261),
            scene,
          });
          return { gone: getSaysOf('#1261 answers 404'), prs: getPrs() };
        });
        then('one 404 note, and #1260 still watched', () => {
          expect(result.gone).toHaveLength(1);
          expect(result.prs).toEqual([1260]);
        });
      });

      when(
        '[t2] the seaturtle token dies at its hour; keyrack grants only the grove token',
        () => {
          const result = useThen('the next read', async () => {
            scene.setStore((store) => {
              store.github.token = 'ghs_fake_ehmpath_token_next_hour';
              store.keyrack = 'locked';
            });
            setWatch('1260');
            await waitForWatch({
              label: 'a grove read of #1260',
              check: () =>
                scene
                  .getGhCalls()
                  .some(
                    (call) =>
                      call.token === 'ghs_fake_grove_token' &&
                      call.argv.some((a) => a.endsWith('/pulls/1260')) &&
                      (call.status === 200 || call.status === 304),
                  ),
              scene,
            });
            return { paused: getSaysOf('paused'), prs: getPrs() };
          });
          then('the grove token serves on: no pause, the watch stands', () => {
            expect(result.paused).toHaveLength(0);
            expect(result.prs).toEqual([1260]);
          });
        },
      );

      when('[t3] keyrack locks the grove token too, while it is held', () => {
        const result = useThen('ticks pass', async () => {
          const keyrackBefore = scene.getKeyrackCalls().length;
          const ghBefore = scene.getGhCalls().length;
          scene.setStore((store) => {
            store.keyrackAmbient = 'locked';
          });
          await scene.waitForDaemonTicks({ ticks: 4 });
          return {
            keyrackNew: scene.getKeyrackCalls().length - keyrackBefore,
            ghNew: scene.getGhCalls().length - ghBefore,
            paused: getSaysOf('paused'),
          };
        });
        then('the held token serves on: no keyrack read, no pause', () => {
          expect(result.keyrackNew).toEqual(0);
          expect(result.ghNew).toBeGreaterThan(0);
          expect(result.paused).toHaveLength(0);
        });
      });

      when('[t4] #1260 merges', () => {
        const result = useThen('its watch ends', async () => {
          scene.setStore((store) => {
            store.github.prs['ehmpathy/surf-demo#1260']!.state = 'closed';
            store.github.prs['ehmpathy/surf-demo#1260']!.merged = true;
          });
          await waitForWatch({
            label: 'no watch left',
            check: () => getPrs().length === 0,
            scene,
          });
          await waitForWatch({
            label: 'the daemon exits at zero watches',
            check: () =>
              getAllWatchDaemonPids({ home: scene.home }).length === 0,
            scene,
          });
          return { merged: getSaysOf('#1260 merged; watch ended') };
        });
        then('one merged note, and the daemon exits', () => {
          expect(result.merged).toHaveLength(1);
        });
      });

      when('[t5] the next session starts', () => {
        const result = useThen('the hook runs', async () => ({
          hook: runHook(),
          pids: getAllWatchDaemonPids({ home: scene.home }),
          says: scene.getSays().map((say) => scene.asMasked(say.text)),
        }));
        then('it spawns naught and says naught: the day ends quiet', () => {
          expect(result.hook.status).toEqual(0);
          expect(result.hook.stdout).toEqual('');
          expect(result.pids).toEqual([]);
        });
        then('the day held two notes: the 404 end, then the merge', () => {
          expect(result.says).toHaveLength(2);
          expect(result.says[0]).toContain(
            '#1261 answers 404 to the seaturtle token',
          );
          expect(result.says[1]).toContain('#1260 merged; watch ended');
        });
        then('each note the clone heard reads as it was sent', () => {
          expect(result.says).toMatchSnapshot();
        });
      });
    },
  );
});
