import { promiseMap } from '../promisify';

describe('promisify', () => {
  describe('promiseMap', () => {
    it('should run promise threads', async function() {
      var asyncFunc = jest.fn();

      asyncFunc.mockImplementation(function(value) {
        return Promise.resolve(value + '-1');
      });

      const results = await promiseMap(asyncFunc, [
        'red',
        'blue',
        'green'
      ], 2);

      expect(asyncFunc.mock.calls.length).toEqual(3);
      expect(results).toEqual(['red-1', 'blue-1', 'green-1']);
    });
  });
});
