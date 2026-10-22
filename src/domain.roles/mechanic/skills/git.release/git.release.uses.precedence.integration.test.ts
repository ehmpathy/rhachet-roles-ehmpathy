import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = the release gate composes its three levels with AND
 * .why  = a release ships only when global ∧ org ∧ local all allow it;
 *         every other cell of the product must refuse and spend naught
 *         (1.vision X1-X3). the matrix walks the whole product, so no cell
 *         rests on a sample
 */
describe('git.release._.guard_release_meter.sh', () => {
  const gatePath = path.join(__dirname, 'git.release._.guard_release_meter.sh');

  type GlobalLevel = 'unset' | 'blocked';
  type OrgLevel = 'allowed' | 'blocked' | 'unset';
  type LocalLevel = 'unset' | 0 | 1 | 'infinite';

  const globalLevels: GlobalLevel[] = ['unset', 'blocked'];
  const orgLevels: OrgLevel[] = ['allowed', 'blocked', 'unset'];
  const localLevels: LocalLevel[] = ['unset', 0, 1, 'infinite'];

  /**
   * .what = provision a tree + a home for one cell of the matrix
   */
  const genCell = (input: {
    global: GlobalLevel;
    org: OrgLevel;
    local: LocalLevel;
  }): { repo: string; home: string; localFile: string } => {
    const repo = genTempDir({ slug: 'release-gate-precedence', git: true });
    const home = path.join(repo, '.home');
    const meterDir = path.join(
      home,
      '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
    );
    fs.mkdirSync(meterDir, { recursive: true });

    // the tree names its org
    fs.mkdirSync(path.join(repo, '.agent'), { recursive: true });
    fs.writeFileSync(
      path.join(repo, '.agent', 'keyrack.yml'),
      'org: ehmpathy\n',
    );

    // global level
    if (input.global === 'blocked')
      fs.writeFileSync(
        path.join(meterDir, 'git.release.uses.jsonc'),
        JSON.stringify({ blocked: true }),
      );

    // org level
    if (input.org !== 'unset')
      fs.writeFileSync(
        path.join(meterDir, 'git.release.uses.org.jsonc'),
        JSON.stringify({ orgs: { ehmpathy: input.org } }),
      );

    // local level
    const localFile = path.join(repo, '.meter', 'git.release.uses.jsonc');
    if (input.local !== 'unset') {
      fs.mkdirSync(path.dirname(localFile), { recursive: true });
      fs.writeFileSync(localFile, JSON.stringify({ uses: input.local }));
    }

    return { repo, home, localFile };
  };

  const isShipExpected = (input: {
    global: GlobalLevel;
    org: OrgLevel;
    local: LocalLevel;
  }): boolean =>
    input.global === 'unset' &&
    input.org === 'allowed' &&
    (input.local === 1 || input.local === 'infinite');

  const asLocalUsesAfter = (input: { local: LocalLevel; shipped: boolean }) => {
    if (input.local === 'unset') return null;
    if (input.shipped && input.local === 1) return 0;
    return input.local;
  };

  globalLevels.forEach((global) =>
    orgLevels.forEach((org) =>
      localLevels.forEach((local) => {
        const shipped = isShipExpected({ global, org, local });
        given(`[cell] global=${global} org=${org} local=${local}`, () => {
          when('[t0] the gate runs', () => {
            then(
              shipped
                ? 'exit 0: all three allow, one use spent'
                : 'exit 2: a level refuses, no use spent',
              () => {
                const cell = genCell({ global, org, local });
                const result = spawnSync(
                  'bash',
                  [gatePath, '--mode', 'spend', '--spent-nonce', 'n1'],
                  {
                    cwd: cell.repo,
                    encoding: 'utf-8',
                    stdio: ['pipe', 'pipe', 'pipe'],
                    env: { ...process.env, HOME: cell.home },
                  },
                );

                expect(result.status).toEqual(shipped ? 0 : 2);
                if (!shipped)
                  expect(result.stdout).toContain('✋ ConstraintError');

                const usesAfter = asLocalUsesAfter({ local, shipped });
                if (usesAfter === null)
                  expect(fs.existsSync(cell.localFile)).toBe(false);
                const spentHere = shipped && local === 1;
                if (usesAfter !== null)
                  expect(
                    JSON.parse(fs.readFileSync(cell.localFile, 'utf-8')),
                  ).toEqual(
                    spentHere
                      ? { uses: usesAfter, spent: 'n1' }
                      : { uses: usesAfter },
                  );
              },
            );
          });
        });
      }),
    ),
  );

  /**
   * .what = run the gate in one provisioned cell, with the given args
   */
  const runGate = (input: {
    cell: { repo: string; home: string };
    args: string[];
  }) =>
    spawnSync('bash', [gatePath, ...input.args], {
      cwd: input.cell.repo,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, HOME: input.cell.home },
    });

  given('[case1] a spent stamp, { uses: 0 }, on an allowed tree', () => {
    when('[t0] a caller invokes the gate with --mode refund', () => {
      then('it refuses, exit 1, and the stamp stays at 0', () => {
        // .note = the clamp for r11 i007 blocker.1: a raise entry let a caller mint uses
        const cell = genCell({ global: 'unset', org: 'allowed', local: 0 });
        const runs = [1, 2, 3].map(() =>
          runGate({ cell, args: ['--mode', 'refund'] }),
        );
        runs.forEach((run) => expect(run.status).toEqual(1));
        expect(runs[0]!.stderr).toContain('💥 MalfunctionError');
        expect(JSON.parse(fs.readFileSync(cell.localFile, 'utf-8'))).toEqual({
          uses: 0,
        });
      });
    });
  });

  given('[case2] a one-use stamp on an allowed tree', () => {
    when('[t0] spend runs with no --spent-nonce', () => {
      then('it refuses, exit 1, and spends naught', () => {
        const cell = genCell({ global: 'unset', org: 'allowed', local: 1 });
        const run = runGate({ cell, args: ['--mode', 'spend'] });
        expect(run.status).toEqual(1);
        expect(run.stdout).toContain('needs --spent-nonce');
        expect(JSON.parse(fs.readFileSync(cell.localFile, 'utf-8'))).toEqual({
          uses: 1,
        });
      });
    });
  });
});
