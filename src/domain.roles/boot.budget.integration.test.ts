import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { ConstraintError } from 'helpful-errors';
import { join, relative } from 'path';
import { given, then, useThen, when } from 'test-fns';

import { getRoleRegistry } from './getRoleRegistry';

/**
 * .what = every registered role's boot.yml declares a budget, and boots within it
 * .why = a `budget:` pin caps today's boot size, so boot.yml growth fails loud here,
 *        not silently in every consumer's context window
 * .note = classified integration: it spawns `rhachet roles cost`, which reads the role
 *         dir from disk (rule.forbid.unit.remote-boundaries)
 * .note = one spec renders at a different size per view, since the paths it emits differ:
 *         - src    = the spec an author edits; its `<also>` roster lists unshipped test files
 *         - linked = the consumer view (`.agent/repo=ehmpathy/role=…`); the longest path prefix
 *         neither view bounds the other, so both are graded. `repo introspect` grades the
 *         dist spec at build, by the same tokenizer
 * .note = `roles cost` exits 0 over budget (it is a report), so the cap is asserted here
 */

const dirRepo = join(__dirname, '../..');

/**
 * .what = the token count + declared budget from `roles cost --what` output
 * .why = the report is prose; the cap needs the two numbers behind it
 */
const asBootCost = (input: {
  output: string;
}): { tokens: number; budget: number | null } => {
  const asNumber = (digits: string): number => Number(digits.replace(/,/g, ''));
  const tokensMatch = input.output.match(/tokens\s+=\s+([\d,]+)/);
  const budgetMatch = input.output.match(/budget\s+=\s+([\d,]+) tokens/);
  if (!tokensMatch)
    throw new Error(
      `roles cost output carries no token count; did its format change?\n${input.output}`,
    );
  return {
    tokens: asNumber(tokensMatch[1]!),
    budget: budgetMatch ? asNumber(budgetMatch[1]!) : null,
  };
};

/**
 * .what = run rhachet's paved measure against one boot spec
 */
const getBootCost = (input: {
  pathToSpec: string;
}): { tokens: number; budget: number | null } => {
  const output = execSync(
    `npx rhachet roles cost --what '${input.pathToSpec}' --top 0`,
    { encoding: 'utf-8', timeout: 120_000, cwd: dirRepo },
  );
  return asBootCost({ output });
};

/**
 * .what = the consumer-view spec path for a role, as linked into `.agent/`
 * .why = fail loud where the link is absent, rather than skip the view it grades
 */
const getLinkedSpecPath = (input: { slugRole: string }): string => {
  const pathToSpec = `.agent/repo=ehmpathy/role=${input.slugRole}/boot.yml`;
  if (!existsSync(join(dirRepo, pathToSpec)))
    throw new ConstraintError(
      'linked boot spec absent; the consumer view is ungraded',
      {
        pathToSpec,
        hint: 'run: npm run prepare:rhachet',
      },
    );
  return pathToSpec;
};

describe('boot.budget', () => {
  const roles = getRoleRegistry().roles;

  given('[case0] the role registry', () => {
    then('every registered role declares a boot spec', () => {
      // a role with no boot.yml boots every brief it holds, uncapped
      const rolesUnspecced = roles
        .filter((role) => !role.boot)
        .map((role) => role.slug);
      expect(rolesUnspecced).toEqual([]);
    });
  });

  roles.forEach((role, index) => {
    given(`[case${index + 1}] the ${role.slug} role`, () => {
      when('[t0] its src spec is costed', () => {
        const cost = useThen('the measure succeeds', () =>
          getBootCost({ pathToSpec: relative(dirRepo, role.boot!.uri) }),
        );

        then('it declares a budget', () => {
          expect(cost.budget).not.toBeNull();
        });

        then('its boot fits within that budget', () => {
          // on red: trim the boot, or raise `budget.tokens` deliberately
          console.log(
            `${role.slug} (src): ${cost.tokens.toLocaleString()} / ${cost.budget?.toLocaleString()} tokens`,
          );
          expect(cost.tokens).toBeLessThanOrEqual(cost.budget!);
        });
      });

      when('[t1] its linked spec is costed, as a consumer boots it', () => {
        const cost = useThen('the measure succeeds', () =>
          getBootCost({
            pathToSpec: getLinkedSpecPath({ slugRole: role.slug }),
          }),
        );

        then('its boot fits within that budget', () => {
          // on red: trim the boot, or raise `budget.tokens` deliberately
          console.log(
            `${role.slug} (linked): ${cost.tokens.toLocaleString()} / ${cost.budget?.toLocaleString()} tokens`,
          );
          expect(cost.budget).not.toBeNull();
          expect(cost.tokens).toBeLessThanOrEqual(cost.budget!);
        });
      });
    });
  });
});
