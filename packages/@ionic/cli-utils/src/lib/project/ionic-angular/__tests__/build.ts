import { IonicAngularBuildRunner } from '../build';

describe('@ionic/cli-utils', () => {

  describe('lib/ionic-angular', () => {

    describe('IonicAngularBuildRunner', () => {

      describe('generateAppScriptsArgs', () => {

        const options = {
          '--': ['--generateSourceMap', 'false'],
          prod: true,
          aot: true,
          minifyjs: true,
          minifycss: true,
          optimizejs: true,
        };

        it('should transform defaults', async () => {
          const runner = new IonicAngularBuildRunner({});
          const result = await runner.generateAppScriptsArgs({ '--': [] });
          expect(result).toEqual([]);
        });

        it('should transform options', async () => {
          const runner = new IonicAngularBuildRunner({});
          const result = await runner.generateAppScriptsArgs(options);
          expect(result).toEqual(['--prod', '--aot', '--minifyjs', '--minifycss', '--optimizejs', '--generateSourceMap', 'false']);
        });

      });

    });

  });

});
