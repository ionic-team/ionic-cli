import { PassThrough, Writable } from 'stream';
import { NullStream, ReadableStreamBuffer, WritableStreamBuffer, combineStreams, growBufferForAppendedData } from '../index';

describe('@ionic/utils-stream', () => {

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('NullStream', () => {

    it('should allow writes', () => {
      const ns = new NullStream();
      ns.write('hello world!');
    });

    it('should write nothing', done => {
      const rsb = new ReadableStreamBuffer();
      const ns = new NullStream();
      const wsb = new WritableStreamBuffer();
      const ws = combineStreams(ns, wsb);
      const spy = jest.spyOn(wsb, 'write');
      rsb.pipe(ws);
      rsb.feed('hello world!');
      rsb.stop();
      ws.on('finish', () => {
        expect(spy).not.toHaveBeenCalled();
        done();
      });
    });

  });

  describe('ReadableStreamBuffer', () => {

    it('should be fed a string', () => {
      const msg = 'hello world!';
      const rsb = new ReadableStreamBuffer();
      const spy = jest.spyOn((rsb as any).buffer, 'write');
      expect(rsb.size).toEqual(0);
      rsb.feed(msg);
      rsb.stop();
      expect(rsb.size).toEqual(Buffer.byteLength(msg));
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(msg, 0, Buffer.byteLength(msg), 'utf8');
    });

    it('should be readable via data event', done => {
      let result = '';
      const rsb = new ReadableStreamBuffer();
      rsb.on('data', chunk => { result += chunk.toString(); });
      rsb.on('end', () => {
        expect(result).toEqual('hello world!');
        done();
      });
      rsb.feed('hello world!');
      rsb.stop();
    });

    it('should be readable via readable event', done => {
      let result = '';
      const rsb = new ReadableStreamBuffer();
      rsb.on('readable', () => {
        let chunk;
        while (null !== (chunk = rsb.read())) {
          result += chunk.toString();
        }
      });
      rsb.on('end', () => {
        expect(result).toEqual('hello world!');
        done();
      });
      rsb.feed('hello world!');
      rsb.stop();
    });

    it('should be pipeable', done => {
      let result = '';
      const ws = new class extends Writable { _write(chunk: any, enc: string, cb: () => void) { result += chunk.toString(); cb(); } };
      const rsb = new ReadableStreamBuffer();
      ws.on('pipe', src => {
        expect(src).toBe(rsb);
      });
      rsb.pipe(ws);
      ws.on('finish', () => {
        expect(result).toEqual('hello world!');
        done();
      });
      rsb.feed('hello world!');
      rsb.stop();
    });

  });

  describe('WritableStreamBuffer', () => {

    it('should return empty string for empty buffer', () => {
      const wsb = new WritableStreamBuffer();
      const result = wsb.consume();
      expect(result.toString()).toEqual('');
    });

    it('should write', () => {
      const wsb = new WritableStreamBuffer();
      const msg = 'hello world!';
      wsb.write(msg);
      const result = wsb.consume();
      expect(result.toString()).toEqual(msg);
    });

    it('should write and clear buffer', () => {
      const wsb = new WritableStreamBuffer();
      const msg = 'hello world!';
      wsb.write(msg);
      wsb.consume();
      expect(wsb.size).toEqual(0);
      const result = wsb.consume();
      expect(result.length).toEqual(0);
    });

    it('should be able to consume some bytes', () => {
      const wsb = new WritableStreamBuffer();
      const msg = 'hello world!';
      wsb.write(msg);
      const result = wsb.consume(5);
      expect(wsb.size).toEqual(7);
      expect(result.toString()).toEqual('hello');
    });

    it('should be writable after consume', () => {
      const wsb = new WritableStreamBuffer();
      const msg1 = 'hello world!';
      const msg2 = `it's a great day.`;
      wsb.write(msg1);
      const result1 = wsb.consume();
      expect(wsb.size).toEqual(0);
      wsb.write(msg2);
      const result2 = wsb.consume();
      expect(wsb.size).toEqual(0);
      expect(result1.toString()).toEqual(msg1);
      expect(result2.toString()).toEqual(msg2);
    });

    it('should be pipeable', () => {
      const msg = 'hello world!';
      const wsb = new WritableStreamBuffer();
      const rs = new PassThrough();
      rs.pipe(wsb);
      rs.write(msg);
      rs.end();
      const result = wsb.consume();
      expect(result.toString()).toEqual(msg);
    });

    it('should be doubly pipeable', done => {
      const wsb = new WritableStreamBuffer();
      const rs1 = new PassThrough();
      const rs2 = new PassThrough();
      rs1.pipe(wsb);
      rs2.pipe(wsb);

      const i1 = setInterval(() => { rs1.write('a') }, 100);
      const i2 = setInterval(() => { rs2.write('b') }, 150);

      setTimeout(() => {
        clearInterval(i1);
        rs1.end();
      }, 2000);

      setTimeout(() => {
        clearInterval(i2);
        rs2.end();
      }, 3000);

      jest.advanceTimersByTime(3000);

      wsb.on('finish', () => {
        const result = wsb.consume();
        expect(result.toString()).toEqual(expect.stringMatching(/[ab]{40}/));
        done();
      });
    });

  });

  describe('ReadableStreamBuffer and WritableStreamBuffer', () => {

    it('should be pipeable together', done => {
      const rsb = new ReadableStreamBuffer();
      const wsb = new WritableStreamBuffer();
      rsb.pipe(wsb);
      rsb.feed('hello world!');
      rsb.stop();

      wsb.on('finish', () => {
        expect(wsb.consume().toString()).toEqual('hello world!');
        done();
      });
    });

  });

  describe('growBufferForAppendedData', () => {

    it('should grow the buffer', () => {
      const msg = 'hello world!';
      const buf1 = Buffer.from(msg);
      const buf2 = growBufferForAppendedData(buf1, Buffer.byteLength(msg), 4);
      expect(buf2.length).toEqual(16);
      expect(buf2.toString().replace(/\0{4}$/g, '')).toEqual(msg);
    });

    it('should not create new buffer if not needed', () => {
      const buf1 = Buffer.alloc(16);
      const msg = 'hello world!';
      const msglength = Buffer.byteLength(msg);
      const appendsize = 4;
      buf1.write(msg);
      const buf2 = growBufferForAppendedData(buf1, msglength, appendsize);
      buf2.fill('-', msglength);
      expect(buf2.toString()).toEqual(msg + '-'.repeat(appendsize));
      expect(buf2.length).toEqual(16);
      expect(buf2).toBe(buf1);
    });

    it('should grow the buffer by factor', () => {
      const buf1 = Buffer.alloc(16);
      const msg1 = 'hello world!';
      const msg1length = Buffer.byteLength(msg1);
      const msg2 = `it's a great day.`;
      buf1.write(msg1);
      const buf2 = growBufferForAppendedData(buf1, msg1length, Math.ceil(Buffer.byteLength(msg2) / 16) * 16);
      expect(buf2.length).toEqual(48);
      buf2.write(' ', msg1length);
      buf2.write(msg2, msg1length + 1);
      expect(buf2.toString().replace(/\0+$/g, '')).toEqual(`${msg1} ${msg2}`);
    });

  });

});
