import * as fs from 'fs/promises';
import * as path from 'path';
import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import type { ConceptKernel } from '../../../../../../domain.operations/kernelize/extractKernels';
import { compressViaBhrain } from '../../../brief.compress/compress.via.bhrain';
import { checkRetention } from './checkRetention';

const BRAIN_SLUG = 'xai/grok/3-mini';

// test fixtures
const FIXTURES_DIR = path.join(__dirname, '../../.test/fixtures/briefs');
const STABLE_BRIEF_PATH = path.join(FIXTURES_DIR, 'stable-rule.md');

describe('checkRetention', () => {
  given('[case1] compressed content with high retention', () => {
    const scene = useBeforeAll(async () => {
      const briefContent = await fs.readFile(STABLE_BRIEF_PATH, 'utf-8');

      // define kernels that should be present in the stable rule brief
      const kernels: ConceptKernel[] = [
        {
          id: 'k1',
          concept: 'all exported functions must have explicit return types',
          category: 'rule' as const,
        },
        {
          id: 'k2',
          concept: 'async functions must specify Promise<T>',
          category: 'rule' as const,
        },
      ];

      // compress with req-kernels to ensure retention
      const compressed = await compressViaBhrain({
        content: briefContent,
        brainSlug: BRAIN_SLUG,
        mechanisms: ['req-kernels', 'sitrep-taskaware'],
        kernels: kernels.map((k) => k.concept),
        force: true, // bypass cache to avoid stale entries from other tests
      });

      return { briefContent, kernels, compressed };
    });

    when('[t0] retention is checked', () => {
      const result = useThen('check succeeds', async () =>
        checkRetention({
          kernels: scene.kernels,
          content: scene.compressed.compressed,
          brainSlug: BRAIN_SLUG,
        }),
      );

      then('retained array contains kernels found in compressed', () => {
        expect(result.retained.length).toBeGreaterThan(0);
      });

      then('retentionRate reflects retained count', () => {
        const expectedRate = result.retained.length / scene.kernels.length;
        expect(result.retentionRate).toBeCloseTo(expectedRate, 1);
      });

      then('retentionRate is between 0 and 1', () => {
        expect(result.retentionRate).toBeGreaterThanOrEqual(0);
        expect(result.retentionRate).toBeLessThanOrEqual(1);
      });
    });
  });

  given('[case2] compressed content with kernel loss', () => {
    const scene = useBeforeAll(async () => {
      const briefContent = await fs.readFile(STABLE_BRIEF_PATH, 'utf-8');

      // define kernels - include some that are NOT in the brief
      const kernels: ConceptKernel[] = [
        {
          id: 'k1',
          concept: 'all exported functions must have explicit return types',
          category: 'rule' as const,
        },
        {
          id: 'k2',
          concept: 'seaturtles must wear sunscreen at the beach',
          category: 'rule' as const,
        },
        {
          id: 'k3',
          concept: 'coconuts are mandatory in all code reviews',
          category: 'principle' as const,
        },
      ];

      // compress aggressively without kernel injection
      const compressed = await compressViaBhrain({
        content: briefContent,
        brainSlug: BRAIN_SLUG,
        mechanisms: ['sitrep-aggressive'],
        force: true, // bypass cache to avoid stale entries from other tests
      });

      return { briefContent, kernels, compressed };
    });

    when('[t0] retention is checked', () => {
      const result = useThen('check succeeds', async () =>
        checkRetention({
          kernels: scene.kernels,
          content: scene.compressed.compressed,
          brainSlug: BRAIN_SLUG,
        }),
      );

      then('lost array contains kernels not found in compressed', () => {
        // the fake kernels about seaturtles and coconuts should be lost
        expect(result.lost.length).toBeGreaterThan(0);
      });

      then('retained + lost equals total kernels', () => {
        expect(result.retained.length + result.lost.length).toEqual(
          scene.kernels.length,
        );
      });

      then('retentionRate is less than 1 when kernels are lost', () => {
        if (result.lost.length > 0) {
          expect(result.retentionRate).toBeLessThan(1);
        }
      });
    });
  });

  given('[case3] empty content', () => {
    when('[t0] retention is checked against empty string', () => {
      const kernels: ConceptKernel[] = [
        {
          id: 'k1',
          concept: 'some concept',
          category: 'rule' as const,
        },
      ];

      const result = useThen('check succeeds', async () =>
        checkRetention({
          kernels,
          content: '',
          brainSlug: BRAIN_SLUG,
        }),
      );

      then('all kernels are lost', () => {
        expect(result.lost.length).toEqual(kernels.length);
      });

      then('retentionRate is 0', () => {
        expect(result.retentionRate).toEqual(0);
      });
    });
  });

  given('[case4] no kernels to check', () => {
    when('[t0] retention is checked with empty kernels array', () => {
      const result = useThen('check succeeds', async () =>
        checkRetention({
          kernels: [],
          content: 'some compressed content here',
          brainSlug: BRAIN_SLUG,
        }),
      );

      then('retained is empty', () => {
        expect(result.retained).toHaveLength(0);
      });

      then('lost is empty', () => {
        expect(result.lost).toHaveLength(0);
      });

      then('retentionRate is 1 (vacuously true)', () => {
        // when no kernels to retain, 100% retention by default
        expect(result.retentionRate).toEqual(1);
      });
    });
  });
});
