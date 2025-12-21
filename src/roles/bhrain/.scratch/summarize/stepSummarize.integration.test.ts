import { asUniDateTime, toMilliseconds } from '@ehmpathy/uni-time';
import {
  enrollThread,
  enweaveOneStitcher,
  Stitch,
  type StitcherForm,
  type Thread,
} from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';
import type { Literalize } from 'type-fns';
import { getUuid } from 'uuid-fns';

import { genContextLogTrail } from '@src/domain.operations/.test/genContextLogTrail';
import { genContextStitchTrail } from '@src/domain.operations/.test/genContextStitchTrail';
import { getContextOpenAI } from '@src/domain.operations/.test/getContextOpenAI';

import { stepSummarize } from './stepSummarize';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

const addThreadStitches = <TThread extends Thread<any>>({
  thread,
  stitches,
}: {
  thread: TThread;
  stitches: Array<{
    stitcher: {
      form: Literalize<StitcherForm>;
      slug: string;
    };
    output: {
      content: string;
    };
  }>;
}): TThread => {
  return {
    ...thread,
    stitches: stitches.map(
      ({ stitcher, output }) =>
        new Stitch({
          uuid: getUuid(),
          createdAt: asUniDateTime(new Date()),
          input: null,
          trail: { desc: '' },
          stitcher: {
            readme: '',
            ...stitcher,
          },
          output,
        }),
    ),
  };
};

