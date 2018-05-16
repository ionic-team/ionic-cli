import { EventEmitter } from 'events';

import { PromiseUtil, promisifyEvent } from '../promise';

describe('@ionic/cli-framework', () => {

  describe('utils/promise', () => {

    describe('promisifyEvent', () => {

      it('should reject on error event', async () => {
        const emitter = new EventEmitter();
        const p = promisifyEvent(emitter, 'asdf');
        const err = new Error('some error');
        emitter.emit('error', err);
        emitter.emit('asdf');
        expect(p).rejects.toThrow(err);
      });

      it('should resolve when event is emitted', async () => {
        const emitter = new EventEmitter();
        const p = promisifyEvent(emitter, 'asdf');
        emitter.emit('asdf');
        await p;
      });

      it('should resolve with emitted value', async () => {
        const emitted = {};
        const emitter = new EventEmitter();
        const p = promisifyEvent(emitter, 'asdf');
        emitter.emit('asdf', emitted);
        const result = await p;
        expect(result).toBe(emitted);
      });

    });

    describe('PromiseUtil', () => {

      it('should resolve for 1 promise using some by default', async () => {
        const result = await PromiseUtil.some([Promise.resolve('a'), Promise.resolve('b'), Promise.resolve('c')]);
        expect(result.length).toEqual(1);
        for (const val of result) {
          expect(val).toEqual(expect.stringMatching(/^[abc]{1}$/));
        }
      });

      it('should resolve for specified number of promises using some', async () => {
        const result = await PromiseUtil.some([Promise.resolve('a'), Promise.resolve('b'), Promise.resolve('c')], 2);
        expect(result.length).toEqual(2);
        for (const val of result) {
          expect(val).toEqual(expect.stringMatching(/^[abc]{1}$/));
        }
      });

      it('should resolve for all promises using some', async () => {
        const promises = [Promise.resolve('a'), Promise.resolve('b'), Promise.resolve('c')];
        const result = await PromiseUtil.some(promises, promises.length);
        expect(result.length).toEqual(promises.length);
        for (const val of result) {
          expect(val).toEqual(expect.stringMatching(/^[abc]{1}$/));
        }
      });

      it('should resolve for 1 promise value using any', async () => {
        const result = await PromiseUtil.any([Promise.resolve('a'), Promise.resolve('b'), Promise.resolve('c')]);
        expect(result).toEqual(expect.stringMatching(/^[abc]{1}$/));
      });

    });

  });

});
