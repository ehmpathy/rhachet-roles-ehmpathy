import { RoleSkill, GStitcherOf, enrollThread } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';

import { genContextLogTrail } from '../../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../../.test/getContextOpenAI';
import { asDotRhachetDir } from '../../../../artifact/asDotRhachetFile';
import { getMechanicBrief } from '../../../mechanic/getMechanicBrief';
import { loopDistillTerm } from './stepDistillTerm';

export const SKILL_DOMAIN_TERM_DISTILL = RoleSkill.build<
  RoleSkill<GStitcherOf<typeof loopDistillTerm>>
>({
  slug: 'domain.term.distill',
  route: loopDistillTerm,
  threads: {
    lookup: {
      target: {
        source: 'process.argv',
        char: 't',
        desc: 'the target file or dir to write against',
        type: 'string',
      },
      usecases: {
        source: 'process.argv',
        char: 'u',
        desc: 'the term.usecases file to reference, readonly',
        type: 'string',
      },
    },
    assess: (input): input is { target: string; ask: string } =>
      typeof input.target === 'string',
    instantiate: async (input: {
      target: string;
      usecases: string;
      ask: string;
    }): Promise<GStitcherOf<typeof loopDistillTerm>['threads']> => {
      const targetArt = genArtifactGitFile(
        { uri: input.target },
        { versions: true },
      );
      const usecasesArt = genArtifactGitFile(
        { uri: input.usecases },
        { access: 'readonly' },
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
            art: { feedback: feedbackArt, usecases: usecasesArt },
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
    instantiate: (): GStitcherOf<typeof loopDistillTerm>['context'] => {
      return {
        ...getContextOpenAI(), // todo: use the input api key
        ...genContextLogTrail(), // todo: passthrough ?
        ...genContextStitchTrail(),
      };
    },
  },
  readme: `
### \`ask -r ecologist -s domain.term.distill \`

\`\`\`sh
npx rhachet ask -r ecologist -s domain.term.distill -t ./path/to/file.ts -u ./path/to/file.ts --ask "your ask"
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
