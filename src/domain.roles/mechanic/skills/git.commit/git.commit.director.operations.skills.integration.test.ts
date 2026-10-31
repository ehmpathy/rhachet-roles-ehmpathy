import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { given, then, useThen, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';
import { seedTestSponsor } from '@src/.test/seedTestSponsor';

/**
 * .what = every real quota refusal, run in a tree a director governs
 * .why = the render's own test hand-copies each call site; this runs the real
 *        skills, so a call site that passes the wrong refusal kind, meter,
 *        or indent shows up here. each scene runs in all three director
 *        states: as-is (the real detector reads no marker and answers `none`),
 *        and in a copy of the skills tree whose detector answers `charter` or
 *        `unreadable`. no production seam is added for the test
 */

const SKILLS_DIR = path.join(__dirname, '..');
const TREE = 'reef.beav.fix-kelp';

type DirectorState = 'none' | 'charter' | 'unreadable';

// one copy of the skills tree per overridden director state, shared by every
// scene in that state; removed once the suite ends
const SKILLS_COPIES_DIR = fs.mkdtempSync(
  path.join(os.tmpdir(), 'director-skills-copies-'),
);
afterAll(() => fs.rmSync(SKILLS_COPIES_DIR, { recursive: true, force: true }));

/**
 * .what = the skills tree whose director detector answers `director`
 * .why = the real detector reads no marker, so no tree is detected; a
 *        test-side override in a copy reaches the charter and unreadable paths
 *        through each skill's own call site
 */
const getSkillsUnderDirector = (input: { director: DirectorState }): string => {
  // no director: the real tree, whose detector answers `none`
  if (input.director === 'none') return SKILLS_DIR;

  // an override: findsert one copy for this state
  const skillsDir = path.join(SKILLS_COPIES_DIR, input.director);
  if (fs.existsSync(skillsDir)) return skillsDir;
  fs.cpSync(SKILLS_DIR, skillsDir, {
    recursive: true,
    filter: (src) => !src.includes('__snapshots__'),
  });
  fs.appendFileSync(
    path.join(skillsDir, 'git.commit', 'git.commit.director.operations.sh'),
    `\n# test override: the director state of every tree\nget_one_tree_director_state() { echo "${input.director}"; }\n`,
  );
  return skillsDir;
};

/**
 * .what = a git tree named like a crew worktree, on a feature branch, with a
 *         quota meter (or none, or a damaged one), an org state, and an
 *         isolated HOME
 * .why = each refusal reads the meter; the tree name is the `--tree` slug
 */
type BlockAbove = 'none' | 'org' | 'global';

const genScene = (input: {
  meter: Record<string, unknown> | string | null;
  above: BlockAbove;
  director: DirectorState;
}): {
  rootDir: string;
  repoDir: string;
  homeDir: string;
  skillsDir: string;
} => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'director-skills-'));
  const repoDir = path.join(rootDir, TREE);
  const homeDir = path.join(rootDir, 'home');
  fs.mkdirSync(repoDir);
  fs.mkdirSync(homeDir);

  // the tree: one commit on main, then a feature branch
  spawnSync('git', ['init', '-b', 'main'], { cwd: repoDir });
  configureTestGitUser({ cwd: repoDir });
  fs.writeFileSync(path.join(repoDir, 'README.md'), '# reef\n');
  fs.writeFileSync(path.join(repoDir, '.gitignore'), '.meter/\n.agent/\n');
  spawnSync('git', ['add', '-A'], { cwd: repoDir });
  spawnSync('git', ['commit', '-m', 'init: reef'], { cwd: repoDir });
  spawnSync('git', ['checkout', '-b', 'fix/kelp'], { cwd: repoDir });
  seedTestSponsor({ cwd: repoDir });

  // the blocks above the tree: none reaches the quota guard; an org or a
  // global block stops above it
  fs.mkdirSync(path.join(repoDir, '.agent'), { recursive: true });
  fs.writeFileSync(
    path.join(repoDir, '.agent', 'keyrack.yml'),
    'org: ehmpathy\n',
  );
  const globalMeterDir = path.join(
    homeDir,
    '.rhachet/storage/repo=ehmpathy/role=mechanic/.meter',
  );
  fs.mkdirSync(globalMeterDir, { recursive: true });
  fs.writeFileSync(
    path.join(globalMeterDir, 'git.commit.uses.org.jsonc'),
    JSON.stringify({
      orgs: { ehmpathy: input.above === 'org' ? 'blocked' : 'allowed' },
    }),
  );
  // a global block, where `git.commit.uses --global block` writes it (read by
  // set, push, stage) and where git.release reads it today
  // .note = the two paths differ on main; the release read path rides the
  //         dream v2026_10_30.fix.release-reads-the-global-block-the-verb-writes
  if (input.above === 'global') {
    fs.writeFileSync(
      path.join(globalMeterDir, 'git.commit.uses.jsonc'),
      JSON.stringify({ blocked: true }),
    );
    fs.writeFileSync(
      path.join(globalMeterDir, 'git.commit.uses.global.jsonc'),
      JSON.stringify({ blocked: true }),
    );
  }

  // the quota meter: absent, damaged (raw text), or a json state
  if (input.meter !== null) {
    fs.mkdirSync(path.join(repoDir, '.meter'), { recursive: true });
    fs.writeFileSync(
      path.join(repoDir, '.meter', 'git.commit.uses.jsonc'),
      typeof input.meter === 'string'
        ? input.meter
        : JSON.stringify(input.meter),
    );
  }

  return {
    rootDir,
    repoDir,
    homeDir,
    skillsDir: getSkillsUnderDirector({ director: input.director }),
  };
};

