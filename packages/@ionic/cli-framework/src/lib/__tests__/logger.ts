import { LOGGER_LEVELS, Logger, StreamHandler } from '@ionic/cli-framework-output';
import { WritableStreamBuffer } from '@ionic/utils-stream';
import stripAnsi = require('strip-ansi');

import { wordWrap } from '../../utils/format';

import { createPrefixedFormatter, createTaggedFormatter } from '../logger';

describe('@ionic/cli-framework', () => {

  describe('lib/logger', () => {

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
