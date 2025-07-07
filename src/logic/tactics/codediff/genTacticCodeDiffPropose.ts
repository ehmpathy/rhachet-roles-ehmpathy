import { asStitcher, genStitchRoute, Threads } from 'rhachet';
import { Empty } from 'type-fns';

const genTacticCodeDiffPropose = asStitcher(
  genStitchRoute({
    slug: '[artist]<code:diff><propose>',
    readme: 'imagine diff, then write to file',
    sequence: [
      stitcherCodeDiffImagine,
      genStitcherCodeFileWrite<'artist', Threads<{ artist: Empty }>>({
        stitchee: 'artist',
      }),
    ],
  }),
);
