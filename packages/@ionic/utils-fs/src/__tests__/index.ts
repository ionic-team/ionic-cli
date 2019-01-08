import * as path from 'path';

describe('@ionic/cli-framework', () => {

  describe('utils/fs', () => {

    describe('findBaseDirectory', () => {

      describe('posix', () => {

        const mock_path_posix = path.posix;
        jest.resetModules();
        jest.mock('path', () => mock_path_posix);

        const fslib = require('../');
        const safefslib = require('../safe');

        it('should get undefined with empty input', async () => {
          const result = await fslib.findBaseDirectory('', '');
          expect(result).toEqual(undefined);
        });

        it('should return undefined if marker file not found', async () => {
          jest.spyOn(safefslib, 'readdir').mockImplementation(async () => ['bar']);
          const result = await fslib.findBaseDirectory('/some/dir', 'foo');
          expect(result).toEqual(undefined);
        });

        it('should return path when marker file found in cwd', async () => {
          jest.spyOn(safefslib, 'readdir').mockImplementation(async () => ['foo']);
          const result = await fslib.findBaseDirectory('/some/dir', 'foo');
          expect(result).toEqual('/some/dir');
        });

        it('should return path when marker file found in one directory back', async () => {
          jest.spyOn(safefslib, 'readdir')
            .mockImplementationOnce(async () => ['garbage'])
            .mockImplementationOnce(async () => ['dir', 'foo']);
          const result = await fslib.findBaseDirectory('/some/dir', 'foo');
          expect(result).toEqual('/some');
        });

        it('should return path when marker file found in really nested path', async () => {
          jest.spyOn(safefslib, 'readdir')
            .mockImplementationOnce(async () => [''])
            .mockImplementationOnce(async () => ['nested'])
            .mockImplementationOnce(async () => ['really'])
            .mockImplementationOnce(async () => ['is'])
            .mockImplementationOnce(async () => ['that'])
            .mockImplementationOnce(async () => ['dir', 'foo']);
          const result = await fslib.findBaseDirectory('/some/dir/that/is/really/nested', 'foo');
          expect(result).toEqual('/some');
        });

      });

      describe('windows', () => {

        const mock_path_win32 = path.win32;
        jest.resetModules();
        jest.mock('path', () => mock_path_win32);

        const fslib = require('../');
        const safefslib = require('../safe');

        it('should get undefined with empty input', async () => {
          const result = await fslib.findBaseDirectory('', '');
          expect(result).toEqual(undefined);
        });

        it('should return undefined if marker file not found', async () => {
          jest.spyOn(safefslib, 'readdir').mockImplementation(async () => ['bar']);
          const result = await fslib.findBaseDirectory('C:\\some\\dir', 'foo');
          expect(result).toEqual(undefined);
        });

        it('should return path when marker file found in cwd', async () => {
          jest.spyOn(safefslib, 'readdir').mockImplementation(async () => ['foo']);
          const result = await fslib.findBaseDirectory('C:\\some\\dir', 'foo');
          expect(result).toEqual('C:\\some\\dir');
        });

        it('should return path when marker file found in one directory back', async () => {
          jest.spyOn(safefslib, 'readdir')
            .mockImplementationOnce(async () => ['garbage'])
            .mockImplementationOnce(async () => ['dir', 'foo']);
          const result = await fslib.findBaseDirectory('C:\\some\\dir', 'foo');
          expect(result).toEqual('C:\\some');
        });

        it('should return path when marker file found in really nested path', async () => {
          jest.spyOn(safefslib, 'readdir')
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

    describe('compilePaths', () => {

      describe('posix', () => {

        const mock_path_posix = path.posix;
        jest.resetModules();
        jest.mock('path', () => mock_path_posix);

        const fslib = require('../');

        it('should not accept a malformed path', () => {
          expect(() => fslib.compilePaths('.')).toThrowError('. is not an absolute path');
        });

        it('should compile an array of paths working backwards from a base directory', () => {
          const result = fslib.compilePaths('/some/dir');
          expect(result).toEqual(['/some/dir', '/some', '/']);
        });

        it('should work for the root directory', () => {
          const result = fslib.compilePaths('/');
          expect(result).toEqual(['/']);
        });

      });

      describe('windows', () => {

        const mock_path_win32 = path.win32;
        jest.resetModules();
        jest.mock('path', () => mock_path_win32);

        const fslib = require('../');

        it('should not accept a malformed path', () => {
          expect(() => fslib.compilePaths('.')).toThrowError('. is not an absolute path');
        });

        it('should compile an array of paths working backwards from a base directory', () => {
          const result = fslib.compilePaths('C:\\some\\dir');
          expect(result).toEqual(['C:\\some\\dir', 'C:\\some', 'C:\\']);
        });

        it('should work for the root directory', () => {
          const result = fslib.compilePaths('C:\\');
          expect(result).toEqual(['C:\\']);
        });

      });

    });

  });

});
