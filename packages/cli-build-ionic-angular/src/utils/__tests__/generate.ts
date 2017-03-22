import { getPages } from '../generate';

describe('prompt', () => {

  it('should return a file path to the main app module', async () => {
    jest.resetModules();
    jest.mock('@ionic/cli-utils', () => ({
      inquirer: {
        prompt: jest.fn().mockReturnValueOnce({
          usage: true
        })
      }
    }));

    const generate = require('../generate');

    const context = {
      appNgModulePath: '/path/to/nowhere'
    };

    const result = await generate.prompt('pipe', {}, context);
    expect(result).toEqual(context.appNgModulePath);
  });

  it('should return a file path to a specific ngModule', async () => {
    jest.resetModules();
    jest.mock('@ionic/cli-utils', () => ({
      inquirer: {
        prompt: jest.fn().mockReturnValueOnce({
          usage: false
        }).mockReturnValueOnce({
          prettyName: '/path/to/ngModule',
          whereUsed: '../../../../../../../../../path/to'
        });
      }
    }));

    const generate = require('../generate');

    // mock appScripts
    const appScripts = {
      getNgModules: jest.fn(),
      getStringPropertyValue: jest.fn()
    };
    appScripts.getNgModules
      .mockReturnValueOnce([
        {
          relativePath: '/path/to/ngModule',
          absolutePath: '/path/to/ngModule'
        },
        {
          relativePath: '/path/to/ngModule',
          absolutePath: '/path/to/ngModule'
        }
      ]);

    appScripts.getStringPropertyValue
      .mockReturnValueOnce('.module.ts');


    // mock context
    const context = {
      rootDir: 'my/cool/rootDir'
    };

    const result = await generate.prompt('pipe', appScripts, context);
    expect(result).toEqual('/path/to/ngModule');
  });

});

describe('tabsPrompt', () => {

  it('should return an array', async () => {
    jest.resetModules();
    jest.mock('@ionic/cli-utils', () => ({
      inquirer: {
        prompt: jest.fn().mockReturnValueOnce({
          howMany: 2
        }).mockReturnValueOnce({
          tabName: 'CoolTabOne'
        }).mockReturnValueOnce({
          tabName: 'CoolTabTwo'
        });
      }
    }));

    const generate = require('../generate');
    const result = await generate.tabsPrompt({});

    expect(result).toEqual([
      'CoolTabOne',
      'CoolTabTwo'
    ]);

  });

});


describe('getPages', () => {

  it('should return an array', async () => {
    // mock appScripts
    const appScripts = {
      getNgModules: jest.fn(),
      getStringPropertyValue: jest.fn()
    };
    appScripts.getNgModules
      .mockReturnValueOnce([
        {
          absolutePath: '/path/to/nowhere'
        },
        {
          absolutePath: '/my/awesome/path'
        }
      ]);
    appScripts.getStringPropertyValue
      .mockReturnValueOnce('.module.ts');

    const context = {
      rootDir: '/my/root/dir/path'
    };

    const result = await getPages(appScripts, context);

    expect(result).toEqual([{
      fileName: 'nowhere',
      absolutePath: '/path/to/nowhere',
      relativePath: '../../../../path/to/nowhere'
    },
    {
      fileName: 'path',
      absolutePath: '/my/awesome/path',
      relativePath: '../../../awesome/path'
    }]);
  });

});
