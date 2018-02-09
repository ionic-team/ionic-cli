import { conform } from '../array';

describe('@ionic/cli-framework', () => {

  describe('utils/array', () => {

    describe('conform', () => {

      it('should conform undefined to empty array', () => {
        const result = conform(undefined);
        expect(result).toEqual([]);
      });

      it('should conform a number to a single-item array with that number', () => {
        const result = conform(5);
        expect(result).toEqual([5]);
      });

      it('should conform empty string to a single-item array with empty string', () => {
        const result = conform('');
        expect(result).toEqual(['']);
      });

      it('should conform zero to a single-item array with zero', () => {
        const result = conform(0);
        expect(result).toEqual([0]);
      });

      it('should conform a string to a single-item array with that string', () => {
        const result = conform('foo');
        expect(result).toEqual(['foo']);
      });

      it('should do nothing to an empty array', () => {
        const result = conform([]);
        expect(result).toEqual([]);
      });

      it('should do nothing to an array of numbers', () => {
        const result = conform([1, 2, 3]);
        expect(result).toEqual([1, 2, 3]);
      });

      it('should do nothing to an array of strings', () => {
        const result = conform(['foo', 'bar', 'baz']);
        expect(result).toEqual(['foo', 'bar', 'baz']);
      });

    });

  });

});
