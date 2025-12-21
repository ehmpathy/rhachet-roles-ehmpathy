import { enrollThread, genRoleSkill } from 'rhachet';
import { genArtifactGitFile, getArtifactObsDir } from 'rhachet-artifact-git';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/.test/getContextOpenAI';

import { BRIEFS_FOR_CLUSTER, loopCluster } from './stepCluster';

export const SKILL_CLUSTER = genRoleSkill({
  slug: 'cluster',
  route: loopCluster,
  threads: {
    lookup: {
      output: {
        source: 'process.argv',
        char: 'o',
        desc: 'the output file to write against',
        type: 'string',
      },
      input: {
        source: 'process.argv',
        char: 'i',
        desc: 'the input file to seed from',
        type: 'string',
      },
      goal: {
        source: 'process.argv',
        char: 'g',
        desc: 'the goal of the request',
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
      output: string;
      input: string;
      goal: string;
      references: string;
      briefs: string;
      ask: string;
    } => typeof input.output === 'string',
    instantiate: async (input: {
      output: string;
      input: string;
      goal: string;
      references: string;
      briefs: string;
      ask: string;
    }) => {
      // declare where all the artifacts will be found
      const obsDir = getArtifactObsDir({ uri: input.output });
      const artifacts = {
        goal: {
          concept: genArtifactGitFile(
            { uri: obsDir + '.goal.concept.md' },
            { versions: true },
          ),
          context: genArtifactGitFile(
            { uri: obsDir + '.goal.context.md' },
            { versions: true },
          ),
        },
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
        input: genArtifactGitFile({ uri: input.input }, { versions: true }),
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

      // detect the goal of the caller
      const goalConcept: string = await (async () => {
        // if goal explicitly defined, use it
        if (input.goal)
          return (
            (
              await genArtifactGitFile(
                { uri: input.goal },
                { access: 'readonly' },
              ).get()
            )?.content ?? input.ask
          );

        // otherwise, assume its the ask
        return input.ask;
      })();
      await artifacts.goal.concept.set({ content: goalConcept });

      return {
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: '',
            art: {
              'foci.goal.concept': artifacts.goal.concept,
              'foci.goal.context': artifacts.goal.context,
              'foci.input.concept': artifacts.input,
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
              ...BRIEFS_FOR_CLUSTER, // flow the cluster briefs down so that <ponder> has them in context too; this approach does cause duplicate briefs for cluster, but thats no biggie
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
