import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = the daemon's own rhachet boundaries, driven against the real rhachet:
 *         `clone list` (reach), `clone say` (delivery), `keyrack get` (token)
 * .why  = the watch suites answer these from a stub that mirrors their shapes;
 *         this suite proves the mirror against the real cli, so a drift in the
 *         real reply is caught here, not in a clone that is never alerted
 * .note = a live `clone say` success needs a brain session in a terminal, which
 *         needs an oauth token the test tiers forbid (F15); the failure shapes
 *         and the token read need neither, so both are proven here for real
 */
const SKILL_DIR = __dirname;
const REPO_BIN = path.join(__dirname, '../../../../../node_modules/.bin');
const SERIAL_UNKNOWN = '00000000-dead-4000-8000-0000000000aa';

/**
 * .what = run a bash snippet with the watch files sourced, cwd at a repo root
 * .note = PATH leads with this repo's own bin, so `rhachet` is the real one
 */
const runWatchShell = (input: {
  root: string;
  snippet: string;
}): { stdout: string; stderr: string; status: number } => {
  const result = spawnSync(
    '/bin/bash',
    [
      '-c',
      [
        `source "${path.join(SKILL_DIR, 'git.pull.watch.operations.sh')}"`,
        `source "${path.join(SKILL_DIR, 'git.pull.watch.alert.sh')}"`,
        `source "${path.join(SKILL_DIR, 'git.pull.watch.token.sh')}"`,
        input.snippet,
      ].join('\n'),
    ],
    {
      cwd: input.root,
      encoding: 'utf-8',
      // ci's keyrack firewall lifts test keys into the env; the daemon reads keyrack
      // alone, so the env copy is dropped to keep the read hermetic
      env: {
        ...process.env,
        EHMPATHY_SEATURTLE_GITHUB_TOKEN: undefined,
        PATH: `${REPO_BIN}:${process.env.PATH}`,
      },
      timeout: 90_000,
    },
  );
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status ?? 1,
  };
};

/**
 * .what = a fresh git repo with no rhachet registry and no keyrack manifest
 */
const genBareRepo = (slug: string): string => {
  const root = genTempDir({ slug });
  spawnSync('git', ['init', '-q'], { cwd: root });
  return fs.realpathSync(root);
};

