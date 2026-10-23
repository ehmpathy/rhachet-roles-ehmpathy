import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { given, then, useBeforeAll, useThen, when } from 'test-fns';
import { parse as asYamlObject } from 'yaml';

import { genTestDir, invokeHook } from './.test/invokeHook';

/**
 * .what = acceptance tests for mechanic `subject.101`, walked through the built package as a
 *         consumer links it
 * .why = a director seat meets 101 through rhachet's boot and cost, and through the role's hooks;
 *        each journey here runs that same path, end to end, and snaps what the seat reads
 */

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
 * .what = the say paths a mechanic boot emits, role-relative, in emit order
 * .why = a seat reads paths first; role-relative paths are stable across temp dirs
 */
const asMechanicSayPaths = (input: { output: string }): string[] =>
  [
    ...input.output.matchAll(
      /<brief\.say path="\.agent\/repo=ehmpathy\/role=mechanic\/([^"]+)"/g,
    ),
  ].map((match) => match[1]!);

/**
 * .what = the ref paths a mechanic boot emits, role-relative, from ref tags and ref rosters
 * .why = the ref roster is the other half of what a seat reads; a dropped row must show as a diff
 */
const asMechanicRefPaths = (input: { output: string }): string[] => [
  ...[
    ...input.output.matchAll(
      /<brief\.ref path="\.agent\/repo=ehmpathy\/role=mechanic\/([^"]+)"/g,
    ),
  ].map((match) => match[1]!),
  ...[
    ...input.output.matchAll(
      /<briefs\.ref base="\.agent\/repo=ehmpathy\/role=mechanic\/?([^"]*)">([\s\S]*?)<\/briefs\.ref>/g,
    ),
  ].flatMap((match) =>
    match[2]!
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => `${match[1]!}${line}`),
  ),
];

/**
 * .what = the skill paths a mechanic boot emits, role-relative, from skill tags and skill rosters
 * .why = skills boot beside briefs; a skill that joins or leaves the union must show as a diff
 */
const asMechanicSkillPaths = (input: {
  output: string;
}): { say: string[]; ref: string[] } => ({
  say: [
    ...input.output.matchAll(
      /<skill\.say path="\.agent\/repo=ehmpathy\/role=mechanic\/([^"]+)"/g,
    ),
  ].map((match) => match[1]!),
  ref: [
    ...[
      ...input.output.matchAll(
        /<skill\.ref path="\.agent\/repo=ehmpathy\/role=mechanic\/([^"]+)"/g,
      ),
    ].map((match) => match[1]!),
    ...[
      ...input.output.matchAll(
        /<skills\.ref base="\.agent\/repo=ehmpathy\/role=mechanic\/?([^"]*)">([\s\S]*?)<\/skills\.ref>/g,
      ),
    ].flatMap((match) =>
      match[2]!
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => `${match[1]!}${line}`),
    ),
  ],
});

/**
 * .what = boot paths split by the section that declared them, 101 or always
 * .why = 101's slimness is the point; a flat union hides which rows 101 adds
 * .note = a path may emit as its `.min` cue; it is matched to its row without the `.min`
 */
const asPathsBySection = (input: {
  paths: string[];
  rows101: string[];
}): { from101: string[]; fromAlways: string[] } => {
  const isFrom101 = (path: string): boolean =>
    input.rows101.includes(path.replace(/\.min$/, ''));
  return {
    from101: input.paths.filter(isFrom101),
    fromAlways: input.paths.filter((path) => !isFrom101(path)),
  };
};

/**
 * .what = the lines of an error a seat reads: its header and its tip, color codes stripped
 * .why = rhachet appends its debug dump (input json, raw argv) after a blank line and a `{`;
 *        the raw dump snaps as noise, so a hint inside it is read apart (asErrorDumpHint)
 */
