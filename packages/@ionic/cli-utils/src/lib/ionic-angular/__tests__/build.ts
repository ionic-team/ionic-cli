import { buildOptionsToAppScriptsArgs } from '../build';

describe('@ionic/cli-utils', () => {

  describe('ionic-angular', () => {

    describe('build', () => {

      describe('buildOptionsToAppScriptsArgs', () => {

        const options = {
          _: [],
          prod: true,
          aot: true,
          minifyjs: true,
          minifycss: true,
          optimizejs: true,
        };

        it('should transform defaults', async () => {
          const result = await buildOptionsToAppScriptsArgs({ _: [] });
          expect(result).toEqual([]);
        });

        it('should transform base options', async () => {
          const result = await buildOptionsToAppScriptsArgs(options);
          expect(result).toEqual(['--prod', '--aot', '--minifyjs', '--minifycss', '--optimizejs']);
        });

      });

    });

  });

});
