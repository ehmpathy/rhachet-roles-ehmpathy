import {
  asStitcher,
  asStitcherFlat,
  type GStitcher,
  genStitchCycle,
  genStitchRoute,
  type RoleContext,
  StitchStepCompute,
  type Threads,
} from 'rhachet';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';
import { deSerialJSON, isSerialJSON } from 'serde-fns';
import type { Empty } from 'type-fns';

import type { ContextOpenAI } from '../../../../data/sdk/sdkOpenAi';
import { routeMechanicCodeIterate } from './routeMechanicCodeIterate';

// todo: how to extend threads? getting downstream type errors with alternative approaches.
interface ThreadsDesired
  extends Threads<{
    mechanic: RoleContext<'mechanic', Empty>;
    judge: RoleContext<
      'judge',
      {
        art: { judgement: Artifact<typeof GitFile> };
      }
    >;
    critic: RoleContext<
      'critic',
      {
        art: {
          feedback: Artifact<typeof GitFile>;
          feedbackCodestyle: Artifact<typeof GitFile>;
          // feedbackBehavior: Artifact<typeof GitFile>;
          // feedbackArchitecture: Artifact<typeof GitFile>;
        };
        org: {
          patterns: Artifact<typeof GitFile>[];
        };
      }
    >;
    artist: RoleContext<
      'artist',
      {
        ask: string;
        art: { inflight: Artifact<typeof GitFile> };
        org: { patterns: Artifact<typeof GitFile>[] };
        scene: { coderefs: Artifact<typeof GitFile>[] };
      }
    >;
    student: RoleContext<
      'student',
      {
        art: { claims: Artifact<typeof GitFile> };
      }
    >;
  }> {}

export type RouteMechanicCodeProposeStitcher = GStitcher<
  ThreadsDesired,
  GStitcher['context'] & ContextOpenAI,
  Artifact<typeof GitFile>
>;

/**
 * .what = looks at judge.judgement to decide whether to release
 */
const stepDecideRelease = new StitchStepCompute<
  GStitcher<
    ThreadsDesired,
    GStitcher['context'],
    { choice: 'release' | 'repeat' | 'halt' }
  >
>({
  form: 'COMPUTE',
  readme: null,
  slug: `[mechanic]<release?>`,
  stitchee: 'judge',
  invoke: async ({ threads }) => {
    const judgement = deSerialJSON<{ releasable: boolean }>(
      isSerialJSON.assure(
        (
          await threads.judge.context.stash.art.judgement
            .get()
            .expect('isPresent')
        ).content,
      ),
    );
    return {
      input: { judgement },
      output: {
        choice: judgement.releasable === true ? 'release' : 'repeat',
      },
    };
  },
});

/**
 * .what = cycles through iterate until releaseable
 */
const cycleMechanicCodeRelease = asStitcher(
  genStitchCycle({
    slug: '[mechanic]<code><release>',
    readme:
      '@[mechanic]<iterate> -> <releaseable?> -> { yes: release, no: repeat }',
    repeatee: routeMechanicCodeIterate,
    decider: stepDecideRelease,
    halter: {
      threshold: {
        duration: { minutes: 5 },
        repetitions: 5, // should be resolvable within 5 min
      },
    },
  }),
);

/**
 * .what = looks at the artist artifact to declare the proposal as the output stitch
 */
const stepDeclareProposal = new StitchStepCompute<
  GStitcher<ThreadsDesired, GStitcher['context'], Artifact<typeof GitFile>>
>({
  form: 'COMPUTE',
  readme: null,
  slug: `[mechanic]<declare>`,
  stitchee: 'mechanic',
  invoke: async ({ threads }) => {
    return {
      input: null,
      output: threads.artist.context.stash.art.inflight,
    };
  },
});

/**
 * .what = a route where a mechanic's threads cyclically iterate on code until releasable
 * .how.contract
 *   - input = thread(student) w/ art.claims
 *   - output =
 *      - thread(mechanic) w/ art.proposal
 * .how.procedure =
 *   - mechanic iterates w/ .artist,.critic,.judge in a cycle until judgement.releasable=true
 *   - mechanic then exposes proposal artifact as the output stitch
 */
export const routeMechanicCodePropose =
  asStitcherFlat<RouteMechanicCodeProposeStitcher>(
    genStitchRoute({
      slug: '[mechanic]<code><propose>',
      readme: '@[mechanic]<🌀release> -> @[mechanic]<declare>',
      sequence: [cycleMechanicCodeRelease, stepDeclareProposal],
    }),
  );
