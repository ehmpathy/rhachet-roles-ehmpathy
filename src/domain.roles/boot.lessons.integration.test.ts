import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { MalfunctionError } from 'helpful-errors';
import { join } from 'path';
import { given, then, useBeforeAll, when } from 'test-fns';

/**
 * .what = each constraint, transaction, privacy, and taxonomy lesson boots at the tier its role spec plans
 * .why = a clone acts on what it boots: a forbid pole that slips from `say` to `ref` stops it at the
 *        keyboard no longer, and a catalog member that slips into the boot spends the budget on a
 *        file meant to be read on demand. this reads the boot a clone receives, not the yml
 * .note = classified integration: it spawns `rhachet roles boot` and reads briefs from disk
 */

type BootTier = 'say' | 'ref' | 'also' | 'absent';
type BootTiers = { say: string[]; ref: string[]; also: string[] };

const dirRepo = join(__dirname, '..', '..');

/**
 * .what = the boot payload a clone receives for one role spec
 */
const getBootPayload = (input: { slugRole: string }): string => {
  const pathToSpec = `src/domain.roles/${input.slugRole}/boot.yml`;
  try {
    return execSync(`npx rhachet roles boot --what '${pathToSpec}'`, {
      cwd: dirRepo,
      encoding: 'utf-8',
      timeout: 120_000,
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    throw new MalfunctionError('the boot command failed', {
      pathToSpec,
      error: error.message,
    });
  }
};

/**
 * .what = the brief paths of a boot payload, by tier, relative to the role's `briefs/` dir
 * .why = `say` briefs render whole (a `.min` in place of its source); `ref` briefs render as one
 *        path per line under a base; `<also>` holds the briefs the spec never named
 */
const asBootTiers = (input: {
  payload: string;
  slugRole: string;
}): BootTiers => {
  const prefixRole = `src/domain.roles/${input.slugRole}/briefs/`;
  const [head, tail] = input.payload.split('\n<also>\n');
  const asPaths = (text: string): string[] =>
    [
      ...text.matchAll(
        /<briefs\.ref base="([^"]+)">\n([\s\S]*?)<\/briefs\.ref>/g,
      ),
    ]
      .filter((match) => match[1]!.startsWith(prefixRole))
      .flatMap((match) =>
        match[2]!
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .map((line) => `${match[1]!.slice(prefixRole.length)}${line}`),
      );
  const say = [...(head ?? '').matchAll(/<brief\.say path="([^"]+)">/g)]
    .map((match) => match[1]!)
    .filter((path) => path.startsWith(prefixRole))
    .map((path) => path.slice(prefixRole.length).replace(/\.min$/, ''));
  return { say, ref: asPaths(head ?? ''), also: asPaths(tail ?? '') };
};

/**
 * .what = the tier one brief boots at
 */
const asBootTier = (input: { tiers: BootTiers; path: string }): BootTier => {
  if (input.tiers.say.includes(input.path)) return 'say';
  if (input.tiers.ref.includes(input.path)) return 'ref';
  if (input.tiers.also.includes(input.path)) return 'also';
  return 'absent';
};

/**
 * .what = the planned tier of each lesson brief this route shipped, per role
 * .why = the vision's boot plan (I01, I04–I09, I18–I30, F02, F19); the forbid pole of each pair
 *        boots as `say` and its require twin as `ref` (rule.require.forbid-pole-on-boot-choice)
 */
