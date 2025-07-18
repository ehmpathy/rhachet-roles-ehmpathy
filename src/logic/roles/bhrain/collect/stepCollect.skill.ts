import { enrollThread, genRoleSkill } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';

import { genContextLogTrail } from '../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../.test/getContextOpenAI';
import { asDotRhachetDir } from '../../../artifact/asDotRhachetFile';
import { loopClarify } from './stepCollect';

export const SKILL_CLARIFY = genRoleSkill({
  slug: 'clarify',
  route: loopClarify,
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
    instantiate: async (input: { target: string; ask: string }) => {
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
        thinker: await enrollThread({
          role: 'thinker',
          stash: {
            art: { inflight: targetArt },
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
    instantiate: () => {
      return {
        ...getContextOpenAI(), // todo: use the input api key
        ...genContextLogTrail(), // todo: passthrough ?
        ...genContextStitchTrail(),
      };
    },
  },
  readme: '',
});
