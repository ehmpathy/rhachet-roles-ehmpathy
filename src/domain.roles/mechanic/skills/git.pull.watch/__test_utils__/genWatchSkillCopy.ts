import * as fs from 'fs';
import * as path from 'path';
import { genTempDir } from 'test-fns';

/**
 * .what = a copy of this skill inside a fake rhachet-roles-ehmpathy install
 * .why  = a second version on the box (case=5), an upgrade (case=14), and a
 *         spawner worktree that goes away (case=12) each need a skill dir of
 *         its own, with its own package version
 * .note = `daemonPrefix` is prepended to the copied daemon file, so a test can
 *         make a copy that cannot boot (case=12b)
 */
export const genWatchSkillCopy = (input: {
  slug: string;
  version: string;
  daemonPrefix?: string;
}): { pkgDir: string; skillDir: string } => {
  const pkgDir = fs.realpathSync(
    genTempDir({ slug: `${input.slug}-pkg`, git: false }),
  );
  fs.writeFileSync(
    path.join(pkgDir, 'package.json'),
    JSON.stringify({ name: 'rhachet-roles-ehmpathy', version: input.version }),
  );
  const skillDir = path.join(pkgDir, 'dist', 'skills', 'git.pull.watch');
  fs.mkdirSync(skillDir, { recursive: true });
  // the skill sits one dir up from this test util
  const skillDirSource = path.join(__dirname, '..');
  fs.readdirSync(skillDirSource)
    .filter((file) => file.endsWith('.sh'))
    .forEach((file) => {
      const source = fs.readFileSync(path.join(skillDirSource, file), 'utf-8');
      const content =
        file === 'git.pull.watch.daemon.sh' && input.daemonPrefix
          ? source.replace(
              '#!/usr/bin/env bash\n',
              `#!/usr/bin/env bash\n${input.daemonPrefix}\n`,
            )
          : source;
      fs.writeFileSync(path.join(skillDir, file), content);
    });
  return { pkgDir, skillDir };
};
