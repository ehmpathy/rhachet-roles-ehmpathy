import { UnexpectedCodePathError } from 'helpful-errors';
import { Thread } from 'rhachet';

import { GitFile } from '../../../rhachet-artifact-git/src';
import { Artifact } from '../domain/Artifact';
import { RoleContext } from '../domain/RoleContext';
import { genThread } from './genThread';
import { addRoleTraits } from './role/addRoleTraits';

/**
 * .what = creates a thread for a given role, with optional inherited traits and skills
 * .why  = eliminates boilerplate around thread setup, including `as const`, trait/skill injection, and context composition
 */
export const enrollThread = async <
  TRole extends string,
  TStash extends Record<string, any>,
>({
  role,
  inherit,
  stash,
}: {
  role: TRole;
  inherit?: {
    traits?: Artifact<typeof GitFile>[];
    skills?: Artifact<typeof GitFile>[];
  };
  stash?: TStash;
}): Promise<Thread<RoleContext<TRole, TStash>>> => {
  let thread = genThread<RoleContext<TRole, TStash>>({
    role: role,
    inherit: {
      traits: [],
      skills: [],
    },
    stash: stash as TStash,
  });

  if (inherit?.traits?.length) {
    thread = await addRoleTraits({
      thread,
      from: { artifacts: inherit.traits },
    });
  }

  if (inherit?.skills?.length) {
    throw new UnexpectedCodePathError('todo');
    // thread = await addRoleSkills({
    //   thread,
    //   from: { artifacts: inherit.skills },
    // });
  }

  return thread;
};
