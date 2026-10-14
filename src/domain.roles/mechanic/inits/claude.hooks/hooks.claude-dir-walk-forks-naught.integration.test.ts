import * as fs from 'fs';
import * as path from 'path';
import { given, then, when } from 'test-fns';

/**
 * .what = every hook's upward walk for `.claude` strips segments in-shell, never via `dirname`
 * .why = the walk runs on every invocation, and `$(dirname "$dir")` costs one exec per parent
 *        dir — ~7 in a deep worktree, on every Bash call for check-permissions. `${dir%/*}`
 *        costs none. a hook that drifts back to `dirname` stays correct and silently slower,
 *        so only a source read can catch it.
 * .note = the hook list is read from disk, so a new hook that walks for `.claude` is held too
 */
describe('hooks · the .claude walk forks naught', () => {
  const hooksDir = __dirname;

  /**
   * .what = the body of each walk function in a source — `*_claude_dir()`, and the layers
   *         lib's `set_permissions_dirs()`
   */
  const asClaudeDirWalks = (input: { source: string }): string[] =>
    [
      ...input.source.matchAll(
        /^(?:(?:find|get)_claude_dir|set_permissions_dirs)\(\) \{\n([\s\S]*?)^\}/gm,
      ),
    ].map((match) => match[1] ?? '');

  const HOOKS = fs
    .readdirSync(hooksDir)
    .filter((name) => name.endsWith('.sh'))
    .map((name) => ({
      name,
      walks: asClaudeDirWalks({
        source: fs.readFileSync(path.join(hooksDir, name), 'utf-8'),
      }),
    }))
    .filter((hook) => hook.walks.length > 0);

  given('[case1] the hooks that walk for .claude', () => {
    when('[t0] the set of walks is collected', () => {
      then('the set is not vacuous', () => {
        const names = HOOKS.map((hook) => hook.name);
        // the permission hooks walk via the shared layers lib, the permissions.* skills via the
        // render lib, the forbid-terms gates via the hardnudge lib
        expect(names).toContain('permissions.layers.operations.sh');
        expect(names).toContain('_permissions.render.lib.sh');
        expect(names).toContain('_hardnudge.lib.sh');
        // the permission hooks hold no walk of their own: a copy there would drift from the lib's
        expect(names).not.toContain('sessionstart.notify-permissions.sh');
        expect(names).not.toContain('permissionrequest.decide-permissions.sh');
      });

      then('the matcher reads a dirname walk when one is there', () => {
        const walks = asClaudeDirWalks({
          source: 'get_claude_dir() {\n  dir="$(dirname "$dir")"\n}\n',
        });
        expect(walks.join('')).toContain('dirname');
      });
    });

    HOOKS.forEach((hook) => {
      when(`[t1] ${hook.name} is read`, () => {
        then('its walk calls no dirname, and guards the root', () => {
          hook.walks.forEach((walk) => {
            expect(walk).not.toContain('dirname');
            expect(walk).toContain('${dir%/*}');
            expect(walk).toContain('[[ -z "$dir" ]] && dir="/"');
          });
        });
      });
    });
  });
});
