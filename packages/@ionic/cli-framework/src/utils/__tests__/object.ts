import { createCaseInsensitiveObject } from '../object';

describe('@ionic/cli-framework', () => {

  describe('utils/object', () => {

    describe('createCaseInsensitiveObject', () => {

      it('should return undefined for a bad key', () => {
        const o = createCaseInsensitiveObject<string>();
        expect(o['bad key']).toBeUndefined();
      });

      it('should return value for a good key', () => {
        const o = createCaseInsensitiveObject<string>();
        o['good key'] = 'val';
        expect(o['good key']).toEqual('val');
      });

      it('should return value for a good key case insensitive', () => {
        const o = createCaseInsensitiveObject<string>();
        o['good key'] = 'val';
        expect(o['GOOD key']).toEqual('val');
      });

      it('should have correct number of keys', () => {
        const o = createCaseInsensitiveObject<string>();
        o['good KEY'] = 'val';
        expect(Object.keys(o).length).toEqual(1);
      });

      it('should delete keys case-insensitively', () => {
        const o = createCaseInsensitiveObject<string>();
        o['good KEY'] = 'val';
        expect(o['GOOD key']).toEqual('val');
        expect(delete o['GooD kEy']).toBe(true);
        expect(delete o['BaD kEy']).toBe(true);
        expect(Object.keys(o).length).toEqual(0);
      });

      it('should check for existence of keys case-insensitively', () => {
        const o = createCaseInsensitiveObject<string>();
        o['good KEY'] = 'val';
        expect('GOOD key' in o).toBe(true);
        expect('BAD key' in o).toBe(false);
      });

      it('should work for property keys that are symbols', () => {
        const o = createCaseInsensitiveObject<string>();
        const s = Symbol('key');
        o[s] = 'val';
        expect(o[s]).toEqual('val');
      });

      it('should work for property keys that are numbers', () => {
        const o = createCaseInsensitiveObject<string>();
        o[10] = 'val';
        expect(o[10]).toEqual('val');
      });

      it('should work with object spread', () => {
        const o = createCaseInsensitiveObject<string>();
        o['GOOD key'] = 'val1';
        o['good KEY'] = 'val2';
        expect({ ...o }).toEqual({ 'good key': 'val2' });
      });

    });

  });

});
