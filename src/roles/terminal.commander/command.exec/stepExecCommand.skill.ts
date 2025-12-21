import { enrollThread, genContextStitchTrail, genRoleSkill } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { setSkillOutputSrc } from '@src/domain.operations/artifact/setSkillOutputSrc';
import { genStitchStreamToDisk } from '@src/domain.operations/context/genStitchStreamToDisk';

import { stepCommandExec } from './stepExecCommand';

export const SKILL_COMMAND_EXEC = genRoleSkill({
  slug: 'exec',
  route: stepCommandExec,
  threads: {
    lookup: {
      input: {
        source: 'process.argv',
        char: 'i',
        desc: 'path to the input artifact containing the command text',
        type: 'string',
      },
      output: {
        source: 'process.argv',
        char: 'o',
        desc: 'path to the output artifact (markdown report)',
        type: 'string',
      },
    },
    assess: (
      input,
    ): input is {
      ask: string;
      input: string;
      output: string;
    } =>
      typeof (input as any).input === 'string' &&
      typeof input.output === 'string',

    instantiate: async (input: {
      ask: string;
      input: string;
      output: string;
    }) => {
      // declare where all the artifacts will be found
      // const obsDir = getArtifactObsDir({ uri: input.output });
      const artifacts = {
        input: genArtifactGitFile({ uri: input.input }, { access: 'readonly' }),
        output: genArtifactGitFile({ uri: input.output }, { versions: true }),
      };

      // add an src file for historic record
      await setSkillOutputSrc({
        skillUri: 'commander.exec',
        opts: input,
      }).catch(() => {});

      // enroll the threads
      return {
        commander: await enrollThread({
          role: 'commander',
          stash: {
            art: {
              input: artifacts.input,
              output: artifacts.output,
            },
          },
        }),
      };
    },
  },

  // no OpenAI needed for pure command execution
  context: {
    lookup: {},
    assess: (_): _ is Record<string, never> => true,
    instantiate: () => ({
      ...genContextLogTrail(),
      ...genContextStitchTrail({
        stream: genStitchStreamToDisk({ dir: process.cwd() }), // stream events to disk
      }),
    }),
  },
  readme: '',
});
