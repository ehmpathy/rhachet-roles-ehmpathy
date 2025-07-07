import {
  asStitcher,
  asStitcherFlat,
  genStitchFanout,
  genStitchRoute,
  GStitcher,
  StitchStepCompute,
  Threads,
} from 'rhachet';
import { Empty } from 'type-fns';

const stitcherCodeReviewConcluder = new StitchStepCompute<
  GStitcher<
    Threads<{ critic: Empty }, 'multiple'>,
    GStitcher['context'],
    { blockers: string[]; summary: string[] }
  >
>({
  slug: '[critic]<review:concluder>',
  readme: null,
  form: 'COMPUTE',
  stitchee: 'critic',
  invoke: ({ threads }) => {
    const summary = threads.critic.peers
      .map((peer) => peer.stitches.slice(-1)[0]?.output)
      .filter(Boolean) as string[];
    const blockers = summary.filter((x) => x.includes('blocker'));
    return { input: summary, output: { blockers, summary } };
  },
});

const stitcherCodeReviewFanout = asStitcher(
  genStitchFanout({
    slug: '[critic]<code:review>.<fanout>[[review]]',
    readme: null,
    parallels: [
      genStitcherCodeReview({ scope: 'technical', focus: 'blockers' }),
      // genStitcherCodeReview({ scope: 'technical', focus: 'chances' }),
      // genStitcherCodeReview({ scope: 'technical', focus: 'praises' }),
      genStitcherCodeReview({ scope: 'functional', focus: 'blockers' }),
      // genStitcherCodeReview({ scope: 'functional', focus: 'chances' }),
      // genStitcherCodeReview({ scope: 'functional', focus: 'praises' }),
    ],
    concluder: stitcherCodeReviewConcluder,
  }),
);

const directorSummarize = new StitchStepCompute<
  GStitcher<
    Threads<{ director: Empty; critic: Empty }>,
    typeof context,
    { directive: string; blockers: string[] }
  >
>({
  slug: '[director]<summarize>',
  form: 'COMPUTE',
  stitchee: 'director',
  readme: 'turn critic summary into a director directive',
  invoke: ({ threads }) => {
    const last = threads.critic.stitches.slice(-1)[0]?.output;
    return {
      input: last,
      output: {
        directive: `resolve blockers, blockers: ${JSON.stringify(
          last?.blockers,
          null,
          2,
        )}`,
        blockers: last?.blockers,
      },
    };
  },
});

const artistCodeProposeRoute = asStitcher(
  genStitchRoute({
    slug: '[artist]<code:propose>',
    readme: 'imagine diff, then write to file',
    sequence: [
      stitcherCodeDiffImagine,
      genStitcherCodeFileWrite<'artist', Threads<{ artist: Empty }>>({
        stitchee: 'artist',
      }),
    ],
  }),
);

const criticCodeReviewRoute = asStitcher(
  genStitchRoute({
    slug: '[critic]<code:review>',
    readme: 'review the code from multiple perspectives',
    sequence: [
      genStitcherCodeFileRead<
        'critic',
        Threads<{ artist: Empty; critic: Empty }>
      >({
        stitchee: 'critic',
        output: ({ threads }) =>
          (threads.artist?.stitches.slice(-1)[0]?.output as any) ??
          UnexpectedCodePathError.throw(
            'expected to find file write output stitch',
            { threads },
          ),
      }),
      stitcherCodeReviewFanout,
    ],
  }),
);

const codeIterateRoute = asStitcherFlat<
  GStitcher<
    Threads<{
      artist: { tools: string[]; facts: string[] };
      critic: { tools: string[]; facts: string[] };
      director: Empty;
    }>,
    ContextOpenAI & GStitcher['context']
  >
>(
  genStitchRoute({
    slug: '[code:iterate]',
    readme: 'one pass of propose + review + summarize',
    sequence: [
      artistCodeProposeRoute,
      criticCodeReviewRoute,
      directorSummarize,
    ],
  }),
);
