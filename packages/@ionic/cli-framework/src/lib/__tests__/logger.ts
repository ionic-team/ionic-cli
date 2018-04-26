import { Writable } from 'stream';

import stripAnsi = require('strip-ansi');
import { wordWrap } from '../../utils/format';

import { DEFAULT_OUTPUT, LOGGER_OUTPUTS, Logger, LoggerOutput, createTaggedFormatter } from '../logger';

describe('@ionic/cli-framework', () => {

  describe('lib/logger', () => {

    describe('Logger', () => {

      describe('clone', () => {

        it('should clone the base set of options', () => {
          const logger1 = new Logger();
          const logger2 = logger1.clone();
          expect(logger1.weight).toBe(logger2.weight);
          expect(logger1.output).toBe(logger2.output);
          expect(logger1.outputs).toBe(logger2.outputs);
          expect(logger1.colors).toBe(logger2.colors);
          expect(logger1.formatter).toBe(logger2.formatter);
        });

        it('should clone the set of option overrides', () => {
          const logger1 = new Logger();
          const weight = 15;
          const output = new LoggerOutput();
          const outputs = {};
          const formatter = () => {};
          const logger2 = logger1.clone({ weight, output, outputs, formatter });
          expect(logger2.weight).not.toBe(logger1.weight);
          expect(logger2.weight).toBe(weight);
          expect(logger2.output).not.toBe(logger1.output);
          expect(logger2.output).toBe(output);
          expect(logger2.outputs).not.toBe(logger1.outputs);
          expect(logger2.outputs).toBe(outputs);
          expect(logger2.formatter).not.toBe(logger1.formatter);
          expect(logger2.formatter).toBe(formatter);
        });

      });

      describe('raw', () => {

        let stream, spy, logger;

        beforeEach(() => {
          stream = new class extends Writable { _write() {} }();
          spy = jest.spyOn(stream, 'write');
          logger = new Logger({ output: new LoggerOutput(stream) });
        });

        it('should write the message directly', () => {
          logger.raw('hi');
          expect(spy).toHaveBeenCalledWith('hi');
        });

      });

      describe('nl', () => {

        let stream, spy, logger, output;

        beforeEach(() => {
          stream = new class extends Writable { _write() {} }();
          spy = jest.spyOn(stream, 'write');
          output = new LoggerOutput(stream);
          logger = new Logger({ output });
        });

        it('should log for defaults', () => {
          logger.nl();
          expect(spy).toHaveBeenCalledWith('\n');
        });

        it('should log multiple newlines', () => {
          logger.nl(5);
          expect(spy).toHaveBeenCalledWith('\n'.repeat(5));
        });

      });

      describe('log', () => {

        let stream, spy, logger, output;

        beforeEach(() => {
          stream = new class extends Writable { _write() {} }();
          spy = jest.spyOn(stream, 'write');
          output = new LoggerOutput(stream);
          logger = new Logger({ output });
        });

        it('should log for defaults', () => {
          logger.log('hi');
          expect(spy).toHaveBeenCalledWith('hi\n');
        });

        it('should log with formatter', () => {
          logger = new Logger({ output, formatter: (msg: string) => msg.split('').reverse().join('') });
          logger.log('hello world!');
          expect(spy).toHaveBeenCalledWith('!dlrow olleh\n');
        });

        it('should not log with formatter if not wanted', () => {
          logger = new Logger({ output, formatter: (msg: string) => msg.split('').reverse().join('') });
          logger.log('hello world!', undefined, false);
          expect(spy).toHaveBeenCalledWith('hello world!\n');
        });

        it('should log with weights equal', () => {
          output.weight = 10;
          logger.weight = 10;
          logger.log('hi');
          expect(spy).toHaveBeenCalledWith('hi\n');
        });

        it('should not log with logger weight set', () => {
          logger.weight = 10;
          logger.log('hi');
          expect(spy).not.toHaveBeenCalled();
        });

        it('should log with weights adjusted', () => {
          output.weight = 10;
          logger.weight = 20;
          logger.log('hi');
          expect(spy).toHaveBeenCalledWith('hi\n');
        });

      });

      describe('debug', () => {

        let stream, spy, logger;

        beforeEach(() => {
          stream = new class extends Writable { _write() {} }();
          spy = jest.spyOn(stream, 'write');
          logger = new Logger({ outputs: { debug: new LoggerOutput(stream, LOGGER_OUTPUTS.debug.weight) } });
        });

        it('should write the message', () => {
          logger.debug('hi');
          expect(spy).toHaveBeenCalledWith('hi\n');
        });

        it('should not write the message for a lower weight', () => {
          logger.weight = 0;
          logger.debug('hi');
          expect(spy).not.toHaveBeenCalled();
        });

      });

      describe('info', () => {

        let stream, spy, logger;

        beforeEach(() => {
          stream = new class extends Writable { _write() {} }();
          spy = jest.spyOn(stream, 'write');
          logger = new Logger({ outputs: { info: new LoggerOutput(stream, LOGGER_OUTPUTS.info.weight) } });
        });

        it('should write the message', () => {
          logger.info('hi');
          expect(spy).toHaveBeenCalledWith('hi\n');
        });

        it('should not write the message for a lower weight', () => {
          logger.weight = 10;
          logger.info('hi');
          expect(spy).not.toHaveBeenCalled();
        });

      });

      describe('warn', () => {

        let stream, spy, logger;

        beforeEach(() => {
          stream = new class extends Writable { _write() {} }();
          spy = jest.spyOn(stream, 'write');
          logger = new Logger({ outputs: { warn: new LoggerOutput(stream, LOGGER_OUTPUTS.warn.weight) } });
        });

        it('should write the message', () => {
          logger.warn('hi');
          expect(spy).toHaveBeenCalledWith('hi\n');
        });

        it('should not write the message for a lower weight', () => {
          logger.weight = 20;
          logger.warn('hi');
          expect(spy).not.toHaveBeenCalled();
        });

      });

      describe('error', () => {

        let stream, spy, logger;

        beforeEach(() => {
          stream = new class extends Writable { _write() {} }();
          spy = jest.spyOn(stream, 'write');
          logger = new Logger({ outputs: { error: new LoggerOutput(stream, LOGGER_OUTPUTS.error.weight) } });
        });

        it('should write the message', () => {
          logger.error('hi');
          expect(spy).toHaveBeenCalledWith('hi\n');
        });

        it('should not write the message for a lower weight', () => {
          logger.weight = 30;
          logger.error('hi');
          expect(spy).not.toHaveBeenCalled();
        });

      });

      describe('createWriteStream', () => {

        it('should create a writable stream', () => {
          const stream = new class extends Writable { _write() {} }();
          const spy = jest.spyOn(stream, 'write');
          const logger = new Logger({ output: new LoggerOutput(stream) });
          const ws = logger.createWriteStream();
          ws.write('hi');
          expect(spy).toHaveBeenCalledWith('hi\n');
        });

      });

      describe('hasOutput', () => {

        it('should have output when level is excluded', () => {
          const logger = new Logger();
          expect(logger.hasOutput()).toBe(true);
        });

        it('should have output for known levels', () => {
          const logger = new Logger();
          expect(logger.hasOutput('info')).toBe(true);
          expect(logger.hasOutput('warn')).toBe(true);
          expect(logger.hasOutput('error')).toBe(true);
        });

        it('should not have output for unknown levels', () => {
          const logger = new Logger();
          expect(logger.hasOutput('unknown')).toBe(false);
        });

      });

      describe('findOutput', () => {

        it('should find msg logger output for default instantiation', () => {
          const logger = new Logger();
          const output = logger.findOutput();
          expect(output).toBe(DEFAULT_OUTPUT);
        });

        it('should find correct logger outputs for default instantiation', () => {
          const logger = new Logger();
          expect(logger.findOutput('info')).toBe(LOGGER_OUTPUTS.info);
          expect(logger.findOutput('warn')).toBe(LOGGER_OUTPUTS.warn);
          expect(logger.findOutput('error')).toBe(LOGGER_OUTPUTS.error);
        });

        it('should default to msg logger output for unknown level in default instantiation', () => {
          const logger = new Logger();
          const result = logger.findOutput('unknown');
          expect(result).toBe(DEFAULT_OUTPUT);
        });

      });

    });

    describe('createTaggedFormatter', () => {

      const logger = new Logger();
      const output = logger.output;

      it('should not tag non-leveled outputs', () => {
        const format = createTaggedFormatter();
        const result = format('hi', { logger, output });
        expect(result).toEqual('hi');
      });

      it('should tag leveled outputs', () => {
        const format = createTaggedFormatter();
        const result = format('hi', { logger, output, level: 'info' });
        expect(stripAnsi(result)).toEqual('[INFO] hi');
      });

      it('should not wrap by default', () => {
        const format = createTaggedFormatter();
        const msg = 'A '.repeat(1000);
        const result = format(msg, { logger, output, level: 'info' });
        expect(stripAnsi(result)).toEqual(`[INFO] ${msg}`);
      });

      it('should wrap words if wanted', () => {
        const wordWrapOpts = { width: 50 };
        const format = createTaggedFormatter({ wrap: wordWrapOpts });
        const msg = 'A '.repeat(1000);
        const result = format(msg, { logger, output, level: 'info' });
        expect(stripAnsi(result)).toEqual(`[INFO] ${wordWrap(msg, { indentation: 6, ...wordWrapOpts })}`);
      });

      it('should not add title by default', () => {
        const format = createTaggedFormatter();
        const result = format(`Hello!\nThis is a message.\nHere's another.`, { logger, output, level: 'info' });
        expect(stripAnsi(result)).toEqual(`[INFO] Hello!\n       This is a message.\n       Here's another.`);
      });

      it('should not add title for single line', () => {
        const format = createTaggedFormatter({ title: true });
        const result = format(`Hello!`, { logger, output, level: 'info' });
        expect(stripAnsi(result)).toEqual(`[INFO] Hello!`);
      });

      it('should add title if wanted', () => {
        const format = createTaggedFormatter({ title: true });
        const result = format(`Hello!\nThis is a message.\nHere's another.`, { logger, output, level: 'info' });
        expect(stripAnsi(result)).toEqual(`[INFO] Hello!\n\n       This is a message.\n       Here's another.`);
      });

      it('should work with wrap and title', () => {
        const wordWrapOpts = { width: 50 };
        const format = createTaggedFormatter({ title: true, wrap: wordWrapOpts });
        const msg = 'A '.repeat(1000);
        const result = format(msg, { logger, output, level: 'info' });
        expect(stripAnsi(result)).toEqual(`[INFO] ${wordWrap(msg, { indentation: 6, ...wordWrapOpts })}`);
      });

    });

  });

});
