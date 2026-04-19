import { given, then, when } from 'test-fns';

import { ROLE_MECHANIC } from './getMechanicRole';

describe('getMechanicRole', () => {
  given('[case1] the mechanic role definition', () => {
    when('[t0] hooks property is accessed', () => {
      then('onBrain.onBoot contains at least 3 hooks', () => {
        expect(
          ROLE_MECHANIC.hooks?.onBrain?.onBoot?.length,
        ).toBeGreaterThanOrEqual(3);
      });

      then('onBrain.onTool contains at least 7 hooks', () => {
        expect(
          ROLE_MECHANIC.hooks?.onBrain?.onTool?.length,
        ).toBeGreaterThanOrEqual(7);
      });

      // .note = onStop removed: lint hook was too expensive (60s block)
      // .todo = add onStop tests when brain.hooks.onPush lands
    });

    when('[t1] onBoot hooks are inspected', () => {
      const hooks = ROLE_MECHANIC.hooks?.onBrain?.onBoot ?? [];
      const findHook = (pattern: string) =>
        hooks.find((h) => h.command.includes(pattern));

      then('notify-permissions hook is present', () => {
        const hook = findHook('notify-permissions');
        expect(hook).toBeDefined();
        expect(hook?.timeout).toEqual('PT5S');
      });

      then('boot.this hook is present', () => {
        const hook = findHook('boot --repo .this');
        expect(hook).toBeDefined();
        expect(hook?.timeout).toEqual('PT60S');
      });

      then('boot.mechanic hook is present', () => {
        const hook = findHook('boot --repo ehmpathy --role mechanic');
        expect(hook).toBeDefined();
        expect(hook?.timeout).toEqual('PT60S');
      });
    });

    when('[t2] onTool hooks are inspected', () => {
      const hooks = ROLE_MECHANIC.hooks?.onBrain?.onTool ?? [];
      const findHook = (name: string) =>
        hooks.find((h) => h.command.includes(name));

      then('forbid-test-background hook is present and targets Bash', () => {
        const hook = findHook('forbid-test-background');
        expect(hook).toBeDefined();
        expect(hook?.filter?.what).toEqual('Bash');
        expect(hook?.filter?.when).toEqual('before');
      });

      then(
        'forbid-sedreplace-special-chars hook is present and targets Bash',
        () => {
          const hook = findHook('forbid-sedreplace-special-chars');
          expect(hook).toBeDefined();
          expect(hook?.filter?.what).toEqual('Bash');
          expect(hook?.filter?.when).toEqual('before');
        },
      );

      then(
        'forbid-suspicious-shell-syntax hook is present and targets Bash',
        () => {
          const hook = findHook('forbid-suspicious-shell-syntax');
          expect(hook).toBeDefined();
          expect(hook?.filter?.what).toEqual('Bash');
          expect(hook?.filter?.when).toEqual('before');
        },
      );

      then('forbid-stderr-redirect hook is present and targets Bash', () => {
        const hook = findHook('forbid-stderr-redirect');
        expect(hook).toBeDefined();
        expect(hook?.filter?.what).toEqual('Bash');
        expect(hook?.filter?.when).toEqual('before');
      });

      then(
        'forbid-terms.gerunds hook is present and targets Write|Edit',
        () => {
          const hook = findHook('forbid-terms.gerunds');
          expect(hook).toBeDefined();
          expect(hook?.filter?.what).toEqual('Write|Edit');
          expect(hook?.filter?.when).toEqual('before');
        },
      );

      then(
        'forbid-terms.blocklist hook is present and targets Write|Edit',
        () => {
          const hook = findHook('forbid-terms.blocklist');
          expect(hook).toBeDefined();
          expect(hook?.filter?.what).toEqual('Write|Edit');
          expect(hook?.filter?.when).toEqual('before');
        },
      );

      then('check-permissions hook is present and targets Bash', () => {
        const hook = findHook('check-permissions');
        expect(hook).toBeDefined();
        expect(hook?.filter?.what).toEqual('Bash');
        expect(hook?.filter?.when).toEqual('before');
      });
    });

    when('[t3] all hooks use correct command format', () => {
      then('all commands use ./node_modules/.bin/rhachet format', () => {
        const allHooks = [
          ...(ROLE_MECHANIC.hooks?.onBrain?.onBoot ?? []),
          ...(ROLE_MECHANIC.hooks?.onBrain?.onTool ?? []),
        ];
        for (const hook of allHooks) {
          expect(hook.command).toMatch(/^\.\/node_modules\/\.bin\/rhachet/);
        }
      });
    });

    when('[t4] role structure is captured', () => {
      then('ROLE_MECHANIC matches snapshot', () => {
        expect(ROLE_MECHANIC).toMatchSnapshot();
      });
    });
  });
});
