import * as path from 'path';

describe('@ionic/cli-utils', () => {

  describe('getProjectRootDir', () => {

    jest.resetModules();
    const cliUtils = require('../lib/utils/fs');
    const { getProjectRootDir } = require('../');

    it('should get empty string with empty input', async () => {
      const result = await getProjectRootDir('', '');
      expect(result).toEqual('');
    });

    it('should return empty string if project file not found', async () => {
      jest.spyOn(cliUtils, 'fsReadDir').mockImplementation(() => Promise.resolve(['bar']));
      const result = await getProjectRootDir('/some/dir', 'foo');
      expect(result).toEqual('');
    });

    it('should return project path when project file found in cwd', async () => {
      jest.spyOn(cliUtils, 'fsReadDir').mockImplementation(() => Promise.resolve(['foo']));
      const result = await getProjectRootDir('/some/dir', 'foo');
      expect(result).toEqual('/some/dir');
    });

    it('should return project path when project file found in one directory back', async () => {
      jest.spyOn(cliUtils, 'fsReadDir')
        .mockImplementationOnce(() => Promise.resolve(['garbage']))
        .mockImplementationOnce(() => Promise.resolve(['dir', 'foo']));
      const result = await getProjectRootDir('/some/dir', 'foo');
      expect(result).toEqual('/some');
    });

    it('should return project path when project file found in really nested path', async () => {
      jest.spyOn(cliUtils, 'fsReadDir')
        .mockImplementationOnce(() => Promise.resolve(['']))
        .mockImplementationOnce(() => Promise.resolve(['nested']))
        .mockImplementationOnce(() => Promise.resolve(['really']))
        .mockImplementationOnce(() => Promise.resolve(['is']))
        .mockImplementationOnce(() => Promise.resolve(['that']))
        .mockImplementationOnce(() => Promise.resolve(['dir', 'foo']));
      const result = await getProjectRootDir('/some/dir/that/is/really/nested', 'foo');
      expect(result).toEqual('/some');
    });

    describe('windows', () => {

      const mock_path_win32 = path.win32;
      jest.resetModules();
      jest.mock('path', () => mock_path_win32);

      const cliUtils = require('../lib/utils/fs');
      const { getProjectRootDir } = require('../');

      it('should get empty string with empty input', async () => {
        const result = await getProjectRootDir('', '');
        expect(result).toEqual('');
      });

      it('should return empty string if project file not found', async () => {
        jest.spyOn(cliUtils, 'fsReadDir').mockImplementation(() => Promise.resolve(['bar']));
        const result = await getProjectRootDir('C:\\some\\dir', 'foo');
        expect(result).toEqual('');
      });

      it('should return project path when project file found in cwd', async () => {
        jest.spyOn(cliUtils, 'fsReadDir').mockImplementation(() => Promise.resolve(['foo']));
        const result = await getProjectRootDir('C:\\some\\dir', 'foo');
        expect(result).toEqual('C:\\some\\dir');
      });

      it('should return project path when project file found in one directory back', async () => {
        jest.spyOn(cliUtils, 'fsReadDir')
          .mockImplementationOnce(() => Promise.resolve(['garbage']))
          .mockImplementationOnce(() => Promise.resolve(['dir', 'foo']));
        const result = await getProjectRootDir('C:\\some\\dir', 'foo');
        expect(result).toEqual('C:\\some');
      });

      it('should return project path when project file found in really nested path', async () => {
        jest.spyOn(cliUtils, 'fsReadDir')
          .mockImplementationOnce(() => Promise.resolve(['']))
          .mockImplementationOnce(() => Promise.resolve(['nested']))
          .mockImplementationOnce(() => Promise.resolve(['really']))
          .mockImplementationOnce(() => Promise.resolve(['is']))
          .mockImplementationOnce(() => Promise.resolve(['that']))
          .mockImplementationOnce(() => Promise.resolve(['dir', 'foo']));
        const result = await getProjectRootDir('C:\\some\\dir\\\\that\\is\\really\\nested', 'foo');
        expect(result).toEqual('C:\\some');
      });

    });

  });

});
