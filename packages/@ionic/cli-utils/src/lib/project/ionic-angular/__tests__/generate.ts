describe('@ionic/cli-utils', () => {

  describe('ionic-angular', () => {

    describe('tabsPrompt', () => {

      it('should return an array', async () => {
        const env = {
          prompt: jest.fn()
            .mockReturnValueOnce(2)
            .mockReturnValueOnce('CoolTabOne')
            .mockReturnValueOnce('CoolTabTwo')
        };

        const generate = require('../generate');
        const result = await generate.tabsPrompt(env);

        expect(result).toEqual([
          'CoolTabOne',
          'CoolTabTwo'
        ]);

      });

    });

    // describe('getPages', () => {

    //   it('should return an array', async () => {
    //     jest.resetModules();
    //     jest.mock('../../lib/modules', () => ({
    //       load: jest.fn().mockReturnValue({
    //         getNgModules: jest.fn().mockReturnValueOnce([
    //           {
    //             absolutePath: '/path/to/nowhere'
    //           },
    //           {
    //             absolutePath: '/my/awesome/path'
    //           }
    //         ]),
    //         getStringPropertyValue: jest.fn().mockReturnValueOnce('.module.ts')
    //       })
    //     }));

    //     const generate = require('../generate');
    //     const context = { rootDir: '/my/root/dir/path' };
    //     const result = await generate.getPages(context);

    //     expect(result).toEqual([
    //       {
    //         fileName: 'nowhere',
    //         absolutePath: '/path/to/nowhere',
    //         relativePath: '../../../../path/to/nowhere',
    //       },
    //       {
    //         fileName: 'path',
    //         absolutePath: '/my/awesome/path',
    //         relativePath: '../../../awesome/path',
    //       },
    //     ]);
    //   });

    // });

  });

});
