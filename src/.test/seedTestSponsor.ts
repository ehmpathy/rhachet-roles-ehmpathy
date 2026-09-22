import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * .what = the sponsor state file's ONE name, on the typescript side.
 *
 * .why = the shell twin is `SPONSOR_STATE_FILENAME` in
 *        `git.commit.operations.sh`. typescript cannot source a bash file, so
 *        the literal is owed twice — and a rename applied to the shell alone
 *        would leave THIS seed on a path nobody reads, while every seeded test
 *        stayed green against the stale file.
 *
 * .note = `git.commit.sponsor` [case13] asserts the two literals agree. that
 *         test is what makes this duplicate safe.
 */
export const SPONSOR_STATE_FILENAME = 'git.commit.sponsor.jsonc';

/**
 * .what = bind a sponsor in a test repo, so git.commit.set has a human to name
 * .why = a commit refuses where no sponsor is bound. every commit test therefore
 *        needs one, and a helper keeps the value in ONE place — so a change to
 *        the state shape does not need ~20 hand edits across the suites.
 *
 * .why = it is a peer of configureTestGitUser, never a part of it. git still
 *        needs a user.name to make a commit at all; the SPONSOR is what the
 *        trailer names. two jobs, two helpers — a merge would re-imply that
 *        the git config is the identity source, which is the defect.
 *
 * .note = guards mirror configureTestGitUser: temp dirs only, never the main repo
 *
 * .note = it writes the state file directly, and the default name 'Test Human'
 *         is one `git.commit.sponsor set` REFUSES to bind (a placeholder).
 *         that is deliberate, not an oversight: the two paths answer different
 *         questions. the bind path is where a human is guarded, and the sponsor
 *         suite exercises that guard head-on; this helper only needs a tree
 *         that already HAS a sponsor, so it seeds the end state directly.
 *         ⇒ the value stays a plain placeholder on purpose — a realistic name
 *         here would read as a real person in ~20 suites' snapshots.
 */
export const seedTestSponsor = (input: {
  cwd: string;
  name?: string;
  email?: string;
  source?: 'me' | 'supplied';
}): void => {
  const {
    cwd,
    name = 'Test Human',
    email = 'human@test.com',
    source = 'supplied',
  } = input;

  // guard: cwd must be within a temp directory (.temp or /tmp/)
  if (!cwd.includes('.temp') && !cwd.startsWith('/tmp/')) {
    throw new Error(
      `seedTestSponsor: cwd must be within a temp directory (.temp or /tmp/) to prevent pollution. got: ${cwd}`,
    );
  }

  // guard: cwd must have its own .git directory (not inherit from parent)
  if (!existsSync(join(cwd, '.git'))) {
    throw new Error(
      `seedTestSponsor: cwd must be a git repo (no .git directory found). got: ${cwd}`,
    );
  }

  const meterDir = join(cwd, '.meter');
  mkdirSync(meterDir, { recursive: true });
  // .why = `source` is part of the value, so the seed writes the full shape.
  //        `supplied` is the honest DEFAULT: the helper hands a value in, it
  //        never reads a github session.
  //
  // .why it is OVERRIDABLE = a cloud grove binds by `--who @stdin`
  //        (`supplied`) and a laptop by `--who @me` (`me`), so the two groves
  //        differ on exactly this byte. `case=2 [t3]` asserts the commit tree
  //        is identical across them anyway — and that clamp cannot be written
  //        unless a test can seed both values.
  writeFileSync(
    join(meterDir, SPONSOR_STATE_FILENAME),
    `${JSON.stringify({ sponsor: { name, email, source } }, null, 2)}\n`,
  );
};
