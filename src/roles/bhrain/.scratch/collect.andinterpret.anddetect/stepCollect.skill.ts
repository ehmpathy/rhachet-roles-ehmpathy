import { enrollThread, genRoleSkill } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/.test/getContextOpenAI';
import { asDotRhachetDir } from '@src/domain.operations/artifact/asDotRhachetFile';

import { loopCollect } from './stepCollect';

const GRAMMAR_DEFAULT_DISTILISYS = `

structure:
@[actor]<mechanism> -> [resource] -> {drive:<<effect>>[motive]}

standards:
- all <verb>s should be declared as <mechanism>s
- all [noun]s should be declared as [resource]s
- all <mechanism>s should be prefixed with their root operation
  - <get> for reads
  - <set> for dobj mutations
  - <rec> for event emissions
- use <mechanism>[resource] syntax for brevity, when applicable
- scope [resources] within [domain]s when needed for specificity
  - [domain][resource]
- leverage [resources] .attributes when needed
  - [resource].attribute

`.trim();

export const SKILL_COLLECT = genRoleSkill({
  slug: 'collect',
  route: loopCollect,
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
            grammar: GRAMMAR_DEFAULT_DISTILISYS,
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
