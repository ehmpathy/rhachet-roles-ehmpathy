import { given, then, when } from 'test-fns';

import { asBashInvokedPaths } from '../../domain.operations/hooks/asBashInvokedPaths';
import { asMalformedHookPaths } from '../../domain.operations/hooks/asMalformedHookPaths';
import { asUnaccountedCommands } from '../../domain.operations/hooks/asUnaccountedCommands';
import { asWrappedCommands } from '../../domain.operations/hooks/asWrappedCommands';
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
        expect(hook?.timeout).toEqual('PT10S');
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
      const allHooks = [
        ...(ROLE_MECHANIC.hooks?.onBrain?.onBoot ?? []),
        ...(ROLE_MECHANIC.hooks?.onBrain?.onTool ?? []),
      ];

      then('every command takes one of exactly two shapes', () => {
        // an init hook runs as `bash <ported path>` — no rhachet wrapper, since
        // the wrapper cost ~10 forks plus a bun runner boot per invocation.
        // `rhachet roles boot` stays wrapped: it is real TS work, not a hook.
        //
        // .note = the claim is split in two: THIS case asks "is every command
        //         one of the two kinds?" and the next asks "does every path of
        //         kind one hold its shape?". one regex over both would restate
        //         the ported-tree prefix a third time —
        //         `asMalformedHookPaths` owns that shape and `asHookCommand`
        //         owns the literal that generates it.
        //
        // 🔴 the pair is STRICTLY STRONGER than a single regex: the full
        //    `…\/claude\.hooks\/[a-zA-Z0-9.-]+\.sh$` shape implies the prefix,
        //    so no command a combined form catches can slip past the two.
        //
        // .note = `unaccounted` is a named leaf, never an inline map plus
        //         compound boolean — a reader learns "neither a ported hook
        //         invocation nor a boot command" by name rather than by eye, as
        //         with the other two claims in this block.
        const unaccounted = asUnaccountedCommands({
          commands: allHooks.map((hook) => hook.command),
        });

        expect(unaccounted).toEqual([]);
      });

      then('no hook reaches through the rhachet run wrapper', () => {
        // 🔴 the regression to catch. a re-stamp from a template, or a copy of a
        //    hook row from another role, restores the wrapper silently — the
        //    hook still works, and each tool call pays the boot again.
        // .note = the tell, and its `rhachet roles boot` carve-out, live WITH
        //         the predicate — see `asWrappedCommands`. restated inline, the
        //         two-token tell would sit in two files and no test could
        //         observe them drift apart.
        const wrapped = asWrappedCommands({
          commands: allHooks.map((hook) => hook.command),
        });

        expect(wrapped).toEqual([]);
      });

      then('every bash-invoked hook names a .sh under the ported tree', () => {
        // 🔴 lever B's hazard, at the shape level. a path that is absent fails
        //    with a non-2 exit, and claude code reads non-2 as "not blocked" —
        //    so the gate silently stops to gate, in every repo that ports this
        //    role. THAT the file exists is asserted in the reachability
        //    integration test (a unit test may not touch the filesystem,
        //    rule.forbid.unit.remote-boundaries); this pins the shape.
        // .note = both halves are named leaves. the `bash ` tell and the prefix
        //         strip are shared with `asAbsentHookPaths`, so the two cannot
        //         desync on WHICH commands they grade; the shape regex is this
        //         claim's alone.
        const malformed = asMalformedHookPaths({
          role: 'mechanic',
          paths: asBashInvokedPaths({
            commands: allHooks.map((hook) => hook.command),
          }),
        });

        expect(malformed).toEqual([]);
      });
    });

    when('[t4] role structure is captured', () => {
      then('ROLE_MECHANIC matches snapshot', () => {
        // replace absolute paths for deterministic snapshots across environments
        const asPathReplaced = (input: string): string =>
          input.replace(
            /\/[^\s"]+\/src\/domain\.roles\/mechanic/g,
            '<repo>/src/domain.roles/mechanic',
          );
        const roleJson = JSON.stringify(ROLE_MECHANIC, null, 2);
        const replaced = asPathReplaced(roleJson);
        expect(JSON.parse(replaced)).toMatchSnapshot();
      });
    });
  });
});
