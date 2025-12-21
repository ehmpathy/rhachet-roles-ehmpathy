import { asUniDateTime } from '@ehmpathy/uni-time';
import {
  type ContextStitchTrail,
  StitcherForm,
  type StitchSetEvent,
} from 'rhachet';
import { genArtifactGitFile, getArtifactObsDir } from 'rhachet-artifact-git';
import { createCache } from 'simple-in-memory-cache';
import { isPresent } from 'type-fns';
import { withSimpleCaching } from 'with-simple-caching';

// todo: lift into string-fns or rhachet-artifact-git
const sanitizeForFilename = (input: string): string =>
  input
    // replace invalid characters
    // biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    // collapse whitespace into underscore
    .replace(/\s+/g, '_')
    // remove trailing dots or spaces
    .replace(/[. ]+$/, '')
    // make sure reserved names aren’t returned bare
    .replace(/^(con|prn|aux|nul|com\d|lpt\d)$/i, '_$1');

// declare where the stream will be emitted to // todo: move via hook into rhachet to centralize; declaration of emitter != mount of emitter. ideally, log on mount
const onMount = withSimpleCaching(
  (input: { sinkSubdir: string }) => {
    console.log(
      `🪡  stitch set event stream can be monitored at this dir: ${input.sinkSubdir}`,
    );
    console.log(); // newline
  },
  { cache: createCache() }, // cache to ensure it's only invoked once, since we call it from within emit for now, to mock how onMount hook would operate
);

/**
 * .what = an event stream consumer which streams emitted events to disk
 * .how =
 *   - emits stitch set events observably to a standard .rhachet subdir, relative to the target dir
 *   - transforms the events for maximum observability in their serialized format
 */
export const genStitchStreamToDisk = (input: {
  /**
   * .what = the directory relative to which to instantiate the .rhachet stream sink
   */
  dir: string;
}): Required<ContextStitchTrail['stitch']>['stream'] => {
  // declare the directory into which the events will be streamed
  const sinkSupdir = getArtifactObsDir({ uri: `${input.dir}/stream` }); // e.g., src/domain/ -> src/domain/stream -> src/domain/.rhachet/stream
  const invokedAt = sanitizeForFilename(asUniDateTime(new Date()));
  const sinkSubdir = `${sinkSupdir}/i${invokedAt}`;

  // declare how to sink emitted events to that directory
  const emit: Required<ContextStitchTrail['stitch']>['stream']['emit'] = async (
    event: StitchSetEvent<any, any>,
  ) => {
    // mock the onmount hook
    onMount({ sinkSubdir });

    // compose the event path prefix
    const uriPrefix = [
      sinkSubdir,
      sanitizeForFilename(
        [
          'at',
          event.occurredAt,
          event.stitch.stitcher?.slug ?? '___',
          event.stitch.stitcher?.form ?? '___',
          event.stitch.uuid,
        ]
          .filter(isPresent)
          .join('.'),
      ),
    ].join('/');

    // always emit the raw event; // todo: do we ever need this? seems to takeup disk space too rapidly
    await genArtifactGitFile({
      uri: `${uriPrefix}.event.json`,
    }).set({ content: JSON.stringify(event, null, 2) });

    // if its an imagine event, then also separately emit the input and output for observability, if input and output had standard deprompt stitch
    if (event.stitch.stitcher?.form === StitcherForm.IMAGINE) {
      if (typeof event.stitch.input?.prompt === 'string')
        await genArtifactGitFile({
          uri: `${uriPrefix}.prompt.input.md`,
        }).set({ content: event.stitch.input.prompt });
      if (typeof event.stitch.output?.content === 'string')
        await genArtifactGitFile({
          uri: `${uriPrefix}.prompt.output.md`,
        }).set({ content: event.stitch.output.content });
    }
  };

  // return the stream with observable to disk emitter
  return { emit };
};
