import { getRef } from 'domain-objects';
import { tmpdir } from 'os';
import { join } from 'path';
import { given, then } from 'test-fns';

import { GitFile } from '../../domain/GitFile';
import { gitFileGet } from './gitFileGet';
import * as gitFileGetLocalModule from './gitFileGetLocal';

jest.mock('./gitFileGetLocal');

describe('gitFileGet', () => {
  given('a local GitFile ref', () => {
    const tmpUrl = join(tmpdir(), `gitFile-${Date.now()}.txt`);

    const mockResult = new GitFile({
      uri: tmpUrl,
      content: 'hello world',
      hash: 'abc123',
    });

    beforeEach(() => {
      (gitFileGetLocalModule.gitFileGetLocal as jest.Mock).mockResolvedValue(
        mockResult,
      );
    });

    then('it should delegate to gitFileGetLocal with the ref', async () => {
      const result = await gitFileGet({ ref: getRef(mockResult) });

      expect(gitFileGetLocalModule.gitFileGetLocal).toHaveBeenCalledWith({
        ref: { _dobj: 'GitFile', uri: tmpUrl },
      });
      expect(result).toBe(mockResult);
    });
  });
});
