import { AliasedMap, createCaseInsensitiveObject } from '../';

describe('@ionic/utils-object', () => {

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
      const s: any = Symbol('key');
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

  describe('AliasedMap', () => {

    class MyAliasedMap extends AliasedMap<string, { foo: string; }> {}

    describe('getAliases', () => {

      it('should get empty alias map for empty command map', () => {
        const m = new MyAliasedMap([]);
        const aliasmap = m.getAliases();
        expect(aliasmap.size).toEqual(0);
      });

      it('should get empty alias map for command map with no aliases', () => {
        const m = new MyAliasedMap([['foo', { foo: 'bar' }], ['bar', { foo: 'bar' }]]);
        const aliasmap = m.getAliases();
        expect(aliasmap.size).toEqual(0);
      });

      it('should get alias map for command map with aliases', () => {
        const m = new MyAliasedMap([['foo', { foo: 'bar' }], ['f', 'foo'], ['fo', 'foo']]);
        const aliasmap = m.getAliases();
        expect(aliasmap.size).toEqual(1);
        expect(aliasmap.get('foo')).toEqual(['f', 'fo']);
      });

      it('should get alias map for command map without resolved command', () => {
        const m = new MyAliasedMap([['f', 'foo'], ['fo', 'foo']]);
        const aliasmap = m.getAliases();
        expect(aliasmap.size).toEqual(1);
        expect(aliasmap.get('foo')).toEqual(['f', 'fo']);
      });

    });

    describe('resolveAlias', () => {

      it('should return undefined for unknown command', () => {
        const m = new MyAliasedMap([]);
        expect(m.resolveAlias('bar')).toBeUndefined();
      });

      it('should return command when immediately found', async () => {
        const obj = { foo: 'bar' };
        const m = new MyAliasedMap([['foo', obj]]);
        const result = m.resolveAlias('foo');
        expect(result).toBe(obj);
      });

    });

    describe('keysWithoutAliases', () => {

      it('should return empty array', () => {
        const m = new MyAliasedMap([]);
        expect(m.keysWithoutAliases()).toEqual([]);
      });

      it('should return non-aliased keys for a plain map', async () => {
        const m = new MyAliasedMap([['foo', { foo: 'bar' }], ['bar', { foo: 'bar' }]]);
        const result = m.keysWithoutAliases();
        expect(result).toEqual(['foo', 'bar']);
      });

      it('should return non-aliased keys for a map with aliases', async () => {
        const m = new MyAliasedMap([['foo', { foo: 'bar' }], ['bar', { foo: 'bar' }], ['f', 'foo'], ['b', 'bar']]);
        const result = m.keysWithoutAliases();
        expect(result).toEqual(['foo', 'bar']);
      });

      it('should return non-aliased keys for a map with invalid aliases', async () => {
        const m = new MyAliasedMap([['foo', { foo: 'bar' }], ['f', 'foo'], ['g', 'garbage']]);
        const result = m.keysWithoutAliases();
        expect(result).toEqual(['foo']);
      });

    });

  });

});
