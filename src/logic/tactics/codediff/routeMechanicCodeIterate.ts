import { genStitchRoute } from 'rhachet';

import { routeArtistCodeDiffPropose } from './routeArtistCodeDiff';
import { routeCriticCodeReview } from './routeCriticCodeReview';

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
const routeMechanicCodeIterate = genStitchRoute({
  slug: '[mechanic]<code><iterate>',
  readme: '@[artist]<diff> -> @[critic]<review> -> @[judge]<release>',
  sequence: [routeArtistCodeDiffPropose, routeCriticCodeReview],
});
