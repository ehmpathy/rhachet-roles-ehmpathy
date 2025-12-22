import { glob } from 'fast-glob';
import { enrollThread, genContextStitchTrail, genRoleSkill } from 'rhachet';
import { genArtifactGitFile, getArtifactObsDir } from 'rhachet-artifact-git';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { getContextOpenAI } from '@src/.test/getContextOpenAI';
import { setSkillOutputSrc } from '@src/domain.operations/artifact/setSkillOutputSrc';
import { genStitchStreamToDisk } from '@src/domain.operations/context/genStitchStreamToDisk';

import { loopCatalogize } from './stepCatalogize';

export const SKILL_CATALOGIZE = genRoleSkill({
  slug: 'catalogize',
  route: loopCatalogize,
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
      goal: string;
      references: string;
      briefs: string;
      ask: string;
    } => typeof input.output === 'string',
    instantiate: async (input: {
      output: string;
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
        references: (
          await Promise.all(
            input.references
              ?.split(',')
              .filter((uri) => !!uri)
              .map(async (pattern) => await glob(pattern)) ?? [], // support glob references
          )
        )
          .flat()
          .map((reference) =>
            genArtifactGitFile({ uri: reference }, { access: 'readonly' }),
          ),
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

      // add an src file for historic record
      await setSkillOutputSrc({ skillUri: 'bhrain.catalogize', opts: input }); // todo: get skillUri from context

      return {
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: '',
            art: {
              'foci.goal.concept': artifacts.goal.concept,
              'foci.goal.context': artifacts.goal.context,
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
        ...genContextStitchTrail({
          stream: genStitchStreamToDisk({ dir: process.cwd() }), // stream events to disk
        }),
      };
    },
  },
  readme: '',
});
