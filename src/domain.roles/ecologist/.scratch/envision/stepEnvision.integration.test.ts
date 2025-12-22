// import { toMilliseconds } from '@ehmpathy/uni-time';
// import { enweaveOneStitcher, enrollThread } from 'rhachet';
// import { genArtifactGitFile } from 'rhachet-artifact-git';
// import { given, when, then, usePrep } from 'test-fns';

// import { genContextLogTrail } from '@src/domain.operations/.test/genContextLogTrail';
// import { genContextStitchTrail } from '@src/domain.operations/.test/genContextStitchTrail';
// import { getContextOpenAI } from '@src/domain.operations/.test/getContextOpenAI';
// import { stepEnvision } from './stepEnvision';

// jest.setTimeout(toMilliseconds({ minutes: 5 }));

// describe('stepEnvision', () => {
//   const context = {
//     ...genContextLogTrail(),
//     ...genContextStitchTrail(),
//     ...getContextOpenAI(),
//   };
//   const route = stepEnvision;

//   given('we want to explore the home service domain', () => {
//     const askText =
//       'appointment scheduler in the home service domain. use @[provider] and @[neighbor] actors involved';

//     const inflightArtifact = genArtifactGitFile(
//       {
//         uri:
//           __dirname +
//           '/.temp/stepEnvision/updated/homeservice.schedule.term.vision.md',
//       },
//       {
//         versions: true,
//       },
//     );

//     const feedbackArtifact = genArtifactGitFile(
//       {
//         uri:
//           __dirname +
//           '/.temp/stepEnvision/updated/homeservice.schedule.term.feedback.md',
//       },
//       {
//         versions: true,
//       },
//     );

//     beforeEach(async () => {
//       await inflightArtifact.del();
//       await feedbackArtifact.del();
//       await feedbackArtifact.set({ content: '' });
//     });

//     when('executed', () => {
//       const threads = usePrep(async () => ({
//         caller: await enrollThread({
//           role: 'caller',
//           stash: {
//             ask: askText,
//             art: {
//               feedback: feedbackArtifact,
//             },
//           },
//         }),
//         thinker: await enrollThread({
//           role: 'thinker',
//           stash: {
//             art: {
//               inflight: inflightArtifact,
//             },
//           },
//         }),
//       }));

//       then('upserts the artifact', async () => {
//         const result = await enweaveOneStitcher(
//           { stitcher: route, threads },
//           context,
//         );

//         console.log(JSON.stringify(result.stitch, null, 2));

//         const { content } = await inflightArtifact.get().expect('isPresent');
//         expect(content).toContain('pro');
//       });
//     });
//   });
// });
