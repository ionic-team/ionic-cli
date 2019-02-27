import { concurrentFilter, conform, filter, reduce, map } from '../';

describe('@ionic/utils-array', () => {

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

  describe('concurrentFilter', () => {

    it('should return new empty array', async () => {
      const initial: number[] = [];
      const result = await concurrentFilter(initial, async () => true);
      expect(result).not.toBe(initial);
      expect(result).toEqual([]);
    });

    it('should return new array', async () => {
      const initial = [1, 2, 3];
      const result = await concurrentFilter(initial, async () => true);
      expect(result).not.toBe(initial);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should filter out everything', async () => {
      const initial = [1, 2, 3];
      const result = await concurrentFilter(initial, async () => false);
      expect(result).toEqual([]);
    });

    it('should filter out conditionally', async () => {
      const initial = [1, 2, 3];
      const result = await concurrentFilter(initial, async v => v % 2 === 0);
      expect(result).toEqual([2]);
    });

  });

  describe('filter', () => {

    it('should return new empty array', async () => {
      const initial: number[] = [];
      const result = await filter(initial, async () => true);
      expect(result).not.toBe(initial);
      expect(result).toEqual([]);
    });

    it('should return new array', async () => {
      const initial = [1, 2, 3];
      const result = await filter(initial, async () => true);
      expect(result).not.toBe(initial);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should filter out everything', async () => {
      const initial = [1, 2, 3];
      const result = await filter(initial, async () => false);
      expect(result).toEqual([]);
    });

    it('should filter out conditionally', async () => {
      const initial = [1, 2, 3];
      const result = await filter(initial, async v => v % 2 === 0);
      expect(result).toEqual([2]);
    });

    it('should filter out conditionally using index', async () => {
      const initial = [1, 2, 3];
      const result = await filter(initial, async (v, i) => i % 2 === 0);
      expect(result).toEqual([1, 3]);
    });

    it('should pass array into callback with each iteration', async () => {
      const initial = [1, 2, 3];
      const result = await filter(initial, async (v, i, arr) => { expect(arr).toBe(initial); return false; });
      expect(result).toEqual([]);
    });

  });

  describe('map', () => {

    it('should return new empty array', async () => {
      const initial: number[] = [];
      const result = await map(initial, async () => {});
      expect(result).not.toBe(initial);
      expect(result).toEqual([]);
    });

    it('should return new array', async () => {
      const initial = [1, 2, 3];
      const result = await map(initial, async () => 0);
      expect(result).not.toBe(initial);
      expect(result).toEqual([0, 0, 0]);
    });

    it('should map using current value', async () => {
      const result = await map([1, 2, 3], async v => v + 1);
      expect(result).toEqual([2, 3, 4]);
    });

    it('should map to different data type', async () => {
      const result = await map([1, 2, 3], async () => '');
      expect(result).toEqual(['', '', '']);
    });

    it('should map using current index', async () => {
      const result = await map([1, 2, 3], async (v, i) => String.fromCharCode(i + 65 + 32));
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should pass array into callback with each iteration', async () => {
      const initial = [1, 2, 3];
      const result = await map(initial, async (v, i, arr) => { expect(arr).toBe(initial); return v; });
      expect(result).toEqual([1, 2, 3]);
    });

  });

  describe('reduce', () => {

    it('should throw type error with empty array and no initial value', async () => {
      await expect(reduce([], async () => {})).rejects.toThrow('Reduce of empty array with no initial value');
    });

    it('should reduce to initial value with empty array', async () => {
      const result = await reduce<number>([], async value => value, 10);
      expect(result).toEqual(10);
    });

    it('should reduce to undefined if callback returns nothing', async () => {
      const cb = async () => undefined;
      const result = await reduce([1, 2, 3], cb as any, 0);
      expect(result).toBeUndefined();
    });

    it('should reduce to undefined if callback returns nothing and no initial value supplied', async () => {
      const result = await reduce([1, 2, 3], async () => {});
      expect(result).toBeUndefined();
    });

    it('should reduce via returned values', async () => {
      const result = await reduce(['a', 'b', 'c'], async (acc, v) => acc + v);
      expect(result).toEqual('abc');
    });

    it('should reduce via returned values with initial value', async () => {
      const result = await reduce(['a', 'b', 'c'], async (acc, v) => acc + v, 'answer: ');
      expect(result).toEqual('answer: abc');
    });

    it('should reduce via returned values with initial value using current index', async () => {
      const result = await reduce(['a', 'b', 'c'], async (acc, v, i) => acc + i, 0);
      expect(result).toEqual(3);
    });

    it('should reduce via returned values using accumulator and current index', async () => {
      const result = await reduce<number, string>([1, 2, 3], async (acc, v, i) => String(acc) + String(v + i));
      expect(result).toEqual('135');
    });

    it('should reduce via accumulator', async () => {
      const result = await reduce<number, string[]>([1, 2, 3], async (acc, v) => { acc.push('call: ' + v); return acc; }, []);
      expect(result).toEqual(['call: 1', 'call: 2', 'call: 3']);
    });

    it('should pass array into callback with each iteration', async () => {
      const initial = [1, 2, 3];
      const result = await reduce(initial, async (acc, v, i, arr) => { expect(arr).toBe(initial); return acc; }, []);
      expect(result).toEqual([]);
    });

  });

});
