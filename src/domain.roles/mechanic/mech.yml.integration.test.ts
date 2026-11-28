import * as fs from 'fs';
import * as path from 'path';
import { given, then, when } from 'test-fns';
import { parse } from 'yaml';

import { ROLE_MECHANIC } from './getMechanicRole';

/**
 * .what = clamps the shape of the mechanic mech.yml against the rhachet#858 contract
 * .why  = the dispatcher of #858 reads this file; until it ships, no tool here parses it,
 *         so a drift (a line for a hook the role no longer declares, a gate that lost its
 *         safety mark, a key the parser refuses) would land silent. this suite is the reader
 * .note = the key and event words below mirror rhachet's asMechFileOfYamlText; a change
 *         there owes a change here
 */
describe('mech.yml', () => {
  const mechPath = path.join(__dirname, 'mech.yml');
  const mech = parse(fs.readFileSync(mechPath, 'utf-8')) as Record<
    string,
    Record<string, Record<string, unknown>>
  >;
  const lines = Object.entries(mech.hook ?? {});

  const KEYS_ROOT = ['breach', 'hook', 'cron', 'daemon', 'skill'];
  const KEYS_LINE = [
    'on',
    'when',
    'run',
    'timeout',
    'cost',
    'cost.toke',
    'delegate',
    'breach',
    'status',
    'why',
    'replaces',
    'safety',
    'drop',
    'fits',
    'deny',
    'front',
    'in',
    'unit',
    'timer',
  ];
  const EVENTS_RHACHET = ['onBoot', 'onTool', 'onTalk', 'onStop'] as const;

  // the declared hooks, one entry per hook, in the shape a mech line restates
  const hooksDeclared = EVENTS_RHACHET.flatMap((event) =>
    (ROLE_MECHANIC.hooks?.onBrain?.[event] ?? []).map((hook) => ({
      event,
      run: hook.command,
      matcher: hook.filter?.what ?? null,
      when: hook.filter?.when === 'after' ? 'after' : null,
      timeoutSeconds: Number(/^PT(\d+)S$/.exec(String(hook.timeout))?.[1]),
    })),
  );

  // the declared hooks, as their mech lines restate them
  const hooksOfLines = lines.map(([, line]) => {
    const [event, matcher] = String(line.on).split(' ');
    return {
      event,
      run: line.run,
      matcher: matcher ?? null,
      when: line.when ?? null,
      timeoutSeconds: line.timeout,
    };
  });

  given('[case1] the mechanic mech.yml', () => {
    when('[t0] its keys are read', () => {
      then(
        'the root names only the sections and caps the contract admits',
        () => {
          const rootUnknown = Object.keys(mech).filter(
            (key) => !KEYS_ROOT.includes(key) && !key.startsWith('max.'),
          );
          expect(rootUnknown).toEqual([]);
        },
      );

      then('each line names only the keys the contract admits', () => {
        const keysUnknown = lines.flatMap(([name, line]) =>
          Object.keys(line)
            .filter((key) => !KEYS_LINE.includes(key))
            .map((key) => `${name}.${key}`),
        );
        expect(keysUnknown).toEqual([]);
      });

      then(
        'each `on:` names a rhachet event word, never a claude event',
        () => {
          const eventsUnknown = hooksOfLines
            .map((hook) => hook.event)
            .filter(
              (event) =>
                !EVENTS_RHACHET.includes(
                  event as (typeof EVENTS_RHACHET)[number],
                ),
            );
          expect(eventsUnknown).toEqual([]);
        },
      );
    });

    when('[t1] its lines are compared with the declared hooks', () => {
      then(
        'there is exactly one line per declared hook, each the same moment and file',
        () => {
          const asKey = (hook: { event: unknown; run: unknown }) =>
            `${hook.event} ${hook.run}`;
          expect(hooksOfLines.map(asKey).sort()).toEqual(
            hooksDeclared.map(asKey).sort(),
          );
          expect(hooksOfLines).toHaveLength(hooksDeclared.length);
        },
      );

      then('each line restates its hook matcher, moment, and timeout', () => {
        const byRun = new Map(hooksDeclared.map((hook) => [hook.run, hook]));
        hooksOfLines.forEach((hook) =>
          expect(hook).toEqual(byRun.get(String(hook.run))),
        );
      });
    });

    when('[t2] its effect on a dispatcher is read', () => {
      then(
        'it is inert: no line drops, replaces, denies, or declares a cost bound',
        () => {
          const lever = lines
            .filter(
              ([, line]) =>
                line.drop !== undefined ||
                line.replaces !== undefined ||
                line.deny !== undefined ||
                line.fits !== undefined ||
                line.front !== undefined ||
                line.cost !== undefined ||
                line.delegate !== undefined,
            )
            .map(([name]) => name);
          expect(lever).toEqual([]);
        },
      );

      then(
        'every tool gate is marked safety, so a quarantine marker never skips it',
        () => {
          const gatesUnmarked = lines
            .filter(([, line]) => String(line.on).startsWith('onTool'))
            .filter(([, line]) => line.safety !== true)
            .map(([name]) => name);
          expect(gatesUnmarked).toEqual([]);
        },
      );

      then(
        'no boot, talk, or stop line is marked safety; each may be skipped',
        () => {
          const markedOffGate = lines
            .filter(([, line]) => !String(line.on).startsWith('onTool'))
            .filter(([, line]) => line.safety === true)
            .map(([name]) => name);
          expect(markedOffGate).toEqual([]);
        },
      );

      then('each line says why it exists', () => {
        const whyAbsent = lines
          .filter(([, line]) => !String(line.why ?? '').trim())
          .map(([name]) => name);
        expect(whyAbsent).toEqual([]);
      });
    });

    when('[t3] the build is read', () => {
      then('the dist build copies mech.yml beside boot.yml', () => {
        const pkg = JSON.parse(
          fs.readFileSync(
            path.join(__dirname, '../../../package.json'),
            'utf-8',
          ),
        );
        expect(pkg.scripts['build:complete:dist']).toContain(
          "--include='**/mech.yml'",
        );
      });
    });
  });
});
