import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genTestDir } from './.test/invokeHook';

/**
 * .what = acceptance tests for `rhx git.pull.watch get | set | del`, run via rhachet against the linked role
 * .why  = a caller reaches the verbs through rhachet, never by their file path; the
 *         manifest registration and the dispatch must hold on that road. the contract
 *         itself (spawn, findsert, alerts, faults) is proven in the git.pull.watch
 *         integration suites, and against the real services in the github.real and
 *         rhachet.real suites
 * .note = no case here reaches github nor spawns a daemon: each run stops at --help,
 *         at an input refusal, or at a `get` of a temp HOME (empty, or seeded with the
 *         files a daemon leaves), so no credential is needed and the runner's own
 *         pr-watch state is never read
 */

// a role link plus nine npx runs outlast the 90s default when suites run side by side
jest.setTimeout(300_000);

/**
 * .what = run a verb the way a caller does: through rhachet
 */
const runViaRhachet = (input: {
  dir: string;
  skill: string;
  args: string[];
  env?: Record<string, string>;
}): { stdout: string; stderr: string; code: number | null } => {
  const result = spawnSync(
    'npx',
    ['rhachet', 'run', '--skill', input.skill, ...input.args],
    {
      cwd: input.dir,
      env: { ...process.env, ...input.env },
      encoding: 'utf-8', // node api param name
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 180_000, // node api param name; a cold npx on a busy box outlasts 60s
    },
  );
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    code: result.status,
  };
};

/**
 * .what = what the caller sees, from the skill's first line on (a 🐢 or ✋ header,
 *         or a help's usage line), color codes stripped
 * .why  = npx and rhachet may print before the skill; color codes vary by terminal
 */
const asSkillRender = (input: { stdout: string }): string => {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: strip ansi color codes
  const plain = input.stdout.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
  const at = plain.search(/🐢|✋|^usage: /mu);
  return plain.slice(Math.max(0, at));
};

