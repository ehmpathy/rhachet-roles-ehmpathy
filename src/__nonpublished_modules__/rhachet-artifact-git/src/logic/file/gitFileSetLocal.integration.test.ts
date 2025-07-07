import { readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { given, then } from 'test-fns';

import { GitFile } from '../../domain/GitFile';
import { gitFileSetLocal } from './gitFileSetLocal';

describe('gitFileSetLocal', () => {
  given('a local uri', () => {
    const tmpUri = join(tmpdir(), `gitfile-${Date.now()}.ts`);
    const content = 'export const x = 42;';

    then(
      'it should write, read, validate, and return the GitFile',
      async () => {
        const result = await gitFileSetLocal({
          ref: { uri: tmpUri },
          content,
        });

        const fileOnDisk = await readFile(tmpUri, 'utf-8');

        expect(fileOnDisk).toBe(content);
        expect(result).toBeInstanceOf(GitFile);
        expect(result.uri).toBe(tmpUri);
        expect(result.content).toBe(content);
        expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
      },
    );

    afterAll(async () => {
      await unlink(tmpUri);
    });
  });

  given('a cloud uri', () => {
    const badRef = {
      uri: 's3://bucket/should-not-write.ts',
    };

    then('it should throw an UnexpectedCodePathError', async () => {
      await expect(() =>
        gitFileSetLocal({ ref: badRef, content: '// should not write' }),
      ).rejects.toThrow(
        "ENOENT: no such file or directory, open 's3://bucket/should-not-write.ts'",
      );
    });
  });
});
