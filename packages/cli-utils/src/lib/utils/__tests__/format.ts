import * as os from 'os';
import * as path from 'path';

describe('@ionic/cli-utils', () => {

  describe('prettyPath', () => {

    const mock_os = os;

    jest.resetModules();
    const mock_homedir = () => '/home/user';
    jest.mock('os', () => ({ ...mock_os, homedir: mock_homedir }));
    const prettyPath = require('../format').prettyPath;

    beforeEach(() => {
      this.originalCwd = process.cwd;
      process.cwd = () => '/home/user/dir1/dir2/dir3';
    });

    afterEach(() => {
      process.cwd = this.originalCwd;
    });

    it('should pretty print file in cwd', () => {
      const result = prettyPath('/home/user/dir1/dir2/dir3/file.txt');
      expect(result).toEqual('./file.txt');
    });

    it('should pretty print file in a subdirectory', () => {
      const result = prettyPath('/home/user/dir1/dir2/dir3/dir4/file.txt');
      expect(result).toEqual('./dir4/file.txt');
    });

    it('should pretty print file in a sub subdirectory', () => {
      const result = prettyPath('/home/user/dir1/dir2/dir3/dir4/dir5/file.txt');
      expect(result).toEqual('./dir4/dir5/file.txt');
    });

    it('should pretty print file in one directory back', () => {
      const result = prettyPath('/home/user/dir1/dir2/file.txt');
      expect(result).toEqual('../file.txt');
    });

    it('should pretty print file in two directories back', () => {
      const result = prettyPath('/home/user/dir1/file.txt');
      expect(result).toEqual('../../file.txt');
    });

    it('should pretty print file in two directories back into subdirectory', () => {
      const result = prettyPath('/home/user/dir1/weirddir/file.txt');
      expect(result).toEqual('../../weirddir/file.txt');
    });

    it('should pretty print from home path three directories back', () => {
      const result = prettyPath('/home/user/file.txt');
      expect(result).toEqual('~/file.txt');
    });

    it('should pretty print cwd', () => {
      const result = prettyPath('/home/user/dir1/dir2/dir3');
      expect(result).toEqual('.');
    });

    it('should pretty print a subdirectory', () => {
      const result = prettyPath('/home/user/dir1/dir2/dir3/dir4');
      expect(result).toEqual('./dir4');
    });

    it('should pretty print a sub subdirectory', () => {
      const result = prettyPath('/home/user/dir1/dir2/dir3/dir4/dir5');
      expect(result).toEqual('./dir4/dir5');
    });

    it('should pretty print one directory back', () => {
      const result = prettyPath('/home/user/dir1/dir2');
      expect(result).toEqual('..');
    });

    it('should pretty print two directories back into subdirectory', () => {
      const result = prettyPath('/home/user/dir1/weirddir');
      expect(result).toEqual('../../weirddir');
    });

    it('should pretty print two directories back', () => {
      const result = prettyPath('/home/user/dir1');
      expect(result).toEqual('~/dir1');
    });

    it('should pretty print home dir', () => {
      const result = prettyPath('/home/user');
      expect(result).toEqual('~');
    });

    describe('windows', () => {

      jest.resetModules();
      const mock_path_win32 = path.win32;
      const mock_homedir = () => 'C:\\home\\user';
      jest.mock('os', () => ({ ...mock_os, homedir: mock_homedir }));
      jest.mock('path', () => mock_path_win32);
      const prettyPath = require('../format').prettyPath;

      beforeEach(() => {
        this.originalCwd = process.cwd;
        process.cwd = () => 'C:\\home\\user\\dir1\\dir2\\dir3';
      });

      afterEach(() => {
        process.cwd = this.originalCwd;
      });

      it('should pretty print file in cwd', () => {
        const result = prettyPath('C:\\home\\user\\dir1\\dir2\\dir3\\file.txt');
        expect(result).toEqual('.\\file.txt');
      });

      it('should pretty print file in a subdirectory', () => {
        const result = prettyPath('C:\\home\\user\\dir1\\dir2\\dir3\\dir4\\file.txt');
        expect(result).toEqual('.\\dir4\\file.txt');
      });

      it('should pretty print file in a sub subdirectory', () => {
        const result = prettyPath('C:\\home\\user\\dir1\\dir2\\dir3\\dir4\\dir5\\file.txt');
        expect(result).toEqual('.\\dir4\\dir5\\file.txt');
      });

      it('should pretty print file in one directory back', () => {
        const result = prettyPath('C:\\home\\user\\dir1\\dir2\\file.txt');
        expect(result).toEqual('..\\file.txt');
      });

      it('should pretty print file in two directories back', () => {
        const result = prettyPath('C:\\home\\user\\dir1\\file.txt');
        expect(result).toEqual('..\\..\\file.txt');
      });

      it('should pretty print file in two directories back into subdirectory', () => {
        const result = prettyPath('C:\\home\\user\\dir1\\weirddir\\file.txt');
        expect(result).toEqual('..\\..\\weirddir\\file.txt');
      });

      it('should pretty print from home path three directories back', () => {
        const result = prettyPath('C:\\home\\user\\file.txt');
        expect(result).toEqual('~\\file.txt');
      });

      it('should pretty print cwd', () => {
        const result = prettyPath('C:\\home\\user\\dir1\\dir2\\dir3');
        expect(result).toEqual('.');
      });

      it('should pretty print a subdirectory', () => {
        const result = prettyPath('C:\\home\\user\\dir1\\dir2\\dir3\\dir4');
        expect(result).toEqual('.\\dir4');
      });

      it('should pretty print a sub subdirectory', () => {
        const result = prettyPath('C:\\home\\user\\dir1\\dir2\\dir3\\dir4\\dir5');
        expect(result).toEqual('.\\dir4\\dir5');
      });

      it('should pretty print one directory back', () => {
        const result = prettyPath('C:\\home\\user\\dir1\\dir2');
        expect(result).toEqual('..');
      });

      it('should pretty print two directories back into subdirectory', () => {
        const result = prettyPath('C:\\home\\user\\dir1\\weirddir');
        expect(result).toEqual('..\\..\\weirddir');
      });

      it('should pretty print two directories back', () => {
        const result = prettyPath('C:\\home\\user\\dir1');
        expect(result).toEqual('~\\dir1');
      });

      it('should pretty print home dir', () => {
        const result = prettyPath('C:\\home\\user');
        expect(result).toEqual('~');
      });

    });

  });

});