describe('stepSummarize', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepSummarize;

  given(
    'vague intent: what should we call reservable-but-not-reserved time?',
    () => {
      const journalThread = [
        `
🫧 There was no feedback present.

🔮 What are the criteria for defining "reservable-but-not-reserved" time?
- Is it simply time that is available on a calendar but not yet booked?
- Does it imply any restrictions or conditions under which it can be reserved?

🔮 How does "reservable-but-not-reserved" time differ from "free time"?
- Is there a difference in terms of accessibility or readiness?
- What role does intent play in distinguishing between these types of time?

🔮 Why is it important to have a specific term for "reservable-but-not-reserved" time?
- Does having a specific term help in planning or scheduling?
- How might this change communication in collaborative environments?

🔮 In what contexts is "reservable-but-not-reserved" time most relevant?
- Is it more applicable in professional settings, such as meetings?
- Could it also be useful in personal time management?

🔮 Could there be any potential issues with the concept of "reservable-but-not-reserved" time?
- Could it lead to misunderstandings or mismanagement if not clearly defined?
- How might it affect expectations between different parties involved?
`,

        `

💡 What are the criteria for defining "reservable-but-not-reserved" time?
- It refers to time that is available on a calendar but not yet booked.
- It may imply certain conditions for reservation, such as priority for specific types of appointments or needing approval before it can be reserved.

💡 How does "reservable-but-not-reserved" time differ from "free time"?
- "Reservable-but-not-reserved" time is actively open for booking, potentially subject to specific conditions, while "free time" is uncommitted and may be used at the discretion of the individual without formal reservation.
- Intent plays a key role; the former is intended to be booked or utilized for a specific purpose, whereas the latter is flexible.

💡 Why is it important to have a specific term for "reservable-but-not-reserved" time?
- Having a specific term aids in precise communication and planning, especially in scheduling where clarity is crucial.
- It helps distinguish between blocks of time that are open for scheduling and truly free time, thereby reducing confusion and improving efficiency in collaborative environments.

💡 In what contexts is "reservable-but-not-reserved" time most relevant?
- It holds significant relevance in professional settings, such as coordinating meetings or allocating resources.
- It can also benefit personal time management, allowing individuals to delineate between time free for bookings and time kept open for impromptu tasks or relaxation.

💡 Could there be any potential issues with the concept of "reservable-but-not-reserved" time?
- Without clear definitions or guidelines, it can lead to misunderstandings about availability or priorities.
- Expectations between parties need to be managed to prevent disputes over overlapping reservations or unexpected commitments.

💡 Proposed Term: "Bookable Time"
- Simple and indicative of its purpose.
- Suggests availability for reservation while differentiating from "free time" or "unavailable" periods.
`,
        `

🫧 Feedback Summary: Let's zoom in on the use cases of home service appointments. Providers need to set their reservable work hours, from which we subtract reservations to figure out the reservable-but-not-reserved time that appointments could be scheduled against. What are some intuitive words that could describe that? Feel free to coin your own if none exist.

---

🔮 How might the context of home service appointments influence the terminology we choose for "reservable-but-not-reserved" time?
- Are there industry-specific terms already in use that might be suitable?
- How might clients and providers perceive the terminology differently based on their interaction with these services?

🔮 What are the practical implications of defining "bookable time" in home service settings?
- How might this definition affect scheduling software or tools used by providers?
- Would this term necessitate changes in how providers communicate availability to potential clients?

🔮 How can we ensure that the term "bookable time" is universally understood across different service industries?
- What steps could be taken to standardize this terminology in business practices?
- Could there be cultural or regional differences in how such terms are perceived or used?

🔮 Are there any existing terms in scheduling or time management theories that resemble "reservable-but-not-reserved" time?
- How do those terms compare in usage and clarity to "bookable time"?
- Are there insights we can borrow from these terms to refine our concept?

🔮 What systems or processes can support the effective management of "bookable time" to avoid misunderstandings?
- How can technology aid in clearly distinguishing these time blocks from others, like personal time or already reserved periods?
- What role do human factors, such as communication and expectation management, play in this process?
`,
        `

💡 How might the context of home service appointments influence the terminology we choose for "reservable-but-not-reserved" time?

- **Industry Relevance**: Terms like "open slots" or "available appointments" are common in service industries. They may suit the purpose but could lack specificity.
- **Perceptions**: Clients seek simplicity, favoring terms that quickly convey when they can book. Providers prefer clarity to manage workloads efficiently.

💡 What are the practical implications of defining "bookable time" in home service settings?

- **Software Integration**: Scheduling tools could easily incorporate "bookable" as a filter for clients searching for appointment times.
- **Communication**: Using "bookable time" standardizes the language between providers and clients, minimizing miscommunications.

💡 How can we ensure that the term "bookable time" is universally understood across different service industries?

- **Standardization Efforts**: Industry forums and associations can drive alignment on terms, promoting usage in software and business communication.
- **Cultural Sensitivity**: Conduct research to understand any regional nuances that might affect comprehension and provide translations if needed.

💡 Are there any existing terms in scheduling or time management theories that resemble "reservable-but-not-reserved" time?

- **Comparative Terms**: Words like "availability block" or "open scheduling" might exist, each offering different clarity levels depending on the context and audience.
- **Insights**: Borrowing from these can refine our concept, ensuring it's intuitive and unambiguous.

💡 What systems or processes can support the effective management of "bookable time" to avoid misunderstandings?

- **Technological Solutions**: Implement highlight features in scheduling systems that clearly demarcate "bookable time" from other types.
- **Human Factors**: Clear communication guidelines and expectation management strategies are crucial to prevent overlaps and misunderstandings.
`,
      ];

      const summaryArt = genArtifactGitFile(
        {
          uri:
            __dirname +
            '/.temp/stepSummarize/reservable-but-not-reserved-time.md',
        },
        { versions: true },
      );

      beforeEach(async () => {
        await summaryArt.del();
      });

      when('executed', () => {
        const threads = usePrep(async () => ({
          summarizer: await enrollThread({
            role: 'summarizer',
            stash: {
              art: { summary: summaryArt },
            },
          }),
          thinker: await addThreadStitches({
            thread: await enrollThread({
              role: 'thinker',
            }),
            stitches: journalThread.map((entry, index) => ({
              stitcher: {
                form: 'IMAGINE',
                slug:
                  index % 2 === 0
                    ? '[thinker]<enquestion>'
                    : '[thinker]<enanswer>',
              },
              output: {
                content: entry,
              },
            })),
          }),
        }));

        then('upserts the artifact', async () => {
          const result = await enweaveOneStitcher(
            { stitcher: route, threads },
            context,
          );

          console.log(JSON.stringify(result.stitch, null, 2));

          console.log(summaryArt);

          const { content } = await summaryArt.get().expect('isPresent');
          expect(content).toContain('pro');
        });
      });
    },
  );
});
