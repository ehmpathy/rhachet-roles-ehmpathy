import * as fs from 'fs';
import { given, then, when } from 'test-fns';

import { createTempRepo } from './cicd.deflake/__test_utils__/createTempRepo';
import { runSkill } from './cicd.deflake/__test_utils__/runSkill';

describe('cicd.deflake', () => {
  given('[case1] help: shows usage', () => {
    const tempDir = createTempRepo();

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] help subcommand is invoked', () => {
      then('shows subcommands and usage', () => {
        const result = runSkill({ cwd: tempDir, subcommand: 'help' });

        expect(result.status).toEqual(0);
        expect(result.stderr).toMatchSnapshot();
        expect(result.stdout).toContain('cicd.deflake');
        expect(result.stdout).toContain('init');
        expect(result.stdout).toContain('detect');
        expect(result.stdout).toContain('exhume');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] unknown subcommand', () => {
    const tempDir = createTempRepo();

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] unknown subcommand is provided', () => {
      then('exits with error and shows hint', () => {
        const result = runSkill({ cwd: tempDir, subcommand: 'foo' });

        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('unknown subcommand');
        expect(result.stdout).toContain('foo');
        expect(result.stdout).toMatchSnapshot();
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case3] no subcommand provided', () => {
    const tempDir = createTempRepo();

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] no subcommand is provided', () => {
      then('shows usage', () => {
        const result = runSkill({ cwd: tempDir });

        expect(result.status).toEqual(0);
        expect(result.stderr).toMatchSnapshot();
        expect(result.stdout).toContain('cicd.deflake');
        expect(result.stdout).toContain('init');
        expect(result.stdout).toContain('detect');
        expect(result.stdout).toContain('exhume');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case4] main command: --help flag', () => {
    /**
     * .what = test main cicd.deflake command with --help
     * .why = covers help output for main command (not subcommand help)
     */
    const tempDir = createTempRepo();

    afterAll(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] --help is passed to main command', () => {
      then('shows usage with subcommands', () => {
        const result = runSkill({
          cwd: tempDir,
          args: ['--help'],
        });

        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('init');
        expect(result.stdout).toContain('detect');
        expect(result.stdout).toContain('exhume');
        expect(result.stdout).toMatchSnapshot();
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });
});
