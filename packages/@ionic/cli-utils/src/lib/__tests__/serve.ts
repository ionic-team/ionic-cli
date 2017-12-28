import { ServeRunner } from '../serve';

describe('@ionic/cli-utils', () => {

  describe('lib/serve', () => {

    describe('createOptionsFromCommandLine', () => {

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
        platform: undefined,
      };

      it('should provide defaults with no options', () => {
        const result = ServeRunner.createOptionsFromCommandLine([], {});
        expect(result).toEqual(defaults);
      });

      it('should provide options from negations of cli flag defaults', () => {
        const result = ServeRunner.createOptionsFromCommandLine([], { consolelogs: true, serverlogs: true, livereload: false, proxy: false, devapp: false, lab: true, open: true, externalAddressRequired: true, iscordovaserve: true });
        expect(result).toEqual({ ...defaults, consolelogs: true, serverlogs: true, livereload: false, proxy: false, devapp: false, lab: true, open: true, externalAddressRequired: true, iscordovaserve: true });
      });

      it('should allow overrides of default values', () => {
        const result = ServeRunner.createOptionsFromCommandLine([], { address: 'localhost', port: '1111', 'livereload-port': '2222', 'dev-logger-port': '3333' });
        expect(result).toEqual({ ...defaults, address: 'localhost', port: 1111, livereloadPort: 2222, notificationPort: 3333 });
      });

      it('should respect --local flag', () => {
        const result = ServeRunner.createOptionsFromCommandLine([], { local: true });
        expect(result).toEqual({ ...defaults, address: 'localhost', devapp: false });
      });

    });

  });

});
