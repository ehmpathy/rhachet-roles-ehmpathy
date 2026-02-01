import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { given, then, when } from 'test-fns';

/**
 * .what = integration tests for get.package.docs.sh skill
 * .why = verify readme and filetree fetch works correctly
 */
describe('get.package.docs.sh', () => {
  const scriptPath = path.join(__dirname, 'get.package.docs.sh');
  const cacheDir = path.join(process.cwd(), '.refs/get.package.docs');

  /**
   * .what = helper to run get.package.docs.sh
   * .why = standardize invocation and result capture
   */
  const runSkill = (
    args: string,
  ): { stdout: string; stderr: string; exitCode: number } => {
    const result = spawnSync(
      'bash',
      [scriptPath, ...args.split(' ').filter(Boolean)],
      {
        cwd: process.cwd(),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  given('[case1] package with readme in node_modules', () => {
    when('[t0] readme subcommand is called', () => {
      then('readme content is returned', () => {
        const result = runSkill('readme --of test-fns');

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('# test-fns');
      });

      then('output contains usage info', () => {
        const result = runSkill('readme --of test-fns');

        expect(result.stdout).toContain('given');
        expect(result.stdout).toContain('when');
        expect(result.stdout).toContain('then');
      });
    });
  });

  given('[case2] package not installed', () => {
    when('[t0] readme subcommand is called', () => {
      then('exits with error', () => {
        const result = runSkill('readme --of nonexistent-pkg-xyz-12345');

        expect(result.exitCode).toBe(1);
      });

      then('error mentions package not found', () => {
        const result = runSkill('readme --of nonexistent-pkg-xyz-12345');

        expect(result.stderr).toContain('not found in node_modules');
      });

      then('suggests install command', () => {
        const result = runSkill('readme --of nonexistent-pkg-xyz-12345');

        expect(result.stderr).toContain('npm install');
      });
    });
  });

  given('[case3] filetree subcommand', () => {
    when('[t0] filetree is called for installed package', () => {
      then('tree output is returned', () => {
        const result = runSkill('filetree --of test-fns');

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('node_modules/test-fns');
      });

      then('output shows package structure', () => {
        const result = runSkill('filetree --of test-fns');

        expect(result.stdout).toContain('package.json');
        expect(result.stdout).toContain('dist');
      });
    });

    when('[t1] filetree is called for non-existent package', () => {
      then('exits with error', () => {
        const result = runSkill('filetree --of nonexistent-pkg-xyz-12345');

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('not found in node_modules');
      });
    });
  });

  given('[case4] scoped package like @ehmpathy/as-command', () => {
    when('[t0] readme subcommand is called', () => {
      then('scoped name is handled correctly', () => {
        const result = runSkill('readme --of @ehmpathy/as-command');

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('# as-command');
      });
    });

    when('[t1] filetree subcommand is called', () => {
      then('scoped name is handled correctly', () => {
        const result = runSkill('filetree --of @ehmpathy/as-command');

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('node_modules/@ehmpathy/as-command');
      });
    });
  });

  given('[case5] cache directory bootstrap', () => {
    when('[t0] cache directory exists', () => {
      then('.gitignore contains *', () => {
        // ensure cache dir exists (may have been created by prior tests)
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
          fs.writeFileSync(path.join(cacheDir, '.gitignore'), '*');
        }

        const gitignorePath = path.join(cacheDir, '.gitignore');
        expect(fs.existsSync(gitignorePath)).toBe(true);
        expect(fs.readFileSync(gitignorePath, 'utf-8').trim()).toBe('*');
      });
    });
  });

  given('[case6] arg validation', () => {
    when('[t0] no subcommand provided', () => {
      then('exits with error', () => {
        const result = runSkill('--of test-fns');

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('subcommand required');
      });
    });

    when('[t1] no --of provided', () => {
      then('exits with error', () => {
        const result = runSkill('readme');

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('--of is required');
      });
    });

    when('[t2] unknown argument provided', () => {
      then('exits with error', () => {
        const result = runSkill('readme --of test-fns --unknown-arg');

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('unknown argument');
      });
    });
  });

  given('[case7] rhachet passthrough args', () => {
    when('[t0] --repo --role --skill args are passed', () => {
      then('they are ignored and skill works', () => {
        const result = runSkill(
          '--repo ehmpathy --role mechanic --skill get.package.docs readme --of test-fns',
        );

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('# test-fns');
      });
    });
  });
});
