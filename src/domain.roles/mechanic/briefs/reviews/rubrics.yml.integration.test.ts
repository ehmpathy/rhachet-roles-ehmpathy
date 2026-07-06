import * as fs from 'fs';
import * as path from 'path';
import { given, then, when } from 'test-fns';
import * as yaml from 'yaml';

/**
 * .what = sync test for rubrics.yml files
 * .why  = ensure rubric slugs in yaml match skill file names
 */

const DOMAIN_ROLES_DIR = path.join(__dirname, '../../..');

const ROLES_WITH_REVIEWS = ['mechanic', 'architect', 'ergonomist'];

interface Rubric {
  slug: string;
  purpose: string;
  rules: string[];
  refs?: string[];
}

interface RubricsYml {
  rubrics: Rubric[];
}

describe('rubrics.yml sync', () => {
  given('[case1] each role has rubrics.yml', () => {
    ROLES_WITH_REVIEWS.forEach((role) => {
      when(`[t0] ${role} rubrics.yml`, () => {
        const rubricsPath = path.join(
          DOMAIN_ROLES_DIR,
          role,
          'briefs/reviews/rubrics.yml',
        );

        then('file exists', () => {
          expect(fs.existsSync(rubricsPath)).toBe(true);
        });

        then('parses as valid yaml', () => {
          const content = fs.readFileSync(rubricsPath, 'utf-8');
          const parsed = yaml.parse(content) as RubricsYml;
          expect(parsed.rubrics).toBeDefined();
          expect(Array.isArray(parsed.rubrics)).toBe(true);
        });
      });
    });
  });

  given('[case2] rubric slugs match skill files', () => {
    ROLES_WITH_REVIEWS.forEach((role) => {
      when(`[t0] ${role} rubrics`, () => {
        const rubricsPath = path.join(
          DOMAIN_ROLES_DIR,
          role,
          'briefs/reviews/rubrics.yml',
        );
        const skillsDir = path.join(DOMAIN_ROLES_DIR, role, 'skills/review');

        const content = fs.readFileSync(rubricsPath, 'utf-8');
        const parsed = yaml.parse(content) as RubricsYml;

        parsed.rubrics.forEach((rubric) => {
          then(`skill exists for ${rubric.slug}`, () => {
            const skillPath = path.join(
              skillsDir,
              `review.rubric=${rubric.slug}.sh`,
            );
            expect(fs.existsSync(skillPath)).toBe(true);
          });
        });
      });
    });
  });

  given('[case3] skill files have rubric entry', () => {
    ROLES_WITH_REVIEWS.forEach((role) => {
      when(`[t0] ${role} skill files`, () => {
        const rubricsPath = path.join(
          DOMAIN_ROLES_DIR,
          role,
          'briefs/reviews/rubrics.yml',
        );
        const skillsDir = path.join(DOMAIN_ROLES_DIR, role, 'skills/review');

        const content = fs.readFileSync(rubricsPath, 'utf-8');
        const parsed = yaml.parse(content) as RubricsYml;
        const slugs = new Set(parsed.rubrics.map((r) => r.slug));

        // get all review.rubric=*.sh files
        const files = fs.readdirSync(skillsDir);
        const rubricFiles = files.filter((f) => f.startsWith('review.rubric='));

        rubricFiles.forEach((file) => {
          then(`rubric entry exists for ${file}`, () => {
            const slug = file.replace('review.rubric=', '').replace('.sh', '');
            expect(slugs.has(slug)).toBe(true);
          });
        });
      });
    });
  });
});
