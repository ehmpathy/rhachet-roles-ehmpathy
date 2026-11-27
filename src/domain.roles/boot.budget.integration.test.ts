import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { join, relative } from 'path';
import { getError, given, then, useThen, when } from 'test-fns';

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
 * .what = the wall-clock cap on one `roles cost` run
 * .why = a cold npx plus the tokenizer over ~100 briefs takes seconds; the cap only stops a hang.
 *        a run past it fails as a named malfunction, never as an overage
 */
const TIMEOUT_MEASURE_MS = 120_000;

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
  const budgetNone = /budget\s+=\s+none declared/.test(input.output);
  const hint =
    'compare the regexes in asBootCost with the current `npx rhachet roles cost` output; update the parser to match';
  if (!tokensMatch)
    throw new MalfunctionError(
      'roles cost output carries no token count; did its format change?',
      { output: input.output, hint },
    );

  // a budget line reads as a number or as `none declared`; any other shape is parser drift, not an absent cap
  if (!budgetMatch && !budgetNone)
    throw new MalfunctionError(
      'roles cost output carries no readable budget line; did its format change?',
      { output: input.output, hint },
    );
  return {
    tokens: asNumber(tokensMatch[1]!),
    budget: budgetMatch ? asNumber(budgetMatch[1]!) : null,
  };
};

/**
 * .what = the named failure for a measure that did not finish
 * .why = a timeout or a crash is a malfunction of the measure, never a budget overage; say which
 */
const asBootCostMeasureError = (input: {
  pathToSpec: string;
  command: string;
  cause: Error;
}): Error => {
  const isTimeout = 'code' in input.cause && input.cause.code === 'ETIMEDOUT';
  const status = 'status' in input.cause ? input.cause.status : null;
  if (isTimeout)
    return new MalfunctionError(
      `the boot measure timed out after ${TIMEOUT_MEASURE_MS / 1000}s; this is load, not an overage`,
      {
        pathToSpec: input.pathToSpec,
        command: input.command,
        hint: "rerun the suite alone: rhx git.repo.test --what integration --scope 'path://boot.budget' --mode apply",
      },
    );
  return new MalfunctionError(
    'the boot measure failed; this is a malfunction, not an overage',
    {
      pathToSpec: input.pathToSpec,
      command: input.command,
      status,
      detail: input.cause.message,
      hint: `run it by hand to see its output: ${input.command}`,
    },
  );
};

/**
 * .what = run rhachet's paved measure against one boot spec
 */
