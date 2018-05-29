import * as path from 'path';

describe('@ionic/cli-framework', () => {

  describe('utils/path', () => {

    describe('compilePaths', () => {

      describe('posix', () => {

        const mock_path_posix = path.posix;
        jest.resetModules();
        jest.mock('path', () => mock_path_posix);

        const pathlib = require('../path');

        it('should not accept a malformed path', () => {
          expect(() => pathlib.compilePaths('.')).toThrowError('. is not an absolute path');
        });

        it('should compile an array of paths working backwards from a base directory', () => {
          const result = pathlib.compilePaths('/some/dir');
          expect(result).toEqual(['/some/dir', '/some', '/']);
        });

        it('should work for the root directory', () => {
          const result = pathlib.compilePaths('/');
          expect(result).toEqual(['/']);
        });

      });

      describe('windows', () => {

        const mock_path_win32 = path.win32;
        jest.resetModules();
        jest.mock('path', () => mock_path_win32);

        const pathlib = require('../path');

        it('should not accept a malformed path', () => {
          expect(() => pathlib.compilePaths('.')).toThrowError('. is not an absolute path');
        });

        it('should compile an array of paths working backwards from a base directory', () => {
          const result = pathlib.compilePaths('C:\\some\\dir');
          expect(result).toEqual(['C:\\some\\dir', 'C:\\some', 'C:\\']);
        });

        it('should work for the root directory', () => {
          const result = pathlib.compilePaths('C:\\');
          expect(result).toEqual(['C:\\']);
        });

      });

    });

  });

});
