import { enrollThread, genRoleSkill } from 'rhachet';
import { genArtifactGitFile, getArtifactObsDir } from 'rhachet-artifact-git';

import { genContextLogTrail } from '../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../.test/getContextOpenAI';
import { loopArticulate } from './stepArticulate';

export const SKILL_ARTICULATE = genRoleSkill({
  slug: 'articulate',
  route: loopArticulate,
  threads: {
    lookup: {
      output: {
        source: 'process.argv',
        char: 'o',
        desc: 'the output file to write against',
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
      templates: {
        source: 'process.argv',
        char: 'z', // todo: support undefined
        desc: 'template files to to use, if any; delimit with commas',
        type: '?string',
      },
    },
    assess: (
      input,
    ): input is {
      output: string;
      goal: string;
      references: string;
      briefs: string;
      templates?: string;
      ask: string;
    } => typeof input.target === 'string',
    instantiate: async (input: {
      output: string;
      goal: string;
      references: string;
      briefs: string;
      templates?: string;
      ask: string;
    }) => {
      const obsDir = getArtifactObsDir({ uri: input.output });
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
          { uri: input.output },
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
        templates:
          input.templates
            ?.split(',')
            .filter((uri) => !!uri)
            .map((template) =>
              genArtifactGitFile({ uri: template }, { access: 'readonly' }),
            ) ?? [],
      };

      return {
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: input.ask,
            art: {
              'foci.goal.concept': artifacts.goal,
              'foci.goal.context': artifacts.goal,
              feedback: artifacts.feedback,
              templates: artifacts.templates,
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
            briefs: artifacts.briefs,
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
