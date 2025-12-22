import { UnexpectedCodePathError } from 'helpful-errors';
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '@src/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/.test/getContextOpenAI';
import { getMechanicBrief } from '@src/roles/mechanic/getMechanicBrief';

import { getRefOrgPatterns } from './getRefOrgPatterns';
import { routeCriticCodeReviewCodestyle } from './routeCriticCodeReviewCodestyle';

describe('routeCriticCodeReviewCodestyle', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };

  const route = routeCriticCodeReviewCodestyle;

  given('we want to multiply', () => {
    const claimsArt = genArtifactGitFile(
      {
        uri: __dirname + '/.test/multiply.claims.md',
      },
      { access: 'readonly' }, // this is a fixture, dont allow overwrite
    );

    given('inflight has code to be reviewed, expected to have blockers', () => {
      const inflightArt = genArtifactGitFile({
        uri:
          __dirname +
          '/.temp/review/codestyle/multiply.hasblockers.toreview.ts',
      });

      const feedbackArt = genArtifactGitFile({
        uri:
          __dirname +
          '/.temp/review/codestyle/multiply.hasblockers.feedback.md',
      });
      beforeEach(async () => {
        await inflightArt.set({
          content: 'export const multiply=(a,b)=>a*b;',
        });
        await feedbackArt.del();
      });

      when('executing the review route', () => {
        const threads = usePrep(async () => ({
          critic: await enrollThread({
            role: 'critic',
            stash: {
              art: { feedbackCodestyle: feedbackArt },
              org: {
                patterns: await getRefOrgPatterns({ purpose: 'produce' }),
              },
            },
            inherit: {
              traits: [getMechanicBrief('style.compressed.md')],
            },
          }),
          artist: await enrollThread({
            role: 'artist',
            stash: {
              art: { inflight: inflightArt },
              scene: { coderefs: [inflightArt] },
            },
          }),
          student: await enrollThread({
            role: 'student',
            stash: {
              art: { claims: claimsArt },
            },
          }),
        }));

        then('writes feedback about the inflight diff', async () => {
          const result = await enweaveOneStitcher(
            { stitcher: route, threads },
            context,
          );

          const file = await feedbackArt.get();
          const content =
            file?.content ?? UnexpectedCodePathError.throw('expected file');

          expect(content).toMatch(/blocker/i);
          expect(content.length).toBeGreaterThan(10);
          expect(result.threads.critic.stitches.length).toBeGreaterThan(0);
        });
      });
    });

    given('inflight has code to be reviewed, expected no blockers', () => {
      const inflightArt = genArtifactGitFile({
        uri:
          __dirname + '/.temp/review/codestyle/multiply.noblockers.toreview.ts',
      });

      const feedbackArt = genArtifactGitFile({
        uri:
          __dirname + '/.temp/review/codestyle/multiply.noblockers.feedback.md',
      });
      beforeEach(async () => {
        await inflightArt.set({
          content: `
/**
 * .what = multiplies two numbers
 * .why = consistent and safe multiplication for our project
 */
export const multiply = ({ a, b }: { a: number, b: number }): number => {
    return a * b;
};
        `,
        });
        await feedbackArt.del();
      });

      when('executing the review route', () => {
        const threads = usePrep(async () => ({
          critic: await enrollThread({
            role: 'critic',
            stash: {
              art: { feedbackCodestyle: feedbackArt },
              org: {
                patterns: await getRefOrgPatterns({ purpose: 'produce' }),
              },
            },
            inherit: {
              traits: [getMechanicBrief('style.compressed.md')],
            },
          }),
          artist: await enrollThread({
            role: 'artist',
            stash: {
              art: { inflight: inflightArt },
              scene: { coderefs: [inflightArt] },
            },
          }),
          student: await enrollThread({
            role: 'student',
            stash: {
              art: { claims: claimsArt },
            },
          }),
        }));

        then('writes feedback about the inflight diff', async () => {
          const result = await enweaveOneStitcher(
            { stitcher: route, threads },
            context,
          );

          const file = await feedbackArt.get();
          const content =
            file?.content ?? UnexpectedCodePathError.throw('expected file');

          expect(content).not.toMatch(/blocker/i);
          expect(content.length).toBeGreaterThan(1);
          expect(result.threads.critic.stitches.length).toBeGreaterThan(0);
        });
      });
    });
  });

  given('we want to get available appointment slots for a pro', () => {
    given('inflight has code to be reviewed, expected without blockers', () => {
      const inflightArt = genArtifactGitFile({
        uri:
          __dirname +
          '/.temp/review/codestyle/getSchedulableWindows.nonblocker.inflight.ts',
      });

      const feedbackArt = genArtifactGitFile({
        uri:
          __dirname +
          '/.temp/review/codestyle/getSchedulableWindows.nonblocker.feedback.json',
      });
      beforeEach(async () => {
        await inflightArt.set({
          content: `
/**
 * .what = returns available time windows for appointment scheduling
 * .why = enables customers to book with pros during valid, conflict-free slots
 * .note = applies availability, working hours, and existing bookings
 */
export const getSchedulableWindows = async ({
  proId,
  timezone,
  dateRange, // { start: Date; end: Date }
}: {
  proId: string;
  timezone: string;
  dateRange: { start: Date; end: Date };
}): Promise<{ start: string; end: string }[]> => {
  // load working hours and availability
  const availability = await getAvailability({ proId, timezone });

  // load existing bookings to avoid conflicts
  const existing = await getScheduledJobs({ proId, dateRange });

  // compute open windows that don't conflict with bookings
  const openSlots = getConflictFreeWindows({
    availability,
    existing,
    timezone,
    dateRange,
  });

  return openSlots;
};

          `.trim(),
        });
        await feedbackArt.del();
      });

      when('executing the review route', () => {
        const threads = usePrep(async () => ({
          critic: await enrollThread({
            role: 'critic',
            stash: {
              art: { feedbackCodestyle: feedbackArt },
              org: {
                patterns: await getRefOrgPatterns({ purpose: 'produce' }),
              },
            },
            inherit: {
              traits: [getMechanicBrief('style.compressed.md')],
            },
          }),
          artist: await enrollThread({
            role: 'artist',
            stash: {
              art: { inflight: inflightArt },
              scene: { coderefs: [inflightArt] },
            },
          }),
        }));

        then('writes feedback about the inflight diff', async () => {
          const result = await enweaveOneStitcher(
            { stitcher: route, threads },
            context,
          );

          const file = await feedbackArt.get();
          const content =
            file?.content ?? UnexpectedCodePathError.throw('expected file');

          expect(content).not.toMatch(/blocker/i);
          expect(content.length).toBeGreaterThan(10);
          expect(result.threads.critic.stitches.length).toBeGreaterThan(0);
        });
      });
    });

    given('inflight has code to be reviewed, expected to have blockers', () => {
      const inflightArt = genArtifactGitFile({
        uri:
          __dirname +
          '/.temp/review/codestyle/getSchedulableWindows.hasblocker.inflight.ts',
      });

      const feedbackArt = genArtifactGitFile({
        uri:
          __dirname +
          '/.temp/review/codestyle/getSchedulableWindows.hasblocker.feedback.json',
      });
      beforeEach(async () => {
        await inflightArt.set({
          content: `

export const getSchedulableWindows = async (
  proId: string;
  timezone: string;
  dateRange: { start: Date; end: Date };
)  => {
  // load working hours and availability
  const availability = await getAvailability({ proId, timezone });

  if (availability.length === 0) {
    return []
  } else {
    // load existing bookings to avoid conflicts
    const existing = await getScheduledJobs({ proId, dateRange });

    // compute open windows that don't conflict with bookings
    const openSlots = getConflictFreeWindows({
      availability,
      existing,
      timezone,
      dateRange,
    });

    return openSlots;
  }
};

          `.trim(),
        });
        await feedbackArt.del();
      });

      when('executing the review route', () => {
        const threads = usePrep(async () => ({
          critic: await enrollThread({
            role: 'critic',
            stash: {
              art: { feedbackCodestyle: feedbackArt },
              org: {
                patterns: await getRefOrgPatterns({ purpose: 'produce' }),
              },
            },
            inherit: {
              traits: [getMechanicBrief('style.compressed.md')],
            },
          }),
          artist: await enrollThread({
            role: 'artist',
            stash: {
              art: { inflight: inflightArt },
              scene: { coderefs: [inflightArt] },
            },
          }),
        }));

        then('writes feedback about the inflight diff', async () => {
          const result = await enweaveOneStitcher(
            { stitcher: route, threads },
            context,
          );

          const file = await feedbackArt.get();
          const content =
            file?.content ?? UnexpectedCodePathError.throw('expected file');

          expect(content).toMatch(/blocker/i);
          expect(content.length).toBeGreaterThan(10);
          expect(result.threads.critic.stitches.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
