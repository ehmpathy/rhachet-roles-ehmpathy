import { enrollThread, type GStitcherOf, genRoleSkill } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';

import { genContextLogTrail } from '@src/domain.operations/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/domain.operations/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/domain.operations/.test/getContextOpenAI';

import { loopEndialogue } from './stepEndialogue';

export const SKILL_ENDIALOGUE = genRoleSkill({
  slug: 'endialogue',
  route: loopEndialogue,
  threads: {
    lookup: {
      journal: {
        source: 'process.argv',
        char: 't',
        desc: 'the target file or dir to write against',
        type: 'string',
      },
    },
    assess: (
      input,
    ): input is {
      journal: string;
      ask: string;
    } => typeof input.journal === 'string',
    instantiate: async (input: {
      journal: string;
      ask: string;
    }): Promise<GStitcherOf<typeof loopEndialogue>['threads']> => {
      const journalArt = genArtifactGitFile(
        { uri: input.journal },
        { versions: true },
      );
      await journalArt.set({ content: '' }); // clear the journal
      const feedbackArt = genArtifactGitFile(
        { uri: input.journal + '.feedback.md' },
        { versions: true },
      );
      await feedbackArt.set({ content: '' }); // clear the feedback
      const summaryArt = genArtifactGitFile(
        { uri: input.journal + '.summary.md' },
        { versions: true },
      );
      await summaryArt.set({ content: '' }); // clear the summary
      return {
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: input.ask,
            art: { feedback: feedbackArt },
          },
        }),
        thinker: await enrollThread({
          role: 'thinker',
          stash: { art: { journal: journalArt } },
        }),
        summarizer: await enrollThread({
          role: 'summarizer',
          stash: { art: { summary: summaryArt } },
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
    instantiate: (): GStitcherOf<typeof loopEndialogue>['context'] => {
      return {
        ...getContextOpenAI(), // todo: use the input api key
        ...genContextLogTrail(), // todo: passthrough ?
        ...genContextStitchTrail(),
      };
    },
  },
  readme: 'todo',
});
