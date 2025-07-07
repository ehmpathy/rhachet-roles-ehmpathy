import { resolve } from 'path';
import { given, when, then } from 'test-fns';

import { castGitFileUriToAbsoluteUri } from './castGitFileUriToAbsoluteUri';

describe('castGitFileUriToAbsoluteUri', () => {
  given('cwd is the git root', () => {
    const cwd = process.cwd();
    const input = '@gitroot/';

    when('casting uri to absolute', () => {
      let result: string;

      beforeAll(async () => {
        result = await castGitFileUriToAbsoluteUri({ uri: input });
      });

      then('returns the current working directory exactly', () => {
        expect(result).toBe(resolve(cwd));
      });
    });
  });
});
