import { enrollThread, genRoleSkill } from 'rhachet';
import { genArtifactGitFile, getArtifactObsDir } from 'rhachet-artifact-git';

import { genContextLogTrail } from '../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../.test/getContextOpenAI';
import { loopPonder } from './stepPonder';

export const SKILL_PONDER = genRoleSkill({
  slug: 'ponder',
  route: loopPonder,
  threads: {
    lookup: {
      goal: {
        source: 'process.argv',
        char: 'g',
        desc: 'the goal to use; if not specified, assumes ask is goal',
        type: '?string',
      },
      target: {
        source: 'process.argv',
        char: 't',
        desc: 'the target file or dir to write against',
        type: 'string',
      },
      references: {
        source: 'process.argv',
        char: 'f',
        desc: 'reference files to to use, if any; delimit with commas',
        type: '?string', // todo: string []
      },
      briefs: {
        source: 'process.argv',
        char: 'b',
        desc: 'brief files to to use, if any; delimit with commas',
        type: '?string', // todo: string []
      },
      'ponder.context': {
        source: 'process.argv',
        char: 'u', // todo: drop
        desc: 'the context ponder questions artifact path',
        type: 'string',
      },
      'ponder.concept': {
        source: 'process.argv',
        char: 'v', // todo: drop
        desc: 'the concept ponder questions artifact path',
        type: 'string',
      },
    },
    assess: (
      input,
    ): input is {
      goal: string;
      target: string;
      references: string;
      briefs: string;
      'ponder.context': string;
      'ponder.concept': string;
      ask: string;
    } => typeof input.target === 'string',
    instantiate: async (input: {
      goal: string;
      target: string;
      references: string;
      briefs: string;
      'ponder.context': string;
      'ponder.concept': string;
      ask: string;
    }) => {
      const obsDir = getArtifactObsDir({ uri: input.target });
      const artifacts = {
        goal: await (async () => {
          // if the goal was explicitly declared, use it
          if (input.goal)
            return genArtifactGitFile(
              { uri: input.goal },
              { access: 'readonly' }, // dont risk overwriting their goal artifact
            );

          // otherwise, since goal was not explicitly set, then infer that the ask is the goal
          const art = genArtifactGitFile(
            { uri: obsDir + '.goal.md' },
            { versions: true },
          );
          await art.set({ content: input.ask });
          return art;
        })(),
        feedback: genArtifactGitFile(
          { uri: obsDir + '.feedback.md' },
          { versions: true },
        ),
        'focus.context': genArtifactGitFile(
          { uri: obsDir + '.focus.context.md' },
          { versions: true },
        ),
        'focus.concept': genArtifactGitFile(
          { uri: input.target }, // ?: recall: focus.concept === input.target
          { versions: true },
        ),
        'ponder.context': genArtifactGitFile(
          { uri: input['ponder.context'] },
          { access: 'readonly' },
        ),
        'ponder.concept': genArtifactGitFile(
          { uri: input['ponder.concept'] },
          { access: 'readonly' },
        ),
        references:
          input.references
            ?.split(',')
            .filter((uri) => !!uri) // allows , // todo: support optional vars
            .map((reference) =>
              genArtifactGitFile({ uri: reference }, { access: 'readonly' }),
            ) ?? [],
        briefs:
          input.briefs
            ?.split(',')
            .filter((uri) => !!uri) // allows , // todo: support optional vars
            .map((brief) =>
              genArtifactGitFile({ uri: brief }, { access: 'readonly' }),
            ) ?? [],
      };

      // and return the threads
      return {
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: input.ask,
            art: {
              goal: artifacts.goal,
              feedback: artifacts.feedback,
            },
            refs: artifacts.references,
          },
        }),
        thinker: await enrollThread({
          role: 'thinker',
          stash: {
            art: {
              'focus.context': artifacts['focus.context'],
              'focus.concept': artifacts['focus.concept'],
              'ponder.context': artifacts['ponder.context'],
              'ponder.concept': artifacts['ponder.concept'],
            },
            briefs: [],
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
        ...getContextOpenAI(),
        ...genContextLogTrail(),
        ...genContextStitchTrail(),
      };
    },
  },
  readme: '',
});
