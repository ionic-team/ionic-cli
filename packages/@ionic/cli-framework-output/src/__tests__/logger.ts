import { WritableStreamBuffer } from '@ionic/utils-stream';

import { Logger, LoggerHandler, StreamHandler } from '../logger';

describe('@ionic/cli-framework-output', () => {

  describe('logger', () => {

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
          const handlers: Set<LoggerHandler> = new Set();
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

  });

});
