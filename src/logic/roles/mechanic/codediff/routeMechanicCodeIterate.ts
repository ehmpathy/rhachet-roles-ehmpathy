import {
  asStitcherFlat,
  type GStitcher,
  genStitchRoute,
  type RoleContext,
  type Threads,
} from 'rhachet';
import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';

import type { ContextOpenAI } from '../../../../data/sdk/sdkOpenAi';
import { routeArtistCodeDiff } from './routeArtistCodeDiff';
import { routeCriticCodeReview } from './routeCriticCodeReview';
import { routeJudgeReleasable } from './routeJudgeReleasable';

interface ThreadsDesired
  extends Threads<{
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

export type RouteMechanicCodeIterateStitcher = GStitcher<
  ThreadsDesired,
  ContextOpenAI & GStitcher['context'],
  { content: string }
>;

/**
 * .what = a route where a mechanic's threads iterate on code
 * .how.contract
 *   - input = thread(student) w/ art.claims
 *   - output =
 *      - thread(artist) w/ art.inflight
 *      - thread(critic) w/ art.feedback
 *      - thread(judge) w/ art.judgement
 * .how.procedure =
 *   - mechanic.artist diffs the code
 *   - mechanic.critic reviews the code
 *   - mechanic.judge decides release readiness
 */
export const routeMechanicCodeIterate =
  asStitcherFlat<RouteMechanicCodeIterateStitcher>(
    genStitchRoute({
      slug: '[mechanic]<code><iterate>',
      readme: '@[artist]<diff> -> @[critic]<review> -> @[judge]<release>',
      sequence: [
        routeArtistCodeDiff,
        routeCriticCodeReview,
        routeJudgeReleasable,
      ],
    }),
  );
