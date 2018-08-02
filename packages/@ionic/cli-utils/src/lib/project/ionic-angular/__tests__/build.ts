import { IonicAngularBuildCLI } from '../build';

describe('@ionic/cli-utils', () => {

  describe('lib/ionic-angular', () => {

    describe('IonicAngularBuildCLI', () => {

      describe('buildOptionsToAppScriptsArgs', () => {

        const options = {
          '--': ['--generateSourceMap', 'false'],
          prod: true,
          aot: true,
          minifyjs: true,
          minifycss: true,
          optimizejs: true,
        };

        it('should transform defaults', async () => {
          const appscripts = new IonicAngularBuildCLI({});
          const result = await appscripts.buildOptionsToAppScriptsArgs({ '--': [] });
          expect(result).toEqual([]);
        });

        it('should transform options', async () => {
          const appscripts = new IonicAngularBuildCLI({});
          const result = await appscripts.buildOptionsToAppScriptsArgs(options);
          expect(result).toEqual(['--prod', '--aot', '--minifyjs', '--minifycss', '--optimizejs', '--generateSourceMap', 'false']);
        });

      });

    });

  });

});
