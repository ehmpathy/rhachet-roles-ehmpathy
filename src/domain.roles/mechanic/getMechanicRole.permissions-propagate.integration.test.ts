import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = every permission the mechanic role declares is present where the engine reads it
 * .why = the role declares its allow/deny lists in `init.claude.permissions.jsonc`, and claude
 *        code enforces `.claude/settings.json`. a deny that never reaches settings reads as a
 *        guard to its author and permits the act — silent in both directions. check the guard
 *        where it is ENFORCED, never where it is declared.
 * .note = compared as SETS: settings.json is sorted, the source is grouped by concern
 */
describe('getMechanicRole · declared permissions reach the engine', () => {
  const repoRoot = path.join(__dirname, '..', '..', '..');

  /**
   * .what = strip `//` comments from jsonc, outside of strings only
   * .why = a naive `//.*` strip eats a `//` inside a string value (a url, a glob), which
   *        would corrupt the very entries this gate compares
   */
  const asJsonFromJsonc = (input: { jsonc: string }): string => {
    let out = '';
    let inString = false;
    for (let i = 0; i < input.jsonc.length; i++) {
      const char = input.jsonc[i];
      if (inString) {
        out += char;
        if (char === '\\') {
          out += input.jsonc[i + 1] ?? '';
          i++;
          continue;
        }
        if (char === '"') inString = false;
        continue;
      }
      if (char === '"') {
        inString = true;
        out += char;
        continue;
      }
      if (char === '/' && input.jsonc[i + 1] === '/') {
        while (i < input.jsonc.length && input.jsonc[i] !== '\n') i++;
        out += '\n';
        continue;
      }
      out += char;
    }
    return out.replace(/,(\s*[\]}])/g, '$1');
  };

  given('[case1] the role source and the generated settings', () => {
    when('[t0] both permission lists are read', () => {
      const lists = useBeforeAll(async () => {
        const source = JSON.parse(
          asJsonFromJsonc({
            jsonc: readFileSync(
              path.join(__dirname, 'inits', 'init.claude.permissions.jsonc'),
              'utf-8',
            ),
          }),
        ).permissions;
        const settings = JSON.parse(
          readFileSync(
            path.join(repoRoot, '.claude', 'settings.json'),
            'utf-8',
          ),
        ).permissions;
        // the driver role (rhachet-roles-bhrain) owns `.route/` and heals its denies out of
        // settings — route protection lives in its `route.mutate.guard` hook instead. a deny it
        // declares it strips is an owned override, never a silent loss, so it is read from the
        // installed driver's own file: the exemption tracks upstream exactly, and an
        // uninstalled driver exempts naught
        const driverStripPath = path.join(
          repoRoot,
          'node_modules/rhachet-roles-bhrain/dist/domain.roles/driver/inits/init.claude.permissions.route.jsonc',
        );
        const driverStrips: string[] = existsSync(driverStripPath)
          ? JSON.parse(
              asJsonFromJsonc({
                jsonc: readFileSync(driverStripPath, 'utf-8'),
              }),
            ).permissions.deny
          : [];
        return {
          sourceDeny: source.deny as string[],
          sourceAllow: source.allow as string[],
          settingsDeny: new Set(settings.deny as string[]),
          settingsAllow: new Set(settings.allow as string[]),
          driverStrips: new Set(driverStrips),
        };
      });

      then('the comment stripper keeps a `//` inside a string', () => {
        expect(
          JSON.parse(asJsonFromJsonc({ jsonc: '{ "u": "http://reef" } // x' })),
        ).toEqual({ u: 'http://reef' });
      });

      then('the source lists are not empty', () => {
        expect(lists.sourceDeny.length).toBeGreaterThan(0);
        expect(lists.sourceAllow.length).toBeGreaterThan(0);
      });

      then(
        'every declared deny is enforced, save those the driver heals',
        () => {
          expect(
            lists.sourceDeny.filter(
              (rule) =>
                !lists.settingsDeny.has(rule) && !lists.driverStrips.has(rule),
            ),
          ).toEqual([]);
        },
      );

      then(
        'the driver heal list is read, so the exemption is not vacuous',
        () => {
          expect(lists.driverStrips.has('Edit(*/**/.route/**)')).toBe(true);
        },
      );

      then('every declared allow is enforced', () => {
        expect(
          lists.sourceAllow.filter((rule) => !lists.settingsAllow.has(rule)),
        ).toEqual([]);
      });
    });
  });
});
