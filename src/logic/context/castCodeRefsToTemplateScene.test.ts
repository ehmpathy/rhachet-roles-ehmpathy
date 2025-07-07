import { getError } from 'helpful-errors';
import { Threads } from 'rhachet';
import { given, then } from 'test-fns';
import { Empty } from 'type-fns';

import {
  genArtifactGitFile,
  GitFile,
} from '../../__nonpublished_modules__/rhachet-artifact-git/src';
import { Artifact } from '../../__nonpublished_modules__/rhachet/src/domain/Artifact';
import { genThread } from '../../__nonpublished_modules__/rhachet/src/logic/genThread';
import { castCodeRefsToTemplateScene } from './castCodeRefsToTemplateScene';

describe('castCodeRefsToTemplateScene', () => {
  it('renders coderefs as markdown ts blocks from dynamic stitchee', async () => {
    const threads = {
      artist: genThread({
        role: 'artist' as const,
        stash: {
          scene: {
            coderefs: [genArtifactGitFile({ uri: __filename })],
          },
        },
      }),
    };

    const result = await castCodeRefsToTemplateScene({
      threads,
      stitchee: 'artist',
    });

    expect(result).toContain('castCodeRefsToTemplateScene');
  });

  const mockArtifact = (uri: string): Artifact<typeof GitFile> => ({
    ref: { uri },
    get: async () => ({ uri, content: `// content of ${uri}`, hash: 'abc123' }),
    set: async () => ({ uri, content: '', hash: 'def456' }),
    del: async () => {},
  });

  given(
    'Threads<{ artist, critic }> where only artist has .scene.coderefs',
    () => {
      type MyThreads = Threads<{
        artist: {
          stash: {
            ask: string;
            art: { claim: Artifact<typeof GitFile> };
            scene: { coderefs: Artifact<typeof GitFile>[] };
          };
        };
        critic: Empty;
      }>;

      const threads: MyThreads = {
        artist: genThread({
          role: 'artist' as const,
          stash: {
            ask: 'refactor to use hooks',
            art: {
              claim: mockArtifact('/src/App.tsx'),
            },
            scene: {
              coderefs: [mockArtifact('/src/App.tsx')],
            },
          },
        }),
        critic: genThread({ role: 'critic' as const }),
      };

      then('compiles and runs when stitchee is artist', async () => {
        const result = await castCodeRefsToTemplateScene({
          threads,
          stitchee: 'artist',
        });

        expect(result).toContain('// /src/App.tsx');
        expect(result).toContain('```ts');
      });

      then('fails to compile when stitchee is critic', async () => {
        await getError(
          // @ts-expect-error — critic has no .scene.coderefs
          castCodeRefsToTemplateScene({ threads, stitchee: 'critic' }),
        );
      });

      then('fails to compile for nonexistent stitchee', async () => {
        await getError(
          // @ts-expect-error — "mechanic" is not in the thread type
          castCodeRefsToTemplateScene({ threads, stitchee: 'mechanic' }),
        );
      });
    },
  );
});