/**
 * .what = run one skill of the copied tree in the scene, then clean the scene
 */
const runSkill = (input: {
  scene: ReturnType<typeof genScene>;
  skill: string;
  args: string[];
  stdin?: string;
}): { stdout: string; stderr: string; exitCode: number } => {
  const result = spawnSkill(input);
  fs.rmSync(input.scene.rootDir, { recursive: true, force: true });
  return result;
};

/**
 * .what = run one skill of the copied tree in the scene, and keep the scene
 * .why = a journey runs a skill, changes the scene, then runs it again
 */
const spawnSkill = (input: {
  scene: ReturnType<typeof genScene>;
  skill: string;
  args: string[];
  stdin?: string;
}): { stdout: string; stderr: string; exitCode: number } => {
  const result = spawnSync(
    'bash',
    [path.join(input.scene.skillsDir, input.skill), ...input.args],
    {
      cwd: input.scene.repoDir,
      encoding: 'utf-8',
      input: input.stdin,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        HOME: input.scene.homeDir,
        EHMPATHY_SEATURTLE_GITHUB_TOKEN: 'fake-token',
      },
    },
  );
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 1,
  };
};

const asGrantLine = (input: { flags: string }) =>
  `$ rhx git.crew.grant --tree ${TREE} --quota <n> ${input.flags} --why '<why>'`;

const MESSAGE = 'fix(kelp): add kelp\n\n- add kelp';

