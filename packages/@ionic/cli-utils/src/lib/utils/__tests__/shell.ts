import * as os from 'os';

describe('@ionic/cli-utils', () => {

  describe('lib/utils/shell', () => {

    describe('expandTildePath', () => {

      const mock_os = os;
      const mock_homedir = () => '/home/user';
      jest.mock('os', () => ({ ...mock_os, homedir: mock_homedir }));

      beforeEach(() => {
        jest.resetModules();
      });

      it('should handle empty string', async () => {
        const { expandTildePath } = await import('../shell');
        const result = expandTildePath('');
        expect(result).toEqual('');
      });

      it('should not modify relative path without tilde', async () => {
        const { expandTildePath } = await import('../shell');
        const result = expandTildePath('relative/path');
        expect(result).toEqual('relative/path');
      });

      it('should not modify absolute path without tilde', async () => {
        const { expandTildePath } = await import('../shell');
        const result = expandTildePath('/absolute/path');
        expect(result).toEqual('/absolute/path');
      });

      it('should expand the tilde in a path', async () => {
        const { expandTildePath } = await import('../shell');
        const result = expandTildePath('~/path');
        expect(result).toEqual('/home/user/path');
      });

    });

  });

});
