import { GStitcherOf, enrollThread, genRoleSkill } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';

import { genContextLogTrail } from '../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../.test/getContextOpenAI';
import { asDotRhachetDir } from '../../../artifact/asDotRhachetFile';
import { getMechanicBrief } from '../getMechanicBrief';
import { loopWrite } from './loopWrite';

export const SKILL_WRITE = genRoleSkill({
  slug: 'write',
  route: loopWrite,
  threads: {
    lookup: {
      target: {
        source: 'process.argv',
        char: 't',
        desc: 'the target file or dir to write against',
        type: 'string',
      },
      references: {
        source: 'process.argv',
        char: 'f',
        desc: 'reference files to to use',
        type: '?string', // todo: string []
      },
    },
    assess: (
      input,
    ): input is { target: string; references: string; ask: string } =>
      typeof input.target === 'string',
    instantiate: async (input: {
      target: string;
      references?: string;
      ask: string;
    }): Promise<GStitcherOf<typeof loopWrite>['threads']> => {
      const targetArt = genArtifactGitFile(
        { uri: input.target },
        { versions: true },
      );
      const feedbackArt = genArtifactGitFile(
        { uri: asDotRhachetDir(input.target) + '.feedback.md' },
        { versions: true },
      );
      const referenceArts =
        input.references
          ?.split(',')
          .filter((uri) => !!uri) // allows , // todo: support optional vars
          .map((reference) =>
            genArtifactGitFile({ uri: reference }, { access: 'readonly' }),
          ) ?? [];
      return {
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: input.ask,
            art: { feedback: feedbackArt, references: referenceArts },
          },
        }),
        mechanic: await enrollThread({
          role: 'mechanic',
          stash: {
            ask: input.ask,
            art: { inflight: targetArt },
          },
          inherit: {
            traits: [getMechanicBrief('style.compressed.md')],
          },
        }),
      };
    },
  },
  context: {
    lookup: {
      apiKeyOpenai: {
        source: 'process.env',
        envar: 'PREP_OPENAI_KEY',
        desc: 'the openai key to use',
        type: 'string',
      },
    },
    assess: (input): input is { apiKeyOpenai: string } =>
      typeof input.apiKeyOpenai === 'string',
    instantiate: (input: {
      apiKeyOpenai: string;
    }): GStitcherOf<typeof loopWrite>['context'] => {
      return {
        ...getContextOpenAI(), // todo: use the input api key
        ...genContextLogTrail(), // todo: passthrough ?
        ...genContextStitchTrail(),
      };
    },
  },
  readme: `
### \`ask -r mechanic -s write\`

you can ask the mechanic to write anything to a target file
- if it exists, it'll update
- if it doesn't, it'll create


\`\`\`sh
npx rhachet ask -r mechanic -s write -t ./path/to/file.ts --ask "your ask"
\`\`\`

once it's written, it'll ask you for feedback

\`\`\`sh
? have notes? (Use arrow keys)
❯ no notes
yes notes
\`\`\`

it'll loop until you tell it you have \`no notes\`
`.trim(),
});
