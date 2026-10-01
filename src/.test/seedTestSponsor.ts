import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { ConstraintError } from 'helpful-errors';
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
 * .what = bind a sponsor in a test repo, so git.commit.set names a known human
 * .why = a bind wins over git config, so a seeded bind pins the trailer to one
 *        value regardless of the test repo's git identity. a helper keeps the
 *        value in ONE place — so a change to the state shape does not need ~20
 *        hand edits across the suites.
 *
 * .why = it is a peer of configureTestGitUser, never a part of it. the bind
 *        and the git config are two sources, and precedence between them is
 *        behavior under test — a merged helper could not seed one without the
 *        other.
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
  // .note = `me` is the pre-rename label for `self`; a seed of it proves the
  //         reader maps a legacy bind forward
  source?: 'self' | 'supplied' | 'me';
}): void => {
  const {
    cwd,
    name = 'Test Human',
    email = 'human@test.com',
    source = 'supplied',
  } = input;

  // guard: cwd must be within a temp directory (.temp or /tmp/)
  if (!cwd.includes('.temp') && !cwd.startsWith('/tmp/')) {
    throw new ConstraintError(
      'seedTestSponsor: cwd must be within a temp directory, to prevent pollution',
      { cwd, hint: 'pass a cwd from genTempDir (under .temp or /tmp/)' },
    );
  }

  // guard: cwd must have its own .git directory (not inherit from parent)
  if (!existsSync(join(cwd, '.git'))) {
    throw new ConstraintError(
      'seedTestSponsor: cwd must be a git repo (no .git directory found)',
      { cwd, hint: 'create the temp dir with genTempDir({ git: true })' },
    );
  }

  const meterDir = join(cwd, '.meter');
  mkdirSync(meterDir, { recursive: true });
  // .why = `source` is part of the value, so the seed writes the full shape.
  //        `supplied` is the honest DEFAULT: the helper hands a value in, it
  //        never reads git config.
  //
  // .why it is OVERRIDABLE = a bind via `--who @self` records `self`, and a
  //        legacy bind recorded `me`; tests seed each to prove how they render.
  writeFileSync(
    join(meterDir, SPONSOR_STATE_FILENAME),
    `${JSON.stringify({ sponsor: { name, email, source } }, null, 2)}\n`,
  );
};
