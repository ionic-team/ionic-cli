import { Writable } from 'stream';
import { DEFAULT_OUTPUT, LOGGER_OUTPUTS, Logger, LoggerOutput } from '../logger';

describe('@ionic/cli-framework', () => {

  describe('lib/logger', () => {

    describe('Logger', () => {

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

  });

});
