import { enrollThread, genRoleSkill } from 'rhachet';
import { genArtifactGitFile, getArtifactObsDir } from 'rhachet-artifact-git';

import { genContextLogTrail } from '../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../.test/getContextOpenAI';
import { thisPonderCatalog } from './ponder.catalog';
import { BRIEFS_FOR_ARTICULATE } from './stepArticulate';
import { loopsArticulateWithPonder } from './stepArticulate.withPonder';

export const SKILL_ARTICULATE = genRoleSkill({
  slug: 'articulate',
  route: loopsArticulateWithPonder,
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
        'foci.articulate.context': genArtifactGitFile(
          { uri: obsDir + '.foci.articulate.context.md' },
          { versions: true },
        ),
        'foci.articulate.concept': genArtifactGitFile(
          { uri: obsDir + '.foci.articulate.concept.md' },
          { versions: true },
        ),
        'foci.ponder.que.context': genArtifactGitFile(
          { uri: obsDir + '.foci.ponder.que.context.md' },
          { versions: true },
        ),
        'foci.ponder.que.concept': genArtifactGitFile(
          { uri: obsDir + '.foci.ponder.que.concept.md' },
          { versions: true },
        ),
        'foci.ponder.ans.context': genArtifactGitFile(
          { uri: obsDir + '.foci.ponder.ans.context.md' },
          { versions: true },
        ),
        'foci.ponder.ans.concept': genArtifactGitFile(
          { uri: obsDir + '.foci.ponder.ans.concept.md' },
          { versions: true },
        ),
        'ponder.output': genArtifactGitFile(
          { uri: obsDir + '.ponder.output.md' },
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

      await artifacts['foci.ponder.que.concept'].set({
        content: JSON.stringify(thisPonderCatalog.conceptualize, null, 2),
      });
      await artifacts['foci.ponder.que.context'].set({
        content: JSON.stringify(thisPonderCatalog.contextualize, null, 2),
      });

      return {
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: input.ask,
            art: {
              'foci.goal.concept': artifacts.goal,
              'foci.goal.context': artifacts.goal,
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
              'foci.articulate.context': artifacts['foci.articulate.context'],
              'foci.articulate.concept': artifacts['foci.articulate.concept'],
              'foci.ponder.ans.context': artifacts['foci.ponder.ans.context'],
              'foci.ponder.ans.concept': artifacts['foci.ponder.ans.concept'],
              'foci.ponder.que.context': artifacts['foci.ponder.que.context'],
              'foci.ponder.que.concept': artifacts['foci.ponder.que.concept'],
            },
            briefs: [
              ...artifacts.briefs,
              ...BRIEFS_FOR_ARTICULATE, // flow the articulate briefs down so that <ponder> has them in context too; this approach does cause duplicate briefs for articulate, but thats no biggie
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
