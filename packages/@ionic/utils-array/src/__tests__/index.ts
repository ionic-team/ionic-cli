import { concurrentFilter, conform, filter, reduce, map, splice, move, replace } from '../';

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

  describe('splice', () => {

    const array = ['a', 'b', 'c'];

    it('should delete all items with start equal to zero and without deleteCount', () => {
      const result = splice(array, 0);
      expect(result).toEqual([]);
      expect(result).not.toBe(array);
    });

    it('should leave array unchanged with start equal to zero and with deleteCount equal to zero', () => {
      const result = splice(array, 0, 0);
      expect(result).toEqual(array);
      expect(result).not.toBe(array);
    });

    it('should delete one from index position 1', () => {
      const result = splice(array, 1, 1);
      expect(result).toEqual(['a', 'c']);
      expect(result).not.toBe(array);
    });

    it('should delete two from index position 0 and then add an item', () => {
      const result = splice(array, 0, 2, 'z');
      expect(result).toEqual(['z', 'c']);
      expect(result).not.toBe(array);
    });

  });

  describe('move', () => {

    const array = ['a', 'b', 'c'];

    it('should move first element to last element', () => {
      const result = move(array, 0, 2);
      expect(result).toEqual(['b', 'c', 'a']);
    });

    it('should move last element to first element', () => {
      const result = move(array, 2, 0);
      expect(result).toEqual(['c', 'a', 'b']);
    });

    it('should not move element with equal indexes', () => {
      const result = move(array, 1, 1);
      expect(result).toEqual(['a', 'b', 'c']);
      expect(result).not.toBe(array);
    });

    describe('out of bounds', () => {
      it('should leave array unchanged for from index greater than array length', () => {
        const result = move(array, 5, 0);
        expect(result).toEqual(['a', 'b', 'c']);
        expect(result).not.toBe(array);
      });

      it('should leave array unchanged for to index greater than array length', () => {
        const result = move(array, 0, 5);
        expect(result).toEqual(['a', 'b', 'c']);
        expect(result).not.toBe(array);
      });

      it('should leave array unchanged for from index less than zero', () => {
        const result = move(array, -1, 0);
        expect(result).toEqual(['a', 'b', 'c']);
        expect(result).not.toBe(array);
      });

      it('should leave array unchanged for to index less than zero', () => {
        const result = move(array, 0, -1);
        expect(result).toEqual(['a', 'b', 'c']);
        expect(result).not.toBe(array);
      });

    });

  });

  describe('replace', () => {

    const array = ['a', 'b', 'c'];

    it('should replace first element with z', () => {
      const result = replace(array, 0, 'z');
      expect(result).toEqual(['z', 'b', 'c']);
      expect(result).not.toBe(array);
    });

    it('should replace last element with z', () => {
      const result = replace(array, 2, 'z');
      expect(result).toEqual(['a', 'b', 'z']);
      expect(result).not.toBe(array);
    });

    describe('out of bounds', () => {

      it('should leave array unchanged for index less than zero', () => {
        const result = replace(array, -1, 'z');
        expect(result).toEqual(['a', 'b', 'c']);
        expect(result).not.toBe(array);
      });

      it('should leave array unchanged for index greater than array index', () => {
        const result = replace(array, 5, 'z');
        expect(result).toEqual(['a', 'b', 'c']);
        expect(result).not.toBe(array);
      });

    });

  });

});
