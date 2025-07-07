import findUp from 'find-up';
import { BadRequestError } from 'helpful-errors';
import { resolve } from 'path';
import { given, when, then } from 'test-fns';

import { castGitFileUriToAbsoluteUri } from './castGitFileUriToAbsoluteUri';

jest.mock('find-up');
const mockFindUp = findUp as any as jest.Mock;

describe('castGitFileUriToAbsoluteUri', () => {
  const mockGitRoot = '/mock/repo';

  given('a uri that is already absolute', () => {
    const uri = '/usr/local/config.yaml';

    when('casting to absolute', () => {
      let result: string;

      beforeAll(async () => {
        result = await castGitFileUriToAbsoluteUri({ uri });
      });

      then('returns the original uri unchanged', () => {
        expect(result).toBe(uri);
      });
    });
  });

  given('a @gitroot/ path and git root is found', () => {
    const uri = '@gitroot/.rhachet/config.json';

    beforeAll(() => {
      mockFindUp.mockResolvedValue('/mock/repo/.git');
    });

    when('casting to absolute', () => {
      let result: string;

      beforeAll(async () => {
        result = await castGitFileUriToAbsoluteUri({ uri });
      });

      then('returns resolved path under git root', () => {
        expect(result).toBe(resolve(mockGitRoot, '.rhachet/config.json'));
      });
    });
  });

  given('a @gitroot/ path but cwd is outside any git repo', () => {
    const uri = '@gitroot/nowhere/file.txt';

    beforeAll(() => {
      mockFindUp.mockResolvedValue(undefined); // simulate no .git found
    });

    when('casting to absolute', () => {
      then('throws a BadRequestError', async () => {
        await expect(castGitFileUriToAbsoluteUri({ uri })).rejects.toThrow(
          BadRequestError,
        );
      });
    });
  });
});
