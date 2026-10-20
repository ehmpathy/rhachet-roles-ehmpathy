import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestDir } from './.test/invokeHook';

/**
 * .what = acceptance tests for `rhx grepsafe --path`, run via rhachet against the linked role
 * .why  = a caller reaches grepsafe through rhachet, never by its file path; the
 *         link bound, the `links:` count, and the 🥥 fix must hold on that road
 */

const MARK = 'reef break at dawn';

/**
 * .what = a linked repo whose box/ holds a link out, a link in, and a loop
 * .note = returns an object: useBeforeAll proxies its value
 */
const genLinkedBoxRepo = async (input: {
  slug: string;
}): Promise<{ dir: string }> => {
  const dir = await genTestDir({ slug: input.slug });
  fs.mkdirSync(path.join(dir, 'box', 'sub'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'lagoon'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'box', 'near.md'), `${MARK} near\n`);
  fs.writeFileSync(path.join(dir, 'box', 'sub', 'deep.md'), `${MARK} deep\n`);
  fs.writeFileSync(path.join(dir, 'lagoon', 'far.md'), `${MARK} far\n`);
  fs.symlinkSync('../lagoon', path.join(dir, 'box', 'portal')); // a link out (wish caseA)
  fs.symlinkSync('sub', path.join(dir, 'box', 'alias')); // a link in (wish caseB)
  fs.symlinkSync('.', path.join(dir, 'box', 'loop')); // a loop (wish caseC)
  return { dir };
};

/**
 * .what = run the skill the way a caller does: through rhachet
 */
const runViaRhachet = (input: {
  dir: string;
  args: string[];
}): { stdout: string; stderr: string; code: number | null; signal: string | null } => {
  const result = spawnSync(
    'npx',
    ['rhachet', 'run', '--skill', 'grepsafe', ...input.args],
    {
      cwd: input.dir,
      encoding: 'utf-8', // node api param name
      stdio: ['pipe', 'pipe', 'pipe'],
      // a hang guard, never a speed claim: a followed loop never ends
      timeout: 60_000, // node api param name
    },
  );
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    code: result.status,
    signal: result.signal,
  };
};

/**
 * .what = what the caller sees on one stream, from rhachet's 🪨 banner on, result rows in byte order
 * .why  = npx may print before the banner, color codes vary by terminal, and rg emits
 *         rows in parallel-walk order
 */
const asSkillRender = (input: { stdout: string }): string => {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: strip ansi color codes
  const plain = input.stdout.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
  const bannerAt = plain.indexOf('🪨');
  const render = plain.slice(Math.max(0, bannerAt < 0 ? plain.indexOf('🐢') : bannerAt));
  const isRow = (line: string) => /^ {6}│ {2}\S+:\d+:/.test(line);
  const lines = render.split('\n');
  const rows = lines.filter(isRow).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const rowsLeft = [...rows];
  return lines.map((line) => (isRow(line) ? (rowsLeft.shift() ?? line) : line)).join('\n');
};

/**
 * .what = the rows of a pipeable run, the rhachet banner set aside
 */
const asPipeableRows = (input: { stdout: string }): string[] =>
  input.stdout
    .split('\n')
    .filter((line) => line.length > 0 && !line.startsWith('🪨'));

