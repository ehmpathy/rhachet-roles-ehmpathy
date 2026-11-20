import { spawnSync } from 'child_process';

import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import * as fs from 'fs';
import * as path from 'path';

import { genTestDir } from './.test/invokeHook';

/**
 * .what = acceptance tests for `rhx git.commit.push`, run via rhachet against the linked role
 * .why  = a caller reaches the push through rhachet, never by its file path; the
 *         manifest registration and the dispatch must hold on that road. the contract
 *         itself (push, pr findsert, watch) is proven in git.commit.push.integration.test.ts
 *         and git.commit.push.watch-journey.integration.test.ts
 * .note = [case1] stops at --help or at an input refusal, before any push.
 *         [case2] walks the public-repo hold: a held push, then the promised rerun,
 *         against a local bare origin and a PATH stub gh, under --auth as-human
 * .mock = [case2]'s gh is a PATH stub that answers `repo view` as public and opens one pr
 * .why  = github cannot be set public on demand, and a test job holds no write scope;
 *         the hold sends no text, and the promised push lands only on a local bare repo
 * .real = external.contracts.integration.test.ts [case4] runs the same `gh repo view`
 *         read through the real gh
 */

/**
 * .what = run the skill the way a caller does: through rhachet
 */
const runViaRhachet = (input: {
  dir: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
}): { stdout: string; stderr: string; code: number | null } => {
  // this repo's rhachet bin, called direct: npx under a stub HOME hangs on its empty cache
  const result = spawnSync(
    path.join(__dirname, '..', 'node_modules', '.bin', 'rhachet'),
    ['run', '--skill', 'git.commit.push', ...input.args],
    {
      cwd: input.dir,
      env: input.env ?? process.env,
      encoding: 'utf-8', // node api param name
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60_000, // node api param name
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

describe('git.commit.push, via rhachet', () => {
  given('[case1] a repo with the mechanic role linked', () => {
    const scene = useBeforeAll(async () => ({
      dir: await genTestDir({ slug: 'git-commit-push-acceptance' }),
    }));

    when('[t0] the push is asked for --help', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({ dir: scene.dir, args: ['--help'] }),
      );
      then('it exits 0 and names its usage and each flag', () => {
        expect(result.code).toBe(0);
        expect(result.stdout).toContain('usage: git.commit.push');
        expect(result.stdout).toContain('--mode plan|apply');
        expect(result.stdout).toContain('--auth as-ehmpath|as-human');
      });
      then('the help is snapped', () => {
        expect(asSkillRender(result)).toMatchSnapshot();
      });
    });

    when('[t1] the push is handed an unknown --mode', () => {
      const result = useThen('it runs', async () =>
        runViaRhachet({ dir: scene.dir, args: ['--mode', 'surf'] }),
      );
      then('it refuses with exit 2, on both streams', () => {
        expect(result.code).toBe(2);
        expect(result.stdout).toContain(
          "✋ ConstraintError: --mode must be 'plan' or 'apply'",
        );
        expect(result.stderr).toContain(
          "✋ ConstraintError: --mode must be 'plan' or 'apply'",
        );
      });
      then('the refusal is snapped', () => {
        expect(asSkillRender(result)).toMatchSnapshot();
      });
    });
  });

  given('[case2] a linked repo whose branch pushes into a public repo', () => {
    const PROMISE = 'text-to-public-repo-is-anonymized';
    const BRANCH = 'turtle/reef-map';

    const scene = useBeforeAll(async () => {
      const dir = await genTestDir({ slug: 'git-commit-push-public' });
      const git = (args: string[]) =>
        spawnSync('git', args, { cwd: dir, encoding: 'utf-8' }); // node api param name

      // the repo's org, which the push reads to find its grant and its token key
      fs.mkdirSync(path.join(dir, '.agent'), { recursive: true });
      fs.writeFileSync(
        path.join(dir, '.agent', 'keyrack.yml'),
        'org: ehmpathy\nenv.all:\n  - EHMPATHY_SEATURTLE_GITHUB_TOKEN\nenv.prod:\n',
      );

      // a push grant, kept out of the tree
      fs.mkdirSync(path.join(dir, '.meter'), { recursive: true });
      fs.writeFileSync(
        path.join(dir, '.meter', 'git.commit.uses.jsonc'),
        JSON.stringify({ uses: 3, push: 'allow' }, null, 2),
      );

      // one seaturtle commit on a feature branch, and a bare origin to push to
      git(['checkout', '-b', BRANCH]);
      fs.writeFileSync(path.join(dir, 'reef.md'), 'kelp beds\n');
      git(['add', 'reef.md']);
      git([
        'commit',
        '--author=seaturtle[bot] <seaturtle@ehmpath.com>',
        '-m',
        'feat(reef): map the kelp beds',
      ]);
      const remoteDir = genTempDir({ slug: 'git-commit-push-public-remote' });
      spawnSync('git', ['init', '--bare'], { cwd: remoteDir });
      git(['remote', 'add', 'origin', remoteDir]);

      // a home with the ehmpathy org allowed, so the org gate passes
      const home = genTempDir({ slug: 'git-commit-push-public-home' });
      const orgMeterDir = path.join(
        home,
        '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
      );
      fs.mkdirSync(orgMeterDir, { recursive: true });
      fs.writeFileSync(
        path.join(orgMeterDir, 'git.commit.uses.org.jsonc'),
        JSON.stringify({ orgs: { ehmpathy: 'allowed' } }, null, 2),
      );

      // the stub gh: `repo view` answers public; `pr create` opens #42; each call logged
      const fakeBin = genTempDir({ slug: 'git-commit-push-public-bin' });
      const ghLog = path.join(fakeBin, 'gh.calls.log');
      fs.writeFileSync(
        path.join(fakeBin, 'gh'),
        `#!/bin/bash
echo "$*" >> "${ghLog}"
if [[ "$1" == "repo" && "$2" == "view" ]]; then echo "ehmpathy/surf-demo PUBLIC"; exit 0; fi
if [[ "$1" == "pr" && "$2" == "list" ]]; then exit 0; fi
if [[ "$1" == "pr" && "$2" == "create" ]]; then echo "https://github.com/ehmpathy/surf-demo/pull/42"; exit 0; fi
exit 1`,
      );
      fs.chmodSync(path.join(fakeBin, 'gh'), '755');

      // no github token, so no real credential can leak into a run; no clone watch
      const {
        EHMPATHY_SEATURTLE_GITHUB_TOKEN: _a,
        GH_TOKEN: _b,
        GITHUB_TOKEN: _c,
        ...envBase
      } = process.env;
      const env: NodeJS.ProcessEnv = {
        ...envBase,
        HOME: home,
        PATH: `${fakeBin}:${process.env.PATH}`,
        RHACHET_CLONE_SERIAL: '',
      };

      const getGhCalls = (): string[] =>
        fs.existsSync(ghLog)
          ? fs
              .readFileSync(ghLog, 'utf-8')
              .split('\n')
              .filter((line) => line.length > 0)
          : [];
      const isBranchOnRemote = (): boolean =>
        git(['ls-remote', '--heads', 'origin', BRANCH]).stdout.includes(BRANCH);
      return { dir, env, getGhCalls, isBranchOnRemote };
    });

    when('[t0] the driver pushes, is held, checks the commit messages, and reruns with the promise', () => {
      const result = useThen('it runs', async () => {
        const run = (args: string[]) =>
          runViaRhachet({
            dir: scene.dir,
            args: [...args, '--auth', 'as-human'],
            env: scene.env,
          });

        // no promise: held before any push
        const held = run(['--mode', 'apply']);
        const afterHeld = {
          isBranchOnRemote: scene.isBranchOnRemote(),
          prCalls: scene.getGhCalls().filter((call) => call.startsWith('pr ')),
        };

        // the printed rerun: the same command, with the promise
        const promised = run(['--mode', 'apply', '--promise', PROMISE]);
        return {
          held,
          afterHeld,
          promised,
          isBranchOnRemote: scene.isBranchOnRemote(),
          prCreates: scene
            .getGhCalls()
            .filter((call) => call.startsWith('pr create')),
        };
      });

      then('the push is held, exit 2, the nudge on both streams', () => {
        expect(result.held.code).toBe(2);
        expect(result.held.stdout).toContain(
          '🐢 hold up — this text goes to a public repo',
        );
        expect(result.held.stderr).toContain(
          '🐢 hold up — this text goes to a public repo',
        );
        expect(result.held.stdout).toContain(
          'repo: ehmpathy/surf-demo (public)',
        );
        expect(result.held.stdout).toContain(
          `rhx git.commit.push --mode apply --auth as-human --promise ${PROMISE}`,
        );
        expect(asSkillRender(result.held)).toMatchSnapshot();
      });

      then('the held push sends naught: no branch on the remote, no pr call', () => {
        expect(result.afterHeld.isBranchOnRemote).toBe(false);
        expect(result.afterHeld.prCalls).toEqual([]);
      });

      then('the rerun with the promise pushes and opens one pr', () => {
        expect(result.promised.code).toBe(0);
        expect(result.promised.stdout).toContain('pr #42 (created)');
        expect(result.isBranchOnRemote).toBe(true);
        expect(result.prCreates).toHaveLength(1);
        expect(asSkillRender(result.promised)).toMatchSnapshot();
      });
    });
  });
});
