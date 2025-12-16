import { enrollThread, type GStitcherOf, RoleSkill } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';

import { genContextLogTrail } from '@src/logic/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/logic/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/logic/.test/getContextOpenAI';
import { asDotRhachetDir } from '@src/logic/roles/artifact/asDotRhachetFile';
import { getMechanicBrief } from '@src/logic/roles/ecologist/mechanic/getMechanicBrief';

import { loopCollectTermUsecases } from './stepCollectUsecases';

export const SKILL_DOMAIN_TERM_COLLECT_USECASES = RoleSkill.build<
  RoleSkill<GStitcherOf<typeof loopCollectTermUsecases>>
>({
  slug: 'domain.term.usecases.collect',
  route: loopCollectTermUsecases,
  threads: {
    lookup: {
      target: {
        source: 'process.argv',
        char: 't',
        desc: 'the target file or dir to write against',
        type: 'string',
      },
    },
    assess: (input): input is { target: string; ask: string } =>
      typeof input.target === 'string',
    instantiate: async (input: {
      target: string;
      ask: string;
    }): Promise<GStitcherOf<typeof loopCollectTermUsecases>['threads']> => {
      const targetArt = genArtifactGitFile(
        { uri: input.target },
        { versions: true },
      );
      const feedbackArt = genArtifactGitFile(
        { uri: asDotRhachetDir(input.target) + '/feedback.md' },
        { versions: true },
      );
      return {
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: input.ask,
            art: { feedback: feedbackArt },
          },
        }),
        student: await enrollThread({
          role: 'student',
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
    }): GStitcherOf<typeof loopCollectTermUsecases>['context'] => {
      return {
        ...getContextOpenAI(), // todo: use the input api key
        ...genContextLogTrail(), // todo: passthrough ?
        ...genContextStitchTrail(),
      };
    },
  },
  readme: `
### \`ask -r ecologist -s domain.term.usecases.collect \`

\`\`\`sh
npx rhachet ask -r ecologist -s domain.term.usecases.collect -t ./path/to/file.ts --ask "your ask"
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
