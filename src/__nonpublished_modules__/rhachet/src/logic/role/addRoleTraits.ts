import { Thread } from 'rhachet';
import { PickAny } from 'type-fns';

import { GitFile } from '../../../../rhachet-artifact-git/src';
import { Artifact } from '../../domain/Artifact';
import { RoleContext, RoleTrait } from '../../domain/RoleContext';

/**
 * .what = injects new RoleTrait(s) into a thread's context
 * .why = enables dynamic role adaptation from inline traits or artifact sources
 */
export const addRoleTraits = async <
  TThread extends Thread<{ inherit: RoleContext<any, any>['inherit'] }>,
>({
  thread,
  from,
}: {
  thread: TThread;
  from: PickAny<{
    traits: RoleTrait[];
    artifacts: Artifact<typeof GitFile>[];
  }>;
}): Promise<TThread> => {
  const parsed: RoleTrait[] = [];

  if ('traits' in from && from.traits) {
    parsed.push(...from.traits);
  }

  if ('artifacts' in from && from.artifacts) {
    for (const artifact of from.artifacts) {
      const file = await artifact.get();
      if (!file) throw new Error(`trait file not found: ${artifact.ref.uri}`);
      parsed.push({ content: file.content });
    }
  }

  return {
    ...thread,
    context: {
      ...thread.context,
      inherit: {
        ...thread.context.inherit,
        traits: [...(thread.context.inherit.traits ?? []), ...parsed],
      },
    },
  };
};
