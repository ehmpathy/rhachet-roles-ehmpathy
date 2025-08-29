// import {
//   asStitcherFlat,
//   genStitchRoute,
//   GStitcher,
//   Threads,
//   RoleContext,
//   genStepImagineViaTemplate,
//   genTemplate,
//   getTemplateVarsFromRoleInherit,
//   getTemplateValFromArtifacts,
// } from 'rhachet';
// import { Artifact } from 'rhachet-artifact';
// import { GitFile } from 'rhachet-artifact-git';
// import { withRetry, withTimeout } from 'wrapper-fns';

// import { ContextOpenAI, sdkOpenAi } from '../../../../data/sdk/sdkOpenAi';
// import { genLoopFeedback } from '../../../artifact/genLoopFeedback';
// import { genStepArtSet } from '../../../artifact/genStepArtSet';
// import { getMechanicBriefs } from '../../mechanic/getMechanicBrief';
// import { getEcologistBriefs } from '../getEcologistBrief';

// type StitcherDesired = GStitcher<
//   Threads<{
//     caller: RoleContext<
//       'caller',
//       {
//         ask: string;
//         art: {
//           feedback: Artifact<typeof GitFile>; // required to facilitate loop
//         };
//       }
//     >;
//     thinker: RoleContext<
//       'thinker',
//       {
//         art: {
//           summary: Artifact<typeof GitFile>;
//         };
//       }
//     >;
//   }>,
//   ContextOpenAI & GStitcher['context'],
//   { content: string }
// >;

// const template = genTemplate<StitcherDesired['threads']>({
//   ref: { uri: __filename.replace('.ts', '.template.md') },
//   getVariables: async ({ threads }) => ({
//     ...(await getTemplateVarsFromRoleInherit({ thread: threads.thinker })),
//     ask:
//       (await threads.caller.context.stash.art.feedback?.get())?.content ||
//       threads.caller.context.stash.ask,
//     inflight:
//       (await threads.thinker.context.stash.art.inflight?.get())?.content ?? '',
//     briefs: await getTemplateValFromArtifacts({
//       artifacts: [
//         ...getMechanicBriefs([
//           'architecture/ubiqlang.md',
//           'style.names.treestruct.md',
//         ]),
//         ...getEcologistBriefs([
//           'distilisys/sys101.distilisys.grammar.md',
//           'distilisys/sys201.actor.motive._.summary.md',
//           'distilisys/sys201.actor.motive.p5.motive.grammar.md',
//           'ecology/eco001.overview.md',
//           'economy/econ001.overview.md',
//         ]),
//       ],
//     }),
//   }),
// });

// const stepImagine = genStepImagineViaTemplate<StitcherDesired>({
//   slug: '[thinker]<envision>',
//   stitchee: 'thinker',
//   readme: '',
//   template,
//   imagine: withRetry(
//     withTimeout(sdkOpenAi.imagine, { threshold: { seconds: 30 } }),
//   ),
// });

// const stepPersist = genStepArtSet({
//   stitchee: 'thinker',
//   artee: 'inflight',
// });

// // todo: expand into separation of domain discovery vs vision discovery

// export const stepEnvision = asStitcherFlat<StitcherDesired>(
//   genStitchRoute({
//     slug: '@[thinker]<envision>',
//     readme: '@[thinker]<envision> -> [vision]',
//     sequence: [stepImagine, stepPersist],
//   }),
// );

// export const loopEnvision = genLoopFeedback({
//   stitchee: 'thinker',
//   artee: 'inflight',
//   repeatee: stepEnvision,
// });
