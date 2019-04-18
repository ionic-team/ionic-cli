import * as os from 'os';
import * as path from 'path';

import stripAnsi from 'strip-ansi';

describe('@ionic/cli-framework', () => {

  describe('utils/format', () => {

    describe('prettyPath', () => {

      let originalCwd: () => string;
      const mock_os = os;

      jest.resetModules();

      beforeEach(() => {
        originalCwd = process.cwd;
        process.cwd = () => '/home/user/dir1/dir2/dir3';
      });

      afterEach(() => {
        process.cwd = originalCwd;
      });

      describe('posix', () => {

        jest.resetModules();
        const mock_path_posix = path.posix;
        const mock_homedir = () => '/home/user';
        jest.mock('os', () => ({ ...mock_os, homedir: mock_homedir }));
        jest.mock('path', () => mock_path_posix);
        const { prettyPath } = require('../format');

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

      });

      describe('windows', () => {

        let originalCwd: () => string;
        jest.resetModules();
        const mock_path_win32 = path.win32;
        const mock_homedir = () => 'C:\\home\\user';
        jest.mock('os', () => ({ ...mock_os, homedir: mock_homedir }));
        jest.mock('path', () => mock_path_win32);
        const { prettyPath } = require('../format');

        beforeEach(() => {
          originalCwd = process.cwd;
          process.cwd = () => 'C:\\home\\user\\dir1\\dir2\\dir3';
        });

        afterEach(() => {
          process.cwd = originalCwd;
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

    describe('wordWrap', () => {

      const { wordWrap } = require('../format');

      it('should do nothing to empty string', () => {
        const result = wordWrap('', {});
        expect(result).toEqual('');
      });

      it('should do nothing to newline', () => {
        const result = wordWrap('\n', {});
        expect(result).toEqual('\n');
      });

      it('should wrap words', () => {
        const result = wordWrap('hello world', { width: 5 });
        expect(result).toEqual('hello\nworld');
      });

      it('should wrap words with proper indentation', () => {
        const result = wordWrap('hello world', { width: 5, indentation: 5 });
        expect(result).toEqual('hello\n     world');
      });

      it('should wrap many words', () => {
        const result = wordWrap(`I'm sorry Dave, I'm afraid I can't do that.`, { width: 10 });
        expect(result).toEqual(`I'm sorry\nDave, I'm\nafraid I\ncan't do\nthat.`);
      });

      it('should wrap a command and append a character', () => {
        const result = wordWrap(`git commit -m 'Initial commit' --no-gpg-sign`, { width: 40, indentation: 4, append: ' \\' });
        expect(result).toEqual(`git commit -m 'Initial commit' \\\n    --no-gpg-sign`);
      });

    });

    describe('generateFillSpaceStringList', () => {

      const { generateFillSpaceStringList } = require('../format');

      it('should return empty array for no list', () => {
        const result = generateFillSpaceStringList([]);
        expect(result).toEqual([]);
      });

      it('should return spaces array for single character strings', () => {
        const result = generateFillSpaceStringList(['a', 'b']);
        expect(result).toEqual([' ', ' ']);
      });

      it('should return spaces array for equal length strings', () => {
        const result = generateFillSpaceStringList(['foo', 'bar']);
        expect(result).toEqual([' ', ' ']);
      });

      it('should return spaces array for varying string lengths', () => {
        const result = generateFillSpaceStringList(['foo', 'bar', 'foobar', 'foobarbaz']);
        expect(result).toEqual(['       ', '       ', '    ', ' ']);
      });

      it('should return  ', () => {
        const result = generateFillSpaceStringList(['foo', 'bar'], 5);
        expect(result).toEqual(['  ', '  ']);
      });

    });

    describe('columnar', () => {

      const { columnar } = require('../format');

      it('should generate empty string from empty matrix', async () => {
        const result = columnar([], {});
        expect(result).toEqual('');
      });

      it('should work without column headers', async () => {
        const result = columnar([['a', 'b', 'c']], {});
        expect(stripAnsi(result)).toEqual('a | b | c');
      });

      it('should work for multiple rows', async () => {
        const result = columnar([['cat', 'dog'], ['spongebob', 'squarepants'], ['hey', 'arnold']], { headers: ['col1', 'col2'] });
        expect(stripAnsi(result)).toEqual(`
col1      | col2
-----------------------
cat       | dog
spongebob | squarepants
hey       | arnold
        `.trim());
      });

      it('should size rows correctly when cells are longer', async () => {
        const result = columnar([['foo', 'bar', 'baz']], { headers: ['a', 'b', 'c'] });
        expect(stripAnsi(result)).toEqual(`
a   | b   | c
---------------
foo | bar | baz
        `.trim());
      });

      it('should size rows correctly when headers are longer', async () => {
        const result = columnar([['a', 'b', 'c']], { headers: ['foo', 'bar', 'baz'] });
        expect(stripAnsi(result)).toEqual(`
foo | bar | baz
---------------
a   | b   | c
        `.trim());
      });

      it('should work with custom separators', async () => {
        const result = columnar([['foo', 'bar', 'baz']], { hsep: '=', vsep: '/\\', headers: ['a', 'b', 'c'] });
        expect(stripAnsi(result)).toEqual(`
a   /\\ b   /\\ c
=================
foo /\\ bar /\\ baz
        `.trim());
      });

      it('should have appropriate spacing for cells with newlines', async () => {
        const result = columnar([['mr\n& mr', 'cat', 'dog,\nthe third'], ['mr', 'spongebob', 'squarepants'], ['', 'the', 'brain']], {});
        expect(stripAnsi(result)).toEqual(`
mr   | cat       | dog,
& mr |           | the third
mr   | spongebob | squarepants
     | the       | brain
        `.trim());
      });

      it('should separate columns and rows with only one space with empty string separators', async () => {
        const result = columnar([['a', 'b', 'c'], ['1', '2', '3']], { vsep: '', hsep: '', headers: ['x', 'x', 'x'] });
        expect(stripAnsi(result)).toEqual(`
x x x
a b c
1 2 3
        `.trim());
      });

    });

  });

});
