import { enrollThread, type GStitcherOf, RoleSkill } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';

import { genContextLogTrail } from '@src/logic/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/logic/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/logic/.test/getContextOpenAI';
import { asDotRhachetDir } from '@src/roles/artifact/asDotRhachetFile';
import { getMechanicBrief } from '@src/roles/ecologist/mechanic/getMechanicBrief';

import { loopStudyDomain } from './loopStudyDomain';

export const SKILL_STUDY_DOMAIN = RoleSkill.build<
  RoleSkill<GStitcherOf<typeof loopStudyDomain>>
>({
  slug: 'domain.study',
  route: loopStudyDomain,
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
    }): Promise<GStitcherOf<typeof loopStudyDomain>['threads']> => {
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
            art: { domain: targetArt },
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
    }): GStitcherOf<typeof loopStudyDomain>['context'] => {
      return {
        ...getContextOpenAI(), // todo: use the input api key
        ...genContextLogTrail(), // todo: passthrough ?
        ...genContextStitchTrail(),
      };
    },
  },
  readme: `
### \`ask -r ecologist -s study.domain\`

you can ask the mechanic to write anything to a target file
- if it exists, it'll update
- if it doesn't, it'll create


\`\`\`sh
npx rhachet ask -r ecologist -s study.domain -t ./path/to/file.ts --ask "your ask"
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
