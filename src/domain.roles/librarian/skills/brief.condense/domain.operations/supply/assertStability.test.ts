import { BadRequestError } from 'helpful-errors';
import { getError } from 'test-fns';

import type { ConsensusStability } from '../../../../../../domain.operations/kernelize/extractKernels';
import { assertStability } from './assertStability';

describe('assertStability', () => {
  describe('when meanJaccard >= 0.7', () => {
    it('should not throw for meanJaccard = 0.7', () => {
      const stability: ConsensusStability = {
        meanJaccard: 0.7,
        minJaccard: 0.65,
        maxJaccard: 0.75,
        comparisons: 3,
      };

      expect(() => assertStability({ stability })).not.toThrow();
    });

    it('should not throw for meanJaccard = 0.85', () => {
      const stability: ConsensusStability = {
        meanJaccard: 0.85,
        minJaccard: 0.8,
        maxJaccard: 0.9,
        comparisons: 3,
      };

      expect(() => assertStability({ stability })).not.toThrow();
    });

    it('should not throw for meanJaccard = 1.0 (perfect stability)', () => {
      const stability: ConsensusStability = {
        meanJaccard: 1.0,
        minJaccard: 1.0,
        maxJaccard: 1.0,
        comparisons: 3,
      };

      expect(() => assertStability({ stability })).not.toThrow();
    });
  });

  describe('when meanJaccard < 0.7', () => {
    it('should throw for meanJaccard = 0.69', async () => {
      const stability: ConsensusStability = {
        meanJaccard: 0.69,
        minJaccard: 0.6,
        maxJaccard: 0.75,
        comparisons: 3,
      };

      const error = await getError(() => assertStability({ stability }));
      expect(error).toBeInstanceOf(BadRequestError);
    });

    it('should throw for meanJaccard = 0.5', async () => {
      const stability: ConsensusStability = {
        meanJaccard: 0.5,
        minJaccard: 0.4,
        maxJaccard: 0.6,
        comparisons: 3,
      };

      const error = await getError(() => assertStability({ stability }));
      expect(error).toBeInstanceOf(BadRequestError);
    });

    it('should throw for meanJaccard = 0.0', async () => {
      const stability: ConsensusStability = {
        meanJaccard: 0.0,
        minJaccard: 0.0,
        maxJaccard: 0.0,
        comparisons: 3,
      };

      const error = await getError(() => assertStability({ stability }));
      expect(error).toBeInstanceOf(BadRequestError);
    });

    it('should include actual meanJaccard value in error message', async () => {
      const stability: ConsensusStability = {
        meanJaccard: 0.42,
        minJaccard: 0.3,
        maxJaccard: 0.5,
        comparisons: 3,
      };

      const error = await getError(() => assertStability({ stability }));
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('0.42');
    });

    it('should include threshold in error message', async () => {
      const stability: ConsensusStability = {
        meanJaccard: 0.5,
        minJaccard: 0.4,
        maxJaccard: 0.6,
        comparisons: 3,
      };

      const error = await getError(() => assertStability({ stability }));
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('0.7');
    });
  });
});
