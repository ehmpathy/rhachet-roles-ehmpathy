import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { asBashInvokedPaths } from '../../domain.operations/hooks/asBashInvokedPaths';
import { asHookEvents } from '../../domain.operations/hooks/asHookEvents';
import { asWrappedCommands } from '../../domain.operations/hooks/asWrappedCommands';
import { ROLE_MECHANIC } from './getMechanicRole';

/**
 * .what = every hook this role registers is REACHABLE, at every event key
 * .why = a registered command that points at an absent path fails with a non-2
 *        exit, and claude code reads non-2 as "not blocked" — so a typo RETIRES
 *        a gate rather than breaks it, silently, in every consumer repo.
 *
 * 🔴 .note = this is the ONLY assertion in the repo whose subject is the hook
 *            CONFIG. every hook's own test invokes it BY PATH, so all of them
 *            pass whether or not settings.json points anywhere real.
 *
 * ⚠️ .note = it is colocated with the role it grades, never with the fork-budget file.
 *            its subject is the role's whole 14-hook registry ⇒ a regression in any
 *            one hook's registered path must land in a file whoever debugs that hook
 *            would open.
 */
describe('getMechanicRole · every registered hook is reachable', () => {
  // .note = derived from __dirname, never from process.cwd(), so the assertion
  //         holds wherever jest is invoked from
  const repoRoot = path.join(__dirname, '..', '..', '..');
  const settingsPath = path.join(repoRoot, '.claude', 'settings.json');

  /**
   * .what = the shape of a `.claude/settings.json` hook tree, as this case reads it
   * .why = `JSON.parse` yields `any`. one declared shape, narrowed once at the
   *        boundary, keeps the walk below free of inline `as` casts
   *        (`rule.forbid.as-cast`) and of decode-friction across three levels.
   */
  interface SettingsHookTree {
    hooks?: Record<
      string,
      { hooks?: { command: string; author?: string }[] }[]
    >;
  }

  /**
   * .what = flatten a settings.json hook tree into one row per registered hook
   * .why = the tree is event -> entries[] -> hooks[], so a walk of it inline
   *        makes a reader re-derive three levels by eye ahead of the claim the
   *        case actually makes.
   */
  const asAllRegisteredHooks = (input: {
    settings: SettingsHookTree;
  }): { command: string; author: string; event: string }[] =>
    Object.entries(input.settings.hooks ?? {}).flatMap(([event, entries]) =>
      entries.flatMap((entry) =>
        (entry.hooks ?? []).map((hook) => ({
          command: hook.command,
          author: hook.author ?? '',
          event,
        })),
      ),
    );

  /**
   * .what = of the given registered hooks, the ones THIS role authored
   * .why = settings.json also carries hooks from other role packages
   *        (bhuild/behaver, ehmpathy/architect, …) whose source this repo does
   *        not hold, so a clamp on our own conventions must be scoped or it
   *        fails on work we cannot do here.
   * .note = the author literal lives HERE, never at each call site, so a change to
   *         how a role author is written lands once.
   */
  const asMechanicHooks = (input: {
    hooks: { command: string; author: string; event: string }[];
  }): { command: string; author: string; event: string }[] =>
    input.hooks.filter(
      (entry) => entry.author === 'repo=ehmpathy/role=mechanic',
    );

  /**
   * .what = of the given commands, the bash-invoked paths that are NOT on disk
   * .why = a registered command that points nowhere fails with a non-2 exit,
   *        and claude code reads non-2 as "not blocked" — so the gate retires
   *        silently.
   * .note = the `bash ` tell and the prefix strip are `asBashInvokedPaths`, a leaf
   *         shared with the shape check in getMechanicRole.test.ts. only the
   *         existsSync half belongs to this file.
   */
  const asAbsentHookPaths = (input: { commands: string[] }): string[] =>
    asBashInvokedPaths({ commands: input.commands }).filter(
      (hookPath) => !existsSync(path.join(repoRoot, hookPath)),
    );

  /**
   * .what = the src counterpart of a shipped `.agent/` hook path
   * .why = `.agent/repo=ehmpathy/role=mechanic/…` is a symlink into `dist/`,
   *        which is copied from `src/domain.roles/mechanic/…`. the two prefixes
   *        are the only difference, so the map is a prefix swap.
   * .note = returns null for a path outside this role's tree, so a hook another
   *         role package authored is skipped rather than mis-mapped.
   */
  const asSrcHookPath = (input: { shipped: string }): string | null => {
    const prefix = '.agent/repo=ehmpathy/role=mechanic/';
    if (!input.shipped.startsWith(prefix)) return null;
    return path.join(
      'src/domain.roles/mechanic',
      input.shipped.slice(prefix.length),
    );
  };

  /**
   * .what = of the given commands, the shipped hooks whose bytes DIFFER from the
   *         src file every test in this repo actually grades
   * .why = 🔴 every hook suite resolves its subject with `path.join(__dirname, …)`,
   *        which is `src/`. production runs the `.agent/` path in settings.json.
   *        `asAbsentHookPaths` proves that path EXISTS; naught proves it holds what
   *        the snapshots graded.
   *
   *        ⇒ `.sh` files are copied, never compiled, so the two are identical today
   *        — and a future build step that rewrote them en route to `dist/` would
   *        leave every snapshot in this repo grade an artifact nobody ships, with
   *        no assertion to go red. the same silent-retirement class this file was
   *        written for, one layer down: the gate is reachable, and it is not the
   *        gate we tested.
   */
  const asDriftedHookPaths = (input: { commands: string[] }): string[] =>
    asBashInvokedPaths({ commands: input.commands }).filter((shipped) => {
      const src = asSrcHookPath({ shipped });
      if (!src) return false; // another role package's hook — not ours to grade

      const srcPath = path.join(repoRoot, src);
      const shippedPath = path.join(repoRoot, shipped);

      // .note = the SHIPPED side only. `asAbsentHookPaths` already reports an
      //         absent shipped path, so to report it twice adds no signal.
      if (!existsSync(shippedPath)) return false;

      // 🔴 .note = an absent SRC counterpart IS drift, never a skip — and this
      //            returned `false` for it until a re-read of my own leaf. the
      //            comment claimed "asAbsentHookPaths owns absence", which is
      //            true of the shipped path and FALSE of this one: that check
      //            reads the `.agent/` path alone and never looks at src.
      //
      //            ⇒ the case it let through is a stale `dist/` that still
      //            ships a hook whose source was renamed or deleted. the path
      //            resolves, so reachability is green; the src is gone, so the
      //            compare was skipped; and the hook every test grades is not
      //            the hook that runs. the exact hole this leaf exists to close,
      //            reintroduced by its own guard clause.
      if (!existsSync(srcPath)) return true;

      return (
        readFileSync(srcPath, 'utf-8') !== readFileSync(shippedPath, 'utf-8')
      );
    });

  given('[case1] the generated .claude/settings.json', () => {
    when('[t0] every registered hook command is read, at EVERY event', () => {
      // 🔴 this walks EVERY event key, never `PreToolUse` alone. two mechanic
      //    hooks the wrapper-drop rewrote sit outside that key —
      //    `notify-permissions` at SessionStart, `trust-but-verify` at
      //    PostCompact — so a PreToolUse-only walk sees neither.
      //
      //    ⇒ an assertion inherits the scope of the INVESTIGATION that motivated
      //      it, never the scope of the CHANGE it guards. the wish measured the
      //      `Write|Edit` gate, so "every hook" reads as "every hook on that
      //      gate" unless the walk says otherwise.
      //
      // 🔴 .note = `decide-permissions` is covered HERE ([case1], the generated
      //            settings.json) and NOT by [case2], which reads the role
      //            source — it is declared in no role file at all, hand-written
      //            into settings.json instead. that gap is PRIOR to this wish
      //            and not ours to close: a declaration would regenerate
      //            settings.json in every consumer repo, for a hook this wish
      //            does not own. caught as
      //            `.dream/v2026_09_13.fix.decide-permissions-hook-undeclared-in-role.md`.
      //
      // .note = wrapped in an object, never handed back as a bare array —
      //         useBeforeAll returns a proxy, and `.length` on a proxied array
      //         reads undefined
      const registry = useBeforeAll(async () => ({
        hooks: asAllRegisteredHooks({
          settings: JSON.parse(readFileSync(settingsPath, 'utf-8')),
        }),
      }));

      then('at least one hook is registered', () => {
        expect(registry.hooks.length).toBeGreaterThan(0);
      });

      then('the author filter matches a NON-EMPTY set', () => {
        // 🔴 the positive control on `asMechanicHooks`. its predicate is a
        //    hand-typed literal — `repo=ehmpathy/role=mechanic` — that guesses
        //    what the rhachet framework stamps. it derives from no shared
        //    constant, so an upstream change to the stamp format is invisible
        //    here: the filter simply returns [].
        //
        //    and [] is the value that makes its two consumers PASS. `wrapped`
        //    would be empty because no command was examined, rather than because
        //    no command reaches through the wrapper. ⇒ the same vacuity class
        //    this file guards for the event walk, one layer up.
        //
        // ⚠️ .note = `events.size > 1` below cannot hold on an empty set, so it
        //            controls for this incidentally. that is a SIDE EFFECT of a
        //            different assertion's intent, never a stated contract — an
        //            edit to that walk could retire the guarantee with no sign
        //            it had. a control that matters is a control you declare.
        expect(
          asMechanicHooks({ hooks: registry.hooks }).length,
        ).toBeGreaterThan(0);
      });

      then('mechanic hooks are read from MORE than one event key', () => {
        // 🔴 the positive control on the widened walk. without it, a regression
        //    that narrows this back to PreToolUse leaves the two assertions
        //    below green on a smaller set — the exact failure that hid 3 hooks
        //    in the first place, silent by construction.
        //
        // 🔴 .note = it keys on the EVENT KEY, never the hook FILENAME. a
        //            filename predicate ("some mechanic hook is not named
        //            pretooluse.*") stays GREEN under the staged regression,
        //            because `posttooluse.guardBorder.onWebfetch.sh` is
        //            registered UNDER the PreToolUse key despite its name — so
        //            the predicate holds inside the narrowed set.
        //
        //            ⇒ a control must read the axis it guards, never a stand-in
        //              that usually agrees with it.
        //
        // .note = the two-stage walk is a named leaf rather than an inline
        //         pipeline, so this reads as its own claim — "the bash-invoked
        //         mechanic hooks, by event key" — as the other two walks in this
        //         file do. the tell (`isBashInvokedCommand`) stays a separate
        //         leaf; see it for why the ENTRY, not the command, is the
        //         subject here.
        const events = asHookEvents({
          hooks: asMechanicHooks({ hooks: registry.hooks }),
        });

        expect(events.size).toBeGreaterThan(1);
      });

      then('every bash-invoked hook path exists on disk', () => {
        const absent = asAbsentHookPaths({
          commands: registry.hooks.map((entry) => entry.command),
        });

        expect(absent).toEqual([]);
      });

      then('no mechanic hook reaches through the rhachet run wrapper', () => {
        // a re-stamp that restores the wrapper is silent: the gate still
        // gates, and each call pays the boot again.
        //
        // 🔴 .note = scoped to THIS role by author. settings.json also carries
        //            hooks from other role packages (bhuild/behaver,
        //            ehmpathy/architect, …) whose source this repo does not
        //            hold, so they legitimately still use the wrapper. an
        //            unscoped assertion would fail on work we cannot do here.
        //
        //            ⇒ the author filter is the ONE part this case adds over
        //            [case2]; the predicate itself is shared, so a fix to the
        //            wrapper tell lands in both cases at once. the filter is its
        //            own named leaf, so the author literal lives once.
        const wrapped = asWrappedCommands({
          commands: asMechanicHooks({ hooks: registry.hooks }).map(
            (entry) => entry.command,
          ),
        });

        expect(wrapped).toEqual([]);
      });

      then('the src↔shipped map resolves a NON-EMPTY set', () => {
        // 🔴 the positive control on `asDriftedHookPaths`, and it is owed for the
        //    same reason [case2] owed one: the assertion below is `toEqual([])`
        //    over a DERIVED list, so it passes on an empty input.
        //
        //    and empty is exactly what a PREFIX drift yields. `asSrcHookPath`
        //    keys on the literal `.agent/repo=ehmpathy/role=mechanic/`; if the
        //    ported tree ever moved, every path would fail the `startsWith` and
        //    return null ⇒ every hook skipped ⇒ the drift check green while it
        //    compares not one file.
        const mapped = asBashInvokedPaths({
          commands: asMechanicHooks({ hooks: registry.hooks }).map(
            (entry) => entry.command,
          ),
        })
          .map((shipped) => asSrcHookPath({ shipped }))
          .filter((src): src is string => src !== null);

        expect(mapped.length).toBeGreaterThan(0);
      });

      then('every shipped hook is byte-identical to the src we test', () => {
        // 🔴 every snapshot in this repo grades the `src/` hook
        //    (`path.join(__dirname, …)`), and production runs the `.agent/` path
        //    registered above. `asAbsentHookPaths` proves that path resolves;
        //    this proves it holds the same bytes.
        //
        //    ⇒ they ARE identical — `.sh` is copied, never compiled — so this is
        //    a ratchet on an invariant that holds, never a repair. its value is
        //    that a build step which transforms `.sh` on the way to `dist/` goes
        //    RED here rather than silently decoupling every snapshot in the repo
        //    from the artifact it claims to grade.
        const drifted = asDriftedHookPaths({
          commands: asMechanicHooks({ hooks: registry.hooks }).map(
            (entry) => entry.command,
          ),
        });

        expect(drifted).toEqual([]);
      });
    });
  });

  given('[case2] the role definition that GENERATES the config', () => {
    when('[t0] its registered commands are read', () => {
      // 🔴 settings.json is generated, so a stale one can pass [case1] while the
      //    role it came from already holds a broken path. this asserts the
      //    source, so a defect is caught before it is ever stamped out.
      const registry = useBeforeAll(async () => {
        const hooks = [
          ...(ROLE_MECHANIC.hooks?.onBrain?.onBoot ?? []),
          ...(ROLE_MECHANIC.hooks?.onBrain?.onTool ?? []),
        ];
        return { commands: hooks.map((hook) => hook.command) };
      });

      then('at least one command is registered', () => {
        // 🔴 the positive control, the twin of the one [case1] carries. both
        //    assertions below are `toEqual([])` over a DERIVED list, so each
        //    passes on an empty input — and the input is built from two optional
        //    chains with `?? []` fallbacks (`onBrain?.onBoot`,
        //    `onBrain?.onTool`). ⇒ a rename of either key, or a shape change
        //    upstream in `ROLE_MECHANIC`, empties `commands` and turns this
        //    whole case green while it grades not one hook.
        //
        // ⚠️ the same vacuity class the block below names for the wrapper
        //    filter. one line closes it for both.
        expect(registry.commands.length).toBeGreaterThan(0);
      });

      then('every bash-invoked hook path exists on disk', () => {
        const absent = asAbsentHookPaths({ commands: registry.commands });

        expect(absent).toEqual([]);
      });

      then('no init hook reaches through the rhachet run wrapper', () => {
        // 🔴 the source owes BOTH claims [case1] makes about the config — paths
        //    exist · no wrapper — and the path-exists check alone does not
        //    carry the second.
        //
        //    that check filters on `bash `, so a command restored to
        //    `rhachet run … --init …` is filtered OUT and passes VACUOUSLY. and
        //    [case1] reads the committed settings.json, which is stale until
        //    someone regenerates — so a wrapper reintroduced here ships green
        //    and lands in every consumer repo on their next stamp.
        //
        // .note = the `rhachet roles boot` carve-out, and the two-token tell it
        //         rests on, live with the predicate itself — see
        //         `asWrappedCommands` above. that is the point of the shared
        //         leaf: [case1] and [case2] cannot drift apart on it.
        const wrapped = asWrappedCommands({ commands: registry.commands });

        expect(wrapped).toEqual([]);
      });
    });
  });
});