const PLAN: { slugRole: string; path: string; tier: BootTier }[] = [
  // architect — constraints
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/define.constraint.kind=invariant.md',
    tier: 'say',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/rule.forbid.scattered-invariant-guards.md',
    tier: 'say',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/rule.forbid.multiplicative-composition.md',
    tier: 'say',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/rule.forbid.implicit-assumptions.md',
    tier: 'say',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/rule.require.invariant-before-operation.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/rule.require.assumptions-with-evidence.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/define.constraint.grain=enforcement.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/howto.itemize-constraints._.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/ref.invariant.history.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/philosophy.invariants-are-the-source.md',
    tier: 'say',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/philosophy.constraints-shrink-the-space.md',
    tier: 'say',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/define.constraint._.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/define.constraint.grain=declaration.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/define.constraint.kind=invariant.evidence.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/define.constraint._.evidence.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/define.constraint.kind=assumption.evidence.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/define.constraint.kind=guarantee.evidence.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/define.constraint.grain=declaration.evidence.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/define.constraint.grain=enforcement.evidence.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/define.constraint.kind=assumption.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/define.constraint.kind=guarantee.md',
    tier: 'ref',
  },
  // architect — abstractions, transactions, privacy, taxonomy
  {
    slugRole: 'architect',
    path: 'practices/domain.abstractions/define.abstraction._.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.abstractions/define.abstraction.kind=contract.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.abstractions/define.abstraction.kind=construct.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.abstractions/philosophy.abstraction-creates-precision.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.constraints/rule.require.compose-additively.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.abstractions/catalog.of=tactic.abstraction._.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.transactions/rule.forbid.check-then-write.md',
    tier: 'say',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.transactions/rule.forbid.sagas.md',
    tier: 'say',
  },
  {
    slugRole: 'architect',
    path: 'practices/repo.structure/rule.forbid.misplaced-operations.md',
    tier: 'say',
  },
  {
    slugRole: 'architect',
    path: 'practices/repo.structure/rule.require.most-common-denominator.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/repo.structure/rule.forbid.directory.by-secondary-noun.md',
    tier: 'say',
  },
  {
    slugRole: 'architect',
    path: 'practices/repo.structure/rule.require.directory.by-primary-noun.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/ubiqlang/rule.avoid.asymmetric-term-pairs.md',
    tier: 'say',
  },
  {
    slugRole: 'architect',
    path: 'practices/ubiqlang/rule.prefer.symmetric-term-pairs.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.transactions/catalog.of=pattern.transaction._.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.privacy/rule.forbid.pii-egress.md',
    tier: 'say',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.privacy/rule.require.pii-quarantine.md',
    tier: 'ref',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.taxonomy/define.software-domain-taxonomy.md',
    tier: 'say',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.taxonomy/rule.forbid.handrolled-search-over-scarce-resources.md',
    tier: 'say',
  },
  {
    slugRole: 'architect',
    path: 'practices/domain.taxonomy/rule.forbid.analytical-scans-on-live-storage.md',
    tier: 'say',
  },
  // mechanic — the definition twin, the test-edit pair, the clamp amend, the terms
  {
    slugRole: 'mechanic',
    path: 'practices/lang.terms/define.constraint.kind=invariant.md',
    tier: 'say',
  },
  {
    slugRole: 'mechanic',
    path: 'practices/work.flow/refactor/rule.forbid.test-edit-without-named-proof.md',
    tier: 'say',
  },
  // the require pole of the pair: the budget forces a choice, so the forbid pole above stays say
  {
    slugRole: 'mechanic',
    path: 'practices/work.flow/refactor/rule.require.review-test-changes.md',
    tier: 'ref',
  },
  {
    slugRole: 'mechanic',
    path: 'practices/work.flow/diagnose/rule.require.clamp-edge-cases.md',
    tier: 'say',
  },
  {
    slugRole: 'mechanic',
    path: 'practices/lang.terms/rule.forbid.term=state.md',
    tier: 'ref',
  },
  {
    slugRole: 'mechanic',
    path: 'practices/lang.terms/rule.forbid.term=map.md',
    tier: 'ref',
  },
  {
    slugRole: 'mechanic',
    path: 'practices/lang.terms/rule.forbid.term=model.md',
    tier: 'ref',
  },
  {
    slugRole: 'mechanic',
    path: 'practices/lang.terms/rule.forbid.term=store.md',
    tier: 'ref',
  },
  {
    slugRole: 'mechanic',
    path: 'practices/lang.terms/rule.forbid.term=property.md',
    tier: 'ref',
  },
  {
    slugRole: 'mechanic',
    path: 'practices/lang.terms/philosophy.why-we-ban-terms.md',
    tier: 'ref',
  },
  ...['hold', 'row', 'fold', 'nothing', 'staging', 'script'].map(
    (slug): { slugRole: string; path: string; tier: BootTier } => ({
      slugRole: 'mechanic',
      path: `practices/lang.terms/rule.forbid.term=${slug}.md`,
      tier: 'ref',
    }),
  ),
  // the example files sit beside their rules and never boot: each rule cites its own
  ...[
    'dryrun.example=demo',
    'existing.example=demo',
    'helpers.example=demo',
    'map.example=demo',
    'model.example=demo',
    'normalize.example=demo',
    'resolve.example=demo',
    'state.example=demo',
    'store.example=demo',
    'property.example=demo',
    'script.example=demo',
    'hold.example=surf-school',
    'hold.example=one-word-three-concepts',
    'row.example=demo',
    'fold.example=demo',
    'nothing.example=demo',
    'staging.example=demo',
  ].map((slug): { slugRole: string; path: string; tier: BootTier } => ({
    slugRole: 'mechanic',
    path: `practices/lang.terms/rule.forbid.term=${slug}.md`,
    tier: 'absent',
  })),
  {
    slugRole: 'mechanic',
    path: 'practices/lang.terms/rule.prefer.converge-contrast.md',
    tier: 'ref',
  },
  {
    slugRole: 'mechanic',
    path: 'practices/lang.terms/rule.prefer.root-leaf.md',
    tier: 'ref',
  },
];

/**
 * .what = the lines this route amended into an extant `say` brief, which must reach the boot
 * .why = a `say` brief boots as its `.min`; an amend kept only in the full `.md` passes the tier
 *        check, yet the clone never reads it (I10)
 */
const AMENDS_BOOTED: { slugRole: string; path: string; line: string }[] = [
  {
    slugRole: 'mechanic',
    path: 'practices/work.flow/diagnose/rule.require.clamp-edge-cases.md',
    line: "broke an invariant? name it in the clamp's title; clamp its break case",
  },
];

