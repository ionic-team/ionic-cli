import { IonicAngularBuildCLI } from '../build';

describe('ionic', () => {

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
          const appscripts = new IonicAngularBuildCLI({} as any);
          const result = await (appscripts as any).buildOptionsToAppScriptsArgs({ _: [], '--': [] });
          expect(result).toEqual([]);
        });

        it('should transform options', async () => {
          const appscripts = new IonicAngularBuildCLI({} as any);
          const result = await (appscripts as any).buildOptionsToAppScriptsArgs(options);
          expect(result).toEqual(['--prod', '--aot', '--minifyjs', '--minifycss', '--optimizejs', '--generateSourceMap', 'false']);
        });

      });

    });

  });

});
