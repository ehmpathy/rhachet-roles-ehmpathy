import { withExpectOutput } from 'as-procedure';
import { given, when, then } from 'test-fns';

import { GitCommit } from '../../../rhachet-artifact-git/src/domain/GitCommit';
import { GitFile } from '../../../rhachet-artifact-git/src/domain/GitFile';
import { GitRepo } from '../../../rhachet-artifact-git/src/domain/GitRepo';
import { Artifact } from './Artifact';

describe('Artifact', () => {
  given('an Artifact<GitFile>', () => {
    const initialFile: GitFile = {
      uri: '/src/index.ts',
      hash: 'abc123',
      content: 'console.log("hello")',
    };

    let currentContent: string | null = initialFile.content;

    const artifact: Artifact<typeof GitFile> = {
      ref: { uri: 'file-001' },
      get: withExpectOutput(async () =>
        currentContent === null
          ? null
          : {
              ...initialFile,
              content: currentContent,
            },
      ),
      set: async () => {
        currentContent = 'console.log("updated")';
        return { ...initialFile, content: currentContent };
      },
      del: async () => {
        currentContent = null;
      },
    };

    when('calling get()', () => {
      then('it should return the initial GitFile content', async () => {
        const result = await artifact.get();
        expect(result?.content).toBe('console.log("hello")');
      });
    });

    when('calling set()', () => {
      then('it should update and return the modified GitFile', async () => {
        const result = await artifact.set({
          content: 'console.log("updated")',
        });
        expect(result.content).toBe('console.log("updated")');
      });
    });

    when('calling del()', () => {
      then('it should remove the content (get returns null)', async () => {
        await artifact.del();
        const result = await artifact.get();
        expect(result).toBeNull();
      });
    });
  });

  given('an Artifact<GitRepo>', () => {
    const commitA = new GitCommit({
      message: 'initial commit',
      hash: 'abc123',
    });

    const commitB = new GitCommit({
      message: 'add feature',
      hash: 'def456',
    });

    const initialRepo: GitRepo = new GitRepo({
      slug: 'example-repo',
      local: {
        uri: 'file:///tmp/example-repo',
        branch: 'feature-xyz',
        commit: commitA,
        diffed: [],
        staged: [],
      },
      remote: {
        uri: 'https://github.com/example/repo.git',
        trunk: 'main',
        commit: commitA,
      },
    });

    let localCommit: GitCommit | null = commitA;

    const artifact: Artifact<typeof GitRepo> = {
      ref: { slug: 'repo-001' },
      get: withExpectOutput(async () =>
        localCommit === null
          ? null
          : new GitRepo({
              ...initialRepo,
              local: { ...initialRepo.local, commit: localCommit },
            }),
      ),
      set: async () => {
        localCommit = commitB;
        return new GitRepo({
          ...initialRepo,
          local: { ...initialRepo.local, commit: localCommit },
        });
      },
      del: async () => {
        localCommit = null;
      },
    };

    when('calling get()', () => {
      then('it should return the repo with the original commit', async () => {
        const result = await artifact.get();
        expect(result?.local.commit.hash).toBe('abc123');
      });
    });

    when('calling set()', () => {
      then('it should update the local commit of the repo', async () => {
        const result = await artifact.set({ content: 'def456' });
        expect(result.local.commit.hash).toBe('def456');
      });
    });

    when('calling del()', () => {
      then('it should remove the repo (get returns null)', async () => {
        await artifact.del();
        const result = await artifact.get();
        expect(result).toBeNull();
      });
    });
  });
});
