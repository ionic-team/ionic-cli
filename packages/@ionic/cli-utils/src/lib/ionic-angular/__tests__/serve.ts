import { serveOptionsToAppScriptsArgs } from '../serve';

describe('@ionic/cli-utils', () => {

  describe('ionic-angular', () => {

    describe('serve', () => {

      describe('serveOptionsToAppScriptsArgs', () => {

        const options = {
          address: '0.0.0.0',
          port: 8100,
          livereloadPort: 27000,
          notificationPort: 50000,
          consolelogs: true,
          serverlogs: true,
          open: true,
          livereload: true,
          proxy: true,
          lab: false,
        };

        it('should transform base options', async () => {
          const result = await serveOptionsToAppScriptsArgs(options);
          expect(result).toEqual(['--address', '0.0.0.0', '--port', '8100', '--livereload-port', '27000', '--dev-logger-port', '50000', '--consolelogs', '--serverlogs', '--nobrowser']);
        });

        it('should transform extra options', async () => {
          const result = await serveOptionsToAppScriptsArgs({ platform: 'android', ...options, consolelogs: false, serverlogs: false, open: false, livereload: false, proxy: false, lab: true });
          expect(result).toEqual(['--address', '0.0.0.0', '--port', '8100', '--livereload-port', '27000', '--dev-logger-port', '50000', '--nobrowser', '--nolivereload', '--noproxy', '--lab', '--platform', 'android']);
        });

      });

    });

  });

});