describe('git.pull.watch, against the real rhachet', () => {
  given('[case1] a repo root with no clone enrolled', () => {
    when('[t0] the daemon reads its clone list', () => {
      const result = useThen('it reads', async () => {
        const root = genBareRepo('watch-real-rhachet-case1');
        return runWatchShell({
          root,
          snippet: [
            `list="$(get_watch_clone_list "${root}")"`,
            `printf 'list=%s\\n' "$list" | head -c 400; echo`,
            `echo "reach=$(as_watch_clone_reach "$list" ${SERIAL_UNKNOWN})"`,
          ].join('\n'),
        });
      });
      then('the real list parses, and an unknown serial reads absent', () => {
        expect(result.status).toEqual(0);
        // absent, never unknown: `unknown` would mean the real shape no longer parses
        expect(result.stdout).toContain('reach=absent');
      });
    });
  });

  given('[case2] an alert to a clone no registry knows', () => {
    when('[t0] the daemon sends it through the real clone say', () => {
      const result = useThen('it sends', async () => {
        const root = genBareRepo('watch-real-rhachet-case2');
        return runWatchShell({
          root,
          snippet: [
            `rc=0`,
            `send_watch_alert "${root}" ${SERIAL_UNKNOWN} "🐢 pr watch — ci failed on #1220" || rc=$?`,
            `echo "rc=$rc"`,
          ].join('\n'),
        });
      });
      then(
        'the refusal reads hold (1), never dead (3), so the watch stands',
        () => {
          expect(result.stdout).toContain('rc=1');
        },
      );
      then('the hold log line carries the real refusal', () => {
        expect(result.stderr).toContain(`hold @:${SERIAL_UNKNOWN} (exit 2)`);
        expect(result.stderr).toContain('"class": "ConstraintError"');
        expect(result.stderr).toContain('no clone answers to');
      });
    });

    when('[t1] the real clone say is asked directly', () => {
      const result = useThen('it refuses', async () => {
        const root = genBareRepo('watch-real-rhachet-case2-t1');
        return runWatchShell({
          root,
          snippet: `printf 'hi' | rhachet clone say "@:${SERIAL_UNKNOWN}" --what @stdin --output json`,
        });
      });
      then(
        'its json failure record carries the reachState the daemon reads',
        () => {
          expect(result.status).toEqual(2);
          const record = JSON.parse(result.stdout || result.stderr);
          expect(record.class).toEqual('ConstraintError');
          expect(record).toHaveProperty('reachState');
          expect(record.reachState).not.toEqual('DEAD');
        },
      );
    });
  });

  given('[case3] a repo root with no keyrack manifest', () => {
    when('[t0] the daemon reads its github token from the real keyrack', () => {
      const result = useThen('it reads', async () => {
        const root = genBareRepo('watch-real-rhachet-case3');
        return runWatchShell({
          root,
          snippet: [
            `get_watch_token "${root}"`,
            `echo "status=$WATCH_TOKEN_STATUS"`,
            `echo "token=$([[ -n "$WATCH_TOKEN" ]] && echo set || echo empty)"`,
          ].join('\n'),
        });
      });
      then(
        'the real reply parses to a status a human can act on, not a fault',
        () => {
          expect(result.status).toEqual(0);
          // the full slug reads from any root: absent where this host holds no
          // such key, locked where it holds one not yet unlocked. `fault` would
          // mean the real reply no longer parses
          const status = result.stdout.match(/status=(\w+)/)?.[1];
          expect(['absent', 'locked']).toContain(status);
          expect(result.stdout).toContain('token=empty');
        },
      );
    });

    when('[t0b] the daemon reads the grove token from the real keyrack', () => {
      const result = useThen('it reads', async () => {
        const root = genBareRepo('watch-real-rhachet-case3-t0b');
        return runWatchShell({
          root,
          snippet: [
            `out="$(run_watch_rhachet "${root}" 30 keyrack get --key "$WATCH_TOKEN_SLUG_AMBIENT" --owner ehmpath --env prep --allow-dangerous --json 2>/dev/null)" || true`,
            `echo "status=$(as_watch_token_state "$out" | cut -f1)"`,
          ].join('\n'),
        });
      });
      then('the real keyrack takes the @all slug, and its reply parses', () => {
        expect(result.status).toEqual(0);
        // granted, absent, or locked by host; `fault` would mean keyrack
        // refused the slug or its reply no longer parses
        const status = result.stdout.match(/status=(\w+)/)?.[1];
        expect(['granted', 'absent', 'locked']).toContain(status);
      });
    });

    when('[t1] the bare key name is read there, as the daemon once did', () => {
      const result = useThen('it reads', async () => {
        const root = genBareRepo('watch-real-rhachet-case3-t1');
        return runWatchShell({
          root,
          snippet: [
            `rc=0`,
            `err="$(rhachet keyrack get --key EHMPATHY_SEATURTLE_GITHUB_TOKEN --owner ehmpath --env prep --allow-dangerous --json 2>&1 1>/dev/null)" || rc=$?`,
            `echo "rc=$rc"`,
            `echo "cause=$(printf '%s\\n' "$err" | as_watch_fault_cause)"`,
          ].join('\n'),
        });
      });
      then(
        'real keyrack refuses it with no keyrack.yml, which is why the daemon reads the full slug',
        () => {
          expect(result.stdout).toContain('rc=2');
          expect(result.stdout).toContain('without keyrack.yml');
        },
      );
      then(
        'the fault cause is the error line, never the `ran:` trailer',
        () => {
          expect(result.stdout).toMatch(
            /cause=ConstraintError: cannot construct slug/,
          );
          expect(result.stdout).not.toMatch(/cause=.*ran:/);
        },
      );
    });
  });
});
