import { BuildRunner } from '../build';

describe('@ionic/cli-utils', () => {

  describe('lib/ionic-angular', () => {

    describe('BuildRunner', () => {

      describe('generateAppScriptsArgs', () => {

        const options = {
          prod: true,
          aot: true,
          minifyjs: true,
          minifycss: true,
          optimizejs: true,
        };

        it('should transform defaults', async () => {
          const runner = new BuildRunner();
          const result = await runner.generateAppScriptsArgs({});
          expect(result).toEqual([]);
        });

        it('should transform base options', async () => {
          const runner = new BuildRunner();
          const result = await runner.generateAppScriptsArgs(options);
          expect(result).toEqual(['--prod', '--aot', '--minifyjs', '--minifycss', '--optimizejs']);
        });

      });

    });

  });

});
