import { enrollThread, type GStitcherOf, RoleSkill } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/.test/getContextOpenAI';
import { getRefOrgPatterns } from '@src/roles/mechanic/.scratch/brain.atomic/codediff/getRefOrgPatterns';
import { routeMechanicCodePropose } from '@src/roles/mechanic/.scratch/brain.atomic/codediff/routeMechanicCodePropose';
import { getMechanicBrief } from '@src/roles/mechanic/getMechanicBrief';

export const SKILL_CODE_PROPOSE: RoleSkill<
  GStitcherOf<typeof routeMechanicCodePropose>
> = RoleSkill.build<RoleSkill<GStitcherOf<typeof routeMechanicCodePropose>>>({
  slug: 'code.propose', // crafts some code
  route: routeMechanicCodePropose,
  // : {
  //   target: {
  //     char: 't',
  //     desc: 'the target file or dir to upsert against',
  //     shape: 'string',
  //   },
  // },
  threads: {
    lookup: {
      target: {
        source: 'process.argv',
        char: 't',
        desc: 'the target file or dir to upsert against',
        type: 'string',
      },
    },
    assess: (input): input is { target: string; ask: string } =>
      typeof input.target === 'string',
    instantiate: async (input: {
      target: string;
      ask: string;
    }): Promise<GStitcherOf<typeof routeMechanicCodePropose>['threads']> => {
      const targetArt = genArtifactGitFile({ uri: input.target });
      const claimsArt = genArtifactGitFile({
        uri: input.target + '.rhachet.claims.md', // todo: namespace within a .rhachet directory
      });
      const feedbackArt = genArtifactGitFile({
        uri: input.target + '.rhachet.feedback.md',
      });
      const feedbackCodestyleArt = genArtifactGitFile({
        uri: input.target + '.rhachet.feedback.codestyle.md',
      });
      const judgementArt = genArtifactGitFile({
        uri: input.target + '.rhachet.judgement.md',
      });
      return {
        artist: await enrollThread({
          role: 'artist',
          stash: {
            ask: input.ask,
            art: { inflight: targetArt },
            org: {
              patterns: getRefOrgPatterns({ purpose: 'produce' }),
            },
            scene: { coderefs: [] },
          },
          inherit: {
            traits: [getMechanicBrief('style.compressed.md')],
          },
        }),
        critic: await enrollThread({
          role: 'critic',
          stash: {
            art: {
              feedback: feedbackArt,
              feedbackCodestyle: feedbackCodestyleArt,
            },
            org: {
              patterns: getRefOrgPatterns({ purpose: 'produce' }),
            },
          },
          inherit: {
            traits: [getMechanicBrief('style.compressed.md')],
          },
        }),
        student: await enrollThread({
          role: 'student',
          stash: { art: { claims: claimsArt } },
        }),
        judge: await enrollThread({
          role: 'judge',
          stash: { art: { judgement: judgementArt } },
        }),
        mechanic: await enrollThread({
          role: 'mechanic',
          stash: {},
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
    instantiate: (input: {
      apiKeyOpenai: string;
    }): GStitcherOf<typeof routeMechanicCodePropose>['context'] => {
      return {
        ...getContextOpenAI(), // todo: use the input api key
        ...genContextLogTrail(), // todo: passthrough ?
        ...genContextStitchTrail(),
      };
    },
  },
  readme: `
### \`ask -r mechanic -s code.propose\`

you can ask the mechanic to upsert the code in a target file or dir
- if it exists, it'll update
- if it doesn't, it'll create


\`\`\`sh
npx rhachet ask -r mechanic -s code.propose -t ./path/to/file.ts --ask "your ask"
\`\`\`

\`\`\`sh
npx rhachet ask \
--role mechanic \
--skill upsert \
--target ./path/to/file.ts \
"your ask"
\`\`\`

once it's self reviewed, it'll ask you for feedback

\`\`\`sh
? have notes? (Use arrow keys)
❯ no notes
yes notes
\`\`\`

it'll loop until you tell it you have \`no notes\`
`.trim(),
});
