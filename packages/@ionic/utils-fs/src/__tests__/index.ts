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

    describe('Walker', () => {

      jest.resetModules();
      const path = require('path');
      const lstatSpy = jest.fn();
      const readdirSpy = jest.fn();
      jest.mock('fs-extra', () => ({ lstat: lstatSpy, readdir: readdirSpy }));
      const fslib = require('../');

      beforeEach(() => {
        lstatSpy.mockReset();
        readdirSpy.mockReset();
      });

      it('should emit data once with path for single file', async done => {
        lstatSpy.mockImplementation((p: string, cb: any) => { cb(null, { isDirectory: () => false }); });
        const dataSpy = jest.fn();
        const walker = new fslib.Walker('root');
        walker.on('data', dataSpy);
        walker.on('end', () => {
          expect(lstatSpy).toHaveBeenCalledTimes(1);
          expect(dataSpy).toHaveBeenCalledTimes(1);
          expect(dataSpy).toHaveBeenCalledWith({ path: 'root', stats: expect.any(Object) });
          done();
        });
      });

      it('should emit data for each child', async done => {
        const root = 'root';
        const children = ['a', 'b', 'c'];
        lstatSpy.mockImplementation((p: string, cb: any) => { cb(null, { isDirectory: () => p === root }); });
        readdirSpy.mockImplementation((p: string, cb: any) => { cb(null, children); });
        const dataSpy = jest.fn();
        const walker = new fslib.Walker(root);
        walker.on('data', dataSpy);
        walker.on('end', () => {
          expect(lstatSpy).toHaveBeenCalledTimes(4);
          expect(readdirSpy).toHaveBeenCalledTimes(1);
          expect(dataSpy).toHaveBeenCalledTimes(4);
          expect(dataSpy).toHaveBeenCalledWith({ path: root, stats: expect.any(Object) });
          for (const child of children.map(c => path.join(root, c))) {
            expect(dataSpy).toHaveBeenCalledWith({ path: child, stats: expect.any(Object) });
          }
          done();
        });
      });

      it('should emit data for each child recursively', async done => {
        const root = 'root'; // directory
        const children = ['foo', 'bar']; // directories
        const fooChildren = ['a', 'b', 'c']; // directories
        const barChildren = ['1', '2', '3']; // files
        lstatSpy.mockImplementation((p: string, cb: any) => { cb(null, { isDirectory: () => p === root || children.map(c => path.join(root, c)).includes(p) || fooChildren.map(c => path.join(root, 'foo', c)).includes(p) }); });
        readdirSpy.mockImplementation((p: string, cb: any) => { cb(null, p === root ? children : (p === path.join(root, 'foo') ? fooChildren : (p === path.join(root, 'bar') ? barChildren : []))) });
        const dataSpy = jest.fn();
        const walker = new fslib.Walker(root);
        walker.on('data', dataSpy);
        walker.on('end', () => {
          expect(lstatSpy).toHaveBeenCalledTimes(9);
          expect(readdirSpy).toHaveBeenCalledTimes(6);
          expect(dataSpy).toHaveBeenCalledTimes(9);
          expect(dataSpy).toHaveBeenCalledWith({ path: root, stats: expect.any(Object) });
          for (const child of children.map(c => path.join(root, c))) {
            expect(dataSpy).toHaveBeenCalledWith({ path: child, stats: expect.any(Object) });
          }
          for (const child of fooChildren.map(c => path.join(root, 'foo', c))) {
            expect(dataSpy).toHaveBeenCalledWith({ path: child, stats: expect.any(Object) });
          }
          for (const child of barChildren.map(c => path.join(root, 'bar', c))) {
            expect(dataSpy).toHaveBeenCalledWith({ path: child, stats: expect.any(Object) });
          }
          done();
        });
      });

      it('should emit data for each child except for filtered paths', async done => {
        const root = 'root';
        const children = ['a', 'b', 'c'];
        lstatSpy.mockImplementation((p: string, cb: any) => { cb(null, { isDirectory: () => p === root }); });
        readdirSpy.mockImplementation((p: string, cb: any) => { cb(null, children); });
        const dataSpy = jest.fn();
        const walker = new fslib.Walker(root, { pathFilter: (p: string) => p !== 'b' });
        walker.on('data', dataSpy);
        walker.on('end', () => {
          expect(lstatSpy).toHaveBeenCalledTimes(3);
          expect(readdirSpy).toHaveBeenCalledTimes(1);
          expect(dataSpy).toHaveBeenCalledTimes(3);
          expect(dataSpy).toHaveBeenCalledWith({ path: root, stats: expect.any(Object) });
          expect(dataSpy).toHaveBeenCalledWith({ path: path.join(root, 'a'), stats: expect.any(Object) });
          expect(dataSpy).toHaveBeenCalledWith({ path: path.join(root, 'c'), stats: expect.any(Object) });
          done();
        });
      });

    });

  });

});