// every real quota refusal: the skill, how it is run, and what its director
// line must say. `exitCode` is the skill's own, unchanged by this render
const SCENES = [
  {
    scene: 'git.commit.set, no uses left, a commit-only tree',
    meter: { uses: 0, push: 'block' },
    skill: 'git.commit/git.commit.set.sh',
    args: ['-m', '@stdin', '--mode', 'apply'],
    stdin: MESSAGE,
    staged: true,
    exitCode: 2,
    ask: 'grant more',
    flags: '--push block',
  },
  {
    scene: 'git.commit.set --push, no uses left, a commit-only tree',
    meter: { uses: 0, push: 'block' },
    skill: 'git.commit/git.commit.set.sh',
    args: ['-m', '@stdin', '--mode', 'apply', '--push'],
    stdin: MESSAGE,
    staged: true,
    exitCode: 2,
    ask: 'grant more',
    flags: '--push allow',
  },
  {
    scene: 'git.commit.set, no quota set',
    meter: null,
    skill: 'git.commit/git.commit.set.sh',
    args: ['-m', '@stdin', '--mode', 'apply'],
    stdin: MESSAGE,
    staged: true,
    exitCode: 2,
    ask: 'grant a quota',
    flags: '--push <allow|block>',
  },
  {
    scene: 'git.commit.set --push, push not allowed',
    meter: { uses: 3, push: 'block' },
    skill: 'git.commit/git.commit.set.sh',
    args: ['-m', '@stdin', '--mode', 'apply', '--push'],
    stdin: MESSAGE,
    staged: true,
    exitCode: 2,
    ask: 'grant push',
    flags: '--push allow',
  },
  {
    scene: 'git.commit.push, push not allowed',
    meter: { uses: 3, push: 'block' },
    skill: 'git.commit/git.commit.push.sh',
    args: ['--mode', 'plan'],
    stdin: undefined,
    staged: false,
    exitCode: 2,
    ask: 'grant push',
    flags: '--push allow',
  },
  {
    scene: 'git.branch.rebase begin, no quota set',
    meter: null,
    skill: 'git.branch.rebase/git.branch.rebase.begin.sh',
    args: ['--mode', 'apply'],
    stdin: undefined,
    staged: false,
    exitCode: 1,
    ask: 'grant a quota',
    flags: '--push allow',
  },
  {
    scene: 'git.branch.rebase begin, push not allowed',
    meter: { uses: 3, push: 'block' },
    skill: 'git.branch.rebase/git.branch.rebase.begin.sh',
    args: ['--mode', 'apply'],
    stdin: undefined,
    staged: false,
    exitCode: 1,
    ask: 'grant push',
    flags: '--push allow',
  },
  {
    // C14: rebase checks push before uses, so this state refuses on push
    scene: 'git.branch.rebase begin, no uses left and push not allowed',
    meter: { uses: 0, push: 'block' },
    skill: 'git.branch.rebase/git.branch.rebase.begin.sh',
    args: ['--mode', 'apply'],
    stdin: undefined,
    staged: false,
    exitCode: 1,
    ask: 'grant push',
    flags: '--push allow',
  },
  {
    scene: 'git.branch.rebase begin, no uses left',
    meter: { uses: 0, push: 'allow' },
    skill: 'git.branch.rebase/git.branch.rebase.begin.sh',
    args: ['--mode', 'apply'],
    stdin: undefined,
    staged: false,
    exitCode: 1,
    ask: 'grant more',
    flags: '--push allow',
  },
  {
    scene: 'git.release --mode apply, no quota set',
    meter: null,
    skill: 'git.release/git.release.sh',
    args: ['--mode', 'apply'],
    stdin: undefined,
    staged: false,
    exitCode: 2,
    ask: 'grant a quota',
    flags: '--push <allow|block>',
  },
  {
    scene: 'git.release --mode apply, no uses left, a commit-only tree',
    meter: { uses: 0, push: 'block' },
    skill: 'git.release/git.release.sh',
    args: ['--mode', 'apply'],
    stdin: undefined,
    staged: false,
    exitCode: 2,
    ask: 'grant more',
    flags: '--push block',
  },
  {
    scene: 'git.stage.add, no quota set',
    meter: null,
    skill: 'git.stage/git.stage.add.sh',
    args: ['kelp.txt'],
    stdin: undefined,
    staged: false,
    exitCode: 2,
    ask: 'grant stage',
    flags: '--push <allow|block> --stage allow',
  },
  {
    scene: 'git.stage.add, stage not allowed, a commit-only tree',
    meter: { uses: 3, push: 'block', stage: 'block' },
    skill: 'git.stage/git.stage.add.sh',
    args: ['kelp.txt'],
    stdin: undefined,
    staged: false,
    exitCode: 2,
    ask: 'grant stage',
    flags: '--push block --stage allow',
  },
  {
    // C3 on push: no quota file meets the push refusal (push spends no use)
    scene:
      'git.commit.push, no quota set, which push meets as its push refusal (push spends no use)',
    meter: null,
    skill: 'git.commit/git.commit.push.sh',
    args: ['--mode', 'plan'],
    stdin: undefined,
    staged: false,
    exitCode: 2,
    ask: 'grant push',
    flags: '--push allow',
  },
  {
    // a grant never revokes a permission the meter holds: stage stays allowed
    scene: 'git.branch.rebase begin, no uses left, stage already granted',
    meter: { uses: 0, push: 'allow', stage: 'allow' },
    skill: 'git.branch.rebase/git.branch.rebase.begin.sh',
    args: ['--mode', 'apply'],
    stdin: undefined,
    staged: false,
    exitCode: 1,
    ask: 'grant more',
    flags: '--push allow --stage allow',
  },
  {
    // C9 note: the quota-absent refusal carries no mode test, so plan meets it
    scene: 'git.commit.set in plan mode, no quota set',
    meter: null,
    skill: 'git.commit/git.commit.set.sh',
    args: ['-m', '@stdin'],
    stdin: MESSAGE,
    staged: true,
    exitCode: 2,
    ask: 'grant a quota',
    flags: '--push <allow|block>',
  },
  {
    // the push refusal carries no mode test either, so rebase plan meets it
    scene: 'git.branch.rebase begin in plan mode, push not allowed',
    meter: { uses: 3, push: 'block' },
    skill: 'git.branch.rebase/git.branch.rebase.begin.sh',
    args: [],
    stdin: undefined,
    staged: false,
    exitCode: 1,
    ask: 'grant push',
    flags: '--push allow',
  },
];

