import { given, then, when } from 'test-fns';

import { ROLE_MECHANIC } from './getMechanicRole';

describe('getMechanicRole', () => {
  given('[case1] the mechanic role definition', () => {
    when('[t0] hooks property is accessed', () => {
      then('onBrain.onBoot contains 3 hooks', () => {
        expect(ROLE_MECHANIC.hooks?.onBrain?.onBoot).toHaveLength(3);
      });

      then('onBrain.onTool contains 4 hooks', () => {
        expect(ROLE_MECHANIC.hooks?.onBrain?.onTool).toHaveLength(4);
      });

      then('onBrain.onStop is empty', () => {
        expect(ROLE_MECHANIC.hooks?.onBrain?.onStop).toHaveLength(0);
      });
    });

    when('[t1] onBoot hooks are inspected', () => {
      then('notify-permissions hook is first', () => {
        const hook = ROLE_MECHANIC.hooks?.onBrain?.onBoot?.[0];
        expect(hook?.command).toContain('notify-permissions');
        expect(hook?.timeout).toEqual('PT5S');
      });

      then('boot.this hook is second', () => {
        const hook = ROLE_MECHANIC.hooks?.onBrain?.onBoot?.[1];
        expect(hook?.command).toContain('boot --repo .this');
        expect(hook?.timeout).toEqual('PT60S');
      });

      then('boot.mechanic hook is third', () => {
        const hook = ROLE_MECHANIC.hooks?.onBrain?.onBoot?.[2];
        expect(hook?.command).toContain('boot --repo ehmpathy --role mechanic');
        expect(hook?.timeout).toEqual('PT60S');
      });
    });

    when('[t2] onTool hooks are inspected', () => {
      then('forbid-stderr-redirect targets Bash', () => {
        const hook = ROLE_MECHANIC.hooks?.onBrain?.onTool?.[0];
        expect(hook?.command).toContain('forbid-stderr-redirect');
        expect(hook?.filter?.what).toEqual('Bash');
        expect(hook?.filter?.when).toEqual('before');
      });

      then('forbid-terms.gerunds targets Write|Edit', () => {
        const hook = ROLE_MECHANIC.hooks?.onBrain?.onTool?.[1];
        expect(hook?.command).toContain('forbid-terms.gerunds');
        expect(hook?.filter?.what).toEqual('Write|Edit');
        expect(hook?.filter?.when).toEqual('before');
      });

      then('forbid-terms.blocklist targets Write|Edit', () => {
        const hook = ROLE_MECHANIC.hooks?.onBrain?.onTool?.[2];
        expect(hook?.command).toContain('forbid-terms.blocklist');
        expect(hook?.filter?.what).toEqual('Write|Edit');
        expect(hook?.filter?.when).toEqual('before');
      });

      then('check-permissions targets Bash', () => {
        const hook = ROLE_MECHANIC.hooks?.onBrain?.onTool?.[3];
        expect(hook?.command).toContain('check-permissions');
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
  });
});
