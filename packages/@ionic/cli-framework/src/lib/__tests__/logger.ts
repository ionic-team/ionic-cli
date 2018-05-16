import { Writable } from 'stream';
import { WritableStreamBuffer } from '../../utils/streams';

import stripAnsi = require('strip-ansi');
import { wordWrap } from '../../utils/format';

import { DEFAULT_OUTPUT, LOGGER_LEVELS, LOGGER_OUTPUTS, Logger, StreamHandler, createTaggedFormatter } from '../logger';

describe('@ionic/cli-framework', () => {

  describe('lib/logger', () => {

    describe('Logger', () => {

      describe('clone', () => {

        it('should clone the base set of options', () => {
          const logger1 = new Logger();
          const logger2 = logger1.clone();
          expect(logger1.level).toEqual(logger2.level);
          expect(logger1.handlers).not.toBe(logger2.handlers);
          expect(logger2.handlers.size).toEqual(2);

          for (const handler of logger2.handlers) {
            expect(handler).toBeInstanceOf(StreamHandler);
          }
        });

        it('should clone the set of option overrides', () => {
          const logger1 = new Logger();
          const level = 15;
          const handlers = new Set();
          const logger2 = logger1.clone({ level, handlers });
          expect(logger2.level).not.toEqual(logger1.level);
          expect(logger2.level).toEqual(level);
          expect(logger2.handlers).not.toEqual(logger1.handlers);
          expect(logger2.handlers).toBe(handlers);
        });

      });

      describe('msg', () => {

        let stream, logger;

        beforeEach(() => {
          stream = new WritableStreamBuffer();
          logger = new Logger({ handlers: new Set([new StreamHandler({ stream })]) });
        });

        it('should write the message directly', () => {
          logger.msg('hi');
          expect(stream.consume().toString()).toEqual('hi\n');
        });

      });

      describe('nl', () => {

        let stream, logger;

        beforeEach(() => {
          stream = new WritableStreamBuffer();
          logger = new Logger({ handlers: new Set([new StreamHandler({ stream })]) });
        });

        it('should log for defaults', () => {
          logger.nl();
          expect(stream.consume().toString()).toEqual('\n');
        });

        it('should log multiple newlines', () => {
          logger.nl(5);
          expect(stream.consume().toString()).toEqual('\n'.repeat(5));
        });

      });

      describe('log', () => {

        let stream, logger, handler;

        beforeEach(() => {
          stream = new WritableStreamBuffer();
          handler = new StreamHandler({ stream });
          logger = new Logger({ handlers: new Set([handler]) });
        });

        it('should log for defaults', () => {
          logger.log({ logger, msg: 'hi' });
          expect(stream.consume().toString()).toEqual('hi\n');
        });

        it('should log with formatter', () => {
          logger = new Logger({ handlers: new Set([new StreamHandler({ stream, formatter: record => record.msg.split('').reverse().join('') })]) });
          logger.log({ logger, msg: 'hello world!' });
          expect(stream.consume().toString()).toEqual('!dlrow olleh\n');
        });

        it('should log with levels equal', () => {
          logger.level = 20;
          logger.log({ logger, msg: 'hi', level: 20 });
          expect(stream.consume().toString()).toEqual('hi\n');
        });

        it('should log with record level not set', () => {
          logger.level = 10;
          logger.log({ logger, msg: 'hi' });
          expect(stream.consume().toString()).toEqual('hi\n');
        });

        it('should not log when logger level exceeds record level', () => {
          logger.level = 20;
          logger.log({ logger, msg: 'hi', level: 10 });
          expect(stream.consume().toString()).toEqual('');
        });

      });

      describe('debug', () => {

        let stream, logger, handler;

        beforeEach(() => {
          stream = new WritableStreamBuffer();
          handler = new StreamHandler({ stream });
          logger = new Logger({ handlers: new Set([handler]) });
        });

        it('should not log debug messages by default', () => {
          logger.debug('hi');
          expect(stream.consume().toString()).toEqual('');
        });

        it('should log debug messages with adjusted level', () => {
          logger.level = 0;
          logger.debug('hi');
          expect(stream.consume().toString()).toEqual('hi\n');
        });

      });

      describe('info', () => {

        let stream, logger, handler;

        beforeEach(() => {
          stream = new WritableStreamBuffer();
          handler = new StreamHandler({ stream });
          logger = new Logger({ handlers: new Set([handler]) });
        });

        it('should write the message', () => {
          logger.info('hi');
          expect(stream.consume().toString()).toEqual('hi\n');
        });

        it('should not write the message at a higher level', () => {
          logger.level = 30;
          logger.info('hi');
          expect(stream.consume().toString()).toEqual('');
        });

      });

      describe('warn', () => {

        let stream, logger, handler;

        beforeEach(() => {
          stream = new WritableStreamBuffer();
          handler = new StreamHandler({ stream });
          logger = new Logger({ handlers: new Set([handler]) });
        });

        it('should write the message', () => {
          logger.warn('hi');
          expect(stream.consume().toString()).toEqual('hi\n');
        });

        it('should not write the message at a higher level', () => {
          logger.level = 40;
          logger.warn('hi');
          expect(stream.consume().toString()).toEqual('');
        });

      });

      describe('error', () => {

        let stream, logger, handler;

        beforeEach(() => {
          stream = new WritableStreamBuffer();
          handler = new StreamHandler({ stream });
          logger = new Logger({ handlers: new Set([handler]) });
        });

        it('should write the message', () => {
          logger.error('hi');
          expect(stream.consume().toString()).toEqual('hi\n');
        });

        it('should not write the message at a higher level', () => {
          logger.level = 50;
          logger.error('hi');
          expect(stream.consume().toString()).toEqual('');
        });

      });

      describe('createWriteStream', () => {

        it('should create a writable stream', () => {
          const stream = new WritableStreamBuffer();
          const handler = new StreamHandler({ stream });
          const logger = new Logger({ handlers: new Set([handler]) });
          const ws = logger.createWriteStream();
          ws.write('hi');
          expect(stream.consume().toString()).toEqual('hi\n');
        });

      });

    });

    describe('createTaggedFormatter', () => {

      const logger = new Logger();
      const output = logger.output;

      it('should not tag non-leveled outputs', () => {
        const format = createTaggedFormatter();
        const result = format({ msg: 'hi', logger, output });
        expect(result).toEqual('hi');
      });

      it('should log multi-line message properly for non-leveled outputs', () => {
        const format = createTaggedFormatter({ wrap: false });
        const result = format({ msg: 'hello world!\nThis is a message.', logger, output });
        expect(result).toEqual('hello world!\nThis is a message.');
      });

      it('should log multi-line message properly for wrapped, non-leveled outputs', () => {
        const format = createTaggedFormatter({ wrap: true });
        const result = format({ msg: 'hello world!\nThis is a message.', logger, output });
        expect(result).toEqual('hello world!\nThis is a message.');
      });

      it('should tag leveled outputs', () => {
        const format = createTaggedFormatter();
        const result = format({ msg: 'hi', logger, output, level: LOGGER_LEVELS.INFO });
        expect(stripAnsi(result)).toEqual('[INFO] hi');
      });

      it('should not wrap by default', () => {
        const format = createTaggedFormatter();
        const msg = 'A '.repeat(1000);
        const result = format({ msg, logger, output, level: LOGGER_LEVELS.INFO });
        expect(stripAnsi(result)).toEqual(`[INFO] ${msg}`);
      });

      it('should wrap words if wanted', () => {
        const wordWrapOpts = { width: 50 };
        const format = createTaggedFormatter({ wrap: wordWrapOpts });
        const msg = 'A '.repeat(1000);
        const result = format({ msg, logger, output, level: LOGGER_LEVELS.INFO });
        expect(stripAnsi(result)).toEqual(`[INFO] ${wordWrap(msg, { indentation: 7, ...wordWrapOpts })}`);
      });

      it('should not titleize by default', () => {
        const format = createTaggedFormatter();
        const result = format({ msg: `Hello!\nThis is a message.\nHere's another.`, logger, output, level: LOGGER_LEVELS.INFO });
        expect(stripAnsi(result)).toEqual(`[INFO] Hello!\n       This is a message.\n       Here's another.`);
      });

      it('should not titleize for single line', () => {
        const format = createTaggedFormatter({ titleize: true });
        const result = format({ msg: 'Hello!', logger, output, level: LOGGER_LEVELS.INFO });
        expect(stripAnsi(result)).toEqual(`[INFO] Hello!`);
      });

      it('should titleize if wanted', () => {
        const format = createTaggedFormatter({ titleize: true });
        const result = format({ msg: `Hello!\nThis is a message.\nHere's another.`, logger, output, level: LOGGER_LEVELS.INFO });
        expect(stripAnsi(result)).toEqual(`[INFO] Hello!\n\n       This is a message.\n       Here's another.`);
      });

      it('should work with wrap and titleize', () => {
        const wordWrapOpts = { width: 50 };
        const format = createTaggedFormatter({ titleize: true, wrap: wordWrapOpts });
        const msg = 'A '.repeat(1000);
        const result = format({ msg, logger, output, level: LOGGER_LEVELS.INFO });
        expect(stripAnsi(result)).toEqual(`[INFO] ${wordWrap(msg, { indentation: 7, ...wordWrapOpts })}`);
      });

      it('should prefix single line without level', () => {
        const now = new Date().toISOString();
        const format = createTaggedFormatter({ prefix: `[${now}]` });
        const result = format({ msg: 'hello world!', logger, output });
        expect(stripAnsi(result)).toEqual(`[${now}] hello world!`);
      });

    });

  });

});
