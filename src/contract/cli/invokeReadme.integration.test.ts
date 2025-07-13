import { Command } from 'commander';
import { given, when, then, getError } from 'test-fns';

import { EXAMPLE_REGISTRY } from './.test/example.echoRegistry';
import { invokeReadme } from './invokeReadme';

describe('invokeReadme (integration)', () => {
  given(
    'a CLI program with invokeReadme registered using EXAMPLE_REGISTRY',
    () => {
      const program = new Command();
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      beforeEach(() => logSpy.mockClear());
      invokeReadme({ program, registries: [EXAMPLE_REGISTRY] });

      when('invoked with only --registry', () => {
        then('it should print the registry readme', async () => {
          await program.parseAsync(['readme', '--registry', 'echo'], {
            from: 'user',
          });

          expect(logSpy).toHaveBeenCalledWith('📜 echo.readme');
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining(EXAMPLE_REGISTRY.readme.split('\n')[0]!),
          );
        });
      });

      when('invoked with --role only', () => {
        then('it should print the role readme', async () => {
          await program.parseAsync(['readme', '--role', 'echoer'], {
            from: 'user',
          });

          expect(logSpy).toHaveBeenCalledWith('📜 echoer.readme');
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining(
              EXAMPLE_REGISTRY.roles[0]!.readme.split('\n')[0]!,
            ),
          );
        });
      });

      when('invoked with --role and --skill', () => {
        then('it should print the skill readme', async () => {
          await program.parseAsync(
            ['readme', '--role', 'echoer', '--skill', 'echo'],
            { from: 'user' },
          );

          expect(logSpy).toHaveBeenCalledWith('📜 echoer.echo.readme');
          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining(
              EXAMPLE_REGISTRY.roles[0]!.skills[0]!.readme.split('\n')[0]!,
            ),
          );
        });
      });

      when('invoked with an unknown role', () => {
        then('it should throw a missing role error', async () => {
          const error = await getError(() =>
            program.parseAsync(['readme', '--role', 'notreal'], {
              from: 'user',
            }),
          );

          expect(error?.message).toContain(
            `no role named "notreal" found in any registry`,
          );
        });
      });

      when('invoked with an unknown skill', () => {
        then('it should throw a missing skill error', async () => {
          const error = await getError(() =>
            program.parseAsync(
              ['readme', '--role', 'echoer', '--skill', 'notreal'],
              { from: 'user' },
            ),
          );

          expect(error?.message).toContain(
            'no skill "notreal" in role "echoer"',
          );
        });
      });

      when('invoked with an unknown registry', () => {
        then('it should throw a missing registry error', async () => {
          const error = await getError(() =>
            program.parseAsync(['readme', '--registry', 'notreal'], {
              from: 'user',
            }),
          );

          expect(error?.message).toContain('no registry matches given options');
        });
      });
    },
  );
});