describe('grepsafe (acceptance)', () => {
  given('[case1] a linked repo whose box/ holds a link out, a link in, and a loop', () => {
    const repo = useBeforeAll(async () =>
      genLinkedBoxRepo({ slug: 'grepsafe-links' }),
    );

    // the plain box search; [t4] compares its own render against this one
    const resBox = useBeforeAll(async () =>
      runViaRhachet({ dir: repo.dir, args: ['--pattern', MARK, '--path', 'box'] }),
    );

    when('[t0] the caller searches box', () => {
      const res = resBox;

      then('the run ends, at exit 0', () => {
        expect(res.signal).toBe(null);
        expect(res.code).toBe(0);
      });

      then('the dir behind the link out is not walked', () => {
        expect(res.stdout).not.toContain('far.md');
        expect(res.stdout).not.toContain('lagoon/');
      });

      then('the dir behind the link in is found once, under its real name', () => {
        expect(res.stdout.match(/box\/sub\/deep\.md:1:/g)?.length).toBe(1);
        expect(res.stdout).not.toContain('box/alias/');
        expect(res.stdout).not.toContain('box/loop/');
      });

      then('the tree counts the links it left shut, and names the fix', () => {
        expect(res.stdout).toContain(
          '├─ links: 3 not followed (1 leads outside the path)',
        );
        expect(res.stdout).toContain(
          `└─ grepsafe.sh --pattern '${MARK}' --path box/portal`,
        );
      });

      then('the render matches snapshot', () => {
        expect(asSkillRender({ stdout: res.stdout })).toMatchSnapshot();
      });
    });

    when('[t1] the caller follows the fix: names the link as --path', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({
          dir: repo.dir,
          args: ['--pattern', MARK, '--path', 'box/portal'],
        }),
      );

      then('the dir behind the link is searched', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain('lagoon/far.md:1:');
        expect(res.stdout).not.toContain('links:');
      });

      // the named link expands to its real dir, so the tree shows lagoon, not box/portal
      then('the path line names the real dir behind the link', () => {
        expect(res.stdout).toContain('├─ path: lagoon\n');
      });

      then('the render matches snapshot', () => {
        expect(asSkillRender({ stdout: res.stdout })).toMatchSnapshot();
      });
    });

    when('[t2] the search finds no line, beside the link out', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({
          dir: repo.dir,
          args: ['--pattern', `${MARK} at noon`, '--path', 'box'],
        }),
      );

      then('the zero still names the shut door', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain('matches: 0');
        expect(res.stdout).toContain(
          '├─ links: 3 not followed (1 leads outside the path)',
        );
      });

      then('the render matches snapshot', () => {
        expect(asSkillRender({ stdout: res.stdout })).toMatchSnapshot();
      });
    });

    when('[t3] the caller pipes the result', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({
          dir: repo.dir,
          args: ['--pattern', MARK, '--path', 'box', '--output', 'pipeable'],
        }),
      );

      // the skill's link note rides stderr; rhachet does not yet relay a
      // skill's stderr on exit 0 (dream: reseed.rhx-drops-skill-stderr-on-success),
      // so this journey pins the stdout contract alone
      then('stdout holds the result rows, and no note', () => {
        expect(res.code).toBe(0);
        expect(asPipeableRows({ stdout: res.stdout }).sort()).toEqual([
          `box/near.md:1:${MARK} near`,
          `box/sub/deep.md:1:${MARK} deep`,
        ]);
      });

      // both streams: the empty stderr shows, in review, that the note does not arrive here
      then('the rows and the stderr match snapshot', () => {
        expect({
          rows: asPipeableRows({ stdout: res.stdout }).sort(),
          stderr: res.stderr,
        }).toMatchSnapshot();
      });
    });

    when('[t4] the caller names the loop itself as --path', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({
          dir: repo.dir,
          args: ['--pattern', MARK, '--path', 'box/loop'],
        }),
      );

      then('the loop resolves to its real dir, and the run ends at exit 0', () => {
        expect(res.signal).toBe(null);
        expect(res.code).toBe(0);
        expect(res.stdout).toContain('├─ path: box\n');
        expect(res.stdout.match(/box\/near\.md:1:/g)?.length).toBe(1);
      });

      // no snap: the render equals [t0]'s, which holds the snap
      then('the render is the plain box search, byte for byte', () => {
        expect(res.stdout).not.toContain('box/loop');
        expect(asSkillRender({ stdout: res.stdout })).toEqual(
          asSkillRender({ stdout: resBox.stdout }),
        );
      });
    });

    when('[t5] the caller names a --path outside the repo', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: repo.dir, args: ['--pattern', MARK, '--path', '..'] }),
      );

      then('the run is refused at exit 2', () => {
        expect(res.signal).toBe(null);
        expect(res.code).toBe(2);
        expect(res.stdout).not.toContain('far.md');
      });

      // an error rides both streams; stderr repeats the render under rhachet's banner
      then('the refusal rides stderr too', () => {
        expect(res.stderr).toContain(
          'error: search path must be within the git repository',
        );
      });

      // both streams, as the caller's terminal shows them: the render prints twice
      then('the refusal matches snapshot, on each stream', () => {
        // the skill prints the real path of the temp repo, so mask that
        const repoReal = fs.realpathSync(repo.dir);
        const asMasked = (text: string): string =>
          text
            .split(repoReal)
            .join('<REPO>')
            .split(path.dirname(repoReal))
            .join('<REPO_PARENT>');
        expect({
          stdout: asMasked(asSkillRender({ stdout: res.stdout })),
          stderr: asMasked(asSkillRender({ stdout: res.stderr })),
        }).toMatchSnapshot();
      });
    });

    when('[t6] the caller names no path at all', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: repo.dir, args: ['--pattern', MARK] }),
      );

      then('the whole repo is searched once, no link is followed, and no count renders', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain(`lagoon/far.md:1:${MARK} far`);
        expect(res.stdout.match(/box\/sub\/deep\.md:1:/g)?.length).toBe(1);
        expect(res.stdout).not.toContain('box/portal/');
        expect(res.stdout).not.toContain('links:');
      });

      then('the render matches snapshot', () => {
        expect(asSkillRender({ stdout: res.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case2] a linked repo whose matched line holds the repo path in its own text', () => {
    // the measured runaway's shape, small: the render once stripped the repo
    // path from the whole output, match text included. the time guard lives at
    // the integration grain ([case44]); this pins the text on the caller's road
    const repo = useBeforeAll(async () => {
      const dir = await genTestDir({ slug: 'grepsafe-dense' });
      const dirReal = fs.realpathSync(dir);
      fs.mkdirSync(path.join(dir, 'log'), { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'log', 'tide.jsonl'),
        `{"m":"${MARK} ${`${dirReal}/log/tide.jsonl `.repeat(4)}"}\n`,
      );
      return { dir, dirReal };
    });

    when('[t0] the caller searches log', () => {
      const res = useBeforeAll(async () =>
        runViaRhachet({ dir: repo.dir, args: ['--pattern', MARK, '--path', 'log'] }),
      );

      then('the row path is repo-relative, and the match text holds every absolute path', () => {
        expect(res.code).toBe(0);
        expect(res.stdout).toContain('│  log/tide.jsonl:1:{"m":');
        expect(res.stdout.split(`${repo.dirReal}/log/tide.jsonl`).length - 1).toBe(4);
      });

      then('the render matches snapshot, repo path masked', () => {
        expect(
          asSkillRender({ stdout: res.stdout }).split(repo.dirReal).join('<REPO>'),
        ).toMatchSnapshot();
      });
    });
  });
});
