import { prompt, getPages, tabsPrompt } from '../generate';

describe('prompt', () => {

  it('should return a file path', async () => {
    const inquirer = {
      prompt: jest.fn(() => {
        return {
          usage: true
        };
      })
    };
    const context = {
      appNgModulePath: '/path/to/nowhere'
    };

    const result = await prompt('pipe', {}, context, inquirer);
    expect(result).toEqual(context.appNgModulePath);
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
      prompt: jest.fn(() => {
        return {
          usage: true
        };
      })
    };

    const result = await tabsPrompt({}, inquirer);
    expect(result).toEqual(jasmine.any(Array));

  });

});

