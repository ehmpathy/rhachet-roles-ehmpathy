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
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempDir({ slug: 'refuse-human-grant', git: true });
    fs.mkdirSync(path.join(tempDir, '.meter'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, '.meter/git.release.uses.jsonc'),
      '{"uses":0}',
    );
    fs.writeFileSync(path.join(tempDir, 'forged.jsonc'), '{"uses":99}');
    input.setup?.(tempDir);

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

  /**
   * .what = assert the refusal contract every tool shares
   * .why  = one shape for every refusal: exit 2, the ConstraintError on both
   *         streams, and the frame pinned so a dropped line shows in review
   */
  const expectRefusal = (result: {
    stdout: string;
    stderr: string;
    exitCode: number;
  }): void => {
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toContain('✋ ConstraintError');
    expect(result.stderr).toContain('✋ ConstraintError');
    expect(result.stdout).not.toContain('🐢 sweet'); // a refusal never follows a success frame
    expect(result.stdout).toMatchSnapshot();
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
          expectRefusal(result);
          expect(readStamp(result.tempDir)).toBe('{"uses":0}');
          // the hint reads the meter that was refused, never the commit meter
          expect(result.stdout).toContain('└─ rhx git.release.uses get');
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
          expectRefusal(result);
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
          expectRefusal(result);
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
          expectRefusal(result);
          expect(readStamp(result.tempDir)).toBe('{"uses":0}');
        });
      });

      when('[t4] symlink places a bridge whose target is the stamp', () => {
        then('exit 2, no bridge is created', () => {
          const result = runTool({
            tool: 'symlink',
            args: [
              '--at',
              'bridge.jsonc',
              '--to',
              '.meter/git.release.uses.jsonc',
              '--mode',
              'relative',
            ],
          });
          expectRefusal(result);
          expect(fs.existsSync(path.join(result.tempDir, 'bridge.jsonc'))).toBe(
            false,
          );
          expect(readStamp(result.tempDir)).toBe('{"uses":0}');
        });
      });

      when(
        '[t5] sedreplace plans a rewrite whose match holds the stamp',
        () => {
          then(
            'exit 2, loud: the stamp is named, and no plan is recorded',
            () => {
              // .note = the plan refuses, so no plan is on record and an apply
              //         stops at the plan gate; the grant is never in reach
              const result = runTool({
                tool: 'sedreplace',
                args: ['--old', '"uses":0', '--new', '"uses":99'],
                setup: (tempDir) =>
                  fs.writeFileSync(
                    path.join(tempDir, 'notes.jsonc'),
                    '{"uses":0}',
                  ),
              });
              expectRefusal(result);
              expect(result.stdout).toContain('.meter/git.release.uses.jsonc');
              expect(
                fs.readFileSync(
                  path.join(result.tempDir, 'notes.jsonc'),
                  'utf-8',
                ),
              ).toBe('{"uses":0}');
              expect(readStamp(result.tempDir)).toBe('{"uses":0}');
            },
          );
        },
      );

      when(
        '[t6] sedreplace plans a rewrite through a link that bridges into .meter/',
        () => {
          then(
            'exit 2: the guard checks where the link writes, not its name',
            () => {
              const result = runTool({
                tool: 'sedreplace',
                args: [
                  '--old',
                  '"uses":0',
                  '--new',
                  '"uses":99',
                  '--glob',
                  'bridge.jsonc',
                ],
                setup: (tempDir) =>
                  fs.symlinkSync(
                    '.meter/git.release.uses.jsonc',
                    path.join(tempDir, 'bridge.jsonc'),
                  ),
              });
              expectRefusal(result);
              expect(readStamp(result.tempDir)).toBe('{"uses":0}');
            },
          );
        },
      );

      when('[t7] mvsafe moves a directory into .meter/', () => {
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
          expectRefusal(result);
          expect(
            fs.existsSync(path.join(result.tempDir, '.meter/forged-dir')),
          ).toBe(false);
        });
      });

      when('[t8] mvsafe moves the stamp out of .meter/', () => {
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
          expectRefusal(result);
          expect(readStamp(result.tempDir)).toBe('{"uses":0}');
        });
      });

      when('[t9] mvsafe moves a link that sits inside .meter/', () => {
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
          expectRefusal(result);
          expect(
            fs
              .lstatSync(path.join(result.tempDir, '.meter/link.jsonc'))
              .isSymbolicLink(),
          ).toBe(true);
        });
      });

      when('[t10] cpsafe copies a glob of files into .meter/', () => {
        then('exit 2, not one file lands: every dest is checked first', () => {
          const result = runTool({
            tool: 'cpsafe',
            args: ['--from', 'src/*.jsonc', '--into', '.meter/'],
            setup: (tempDir) => {
              fs.mkdirSync(path.join(tempDir, 'src'));
              fs.writeFileSync(path.join(tempDir, 'src/a.jsonc'), '{}');
              fs.writeFileSync(path.join(tempDir, 'src/b.jsonc'), '{}');
            },
          });
          expectRefusal(result);
          expect(
            fs.existsSync(path.join(result.tempDir, '.meter/a.jsonc')),
          ).toBe(false);
          expect(
            fs.existsSync(path.join(result.tempDir, '.meter/b.jsonc')),
          ).toBe(false);
        });
      });

      when('[t11] teesafe writes into .branch/.bind/', () => {
        then('exit 2, no bind written', () => {
          const result = runTool({
            tool: 'teesafe',
            args: ['--into', '.branch/.bind/git.commit.level'],
            stdin: 'feat',
          });
          expectRefusal(result);
          expect(result.stdout).toContain('└─ rhx git.commit.bind get');
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

  given('[case3] the guard is called with an arg it does not know', () => {
    /**
     * .what = call the guard leaf directly, then mark whether control passed it
     * .why  = a guard that cannot parse its call must halt the write (fail
     *         closed), so the marker after it must never print
     */
    const runGuardLeaf = (input: { args: string }) => {
      const result = spawnSync(
        'bash',
        [
          '-c',
          `source "${path.join(__dirname, 'output.sh')}"; refuse_if_human_grant ${input.args}; echo "write proceeded"`,
        ],
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
      );
      return {
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        exitCode: result.status ?? 1,
      };
    };

    when('[t0] refuse_if_human_grant gets --bogus', () => {
      then('exit 1, MalfunctionError on both streams, write halted', () => {
        const result = runGuardLeaf({ args: '--bogus x' });
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('💥 MalfunctionError');
        expect(result.stderr).toContain('💥 MalfunctionError');
        expect(result.stdout).not.toContain('write proceeded');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] refuse_if_human_grant gets no --path', () => {
      then('exit 1, MalfunctionError on both streams, write halted', () => {
        const result = runGuardLeaf({ args: '--skill teesafe --root /tmp' });
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toContain('💥 MalfunctionError');
        expect(result.stderr).toContain('💥 MalfunctionError');
        expect(result.stdout).not.toContain('write proceeded');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });
});
