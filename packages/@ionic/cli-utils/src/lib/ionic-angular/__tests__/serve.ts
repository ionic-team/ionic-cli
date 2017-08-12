import { serveOptionsToAppScriptsArgs } from '../serve';

describe('@ionic/cli-utils', () => {

  describe('ionic-angular', () => {

    describe('serve', () => {

      describe('serveOptionsToAppScriptsArgs', () => {

        const options = {
          address: '0.0.0.0',
          port: 8100,
          livereloadPort: 27000,
          consolelogs: true,
          serverlogs: true,
          nobrowser: false,
          nolivereload: false,
          noproxy: false,
          lab: false,
        };

        it('should transform base options', async () => {
          const result = await serveOptionsToAppScriptsArgs(options);
          expect(result).toEqual(['--address', '0.0.0.0', '--port', '8100', '--livereload-port', '27000', '--consolelogs', '--serverlogs']);
        });

        it('should transform extra options', async () => {
          const result = await serveOptionsToAppScriptsArgs({ browser: 'firefox', browseroption: '/#/tab/dash', platform: 'android', ...options, consolelogs: false, serverlogs: false, nobrowser: true, nolivereload: true, noproxy: true, lab: true });
          expect(result).toEqual(['--address', '0.0.0.0', '--port', '8100', '--livereload-port', '27000', '--nobrowser', '--nolivereload', '--noproxy', '--lab', '--browser', 'firefox', '--browseroption', '/#/tab/dash', '--platform', 'android']);
        });

      });

    });

  });

});
