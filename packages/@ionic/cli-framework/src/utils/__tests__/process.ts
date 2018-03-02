import { createProcessEnv } from '../process';

describe('@ionic/cli-framework', () => {

  describe('utils/process', () => {

    describe('createProcessEnv', () => {

      describe('linux', () => {

        const originalPlatform = process.platform;

        beforeAll(() => {
          Object.defineProperty(process, 'platform', { value: 'linux' });
        });

        it('should be case sensitive', () => {
          const o = createProcessEnv();
          o['asdf'] = 'val1';
          o['ASDF'] = 'val2';
          expect(o).toEqual({ 'asdf': 'val1', 'ASDF': 'val2' });
        });

        it('should use sources and be case sensitive', () => {
          const o = createProcessEnv({ 'hello': 'you' }, { 'hello': 'world' });
          o['asdf'] = 'val1';
          o['ASDF'] = 'val2';
          expect(o['hello']).toEqual('world');
          expect(o).toEqual({ 'asdf': 'val1', 'ASDF': 'val2', 'hello': 'world' });
        });

        afterAll(() => {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        });

      });

      describe('windows', () => {

        const originalPlatform = process.platform;

        beforeAll(() => {
          Object.defineProperty(process, 'platform', { value: 'win32' });
        });

        it('should be case insensitive', () => {
          const o = createProcessEnv();
          o['asdf'] = 'val1';
          o['ASDF'] = 'val2';
          expect(o).toEqual({ 'asdf': 'val2' });
        });

        it('should use sources and be case insensitive', () => {
          const o = createProcessEnv({ 'HELLO': 'YOU' }, { 'hello': 'world' });
          o['asdf'] = 'val1';
          o['ASDF'] = 'val2';
          expect(o['hello']).toEqual('world');
          expect(o).toEqual({ 'asdf': 'val2', 'hello': 'world' });
        });

        afterAll(() => {
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        });

      });

    });

  });

});
