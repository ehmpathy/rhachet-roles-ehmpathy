import { UnexpectedCodePathError } from 'helpful-errors';
import {
  type GStitcher,
  type RoleContext,
  StitchStepCompute,
  type Thread,
  type Threads,
} from 'rhachet';
import type { Artifact } from 'rhachet-artifact';

/**
 * .what = a step which takes an getArteeFrom(@[$stitchee]) and sets it as @[$stitchee].[$artee]
 * .why.cases =
 *   - enables swap out of which artifact is in inflight between steps (e.g., <diverge> -> <collect>)
 *   - enables swap out of which artifact is in upstream between flights (e.g., <diverge> -> <collect)
 *
 * !: do not use this directly. useGenStepSwapArtifact should be used directly instead for a pit-of-success
 */
export const genStepSwapArtifact = <
  TThreads extends Threads<any>,
  TFromStitchee extends keyof TThreads & string,
  TFromArtee extends keyof TThreads[TFromStitchee]['context']['stash']['art'] &
    string,
  TOntoStitchee extends keyof TThreads & string,
  TOntoArtee extends string,
>({
  use: from,
  as: onto,
}: {
  use: { stitchee: TFromStitchee; artee: TFromArtee };
  as: { stitchee: TOntoStitchee; artee: TOntoArtee };
}) =>
  new StitchStepCompute<
    GStitcher<
      Threads<{
        [K in TFromStitchee | TOntoStitchee]: RoleContext<
          K,
          {
            art: K extends TFromStitchee
              ? K extends TOntoStitchee
                ? // same role: must include both
                  Record<string, unknown> & {
                    [P in TFromArtee]: Artifact<any>;
                  } & { [P in TOntoArtee]: Artifact<any> | null }
                : // only TFromStitchee
                  Record<string, unknown> & { [P in TFromArtee]: Artifact<any> }
              : K extends TOntoStitchee
                ? Record<string, unknown> & {
                    [P in TOntoArtee]: Artifact<any> | null;
                  }
                : Record<string, unknown>;
          }
        >;
      }>,
      GStitcher['context'],
      {
        from: typeof from & { artifact: Pick<Artifact<any>, 'ref'> };
        onto: typeof onto;
      }
    >
  >({
    form: 'COMPUTE',
    slug: `[${onto.stitchee}]<artifact:swap>[${onto.artee}]`,
    readme: `set @${onto.stitchee}.art.${onto.artee} = @${from.stitchee}.art.${from.artee}`,
    stitchee: onto.stitchee,
    invoke: async ({ threads }) => {
      const fromThread = threads[from.stitchee] as Thread<
        RoleContext<
          TFromStitchee,
          {
            art: Record<TFromArtee, Artifact<any>>;
          }
        >
      >;
      const ontoThread = threads[onto.stitchee] as Thread<
        RoleContext<
          TOntoStitchee,
          {
            art: Record<TOntoArtee, Artifact<any>>;
          }
        >
      >;

      const artifact =
        fromThread.context.stash.art[from.artee] ??
        UnexpectedCodePathError.throw(
          `could not resolve artifact from @${from.stitchee}[art:${from.artee}]`,
          {
            fromDef: from,
            fromStash: fromThread.context.stash,
          },
        );

      ontoThread.context.stash.art[onto.artee] = artifact;

      return {
        input: { from, onto },
        output: {
          from: {
            stitchee: from.stitchee,
            artee: from.artee,
            artifact: { ref: artifact.ref },
          },
          onto,
        },
      };
    },
  });

/**
 *.what = prepares a pre-bound generator for `SwapArtifact` steps, using a specific `Threads<T>` context
 * .why = enables inline, type-safe creation of `SwapArtifact` steps without repeating thread type declarations
 *   - ensures that artifact keys (`use`, `as`) exist within the declared thread structure
 *   - streamlines definition of multiple swaps in routes without type repetition
 *
 * @example
 * const swapArt = useGenStepSwapArtifactFor<StitcherDesired['threads']>();
 * swapArt({
 *   // set @thinker[inflight] = @thinker.inflights.diverge
 *   use: { stitchee: 'thinker', artee: 'inflights.diverge' },
 *   as:  { stitchee: 'thinker', artee: 'inflight' },
 * });
 */
export const useGenStepSwapArtifactFor =
  <TThreads extends Threads<any>>() =>
  <
    TFromStitchee extends keyof TThreads & string,
    TFromArtee extends
      keyof TThreads[TFromStitchee]['context']['stash']['art'] & string,
    TOntoStitchee extends keyof TThreads & string,
    TOntoArtee extends string,
  >(input: {
    use: { stitchee: TFromStitchee; artee: TFromArtee };
    as: { stitchee: TOntoStitchee; artee: TOntoArtee };
  }): StitchStepCompute<GStitcher<TThreads, GStitcher['context'], any>> =>
    genStepSwapArtifact<
      TThreads,
      TFromStitchee,
      TFromArtee,
      TOntoStitchee,
      TOntoArtee
    >(input) as any;
