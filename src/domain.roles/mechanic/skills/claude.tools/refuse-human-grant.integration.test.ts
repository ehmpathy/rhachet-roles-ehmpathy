import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = the file tools refuse to write a human grant (.meter/, .branch/.bind/)
 * .why  = a grant is a human's stamp; a robot that can write it with teesafe,
 *         cpsafe, mvsafe, symlink, or sedreplace could mint its own release
 */
describe('claude.tools refuse a human grant', () => {
  const toolPath = (tool: string) => path.join(__dirname, `${tool}.sh`);

  /**
   * .what = run one tool in a temp git repo that holds a spent release stamp
   * .why  = each case asserts the stamp stays spent after the tool runs
   */
  const runTool = (input: {
    tool: string;
    args: string[];
    stdin?: string;
    setup?: (tempDir: string) => void;
    pre?: { tool: string; args: string[] }[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'refuse-human-grant', git: true });
    fs.mkdirSync(path.join(tempDir, '.meter'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, '.meter/git.release.uses.jsonc'),
      '{"uses":0}',
    );
    fs.writeFileSync(path.join(tempDir, 'forged.jsonc'), '{"uses":99}');
    input.setup?.(tempDir);

    // a prior call in the same tree, e.g. the plan a sedreplace apply requires
    (input.pre ?? []).forEach((call) =>
      spawnSync('bash', [toolPath(call.tool), ...call.args], {
        cwd: tempDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }),
    );

    const result = spawnSync('bash', [toolPath(input.tool), ...input.args], {
      cwd: tempDir,
      encoding: 'utf-8',
      input: input.stdin ?? '',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
      tempDir,
    };
  };

  const readStamp = (tempDir: string): string => {
    const stampPath = path.join(tempDir, '.meter/git.release.uses.jsonc');
    if (fs.lstatSync(stampPath).isSymbolicLink()) return 'symlink';
    return fs.readFileSync(stampPath, 'utf-8');
  };

  given(
    '[case1] a spent release stamp at .meter/git.release.uses.jsonc',
    () => {
      when('[t0] teesafe writes into the stamp', () => {
        then('exit 2, ConstraintError on both streams, stamp unchanged', () => {
          const result = runTool({
            tool: 'teesafe',
            args: ['--into', '.meter/git.release.uses.jsonc'],
            stdin: '{"uses":99}',
          });
          expect(result.exitCode).toBe(2);
          expect(result.stdout).toContain('ConstraintError');
          expect(result.stderr).toContain('ConstraintError');
          expect(readStamp(result.tempDir)).toBe('{"uses":0}');
          expect(result.stdout).toMatchSnapshot();
        });
      });

      when('[t1] cpsafe copies a forged file over the stamp', () => {
        then('exit 2, stamp unchanged', () => {
          const result = runTool({
            tool: 'cpsafe',
            args: [
              '--from',
              'forged.jsonc',
              '--into',
              '.meter/git.release.uses.jsonc',
            ],
          });
          expect(result.exitCode).toBe(2);
          expect(readStamp(result.tempDir)).toBe('{"uses":0}');
        });
      });

      when('[t2] mvsafe moves a forged file over the stamp', () => {
        then('exit 2, stamp unchanged', () => {
          const result = runTool({
            tool: 'mvsafe',
            args: [
              '--from',
              'forged.jsonc',
              '--into',
              '.meter/git.release.uses.jsonc',
            ],
          });
          expect(result.exitCode).toBe(2);
          expect(readStamp(result.tempDir)).toBe('{"uses":0}');
        });
      });

      when('[t3] symlink points the stamp at a forged file', () => {
        then('exit 2, stamp unchanged', () => {
          const result = runTool({
            tool: 'symlink',
            args: [
              '--at',
              '.meter/git.release.uses.jsonc',
              '--to',
              'forged.jsonc',
              '--mode',
              'relative',
              '--idem',
              'upsert',
            ],
          });
          expect(result.exitCode).toBe(2);
          expect(readStamp(result.tempDir)).toBe('{"uses":0}');
        });
      });

      when(
        '[t4] sedreplace plans, then applies, a rewrite of the uses count',
        () => {
          then(
            'the apply passes the plan gate, and the stamp is left out',
            () => {
              // .note = a plan first, so the apply reaches the grant filter (the
              //         prior case stopped at the plan gate and never reached it)
              const sedArgs = ['--old', '"uses":0', '--new', '"uses":99'];
              const result = runTool({
                tool: 'sedreplace',
                args: [...sedArgs, '--mode', 'apply'],
                setup: (tempDir) =>
                  fs.writeFileSync(
                    path.join(tempDir, 'notes.jsonc'),
                    '{"uses":0}',
                  ),
                pre: [
                  { tool: 'sedreplace', args: [...sedArgs, '--mode', 'plan'] },
                ],
              });
              expect(result.exitCode).toBe(0);
              expect(
                fs.readFileSync(
                  path.join(result.tempDir, 'notes.jsonc'),
                  'utf-8',
                ),
              ).toBe('{"uses":99}');
              expect(readStamp(result.tempDir)).toBe('{"uses":0}');
            },
          );
        },
      );

      when('[t6] mvsafe moves a directory into .meter/', () => {
        then('exit 2, naught lands in .meter', () => {
          const result = runTool({
            tool: 'mvsafe',
            args: ['--from', 'forged-dir', '--into', '.meter/forged-dir'],
            setup: (tempDir) => {
              fs.mkdirSync(path.join(tempDir, 'forged-dir'));
              fs.writeFileSync(
                path.join(tempDir, 'forged-dir/git.release.uses.jsonc'),
                '{"uses":99}',
              );
            },
          });
          expect(result.exitCode).toBe(2);
          expect(
            fs.existsSync(path.join(result.tempDir, '.meter/forged-dir')),
          ).toBe(false);
        });
      });

      when('[t7] mvsafe moves the stamp out of .meter/', () => {
        then('exit 2, the stamp stays in place', () => {
          const result = runTool({
            tool: 'mvsafe',
            args: [
              '--from',
              '.meter/git.release.uses.jsonc',
              '--into',
              'moved.jsonc',
            ],
          });
          expect(result.exitCode).toBe(2);
          expect(readStamp(result.tempDir)).toBe('{"uses":0}');
        });
      });

      when('[t8] mvsafe moves a link that sits inside .meter/', () => {
        then('exit 2, the link stays in place', () => {
          const result = runTool({
            tool: 'mvsafe',
            args: ['--from', '.meter/link.jsonc', '--into', 'moved.jsonc'],
            setup: (tempDir) =>
              fs.symlinkSync(
                '../forged.jsonc',
                path.join(tempDir, '.meter/link.jsonc'),
              ),
          });
          expect(result.exitCode).toBe(2);
          expect(
            fs
              .lstatSync(path.join(result.tempDir, '.meter/link.jsonc'))
              .isSymbolicLink(),
          ).toBe(true);
        });
      });

      when('[t5] teesafe writes into .branch/.bind/', () => {
        then('exit 2, no bind written', () => {
          const result = runTool({
            tool: 'teesafe',
            args: ['--into', '.branch/.bind/git.commit.level'],
            stdin: 'feat',
          });
          expect(result.exitCode).toBe(2);
          expect(
            fs.existsSync(
              path.join(result.tempDir, '.branch/.bind/git.commit.level'),
            ),
          ).toBe(false);
        });
      });
    },
  );

  given('[case2] a path that only resembles a grant dir', () => {
    when('[t0] teesafe writes into src/meter-notes.md', () => {
      then('exit 0: the guard matches the .meter dir, not the word', () => {
        const result = runTool({
          tool: 'teesafe',
          args: ['--into', 'src/meter-notes.md'],
          stdin: 'notes',
        });
        expect(result.exitCode).toBe(0);
        expect(
          fs.readFileSync(
            path.join(result.tempDir, 'src/meter-notes.md'),
            'utf-8',
          ),
        ).toBe('notes');
      });
    });
  });
});
