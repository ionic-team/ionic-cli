import * as path from 'path';

describe('@ionic/cli-utils', () => {

  describe('findBaseDirectory', () => {

    jest.resetModules();
    const cliUtils = require('../fs');

    it('should get undefined with empty input', async () => {
      const result = await cliUtils.findBaseDirectory('', '');
      expect(result).toEqual(undefined);
    });

    it('should return undefined if marker file not found', async () => {
      jest.spyOn(cliUtils, 'fsReadDir').mockImplementation(() => Promise.resolve(['bar']));
      const result = await cliUtils.findBaseDirectory('/some/dir', 'foo');
      expect(result).toEqual(undefined);
    });

    it('should return path when marker file found in cwd', async () => {
      jest.spyOn(cliUtils, 'fsReadDir').mockImplementation(() => Promise.resolve(['foo']));
      const result = await cliUtils.findBaseDirectory('/some/dir', 'foo');
      expect(result).toEqual('/some/dir');
    });

    it('should return path when marker file found in one directory back', async () => {
      jest.spyOn(cliUtils, 'fsReadDir')
        .mockImplementationOnce(() => Promise.resolve(['garbage']))
        .mockImplementationOnce(() => Promise.resolve(['dir', 'foo']));
      const result = await cliUtils.findBaseDirectory('/some/dir', 'foo');
      expect(result).toEqual('/some');
    });

    it('should return path when marker file found in really nested path', async () => {
      jest.spyOn(cliUtils, 'fsReadDir')
        .mockImplementationOnce(() => Promise.resolve(['']))
        .mockImplementationOnce(() => Promise.resolve(['nested']))
        .mockImplementationOnce(() => Promise.resolve(['really']))
        .mockImplementationOnce(() => Promise.resolve(['is']))
        .mockImplementationOnce(() => Promise.resolve(['that']))
        .mockImplementationOnce(() => Promise.resolve(['dir', 'foo']));
      const result = await cliUtils.findBaseDirectory('/some/dir/that/is/really/nested', 'foo');
      expect(result).toEqual('/some');
    });

    describe('windows', () => {

      const mock_path_win32 = path.win32;
      jest.resetModules();
      jest.mock('path', () => mock_path_win32);

      const cliUtils = require('../fs');

      it('should get undefined with empty input', async () => {
        const result = await cliUtils.findBaseDirectory('', '');
        expect(result).toEqual(undefined);
      });

      it('should return undefined if marker file not found', async () => {
        jest.spyOn(cliUtils, 'fsReadDir').mockImplementation(() => Promise.resolve(['bar']));
        const result = await cliUtils.findBaseDirectory('C:\\some\\dir', 'foo');
        expect(result).toEqual(undefined);
      });

      it('should return path when marker file found in cwd', async () => {
        jest.spyOn(cliUtils, 'fsReadDir').mockImplementation(() => Promise.resolve(['foo']));
        const result = await cliUtils.findBaseDirectory('C:\\some\\dir', 'foo');
        expect(result).toEqual('C:\\some\\dir');
      });

      it('should return path when marker file found in one directory back', async () => {
        jest.spyOn(cliUtils, 'fsReadDir')
          .mockImplementationOnce(() => Promise.resolve(['garbage']))
          .mockImplementationOnce(() => Promise.resolve(['dir', 'foo']));
        const result = await cliUtils.findBaseDirectory('C:\\some\\dir', 'foo');
        expect(result).toEqual('C:\\some');
      });

      it('should return path when marker file found in really nested path', async () => {
        jest.spyOn(cliUtils, 'fsReadDir')
          .mockImplementationOnce(() => Promise.resolve(['']))
          .mockImplementationOnce(() => Promise.resolve(['nested']))
          .mockImplementationOnce(() => Promise.resolve(['really']))
          .mockImplementationOnce(() => Promise.resolve(['is']))
          .mockImplementationOnce(() => Promise.resolve(['that']))
          .mockImplementationOnce(() => Promise.resolve(['dir', 'foo']));
        const result = await cliUtils.findBaseDirectory('C:\\some\\dir\\\\that\\is\\really\\nested', 'foo');
        expect(result).toEqual('C:\\some');
      });

    });

  });

});