/**
 * .what = the dirs whose members are read on demand, never booted: each path is computable from its root
 */
const MEMBERS_UNBOOTED: { slugRole: string; dir: string; prefix: string }[] = [
  {
    slugRole: 'architect',
    dir: 'practices/domain.abstractions',
    prefix: 'catalog.of=tactic.abstraction.kind=',
  },
  {
    slugRole: 'architect',
    dir: 'practices/domain.transactions',
    prefix: 'catalog.of=pattern.transaction.bound=',
  },
  {
    slugRole: 'architect',
    dir: 'practices/domain.constraints',
    prefix: 'howto.itemize-constraints.template=',
  },
];

describe('boot.lessons', () => {
  const slugRoles = [...new Set(PLAN.map((row) => row.slugRole))];

  given('[case1] a crafted boot payload, so the parse is clamped', () => {
    const payload = [
      '<brief.say path="src/domain.roles/surfer/briefs/practices/rule.forbid.wipeout.md.min">',
      '# rule.forbid.wipeout',
      '</brief.say>',
      '<briefs.ref base="src/domain.roles/surfer/briefs/practices/">',
      'rule.require.paddle-wide.md',
      '</briefs.ref>',
      '<also>',
      '  <briefs.ref base="src/domain.roles/surfer/briefs/">',
      '  practices/ref.swell-history.md',
      '  </briefs.ref>',
      '</also>',
    ].join('\n');
    const tiers = asBootTiers({ payload, slugRole: 'surfer' });

    when('[t0] each tier is read', () => {
      then('a `.min` say brief reads as its source path', () => {
        expect(
          asBootTier({ tiers, path: 'practices/rule.forbid.wipeout.md' }),
        ).toEqual('say');
      });
      then('a ref line reads under its base', () => {
        expect(
          asBootTier({ tiers, path: 'practices/rule.require.paddle-wide.md' }),
        ).toEqual('ref');
      });
      then('an `<also>` line reads as also, never ref', () => {
        expect(
          asBootTier({ tiers, path: 'practices/ref.swell-history.md' }),
        ).toEqual('also');
      });
      then('an unnamed path reads as absent', () => {
        expect(
          asBootTier({ tiers, path: 'practices/rule.forbid.dropin.md' }),
        ).toEqual('absent');
      });
    });
  });

  slugRoles.forEach((slugRole) => {
    given(`[case:${slugRole}] the ${slugRole} boot a clone receives`, () => {
      const booted = useBeforeAll(async () => {
        const payload = getBootPayload({ slugRole });
        return { payload, tiers: asBootTiers({ payload, slugRole }) };
      });

      when('[t0] each lesson brief this route shipped is looked up', () => {
        then('each boots at its planned tier', () => {
          const plan = PLAN.filter((row) => row.slugRole === slugRole);
          const found = plan.map((row) => ({
            path: row.path,
            tier: asBootTier({ tiers: booted.tiers, path: row.path }),
          }));
          expect(found).toEqual(
            plan.map((row) => ({ path: row.path, tier: row.tier })),
          );
        });

        then('the booted tier of each lesson is snapshotted', () => {
          expect(
            PLAN.filter((row) => row.slugRole === slugRole).map((row) => ({
              path: row.path,
              tier: asBootTier({ tiers: booted.tiers, path: row.path }),
            })),
          ).toMatchSnapshot();
        });
      });

      // a role with no amend or no member owes no step: declare each step only where it has rows,
      // so no step is declared empty and none registers as a skip
      const amends = AMENDS_BOOTED.filter((row) => row.slugRole === slugRole);
      const members = MEMBERS_UNBOOTED.filter(
        (row) => row.slugRole === slugRole,
      );

      if (amends.length > 0)
        when(
          '[t1] each amend this route made to a say brief is looked up',
          () => {
            then('each amended line is in the boot payload', () => {
              amends.forEach((row) => {
                expect(
                  asBootTier({ tiers: booted.tiers, path: row.path }),
                ).toEqual('say');
                expect(booted.payload).toContain(row.line);
              });
            });
          },
        );

      if (members.length > 0)
        when('[t2] the on-demand members are looked up', () => {
          then(
            'each member dir holds members, so the check is not vacuous',
            () => {
              members.forEach((row) => {
                const found = readdirSync(
                  join(__dirname, slugRole, 'briefs', row.dir),
                ).filter((name) => name.startsWith(row.prefix));
                expect(found.length).toBeGreaterThan(0);
              });
            },
          );

          then('no member boots, at any tier', () => {
            const pathsBooted = [
              ...booted.tiers.say,
              ...booted.tiers.ref,
              ...booted.tiers.also,
            ];
            const leaked = pathsBooted.filter((path) =>
              members.some((row) =>
                path.startsWith(`${row.dir}/${row.prefix}`),
              ),
            );
            expect(leaked).toEqual([]);
          });
        });
    });
  });
});
