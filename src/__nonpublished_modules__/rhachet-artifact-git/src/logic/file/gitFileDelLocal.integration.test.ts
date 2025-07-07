import { writeFile, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { given, then } from 'test-fns';

import { gitFileDelLocal } from './gitFileDelLocal';

describe('gitFileDelLocal', () => {
  given('a local file that exists', () => {
    const tmpUri = join(tmpdir(), `gitfile-${Date.now()}.txt`);
    const content = 'delete me';

    beforeAll(async () => {
      await writeFile(tmpUri, content, 'utf-8');
    });

    then('deletes the file successfully', async () => {
      await gitFileDelLocal({ ref: { uri: tmpUri } });

      await expect(readFile(tmpUri, 'utf-8')).rejects.toThrow(/ENOENT/);
    });
  });

  given('a local file that does not exist', () => {
    const tmpUri = join(tmpdir(), `gitfile-missing-${Date.now()}.txt`);

    then('does nothing (soft delete)', async () => {
      await expect(
        gitFileDelLocal({ ref: { uri: tmpUri } }),
      ).resolves.toBeUndefined();
    });
  });
});
