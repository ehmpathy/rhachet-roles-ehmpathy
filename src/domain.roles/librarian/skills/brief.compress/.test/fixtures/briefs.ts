/**
 * .what = sample briefs for compression tests and perfevals
 * .why = provides realistic markdown content with varying complexity
 *
 * .note = briefs are read from files in .test/fixtures/briefs/ directory
 */

import * as fs from 'fs';
import * as path from 'path';

const BRIEFS_DIR = path.join(__dirname, 'briefs');

/**
 * .what = read brief content from fixture file
 * .why = keeps brief content in separate .md files for easier maintenance
 */
const readBrief = (filename: string): string => {
  const filepath = path.join(BRIEFS_DIR, filename);
  return fs.readFileSync(filepath, 'utf-8');
};

/**
 * .what = brief metadata with lazy-loaded content
 * .why = file reads happen at test time, not module load time
 */
export interface TestBrief {
  name: string;
  type: 'rule' | 'concept' | 'lesson' | 'tactic' | 'reference';
  filename: string;
  expectedKeyTerms: string[];
}

/**
 * .what = all test briefs with metadata
 * .why = representative sample across brief types for perfeval
 */
export const TEST_BRIEF_METADATA: TestBrief[] = [
  {
    name: 'input-context-pattern',
    type: 'rule',
    filename: 'input-context-pattern.md',
    expectedKeyTerms: ['input', 'context', 'pattern'],
  },
  {
    name: 'dependency-injection',
    type: 'concept',
    filename: 'dependency-injection.md',
    expectedKeyTerms: ['dependency', 'injection', 'context'],
  },
  {
    name: 'bdd-testing',
    type: 'lesson',
    filename: 'bdd-testing.md',
    expectedKeyTerms: ['given', 'when', 'then', 'test'],
  },
  {
    name: 'forbid-gerunds',
    type: 'rule',
    filename: 'forbid-gerunds.md',
    expectedKeyTerms: ['gerund', 'blocker'],
  },
  {
    name: 'idempotency',
    type: 'tactic',
    filename: 'idempotency.md',
    expectedKeyTerms: ['idempotent', 'procedure'],
  },
  {
    name: 'domain-objects-ref',
    type: 'reference',
    filename: 'domain-objects-ref.md',
    expectedKeyTerms: ['DomainEntity', 'DomainLiteral', 'serialize'],
  },
  {
    name: 'seaturtle-software',
    type: 'concept',
    filename: 'seaturtle-software.md',
    expectedKeyTerms: ['seaturtle', 'wet', 'shell'],
  },
  {
    name: 'seaturtle-identity',
    type: 'rule',
    filename: 'seaturtle-identity.md',
    expectedKeyTerms: ['seaturtle', 'noice', 'turtally'],
  },
];

/**
 * .what = load test brief with content
 * .why = reads file content when needed
 */
export const loadTestBrief = (
  metadata: TestBrief,
): TestBrief & { content: string } => ({
  ...metadata,
  content: readBrief(metadata.filename),
});

/**
 * .what = load all test briefs with content
 * .why = convenience function to load all briefs at once
 */
export const loadAllTestBriefs = (): Array<TestBrief & { content: string }> =>
  TEST_BRIEF_METADATA.map(loadTestBrief);

/**
 * .what = legacy export for backward compatibility
 * .why = prior tests may reference TEST_BRIEFS directly
 * .note = lazy evaluation via getter to defer file reads
 */
export const TEST_BRIEFS = TEST_BRIEF_METADATA.map((metadata) => ({
  name: metadata.name,
  type: metadata.type,
  get content(): string {
    return readBrief(metadata.filename);
  },
  expectedKeyTerms: metadata.expectedKeyTerms,
}));

/**
 * .what = individual brief exports for backward compat
 * .why = prior tests import specific briefs directly
 */
export const BRIEF_INPUT_CONTEXT_PATTERN = readBrief('input-context-pattern.md');
export const BRIEF_DEPENDENCY_INJECTION = readBrief('dependency-injection.md');
export const BRIEF_BDD_TESTING = readBrief('bdd-testing.md');
export const BRIEF_FORBID_GERUNDS = readBrief('forbid-gerunds.md');
export const BRIEF_IDEMPOTENCY = readBrief('idempotency.md');
export const BRIEF_DOMAIN_OBJECTS_REF = readBrief('domain-objects-ref.md');
export const BRIEF_SEATURTLE_SOFTWARE = readBrief('seaturtle-software.md');
export const BRIEF_SEATURTLE_IDENTITY = readBrief('seaturtle-identity.md');
