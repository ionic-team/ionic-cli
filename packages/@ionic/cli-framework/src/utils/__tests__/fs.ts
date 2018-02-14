import * as path from 'path';

describe('@ionic/cli-framework', () => {

  describe('utils/fs', () => {

    describe('findBaseDirectory', () => {

      const fslib = require('../fs');

      it('should get undefined with empty input', async () => {
        const result = await fslib.findBaseDirectory('', '');
        expect(result).toEqual(undefined);
      });

      it('should return undefined if marker file not found', async () => {
        jest.spyOn(fslib, 'fsReadDir').mockImplementation(async () => ['bar']);
        const result = await fslib.findBaseDirectory('/some/dir', 'foo');
        expect(result).toEqual(undefined);
      });

      it('should return path when marker file found in cwd', async () => {
        jest.spyOn(fslib, 'fsReadDir').mockImplementation(async () => ['foo']);
        const result = await fslib.findBaseDirectory('/some/dir', 'foo');
        expect(result).toEqual('/some/dir');
      });

      it('should return path when marker file found in one directory back', async () => {
        jest.spyOn(fslib, 'fsReadDir')
          .mockImplementationOnce(async () => ['garbage'])
          .mockImplementationOnce(async () => ['dir', 'foo']);
        const result = await fslib.findBaseDirectory('/some/dir', 'foo');
        expect(result).toEqual('/some');
      });

      it('should return path when marker file found in really nested path', async () => {
        jest.spyOn(fslib, 'fsReadDir')
          .mockImplementationOnce(async () => [''])
          .mockImplementationOnce(async () => ['nested'])
          .mockImplementationOnce(async () => ['really'])
          .mockImplementationOnce(async () => ['is'])
          .mockImplementationOnce(async () => ['that'])
          .mockImplementationOnce(async () => ['dir', 'foo']);
        const result = await fslib.findBaseDirectory('/some/dir/that/is/really/nested', 'foo');
        expect(result).toEqual('/some');
      });

      describe('windows', () => {

        const mock_path_win32 = path.win32;
        jest.resetModules();
        jest.mock('path', () => mock_path_win32);

        const fslib = require('../fs');

        it('should get undefined with empty input', async () => {
          const result = await fslib.findBaseDirectory('', '');
          expect(result).toEqual(undefined);
        });

        it('should return undefined if marker file not found', async () => {
          jest.spyOn(fslib, 'fsReadDir').mockImplementation(async () => ['bar']);
          const result = await fslib.findBaseDirectory('C:\\some\\dir', 'foo');
          expect(result).toEqual(undefined);
        });

        it('should return path when marker file found in cwd', async () => {
          jest.spyOn(fslib, 'fsReadDir').mockImplementation(async () => ['foo']);
          const result = await fslib.findBaseDirectory('C:\\some\\dir', 'foo');
          expect(result).toEqual('C:\\some\\dir');
        });

        it('should return path when marker file found in one directory back', async () => {
          jest.spyOn(fslib, 'fsReadDir')
            .mockImplementationOnce(async () => ['garbage'])
            .mockImplementationOnce(async () => ['dir', 'foo']);
          const result = await fslib.findBaseDirectory('C:\\some\\dir', 'foo');
          expect(result).toEqual('C:\\some');
        });

        it('should return path when marker file found in really nested path', async () => {
          jest.spyOn(fslib, 'fsReadDir')
            .mockImplementationOnce(async () => [''])
            .mockImplementationOnce(async () => ['nested'])
            .mockImplementationOnce(async () => ['really'])
            .mockImplementationOnce(async () => ['is'])
            .mockImplementationOnce(async () => ['that'])
            .mockImplementationOnce(async () => ['dir', 'foo']);
          const result = await fslib.findBaseDirectory('C:\\some\\dir\\\\that\\is\\really\\nested', 'foo');
          expect(result).toEqual('C:\\some');
        });

      });

    });

  });

});