// refusals a director grant cannot lift: each keeps its extant fix even
// where a director governs the tree (C7 a damaged quota file, C8 a block
// above the tree)
const GUARDS = [
  {
    scene: 'C8, git.commit.set, the org blocks commits above the tree',
    meter: { uses: 0, push: 'block' },
    above: 'org' as const,
    skill: 'git.commit/git.commit.set.sh',
    args: ['-m', '@stdin', '--mode', 'apply'],
    stdin: MESSAGE,
    refusal: 'commits blocked for org ehmpathy',
  },
  {
    scene: 'C8, git.release --mode apply, commits blocked globally',
    meter: { uses: 0, push: 'block' },
    above: 'global' as const,
    skill: 'git.release/git.release.sh',
    args: ['--mode', 'apply'],
    stdin: undefined,
    refusal: 'blocked: commits blocked globally',
  },
  {
    scene: 'C8, git.commit.set, commits blocked globally',
    meter: { uses: 0, push: 'block' },
    above: 'global' as const,
    skill: 'git.commit/git.commit.set.sh',
    args: ['-m', '@stdin', '--mode', 'apply'],
    stdin: MESSAGE,
    refusal: 'commits blocked globally',
  },
  {
    scene: 'C8, git.commit.push, the org blocks commits above the tree',
    meter: { uses: 3, push: 'block' },
    above: 'org' as const,
    skill: 'git.commit/git.commit.push.sh',
    args: ['--mode', 'plan'],
    stdin: undefined,
    refusal: 'commits blocked for org ehmpathy',
  },
  {
    scene: 'C8, git.commit.push, commits blocked globally',
    meter: { uses: 3, push: 'block' },
    above: 'global' as const,
    skill: 'git.commit/git.commit.push.sh',
    args: ['--mode', 'plan'],
    stdin: undefined,
    refusal: 'commits blocked globally',
  },
  {
    // git.stage.add checks only the global block; it reads no org state
    scene: 'C8, git.stage.add, all mechanic operations blocked globally',
    meter: { uses: 3, push: 'block', stage: 'block' },
    above: 'global' as const,
    skill: 'git.stage/git.stage.add.sh',
    args: ['kelp.txt'],
    stdin: undefined,
    refusal: 'globally blocked',
  },
  {
    scene: 'C7, git.commit.set, a damaged quota file',
    meter: '{ uses: 3, push',
    above: 'none' as const,
    skill: 'git.commit/git.commit.set.sh',
    args: ['-m', '@stdin', '--mode', 'apply'],
    stdin: MESSAGE,
    refusal: 'MalfunctionError: commit quota file corrupt',
  },
  {
    scene: 'C7, git.commit.push, a damaged quota file',
    meter: '{ uses: 3, push',
    above: 'none' as const,
    skill: 'git.commit/git.commit.push.sh',
    args: ['--mode', 'plan'],
    stdin: undefined,
    refusal: 'MalfunctionError: commit quota file corrupt',
  },
];

