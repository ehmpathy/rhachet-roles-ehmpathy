import { enrollThread, genRoleSkill } from 'rhachet';
import { genArtifactGitFile, getArtifactObsDir } from 'rhachet-artifact-git';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/.test/getContextOpenAI';

import { BRIEFS_FOR_DIVERGE, loopDiverge } from './stepDiverge';

export const SKILL_DIVERGE = genRoleSkill({
  slug: 'diverge',
  route: loopDiverge,
  threads: {
    lookup: {
      target: {
        source: 'process.argv',
        char: 't',
        desc: 'the target file or dir to write against',
        type: 'string',
      },
      goal: {
        source: 'process.argv',
        char: 'g',
        desc: 'the goal to use; if not specified, assumes ask is goal',
        type: '?string',
      },
      references: {
        source: 'process.argv',
        char: 'f',
        desc: 'reference files to to use, if any; delimit with commas',
        type: '?string',
      },
      briefs: {
        source: 'process.argv',
        char: 'b',
        desc: 'brief files to to use, if any; delimit with commas',
        type: '?string',
      },
    },
    assess: (
      input,
    ): input is {
      target: string;
      goal: string;
      references: string;
      briefs: string;
      ask: string;
    } => typeof input.target === 'string',
    instantiate: async (input: {
      target: string;
      goal: string;
      references: string;
      briefs: string;
      ask: string;
    }) => {
      const obsDir = getArtifactObsDir({ uri: input.target });
      const artifacts = {
        goal: await (async () => {
          if (input.goal)
            return genArtifactGitFile(
              { uri: input.goal },
              { access: 'readonly' },
            );

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
          { uri: input.target },
          { versions: true },
        ),
        references:
          input.references
            ?.split(',')
            .filter((uri) => !!uri)
            .map((reference) =>
              genArtifactGitFile({ uri: reference }, { access: 'readonly' }),
            ) ?? [],
        briefs:
          input.briefs
            ?.split(',')
            .filter((uri) => !!uri)
            .map((brief) =>
              genArtifactGitFile({ uri: brief }, { access: 'readonly' }),
            ) ?? [],
      };

      return {
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: input.ask,
            art: {
              'foci.goal.concept': artifacts.goal,
              'foci.goal.context': artifacts.goal, // todo: compile their context
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
            },
            briefs: [
              ...artifacts.briefs,
              ...BRIEFS_FOR_DIVERGE, // flow the diverge briefs down so that <ponder> has them in context too; this approach does cause duplicate briefs for diverge, but thats no biggie
            ],
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
