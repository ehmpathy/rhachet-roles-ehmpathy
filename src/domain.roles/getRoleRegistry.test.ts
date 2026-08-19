import { given, then, when } from 'test-fns';

import { getRoleRegistry } from './getRoleRegistry';

/**
 * .what = pins the cross-repo gate to the MECHANIC role, and to it alone
 * .why = the gate is a tool-use blocker hook, and every other tool-use blocker
 *        in this repo (forbid-tmp-writes, forbid-terms.gerunds,
 *        forbid-suspicious-shell-syntax, check-permissions) is registered on
 *        the mechanic only. one gate registered differently from its whole
 *        family is a surprise to the next reader and a second convention to
 *        maintain (rule.forbid.surprises).
 *
 * .why = the assertion runs BOTH ways on purpose. that the mechanic carries it
 *        is the obvious half; that no other role does is the half that decays
 *        silently, because a future edit that copies the gate onto a second
 *        role would otherwise pass every test in the repo.
 *
 * .note = the sweep reads the LIVE registry rather than a fixed role list, so
 *         a role added later is judged too — it arrives correctly ungated, and
 *         goes red the moment someone gates it without a decision to match.
 */
describe('getRoleRegistry', () => {
  const GATE = 'claude.hooks/pretooluse.forbid-cross-repo-access';

  const hasGate = (role: { hooks?: { onBrain?: { onTool?: unknown } } }) =>
    ((role.hooks?.onBrain?.onTool ?? []) as { command: string }[]).some(
      (hook) => hook.command.includes(GATE),
    );

  given('[case1] the registry of every role this repo exposes', () => {
    const roles = getRoleRegistry().roles;

    when('[t0] the roles are enumerated', () => {
      then(
        'the mechanic is among them, so the sweep below is not vacuous',
        () => {
          expect(roles.map((role) => role.slug)).toContain('mechanic');
        },
      );
    });

    when('[t1] the roles are checked for the cross-repo gate', () => {
      then('the mechanic carries it, and no other role does', () => {
        const gated = roles.filter(hasGate).map((role) => role.slug);

        expect(gated).toEqual(['mechanic']);
      });
    });

    when('[t2] the mechanic gate is checked for its tool filter', () => {
      then('it covers all seven read/write tools', () => {
        // .why = a gate that watches Read but not Glob is a gate with a hole.
        //        a bare Glob({pattern}) that swept a peer repo was a real
        //        defect caught in review, so the tool set is pinned here, not
        //        merely the presence of the gate
        const expected = 'Write|Edit|Read|NotebookEdit|Grep|Glob|Bash'.split(
          '|',
        );

        const mechanic = roles.find((role) => role.slug === 'mechanic');
        const gate = (mechanic?.hooks?.onBrain?.onTool ?? []).find((hook) =>
          hook.command.includes(GATE),
        );
        const covered = (gate?.filter?.what ?? '').split('|');

        expect(covered.sort()).toEqual([...expected].sort());
        expect(gate?.filter?.when).toEqual('before');
      });
    });
  });
});