describe('git.pull.watch, via rhachet', () => {
  given('[case1] a repo with the mechanic role linked', () => {
    const scene = useBeforeAll(async () => ({
      dir: await genTestDir({ slug: 'git-pull-watch-acceptance' }),
    }));

    when('[t0] each verb is asked for --help', () => {
      const result = useThen('they run', async () => ({
        get: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.watch.get',
          args: ['--help'],
        }),
        set: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.watch.set',
          args: ['--help'],
        }),
        del: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.watch.del',
          args: ['--help'],
        }),
      }));
      then('each exits 0 and names its own usage', () => {
        expect(result.get.code).toBe(0);
        expect(result.set.code).toBe(0);
        expect(result.del.code).toBe(0);
        expect(result.get.stdout).toContain('usage: git.pull.watch.get');
        expect(result.set.stdout).toContain('usage: git.pull.watch.set');
        expect(result.del.stdout).toContain('usage: git.pull.watch.del');
      });
      then('each help is snapped', () => {
        expect({
          get: asSkillRender(result.get),
          set: asSkillRender(result.set),
          del: asSkillRender(result.del),
        }).toMatchSnapshot();
      });
    });

    when('[t1] set and del meet an input refusal', () => {
      const result = useThen('they run', async () => ({
        setNoPr: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.watch.set',
          args: ['--mode', 'apply'],
        }),
        setBadMode: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.watch.set',
          args: ['--pr', '7', '--mode', 'yolo'],
        }),
        delNoPr: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.watch.del',
          args: [],
        }),
      }));
      then('each refuses with exit 2 and names the fix, on both streams', () => {
        expect(result.setNoPr.code).toBe(2);
        expect(result.setNoPr.stdout).toContain(
          '✋ ConstraintError: --pr <n> is required',
        );
        expect(result.setNoPr.stderr).toContain('ConstraintError');
        expect(result.setBadMode.code).toBe(2);
        expect(result.setBadMode.stdout).toContain(
          '--mode must be one of: plan | apply',
        );
        expect(result.delNoPr.code).toBe(2);
        expect(result.delNoPr.stdout).toContain('--pr <n> is required');
      });
      then('each refusal is snapped', () => {
        expect({
          setNoPr: asSkillRender(result.setNoPr),
          setBadMode: asSkillRender(result.setBadMode),
          delNoPr: asSkillRender(result.delNoPr),
        }).toMatchSnapshot();
      });
    });

    when('[t2] the dispatcher is called with a spaced verb, or none', () => {
      const result = useThen('they run', async () => ({
        setHelp: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.watch',
          args: ['set', '--help'],
        }),
        bare: runViaRhachet({
          dir: scene.dir,
          skill: 'git.pull.watch',
          args: [],
        }),
      }));
      then('a known verb runs that verb', () => {
        expect(result.setHelp.code).toBe(0);
        expect(result.setHelp.stdout).toContain('usage: git.pull.watch.set');
      });
      then('no verb refuses with exit 2 and names the verbs', () => {
        expect(result.bare.code).toBe(2);
        expect(result.bare.stdout).toContain(
          'a verb is required; the verbs are get | set | del',
        );
        expect(asSkillRender(result.bare)).toMatchSnapshot();
      });
    });

    when('[t3] get reads a box with no watches', () => {
      // HOME at a temp dir: the read sees an empty box, never the runner's own state
      const result = useThen('it runs', async () => {
        const home = genTempDir({ slug: 'git-pull-watch-acceptance-home', git: false });
        return {
          tree: runViaRhachet({
            dir: scene.dir,
            skill: 'git.pull.watch.get',
            args: [],
            env: { HOME: home },
          }),
          json: runViaRhachet({
            dir: scene.dir,
            skill: 'git.pull.watch.get',
            args: ['--output', 'json'],
            env: { HOME: home },
          }),
        };
      });
      then('the tree says so, and names how to watch a pr', () => {
        expect(result.tree.code).toBe(0);
        expect(result.tree.stdout).toContain('no daemons, no watches');
        expect(result.tree.stdout).toContain(
          'rhx git.pull.watch set --pr <n> --mode apply',
        );
        expect(asSkillRender(result.tree)).toMatchSnapshot();
      });
      then('the json holds an empty daemons list', () => {
        expect(result.json.code).toBe(0);
        const at = result.json.stdout.indexOf('{');
        expect(JSON.parse(result.json.stdout.slice(at))).toEqual({
          daemons: [],
        });
        expect(result.json.stdout.slice(at)).toMatchSnapshot();
      });
    });

    when('[t4] get reads a box that holds watches, and unwell daemons', () => {
      // HOME at a temp dir, seeded with the files a daemon and its watches leave
      const result = useThen('it runs', async () => {
        const home = genTempDir({
          slug: 'git-pull-watch-acceptance-held',
          git: false,
        });
        const root = path.join(
          home,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/skill=git.pull.watch',
        );
        const asRecord = (input: { pr: number; slug: string }) =>
          JSON.stringify({
            repo: 'ehmpathy/surf-demo',
            pr: input.pr,
            cloneSerial: 'a1a1a1a1-0000-4000-8000-00000000000a',
            cloneSlug: input.slug,
            repoRoot: '/home/turtle/git/surf-demo.beav.feat-wave',
            primed: true,
          });
        // a stale daemon: its pid is dead; paused on a locked token; one record will not parse
        const staleDir = path.join(root, 'v=1.0.0+cafe0001');
        fs.mkdirSync(path.join(staleDir, 'watches'), { recursive: true });
        fs.writeFileSync(
          path.join(staleDir, 'daemon.pid'),
          JSON.stringify({ pid: 999_999_999 }),
        );
        fs.writeFileSync(
          path.join(staleDir, 'daemon.heartbeat'),
          String(Math.floor(Date.now() / 1000) - 600),
        );
        fs.writeFileSync(path.join(staleDir, 'daemon.paused'), 'locked');
        fs.writeFileSync(
          path.join(staleDir, 'watches', 'surf-demo.1220.json'),
          asRecord({ pr: 1220, slug: 'mechanic' }),
        );
        fs.writeFileSync(
          path.join(staleDir, 'watches', 'surf-demo.1221.json'),
          '{"repo": "ehmpathy/surf-de',
        );
        // an absent daemon: no pid record, yet a watch waits on it
        const absentDir = path.join(root, 'v=1.0.1+cafe0002');
        fs.mkdirSync(path.join(absentDir, 'watches'), { recursive: true });
        fs.writeFileSync(
          path.join(absentDir, 'watches', 'surf-demo.1230.json'),
          asRecord({ pr: 1230, slug: 'mechanic-two' }),
        );
        return {
          home,
          tree: runViaRhachet({
            dir: scene.dir,
            skill: 'git.pull.watch.get',
            args: [],
            env: { HOME: home },
          }),
          json: runViaRhachet({
            dir: scene.dir,
            skill: 'git.pull.watch.get',
            args: ['--output', 'json'],
            env: { HOME: home },
          }),
          badOutput: runViaRhachet({
            dir: scene.dir,
            skill: 'git.pull.watch.get',
            args: ['--output', 'yaml'],
            env: { HOME: home },
          }),
        };
      });
      // the temp HOME and each tick age vary per run
      const asMasked = (text: string): string =>
        text
          .split(result.home)
          .join('<home>')
          .replace(/last tick \d+s ago/g, 'last tick <n>s ago')
          .replace(/"lastTickSecondsAgo": \d+/g, '"lastTickSecondsAgo": "<n>"');
      then('the tree names each daemon state and each watch', () => {
        expect(result.tree.code).toBe(0);
        expect(result.tree.stdout).toContain(
          'daemon v1.0.0+cafe0001 · stale · pid 999999999',
        );
        expect(result.tree.stdout).toContain('· paused (token locked)');
        expect(result.tree.stdout).toContain(
          'ehmpathy/surf-demo#1220 → @:mechanic (surf-demo.beav.feat-wave)',
        );
        expect(result.tree.stdout).toContain('unreadable record: ');
        expect(result.tree.stdout).toContain(
          'daemon v1.0.1+cafe0002 · absent · no pid · never ticked',
        );
        expect(result.tree.stdout).toContain(
          'ehmpathy/surf-demo#1230 → @:mechanic-two (surf-demo.beav.feat-wave)',
        );
      });
      then('the tree names the cure for each unwell part', () => {
        expect(result.tree.stdout).toContain(
          'a stale, wedged, or absent daemon serves no watch',
        );
        expect(result.tree.stdout).toContain(
          'a paused daemon reads naught; the github token is locked',
        );
        expect(result.tree.stdout).toContain(
          'a watch record that does not parse is held, never served',
        );
        expect(asMasked(asSkillRender(result.tree))).toMatchSnapshot();
      });
      then('the json holds the same daemons and watches', () => {
        expect(result.json.code).toBe(0);
        const at = result.json.stdout.indexOf('{');
        const parsed = JSON.parse(result.json.stdout.slice(at));
        expect(
          parsed.daemons.map((one: { key: string; state: string }) => [
            one.key,
            one.state,
          ]),
        ).toEqual([
          ['1.0.0+cafe0001', 'stale'],
          ['1.0.1+cafe0002', 'absent'],
        ]);
        expect(parsed.daemons[0].paused).toEqual('locked');
        expect(
          parsed.daemons[0].watches.filter(
            (one: { unreadable?: boolean }) => one.unreadable,
          ),
        ).toHaveLength(1);
        expect(asMasked(result.json.stdout.slice(at))).toMatchSnapshot();
      });
      then('a bad --output refuses with exit 2 and names the choices', () => {
        expect(result.badOutput.code).toBe(2);
        expect(result.badOutput.stdout).toContain('✋ ConstraintError: --output');
        expect(result.badOutput.stderr).toContain('ConstraintError');
        expect(asSkillRender(result.badOutput)).toMatchSnapshot();
      });
    });

    when('[t5] del stops a watch a clone holds, then finds none', () => {
      // del needs no registry, keyrack, or github: a temp HOME and a serial suffice
      const result = useThen('it runs', async () => {
        const home = genTempDir({
          slug: 'git-pull-watch-acceptance-del',
          git: false,
        });
        const serial = 'a1a1a1a1-0000-4000-8000-00000000000a';
        const record = path.join(
          home,
          '.rhachet/storage/repo=ehmpathy/role=mechanic/skill=git.pull.watch/v=1.0.0+cafe0003/watches',
          `ehmpathy.surf-demo.pr=1240.clone=${serial}.json`,
        );
        fs.mkdirSync(path.dirname(record), { recursive: true });
        fs.writeFileSync(
          record,
          JSON.stringify({
            repo: 'ehmpathy/surf-demo',
            pr: 1240,
            cloneSerial: serial,
            cloneSlug: 'mechanic',
            repoRoot: '/home/turtle/git/surf-demo.beav.feat-wave',
            primed: true,
          }),
        );
        const run = (args: string[]) =>
          runViaRhachet({
            dir: scene.dir,
            skill: 'git.pull.watch.del',
            args: ['--pr', '1240', '--in', 'ehmpathy/surf-demo', ...args],
            env: { HOME: home, RHACHET_CLONE_SERIAL: serial },
          });
        const plan = run([]);
        const recordAfterPlan = fs.existsSync(record);
        const apply = run(['--mode', 'apply']);
        const recordAfterApply = fs.existsSync(record);
        const noop = run(['--mode', 'apply']);
        const noopJson = run(['--mode', 'apply', '--output', 'json']);
        return {
          plan,
          apply,
          noop,
          noopJson,
          recordAfterPlan,
          recordAfterApply,
        };
      });
      then('plan names the watch, writes naught, and names the apply', () => {
        expect(result.plan.code).toBe(0);
        expect(result.plan.stdout).toContain('verdict: would delete');
        expect(result.plan.stdout).toContain('daemon: v1.0.0+cafe0003');
        expect(result.plan.stdout).toContain(
          'rhx git.pull.watch.del --pr 1240 --in ehmpathy/surf-demo --mode apply',
        );
        expect(result.recordAfterPlan).toBe(true);
        expect(asSkillRender(result.plan)).toMatchSnapshot();
      });
      then('apply deletes the record', () => {
        expect(result.apply.code).toBe(0);
        expect(result.apply.stdout).toContain('verdict: deleted');
        expect(result.recordAfterApply).toBe(false);
        expect(asSkillRender(result.apply)).toMatchSnapshot();
      });
      then('a second apply is a no-op, in the tree', () => {
        expect(result.noop.code).toBe(0);
        expect(result.noop.stdout).toContain('verdict: absent — no-op');
        expect(asSkillRender(result.noop)).toMatchSnapshot();
      });
      then('a second apply is a no-op, in the json', () => {
        const at = result.noopJson.stdout.indexOf('{');
        const parsed = JSON.parse(result.noopJson.stdout.slice(at));
        expect(parsed.verdict).toEqual('absent — no-op');
        expect(parsed.keys).toEqual([]);
        expect(result.noopJson.stdout.slice(at)).toMatchSnapshot();
      });
    });

    when('[t6] set meets a caller slip that rhachet itself reveals', () => {
      // each stops before a spawn: no daemon, keyrack, or github is reached
      const result = useThen('it runs', async () => {
        const home = genTempDir({
          slug: 'git-pull-watch-acceptance-set',
          git: false,
        });
        const run = (input: { args: string[]; serial: string }) =>
          runViaRhachet({
            dir: scene.dir,
            skill: 'git.pull.watch.set',
            args: input.args,
            env: { HOME: home, RHACHET_CLONE_SERIAL: input.serial },
          });
        return {
          noSerial: run({
            args: ['--pr', '7', '--in', 'ehmpathy/surf-demo', '--mode', 'apply'],
            serial: '',
          }),
          badIn: run({
            args: ['--pr', '7', '--in', 'nonsense', '--mode', 'apply'],
            serial: 'f0f0f0f0-0000-4000-8000-00000000000f',
          }),
          strangerSerial: run({
            args: ['--pr', '7', '--in', 'ehmpathy/surf-demo', '--mode', 'apply'],
            serial: 'f0f0f0f0-0000-4000-8000-00000000000f',
          }),
        };
      });
      // the test dir path varies per run; the skill names its realpath
      const asMasked = (text: string): string =>
        text
          .split(fs.realpathSync(scene.dir))
          .join('<repo>')
          .split(scene.dir)
          .join('<repo>');
      then('a session with no clone serial is refused, exit 2', () => {
        expect(result.noSerial.code).toBe(2);
        expect(result.noSerial.stdout).toContain(
          '✋ ConstraintError: not an enrolled clone',
        );
        expect(asMasked(asSkillRender(result.noSerial))).toMatchSnapshot();
      });
      then('a bad --in names the value it got, exit 2', () => {
        expect(result.badIn.code).toBe(2);
        expect(result.badIn.stdout).toContain(
          "✋ ConstraintError: --in must be <owner/name>; got 'nonsense'",
        );
        expect(asMasked(asSkillRender(result.badIn))).toMatchSnapshot();
      });
      then('a serial the registry lacks is refused, exit 2', () => {
        expect(result.strangerSerial.code).toBe(2);
        expect(result.strangerSerial.stdout).toContain(
          'clone f0f0f0f0-0000-4000-8000-00000000000f is absent in the registry of',
        );
        expect(
          asMasked(asSkillRender(result.strangerSerial)),
        ).toMatchSnapshot();
      });
    });

    when('[t7] the linked role is read for the files a daemon boots from', () => {
      // `set` copies the skill dir's *.sh into each key's own bin, then boots the
      // daemon from that copy; a file the build drops would fail only at spawn
      const result = useThen('it reads', async () => {
        const linkedDir = path.join(
          scene.dir,
          '.agent/repo=ehmpathy/role=mechanic/skills/git.pull.watch',
        );
        const sourceDir = path.join(
          __dirname,
          '../src/domain.roles/mechanic/skills/git.pull.watch',
        );
        const asShFiles = (dir: string): string[] =>
          fs
            .readdirSync(dir)
            .filter((name) => name.endsWith('.sh'))
            .sort();
        const linked = asShFiles(linkedDir);
        return {
          linked,
          source: asShFiles(sourceDir),
          // each shipped file, byte for byte against source, and its exec bit
          drifts: linked.filter(
            (name) =>
              !fs
                .readFileSync(path.join(linkedDir, name))
                .equals(fs.readFileSync(path.join(sourceDir, name))),
          ),
          // no exec bit for owner, group, or other
          unexecutable: linked.filter(
            (name) => (fs.statSync(path.join(linkedDir, name)).mode & 0o111) === 0,
          ),
        };
      });
      then('every daemon file in source ships in the linked role', () => {
        expect(result.linked).toEqual(result.source);
        expect(result.linked).toContain('git.pull.watch.daemon.sh');
        expect(result.linked).toContain('git.pull.watch.alert.sh');
        expect(result.linked).toContain('git.pull.watch.operations.sh');
      });
      then('each shipped file is whole and executable', () => {
        expect(result.drifts).toEqual([]);
        expect(result.unexecutable).toEqual([]);
      });
    });
  });
});
