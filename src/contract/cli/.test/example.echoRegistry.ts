import { GStitcher, GStitcherOf, StitchStepCompute, Threads } from 'rhachet';
import { Empty } from 'type-fns';

import { Role } from '../../../__nonpublished_modules__/rhachet/src/domain/Role';
import { RoleRegistry } from '../../../__nonpublished_modules__/rhachet/src/domain/RoleRegistry';
import { RoleSkill } from '../../../__nonpublished_modules__/rhachet/src/domain/RoleSkill';
import { genThread } from '../../../__nonpublished_modules__/rhachet/src/logic/genThread';

const stepEchoAsk = new StitchStepCompute<
  GStitcher<Threads<{ caller: { ask: string } }>>
>({
  slug: 'echo.step',
  form: 'COMPUTE',
  stitchee: 'caller',
  readme: 'simple echo logic',
  invoke: async ({ threads }, context) => {
    context.log.info('echoing', { ask: threads.caller.context.ask });
    return {
      input: null,
      output: `echo: ${threads.caller.context.ask}`,
    };
  },
});

const echoSkill = RoleSkill.build<RoleSkill<GStitcherOf<typeof stepEchoAsk>>>({
  slug: 'echo',
  readme: 'Echoes back the ask string.',
  route: stepEchoAsk,
  threads: {
    lookup: {},
    assess: (input): input is Empty => true,
    instantiate: (input) => ({
      caller: genThread({ role: 'caller', ask: input.ask }),
    }),
  },
  context: {
    lookup: {},
    assess: (input: any): input is Empty => true,
    instantiate: () => ({
      log: console,
      stitch: {
        trail: [],
      },
    }),
  },
});
const echoRole = Role.build({
  slug: 'echoer',
  name: 'Echoer',
  purpose: 'repeat things',
  readme: 'knows how to echo input back to the user.',
  traits: [],
  skills: [echoSkill],
});

export const EXAMPLE_REGISTRY = new RoleRegistry({
  slug: 'echo',
  readme: 'basic registry for testing CLI execution',
  roles: [echoRole],
});
