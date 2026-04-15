import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir } from 'test-fns';

import { configureTestGitUser } from '@src/.test/configureTestGitUser';

/**
 * .what = create a temp directory with git repo
 * .why = uses genTempDir for structured .temp/ paths instead of /tmp/
 */
export const createTempRepo = (): string => {
  const tempDir = genTempDir({ slug: 'cicd-deflake', git: true });

  // genTempDir with git:true inits repo but we need HEAD to exist
  configureTestGitUser({ cwd: tempDir });
  fs.writeFileSync(path.join(tempDir, '.gitkeep'), '');
  spawnSync('git', ['add', '.gitkeep'], { cwd: tempDir });
  spawnSync('git', ['commit', '-m', 'init'], { cwd: tempDir });

  return tempDir;
};
