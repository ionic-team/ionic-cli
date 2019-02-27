import { WritableStreamBuffer } from '@ionic/utils-stream';
import stripAnsi = require('strip-ansi');

import { wordWrap } from '../../utils/format';

import { LOGGER_LEVELS, Logger, StreamHandler, createPrefixedFormatter, createTaggedFormatter } from '../logger';

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

        let stream: WritableStreamBuffer;
        let logger: Logger;

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

        let stream: WritableStreamBuffer;
        let logger: Logger;

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

        let stream: WritableStreamBuffer;
        let handler: StreamHandler;
        let logger: Logger;

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

        let stream: WritableStreamBuffer;
        let handler: StreamHandler;
        let logger: Logger;

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

        let stream: WritableStreamBuffer;
        let handler: StreamHandler;
        let logger: Logger;

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

        let stream: WritableStreamBuffer;
        let handler: StreamHandler;
        let logger: Logger;

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

        let stream: WritableStreamBuffer;
        let handler: StreamHandler;
        let logger: Logger;

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

      let stream: WritableStreamBuffer;
      let handler: StreamHandler;
      let logger: Logger;

      beforeEach(() => {
        stream = new WritableStreamBuffer();
        handler = new StreamHandler({ stream });
        logger = new Logger({ handlers: new Set([handler]) });
      });

      it('should not format if requested', () => {
        const formatter = createTaggedFormatter();
        const result = formatter({ msg: 'hi', level: LOGGER_LEVELS.INFO, format: false, logger });
        expect(result).toEqual('hi');
      });

      it('should not tag non-leveled outputs', () => {
        const formatter = createTaggedFormatter();
        const result = formatter({ msg: 'hi', logger });
        expect(result).toEqual('hi');
      });

      it('should log multi-line message properly for non-leveled outputs', () => {
        const formatter = createTaggedFormatter({ wrap: false });
        const result = formatter({ msg: 'hello world!\nThis is a message.', logger });
        expect(result).toEqual('hello world!\nThis is a message.');
      });

      it('should log multi-line message properly for wrapped, non-leveled outputs', () => {
        const formatter = createTaggedFormatter({ wrap: true });
        const result = formatter({ msg: 'hello world!\nThis is a message.', logger });
        expect(result).toEqual('hello world!\nThis is a message.');
      });

      it('should tag leveled outputs', () => {
        const formatter = createTaggedFormatter();
        const result = formatter({ msg: 'hi', level: LOGGER_LEVELS.INFO, logger });
        expect(stripAnsi(result)).toEqual('[INFO] hi');
      });

      it('should not wrap by default', () => {
        const formatter = createTaggedFormatter();
        const msg = 'A '.repeat(1000);
        const result = formatter({ msg, level: LOGGER_LEVELS.INFO, logger });
        expect(stripAnsi(result)).toEqual(`[INFO] ${msg}`);
      });

      it('should wrap words if wanted', () => {
        const wordWrapOpts = { width: 50 };
        const formatter = createTaggedFormatter({ wrap: wordWrapOpts });
        const msg = 'A '.repeat(1000);
        const result = formatter({ msg, level: LOGGER_LEVELS.INFO, logger });
        expect(stripAnsi(result)).toEqual(`[INFO] ${wordWrap(msg, { indentation: 7, ...wordWrapOpts })}`);
      });

      it('should not titleize by default', () => {
        const formatter = createTaggedFormatter();
        const result = formatter({ msg: `Hello!\nThis is a message.\nHere's another.`, level: LOGGER_LEVELS.INFO, logger });
        expect(stripAnsi(result)).toEqual(`[INFO] Hello!\n       This is a message.\n       Here's another.`);
      });

      it('should not titleize for single line', () => {
        const formatter = createTaggedFormatter({ titleize: true });
        const result = formatter({ msg: 'Hello!', level: LOGGER_LEVELS.INFO, logger });
        expect(stripAnsi(result)).toEqual(`[INFO] Hello!`);
      });

      it('should titleize properly for double newline after first line', () => {
        const formatter = createTaggedFormatter({ titleize: true });
        const result = formatter({ msg: `Hello!\n\nThis is a message.\n\nHere's another.`, level: LOGGER_LEVELS.INFO, logger });
        expect(stripAnsi(result)).toEqual(`[INFO] Hello!\n\n       This is a message.\n\n       Here's another.`);
      });

      it('should titleize if wanted', () => {
        const formatter = createTaggedFormatter({ titleize: true });
        const result = formatter({ msg: `Hello!\nThis is a message.\nHere's another.`, level: LOGGER_LEVELS.INFO, logger });
        expect(stripAnsi(result)).toEqual(`[INFO] Hello!\n\n       This is a message.\n       Here's another.`);
      });

      it('should work with wrap and titleize', () => {
        const wordWrapOpts = { width: 50 };
        const formatter = createTaggedFormatter({ titleize: true, wrap: wordWrapOpts });
        const msg = 'A '.repeat(1000);
        const result = formatter({ msg, level: LOGGER_LEVELS.INFO, logger });
        expect(stripAnsi(result)).toEqual(`[INFO] ${wordWrap(msg, { indentation: 7, ...wordWrapOpts })}`);
      });

      it('should prefix single line without level', () => {
        const now = new Date().toISOString();
        const formatter = createTaggedFormatter({ prefix: `[${now}]` });
        const result = formatter({ msg: 'hello world!', logger });
        expect(result).toEqual(`[${now}] hello world!`);
      });

      it('should prefix dynamically with a function', () => {
        let count = 0;
        const spy = jest.fn(() => `[${++count}]`);
        const formatter = createTaggedFormatter({ prefix: spy });
        const result1 = formatter({ msg: 'hello world!', logger });
        const result2 = formatter({ msg: 'hello world!', logger });
        expect(result1).toEqual('[1] hello world!');
        expect(result2).toEqual('[2] hello world!');
        expect(spy).toHaveBeenCalledTimes(2);
      });

    });

    describe('createPrefixedFormatter', () => {

      let stream: WritableStreamBuffer;
      let handler: StreamHandler;
      let logger: Logger;

      beforeEach(() => {
        stream = new WritableStreamBuffer();
        handler = new StreamHandler({ stream });
        logger = new Logger({ handlers: new Set([handler]) });
      });

      it('should not format if requested', () => {
        const formatter = createPrefixedFormatter('[prefix]');
        const result = formatter({ msg: 'hello world!', format: false, logger });
        expect(result).toEqual('hello world!');
      });

      it('should prefix message', () => {
        const formatter = createPrefixedFormatter('[prefix]');
        const result = formatter({ msg: 'hello world!', logger });
        expect(result).toEqual('[prefix] hello world!');
      });

      it('should prefix dynamically with a function', () => {
        let count = 0;
        const spy = jest.fn(() => `[${++count}]`);
        const formatter = createPrefixedFormatter(spy);
        const result1 = formatter({ msg: 'hello world!', logger });
        const result2 = formatter({ msg: 'hello world!', logger });
        expect(result1).toEqual('[1] hello world!');
        expect(result2).toEqual('[2] hello world!');
        expect(spy).toHaveBeenCalledTimes(2);
      });

    });

  });

});
