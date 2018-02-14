import { compileNodeModulesPaths } from '../npm';

describe('@ionic/cli-framework', () => {

  describe('utils/npm', () => {

    describe('compileNodeModulesPaths', () => {

      it('should not accept a malformed path', () => {
        expect(() => compileNodeModulesPaths('.')).toThrowError('. is not an absolute path');
      });

      it('should compile an array of node_modules directories working backwards from a base directory', () => {
        const result = compileNodeModulesPaths('/some/dir');
        expect(result).toEqual(['/some/dir/node_modules', '/some/node_modules', '/node_modules']);
      });

      it('should work for the root directory', () => {
        const result = compileNodeModulesPaths('/');
        expect(result).toEqual(['/node_modules']);
      });

    });

  });

});
