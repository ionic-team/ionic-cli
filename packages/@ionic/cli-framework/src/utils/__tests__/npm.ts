import * as path from "path"
import { compileNodeModulesPaths } from '../npm';

describe('@ionic/cli-framework', () => {

  describe('utils/npm', () => {

    describe('compileNodeModulesPaths', () => {

      describe('posix', () => {
        const mock_path_posix = path.posix;
        jest.resetModules();
        jest.mock('path', () => mock_path_posix);

        const npmLib = require('../npm');

        it('should not accept a malformed path', () => {
          expect(() => npmLib.compileNodeModulesPaths('.')).toThrowError('. is not an absolute path');
        });

        it('should compile an array of node_modules directories working backwards from a base directory', () => {
          const result = npmLib.compileNodeModulesPaths('/some/dir');
          expect(result).toEqual(['/some/dir/node_modules', '/some/node_modules', '/node_modules']);
        });

        it('should work for the root directory', () => {
          const result = npmLib.compileNodeModulesPaths('/');
          expect(result).toEqual(['/node_modules']);
        });

      });

      describe('windows', () => {
        const mock_path_win32 = path.win32;
        jest.resetModules();
        jest.mock('path', () => mock_path_win32);

        const npmLib = require('../npm');

        it('should not accept a malformed path', () => {
          expect(() => npmLib.compileNodeModulesPaths('.')).toThrowError('. is not an absolute path');
        });

        it('should compile an array of node_modules directories working backwards from a base directory', () => {
          const result = npmLib.compileNodeModulesPaths('\\some\\dir');
          expect(result).toEqual(['\\some\\dir\\node_modules', '\\some\\node_modules', '\\node_modules']);
        });

        it('should work for the root directory', () => {
          const result = npmLib.compileNodeModulesPaths('\\');
          expect(result).toEqual(['\\node_modules']);
        });

      });

    });

  });

});
