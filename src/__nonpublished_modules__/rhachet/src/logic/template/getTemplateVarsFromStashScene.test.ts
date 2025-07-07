import { getError } from 'helpful-errors';
import { given, then } from 'test-fns';

import {
  genArtifactGitFile,
  GitFile,
} from '../../../../rhachet-artifact-git/src';
import { Artifact } from '../../domain/Artifact';
import { genThread } from '../genThread';
import { getTemplateVarsFromStashScene } from './getTemplateVarsFromStashScene';

describe('getTemplateVarsFromStashScene', () => {
  it('renders coderefs from single-thread input', async () => {
    const thread = genThread({
      role: 'artist' as const,
      stash: {
        scene: {
          coderefs: [genArtifactGitFile({ uri: __filename })],
        },
      },
    });

    const result = await getTemplateVarsFromStashScene({ thread });

    expect(result.stash.scene).toContain('getTemplateVarsFromStashScene');
    expect(result.stash.scene).toContain('```ts');
  });

  const mockArtifact = (uri: string): Artifact<typeof GitFile> => ({
    ref: { uri },
    get: async () => ({ uri, content: `// content of ${uri}`, hash: 'abc123' }),
    set: async () => ({ uri, content: '', hash: 'def456' }),
    del: async () => {},
  });

  given('a thread with stash.scene.coderefs', () => {
    const thread = genThread({
      role: 'artist' as const,
      stash: {
        scene: {
          coderefs: [mockArtifact('/src/App.tsx')],
        },
      },
    });

    then('produces a valid template string with code blocks', async () => {
      const result = await getTemplateVarsFromStashScene({ thread });
      expect(result.stash.scene).toContain('// /src/App.tsx');
      expect(result.stash.scene).toContain('```ts');
    });
  });

  given('a thread without .scene.coderefs', () => {
    const critic = genThread({ role: 'critic' as const });

    then('fails to compile at type-level', async () => {
      await getError(
        // @ts-expect-error — critic has no .scene.coderefs
        getTemplateVarsFromStashScene({ thread: critic }),
      );
    });
  });

  given('a thread with an empty coderefs array', () => {
    const thread = genThread({
      role: 'artist' as const,
      stash: {
        scene: {
          coderefs: [],
        },
      },
    });

    then('outputs empty scene string', async () => {
      const result = await getTemplateVarsFromStashScene({ thread });
      expect(result.stash.scene).toBe('');
    });
  });

  given('a coderef where get() returns null', () => {
    const nullArtifact: Artifact<typeof GitFile> = {
      ref: { uri: '/missing/file.ts' },
      get: async () => null,
      set: async () => ({ uri: '/missing/file.ts', content: '', hash: 'xxx' }),
      del: async () => {},
    };

    const thread = genThread({
      role: 'artist' as const,
      stash: {
        scene: {
          coderefs: [nullArtifact],
        },
      },
    });

    then('throws if artifact.get() returns null', async () => {
      await expect(() =>
        getTemplateVarsFromStashScene({ thread }),
      ).rejects.toThrow('coderef artifact does not exist');
    });
  });
});
