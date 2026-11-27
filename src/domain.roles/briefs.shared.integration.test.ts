import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
} from 'fs';
import { basename, isAbsolute, join, relative, sep } from 'path';
import { given, then, when } from 'test-fns';

/**
 * .what = each shared brief — one role's file, linked into another role — resolves to its owner, and cites only what every role that ships it can open
 * .why = a shared brief is one text read from two roles; a citation one of them cannot open, or a link that breaks on a clone, fails here first
 * .note = classified integration: it reads the briefs from disk (rule.forbid.unit.remote-boundaries)
 */

/**
 * .what = a brief name cited in backticks, by the prefixes briefs carry
 */
const BRIEF_CITATION = /`((?:rule|define|ref|howto|philosophy)\.[^`\s]+)`/g;

type BriefShared = {
  linkPath: string;
  linkRole: string;
  linkTarget: string;
  ownerPath: string | null;
  ownerRole: string | null;
};

/**
 * .what = every role dir: a dir that contains a briefs dir; `.evals` and other support dirs contain none
 */
const getAllRoles = (): string[] =>
  readdirSync(__dirname, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(__dirname, name, 'briefs')));

/**
 * .what = every brief file under one role's briefs dir, as paths relative to `src/domain.roles/`
 */
const getAllBriefPaths = (input: { role: string }): string[] =>
  readdirSync(join(__dirname, input.role, 'briefs'), { recursive: true })
    .map(String)
    .filter((path) => path.endsWith('.md') || path.endsWith('.md.min'))
    .map((path) => join(input.role, 'briefs', path));

/**
 * .what = the brief a link resolves to, as a path relative to `src/domain.roles/`, with its role; null when the target is absent
 */
const asBriefShared = (input: { linkPath: string }): BriefShared => {
  const linkAbsolute = join(__dirname, input.linkPath);
  const linkTarget = readlinkSync(linkAbsolute);
  const ownerPath = existsSync(linkAbsolute)
    ? relative(realpathSync(__dirname), realpathSync(linkAbsolute))
    : null;
  return {
    linkPath: input.linkPath,
    linkRole: input.linkPath.split(sep)[0]!,
    linkTarget,
    ownerPath,
    ownerRole: ownerPath?.split(sep)[0] ?? null,
  };
};

/**
 * .what = the brief names a text cites that open in neither the given role nor a role its line marks
 * .why = a mechanic-only clone cannot open an architect brief; the mark `(architect)` tells it where the brief lives
 */
const getAllCitationsUnreachable = (input: {
  role: string;
  text: string;
  pathsByRole: Record<string, string[]>;
}): string[] => {
  const shipsIn = (name: string, role: string): boolean =>
    (input.pathsByRole[role] ?? []).some((path) =>
      basename(path).startsWith(`${name}.`),
    );
  return input.text.split('\n').flatMap((line) =>
    [...line.matchAll(BRIEF_CITATION)]
      .map((match) => match[1]!)
      .filter((name) => !shipsIn(name, input.role))
      .filter(
        (name) =>
          !Object.keys(input.pathsByRole).some(
            (role) =>
              (line.includes(`(${role})`) || line.includes(`, ${role})`)) &&
              shipsIn(name, role),
          ),
      ),
  );
};

describe('briefs.shared', () => {
  const roles = getAllRoles();
  const pathsByRole = Object.fromEntries(
    roles.map((role) => [role, getAllBriefPaths({ role })]),
  );
  const shared = roles
    .flatMap((role) => pathsByRole[role] ?? [])
    .filter((path) => lstatSync(join(__dirname, path)).isSymbolicLink())
    .map((linkPath) => asBriefShared({ linkPath }));

  given('[case1] the briefs across every role', () => {
    when('[t0] they are scanned for links', () => {
      then('the scan finds the shared briefs we know are there', () => {
        // the control on the control: a scan that finds naught would pass every check below vacuously
        expect(shared.map((brief) => basename(brief.linkPath)).sort()).toEqual(
          expect.arrayContaining([
            'define.constraint.kind=invariant.md',
            'define.constraint.kind=invariant.md.min',
          ]),
        );
      });

      then('the roster is snapshotted, so a reviewer sees each link', () => {
        expect(
          shared.map((brief) => ({
            linkPath: brief.linkPath,
            ownerPath: brief.ownerPath,
          })),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case2] a crafted citation that crosses roles', () => {
    const pathsCrafted = {
      architect: ['architect/briefs/rule.forbid.wipeout.md'],
      mechanic: ['mechanic/briefs/define.swell.md'],
    };

    when('[t0] the line carries no role mark', () => {
      then('the citation is unreachable', () => {
        expect(
          getAllCitationsUnreachable({
            role: 'mechanic',
            text: '- `rule.forbid.wipeout` — paddle wide of the rocks',
            pathsByRole: pathsCrafted,
          }),
        ).toEqual(['rule.forbid.wipeout']);
      });
    });

    when('[t1] the line marks the role that ships it', () => {
      then('the citation is reachable', () => {
        expect(
          getAllCitationsUnreachable({
            role: 'mechanic',
            text: '- `rule.forbid.wipeout` (architect) — paddle wide of the rocks',
            pathsByRole: pathsCrafted,
          }),
        ).toEqual([]);
      });
    });
  });

  shared.forEach((brief) => {
    given(`[case:${brief.linkPath}] the shared brief`, () => {
      when('[t0] the link is read', () => {
        then('it resolves to a brief that exists', () => {
          expect(brief.ownerPath).not.toBeNull();
        });

        then('the link is relative, so it survives a clone or a move', () => {
          expect(isAbsolute(brief.linkTarget)).toEqual(false);
        });

        then("it resolves into another role's briefs, its owner", () => {
          expect(brief.ownerRole).not.toEqual(brief.linkRole);
          expect(brief.ownerPath?.split(sep)[1]).toEqual('briefs');
        });

        then('the owner file is a real file, not a link of its own', () => {
          expect(
            lstatSync(join(__dirname, brief.ownerPath ?? '')).isSymbolicLink(),
          ).toEqual(false);
        });

        then(
          'each citation opens from every role that ships it, or marks the role that does',
          () => {
            const text = readFileSync(join(__dirname, brief.linkPath), 'utf-8');
            const unreachable = [brief.ownerRole ?? '', brief.linkRole].flatMap(
              (role) =>
                getAllCitationsUnreachable({ role, text, pathsByRole }).map(
                  (name) => `${role}: ${name}`,
                ),
            );
            expect(unreachable).toEqual([]);
          },
        );
      });
    });
  });
});
