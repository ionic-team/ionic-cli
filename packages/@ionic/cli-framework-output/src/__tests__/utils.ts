import { dropWhile, enforceLF } from '../utils';

describe('@ionic/cli-framework-output', () => {

  describe('utils', () => {

    describe('dropWhile', () => {

      it('should not return the original array', () => {
        const input: string[] = [];
        const result = dropWhile(input);
        expect(result).not.toBe(input);
        expect(result).toEqual([]);
      });

      it('should filter truthy with default predicate', () => {
        const result = dropWhile([1, 2, 3]);
        expect(result).toEqual([]);
      });

      it('should filter truthy elements with default predicate', () => {
        const result = dropWhile([2, 1, 0]);
        expect(result).toEqual([0]);
      });

      it('should only filter truthy elements from the beginning with default predicate', () => {
        const result = dropWhile([1, 0, 1]);
        expect(result).toEqual([0, 1]);
      });

      it('should only filter elements from the beginning', () => {
        const result = dropWhile(['a', 'b', 'c', 'b', 'a'], item => item === 'a');
        expect(result).toEqual(['b', 'c', 'b', 'a']);
      });

      it('should filter elements from the beginning by type', () => {
        const result = dropWhile(['a', 'b', 0, 'c', 'd', 1], item => typeof item === 'string');
        expect(result).toEqual([0, 'c', 'd', 1]);
      });

    });

    describe('enforceLF', () => {

      it('should convert empty string to newline', () => {
        const result = enforceLF('');
        expect(result).toBe('\n');
      });

      it('should do nothing to a single newline', () => {
        const result = enforceLF('\n');
        expect(result).toBe('\n');
      });

      it('should add newline to text without newline', () => {
        const result = enforceLF('some text');
        expect(result).toBe('some text\n');
      });

      it('should do nothing to multiline text with newline at end', () => {
        const result = enforceLF('some text\nsome more\n');
        expect(result).toBe('some text\nsome more\n');
      });

      it('should add newline to multiline text without newline at end', () => {
        const result = enforceLF('some text\nsome more');
        expect(result).toBe('some text\nsome more\n');
      });

    });

  });

});
