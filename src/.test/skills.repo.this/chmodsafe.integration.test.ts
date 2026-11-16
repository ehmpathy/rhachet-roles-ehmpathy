import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = the repo-local chmodsafe skill: +x on .sh files inside this repo only
 * .why  = it lives under .agent/, which jest skips, so its suite lives here
 */
const SKILL = path.join(
  __dirname,
  '../../../.agent/repo=.this/role=any/skills/chmodsafe.sh',
);

const runChmodsafe = (input: {
  cwd: string;
  args: string[];
}): { stdout: string; stderr: string; status: number } => {
  const result = spawnSync('bash', [SKILL, ...input.args], {
    cwd: input.cwd,
    encoding: 'utf-8',
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status ?? 1,
  };
};

/**
 * .what = a temp git repo with three skill files: two .sh, one .md
 */
const genRepo = (slug: string): string => {
  const repo = genTempDir({ slug, git: true });
  fs.mkdirSync(path.join(repo, 'skills/surf'), { recursive: true });
  ['paddle.sh', 'wave.sh'].forEach((name) =>
    fs.writeFileSync(path.join(repo, 'skills/surf', name), '#!/bin/bash\n'),
  );
  fs.writeFileSync(path.join(repo, 'skills/surf/readme.md'), '# surf\n');
  return repo;
};

const isExecutable = (file: string): boolean =>
  (fs.statSync(file).mode & 0o111) !== 0;

describe('chmodsafe.sh', () => {
  given('[case1] .sh files inside the repo', () => {
    when('[t0] one --path and one --glob are named', () => {
      const result = useThen('it runs', async () => {
        const repo = genRepo('chmodsafe-case1-t0');
        const one = runChmodsafe({
          cwd: repo,
          args: ['--path', 'skills/surf/paddle.sh'],
        });
        const glob = runChmodsafe({
          cwd: repo,
          args: ['--glob', 'skills/surf/*.sh'],
        });
        return {
          one,
          glob,
          paddle: isExecutable(path.join(repo, 'skills/surf/paddle.sh')),
          wave: isExecutable(path.join(repo, 'skills/surf/wave.sh')),
        };
      });
      then('each file gains +x, and each is named', () => {
        expect(result.one.status).toEqual(0);
        expect(result.glob.status).toEqual(0);
        expect(result.paddle).toEqual(true);
        expect(result.wave).toEqual(true);
        expect(result.one.stdout).toMatchSnapshot();
        expect(result.glob.stdout).toMatchSnapshot();
      });
      then('a success writes naught to stderr', () => {
        expect(result.glob.stderr).toEqual('');
      });
    });
  });

  given('[case2] --help', () => {
    when('[t0] it is asked for', () => {
      const result = useThen('it runs', async () =>
        runChmodsafe({ cwd: genRepo('chmodsafe-case2'), args: ['--help'] }),
      );
      then('usage, options, and an example print', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('usage:');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case3] a call it must refuse', () => {
    when('[t0] each bad input is named', () => {
      const result = useThen('each runs', async () => {
        const repo = genRepo('chmodsafe-case3');
        const elsewhere = genTempDir({ slug: 'chmodsafe-case3-elsewhere' });
        fs.writeFileSync(path.join(elsewhere, 'reef.sh'), '#!/bin/bash\n');
        fs.symlinkSync(
          path.join(repo, 'skills/surf/wave.sh'),
          path.join(repo, 'skills/surf/link.sh'),
        );
        const run = (args: string[]) => runChmodsafe({ cwd: repo, args });
        return {
          // each path as given and as resolved: a refusal may print either
          repos: [repo, fs.realpathSync(repo)],
          elsewheres: [elsewhere, fs.realpathSync(elsewhere)],
          unknown: run(['--wave', 'big']),
          none: run([]),
          bare: run(['--path']),
          notSh: run(['--path', 'skills/surf/readme.md']),
          link: run(['--path', 'skills/surf/link.sh']),
          outside: run(['--path', path.join(elsewhere, 'reef.sh')]),
          emptyGlob: run(['--glob', 'skills/reef/*.sh']),
          mixed: run([
            '--path',
            'skills/surf/paddle.sh',
            '--path',
            'skills/surf/readme.md',
          ]),
          paddle: isExecutable(path.join(repo, 'skills/surf/paddle.sh')),
          notRepo: runChmodsafe({
            cwd: elsewhere,
            args: ['--path', 'reef.sh'],
          }),
        };
      });
      then('each exits 2 with a ConstraintError and the usage, on both streams', () => {
        [
          result.unknown,
          result.none,
          result.bare,
          result.notSh,
          result.link,
          result.outside,
          result.emptyGlob,
          result.mixed,
          result.notRepo,
        ].forEach((one) => {
          expect(one.status).toEqual(2);
          expect(one.stdout).toContain('✋ ConstraintError: ');
          expect(one.stdout).toContain('🥥 did you know?');
          expect(one.stdout).toContain('└─ rhx chmodsafe --path');
          expect(one.stderr).toEqual(one.stdout);
        });
        expect(result.unknown.stdout).toMatchSnapshot();
      });
      then('each names its cause', () => {
        expect(result.unknown.stdout).toContain("unknown arg '--wave'");
        expect(result.none.stdout).toContain('name at least one --path or --glob');
        expect(result.bare.stdout).toContain('--path needs a value');
        expect(result.notSh.stdout).toContain('not a .sh file');
        expect(result.link.stdout).toContain('not a regular file');
        expect(result.outside.stdout).toContain('outside the repo');
        expect(result.emptyGlob.stdout).toContain('matched no files');
        expect(result.notRepo.stdout).toContain('not in a git repository');
        expect(result.notSh.stdout).toMatchSnapshot();
      });
      then('each refusal reads as pinned', () => {
        // temp paths vary per run; mask them before the pin
        const asMasked = (text: string): string =>
          [
            ...result.elsewheres.map((one) => [one, '<elsewhere>'] as const),
            ...result.repos.map((one) => [one, '<repo>'] as const),
          ].reduce(
            (masked, [found, mask]) => masked.split(found).join(mask),
            text,
          );
        expect(
          Object.fromEntries(
            (
              [
                'none',
                'bare',
                'link',
                'outside',
                'emptyGlob',
                'mixed',
                'notRepo',
              ] as const
            ).map((name) => [name, asMasked(result[name].stdout)]),
          ),
        ).toMatchSnapshot();
      });
      then('a call with one bad path changes no file', () => {
        expect(result.paddle).toEqual(false);
      });
    });
  });
});
