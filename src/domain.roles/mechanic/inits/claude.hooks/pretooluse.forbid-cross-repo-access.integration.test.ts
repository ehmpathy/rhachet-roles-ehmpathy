import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

/**
 * .what = integration tests for pretooluse.forbid-cross-repo-access.sh
 * .why = verify the hook blocks adhoc access into OTHER repos under the
 *        git root, allows the caller's own repo, and always names the
 *        git.repo.get command to run instead
 */
describe('pretooluse.forbid-cross-repo-access.sh', () => {
  const scriptPath = path.join(
    __dirname,
    'pretooluse.forbid-cross-repo-access.sh',
  );

  /**
   * .what = run a git command in the fixture, and fail loud if it did not work
   * .why = a fixture that half-built produces a downstream assertion failure
   *        that misreads as a hook defect. surface the real cause here instead
   *        (rule.require.failfast).
   */
  const runGit = (args: string[], cwd: string): void => {
    const result = spawnSync('git', args, { cwd, encoding: 'utf-8' });
    if (result.status !== 0)
      throw new Error(
        `test fixture could not run \`git ${args.join(' ')}\` in ${cwd}` +
          ` (exit ${result.status}): ${result.stderr ?? ''}`,
      );
  };

  /**
   * .what = build a temp git root with two peer repos
   * .why = hermetic boundary tests that never touch the human's real repos
   *
   * .note = the root comes from test-fns `genTempDir`, not an adhoc
   *         `mkdtemp` (rule.forbid.adhoc-gentempdir-reimpl). that also earns
   *         real coverage: genTempDir hands back a SYMLINK into the physical
   *         temp store, so every case here exercises the symlinked-root path
   *         the hook canonicalizes with `realpath`.
   *
   * .note = the two repos are NESTED under the root, so `git: true` cannot
   *         serve them — genTempDir inits at its own top only. the per-repo
   *         init below is therefore net-new, not a duplicate.
   */
  const genTempRoot = (): {
    gitRoot: string;
    homeDir: string;
    repoSelf: string;
    repoPeer: string;
    cleanup: () => void;
  } => {
    const tempDir = genTempDir({ slug: 'forbid-cross-repo' });
    const homeDir = path.join(tempDir, 'home');
    const gitRoot = path.join(homeDir, 'git');

    const repos = [
      { slug: 'testorg/self-repo', remote: 'testorg/self-repo' },
      { slug: 'testorg/peer-repo', remote: 'testorg/peer-repo' },
    ];

    for (const repo of repos) {
      const repoPath = path.join(gitRoot, repo.slug);
      fs.mkdirSync(path.join(repoPath, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'src', 'index.ts'),
        'export const hello = "world";\n',
      );

      // .note = git-config isolation is already handled repo-wide by
      //         jest.integration.env.ts (GIT_CONFIG_GLOBAL/SYSTEM=/dev/null)
      //         plus configureTestGitUser's --local, so no per-call env
      //         override is added here.
      //
      // .note = no `config --global safe.directory` is set. git's
      //         dubious-ownership check only fires when the repo is owned by
      //         a different user than the caller, and this fixture is created
      //         by the test process itself — so it never fires. to set it
      //         anyway reached the HUMAN'S ~/.gitconfig, which both mutated
      //         their machine and made two suites contend for one config lock
      //         when jest ran them in parallel (rule.require.hermetic-tests).
      // .note = the branch is named EXPLICITLY, never left to `git init`'s
      //         default. that default is host state: git falls back to
      //         `master` unless `init.defaultBranch` says otherwise, and this
      //         fixture nulls global config, so a dev box and a ci runner can
      //         disagree. the hook derives its `--tree <branch>` hint from the
      //         real branch, so an unpinned default made every assertion on
      //         that hint pass locally on `main` and fail on ci's `master`
      //         (rule.require.hermetic-tests).
      runGit(['init', '-b', 'main'], repoPath);
      configureTestGitUser({ cwd: repoPath });
      runGit(['add', '.'], repoPath);
      runGit(['commit', '-m', 'initial'], repoPath);
      runGit(
        ['remote', 'add', 'origin', `https://github.com/${repo.remote}.git`],
        repoPath,
      );
    }

    return {
      gitRoot,
      homeDir,
      repoSelf: path.join(gitRoot, 'testorg/self-repo'),
      repoPeer: path.join(gitRoot, 'testorg/peer-repo'),
      // drops the symlink now; genTempDir auto-prunes the physical store
      cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }),
    };
  };

  /**
   * .what = run the hook as if invoked before a tool call
   * .why = cwd decides the "current repo", so it is always explicit
   */
  const runHook = (input: {
    toolName: string;
    toolInput: Record<string, unknown>;
    cwd: string;
    homeDir: string;
    gitRoot: string;
    pathPrefix?: string;
  }): { stdout: string; stderr: string; exitCode: number } => {
    const result = spawnSync('bash', [scriptPath], {
      cwd: input.cwd,
      encoding: 'utf-8',
      input: JSON.stringify({
        tool_name: input.toolName,
        tool_input: input.toolInput,
      }),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        HOME: input.homeDir,
        GIT_REPO_ROOT: input.gitRoot,
        // .why = lets a case put a stub binary ahead of the real one, which
        //        is how the realpath-fails branch gets reachable at all
        //        (howto.mock-cli-via-path)
        ...(input.pathPrefix
          ? { PATH: `${input.pathPrefix}:${process.env.PATH ?? ''}` }
          : {}),
      },
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  /**
   * .what = swap the per-run temp git root for a stable token
   * .why = the block message prints the absolute path it stopped, and the
   *        temp root differs on every run. a raw snapshot would be red every
   *        time. the token keeps the render reviewable while the path shape
   *        (`<gitroot>/testorg/peer-repo/...`) stays visible.
   *
   * .note = both the symlink root and its physical target are swapped, since
   *         the hook canonicalizes with realpath before it prints.
   */
  const redactTempRoot = (text: string, gitRoot: string): string =>
    text
      .split(fs.realpathSync(gitRoot))
      .join('<gitroot>')
      .split(gitRoot)
      .join('<gitroot>');

  given('[case1] a Read into a PEER repo', () => {
    when('[t0] the hook runs from within self-repo', () => {
      then('blocks and names the git.repo.get fix', () => {
        const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Read',
            toolInput: { file_path: path.join(repoPeer, 'src/index.ts') },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('BLOCKED: adhoc cross-repo access');
          // names the right repo, derived from the remote
          expect(result.stderr).toContain('testorg/peer-repo');
          // names the exact fix, with the file path within that repo
          expect(result.stderr).toContain(
            "rhx git.repo.get lines --in testorg/peer-repo --paths 'src/index.ts'",
          );
          // and offers the inflight escape — as a line that can be RUN, not
          // finished by hand: the tree resolves to the peer's real branch and
          // the path is the caller's own, never a <file> placeholder
          expect(result.stderr).toContain(
            "rhx git.repo.get lines --in testorg/peer-repo --tree main --paths 'src/index.ts'",
          );
          expect(result.stderr).not.toContain('<file>');
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case2] a Read within the CURRENT repo', () => {
    when('[t0] the hook runs from within self-repo', () => {
      then('allows it', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Read',
            toolInput: { file_path: path.join(repoSelf, 'src/index.ts') },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(0);
          expect(result.stderr).toBe('');
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case3] Grep and Glob into a peer repo', () => {
    when('[t0] Grep carries a cross-repo path', () => {
      then('blocks it', () => {
        const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Grep',
            toolInput: { pattern: 'hello', path: repoPeer },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('BLOCKED');
          expect(result.stderr).toContain('testorg/peer-repo');

          // the caller SEARCHED, so the fix line must be a search that
          // carries their own words — copy-paste, not a retype
          expect(result.stderr).toContain(
            "rhx git.repo.get lines --in testorg/peer-repo --words 'hello'",
          );
          // and it must not hand back a dead placeholder
          expect(result.stderr).not.toContain('<pattern>');

          // .why = the INFLIGHT line must answer the same question as the
          //        latest one. it used to be a fixed string that always said
          //        `--paths '<file>'`, so a caller who searched was handed a
          //        file-read shape that answers no search at all
          expect(result.stderr).toContain(
            "rhx git.repo.get lines --in testorg/peer-repo --tree main --words 'hello'",
          );
          expect(result.stderr).not.toContain('<file>');

          // .why = the assertions above pin the two commands, but a human
          //        reads the whole message. quote marks, escapes, and the
          //        tree-art indentation around those commands are invisible
          //        to a `toContain`, and this is the exact render that shipped
          //        a real defect. the snapshot is what puts it in front of an
          //        eye at review time (rule.require.snapshots)
          //
          // .note = redacted, because the temp root carries a timestamp and a
          //         random suffix. a raw render would go red on its next run
          expect(redactTempRoot(result.stderr, gitRoot)).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] Glob carries a cross-repo path', () => {
      then('blocks it', () => {
        const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Glob',
            toolInput: { pattern: '**/*.ts', path: repoPeer },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('BLOCKED');
          // a Glob pattern names a path shape, not words to search for,
          // so it must NOT be piped into --words
          expect(result.stderr).not.toContain("--words '**/*.ts'");
          // it belongs in --paths instead — otherwise the redirect hands
          // back the whole repo and the caller retypes the shape they
          // already typed
          expect(result.stderr).toContain(
            "rhx git.repo.get files --in testorg/peer-repo --paths '**/*.ts'",
          );

          // the inflight line keeps the same shape — `files ... --paths`,
          // never the `lines ... --paths '<file>'` the old fixed string gave
          expect(result.stderr).toContain(
            "rhx git.repo.get files --in testorg/peer-repo --tree main --paths '**/*.ts'",
          );
          expect(result.stderr).not.toContain('<file>');

          // .why = same reason as t0 — the glob shape carries a quoted
          //        pattern full of `*` and `/`, which is precisely where a
          //        quote or escape regression would hide from a `toContain`
          expect(redactTempRoot(result.stderr, gitRoot)).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });

    when('[t3] Grep names a specific file, with words', () => {
      then('the fix line carries both the words and the file', () => {
        const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Grep',
            toolInput: {
              pattern: 'DomainEntity',
              path: path.join(repoPeer, 'src', 'index.ts'),
            },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain(
            "rhx git.repo.get lines --in testorg/peer-repo --words 'DomainEntity' --paths 'src/index.ts'",
          );
        } finally {
          cleanup();
        }
      });
    });

    when('[t4] Grep words carry a single quote', () => {
      then('the fix line stays a valid shell command', () => {
        const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Grep',
            toolInput: { pattern: "it's", path: repoPeer },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          // a bare it's would end the quoted arg; the escape keeps it whole
          expect(result.stderr).toContain("--words 'it'\\''s'");
        } finally {
          cleanup();
        }
      });
    });

    when('[t2] Grep carries the documented paths[] array shape', () => {
      then('blocks it too, whichever shape the tool sends', () => {
        const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Grep',
            toolInput: { pattern: 'hello', paths: [repoPeer] },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('BLOCKED');
        } finally {
          cleanup();
        }
      });
    });

    when('[t3] Grep carries no path at all', () => {
      then('allows it (defaults to the current repo)', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Grep',
            toolInput: { pattern: 'hello' },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(0);
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case4] Edit and Write into a peer repo', () => {
    when('[t0] an Edit targets a peer repo', () => {
      then('blocks the mutation', () => {
        const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Edit',
            toolInput: {
              file_path: path.join(repoPeer, 'src/index.ts'),
              old_string: 'a',
              new_string: 'b',
            },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('BLOCKED');
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] a Write targets a file that does NOT exist yet', () => {
      then('blocks it — a new file in a peer clone is still a reach', () => {
        const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Write',
            toolInput: {
              file_path: path.join(repoPeer, 'src/brandNew.ts'),
              content: 'export const x = 1;\n',
            },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('BLOCKED');
          expect(result.stderr).toContain('testorg/peer-repo');
        } finally {
          cleanup();
        }
      });
    });

    when('[t2] a Write targets a new file in the caller OWN repo', () => {
      then('allows it — an absent leaf is not a cross-repo reach', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Write',
            toolInput: {
              file_path: path.join(repoSelf, 'src/brandNew.ts'),
              content: 'export const x = 1;\n',
            },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(0);
          expect(result.stderr).toBe('');
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case5] a Bash command that names a peer repo path', () => {
    when('[t0] cat reaches into the peer repo', () => {
      then('blocks it', () => {
        const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Bash',
            toolInput: {
              command: `cat ${path.join(repoPeer, 'src/index.ts')}`,
            },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('BLOCKED');
          expect(result.stderr).toContain('testorg/peer-repo');
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] the command stays inside the current repo', () => {
      then('allows it', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Bash',
            toolInput: {
              command: `cat ${path.join(repoSelf, 'src/index.ts')}`,
            },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(0);
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case21] a reach at a peer repo ROOT, naming no file', () => {
    // .why = get_block_fixlines renders four shapes — search, glob, named
    //        file, and this bare-repo fallback. the first three each had a
    //        test; this one had none, though it is plainly reachable: at the
    //        repo root `abs` EQUALS the toplevel, so the `toplevel/*` prefix
    //        match in get_repo_relative_path fails, relpath comes back empty,
    //        and every filter branch falls through to `files --in <slug>`.
    //        an untested render is one a refactor can silently break, and
    //        this function shipped a real defect one round ago
    when('[t0] a Bash command names the peer repo root', () => {
      then('the fix line is the whole-repo shape, with no dead filter', () => {
        const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Bash',
            toolInput: { command: `ls ${repoPeer}` },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('BLOCKED');

          // no file was named, so the redirect asks for the repo's files —
          // it must not invent a path the caller never typed
          expect(result.stderr).toContain(
            'rhx git.repo.get files --in testorg/peer-repo',
          );
          expect(result.stderr).not.toContain('<file>');
          expect(result.stderr).not.toContain('--paths');
          expect(result.stderr).not.toContain('--words');

          // the inflight twin keeps the same shape and derives the branch,
          // exactly as the other three shapes do
          expect(result.stderr).toContain(
            'rhx git.repo.get files --in testorg/peer-repo --tree main',
          );
          expect(result.stderr).not.toContain('<branch>');

          expect(redactTempRoot(result.stderr, gitRoot)).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] a Read names the peer repo root', () => {
      then('the same whole-repo shape is rendered', () => {
        const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Read',
            toolInput: { file_path: repoPeer },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain(
            'rhx git.repo.get files --in testorg/peer-repo',
          );
          expect(result.stderr).not.toContain('<file>');
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case6] a path outside the git root entirely', () => {
    when('[t0] the target is /etc/hostname', () => {
      then('allows it — out of scope for this guard', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Read',
            toolInput: { file_path: '/etc/hostname' },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(0);
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case7] a WORKTREE of a peer repo', () => {
    when('[t0] the path is under <org>/_worktrees/<repo>.<slug>', () => {
      then('blocks it AND derives the true repo slug (not _worktrees)', () => {
        const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } = genTempRoot();
        try {
          const worktreePath = path.join(
            gitRoot,
            'testorg',
            '_worktrees',
            'peer-repo.vlad.feat-x',
          );
          runGit(['worktree', 'add', '-b', 'feat/x', worktreePath], repoPeer);

          const result = runHook({
            toolName: 'Read',
            toolInput: { file_path: path.join(worktreePath, 'src/index.ts') },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('BLOCKED');
          // the slug comes from git metadata, never from path segments.
          // (the raw worktree path still shows on the `path:` line, which is
          // correct — it is the path that was actually blocked.)
          expect(result.stderr).toContain('repo: testorg/peer-repo');
          expect(result.stderr).toContain(
            'rhx git.repo.get lines --in testorg/peer-repo',
          );
          expect(result.stderr).not.toContain('--in testorg/_worktrees');

          // .why = this is the one shape where get_block_treename runs against
          //        a WORKTREE dir rather than a main clone, and the branch it
          //        must report is the worktree's own — not the repo default.
          //        every other --tree assertion in this file reads `main`, so
          //        a lookup that silently fell back to the default branch, or
          //        to the `<branch>` placeholder, would pass all of them
          expect(result.stderr).toContain(
            'rhx git.repo.get lines --in testorg/peer-repo --tree feat/x --paths ',
          );
          expect(result.stderr).not.toContain('<branch>');

          // .why = the other block-message shapes are all snapshotted; this
          //        one was the odd shape held by assertions alone, and it is
          //        the only render where the `path:` line shows a worktree
          //        while the `repo:` line shows the slug that worktree
          //        belongs to — the exact pair a reader must not confuse
          expect(redactTempRoot(result.stderr, gitRoot)).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  // .why = the vision named binary files as a cost of the no-escape-hatch
  //        choice: `git.repo.get lines` reads text, so a binary peer file has
  //        no clean sanctioned read. it was named and then never revisited —
  //        the behavior was ASSUMED, never verified. this pins what actually
  //        happens, so the gap is a known quantity rather than a guess.
  //
  // .note = the gate is deliberately CONTENT-BLIND. it decides on the repo
  //         boundary, and it decides the same way for every byte sequence —
  //         so a binary file blocks exactly as a text file does. that is the
  //         correct behavior for a boundary guard: to sniff content would add
  //         a second, weaker rule for what is reachable. what the reader
  //         loses is only that the redirect names a `lines` read which will
  //         not render usefully — the same dead end the vision named, now
  //         proven rather than presumed.
  given('[case25] a cross-repo read of a BINARY file', () => {
    when('[t0] the peer file holds NUL bytes', () => {
      then(
        'blocks it exactly as a text file — the gate is content-blind',
        () => {
          const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } =
            genTempRoot();
          try {
            const binaryPath = path.join(repoPeer, 'src', 'logo.png');
            fs.writeFileSync(
              binaryPath,
              Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x1a, 0x0a, 0x00]),
            );
            runGit(['add', '.'], repoPeer);
            runGit(['commit', '-m', 'add binary'], repoPeer);

            const result = runHook({
              toolName: 'Read',
              toolInput: { file_path: binaryPath },
              cwd: repoSelf,
              homeDir,
              gitRoot,
            });

            expect(result.exitCode).toBe(2);
            expect(result.stderr).toContain('BLOCKED');
            expect(result.stderr).toContain('testorg/peer-repo');
            // the redirect names the file the caller asked for, binary or not
            expect(result.stderr).toContain("--paths 'src/logo.png'");
            // and it is NOT mistaken for the gitignored dead-end, which is a
            // different fact and carries a different message
            expect(result.stderr).not.toContain('git.repo.get cannot serve');

            // .why = the assertions above capture content-blindness, and the
            //        render is near-identical to case11's by design — that
            //        sameness IS the claim. a snapshot is what proves it stays
            //        identical: the day a binary read grows its own special
            //        message, this diff shows it, where a `toContain` would
            //        stay green (rule.require.snapshots)
            expect(redactTempRoot(result.stderr, gitRoot)).toMatchSnapshot();
          } finally {
            cleanup();
          }
        },
      );
    });
  });

  given('[case8] a tool outside the gated set', () => {
    when('[t0] WebFetch is invoked', () => {
      then('allows it', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'WebFetch',
            toolInput: { url: 'https://example.com' },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(0);
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case9] a linked dependency in the current repo node_modules', () => {
    when('[t0] node_modules/<pkg> symlinks into a peer repo', () => {
      then(
        'allows it — an installed dependency is the repo own business',
        () => {
          const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } =
            genTempRoot();
          try {
            // pnpm link / workspace shape: the install lives in the current
            // repo, but points at a peer clone under the git root
            const linkPath = path.join(repoSelf, 'node_modules', 'peer-pkg');
            fs.mkdirSync(path.dirname(linkPath), { recursive: true });
            fs.symlinkSync(repoPeer, linkPath);

            const result = runHook({
              toolName: 'Read',
              toolInput: { file_path: path.join(linkPath, 'src/index.ts') },
              cwd: repoSelf,
              homeDir,
              gitRoot,
            });

            expect(result.exitCode).toBe(0);
            expect(result.stderr).toBe('');
          } finally {
            cleanup();
          }
        },
      );
    });

    when(
      '[t1] the SAME peer file is reached directly, not via the link',
      () => {
        then(
          'still blocks it — the allowance is scoped to node_modules',
          () => {
            const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } =
              genTempRoot();
            try {
              const linkPath = path.join(repoSelf, 'node_modules', 'peer-pkg');
              fs.mkdirSync(path.dirname(linkPath), { recursive: true });
              fs.symlinkSync(repoPeer, linkPath);

              const result = runHook({
                toolName: 'Read',
                toolInput: { file_path: path.join(repoPeer, 'src/index.ts') },
                cwd: repoSelf,
                homeDir,
                gitRoot,
              });

              expect(result.exitCode).toBe(2);
              expect(result.stderr).toContain('BLOCKED');
            } finally {
              cleanup();
            }
          },
        );
      },
    );
  });

  given('[case10] the caller sits in a WORKTREE of their own repo', () => {
    when('[t0] they reach into that same repo main clone', () => {
      then('blocks it — another tree can be stale or dirty too', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          const worktreePath = path.join(
            gitRoot,
            'testorg',
            '_worktrees',
            'self-repo.vlad.feat-y',
          );
          runGit(['worktree', 'add', '-b', 'feat/y', worktreePath], repoSelf);

          const result = runHook({
            toolName: 'Read',
            toolInput: { file_path: path.join(repoSelf, 'src/index.ts') },
            cwd: worktreePath,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('BLOCKED');
          // and the redirect still names the true repo, plus the --tree escape
          expect(result.stderr).toContain('repo: testorg/self-repo');
          expect(result.stderr).toContain(
            "rhx git.repo.get lines --in testorg/self-repo --tree main --paths 'src/index.ts'",
          );

          // it IS the caller's repo, so the message must not claim otherwise
          // — in the sub-line OR in the header, which is the line most read.
          // asserted explicitly, not merely captured in the snapshot, so a
          // later edit cannot quietly re-baseline these terms
          expect(result.stderr).not.toContain('not your current repo');
          expect(result.stderr).toContain(
            'your repo, but a different worktree',
          );
          expect(result.stderr).toContain('adhoc cross-tree access');
          expect(result.stderr).not.toContain('adhoc cross-repo access');
          // the whole render gets a visual gate of its own
          expect(redactTempRoot(result.stderr, gitRoot)).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] they read a file within the worktree itself', () => {
      then('allows it — the worktree is their current repo', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          const worktreePath = path.join(
            gitRoot,
            'testorg',
            '_worktrees',
            'self-repo.vlad.feat-y',
          );
          runGit(['worktree', 'add', '-b', 'feat/y', worktreePath], repoSelf);

          const result = runHook({
            toolName: 'Read',
            toolInput: { file_path: path.join(worktreePath, 'src/index.ts') },
            cwd: worktreePath,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(0);
        } finally {
          cleanup();
        }
      });
    });
  });

  // .why = the hook derives `<org>/<repo>` from git remote metadata; the skill
  //        derives it from path segments. two independent derivations of the
  //        SAME name, and the hook prints its answer into a command the caller
  //        is told to run against the skill. so if they ever disagree, the
  //        redirect names a repo the skill cannot look up — the fix line fails
  //        on paste, and no test goes red.
  //
  // .note = a round-trip, not a comparison of the two derivations. to compare
  //         them would need this test to reimplement one side, which is a
  //         tenth copy of the very logic at issue. instead the hook's own
  //         printed slug is handed to the skill, and the skill must find the
  //         exact directory that was blocked. that is the contract the caller
  //         actually depends on.
  given('[case24] the slug the hook prints must be one the skill knows', () => {
    when('[t0] a peer repo read is blocked and its fix line is run', () => {
      then('the skill finds that slug, at the blocked repo', () => {
        const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } = genTempRoot();
        try {
          const blocked = runHook({
            toolName: 'Read',
            toolInput: { file_path: path.join(repoPeer, 'src/index.ts') },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });
          expect(blocked.exitCode).toBe(2);

          // take the slug the HOOK chose, from the line a human would copy
          const slug = blocked.stderr.match(/--in (\S+)/)?.[1];
          if (!slug)
            throw new Error(
              `the block message named no --in slug to round-trip:\n${blocked.stderr}`,
            );

          // and hand it to the SKILL, which derives slugs the other way
          const skillPath = path.join(
            __dirname,
            '..',
            '..',
            'skills',
            'git.repo.get',
            'git.repo.get.sh',
          );
          const found = spawnSync(
            'bash',
            [skillPath, 'repos', '--repos', slug, '--refresh', 'off'],
            {
              encoding: 'utf-8',
              env: { ...process.env, HOME: homeDir, GIT_REPO_ROOT: gitRoot },
            },
          );

          expect(found.status).toBe(0);
          // exactly the repo that was blocked — not zero, not a near-miss
          expect(found.stdout).toContain('found: 1 repos');
          expect(found.stdout).toContain('(local)');
          expect(found.stdout).toContain(path.basename(repoPeer));
        } finally {
          cleanup();
        }
      });
    });

    // .why = t0 exercises the git-metadata derivation only, because every
    //        fixture here has an origin remote. the FALLBACK — first two
    //        segments under the root — is the branch that mirrors the skill's
    //        own path-segment logic, so it is the one the parity concern is
    //        really about, and it was reached by no test at all: a deliberate
    //        drift of the fallback left the whole suite GREEN.
    when(
      '[t1] the peer repo has no origin remote, so the fallback runs',
      () => {
        then('the fallback slug is one the skill knows too', () => {
          const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } =
            genTempRoot();
          try {
            runGit(['remote', 'remove', 'origin'], repoPeer);

            const blocked = runHook({
              toolName: 'Read',
              toolInput: { file_path: path.join(repoPeer, 'src/index.ts') },
              cwd: repoSelf,
              homeDir,
              gitRoot,
            });
            expect(blocked.exitCode).toBe(2);

            const slug = blocked.stderr.match(/--in (\S+)/)?.[1];
            expect(slug).toEqual('testorg/peer-repo');

            const skillPath = path.join(
              __dirname,
              '..',
              '..',
              'skills',
              'git.repo.get',
              'git.repo.get.sh',
            );
            const found = spawnSync(
              'bash',
              [skillPath, 'repos', '--repos', slug ?? '', '--refresh', 'off'],
              {
                encoding: 'utf-8',
                env: { ...process.env, HOME: homeDir, GIT_REPO_ROOT: gitRoot },
              },
            );

            expect(found.status).toBe(0);
            expect(found.stdout).toContain('found: 1 repos');
          } finally {
            cleanup();
          }
        });
      },
    );
  });

  // .why = the hook and the skill each spell the SAME default root
  //        (`${GIT_REPO_ROOT:-$HOME/git}`) in their own file, on purpose: the
  //        hook runs on every tool call under a PT5S budget, so it must not
  //        source a whole operations library to learn one path. the cost of
  //        that choice is a drift hazard, and until now it was held by a
  //        comment alone — "the two must stay in step" is a request, not a
  //        guard. if one default moved, the gate would no longer watch the
  //        very root the sanctioned tool reads from, and the wish's guarantee
  //        would fail open with no test red anywhere.
  //
  // .note = deliberately BEHAVIORAL, not a text match on the two literals. a
  //         grep for the same string would pass if both were changed to the
  //         same WRONG value, and would go red on a harmless reword. this asks
  //         the skill where its root is, then proves the hook gates that answer.
  given('[case23] the hook boundary and the skill root must agree', () => {
    when(
      '[t0] neither is told a root, so both fall back to their default',
      () => {
        then('the skill root is gated by the hook', () => {
          const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } =
            genTempRoot();
          try {
            // ask the SKILL where it reads repos from
            const opsPath = path.join(
              __dirname,
              '..',
              '..',
              'skills',
              'git.repo.get',
              'git.repo.get.operations.sh',
            );
            const envNoRoot: NodeJS.ProcessEnv = {
              ...process.env,
              HOME: homeDir,
            };
            delete envNoRoot.GIT_REPO_ROOT;

            const asked = spawnSync(
              'bash',
              ['-c', `set -eo pipefail; source "${opsPath}"; get_git_root`],
              { encoding: 'utf-8', env: envNoRoot },
            );
            if (asked.status !== 0)
              throw new Error(
                `could not ask the skill for its git root: ${asked.stderr}`,
              );
            const rootPerSkill = (asked.stdout ?? '').trim();

            // the fixture is built at that same place, so a drift in the skill's
            // default is caught here rather than misread as a hook defect
            expect(rootPerSkill).toEqual(gitRoot);

            // and the HOOK, told no root either, must gate a peer repo under it
            const blocked = spawnSync('bash', [scriptPath], {
              cwd: repoSelf,
              encoding: 'utf-8',
              input: JSON.stringify({
                tool_name: 'Read',
                tool_input: {
                  file_path: path.join(
                    rootPerSkill,
                    'testorg/peer-repo/src/index.ts',
                  ),
                },
              }),
              stdio: ['pipe', 'pipe', 'pipe'],
              env: envNoRoot,
            });

            expect(repoPeer).toEqual(
              path.join(rootPerSkill, 'testorg/peer-repo'),
            );
            expect(blocked.status).toBe(2);
            expect(blocked.stderr).toContain('BLOCKED');
          } finally {
            cleanup();
          }
        });
      },
    );
  });

  // .why = the hook names its OWN boundary `$GIT_REPO_ROOT`, so that variable
  //        is the one form a caller is most likely to reach for — and it was
  //        the one the extractor did not read.
  given('[case22] a Bash command that names the root by $GIT_REPO_ROOT', () => {
    when('[t0] the bare form names a peer repo', () => {
      then('blocks it, same as the $HOME form', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Bash',
            toolInput: {
              command: 'cat $GIT_REPO_ROOT/testorg/peer-repo/src/index.ts',
            },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('BLOCKED');
          expect(result.stderr).toContain('testorg/peer-repo');
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] the brace form names a peer repo', () => {
      then('blocks it too — the brace is folded like ${HOME}', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Bash',
            toolInput: {
              command: 'cat ${GIT_REPO_ROOT}/testorg/peer-repo/src/index.ts',
            },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('BLOCKED');
        } finally {
          cleanup();
        }
      });
    });

    // .why = the half that keeps the fix honest. with the var UNSET, bash
    //        expands `$GIT_REPO_ROOT/testorg/...` to `/testorg/...` — a path
    //        that never touches the root. a gate that folded the name anyway
    //        would block a reach the caller never made. this is the assertion
    //        that a careless "just add it to the alternation" fails.
    when('[t2] GIT_REPO_ROOT is unset in the environment', () => {
      then('allows it — bash would expand the name to empty', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          // .note = typed as ProcessEnv so the key can be DELETED, not merely
          //         set empty. the repo's narrowed process.env type has no
          //         GIT_REPO_ROOT member, and an empty value would not test
          //         the same thing an absent one does
          const env: NodeJS.ProcessEnv = { ...process.env, HOME: homeDir };
          delete env.GIT_REPO_ROOT;

          const result = spawnSync('bash', [scriptPath], {
            cwd: repoSelf,
            encoding: 'utf-8',
            input: JSON.stringify({
              tool_name: 'Bash',
              tool_input: {
                command: 'cat $GIT_REPO_ROOT/testorg/peer-repo/src/index.ts',
              },
            }),
            stdio: ['pipe', 'pipe', 'pipe'],
            env,
          });

          // the boundary is unchanged — genTempRoot puts gitRoot at
          // $HOME/git, which is the same default the hook falls back to
          expect(gitRoot).toEqual(path.join(homeDir, 'git'));
          expect(result.status).toBe(0);
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case14] a Bash command that spells the path with ${HOME}', () => {
    when('[t0] the brace form names a peer repo', () => {
      then('blocks it, same as the bare $HOME form', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          // the hook resolves ${HOME} itself; gitRoot lives under homeDir/git
          const result = runHook({
            toolName: 'Bash',
            toolInput: {
              command: 'cat ${HOME}/git/testorg/peer-repo/src/index.ts',
            },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('BLOCKED');
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case15] the peer file is gitignored in its own repo', () => {
    when('[t0] a Read names that gitignored file', () => {
      then('blocks it, and does NOT name a fix that would fail', () => {
        const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } = genTempRoot();
        try {
          // that repo told git to ignore this file, so it lives in no ref
          // and no worktree scan — git.repo.get can never serve it
          fs.writeFileSync(path.join(repoPeer, '.gitignore'), '.env\n');
          fs.writeFileSync(
            path.join(repoPeer, '.env'),
            'API_TOKEN=peersecret\n',
          );

          const result = runHook({
            toolName: 'Read',
            toolInput: { file_path: path.join(repoPeer, '.env') },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('BLOCKED');

          // an error that names a fix which cannot work is worse than one
          // that names none (rule.require.errors-name-the-fix)
          expect(result.stderr).not.toContain('rhx git.repo.get');
          expect(result.stderr).toContain('gitignores this file');
          expect(result.stderr).toContain('ask the human');

          expect(redactTempRoot(result.stderr, gitRoot)).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] a Read names a tracked file in that same repo', () => {
      then('still gets the normal git.repo.get redirect', () => {
        const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } = genTempRoot();
        try {
          fs.writeFileSync(path.join(repoPeer, '.gitignore'), '.env\n');

          const result = runHook({
            toolName: 'Read',
            toolInput: { file_path: path.join(repoPeer, 'src/index.ts') },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain(
            "rhx git.repo.get lines --in testorg/peer-repo --paths 'src/index.ts'",
          );
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case16] a Glob whose pattern IS the cross-repo path', () => {
    when('[t0] pattern is absolute and no path field is sent', () => {
      then('blocks it — the pattern is a target, not just message text', () => {
        const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } = genTempRoot();
        try {
          // Glob accepts a bare absolute pattern with no `path`. if only
          // `path` is scanned, this walks a peer repo entirely ungated —
          // the exact hazard the whole wish exists to close
          const result = runHook({
            toolName: 'Glob',
            toolInput: { pattern: path.join(repoPeer, '**/*.ts') },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('BLOCKED');
          expect(result.stderr).toContain('testorg/peer-repo');

          // .why = a block is only half the contract. the fix line must be
          //        RUNNABLE, and `git.repo.get --paths` is repo-relative —
          //        so an absolute pattern pasted verbatim matches zero files.
          //        this case once asserted only that the block fired, so the
          //        redirect shipped with a fix that fails when run
          //        (rule.require.errors-name-the-fix). asserted both ways:
          //        the relative shape is present AND the absolute one is not,
          //        since `toContain` alone would pass on the absolute string
          //        that happens to end with the relative one.
          expect(result.stderr).toContain("--paths '**/*.ts'");
          expect(result.stderr).not.toContain(`--paths '${repoPeer}`);
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] pattern is absolute and names the caller own repo', () => {
      then('allows it — the gate must not be over-broad', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Glob',
            toolInput: { pattern: path.join(repoSelf, '**/*.ts') },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(0);
        } finally {
          cleanup();
        }
      });
    });

    when('[t2] pattern is relative, as it usually is', () => {
      then('allows it — a relative glob is scoped to the caller cwd', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Glob',
            toolInput: { pattern: 'src/**/*.ts' },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(0);
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case13] a NotebookEdit into a peer repo', () => {
    when('[t0] the target is a peer repo notebook', () => {
      then('blocks it — notebook_path is a write path too', () => {
        const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'NotebookEdit',
            toolInput: {
              notebook_path: path.join(repoPeer, 'analysis.ipynb'),
              new_source: 'print("hi")',
            },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('BLOCKED');
          expect(result.stderr).toContain('testorg/peer-repo');
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] the target is a notebook in the caller own repo', () => {
      then('allows it', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'NotebookEdit',
            toolInput: {
              notebook_path: path.join(repoSelf, 'analysis.ipynb'),
              new_source: 'print("hi")',
            },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(0);
          expect(result.stderr).toBe('');
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case17] a symlink cycle in the target path', () => {
    when('[t0] the cycle sits outside the git root', () => {
      then(
        'allows it — realpath still places it, and it is out of scope',
        () => {
          const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
          try {
            // .why = this pins what `realpath -m` ACTUALLY does, because the
            //        gate's fail-closed branch rests on the opposite premise.
            //        a self-referential symlink is the strongest input i could
            //        construct against it, and `-m` still answers — it declines
            //        to stat components, so ELOOP never surfaces. a past-
            //        PATH_MAX path answers too.
            //
            //        so the empty-answer branch in the verdict loop is
            //        defense-in-depth against a case no input reaches today,
            //        NOT a demonstrated hole. this test exists to catch the day
            //        that premise changes: if a future realpath (or a busybox
            //        one) starts to fail here, this goes red and the
            //        block_unverifiable path stops to be theoretical
            const loop = path.join(homeDir, 'loop');
            fs.symlinkSync(loop, loop);

            const result = runHook({
              toolName: 'Read',
              toolInput: { file_path: path.join(loop, 'stolen.ts') },
              cwd: repoSelf,
              homeDir,
              gitRoot,
            });

            expect(result.exitCode).toBe(0);
          } finally {
            cleanup();
          }
        },
      );
    });

    when('[t1] realpath itself cannot answer', () => {
      then('blocks it — undecidable must deny, never allow', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          // .why = t0 showed no INPUT can make `realpath -m` fail, so the
          //        fail-closed branch is only reachable if realpath itself
          //        is broken — a busybox build, a stripped container, a
          //        PATH shadowed by something else. that is exactly what a
          //        PATH stub reproduces (howto.mock-cli-via-path), and it
          //        is what makes this clamp bite rather than decorate.
          //
          //        before the fix, an unanswerable path fell back to the RAW
          //        string, which carries no canonical `$GIT_ROOT/` prefix —
          //        so containment found no match and the gate fell OPEN
          const stubDir = path.join(homeDir, 'stub-bin');
          fs.mkdirSync(stubDir, { recursive: true });
          fs.writeFileSync(
            path.join(stubDir, 'realpath'),
            '#!/usr/bin/env bash\nexit 1\n',
            { mode: 0o755 },
          );

          const result = runHook({
            toolName: 'Read',
            toolInput: { file_path: path.join(repoSelf, 'src/index.ts') },
            cwd: repoSelf,
            homeDir,
            gitRoot,
            pathPrefix: stubDir,
          });

          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('unverifiable path');
          // and it must NOT assert a repo boundary it could not verify
          expect(result.stderr).not.toContain('cross-repo access');
          // the whole render gets a visual gate — it is a human-faced error
          expect(redactTempRoot(result.stdout, gitRoot)).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });

  // .why = the Bash gate is best-effort by design, and it FALLS OPEN when its
  //        path extractor breaks — it warns rather than blocks. that choice is
  //        defensible only while the warn is audible, so the warn is the part
  //        that must be proven. until now it was the one spot in this hook
  //        where "best-effort" quietly meant "unverified".
  //
  // .note = the extractor's grep exits 1 on "this command names no path",
  //         which is the ORDINARY case and must stay silent. only >1 is a real
  //         failure. both halves are pinned, since a regression that flattened
  //         them again would either spam every command or go mute on all.
  given('[case20] the Bash path extractor itself breaks', () => {
    when('[t0] grep fails outright (exit 2)', () => {
      then('warns audibly, and says the heuristic did not run', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          const stubDir = path.join(homeDir, 'stub-bin');
          fs.mkdirSync(stubDir, { recursive: true });
          fs.writeFileSync(
            path.join(stubDir, 'grep'),
            '#!/usr/bin/env bash\nexit 2\n',
            { mode: 0o755 },
          );

          const result = runHook({
            toolName: 'Bash',
            toolInput: { command: 'cat ~/git/testorg/peer/src/index.ts' },
            cwd: repoSelf,
            homeDir,
            gitRoot,
            pathPrefix: stubDir,
          });

          // it falls OPEN by design — but never silently
          expect(result.stderr).toContain('could not scan this Bash command');
          expect(result.stderr).toContain('the Bash heuristic did not run');
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] grep finds no path at all (exit 1, the ordinary case)', () => {
      then('stays silent — an ordinary answer is not a failure', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Bash',
            toolInput: { command: 'echo hello' },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(0);
          expect(result.stderr).not.toContain('could not scan');
        } finally {
          cleanup();
        }
      });
    });
  });

  // .why = the two cases below pin ACCEPTED blind spots — gaps we chose to
  //         live with, not defects. they were prose-only comments until now,
  //         and a prose promise cannot go red: a later change could quietly
  //         widen or narrow either gate with no signal. per
  //         rule.require.clamp-edge-cases, an accepted boundary still gets a
  //         test that states where it currently sits.
  //
  // .note = these assert the CURRENT gap on purpose. if a future change
  //         closes one, this goes red — which is the point: to close a
  //         documented gap should be a deliberate, visible act, not a
  //         side effect someone discovers later.
  given('[case18] the Bash heuristic gaps we accept', () => {
    when('[t0] the peer path is reached via a bare name after a cd', () => {
      then('does NOT block — the Bash gate reads text, not shell state', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          // the gate scans the command text for a path spelled with ~,
          // $HOME, or the root prefix. after a `cd`, the filename alone
          // carries no such prefix, so it is invisible to the scan.
          // the tool-level gates (Read/Grep/Glob/...) are the precise
          // boundary; Bash is best-effort cover for honest spellings
          const result = runHook({
            toolName: 'Bash',
            toolInput: {
              command: 'cd ~/git/testorg/peer-repo && cat src/index.ts',
            },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          // the `cd ~/git/...` half IS spelled, so it is caught —
          // this command blocks on the cd, not on the bare `cat`
          expect(result.exitCode).toBe(2);
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] the peer path is assembled through a variable', () => {
      then('does NOT block — the value is unknown at scan time', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          // `$P` holds the path, and the gate never evaluates the shell,
          // so no repo path appears in the text it scans
          const result = runHook({
            toolName: 'Bash',
            toolInput: { command: 'cat "$P/src/index.ts"' },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(0);
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case19] a worktree placed OUTSIDE the git root', () => {
    when('[t0] a read targets that out-of-root worktree', () => {
      then('does NOT block — the gate scopes to $GIT_REPO_ROOT', () => {
        const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } = genTempRoot();
        try {
          // `git worktree add` accepts ANY path, even one outside the root
          // this gate watches. that is an accepted blind spot: the wish
          // targets the "cross ~/git repo" hazard, and a reach at an
          // arbitrary out-of-root path is a different question
          const outsideTree = path.join(homeDir, 'elsewhere', 'peer.feat-z');
          runGit(['worktree', 'add', '-b', 'feat/z', outsideTree], repoPeer);

          const result = runHook({
            toolName: 'Read',
            toolInput: { file_path: path.join(outsideTree, 'src/index.ts') },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(0);
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case12] stdin the hook cannot parse', () => {
    when('[t0] stdin is not valid JSON', () => {
      then('fails OPEN, but loud on both streams — never silently', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          const result = spawnSync('bash', [scriptPath], {
            cwd: repoSelf,
            encoding: 'utf-8',
            input: 'this is not json {{{',
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, HOME: homeDir, GIT_REPO_ROOT: gitRoot },
          });

          // open, because a hook that cannot read its input must not
          // block every tool call in the session
          expect(result.status).toBe(0);
          // but loud, so the fail-open is never silent (rule.forbid.failhide)
          expect(result.stderr).toContain('could not parse stdin as JSON');
          expect(result.stdout).toContain('could not parse stdin as JSON');
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] stdin is empty', () => {
      then('fails CLOSED and loud on both streams', () => {
        const { gitRoot, homeDir, repoSelf, cleanup } = genTempRoot();
        try {
          const result = spawnSync('bash', [scriptPath], {
            cwd: repoSelf,
            encoding: 'utf-8',
            input: '',
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, HOME: homeDir, GIT_REPO_ROOT: gitRoot },
          });

          expect(result.status).toBe(2);
          expect(result.stderr).toContain('received no input via stdin');
          expect(result.stdout).toContain('received no input via stdin');
        } finally {
          cleanup();
        }
      });
    });
  });

  given('[case11] the block message a human actually reads', () => {
    when('[t0] a Read into a peer repo is blocked', () => {
      then('the whole render matches the snapshot', () => {
        const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Read',
            toolInput: { file_path: path.join(repoPeer, 'src/index.ts') },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          expect(redactTempRoot(result.stderr, gitRoot)).toMatchSnapshot();

          // the SAME render must reach stdout too
          // (rule.require.skill-output-streams: failure goes to both)
          expect(result.stdout).toEqual(result.stderr);
        } finally {
          cleanup();
        }
      });
    });

    when('[t1] a Bash command names a peer repo path', () => {
      then('the whole render matches the snapshot', () => {
        const { gitRoot, homeDir, repoSelf, repoPeer, cleanup } = genTempRoot();
        try {
          const result = runHook({
            toolName: 'Bash',
            toolInput: {
              command: `cat ${path.join(repoPeer, 'src/index.ts')}`,
            },
            cwd: repoSelf,
            homeDir,
            gitRoot,
          });

          expect(result.exitCode).toBe(2);
          expect(redactTempRoot(result.stderr, gitRoot)).toMatchSnapshot();
        } finally {
          cleanup();
        }
      });
    });
  });
});
