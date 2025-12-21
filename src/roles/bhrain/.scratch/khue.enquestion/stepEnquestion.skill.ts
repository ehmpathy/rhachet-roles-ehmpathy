import { enrollThread, genRoleSkill } from 'rhachet';
import { genArtifactGitFile, getArtifactObsDir } from 'rhachet-artifact-git';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/.test/getContextOpenAI';

import { enquestionPonderCatalog } from './ponder.catalog';
import { loopEnquestion } from './stepEnquestion';

export const SKILL_ENQUESTION = genRoleSkill({
  slug: 'enquestion',
  route: loopEnquestion,
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
    },
    assess: (
      input,
    ): input is {
      target: string;
      goal: string;
      references: string;
      ask: string;
    } => typeof input.target === 'string',
    instantiate: async (input: {
      target: string;
      goal: string;
      references: string;
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
          { uri: obsDir + '.ponder.context.md' },
          { versions: true },
        ),
        'ponder.concept': genArtifactGitFile(
          { uri: obsDir + '.ponder.concept.md' },
          { versions: true },
        ),
        references:
          input.references
            ?.split(',')
            .filter((uri) => !!uri) // allows , // todo: support optional vars
            .map((reference) =>
              genArtifactGitFile({ uri: reference }, { access: 'readonly' }),
            ) ?? [],
      };

      // todo: if ponder artifacts already exist, dont overwrite; for now, we assume they'll never exist
      await artifacts['ponder.concept'].set({
        content: JSON.stringify(
          enquestionPonderCatalog.conceptualize.P0,
          null,
          2,
        ),
      });
      await artifacts['ponder.context'].set({
        content: JSON.stringify(
          enquestionPonderCatalog.contextualize.P0,
          null,
          2,
        ),
      });

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
