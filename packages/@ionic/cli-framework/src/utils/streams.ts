import { Readable, ReadableOptions, Writable, WritableOptions } from 'stream';
import * as combineStreams from 'stream-combiner2';

const DEFAULT_CHUNK_SIZE = 4;
const DEFAULT_ALLOC_SIZE = 32;
const DEFAULT_GROW_SIZE = 16;

export class NullStream extends Writable {
  _write(chunk: any, encoding: string, callback: Function): void {
    callback();
  }
}

export interface ReadableStreamBufferOptions extends ReadableOptions {
  chunkSize?: number;
  allocSize?: number;
  growSize?: number;
}

export class ReadableStreamBuffer extends Readable {
  protected buffer: Buffer;
  protected _size = 0;
  protected _stopped = false;
  protected chunkSize: number;
  protected growSize: number;

  constructor(opts?: ReadableStreamBufferOptions) {
    super(opts);
    this.buffer = Buffer.alloc(opts && opts.allocSize ? opts.allocSize : DEFAULT_ALLOC_SIZE);
    this.chunkSize = opts && opts.chunkSize ? opts.chunkSize : DEFAULT_CHUNK_SIZE;
    this.growSize = opts && opts.growSize ? opts.growSize : DEFAULT_GROW_SIZE;
  }

  get size(): number {
    return this._size;
  }

  get stopped(): boolean {
    return this._stopped;
  }

  _read(): void {
    this._send();
  }

  feed(data: Buffer | string, encoding = 'utf8'): void {
    if (this._stopped) {
      throw new Error('ReadableStreamBuffer is stopped. Can no longer feed.');
    }

    const datasize = typeof data === 'string' ? Buffer.byteLength(data) : data.length;
    this.buffer = growBufferForAppendedData(this.buffer, this._size, Math.ceil(datasize / this.growSize) * this.growSize);

    if (typeof data === 'string') {
      this.buffer.write(data, this._size, datasize, encoding);
    } else {
      this.buffer.copy(data, this._size, 0);
    }

    this._size += datasize;
  }

  stop(): void {
    if (this._stopped) {
      return;
    }

    this._stopped = true;

    if (this._size === 0) {
      this.push(null); // tslint:disable-line:no-null-keyword
    }
  }

  protected _send() {
    const chunkSize = Math.min(this.chunkSize, this._size);
    let done = false;

    if (chunkSize > 0) {
      const chunk = Buffer.alloc(chunkSize);
      this.buffer.copy(chunk, 0, 0, chunkSize);
      done = !this.push(chunk);
      this.buffer.copy(this.buffer, 0, chunkSize, this._size);
      this._size -= chunkSize;
    }

    if (this._size === 0 && this._stopped) {
      this.push(null); // tslint:disable-line:no-null-keyword
    }

    if (!done) {
      setImmediate(() => this._send());
    }
  }
}

export interface WritableStreamBufferOptions extends WritableOptions {
  allocSize?: number;
  growSize?: number;
}

export class WritableStreamBuffer extends Writable {
  protected buffer: Buffer;
  protected _size = 0;
  protected growSize: number;

  constructor(opts?: WritableStreamBufferOptions) {
    super(opts);
    this.buffer = Buffer.alloc(opts && opts.allocSize ? opts.allocSize : DEFAULT_ALLOC_SIZE);
    this.growSize = opts && opts.growSize ? opts.growSize : DEFAULT_GROW_SIZE;
  }

  get size(): number {
    return this._size;
  }

  _write(chunk: any, encoding: string, callback: Function): void {
    this.buffer = growBufferForAppendedData(this.buffer, this._size, Math.ceil(chunk.length / this.growSize) * this.growSize);
    chunk.copy(this.buffer, this._size, 0);
    this._size += chunk.length;
    callback();
  }

  consume(bytes?: number): Buffer {
    bytes = typeof bytes === 'number' ? bytes : this._size;
    const data = Buffer.alloc(bytes);
    this.buffer.copy(data, 0, 0, data.length);
    this.buffer.copy(this.buffer, 0, data.length);
    this._size -= data.length;

    return data;
  }
}

export function growBufferForAppendedData(buf: Buffer, actualsize: number, appendsize: number): Buffer {
  if ((buf.length - actualsize) >= appendsize) {
    return buf;
  }

  const newbuffer = Buffer.alloc(buf.length + appendsize);
  buf.copy(newbuffer, 0, 0, actualsize);
  return newbuffer;
}

export { combineStreams };
