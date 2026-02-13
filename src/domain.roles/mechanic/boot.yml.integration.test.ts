import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { genTempDir } from 'test-fns';

/**
 * .what = integration tests for the mechanic boot.yml
 * .why = validates that rhachet roles boot reads boot.yml and filters by subject
 */

const roleDirRel = '.agent/repo=ehmpathy/role=mechanic';
const roleDir = resolve(__dirname, '../../..', roleDirRel);

const execBoot = (input: { args: string; cwd?: string }): string =>
  execSync(
    `npx rhachet roles boot --repo ehmpathy --role mechanic ${input.args}`,
    { encoding: 'utf-8', timeout: 30_000, cwd: input.cwd },
  );

/**
 * .what = extract the token count from boot output stats block
 * .why = enables token comparison assertions
 */
const parseStats = (
  output: string,
): {
  briefs: { say: number; ref: number };
  total: number;
  tokens: number;
} => {
  const sayMatch = output.match(/say = (\d+)/);
  const refMatch = output.match(/ref = (\d+)/);
  const tokensMatch = output.match(/tokens ≈ (\d+)/);
  const say = sayMatch ? Number(sayMatch[1]) : 0;
  const ref = refMatch ? Number(refMatch[1]) : 0;
  const tokens = tokensMatch ? Number(tokensMatch[1]) : 0;
  return { briefs: { say, ref }, total: say + ref, tokens };
};

describe('boot.yml integration', () => {
  it('should boot with --subject code.test and return always + test briefs', () => {
    const output = execBoot({ args: '--subject code.test' });
    const stats = parseStats(output);

    // always has 12 say + 9 ref = 21 briefs
    // code.test has 10 say + 6 ref = 16 briefs
    // total = 37 briefs
    expect(stats.total).toBeGreaterThanOrEqual(30);
    expect(stats.briefs.say).toBeGreaterThan(0);
    expect(stats.briefs.ref).toBeGreaterThan(0);

    // should contain test-specific briefs
    expect(output).toContain('code.test');

    console.log(
      `  [code.test] ${stats.briefs.say} say + ${stats.briefs.ref} ref = ${stats.total} briefs, ~${stats.tokens} tokens`,
    );
  });

  it('should boot with --subject code.prod and return always + prod briefs', () => {
    const output = execBoot({ args: '--subject code.prod' });
    const stats = parseStats(output);

    // always + code.prod should be significantly more than always alone
    expect(stats.total).toBeGreaterThanOrEqual(60);
    expect(stats.briefs.say).toBeGreaterThan(0);
    expect(stats.briefs.ref).toBeGreaterThan(0);

    // should contain prod-specific briefs
    expect(output).toContain('code.prod');

    console.log(
      `  [code.prod] ${stats.briefs.say} say + ${stats.briefs.ref} ref = ${stats.total} briefs, ~${stats.tokens} tokens`,
    );
  });

  it('should emit say briefs with full content', () => {
    const output = execBoot({ args: '--subject code.test' });

    // say briefs should appear as <brief.say> tags with content
    expect(output).toMatch(/<brief\.say\b/);
  });

  it('should emit ref briefs as path-only links', () => {
    const output = execBoot({ args: '--subject code.test' });

    // ref briefs should appear as <brief.ref> tags (path only, no content)
    expect(output).toMatch(/<brief\.ref\b/);
  });

  it('should fail fast on unrecognized --subject', () => {
    expect(() => execBoot({ args: '--subject nonexistent' })).toThrow();
  });

  it('should use fewer tokens with boot.yml than without', () => {
    // set up a temp dir that mirrors the role dir structure
    const tempDir = genTempDir({
      slug: 'boot-yml-token-compare',
      symlink: [
        { at: 'node_modules', to: 'node_modules' },
        {
          at: '.agent/repo=ehmpathy/role=mechanic/briefs',
          to: `${roleDirRel}/briefs`,
        },
        {
          at: '.agent/repo=ehmpathy/role=mechanic/skills',
          to: `${roleDirRel}/skills`,
        },
        {
          at: '.agent/repo=ehmpathy/role=mechanic/readme.md',
          to: `${roleDirRel}/readme.md`,
        },
      ],
    });

    // sanity: the temp dir should NOT have a boot.yml
    expect(
      existsSync(
        resolve(tempDir, '.agent/repo=ehmpathy/role=mechanic/boot.yml'),
      ),
    ).toBe(false);

    // boot WITHOUT boot.yml -> all briefs as say
    const withoutBootYml = execBoot({ args: '', cwd: tempDir });
    const statsWithout = parseStats(withoutBootYml);

    // now add boot.yml and boot WITH it
    execSync(
      [
        'ln -s',
        `${roleDir}/boot.yml`,
        `${resolve(tempDir, '.agent/repo=ehmpathy/role=mechanic/boot.yml')}`,
      ].join(' '),
    );

    // boot WITH boot.yml -> say/ref split applied
    const withBootYml = execBoot({ args: '', cwd: tempDir });
    const statsWith = parseStats(withBootYml);

    const saved = statsWithout.tokens - statsWith.tokens;
    const pct = Math.round((saved / statsWithout.tokens) * 100);

    console.log(
      [
        `  [token compare]`,
        `    without boot.yml: ${statsWithout.briefs.say} say + ${statsWithout.briefs.ref} ref = ${statsWithout.total} briefs, ~${statsWithout.tokens} tokens`,
        `    with    boot.yml: ${statsWith.briefs.say} say + ${statsWith.briefs.ref} ref = ${statsWith.total} briefs, ~${statsWith.tokens} tokens`,
        `    saved: ~${saved} tokens (-${pct}%)`,
      ].join('\n'),
    );

    // with boot.yml should use fewer tokens (ref briefs are path-only)
    expect(statsWith.tokens).toBeLessThan(statsWithout.tokens);

    // with boot.yml should have some ref briefs (without has none)
    expect(statsWith.briefs.ref).toBeGreaterThan(0);
    expect(statsWithout.briefs.ref).toBe(0);
  });
});
