import * as path from 'path';

import { compilePaths } from '../path';

describe('@ionic/cli-framework', () => {

  describe('utils/path', () => {

    describe('compilePaths', () => {

      it('should not accept a malformed path', () => {
        expect(() => compilePaths('.')).toThrowError('. is not an absolute path');
      });

      it('should compile an array of paths working backwards from a base directory', () => {
        const result = compilePaths('/some/dir');
        expect(result).toEqual(['/some/dir', '/some', '/']);
      });

      it('should work for the root directory', () => {
        const result = compilePaths('/');
        expect(result).toEqual(['/']);
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
