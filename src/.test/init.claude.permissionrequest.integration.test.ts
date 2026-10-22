import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = clamps the repo-local init that seats the PermissionRequest decider
 * .why  = no role can declare a PermissionRequest hook, and the split layout derives
 *         settings.of.repo.json from the roles alone; this init (chained after
 *         `rhachet init` in prepare:rhachet) is the one writer of the decider, for
 *         this repo only. without it the seam is absent from every fresh tree, ci included
 * .note = the init lives in .agent/repo=.this/, which jest does not scan, so its test lives here
 */
describe('init.claude.permissionrequest.sh', () => {
  const initPath = path.join(
    __dirname,
    '../../.agent/repo=.this/role=any/skills/init.claude.permissionrequest.sh',
  );
  const deciderCommand =
    'bash .agent/repo=ehmpathy/role=mechanic/inits/claude.hooks/permissionrequest.decide-permissions.sh';
  const deciderEntry = {
    matcher: 'Bash',
    hooks: [{ type: 'command', command: deciderCommand, timeout: 5 }],
  };

  const runInit = (input: { cwd: string }) => {
    const result = spawnSync('bash', [initPath], {
      cwd: input.cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  const genRepo = (input: { slug: string; settingsOfRepo: object | null }) => {
    const cwd = genTempDir({ slug: input.slug });
    fs.mkdirSync(path.join(cwd, '.claude'), { recursive: true });
    if (input.settingsOfRepo)
      fs.writeFileSync(
        path.join(cwd, '.claude', 'settings.of.repo.json'),
        JSON.stringify(input.settingsOfRepo),
      );
    return cwd;
  };

  const readJson = (file: string) => JSON.parse(fs.readFileSync(file, 'utf-8'));

  given('[case1] a split-layout repo whose settings hold a foreign entry and a stale decider', () => {
    const foreign = {
      matcher: 'Edit',
      hooks: [{ type: 'command', command: 'bash reef-audit.sh' }],
    };
    const cwd = genRepo({
      slug: 'permreq-split',
      settingsOfRepo: {
        permissions: { allow: ['Bash(pwd)'] },
        hooks: {
          PreToolUse: [{ matcher: 'Bash', hooks: [] }],
          PermissionRequest: [
            foreign,
            {
              matcher: 'Bash',
              hooks: [{ type: 'command', command: deciderCommand, timeout: 9 }],
            },
          ],
        },
      },
    });
    const settingsPath = path.join(cwd, '.claude', 'settings.of.repo.json');

    when('[t0] the init runs', () => {
      then('it seats one decider first, keeps the foreign entry, and leaves all else', () => {
        const result = runInit({ cwd });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('✨ PermissionRequest decider registered');
        expect(result.stdout).toMatchSnapshot();

        const settings = readJson(settingsPath);
        expect(settings.hooks.PermissionRequest).toEqual([deciderEntry, foreign]);
        expect(settings.hooks.PreToolUse).toEqual([{ matcher: 'Bash', hooks: [] }]);
        expect(settings.permissions).toEqual({ allow: ['Bash(pwd)'] });
      });
    });

    when('[t1] the init runs again', () => {
      then('it writes naught and says so', () => {
        const before = fs.readFileSync(settingsPath, 'utf-8');
        const result = runInit({ cwd });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('👌 PermissionRequest decider already registered');
        expect(result.stdout).toMatchSnapshot();
        expect(fs.readFileSync(settingsPath, 'utf-8')).toEqual(before);
      });
    });
  });

  given('[case2] an old-layout repo with no settings file', () => {
    const cwd = genRepo({ slug: 'permreq-old', settingsOfRepo: null });

    when('[t0] the init runs', () => {
      then('it seeds settings.json with the decider alone', () => {
        const result = runInit({ cwd });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('.claude/settings.json');
        expect(result.stdout).toMatchSnapshot();
        const settings = readJson(path.join(cwd, '.claude', 'settings.json'));
        expect(settings.hooks.PermissionRequest).toEqual([deciderEntry]);
      });
    });
  });

  given('[case3] a repo whose settings.of.repo.json is a link', () => {
    const cwd = genRepo({ slug: 'permreq-link', settingsOfRepo: null });
    const target = path.join(cwd, 'reef.json');
    fs.writeFileSync(target, '{}');
    fs.symlinkSync(target, path.join(cwd, '.claude', 'settings.of.repo.json'));

    when('[t0] the init runs', () => {
      then('it refuses on both streams, exit 2, and the link target stays untouched', () => {
        const result = runInit({ cwd });
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('✋ ConstraintError');
        expect(result.stderr).toContain('✋ ConstraintError');
        expect(result.stdout).toContain('└─ npx rhachet init --hooks');
        expect(result.stdout).toMatchSnapshot();
        expect(fs.readFileSync(target, 'utf-8')).toEqual('{}');
      });
    });
  });

  given('[case4] a repo whose settings.of.repo.json is not json', () => {
    const cwd = genRepo({ slug: 'permreq-unparseable', settingsOfRepo: null });
    const settingsPath = path.join(cwd, '.claude', 'settings.of.repo.json');
    fs.writeFileSync(settingsPath, '{ reef');

    when('[t0] the init runs', () => {
      then('it fails as a malfunction on both streams, exit 1, and the file stays as found', () => {
        const result = runInit({ cwd });
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('💥 MalfunctionError');
        expect(result.stderr).toContain('💥 MalfunctionError');
        expect(result.stdout).toMatchSnapshot();
        expect(fs.readFileSync(settingsPath, 'utf-8')).toEqual('{ reef');
      });
    });
  });
});
