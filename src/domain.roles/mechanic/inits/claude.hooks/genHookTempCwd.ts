import { mkdirSync, writeFileSync } from 'fs';
import * as path from 'path';
import { genTempDir } from 'test-fns';

/**
 * .what = a hermetic cwd that already holds its own .claude dir and nudge file
 * .why = find_claude_dir walks UP from PWD. absent a local .claude the walk
 *        continues — and genTempDir's physical store can sit under the repo, so
 *        the walk could reach the REPO's real .claude and write a nudge there.
 *        a seeded local .claude stops the walk at the first rung.
 *
 * .note = the root comes from test-fns `genTempDir`, never an adhoc `mkdtemp`
 *         (rule.forbid.adhoc-gentempdir-reimpl). the `.claude` write below is
 *         net-new content, not a reimpl — genTempDir provides clone/symlink/git
 *         and no arbitrary-file option.
 *
 * 🔴 .note = `nudgeFileName` is REQUIRED rather than defaulted, and that is the
 *            whole reason this takes a parameter at all. the two forbid-terms
 *            hooks keep two SEPARATE nudge files, and that separation is a
 *            `case=2` guarantee: one shared clock would let a gerund override
 *            permit a blocklisted term. a default here would invite a caller to
 *            omit it and silently weld the two clocks together.
 *
 * 🔴 .note = `null` is an ALLOWED value and `undefined` is not, which is the
 *            distinction that keeps the note above true. a caller that wants a
 *            sandbox with NO seeded nudge file must say `null` at its own call
 *            site — an explicit, greppable choice — where an optional `?:` would
 *            let the same caller omit the key and read as "i forgot" rather than
 *            "i meant none" (`rule.forbid.undefined-inputs`).
 *            ⇒ the guarantee is that the choice is DELIBERATE, never that a
 *              filename is always supplied. a contract that cannot say "none"
 *              forces the one caller that needs it into a hand-written copy,
 *              which relocates the duplication rather than removes it.
 */
export const genHookTempCwd = (input: {
  slug: string;
  nudgeFileName: string | null;
}): string => {
  const dir = genTempDir({ slug: input.slug });
  mkdirSync(path.join(dir, '.claude'), { recursive: true });
  if (input.nudgeFileName !== null)
    writeFileSync(path.join(dir, '.claude', input.nudgeFileName), '{}');
  return dir;
};
