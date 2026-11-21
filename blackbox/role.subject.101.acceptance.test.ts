import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { given, then, useBeforeAll, useThen, when } from 'test-fns';
import { parse as asYamlObject } from 'yaml';

import { execAsync, genTestDir } from './.test/invokeHook';

/**
 * .what = acceptance tests for the architect and ergonomist `subject.101`, walked through the
 *         built package as a consumer links it
 * .why = a seat outside each role meets its 101 through rhachet's boot; each journey here boots
 *        the linked role at `--subject 101` and snaps what the seat reads
 * .note = the mechanic 101 has its own suite (mechanic.subject.101.acceptance.test.ts), since its
 *         seat also meets the role's hooks
 */

/**
 * .what = the roles whose 101 a seat boots here
 */
const ROLES_WITH_101 = ['architect', 'ergonomist'] as const;

/**
 * .what = run a rhachet command in the linked repo
 */
const runRhachet = (input: {
  dir: string;
  args: string[];
}): { stdout: string; stderr: string; code: number } => {
  const result = spawnSync('npx', ['rhachet', ...input.args], {
    cwd: input.dir,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    code: result.status ?? 1,
  };
};

/**
 * .what = the say and ref paths a boot emits for one role, role-relative, `.min` kept
 * .why = a seat reads paths first; role-relative paths are stable across temp dirs
 */
const asRoleBootPaths = (input: {
  output: string;
  slugRole: string;
}): { say: string[]; ref: string[] } => {
  const prefix = `.agent/repo=ehmpathy/role=${input.slugRole}/`;
  const asTagPaths = (tag: string): string[] =>
    input.output
      .split(`<${tag} path="${prefix}`)
      .slice(1)
      .map((block) => block.split('"')[0]!);
  // a roster block, `<briefs.ref base="…role=x">` with or without an end slash, one path per line
  const asRosterPaths = (): string[] =>
    [
      ...input.output.matchAll(
        new RegExp(
          `<briefs\\.ref base="\\.agent\\/repo=ehmpathy\\/role=${input.slugRole}\\/?([^"]*)">([\\s\\S]*?)<\\/briefs\\.ref>`,
          'g',
        ),
      ),
    ].flatMap((match) =>
      match[2]!
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => `${match[1]!}${line}`),
    );
  return {
    say: asTagPaths('brief.say'),
    ref: [...asTagPaths('brief.ref'), ...asRosterPaths()],
  };
};

/**
 * .what = the comment block directly above a top-level key of a yaml text
 * .why = a yaml parse drops comments; the header that teaches a section lives only in the raw text
 */
const asYamlKeyHeader = (input: { text: string; key: string }): string => {
  const linesAbove = (input.text.split(`\n${input.key}:`)[0] ?? '')
    .split('\n')
    .reverse();
  const countComment = linesAbove.findIndex((line) => !line.startsWith('#'));
  return linesAbove
    .slice(0, countComment === -1 ? linesAbove.length : countComment)
    .reverse()
    .join('\n');
};

describe('role subject.101', () => {
  ROLES_WITH_101.forEach((slugRole, index) => {
    given(
      `[case${index + 1}] a repo with role=${slugRole} linked from the package`,
      () => {
        const repo = useBeforeAll(async () => {
          const dir = await genTestDir({ slug: `${slugRole}-subject-101` });
          await execAsync(`npx rhachet roles link --role ${slugRole}`, {
            cwd: dir,
          });
          return { dir };
        });

        // the 101 rows and header, read from the linked boot.yml a consumer gets
        const rows = useBeforeAll(async () => {
          const text = fs.readFileSync(
            path.join(repo.dir, `.agent/repo=ehmpathy/role=${slugRole}/boot.yml`),
            'utf-8',
          );
          const bootYml = asYamlObject(text);
          return {
            say: bootYml['subject.101'].briefs.say as string[],
            ref: bootYml['subject.101'].briefs.ref as string[],
            header: asYamlKeyHeader({ text, key: 'subject.101' }),
          };
        });

        when('[t0] a seat boots --subject 101', () => {
          const boot = useThen('the boot succeeds', () =>
            runRhachet({
              dir: repo.dir,
              args: [
                'roles',
                'boot',
                '--repo',
                'ehmpathy',
                '--role',
                slugRole,
                '--subject',
                '101',
              ],
            }),
          );

          then('it exits 0', () => {
            expect(boot.code).toEqual(0);
          });

          then('its say blocks are exactly the 101 say rows, no always row', () => {
            // a row may boot as its `.min` cue form; an `always` row here means the opt-out dropped
            const sayPaths = asRoleBootPaths({ output: boot.stdout, slugRole })
              .say.map((sayPath) => sayPath.replace(/\.min$/, ''))
              .sort();
            expect(rows.say.length).toBeGreaterThan(0);
            expect(sayPaths).toEqual([...rows.say].sort());
          });

          then('its ref roster is exactly the 101 ref rows', () => {
            const refPaths = asRoleBootPaths({
              output: boot.stdout,
              slugRole,
            }).ref.sort();
            expect(refPaths).toEqual([...rows.ref].sort());
          });

          then('the paths a seat reads match the snapshot', () => {
            // paths only, no bodies or counts, so a brief edit leaves it intact
            expect(
              asRoleBootPaths({ output: boot.stdout, slugRole }),
            ).toMatchSnapshot();
          });
        });

        when('[t1] a maintainer reads the subject.101 header', () => {
          then('it says the section sheds always, and where its cap lives', () => {
            expect(rows.header).toContain('sheds `always`');
            expect(rows.header).toContain('boot.budget.integration.test.ts');
          });
        });
      },
    );
  });

  given('[case0] a fixed boot output', () => {
    when('[t0] its paths are parsed for one role', () => {
      then('say and ref paths read role-relative, other roles cut', () => {
        const output = [
          '<brief.say path=".agent/repo=ehmpathy/role=architect/briefs/rule.a.md.min">',
          '</brief.say>',
          '<brief.say path=".agent/repo=ehmpathy/role=ergonomist/briefs/rule.x.md">',
          '</brief.say>',
          '<brief.ref path=".agent/repo=ehmpathy/role=architect/briefs/rule.b.md"/>',
          '<briefs.ref base=".agent/repo=ehmpathy/role=architect/">',
          '  briefs/rule.c.md',
          '</briefs.ref>',
        ].join('\n');
        expect(asRoleBootPaths({ output, slugRole: 'architect' })).toEqual({
          say: ['briefs/rule.a.md.min'],
          ref: ['briefs/rule.b.md', 'briefs/rule.c.md'],
        });
      });
    });
  });
});
