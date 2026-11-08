import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = integration tests for the pre-commit timestamp scan
 * .why = a merge commit stages every file the merged-in side changed; the scan must halt on
 *        a stamp authored here, and must not halt on a file that side carries in verbatim
 */
describe('check.timestamps.sh', () => {
  const hookPath = path.join(__dirname, 'check.timestamps.sh');
  const gitEnv = {
    ...process.env,
    GIT_AUTHOR_NAME: 'Test Human',
    GIT_AUTHOR_EMAIL: 'human@test.com',
    GIT_COMMITTER_NAME: 'Test Human',
    GIT_COMMITTER_EMAIL: 'human@test.com',
  };

  const runGit = (input: { cwd: string; args: string[] }) =>
    spawnSync('git', input.args, {
      cwd: input.cwd,
      env: gitEnv,
      encoding: 'utf-8',
    });

  const runHook = (input: { cwd: string }) => {
    const result = spawnSync('bash', [hookPath], {
      cwd: input.cwd,
      env: gitEnv,
      encoding: 'utf-8',
    });
    return { exitCode: result.status ?? 1, stdout: result.stdout ?? '' };
  };

  const writeFile = (input: { cwd: string; file: string; content: string }) =>
    fs.writeFileSync(path.join(input.cwd, input.file), input.content);

  /**
   * .what = a repo whose main holds a stamped file, with a branch merge of main in flight
   */
  const genMergeScene = (input: { slug: string }): { cwd: string } => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), `${input.slug}-`));
    runGit({ cwd, args: ['init', '-q', '-b', 'main'] });
    writeFile({ cwd, file: 'readme.md', content: 'reef\n' });
    runGit({ cwd, args: ['add', '.'] });
    runGit({ cwd, args: ['commit', '-q', '-m', 'init'] });
    runGit({ cwd, args: ['switch', '-q', '-c', 'turtle/wave'] });
    writeFile({ cwd, file: 'wave.md', content: 'wave\n' });
    runGit({ cwd, args: ['add', '.'] });
    runGit({ cwd, args: ['commit', '-q', '-m', 'wave'] });
    runGit({ cwd, args: ['switch', '-q', 'main'] });
    writeFile({
      cwd,
      file: 'record.json',
      content: '{ "heldAt": "2026-10-30T13:44:01Z" }\n',
    });
    runGit({ cwd, args: ['add', '.'] });
    runGit({ cwd, args: ['commit', '-q', '-m', 'record'] });
    runGit({ cwd, args: ['switch', '-q', 'turtle/wave'] });
    runGit({ cwd, args: ['merge', '--no-ff', '--no-commit', 'main'] });
    return { cwd };
  };

  given('[case1] a merge in flight that carries a stamped file verbatim', () => {
    const scene = useBeforeAll(async () =>
      genMergeScene({ slug: 'check-timestamps-case1' }),
    );

    when('[t0] the hook scans the staged merge', () => {
      const result = useBeforeAll(async () => runHook({ cwd: scene.cwd }));

      then('exits 0, since the stamp was not authored here', () => {
        expect(result.exitCode).toBe(0);
      });
    });
  });

  given('[case2] a merge in flight where this side adds a stamp', () => {
    const scene = useBeforeAll(async () => {
      const scene = genMergeScene({ slug: 'check-timestamps-case2' });
      writeFile({
        cwd: scene.cwd,
        file: 'wave.md',
        content: 'wave at 2026-10-30T13:44:01Z\n',
      });
      runGit({ cwd: scene.cwd, args: ['add', 'wave.md'] });
      return scene;
    });

    when('[t0] the hook scans the staged merge', () => {
      const result = useBeforeAll(async () => runHook({ cwd: scene.cwd }));

      then('exits 2 and names the stamped file', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('wave.md');
      });
    });
  });

  given('[case3] a merge in flight where this side edits the carried file', () => {
    const scene = useBeforeAll(async () => {
      const scene = genMergeScene({ slug: 'check-timestamps-case3' });
      writeFile({
        cwd: scene.cwd,
        file: 'record.json',
        content: '{ "heldAt": "2026-10-31T09:00:00Z" }\n',
      });
      runGit({ cwd: scene.cwd, args: ['add', 'record.json'] });
      return scene;
    });

    when('[t0] the hook scans the staged merge', () => {
      const result = useBeforeAll(async () => runHook({ cwd: scene.cwd }));

      then('exits 2 and names the edited file', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('record.json');
      });
    });
  });

  given('[case4] no merge in flight, a stamped file staged', () => {
    const scene = useBeforeAll(async () => {
      const cwd = fs.mkdtempSync(
        path.join(os.tmpdir(), 'check-timestamps-case4-'),
      );
      runGit({ cwd, args: ['init', '-q', '-b', 'main'] });
      writeFile({
        cwd,
        file: 'record.json',
        content: '{ "heldAt": "2026-10-30T13:44:01Z" }\n',
      });
      runGit({ cwd, args: ['add', '.'] });
      return { cwd };
    });

    when('[t0] the hook scans the stage', () => {
      const result = useBeforeAll(async () => runHook({ cwd: scene.cwd }));

      then('exits 2 and names the stamped file', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('record.json');
      });
    });
  });
});
