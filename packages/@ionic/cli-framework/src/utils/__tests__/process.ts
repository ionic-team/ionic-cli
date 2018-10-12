describe('@ionic/cli-framework', () => {

  describe('utils/process', () => {

    describe('createProcessEnv', () => {

      describe('non-windows', () => {

        const mock_terminal = { TERMINAL_INFO: { windows: false } };
        jest.resetModules();
        jest.mock('../terminal', () => mock_terminal);
        const proc = require('../process');

        it('should be case sensitive', () => {
          const o = proc.createProcessEnv();
          o['asdf'] = 'val1';
          o['ASDF'] = 'val2';
          expect(o).toEqual({ 'asdf': 'val1', 'ASDF': 'val2' });
        });

        it('should use sources and be case sensitive', () => {
          const o = proc.createProcessEnv({ 'hello': 'you' }, { 'hello': 'world' });
          o['asdf'] = 'val1';
          o['ASDF'] = 'val2';
          expect(o['hello']).toEqual('world');
          expect(o).toEqual({ 'asdf': 'val1', 'ASDF': 'val2', 'hello': 'world' });
        });

      });

      describe('windows', () => {

        const mock_terminal = { TERMINAL_INFO: { windows: true } };
        jest.resetModules();
        jest.mock('../terminal', () => mock_terminal);
        const proc = require('../process');

        it('should be case insensitive', () => {
          const o = proc.createProcessEnv();
          o['asdf'] = 'val1';
          o['ASDF'] = 'val2';
          expect(o).toEqual({ 'asdf': 'val2' });
        });

        it('should use sources and be case insensitive', () => {
          const o = proc.createProcessEnv({ 'HELLO': 'YOU' }, { 'hello': 'world' });
          o['asdf'] = 'val1';
          o['ASDF'] = 'val2';
          expect(o['hello']).toEqual('world');
          expect(o).toEqual({ 'asdf': 'val2', 'hello': 'world' });
        });

      });

    });

  });

});
