import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { given, then } from 'test-fns';

import { GitFile } from '../../domain/GitFile';
import { gitFileGetLocal } from './gitFileGetLocal';

describe('gitFileGetLocal', () => {
  given('a local file with known content', () => {
    const tmpPath = join(tmpdir(), `test-file-${Date.now()}.txt`);
    const fileContent = 'console.log("test");';

    beforeAll(async () => {
      await writeFile(tmpPath, fileContent, 'utf-8');
    });

    afterAll(async () => {
      await unlink(tmpPath);
    });

    then(
      'gitFileGetLocal returns a GitFile with correct path, content, and hash',
      async () => {
        const result = await gitFileGetLocal({ ref: { uri: tmpPath } });
        console.log(result);

        expect(result).toBeInstanceOf(GitFile);
        expect(result!.uri).toBe(tmpPath);
        expect(result!.content).toBe(fileContent);
        expect(result!.hash).toMatch(/^[a-f0-9]{64}$/); // sha256
      },
    );
  });
});
