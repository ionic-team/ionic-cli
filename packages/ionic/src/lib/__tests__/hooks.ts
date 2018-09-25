import { addHook, removeHook, locateHook } from '../hooks';

describe('ionic', () => {

  describe('lib/hooks', () => {

    describe('addHook', () => {

      it('should return array with hook added if given undefined', () => {
        const hooks = addHook('/base', undefined, 'hook.js');
        expect(hooks).toEqual(['hook.js']);
      });

      it('should return array with hook added if given a single string', () => {
        const hooks = addHook('/base', 'other-hook.js', 'hook.js');
        expect(hooks).toEqual(['other-hook.js', 'hook.js']);
      });

      it('should return array with hook added if given an empty array', () => {
        const hooks = addHook('/base', [], 'hook.js');
        expect(hooks).toEqual(['hook.js']);
      });

      it('should return array with hook added if given an array', () => {
        const hooks = addHook('/base', ['other-hook.js'], 'hook.js');
        expect(hooks).toEqual(['other-hook.js', 'hook.js']);
      });

      it('should respect relative paths', () => {
        const hooks = addHook('/base/dir/wow', undefined, '../path/to/hook.js');
        expect(hooks).toEqual(['../path/to/hook.js']);
      });

      it('should respect absolute paths', () => {
        const hooks = addHook('/base', undefined, '/path/to/hook.js');
        expect(hooks).toEqual(['/path/to/hook.js']);
      });

      it('should not add if it already exists', () => {
        const hooks = addHook('/base', ['hook.js'], 'hook.js');
        expect(hooks).toEqual(['hook.js']);
      });

      it('should not add if it already exists as an absolute path', () => {
        const hooks = addHook('/base', ['hook.js'], '/base/hook.js');
        expect(hooks).toEqual(['hook.js']);
      });

    });

    describe('removeHook', () => {

      it('should return empty array if given undefined', () => {
        const hooks = removeHook('/base', undefined, 'hook.js');
        expect(hooks).toEqual([]);
      });

      it('should return empty array if given empty array', () => {
        const hooks = removeHook('/base', [], 'hook.js');
        expect(hooks).toEqual([]);
      });

      it('should return array if given a single string', () => {
        const hooks = removeHook('/base', 'other-hook.js', 'hook.js');
        expect(hooks).toEqual(['other-hook.js']);
      });

      it('should return empty array if given same hook', () => {
        const hooks = removeHook('/base', 'hook.js', 'hook.js');
        expect(hooks).toEqual([]);
      });

      it('should return array with hook removed if given an array', () => {
        const hooks = removeHook('/base', ['other-hook.js', 'hook.js'], 'hook.js');
        expect(hooks).toEqual(['other-hook.js']);
      });

      it('should respect relative paths', () => {
        const hooks = removeHook('/base/dir/wow', ['../path/to/hook.js'], '../path/to/hook.js');
        expect(hooks).toEqual([]);
      });

      it('should respect absolute paths', () => {
        const hooks = removeHook('/base', ['/path/to/hook.js'], '/path/to/hook.js');
        expect(hooks).toEqual([]);
      });

      it('should not remove anything if it does not exist', () => {
        const hooks = removeHook('/base', ['other-hook.js'], 'hook.js');
        expect(hooks).toEqual(['other-hook.js']);
      });

      it('should remove it if it exists as a relative path', () => {
        const hooks = removeHook('/base', ['hook.js'], '/base/hook.js');
        expect(hooks).toEqual([]);
      });

    });

    describe('locateHook', () => {

      it('should not locate hook in empty array', () => {
        const i = locateHook('/base', [], 'hook.js');
        expect(i).toEqual(-1);
      });

      it('should not locate hook in array without it', () => {
        const i = locateHook('/base', ['other-hook.js'], 'hook.js');
        expect(i).toEqual(-1);
      });

      it('should locate hook at correct index', () => {
        const i = locateHook('/base', ['hook.js'], 'hook.js');
        expect(i).toEqual(0);
      });

      it('should locate relative hook at correct index', () => {
        const i = locateHook('/base', ['other-hook.js', 'hook.js'], '/base/hook.js');
        expect(i).toEqual(1);
      });

      it('should locate absolute hook at correct index', () => {
        const i = locateHook('/base', ['other-hook.js', '/base/hook.js'], 'hook.js');
        expect(i).toEqual(1);
      });

    });

  });

});
