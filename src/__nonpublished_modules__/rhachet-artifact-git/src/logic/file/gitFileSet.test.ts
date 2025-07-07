import { getRef } from 'domain-objects';
import { tmpdir } from 'os';
import { join } from 'path';
import { given, then } from 'test-fns';

import { GitFile } from '../../domain/GitFile';
import { gitFileSet } from './gitFileSet';
import * as gitFileSetLocalModule from './gitFileSetLocal';

jest.mock('./gitFileSetLocal');

describe('gitFileSet', () => {
  given('a local GitFile ref and content', () => {
    const tmpUrl = join(tmpdir(), `gitFile-${Date.now()}.txt`);

    const mockResult = new GitFile({
      uri: tmpUrl,
      content: 'console.log("hello world")',
      hash: 'abc123',
    });

    beforeEach(() => {
      (gitFileSetLocalModule.gitFileSetLocal as jest.Mock).mockResolvedValue(
        mockResult,
      );
    });

    then(
      'it should delegate to gitFileSetLocal with the ref and content',
      async () => {
        const result = await gitFileSet({
          ref: getRef(mockResult),
          content: mockResult.content,
        });

        expect(gitFileSetLocalModule.gitFileSetLocal).toHaveBeenCalledWith({
          ref: { _dobj: 'GitFile', uri: tmpUrl },
          content: mockResult.content,
        });
        expect(result).toBe(mockResult);
      },
    );
  });
});
