import { cliOptionsToServeOptions } from '../serve';

describe('@ionic/cli-utils', () => {

  describe('commands/serve', () => {

    describe('cliOptionsToServeOptions', () => {

      const defaults = {
        address: '0.0.0.0',
        port: 8100,
        livereloadPort: 35729,
        notificationPort: 53703,
        consolelogs: false,
        serverlogs: false,
        livereload: true,
        proxy: true,
        lab: false,
        open: false,
        devapp: true,
        externalAddressRequired: false,
        iscordovaserve: false,
      };

      it('should provide defaults with no options', () => {
        const result = cliOptionsToServeOptions({});
        expect(result).toEqual(defaults);
      });

      it('should provide options from negations of cli flag defaults', () => {
        const result = cliOptionsToServeOptions({ consolelogs: true, serverlogs: true, livereload: false, proxy: false, devapp: false, lab: true, open: true, externalAddressRequired: true, iscordovaserve: true });
        expect(result).toEqual({ ...defaults, consolelogs: true, serverlogs: true, livereload: false, proxy: false, devapp: false, lab: true, open: true, externalAddressRequired: true, iscordovaserve: true });
      });

      it('should provide options for optional cli options', () => {
        const result = cliOptionsToServeOptions({ browser: 'google chrome', browseroption: '/#/something', auth: 'test', env: 'prod' });
        expect(result).toEqual({ ...defaults, browser: 'google chrome', browserOption: '/#/something', basicAuth: ['ionic', 'test'], env: 'prod' });
      });

      it('should allow overrides of default values', () => {
        const result = cliOptionsToServeOptions({ address: 'localhost', port: '1111', 'livereload-port': '2222', 'dev-logger-port': '3333' });
        expect(result).toEqual({ ...defaults, address: 'localhost', port: 1111, livereloadPort: 2222, notificationPort: 3333 });
      });

    });

  });

});
