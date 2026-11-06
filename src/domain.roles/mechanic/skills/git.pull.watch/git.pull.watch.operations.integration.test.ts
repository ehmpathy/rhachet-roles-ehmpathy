import { spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = the shared watch operations that guard a record against a tick in
 *         flight, bound a slow read, and note a clone's own comment ids
 * .why  = each guards a race or a platform gap no daemon run can force on
 *         demand, so each is driven here directly, on a real filesystem
 * .mock = a hung `gh` / `rhachet` (genHungBin), a `ps` that fails, and a `stat`
 *         that prints `?` stand in for real tools on PATH, each at its own case
 * .why  = a tool that hangs, or a platform whose ps/stat cannot answer, cannot be
 *         forced on demand; the bound and the fallback are what each clamp proves
 * .real = the real gh and rhachet calls: git.pull.watch.github.real and
 *         git.pull.watch.rhachet.real integration suites
 */
const OPS = path.join(__dirname, 'git.pull.watch.operations.sh');

/**
 * .what = run a bash snippet with the operations sourced, under a temp HOME
 */
const runOps = (input: {
  home: string;
  snippet: string;
  path?: string;
}): { stdout: string; stderr: string; status: number; ms: number } => {
  const began = Date.now();
  const result = spawnSync(
    '/bin/bash',
    ['-c', `source "${OPS}"\n${input.snippet}`],
    {
      encoding: 'utf-8',
      env: {
        ...process.env,
        HOME: input.home,
        ...(input.path ? { PATH: input.path } : {}),
      },
    },
  );
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status ?? 1,
    ms: Date.now() - began,
  };
};

/**
 * .what = a key dir with one watch record and one held alert for it
 */
const genKeyDir = (
  home: string,
): { keyDir: string; record: string; entry: string } => {
  const keyDir = path.join(
    home,
    '.rhachet/storage/repo=ehmpathy/role=mechanic/skill=git.pull.watch/v=1.0.0+abcd1234',
  );
  const record = path.join(
    keyDir,
    'watches/ehmpathy.surf-demo.pr=1220.clone=a1.json',
  );
  const entry = path.join(
    keyDir,
    'outbox/ehmpathy.surf-demo.pr=1220.clone=a1.1700000000.42.7.json',
  );
  fs.mkdirSync(path.dirname(record), { recursive: true });
  fs.mkdirSync(path.dirname(entry), { recursive: true });
  fs.writeFileSync(
    record,
    JSON.stringify({
      watchId: 'w1',
      setAt: '2026-11-01T00:00:00Z',
      primed: false,
    }),
  );
  fs.writeFileSync(entry, JSON.stringify({ text: 'ci failed', tries: 0 }));
  return { keyDir, record, entry };
};

/**
 * .what = hold a key's lock from a live process, as a tick in flight would
 */
const holdLock = (keyDir: string): (() => void) => {
  const holder = spawn('sleep', ['60'], { stdio: 'ignore' });
  fs.mkdirSync(path.join(keyDir, 'daemon.lock'), { recursive: true });
  fs.writeFileSync(path.join(keyDir, 'daemon.lock/owner'), String(holder.pid));
  return () => holder.kill();
};

