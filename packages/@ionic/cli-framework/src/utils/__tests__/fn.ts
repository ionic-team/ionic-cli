import { resolveValue, resolveValueSync } from '../fn';

describe('@ionic/cli-framework', () => {

  describe('fn', () => {

    describe('resolveValue', () => {

      it('should resolve with undefined with 0 functions', async () => {
        const result = await resolveValue();
        expect(result).not.toBeDefined();
      });

      it('should resolve with undefined with functions that never resolve values', async () => {
        const result = await resolveValue(async () => {}, async () => {}, async () => {});
        expect(result).not.toBeDefined();
      });

      it('should resolve with value of first function that resolve value', async () => {
        const result = await resolveValue(async () => 1, async () => 2, async () => 3);
        expect(result).toBe(1);
      });

      it('should skip functions that do not resolve values', async () => {
        const result = await resolveValue(async () => undefined, async () => 2, async () => 3);
        expect(result).toBe(2);
      });

      describe('falsy values', () => {

        it('should resolve with null', async () => {
          const result = await resolveValue(async () => null, async () => 'foo');
          expect(result).toBe(null);
        });

        it('should resolve with 0', async () => {
          const result = await resolveValue(async () => 0, async () => 5);
          expect(result).toBe(0);
        });

        it('should resolve with empty string', async () => {
          const result = await resolveValue(async () => '', async () => 'foo');
          expect(result).toBe('');
        });

      });

    });

    describe('resolveValueSync', () => {

      it('should return undefined with 0 functions', () => {
        const result = resolveValueSync();
        expect(result).not.toBeDefined();
      });

      it('should return undefined with functions that never return values', () => {
        const result = resolveValueSync(() => {}, () => {}, () => {});
        expect(result).not.toBeDefined();
      });

      it('should return value of first function that return value', () => {
        const result = resolveValueSync(() => 1, () => 2, () => 3);
        expect(result).toBe(1);
      });

      it('should skip functions that do not return values', () => {
        const result = resolveValueSync(() => undefined, () => 2, () => 3);
        expect(result).toBe(2);
      });

      describe('falsy values', () => {

        it('should return null', () => {
          const result = resolveValueSync(() => null, () => 'foo');
          expect(result).toBe(null);
        });

        it('should return 0', () => {
          const result = resolveValueSync(() => 0, () => 5);
          expect(result).toBe(0);
        });

        it('should return empty string', () => {
          const result = resolveValueSync(() => '', () => 'foo');
          expect(result).toBe('');
        });

      });

    });

  });

});
