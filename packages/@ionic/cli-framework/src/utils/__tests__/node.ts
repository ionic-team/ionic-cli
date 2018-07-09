import * as path from 'path'
import { compileNodeModulesPaths } from '../node';

describe('@ionic/cli-framework', () => {

  describe('utils/node', () => {

    describe('compileNodeModulesPaths', () => {

      describe('posix', () => {
        const mock_path_posix = path.posix;
        jest.resetModules();
        jest.mock('path', () => mock_path_posix);

        const nodeLib = require('../node');

        it('should not accept a malformed path', () => {
          expect(() => nodeLib.compileNodeModulesPaths('.')).toThrowError('. is not an absolute path');
        });

        it('should compile an array of node_modules directories working backwards from a base directory', () => {
          const result = nodeLib.compileNodeModulesPaths('/some/dir');
          expect(result).toEqual(['/some/dir/node_modules', '/some/node_modules', '/node_modules']);
        });

        it('should work for the root directory', () => {
          const result = nodeLib.compileNodeModulesPaths('/');
          expect(result).toEqual(['/node_modules']);
        });

      });

      describe('windows', () => {
        const mock_path_win32 = path.win32;
        jest.resetModules();
        jest.mock('path', () => mock_path_win32);

        const nodeLib = require('../node');

        it('should not accept a malformed path', () => {
          expect(() => nodeLib.compileNodeModulesPaths('.')).toThrowError('. is not an absolute path');
        });

        it('should compile an array of node_modules directories working backwards from a base directory', () => {
          const result = nodeLib.compileNodeModulesPaths('\\some\\dir');
          expect(result).toEqual(['\\some\\dir\\node_modules', '\\some\\node_modules', '\\node_modules']);
        });

        it('should work for the root directory', () => {
          const result = nodeLib.compileNodeModulesPaths('\\');
          expect(result).toEqual(['\\node_modules']);
        });

      });

    });

  });

});