describe('git.pull.watch.operations', () => {
  given('[case1] a tick writes back a watch record it read', () => {
    when(
      '[t0] the record still stands, with the watchId it was read with',
      () => {
        const result = useThen('the write runs', async () => {
          const home = genTempDir({ slug: 'watch-ops-case1-t0' });
          const scene = genKeyDir(home);
          const run = runOps({
            home,
            snippet: `echo '{"watchId":"w1","primed":true}' | set_watch_record_if_same "${scene.keyDir}" "${scene.record}" "w1"`,
          });
          return {
            run,
            record: JSON.parse(fs.readFileSync(scene.record, 'utf-8')),
          };
        });
        then('the record is advanced', () => {
          expect(result.run.status).toEqual(0);
          expect(result.record.primed).toEqual(true);
        });
      },
    );

    when('[t1] a del removed the record mid-tick', () => {
      const result = useThen('the write runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case1-t1' });
        const scene = genKeyDir(home);
        fs.rmSync(scene.record);
        const run = runOps({
          home,
          snippet: `echo '{"watchId":"w1","primed":true}' | set_watch_record_if_same "${scene.keyDir}" "${scene.record}" "w1"`,
        });
        return { run, revived: fs.existsSync(scene.record) };
      });
      then('the stopped watch is not revived', () => {
        expect(result.run.status).toEqual(0);
        expect(result.revived).toEqual(false);
      });
    });

    when('[t2] the watch was stopped and set anew mid-tick', () => {
      const result = useThen('the write runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case1-t2' });
        const scene = genKeyDir(home);
        fs.writeFileSync(
          scene.record,
          JSON.stringify({
            watchId: 'w2',
            setAt: '2026-11-01T00:05:00Z',
            primed: false,
          }),
        );
        const run = runOps({
          home,
          snippet: `echo '{"watchId":"w1","primed":true}' | set_watch_record_if_same "${scene.keyDir}" "${scene.record}" "w1"`,
        });
        return {
          run,
          record: JSON.parse(fs.readFileSync(scene.record, 'utf-8')),
        };
      });
      then('the fresh watch keeps its own state', () => {
        expect(result.run.status).toEqual(0);
        expect(result.record).toEqual({
          watchId: 'w2',
          setAt: '2026-11-01T00:05:00Z',
          primed: false,
        });
      });
    });

    when('[t2b] the watch was stopped and set anew in the same second', () => {
      const result = useThen('the write runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case1-t2b' });
        const scene = genKeyDir(home);
        // a del + set inside one second: the setAt string is the same, so
        // only the per-life watchId tells the two watches apart
        const run = runOps({
          home,
          snippet: [
            `rm -f "${scene.record}"`,
            `as_watch_record_json ehmpathy/surf-demo 1220 a1 mechanic /tmp/surf-demo | jq '.setAt = "2026-11-01T00:00:00Z"' | set_watch_file_atomic "${scene.record}"`,
            `echo '{"watchId":"w1","setAt":"2026-11-01T00:00:00Z","primed":true}' | set_watch_record_if_same "${scene.keyDir}" "${scene.record}" "w1"`,
          ].join('\n'),
        });
        return {
          run,
          record: JSON.parse(fs.readFileSync(scene.record, 'utf-8')),
        };
      });
      then('the fresh watch keeps its own state', () => {
        expect(result.run.status).toEqual(0);
        expect(result.record.setAt).toEqual('2026-11-01T00:00:00Z');
        expect(result.record.watchId).not.toEqual('w1');
        expect(result.record.primed).toEqual(false);
      });
    });

    when('[t3] another process holds the key lock past the wait', () => {
      const result = useThen('the write runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case1-t3' });
        const scene = genKeyDir(home);
        const release = holdLock(scene.keyDir);
        const run = runOps({
          home,
          snippet: `echo '{"watchId":"w1","primed":true}' | set_watch_record_if_same "${scene.keyDir}" "${scene.record}" "w1"`,
        });
        release();
        return {
          run,
          record: JSON.parse(fs.readFileSync(scene.record, 'utf-8')),
        };
      });
      then('it returns 2 and the record is untouched', () => {
        expect(result.run.status).toEqual(2);
        expect(result.record.primed).toEqual(false);
      });
    });

    when('[t4] the record stands yet will not parse', () => {
      const result = useThen('the write runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case1-t4' });
        const scene = genKeyDir(home);
        fs.writeFileSync(scene.record, '{ not json');
        const run = runOps({
          home,
          snippet: `echo '{"watchId":"w1","primed":true}' | set_watch_record_if_same "${scene.keyDir}" "${scene.record}" "w1"`,
        });
        return { run, content: fs.readFileSync(scene.record, 'utf-8') };
      });
      then(
        'it returns 1 and names the damage; the record is left as found',
        () => {
          expect(result.run.status).toEqual(1);
          expect(result.run.stderr).toContain('record unreadable');
          expect(result.content).toEqual('{ not json');
        },
      );
    });

    when('[t5] the write itself faults', () => {
      const result = useThen('the write runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case1-t5' });
        const scene = genKeyDir(home);
        // a watches dir no one may write: the temp file cannot land
        fs.chmodSync(path.dirname(scene.record), 0o555);
        const run = runOps({
          home,
          snippet: `echo '{"watchId":"w1","primed":true}' | set_watch_record_if_same "${scene.keyDir}" "${scene.record}" "w1"`,
        });
        fs.chmodSync(path.dirname(scene.record), 0o755);
        return {
          run,
          record: JSON.parse(fs.readFileSync(scene.record, 'utf-8')),
          lock: fs.existsSync(path.join(scene.keyDir, 'daemon.lock')),
        };
      });
      then('it returns 1 and names the failed write; the lock is freed', () => {
        expect(result.run.status).toEqual(1);
        expect(result.run.stderr).toContain('record write failed');
        expect(result.record.primed).toEqual(false);
        expect(result.lock).toEqual(false);
      });
    });
  });

  given('[case2] a del removes a watch record', () => {
    when('[t0] the lock is free', () => {
      const result = useThen('the delete runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case2-t0' });
        const scene = genKeyDir(home);
        const peer = path.join(
          scene.keyDir,
          'outbox/ehmpathy.surf-demo.pr=12201.clone=a1.1700000000.42.7.json',
        );
        fs.writeFileSync(peer, '{}');
        const run = runOps({
          home,
          snippet: `del_watch_record_locked "${scene.record}"`,
        });
        return {
          run,
          record: fs.existsSync(scene.record),
          entry: fs.existsSync(scene.entry),
          peer: fs.existsSync(peer),
        };
      });
      then(
        'the record and its held alerts leave; a peer pr keeps its own',
        () => {
          expect(result.run.status).toEqual(0);
          expect(result.record).toEqual(false);
          expect(result.entry).toEqual(false);
          expect(result.peer).toEqual(true);
        },
      );
    });

    when('[t1] a tick holds the lock past the wait', () => {
      const result = useThen('the delete runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case2-t1' });
        const scene = genKeyDir(home);
        const release = holdLock(scene.keyDir);
        const run = runOps({
          home,
          snippet: `del_watch_record_locked "${scene.record}"`,
        });
        release();
        return { run, record: fs.existsSync(scene.record) };
      });
      then('it returns 1 and the record stands', () => {
        expect(result.run.status).toEqual(1);
        expect(result.record).toEqual(true);
      });
    });

    when(
      '[t2] the lock is held past any real hold, by a pid now a stranger',
      () => {
        const result = useThen('the delete runs', async () => {
          const home = genTempDir({ slug: 'watch-ops-case2-t2' });
          const scene = genKeyDir(home);
          const release = holdLock(scene.keyDir);
          // the lock dir dates from a minute ago: its taker died, its pid was reused
          const past = new Date(Date.now() - 60_000);
          fs.utimesSync(path.join(scene.keyDir, 'daemon.lock'), past, past);
          const run = runOps({
            home,
            snippet: `del_watch_record_locked "${scene.record}"`,
          });
          release();
          return { run, record: fs.existsSync(scene.record) };
        });
        then('the old lock is reaped, and the record leaves', () => {
          expect(result.run.status).toEqual(0);
          expect(result.record).toEqual(false);
        });
      },
    );

    when(
      '[t3] the delete names the watch life it judged, and a set renewed it since',
      () => {
        const result = useThen('the delete runs', async () => {
          const home = genTempDir({ slug: 'watch-ops-case2-t3' });
          const scene = genKeyDir(home);
          // the record now holds life w2; the tick judged life w1
          fs.writeFileSync(
            scene.record,
            JSON.stringify({ watchId: 'w2', primed: false }),
          );
          const run = runOps({
            home,
            snippet: `del_watch_record_locked "${scene.record}" w1`,
          });
          return {
            run,
            record: fs.existsSync(scene.record),
            lockLeft: fs.existsSync(path.join(scene.keyDir, 'daemon.lock')),
          };
        });
        then('the new life stays, and the lock is released', () => {
          expect(result.run.status).toEqual(0);
          expect(result.record).toEqual(true);
          expect(result.lockLeft).toEqual(false);
        });
      },
    );
  });

  given('[case3] a box with no gnu timeout (as macos)', () => {
    // a PATH that holds the base tools a mac has, and no `timeout`
    const genPathWithoutTimeout = (): string => {
      const bin = genTempDir({ slug: 'watch-ops-no-timeout' });
      ['sleep', 'cat', 'mktemp', 'touch', 'rm', 'bash'].forEach((tool) => {
        const found = spawnSync('bash', ['-c', `command -v ${tool}`], {
          encoding: 'utf-8',
        }).stdout.trim();
        fs.symlinkSync(found, path.join(bin, tool));
      });
      return bin;
    };

    when('[t0] a bounded command outlasts its bound', () => {
      const result = useThen('it runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case3-t0' });
        return runOps({
          home,
          path: genPathWithoutTimeout(),
          snippet: 'command -v timeout && exit 9; run_watch_bounded 1 sleep 20',
        });
      });
      then(
        'it is killed at the bound and exits 124, as gnu timeout does',
        () => {
          expect(result.status).toEqual(124);
          expect(result.ms).toBeLessThan(10_000);
        },
      );
    });

    when('[t1] a bounded command ends inside its bound', () => {
      const result = useThen('it runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case3-t1' });
        return runOps({
          home,
          path: genPathWithoutTimeout(),
          snippet:
            'command -v timeout && exit 9; out="$(run_watch_bounded 5 sleep 0)"; echo "rc=$?"; run_watch_bounded 5 false; echo "rc=$?"',
        });
      });
      then('its own exit code passes through', () => {
        expect(result.stdout).toContain('rc=0');
        expect(result.stdout).toContain('rc=1');
      });
      then('it returns once the command ends, not at the bound', () => {
        // two calls, each bound at 5s; a watchdog that held the pipe would take 10s
        expect(result.ms).toBeLessThan(4_000);
      });
    });

    when('[t2] a bounded command reads its stdin', () => {
      const result = useThen('it runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case3-t2' });
        return runOps({
          home,
          path: genPathWithoutTimeout(),
          snippet:
            'command -v timeout && exit 9; printf "cowabunga" | run_watch_bounded 5 cat',
        });
      });
      then(
        'the piped text arrives whole, as a `clone say --what @stdin` needs',
        () => {
          expect(result.status).toEqual(0);
          expect(result.stdout).toEqual('cowabunga');
        },
      );
    });

    when('[t3] another hand sends the command a TERM inside its bound', () => {
      const result = useThen('it runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case3-t3' });
        return runOps({
          home,
          path: genPathWithoutTimeout(),
          snippet:
            'command -v timeout && exit 9; run_watch_bounded 5 bash -c \'kill -TERM $$\'; echo "rc=$?"',
        });
      });
      then('it keeps 143: only the bound itself reads as a stall (124)', () => {
        expect(result.stdout).toContain('rc=143');
      });
    });
  });

  given('[case3c] a caller that names a bound-done hook', () => {
    when('[t0] bounded commands return, one ok and one failed', () => {
      const result = useThen('it runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case3c-t0' });
        return runOps({
          home,
          snippet:
            'beats=0; on_done() { beats=$((beats + 1)); }; WATCH_ON_BOUND_DONE=on_done; run_watch_bounded 5 true; echo "rc=$?"; run_watch_bounded 5 false; echo "rc=$?"; echo "beats=$beats"',
        });
      });
      then(
        'the hook runs after every bound, so a heartbeat needs no hand touch',
        () => {
          expect(result.stdout).toContain('beats=2');
        },
      );
      then('each exit code passes through the hook untouched', () => {
        expect(result.stdout).toContain('rc=0');
        expect(result.stdout).toContain('rc=1');
      });
    });
  });

  given('[case3b] an external read that never answers', () => {
    // a bin dir whose one tool hangs; exec, so the bound's kill reaches the sleep
    const genHungBin = (name: string): string => {
      const bin = genTempDir({ slug: `watch-ops-hung-${name}` });
      fs.writeFileSync(path.join(bin, name), '#!/bin/bash\nexec sleep 30\n');
      fs.chmodSync(path.join(bin, name), 0o755);
      return bin;
    };

    when('[t0] gh hangs on a github read', () => {
      const result = useThen('the read runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case3b-t0' });
        return runOps({
          home,
          path: `${genHungBin('gh')}:${process.env.PATH}`,
          snippet: [
            `source "${path.join(__dirname, 'git.pull.watch.github.sh')}"`,
            'WATCH_GITHUB_READ_MAX_SECONDS=1',
            `get_watch_github_resource "${home}/cache" repos/ehmpathy/surf-demo/pulls/1220 tok; echo "rc=$?"`,
          ].join('\n'),
        });
      });
      then('the read is cut at its bound and reads as unreachable', () => {
        expect(result.stdout).toContain('rc=5');
        expect(result.stderr).toContain('no reply in 1s');
        expect(result.ms).toBeLessThan(10_000);
      });
    });

    when('[t1] rhachet hangs on a clone list', () => {
      const result = useThen('the read runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case3b-t1' });
        const root = genTempDir({ slug: 'watch-ops-case3b-t1-root' });
        const binDir = path.join(root, 'node_modules/.bin');
        fs.mkdirSync(binDir, { recursive: true });
        fs.writeFileSync(
          path.join(binDir, 'rhachet'),
          '#!/bin/bash\nexec sleep 30\n',
        );
        fs.chmodSync(path.join(binDir, 'rhachet'), 0o755);
        return runOps({
          home,
          snippet: [
            'WATCH_CLONE_LIST_MAX_SECONDS=1',
            `list="$(get_watch_clone_list "${root}")"; echo "list=[$list]"`,
            `echo "fault=$(get_watch_clone_list_fault "${root}")"`,
          ].join('\n'),
        });
      });
      then(
        'the list reads empty (reach unknown) and the fault names the stall',
        () => {
          expect(result.stdout).toContain('list=[]');
          expect(result.stdout).toContain('gave no answer in 1s');
          expect(result.ms).toBeLessThan(10_000);
        },
      );
    });

    when('[t2] rhachet hangs on a clone say', () => {
      const result = useThen('the send runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case3b-t2' });
        const root = genTempDir({ slug: 'watch-ops-case3b-t2-root' });
        const binDir = path.join(root, 'node_modules/.bin');
        fs.mkdirSync(binDir, { recursive: true });
        fs.writeFileSync(
          path.join(binDir, 'rhachet'),
          '#!/bin/bash\nexec sleep 30\n',
        );
        fs.chmodSync(path.join(binDir, 'rhachet'), 0o755);
        return runOps({
          home,
          snippet: [
            `source "${path.join(__dirname, 'git.pull.watch.alert.sh')}"`,
            'WATCH_SAY_MAX_SECONDS=1',
            `send_watch_alert "${root}" a1 "ci failed"; echo "rc=$?"`,
          ].join('\n'),
        });
      });
      then('the send is cut at its bound, and the alert holds', () => {
        expect(result.stdout).toContain('rc=1');
        expect(result.stderr).toContain('clone say gave no answer in 1s');
        expect(result.ms).toBeLessThan(10_000);
      });
    });

    when('[t3] the repo root of a call is gone', () => {
      const result = useThen('the call runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case3b-t3' });
        return runOps({
          home,
          snippet: `run_watch_rhachet "${home}/gone-worktree" 5 clone list; echo "rc=$?"`,
        });
      });
      then('it fails at once, and names the gone root', () => {
        expect(result.stdout).toContain('rc=1');
        expect(result.stderr).toContain('the repo root is gone');
      });
    });
  });

  given('[case5] waiters on a key lock whose owner died', () => {
    when(
      '[t0] a waiter judged the lock stale, but a fresh taker holds it before the reap',
      () => {
        const result = useThen('the reap runs', async () => {
          const home = genTempDir({ slug: 'watch-ops-case5-t0' });
          const scene = genKeyDir(home);
          // the faster waiter already reaped the dead lock and took a fresh one
          const release = holdLock(scene.keyDir);
          const run = runOps({
            home,
            snippet: `del_watch_lock_stale "${scene.keyDir}/daemon.lock"; echo "rc=$?"`,
          });
          const lockStands = fs.existsSync(
            path.join(scene.keyDir, 'daemon.lock/owner'),
          );
          release();
          return { run, lockStands };
        });
        then(
          'the slower reaper re-judges it inside its guard, and leaves it',
          () => {
            expect(result.run.stdout).toContain('rc=0');
            expect(result.lockStands).toEqual(true);
          },
        );
      },
    );

    when('[t0b] the lock vanishes between its check and its stat', () => {
      const result = useThen('the probe runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case5-t0b' });
        const scene = genKeyDir(home);
        fs.mkdirSync(path.join(scene.keyDir, 'daemon.lock'), {
          recursive: true,
        });
        // a stat that finds naught, as one that runs just after the lock is dropped
        const bin = genTempDir({ slug: 'watch-ops-case5-t0b-bin' });
        fs.writeFileSync(
          path.join(bin, 'stat'),
          '#!/bin/bash\necho "?"\nexit 1\n',
        );
        fs.chmodSync(path.join(bin, 'stat'), 0o755);
        return runOps({
          home,
          path: `${bin}:${process.env.PATH}`,
          snippet: [
            `echo "mtime=[$(get_watch_mtime "${scene.keyDir}/daemon.lock")]"`,
            `is_watch_lock_stale "${scene.keyDir}/daemon.lock"; echo "after=$?"`,
          ].join('\n'),
        });
      });
      then('the mtime reads 0, a number, and the caller runs on', () => {
        expect(result.stdout).toContain('mtime=[0]');
        expect(result.stdout).toContain('after=');
        expect(result.stderr).not.toContain('syntax error');
      });
    });

    when('[t1] another reaper holds the reap guard', () => {
      const result = useThen('the reap runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case5-t1' });
        const scene = genKeyDir(home);
        // a dead owner: the lock is stale
        fs.mkdirSync(path.join(scene.keyDir, 'daemon.lock'), {
          recursive: true,
        });
        fs.writeFileSync(
          path.join(scene.keyDir, 'daemon.lock/owner'),
          '999999',
        );
        fs.mkdirSync(path.join(scene.keyDir, 'daemon.lock.reap'));
        const run = runOps({
          home,
          snippet: `del_watch_lock_stale "${scene.keyDir}/daemon.lock"; echo "rc=$?"`,
        });
        return {
          run,
          lockStands: fs.existsSync(path.join(scene.keyDir, 'daemon.lock')),
        };
      });
      then('it does not reap; the guard holder does', () => {
        expect(result.run.stdout).toContain('rc=1');
        expect(result.lockStands).toEqual(true);
      });
    });

    when('[t2] a lock whose owner died, and no other reaper', () => {
      const result = useThen('a take runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case5-t2' });
        const scene = genKeyDir(home);
        fs.mkdirSync(path.join(scene.keyDir, 'daemon.lock'), {
          recursive: true,
        });
        fs.writeFileSync(
          path.join(scene.keyDir, 'daemon.lock/owner'),
          '999999',
        );
        const run = runOps({
          home,
          snippet: `take_watch_lock "${scene.keyDir}" && echo "$(cat "${scene.keyDir}/daemon.lock/owner") ours=$$"`,
        });
        return {
          run,
          guardLeft: fs.existsSync(path.join(scene.keyDir, 'daemon.lock.reap')),
        };
      });
      then('the take reaps the dead lock and holds a fresh one', () => {
        expect(result.run.status).toEqual(0);
        const [owner, ours] = result.run.stdout.trim().split(' ours=');
        expect(owner).toEqual(ours);
      });
      then('the reap guard is released', () => {
        expect(result.guardLeft).toEqual(false);
      });
    });
  });

  given('[case4] a clone notes a comment id in its ledger', () => {
    when('[t0] the ledger dir can be made', () => {
      const result = useThen('it runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case4-t0' });
        return runOps({
          home,
          snippet:
            'set_watch_ledger_id a1 4242 && set_watch_ledger_id a1 4243 && cat "$(get_watch_ledger_file a1)"',
        });
      });
      then('each id lands on its own line', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toEqual('4242\n4243\n');
      });
    });

    when('[t1] a plain file sits where the ledger dir belongs', () => {
      const result = useThen('it runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case4-t1' });
        const root = path.join(
          home,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/skill=git.pull.watch',
        );
        fs.mkdirSync(root, { recursive: true });
        fs.writeFileSync(path.join(root, 'ledger'), 'not a dir');
        return runOps({
          home,
          snippet:
            'cause="$(set_watch_ledger_id a1 4242)"; echo "rc=$?"; echo "cause=$cause"',
        });
      });
      then('it returns 1 and names the cause', () => {
        expect(result.stdout).toContain('rc=1');
        expect(result.stdout).toMatch(/cause=.*mkdir/);
      });
    });

    when(
      '[t2] the same id is noted twice, as an edit of a keyed comment does',
      () => {
        const result = useThen('it runs', async () => {
          const home = genTempDir({ slug: 'watch-ops-case4-t2' });
          return runOps({
            home,
            snippet:
              'set_watch_ledger_id a1 4242 && set_watch_ledger_id a1 4242 && cat "$(get_watch_ledger_file a1)"',
          });
        });
        then('the ledger holds it once', () => {
          expect(result.status).toEqual(0);
          expect(result.stdout).toEqual('4242\n');
        });
      },
    );
  });

  given('[case6] a pid probe where `ps` cannot answer', () => {
    when('[t0] the pid lives and `ps` exits with a fault', () => {
      const result = useThen('it runs', async () => {
        const home = genTempDir({ slug: 'watch-ops-case6-t0' });
        const bin = genTempDir({ slug: 'watch-ops-case6-bin' });
        fs.writeFileSync(path.join(bin, 'ps'), '#!/bin/bash\nexit 1\n');
        fs.chmodSync(path.join(bin, 'ps'), 0o755);
        const holder = spawn('sleep', ['60'], { stdio: 'ignore' });
        const keyDir = path.join(home, 'key');
        fs.mkdirSync(keyDir, { recursive: true });
        fs.writeFileSync(
          path.join(keyDir, 'daemon.pid'),
          JSON.stringify({ pid: holder.pid }),
        );
        const out = runOps({
          home,
          path: `${bin}:${process.env.PATH}`,
          snippet: `is_watch_daemon_pid ${holder.pid} k; echo "probe=$?"; echo "state=$(get_watch_daemon_state "${keyDir}" k)"`,
        });
        holder.kill();
        return out;
      });
      then('the probe answers "cannot say" (2), never "no"', () => {
        expect(result.stdout).toContain('probe=2');
      });
      then(
        'the state reads live, so the findsert neither spawns a twin nor kills',
        () => {
          expect(result.stdout).toContain('state=live');
        },
      );
    });
  });
});
