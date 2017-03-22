import { prompt, getPages, tabsPrompt } from '../generate';
import * as inquirer from 'inquirer';

describe('prompt', () => {

  it('should return a file path to the main app module', async () => {
    const inquirer = {
      prompt: jest.fn()
    };
    inquirer.prompt
         .mockReturnValueOnce({
           usage: true
         })

    const context = {
      appNgModulePath: '/path/to/nowhere'
    };

    const result = await prompt('pipe', {}, context, inquirer);
    expect(result).toEqual(context.appNgModulePath);
  });

  it('should return a file path to a specific ngModule', async () => {
    // mock inquirer
    const inquirer = {
      prompt: jest.fn(),
      getNgModules: jest.fn()
    };
    inquirer.prompt
        .mockReturnValueOnce({
          usage: false
        })
        .mockReturnValueOnce({
          prettyName: '/path/to/ngModule',
          whereUsed: '../../../../../../../../../path/to'
        })

    // mock appScripts
    const appScripts = {
      getNgModules: jest.fn()
    }
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
        ])

    // mock getPages
    const getPages = jest.fn()
        .mockReturnValueOnce([
          {
            fileName: 'cool.module.ts',
            absolutePath: '/path/to/ngModule',
            relativePath: '/path/to/ngModule'
          },
          {
            fileName: 'cool.module.ts',
            absolutePath: '/path/to/ngModule',
            relativePath: '/path/to/ngModule'
          }
        ]);
    
    //mock context
    const context = {
      rootDir: 'my/cool/rootDir'
    };

    const result = await prompt('pipe', appScripts, context, inquirer);
    expect(result)
  });

});

describe('getPages', () => {

  const appScripts = {
    getNgModules: jest.fn(() => {
      return [
        {
          absolutePath: '/path/to/nowhere'
        },
        {
          absolutePath: '/my/awesome/path'
        }
      ];
    })
  };

  it('should return an array', async () => {
    const context = {
      rootDir: '/my/root/dir/path'
    };

    const result = await getPages(appScripts, context);
    expect(result).toEqual(jasmine.any(Array));
  });

});

describe('tabsPrompt', () => {

  it('should return an array', async () => {
    const inquirer = {
      prompt: jest.fn()
    };
    inquirer.prompt
         .mockReturnValueOnce(2)
         .mockReturnValueOnce('CoolTabOne')
         .mockReturnValueOnce('CoolTabTwo')

    const result = await tabsPrompt({}, inquirer);
    expect(result).toEqual(jasmine.any(Array));

  });

});