const getBootCost = (input: {
  pathToSpec: string;
}): { tokens: number; budget: number | null } => {
  // measure; a run that does not finish fails as a named malfunction
  const command = `npx rhachet roles cost --what '${input.pathToSpec}' --top 0`;
  const output = (() => {
    try {
      return execSync(command, {
        encoding: 'utf-8',
        timeout: TIMEOUT_MEASURE_MS,
        cwd: dirRepo,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      throw asBootCostMeasureError({
        pathToSpec: input.pathToSpec,
        command,
        cause: error,
      });
    }
  })();

  // read the two numbers
  return asBootCost({ output });
};

/**
 * .what = the consumer-view spec path for a role, as linked into `.agent/`
 */
const asLinkedSpecPath = (input: { slugRole: string }): string =>
  `.agent/repo=ehmpathy/role=${input.slugRole}/boot.yml`;

/**
 * .what = fail loud where a linked spec is absent
 * .why = an absent link would otherwise skip the view it grades
 */
const assertLinkedSpecExtant = (input: { pathToSpec: string }): void => {
  if (existsSync(join(dirRepo, input.pathToSpec))) return;
  throw new ConstraintError(
    'linked boot spec absent; the consumer view is ungraded',
    { pathToSpec: input.pathToSpec, hint: 'run: npm run prepare:rhachet' },
  );
};

/**
 * .what = the note a src-view message carries: its count holds files no consumer boots
 * .why = in `src/`, the `<also>` roster lists test files and snapshots the build drops, so a src
 *        view can near or pass its cap while the linked view has room; without this note the
 *        author condenses a brief to cure tokens no consumer pays
 */
const NOTE_SRC_VIEW =
  'src view; its <also> counts test files the build drops. the linked case is what a consumer boots';

/**
 * .what = whether a spec path is the src view (as authored), not the linked view (as booted)
 */
const isSrcViewSpec = (input: { pathToSpec: string }): boolean =>
  input.pathToSpec.startsWith('src/');

/**
 * .what = fail loud when a boot declares no budget, or exceeds it, with the cure in the message
 * .why = a bare `expected <= budget` names the symptom; the author needs the move that fixes it
 */
const assertBootFitsBudget = (input: {
  slugRole: string;
  pathToSpec: string;
  cost: { tokens: number; budget: number | null };
}): void => {
  // a spec with no budget has no cap to fit
  if (input.cost.budget === null)
    throw new ConstraintError(`the ${input.slugRole} boot declares no budget`, {
      pathToSpec: input.pathToSpec,
      tokens: input.cost.tokens,
      hint: `pin a cap at the top of the spec: budget: { tokens: <n> }; measure first via npx rhachet roles cost --what '${input.pathToSpec}'`,
    });

  // pass if the boot fits
  if (input.cost.tokens <= input.cost.budget) return;

  // otherwise name the overage and the cure
  throw new ConstraintError(`the ${input.slugRole} boot exceeds its budget`, {
    pathToSpec: input.pathToSpec,
    tokens: input.cost.tokens,
    budget: input.cost.budget,
    over: input.cost.tokens - input.cost.budget,
    hint: [
      ...(isSrcViewSpec(input) ? [NOTE_SRC_VIEW] : []),
      `see where the tokens go: npx rhachet roles cost --what '${input.pathToSpec}' --top 5`,
      'condense a say brief into a `.min` twin, or demote one to ref',
      'of a forbid/require pair, the forbid pole stays say (rule.require.forbid-pole-on-boot-choice)',
      'raise `budget.tokens` only as a deliberate, reviewed call',
    ],
  });
};

/**
 * .what = the share of the budget past which a boot that fits still earns an alert
 * .why = a boot at 99.9% fits today and fails on the next one-word edit to a say brief;
 *        the author should see the squeeze before the red, not at it
 */
const BUDGET_SHARE_ALERT = 0.98;

/**
 * .what = a near-budget alert for a boot that fits, or null when it has headroom
 * .why = an overage fails loud; a near-overage is invisible until the edit that tips it, so
 *        it is named here, with the headroom left and the cure, while every test stays green
 */
const asBootHeadroomAlert = (input: {
  slugRole: string;
  pathToSpec: string;
  cost: { tokens: number; budget: number | null };
}): string | null => {
  // no budget, or an overage: assertBootFitsBudget owns both
  if (input.cost.budget === null) return null;
  if (input.cost.tokens > input.cost.budget) return null;

  // headroom above the alert share: no alert
  if (input.cost.tokens < input.cost.budget * BUDGET_SHARE_ALERT) return null;

  // otherwise name the squeeze and the cure
  return [
    `⚠️ the ${input.slugRole} boot is near its budget`,
    `   ├─ spec: ${input.pathToSpec}`,
    `   ├─ tokens: ${input.cost.tokens.toLocaleString()} / ${input.cost.budget.toLocaleString()}`,
    `   ├─ headroom: ${(input.cost.budget - input.cost.tokens).toLocaleString()} tokens`,
    ...(isSrcViewSpec(input) ? [`   ├─ note: ${NOTE_SRC_VIEW}`] : []),
    `   └─ cure: condense a say brief before the next lands; npx rhachet roles cost --what '${input.pathToSpec}' --top 5`,
  ].join('\n');
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

  given('[case1] a crafted cost, so each failure renders', () => {
    const pathToSpec = 'src/domain.roles/surfer/boot.yml';

    when('[t0] the boot exceeds its budget', () => {
      then('it names the overage and the cure', async () => {
        const error = await getError(() =>
          assertBootFitsBudget({
            slugRole: 'surfer',
            pathToSpec,
            cost: { tokens: 15_420, budget: 15_000 },
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('the surfer boot exceeds its budget');
        expect(error.message).toContain('"over": 420');
        expect(error.message).toContain(NOTE_SRC_VIEW);
        expect(error.message).toContain(
          `npx rhachet roles cost --what '${pathToSpec}' --top 5`,
        );
        expect(error.message).toMatchSnapshot();
      });
    });

    when('[t0.1] the linked view exceeds its budget', () => {
      then(
        'it names the overage and the cure, without the src-view note',
        async () => {
          const pathToSpecLinked = asLinkedSpecPath({ slugRole: 'surfer' });
          const error = await getError(() =>
            assertBootFitsBudget({
              slugRole: 'surfer',
              pathToSpec: pathToSpecLinked,
              cost: { tokens: 15_420, budget: 15_000 },
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('the surfer boot exceeds its budget');
          expect(error.message).toContain('"over": 420');
          expect(error.message).not.toContain(NOTE_SRC_VIEW);
          expect(error.message).toContain(
            `npx rhachet roles cost --what '${pathToSpecLinked}' --top 5`,
          );
          expect(error.message).toMatchSnapshot();
        },
      );
    });

    when('[t1] the boot declares no budget', () => {
      then('it names the absent cap, not an overage', async () => {
        const error = await getError(() =>
          assertBootFitsBudget({
            slugRole: 'surfer',
            pathToSpec,
            cost: { tokens: 9_000, budget: null },
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('the surfer boot declares no budget');
        expect(error.message).not.toContain('exceeds');
        expect(error.message).toMatchSnapshot();
      });
    });

    when('[t2] the boot fits its budget exactly', () => {
      then('it passes', () => {
        expect(() =>
          assertBootFitsBudget({
            slugRole: 'surfer',
            pathToSpec,
            cost: { tokens: 15_000, budget: 15_000 },
          }),
        ).not.toThrow();
      });
    });

    when('[t3] the measure prints no token count', () => {
      then('it fails loud as a malfunction', async () => {
        const error = await getError(() =>
          asBootCost({ output: 'the reef is calm today' }),
        );
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain('carries no token count');
        expect(error.message).toMatchSnapshot();
      });
    });

    when('[t3.1] the measure prints a budget line in a drifted format', () => {
      then(
        'it fails loud as a malfunction, not as an absent budget',
        async () => {
          const error = await getError(() =>
            asBootCost({
              output: '├─ tokens  = 9,000\n├─ budget  = 15,000 toks (60% used)',
            }),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain('no readable budget line');
          expect(error.message).toMatchSnapshot();
        },
      );
    });

    when('[t3.2] the measure prints that no budget is declared', () => {
      then('it reads the budget as absent', () => {
        const cost = asBootCost({
          output:
            '├─ tokens  = 9,000\n├─ budget  = none declared — this boot is uncapped',
        });
        expect(cost).toEqual({ tokens: 9000, budget: null });
      });
    });

    when('[t4] the linked spec is absent', () => {
      then('it names the fix', async () => {
        // a slug no role will ever take, so the spec is absent in any checkout
        const error = await getError(() =>
          assertLinkedSpecExtant({
            pathToSpec: asLinkedSpecPath({ slugRole: '__never-linked__' }),
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('npm run prepare:rhachet');
        expect(error.message).toMatchSnapshot();
      });
    });

    when('[t5] the measure times out', () => {
      then('it names load, not an overage', () => {
        const error = asBootCostMeasureError({
          pathToSpec,
          command: `npx rhachet roles cost --what '${pathToSpec}' --top 0`,
          cause: Object.assign(new Error('spawnSync /bin/sh ETIMEDOUT'), {
            code: 'ETIMEDOUT',
          }),
        });
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain('timed out');
        expect(error.message).toContain('not an overage');
        expect(error.message).toMatchSnapshot();
      });
    });

    when('[t6] the measure exits nonzero', () => {
      then('it names a malfunction and the command to rerun', () => {
        const command = `npx rhachet roles cost --what '${pathToSpec}' --top 0`;
        const error = asBootCostMeasureError({
          pathToSpec,
          command,
          cause: Object.assign(new Error(`Command failed: ${command}`), {
            status: 1,
          }),
        });
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain('not an overage');
        expect(error.message).toContain('"status": 1');
        expect(error.message).toContain('"detail": "Command failed:');
        expect(error.message).toMatchSnapshot();
      });
    });

    when('[t7] the boot fits, within 2% of its budget', () => {
      then('it warns with the headroom left and the cure', () => {
        const alert = asBootHeadroomAlert({
          slugRole: 'surfer',
          pathToSpec,
          cost: { tokens: 14_990, budget: 15_000 },
        });
        expect(alert).toContain('the surfer boot is near its budget');
        expect(alert).toContain('headroom: 10 tokens');
        expect(alert).toContain(NOTE_SRC_VIEW);
        expect(alert).toMatchSnapshot();
      });
    });

    when('[t7.1] the linked view fits, within 2% of its budget', () => {
      then('it warns without the src-view note', () => {
        const alert = asBootHeadroomAlert({
          slugRole: 'surfer',
          pathToSpec: asLinkedSpecPath({ slugRole: 'surfer' }),
          cost: { tokens: 14_990, budget: 15_000 },
        });
        expect(alert).toContain('the surfer boot is near its budget');
        expect(alert).toContain('headroom: 10 tokens');
        expect(alert).not.toContain(NOTE_SRC_VIEW);
        expect(alert).toMatchSnapshot();
      });
    });

    when('[t8] the boot fits, with more than 2% headroom', () => {
      then('it does not warn', () => {
        const alert = asBootHeadroomAlert({
          slugRole: 'surfer',
          pathToSpec,
          cost: { tokens: 14_600, budget: 15_000 },
        });
        expect(alert).toBeNull();
      });
    });
  });

  // .note = each role case is labeled by its slug, so a case added above this loop renumbers none
  roles.forEach((role) => {
    given(`[case:${role.slug}] the ${role.slug} role`, () => {
      when('[t0] its src spec is costed', () => {
        const measured = useThen('the measure succeeds', () => {
          // a role with no boot spec fails loud in its own case, never as a bare error at collection
          if (!role.boot)
            throw new ConstraintError(
              `the ${role.slug} role declares no boot spec`,
              { hint: `add src/domain.roles/${role.slug}/boot.yml` },
            );
          const pathToSpec = relative(dirRepo, role.boot.uri);
          return { pathToSpec, cost: getBootCost({ pathToSpec }) };
        });

        then('its boot declares a budget and fits within it', () => {
          const { pathToSpec, cost } = measured;
          console.log(
            `${role.slug} (src): ${cost.tokens.toLocaleString()} / ${cost.budget?.toLocaleString()} tokens`,
          );
          assertBootFitsBudget({ slugRole: role.slug, pathToSpec, cost });

          // warn, never fail, when a boot that fits has little headroom
          const alert = asBootHeadroomAlert({
            slugRole: role.slug,
            pathToSpec,
            cost,
          });
          if (alert) console.warn(alert);
        });
      });

      when('[t1] its linked spec is costed, as a consumer boots it', () => {
        const measured = useThen('the measure succeeds', () => {
          const pathToSpec = asLinkedSpecPath({ slugRole: role.slug });
          assertLinkedSpecExtant({ pathToSpec });
          return { pathToSpec, cost: getBootCost({ pathToSpec }) };
        });

        then('its boot declares a budget and fits within it', () => {
          const { pathToSpec, cost } = measured;
          console.log(
            `${role.slug} (linked): ${cost.tokens.toLocaleString()} / ${cost.budget?.toLocaleString()} tokens`,
          );
          assertBootFitsBudget({ slugRole: role.slug, pathToSpec, cost });

          // warn, never fail, when a boot that fits has little headroom
          const alert = asBootHeadroomAlert({
            slugRole: role.slug,
            pathToSpec,
            cost,
          });
          if (alert) console.warn(alert);
        });
      });
    });
  });
});