const asErrorHeadline = (input: { stderr: string }): string =>
  input.stderr
    .replace(/\u001b\[[0-9;]*m/g, '')
    .split(/\n\s*\n\s*(?=\{|\[args\])/)[0]!
    .trim();

/**
 * .what = the hint from rhachet's error dump, the one json block after the headline
 * .why = the headline cut drops the dump; where the dump names the fix, the seat needs it
 */
const asErrorDumpHint = (input: { stderr: string }): string | null => {
  const dump = input.stderr
    .replace(/\u001b\[[0-9;]*m/g, '')
    .match(/^\{[\s\S]*?^\}/m);
  if (!dump) return null;
  const parsed: { hint?: unknown } = JSON.parse(dump[0]);
  return typeof parsed.hint === 'string' ? parsed.hint : null;
};

/**
 * .what = the comment block directly above a top-level key of a yaml text
 * .why = a yaml parse drops comments; the header that teaches a section lives only in the raw text
 */
const asYamlKeyHeader = (input: { text: string; key: string }): string => {
  // the lines above the key, nearest first
  const linesAbove = (input.text.split(`\n${input.key}:`)[0] ?? '')
    .split('\n')
    .reverse();

  // keep the unbroken run of comment lines that touches the key
  const countComment = linesAbove.findIndex((line) => !line.startsWith('#'));
  return linesAbove
    .slice(0, countComment === -1 ? linesAbove.length : countComment)
    .reverse()
    .join('\n');
};

/**
 * .what = a `roles cost` readout with its counts masked
 * .why = counts move on every brief edit; the shape a maintainer reads must hold
 */
const asCostReadoutMasked = (input: { output: string }): string =>
  input.output
    .replace(/[\d,]+(?= \(full emitted payload)/, '<n>')
    .replace(/\(\d+% used\)/, '(<pct>% used)')
    .replace(/[\d.]+%/g, '<pct>%')
    .replace(/(chrome\s+=\s+)[\d,]+/, '$1<n>')
    .replace(/\b\d[\d,]*\b(?= more\b)/g, '<n>')
    .replace(/^(\s+└─\s+)[\d,]+(\s+)/gm, '$1<n>$2')
    .trimEnd();

describe('mechanic subject.101', () => {
  given('[case1] a repo with role=mechanic linked from the package', () => {
    const repo = useBeforeAll(async () => ({
      dir: await genTestDir({ slug: 'mechanic-subject-101' }),
    }));

    // the 101 rows and header, read from the linked boot.yml a consumer gets
    const rows = useBeforeAll(async () => {
      const text = fs.readFileSync(
        path.join(repo.dir, '.agent/repo=ehmpathy/role=mechanic/boot.yml'),
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
            'mechanic',
            '--subject',
            '101',
          ],
        }),
      );

      then('it exits 0', () => {
        expect(boot.code).toEqual(0);
      });

      then('every 101 say row boots as a say block', () => {
        // a row may boot as its `.min` cue form; either way it must emit
        const sayPaths = asMechanicSayPaths({ output: boot.stdout });
        const sayAbsent = rows.say.filter(
          (row) => !sayPaths.includes(row) && !sayPaths.includes(`${row}.min`),
        );
        expect(rows.say.length).toBeGreaterThan(0);
        expect(sayAbsent).toEqual([]);
      });

      then('the exit-code cue a cure acts on names 2 for a constraint', () => {
        // the cue's body, not just its path, reaches the seat in the union
        expect(boot.stdout).toContain('2 = constraint');
        expect(boot.stdout).toContain('1 = malfunction');
      });

      then('the say paths a seat reads match the snapshot, by section', () => {
        // the union rhachet boots today: always ∪ 101, paths only
        const sayBySection = asPathsBySection({
          paths: asMechanicSayPaths({ output: boot.stdout }),
          rows101: rows.say,
        });
        expect(sayBySection.from101.length).toEqual(rows.say.length);
        expect(sayBySection).toMatchSnapshot();
      });

      then('the ref paths a seat reads match the snapshot, by section', () => {
        // the union ref roster: always's ref ∪ 101's ref
        const refBySection = asPathsBySection({
          paths: asMechanicRefPaths({ output: boot.stdout }),
          rows101: rows.ref,
        });
        expect(refBySection.from101.length).toEqual(rows.ref.length);
        expect(refBySection).toMatchSnapshot();
      });

      then(
        'the skill paths a seat reads match the snapshot, say apart from ref',
        () => {
          // 101 adds no skill; whatever skills the union boots come from always
          expect(
            asMechanicSkillPaths({ output: boot.stdout }),
          ).toMatchSnapshot();
        },
      );
    });

    when('[t1] the maintainer costs --subject 101', () => {
      const cost = useThen('the cost succeeds', () =>
        runRhachet({
          dir: repo.dir,
          args: [
            'roles',
            'cost',
            '--repo',
            'ehmpathy',
            '--role',
            'mechanic',
            '--subject',
            '101',
            '--top',
            '0',
          ],
        }),
      );

      then('it exits 0 and reads the role budget', () => {
        // the union is graded against the role's budget; the 101 cap lives in boot.budget
        expect(cost.code).toEqual(0);
        expect(cost.stdout).toMatch(/budget\s+=\s+[\d,]+ tokens/);
      });

      then('the readout a maintainer reads matches the snapshot', () => {
        expect(asCostReadoutMasked({ output: cost.stdout })).toMatchSnapshot();
      });

      then(
        'the subject.101 header explains the union that readout shows',
        () => {
          // a reader who meets ≈12k here finds the reason above the section
          expect(rows.header).toContain('always ∪ 101');
          expect(rows.header).toContain('SUBJECT_BUDGETS');
        },
      );
    });

    when('[t2] a cure in that seat writes to /tmp', () => {
      const result = useThen('the hook answers', async () =>
        invokeHook({
          hookName: 'pretooluse.forbid-tmp-writes.sh',
          stdin: JSON.stringify({
            tool_name: 'Write',
            tool_input: { file_path: '/tmp/crew.state', content: 'state' },
          }),
          cwd: repo.dir,
        }),
      );

      then('the hook blocks the write with exit 2', () => {
        expect(result.code).toEqual(2);
      });

      then('the block names the safe path, its `>` tip pinned as is', () => {
        // the tip's `>` meets the shell-syntax hook next; the hook text is owned by its own suite
        expect(result.stderr).toContain('.temp/');
        expect(result.stderr.trim()).toMatchSnapshot();
      });

      const resultBash = useThen('the hook answers a shell write', async () =>
        invokeHook({
          hookName: 'pretooluse.forbid-tmp-writes.sh',
          stdin: JSON.stringify({
            tool_name: 'Bash',
            tool_input: { command: 'echo "$state" > /tmp/crew.state' },
          }),
          cwd: repo.dir,
        }),
      );

      then('a shell write to /tmp is blocked too, with exit 2', () => {
        // the case 5 narrative is a shell redirect, not the Write tool
        expect(resultBash.code).toEqual(2);
        expect(resultBash.stderr).toContain('.temp/');
        expect(resultBash.stderr.trim()).toMatchSnapshot();
      });

      const resultSafe = useThen(
        'the hook answers a write to the named safe path',
        async () =>
          invokeHook({
            hookName: 'pretooluse.forbid-tmp-writes.sh',
            stdin: JSON.stringify({
              tool_name: 'Write',
              tool_input: {
                file_path: path.join(repo.dir, '.temp/crew.state'),
                content: 'state',
              },
            }),
            cwd: repo.dir,
          }),
      );

      then('the fix the block names is let through, with exit 0', () => {
        expect(resultSafe.code).toEqual(0);
      });
    });

    when('[t3] the seat mistypes the subject', () => {
      const boot = useThen('the boot answers', () =>
        runRhachet({
          dir: repo.dir,
          args: [
            'roles',
            'boot',
            '--repo',
            'ehmpathy',
            '--role',
            'mechanic',
            '--subject',
            '1o1',
          ],
        }),
      );

      then('the headline and hint rhachet gives match the snapshot', () => {
        // rhachet's surface, pinned so a seat that mistypes its focus never meets a silent change
        expect({
          code: boot.code,
          error: asErrorHeadline({ stderr: boot.stderr }),
          // the fix rhachet names: the subjects a seat may pass, 101 among them
          hint: asErrorDumpHint({ stderr: boot.stderr }),
          // no 101 cure boots under a mistyped focus
          sayFrom101: asPathsBySection({
            paths: asMechanicSayPaths({ output: boot.stdout }),
            rows101: rows.say,
          }).from101,
        }).toMatchSnapshot();
      });
    });

    when('[t4] the seat asks for mechanic::101 before rhachet has ::', () => {
      const boot = useThen('the boot answers', () =>
        runRhachet({
          dir: repo.dir,
          args: [
            'roles',
            'boot',
            '--repo',
            'ehmpathy',
            '--role',
            'mechanic::101',
          ],
        }),
      );

      then('it fails loud with exit 2, never a partial mechanic', () => {
        expect(boot.code).toEqual(2);
        expect(boot.stdout + boot.stderr).toContain('no role "mechanic::101"');
        expect(asMechanicSayPaths({ output: boot.stdout })).toEqual([]);
      });

      then(
        'the error and tip match the snapshot, a tripwire for rhachet :: support',
        () => {
          // the tip names the form that just failed; rhachet's text, pinned so `::` support flips it
          expect(boot.stdout).toEqual('');
          expect(asErrorHeadline({ stderr: boot.stderr })).toMatchSnapshot();
        },
      );
    });
  });

  given('[case0] fixed outputs, parsed and masked', () => {
    when('[t0] a boot output is parsed', () => {
      then('say and ref paths read role-relative', () => {
        const output = [
          '<brief.say path=".agent/repo=ehmpathy/role=mechanic/briefs/rule.a.md.min">',
          '</brief.say>',
          '<brief.say path=".agent/repo=bhrain/role=driver/briefs/rule.x.md">',
          '</brief.say>',
          '<brief.ref path=".agent/repo=ehmpathy/role=mechanic/briefs/rule.b.md"/>',
          '<briefs.ref base=".agent/repo=ehmpathy/role=mechanic/">',
          '  briefs/rule.c.md',
          '</briefs.ref>',
        ].join('\n');
        expect(asMechanicSayPaths({ output })).toEqual([
          'briefs/rule.a.md.min',
        ]);
        expect(asMechanicRefPaths({ output })).toEqual([
          'briefs/rule.b.md',
          'briefs/rule.c.md',
        ]);
      });
    });

    when('[t1] an error with a debug dump is read', () => {
      then('only its header and tip remain, color codes stripped', () => {
        const stderr = [
          '\u001b[31m✋ ConstraintError: no role found',
          '',
          'tip: link it first\u001b[0m',
          '',
          '{',
          '  "input": { "slugRole": "x" }',
          '}',
          '',
          '[args] roles,boot',
        ].join('\n');
        expect(asErrorHeadline({ stderr })).toEqual(
          '✋ ConstraintError: no role found\n\ntip: link it first',
        );
        expect(asErrorDumpHint({ stderr })).toBeNull();
      });

      then('a dump hint is read apart, when the dump holds one', () => {
        const stderr = [
          '✋ ConstraintError: subject not found: 1o1',
          '',
          '{',
          '  "hint": "pass --subject with one of: 101, arch"',
          '}',
        ].join('\n');
        expect(asErrorDumpHint({ stderr })).toEqual(
          'pass --subject with one of: 101, arch',
        );
      });

      then('a yaml key header is the comment run that touches the key', () => {
        const text = ['a: 1', '', '# far', '', '# near', '# nearer', 'b:'].join(
          '\n',
        );
        expect(asYamlKeyHeader({ text, key: 'b' })).toEqual(
          '# near\n# nearer',
        );
      });
    });

    when('[t2] a cost readout is masked', () => {
      then('each volatile count is masked; budget and batches kept', () => {
        const output = [
          '   ├─ tokens  = 12,421 (full emitted payload, o200k_base)',
          '   ├─ chrome  = 310',
          '   ├─ budget  = 30,000 tokens (41% used)',
          '   ├─ batches = 43 say · 2 ref',
          '   └─ where the tokens go',
          '      └─ 12,165  97.9%  … 45 more',
          '',
        ].join('\n');
        expect(asCostReadoutMasked({ output })).toEqual(
          [
            '   ├─ tokens  = <n> (full emitted payload, o200k_base)',
            '   ├─ chrome  = <n>',
            '   ├─ budget  = 30,000 tokens (<pct>% used)',
            '   ├─ batches = 43 say · 2 ref',
            '   └─ where the tokens go',
            '      └─ <n>  <pct>%  … <n> more',
          ].join('\n'),
        );
      });
    });
  });
});
