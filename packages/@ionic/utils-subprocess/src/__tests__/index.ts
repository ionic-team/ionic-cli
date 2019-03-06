import { createProcessEnv } from '@ionic/utils-process';
import { ReadableStreamBuffer, WritableStreamBuffer } from '@ionic/utils-stream';
import { EventEmitter } from 'events';
import * as path from 'path';

const promisifyEvent = (emitter: EventEmitter, event: string | symbol): Promise<any> => {
  return new Promise<any>((resolve, reject) => {
    emitter.once(event, (value: any) => {
      resolve(value);
    });

    emitter.once('error', (err: Error) => {
      reject(err);
    });
  });
};

describe('@ionic/utils-subprocess', () => {

  describe('expandTildePath', () => {

    jest.resetModules();
    const mock_os = { homedir: () => '/home/me' };
    jest.mock('os', () => mock_os);
    const { expandTildePath } = require('../');

    it('should not change empty string', () => {
      const result = expandTildePath('');
      expect(result).toEqual('');
    });

    it('should not change absolute path', () => {
      const p = '/home/me/path/to/something';
      const result = expandTildePath(p);
      expect(result).toEqual(p);
    });

    it('should not change relative path', () => {
      const p = '../path/to/something';
      const result = expandTildePath(p);
      expect(result).toEqual(p);
    });

    it('should not path with tilde in it', () => {
      const p = '/path/to/~/something';
      const result = expandTildePath(p);
      expect(result).toEqual(p);
    });

    it('should expand tilde path', () => {
      const p = '~/path/to/something';
      const result = expandTildePath(p);
      expect(result).toEqual('/home/me/path/to/something');
    });

  });

  describe('Subprocess', () => {

    jest.setTimeout(300);

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.clearAllTimers();
    });

    jest.resetModules();
    const mockCrossSpawn = jest.fn();
    const mock_os = { homedir: () => '/home/me' };
    jest.mock('cross-spawn', () => mockCrossSpawn);
    jest.mock('os', () => mock_os);
    const mock_path_posix = path.posix;
    jest.mock('path', () => mock_path_posix);
    const { Subprocess, SubprocessError } = require('../');

    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('should set attributes', async () => {
      const name = 'cmd';
      const args = ['foo', 'bar', 'baz'];
      const cmd = new Subprocess(name, args);
      expect(cmd.name).toEqual(name);
      expect((cmd as any).path).not.toBeDefined();
      expect(cmd.args).toEqual(args);
    });

    it('should set attributes for pathed name', async () => {
      const name = path.resolve('/path', 'to', 'cmd');
      const args = ['foo', 'bar', 'baz'];
      const cmd = new Subprocess(name, args);
      expect(cmd.name).toEqual('cmd');
      expect((cmd as any).path).toEqual(name);
      expect(cmd.args).toEqual(args);
    });

    it('should provide default env option', async () => {
      const cmd = new Subprocess('cmd', []);
      expect(cmd.options).toEqual({ env: createProcessEnv(process.env) });
    });

    it('should provide only PATH with empty env', async () => {
      const PATH = process.env.PATH;
      const cmd = new Subprocess('cmd', [], { env: {} });
      expect(cmd.options).toEqual({ env: createProcessEnv({ PATH }) });
    });

    it('should not alter PATH if provided', async () => {
      const PATH = '/path/to/bin';
      const cmd = new Subprocess('cmd', [], { env: { PATH } });
      expect(cmd.options.env.PATH).toEqual(PATH);
    });

    it('should alter PATH with tildes if provided', async () => {
      const PATH = '/path/to/bin:~/bin';
      const cmd = new Subprocess('cmd', [], { env: { PATH } });
      expect(cmd.options.env.PATH).toEqual('/path/to/bin:/home/me/bin');
    });

    it('should bashify command and args', async () => {
      const name = 'cmd';
      const args = ['foo', 'bar', 'baz'];
      const cmd = new Subprocess(name, args);
      const result = cmd.bashify();
      expect(result).toEqual('cmd foo bar baz');
    });

    it('should bashify command and args with pathed name', async () => {
      const name = path.resolve('/path', 'to', 'cmd');
      const args = ['foo', 'bar', 'baz'];
      const cmd = new Subprocess(name, args);
      const result = cmd.bashify();
      expect(result).toEqual('cmd foo bar baz');
    });

    it('should bashify command and args with pathed name and keep path with maskArgv0 = false', async () => {
      const name = path.resolve('/path', 'to', 'cmd');
      const args = ['foo', 'bar', 'baz'];
      const cmd = new Subprocess(name, args);
      const result = cmd.bashify({ maskArgv0: false });
      expect(result).toEqual(`${name} foo bar baz`);
    });

    it('should bashify command and args with pathed argv1', async () => {
      const name = path.resolve('/path', 'to', 'cmd');
      const argv1 = path.resolve('/path/to/foo');
      const args = [argv1, 'bar', 'baz'];
      const cmd = new Subprocess(name, args);
      const result = cmd.bashify();
      expect(result).toEqual(`cmd ${argv1} bar baz`);
    });

    it('should bashify command and args with pathed name and argv1 and mask both', async () => {
      const name = path.resolve('/path', 'to', 'cmd');
      const argv1 = path.resolve('/path/to/foo');
      const args = [argv1, 'bar', 'baz'];
      const cmd = new Subprocess(name, args);
      const result = cmd.bashify({ maskArgv0: true, maskArgv1: true });
      expect(result).toEqual(`cmd foo bar baz`);
    });

    it('should bashify shifted command and args', async () => {
      const name = path.resolve('/path', 'to', 'cmd');
      const argv1 = path.resolve('/path/to/foo');
      const args = [argv1, 'bar', 'baz'];
      const cmd = new Subprocess(name, args);
      const result = cmd.bashify({ shiftArgv0: true });
      expect(result).toEqual(`foo bar baz`);
    });

    it('should bashify shifted command and args but not mask', async () => {
      const name = path.resolve('/path', 'to', 'cmd');
      const argv1 = path.resolve('/path/to/foo');
      const args = [argv1, 'bar', 'baz'];
      const cmd = new Subprocess(name, args);
      const result = cmd.bashify({ maskArgv0: false, shiftArgv0: true });
      expect(result).toEqual(`${argv1} bar baz`);
    });

    it('should bashify command and args with spaces', async () => {
      const name = 'cmd';
      const args = ['foo bar baz'];
      const cmd = new Subprocess(name, args);
      const result = cmd.bashify();
      expect(result).toEqual('cmd "foo bar baz"');
    });

    it('should bashify command and args with spaces with double quotes inside', async () => {
      const name = 'cmd';
      const args = ['foo "bar" baz'];
      const cmd = new Subprocess(name, args);
      const result = cmd.bashify();
      expect(result).toEqual('cmd "foo \\"bar\\" baz"');
    });

    it('should call spawn with correct program/args', async () => {
      const result = {};
      mockCrossSpawn.mockImplementation(() => result);
      const name = 'cmd';
      const args = ['foo', 'bar', 'baz'];
      const options = { env: { PATH: '' } };
      const cmd = new Subprocess(name, args, options);
      const expectedOptions = { env: createProcessEnv(options.env) };
      expect(cmd.spawn()).toBe(result);
      expect(mockCrossSpawn).toHaveBeenCalledTimes(1);
      expect(mockCrossSpawn).toHaveBeenCalledWith(name, args, expectedOptions);
    });

    it('should call spawn with correct program/args with pathed name', async () => {
      const result = {};
      mockCrossSpawn.mockImplementation(() => result);
      const name = path.resolve('/path', 'to', 'cmd');
      const args = ['foo', 'bar', 'baz'];
      const options = { env: { PATH: '' } };
      const cmd = new Subprocess(name, args, options);
      const expectedOptions = { env: createProcessEnv(options.env) };
      expect(cmd.spawn()).toBe(result);
      expect(mockCrossSpawn).toHaveBeenCalledTimes(1);
      expect(mockCrossSpawn).toHaveBeenCalledWith(name, args, expectedOptions);
    });

    it('should pipe stdout and stderr in run()', async () => {
      const cmd = new Subprocess('cmd', []);
      const mockSpawnStdout = new ReadableStreamBuffer();
      const mockSpawnStderr = new ReadableStreamBuffer();
      const cp = new class extends EventEmitter { stdout = mockSpawnStdout; stderr = mockSpawnStderr; };
      mockCrossSpawn.mockImplementation(() => cp);
      const stdoutMock = new WritableStreamBuffer();
      const stderrMock = new WritableStreamBuffer();
      const promise = cmd.run();
      promise.p.stdout.pipe(stdoutMock);
      promise.p.stderr.pipe(stderrMock);
      mockSpawnStdout.feed('hello world!');
      mockSpawnStdout.stop();
      mockSpawnStderr.feed('oh no!');
      mockSpawnStderr.stop();
      await Promise.all([promisifyEvent(stdoutMock, 'finish'), promisifyEvent(stderrMock, 'finish')]);
      cp.emit('close', 0);
      await promise;
      expect(mockCrossSpawn).toHaveBeenCalledTimes(1);
      expect(stdoutMock.consume().toString()).toEqual('hello world!');
      expect(stderrMock.consume().toString()).toEqual('oh no!');
    });

    it('should error for non-zero exit', async () => {
      const cmd = new Subprocess('cmd', []);
      const mockSpawnStdout = new ReadableStreamBuffer();
      const mockSpawnStderr = new ReadableStreamBuffer();
      const cp = new class extends EventEmitter { stdout = mockSpawnStdout; stderr = mockSpawnStderr; };
      mockCrossSpawn.mockImplementation(() => cp);
      const buf = new WritableStreamBuffer();
      const promise = cmd.run();
      promise.p.stdout.pipe(buf);
      promise.p.stderr.pipe(buf);
      mockSpawnStdout.stop();
      mockSpawnStderr.stop();
      await promisifyEvent(buf, 'finish');
      cp.emit('close', 1);
      await expect(promise).rejects.toThrow('Non-zero exit from subprocess.');
    });

    it('should error for signal exit', async () => {
      const cmd = new Subprocess('cmd', []);
      const mockSpawnStdout = new ReadableStreamBuffer();
      const mockSpawnStderr = new ReadableStreamBuffer();
      const cp = new class extends EventEmitter { stdout = mockSpawnStdout; stderr = mockSpawnStderr; };
      mockCrossSpawn.mockImplementation(() => cp);
      const buf = new WritableStreamBuffer();
      const promise = cmd.run();
      promise.p.stdout.pipe(buf);
      promise.p.stderr.pipe(buf);
      mockSpawnStdout.stop();
      mockSpawnStderr.stop();
      await promisifyEvent(buf, 'finish');
      cp.emit('close', null, 'SIGINT');
      await expect(promise).rejects.toThrow('Signal exit from subprocess.');
    });

    it('should have child process in run() return value', async () => {
      const cmd = new Subprocess('cmd', []);
      const mockSpawnStdout = new ReadableStreamBuffer();
      const mockSpawnStderr = new ReadableStreamBuffer();
      const cp = new class extends EventEmitter { stdout = mockSpawnStdout; stderr = mockSpawnStderr; };
      mockCrossSpawn.mockImplementation(() => cp);
      const promise = cmd.run();
      expect(promise.p).toBe(cp);
    });

    it('should resolve stdout and stderr in combinedOutput()', async () => {
      const cmd = new Subprocess('cmd', []);
      const mockSpawnStdout = new ReadableStreamBuffer();
      const mockSpawnStderr = new ReadableStreamBuffer();
      const cp = new class extends EventEmitter { stdout = mockSpawnStdout; stderr = mockSpawnStderr; };
      mockCrossSpawn.mockImplementation(() => cp);
      const p = cmd.combinedOutput();
      const outletter = '1';
      const errletter = '2';
      const outinput = outletter.repeat(26);
      const errinput = errletter.repeat(26);
      mockSpawnStdout.feed(outinput);
      mockSpawnStdout.stop();
      mockSpawnStderr.feed(errinput);
      mockSpawnStderr.stop();
      await Promise.all([promisifyEvent(mockSpawnStdout, 'end'), promisifyEvent(mockSpawnStderr, 'end')]);
      cp.emit('close', 0);
      const result = await p;
      expect(result.length).toEqual(outinput.length + errinput.length);
      expect(result.split('').filter((l: string) => l !== outletter).join('')).toEqual(errinput);
      expect(result.split('').filter((l: string) => l !== errletter).join('')).toEqual(outinput);
    });

    it('should error with combined output for output()', async done => {
      const cmd = new Subprocess('cmd', []);
      const mockSpawnStdout = new ReadableStreamBuffer();
      const mockSpawnStderr = new ReadableStreamBuffer();
      const cp = new class extends EventEmitter { stdout = mockSpawnStdout; stderr = mockSpawnStderr; };
      mockCrossSpawn.mockImplementation(() => cp);
      const p = cmd.output();
      const outletter = '1';
      const errletter = '2';
      const outinput = outletter.repeat(26);
      const errinput = errletter.repeat(26);
      mockSpawnStdout.feed(outinput);
      mockSpawnStdout.stop();
      mockSpawnStderr.feed(errinput);
      mockSpawnStderr.stop();
      await Promise.all([promisifyEvent(mockSpawnStdout, 'end'), promisifyEvent(mockSpawnStderr, 'end')]);
      cp.emit('close', 1);
      try {
        await p;
      } catch (e) {
        if (!(e instanceof SubprocessError)) {
          throw new Error('not SubprocessError');
        }

        if (!e.output) {
          throw new Error('no output');
        }

        expect(e.output.length).toEqual(outinput.length + errinput.length);
        expect(e.output.split('').filter((l: string) => l !== outletter).join('')).toEqual(errinput);
        expect(e.output.split('').filter((l: string) => l !== errletter).join('')).toEqual(outinput);
        done();
      }
    });

    it('should error with combined output for combinedOutput()', async done => {
      const cmd = new Subprocess('cmd', []);
      const mockSpawnStdout = new ReadableStreamBuffer();
      const mockSpawnStderr = new ReadableStreamBuffer();
      const cp = new class extends EventEmitter { stdout = mockSpawnStdout; stderr = mockSpawnStderr; };
      mockCrossSpawn.mockImplementation(() => cp);
      const p = cmd.combinedOutput();
      const outletter = '1';
      const errletter = '2';
      const outinput = outletter.repeat(26);
      const errinput = errletter.repeat(26);
      mockSpawnStdout.feed(outinput);
      mockSpawnStdout.stop();
      mockSpawnStderr.feed(errinput);
      mockSpawnStderr.stop();
      await Promise.all([promisifyEvent(mockSpawnStdout, 'end'), promisifyEvent(mockSpawnStderr, 'end')]);
      cp.emit('close', 1);
      try {
        await p;
      } catch (e) {
        if (!(e instanceof SubprocessError)) {
          throw new Error('not SubprocessError');
        }

        if (!e.output) {
          throw new Error('no output');
        }

        expect(e.output.length).toEqual(outinput.length + errinput.length);
        expect(e.output.split('').filter((l: string) => l !== outletter).join('')).toEqual(errinput);
        expect(e.output.split('').filter((l: string) => l !== errletter).join('')).toEqual(outinput);
        done();
      }
    });

    it('should resolve stdout in output()', async () => {
      const cmd = new Subprocess('cmd', []);
      const mockSpawnStdout = new ReadableStreamBuffer();
      const mockSpawnStderr = new ReadableStreamBuffer();
      const cp = new class extends EventEmitter { stdout = mockSpawnStdout; stderr = mockSpawnStderr; };
      mockCrossSpawn.mockImplementation(() => cp);
      const p = cmd.output();
      mockSpawnStdout.feed('hello world!');
      mockSpawnStdout.stop();
      mockSpawnStderr.feed('oh no!');
      mockSpawnStderr.stop();
      await Promise.all([promisifyEvent(mockSpawnStdout, 'end'), promisifyEvent(mockSpawnStderr, 'end')]);
      cp.emit('close', 0);
      const result = await p;
      expect(result).toEqual('hello world!');
    });

  });

});