/**
 * .what = run one scene's skill in one director state, with the work staged
 *         where the scene needs it
 */
const runScene = (input: {
  scene: {
    meter: Record<string, unknown> | string | null;
    skill: string;
    args: string[];
    stdin: string | undefined;
  };
  above: BlockAbove;
  staged: boolean;
  director: DirectorState;
}): ReturnType<typeof runSkill> => {
  const scene = genScene({
    meter: input.scene.meter,
    above: input.above,
    director: input.director,
  });
  fs.writeFileSync(path.join(scene.repoDir, 'kelp.txt'), 'kelp\n');
  if (input.staged)
    spawnSync('git', ['add', 'kelp.txt'], { cwd: scene.repoDir });
  return runSkill({
    scene,
    skill: input.scene.skill,
    args: input.scene.args,
    stdin: input.scene.stdin,
  });
};

describe('git.commit.director.operations.sh, through every real quota refusal', () => {
  SCENES.forEach((thisScene, index) =>
    given(`[case1.${index}] ${thisScene.scene}, with no director`, () => {
      when('[t0] the skill refuses', () => {
        const result = useThen('it refuses', () =>
          runScene({
            scene: thisScene,
            above: 'none',
            staged: thisScene.staged,
            director: 'none',
          }),
        );

        then('it exits as the skill always has', () => {
          expect(result.exitCode).toBe(thisScene.exitCode);
        });

        then('it names no director', () => {
          expect(result.stdout).not.toContain('director');
          expect(result.stderr).not.toContain('director');
        });

        then('its bytes match the snapshot', () => {
          expect(result.stdout).toMatchSnapshot();
        });

        then('its stderr matches the snapshot, as each surface emits', () => {
          expect(result.stderr).toMatchSnapshot();
        });
      });
    }),
  );

  SCENES.forEach((thisScene, index) =>
    given(`[case2.${index}] ${thisScene.scene}, under a director`, () => {
      when('[t0] the skill refuses', () => {
        const result = useThen('it refuses', () =>
          runScene({
            scene: thisScene,
            above: 'none',
            staged: thisScene.staged,
            director: 'charter',
          }),
        );

        then('it exits as the skill always has', () => {
          expect(result.exitCode).toBe(thisScene.exitCode);
        });

        then('it tells the driver to ask its director, never a human', () => {
          expect(result.stdout).toContain(
            `a director governs this tree; ask your director to ${thisScene.ask}. the director runs:`,
          );
          expect(result.stdout).not.toContain('ask your human');
        });

        then(
          'it names the grant that lifts this refusal and widens no other',
          () => {
            expect(result.stdout).toContain(
              asGrantLine({ flags: thisScene.flags }),
            );
          },
        );

        then('its whole frame matches the snapshot', () => {
          expect(result.stdout).toMatchSnapshot();
        });

        then('its stderr matches the snapshot, as each surface emits', () => {
          expect(result.stderr).toMatchSnapshot();
        });
      });
    }),
  );

  SCENES.forEach((thisScene, index) =>
    given(
      `[case3.${index}] ${thisScene.scene}, director state unreadable`,
      () => {
        when('[t0] the skill refuses', () => {
          const result = useThen('it refuses', () =>
            runScene({
              scene: thisScene,
              above: 'none',
              staged: thisScene.staged,
              director: 'unreadable',
            }),
          );

          then('it exits as the skill always has', () => {
            expect(result.exitCode).toBe(thisScene.exitCode);
          });

          then('it names both granters, the director first', () => {
            expect(result.stdout).toContain(
              'whether a director governs this tree cannot be read; ask your director, else your human.',
            );
            expect(result.stdout).toContain(
              asGrantLine({ flags: thisScene.flags }),
            );
            expect(result.stdout).toContain('ask your human');
          });

          then('its whole frame matches the snapshot', () => {
            expect(result.stdout).toMatchSnapshot();
          });

          then('its stderr matches the snapshot, as each surface emits', () => {
            expect(result.stderr).toMatchSnapshot();
          });
        });
      },
    ),
  );

  GUARDS.forEach((thisGuard, index) =>
    given(`[case4.${index}] ${thisGuard.scene}, under a director`, () => {
      when('[t0] the skill refuses', () => {
        const result = useThen('it refuses', () =>
          runScene({
            scene: thisGuard,
            above: thisGuard.above,
            staged: thisGuard.stdin !== undefined,
            director: 'charter',
          }),
        );

        then('it refuses with its own guard, not a quota refusal', () => {
          expect(result.exitCode).not.toBe(0);
          expect(result.stdout).toContain(thisGuard.refusal);
        });

        then('it keeps its extant fix and names no director', () => {
          expect(result.stdout).not.toContain('director');
          expect(result.stdout).not.toContain('git.crew.grant');
        });

        then('its bytes match the snapshot', () => {
          expect(result.stdout).toMatchSnapshot();
        });

        then('its stderr matches the snapshot, as each surface emits', () => {
          expect(result.stderr).toMatchSnapshot();
        });
      });
    }),
  );

  given(
    '[case5] git.commit.push --output json, push not allowed, under a director',
    () => {
      when('[t0] the skill refuses', () => {
        const result = useThen('it refuses', () =>
          runSkill({
            scene: genScene({
              meter: { uses: 3, push: 'block' },
              above: 'none',
              director: 'charter',
            }),
            skill: 'git.commit/git.commit.push.sh',
            args: ['--mode', 'plan', '--output', 'json'],
          }),
        );

        then('the json carries the director fix in its fix field', () => {
          expect(result.exitCode).toBe(2);
          const parsed = JSON.parse(result.stdout.trim());
          expect(parsed.status).toBe('error');
          expect(parsed.error).toBe('push not allowed');
          expect(parsed.fix).toContain('ask your director to grant push');
          expect(parsed.fix).toContain(asGrantLine({ flags: '--push allow' }));
          expect(parsed.fix).not.toContain('ask your human');
        });

        then('its whole json object matches the snapshot', () => {
          expect(result.stdout).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case6] git.commit.push --output json, push not allowed, director state unreadable',
    () => {
      when('[t0] the skill refuses', () => {
        const result = useThen('it refuses', () =>
          runSkill({
            scene: genScene({
              meter: { uses: 3, push: 'block' },
              above: 'none',
              director: 'unreadable',
            }),
            skill: 'git.commit/git.commit.push.sh',
            args: ['--mode', 'plan', '--output', 'json'],
          }),
        );

        then('the json fix names both granters, the director first', () => {
          expect(result.exitCode).toBe(2);
          const parsed = JSON.parse(result.stdout.trim());
          expect(parsed.status).toBe('error');
          expect(parsed.error).toBe('push not allowed');
          expect(parsed.fix).toContain('cannot be read');
          expect(parsed.fix).toContain(asGrantLine({ flags: '--push allow' }));
          expect(parsed.fix).toContain('ask your human');
        });

        then('its whole json object matches the snapshot', () => {
          expect(result.stdout).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case7] git.commit.push --output json, no quota set, which push meets as its push refusal (push spends no use), under a director',
    () => {
      when('[t0] the skill refuses', () => {
        const result = useThen('it refuses', () =>
          runSkill({
            scene: genScene({
              meter: null,
              above: 'none',
              director: 'charter',
            }),
            skill: 'git.commit/git.commit.push.sh',
            args: ['--mode', 'plan', '--output', 'json'],
          }),
        );

        then('the json carries the director fix in its fix field', () => {
          expect(result.exitCode).toBe(2);
          const parsed = JSON.parse(result.stdout.trim());
          expect(parsed.status).toBe('error');
          expect(parsed.fix).toContain('ask your director to grant push');
          expect(parsed.fix).toContain(asGrantLine({ flags: '--push allow' }));
          expect(parsed.fix).not.toContain('ask your human');
        });

        then('its whole json object matches the snapshot', () => {
          expect(result.stdout).toMatchSnapshot();
        });
      });
    },
  );

  given(
    '[case8] git.commit.push --output json, no quota set, which push meets as its push refusal (push spends no use), director state unreadable',
    () => {
      when('[t0] the skill refuses', () => {
        const result = useThen('it refuses', () =>
          runSkill({
            scene: genScene({
              meter: null,
              above: 'none',
              director: 'unreadable',
            }),
            skill: 'git.commit/git.commit.push.sh',
            args: ['--mode', 'plan', '--output', 'json'],
          }),
        );

        then('the json fix names both granters, the director first', () => {
          expect(result.exitCode).toBe(2);
          const parsed = JSON.parse(result.stdout.trim());
          expect(parsed.status).toBe('error');
          expect(parsed.fix).toContain('cannot be read');
          expect(parsed.fix).toContain(asGrantLine({ flags: '--push allow' }));
          expect(parsed.fix).toContain('ask your human');
        });

        then('its whole json object matches the snapshot', () => {
          expect(result.stdout).toMatchSnapshot();
        });
      });
    },
  );

  [
    {
      journey:
        'C14, rebase with no uses left and push not allowed, under a director',
      meter: { uses: 0, push: 'block' },
      args: [] as string[],
    },
    {
      journey:
        'C1, rebase with no uses left (the incident shape), under a director',
      meter: { uses: 0, push: 'allow' },
      args: ['--mode', 'apply'],
    },
  ].forEach((thisJourney, index) =>
    given(`[case9.${index}] ${thisJourney.journey}`, () => {
      // the journey: the refusal names one grant; the director runs it, which
      // sets the meter as `git.commit.uses set --quant <n> --push allow` does;
      // the driver re-runs the same command
      const journey = useThen('the driver refuses, is granted, re-runs', () => {
        const scene = genScene({
          meter: thisJourney.meter,
          above: 'none',
          director: 'charter',
        });
        const refused = spawnSkill({
          scene,
          skill: 'git.branch.rebase/git.branch.rebase.begin.sh',
          args: thisJourney.args,
        });
        fs.writeFileSync(
          path.join(scene.repoDir, '.meter', 'git.commit.uses.jsonc'),
          JSON.stringify({ uses: 3, push: 'allow' }),
        );
        const rerun = runSkill({
          scene,
          skill: 'git.branch.rebase/git.branch.rebase.begin.sh',
          args: thisJourney.args,
        });
        return { refused, rerun };
      });

      when('[t0] the driver meets the refusal', () => {
        then('it names one grant, with the push the rebase needs', () => {
          expect(journey.refused.exitCode).toBe(1);
          expect(journey.refused.stdout).toContain(
            asGrantLine({ flags: '--push allow' }),
          );
        });
      });

      when('[t1] the director grants, and the driver re-runs', () => {
        then('neither quota refusal stands: the one grant lifted both', () => {
          expect(journey.rerun.stdout).not.toContain('push not allowed');
          expect(journey.rerun.stdout).not.toContain('no commit uses left');
          expect(journey.rerun.stdout).not.toContain('git.crew.grant');
        });
        then('the rebase moves on to the git work past the guards', () => {
          expect(journey.rerun.stdout).toContain(
            'no main or master branch found on origin',
          );
        });
      });
    }),
  );
});
