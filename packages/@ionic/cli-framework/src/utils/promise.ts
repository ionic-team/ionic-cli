import { EventEmitter } from 'events';

export interface Promisify {
  <T>(func: (callback: (err: any, result?: T) => void) => void): () => Promise<T>;
  <T, A1>(func: (arg1: A1, callback: (err: any, result?: T) => void) => void): (arg1: A1) => Promise<T>;
  <T, A1, A2>(func: (arg1: A1, arg2: A2, callback: (err: any, result?: T) => void) => void): (arg1: A1, arg2: A2) => Promise<T>;
  <T, A1, A2, A3>(func: (arg1: A1, arg2: A2, arg3: A3, callback: (err: any, result?: T) => void) => void): (arg1: A1, arg2: A2, arg3: A3) => Promise<T>;
  <T, A1, A2, A3, A4>(func: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, callback: (err: any, result?: T) => void) => void): (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => Promise<T>;
  <T, A1, A2, A3, A4, A5>(func: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, callback: (err: any, result?: T) => void) => void): (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) => Promise<T>;
}

export const promisify: Promisify = (func: any) => {
  return (...args: any[]) => {
    return new Promise((resolve, reject) => {
      func(...args, (err: any, response: any) => {
        if (err) {
          return reject(err);
        }

        resolve(response);
      });
    });
  };
};

export const promisifyEvent = (emitter: EventEmitter, event: string | symbol): Promise<any> => {
  return new Promise<any>((resolve, reject) => {
    emitter.once(event, (value: any) => {
      resolve(value);
    });

    emitter.once('error', (err: Error) => {
      reject(err);
    });
  });
};

export namespace PromiseUtil {
  export function some(promises: Promise<any>[], expected = 1): Promise<any[]> {
    if (promises.length === expected) {
      return Promise.all(promises);
    }

    return new Promise<any[]>((resolve, reject) => {
      const values: any[] = [];

      const resolveOne = (value: any) => {
        if (expected-- > 0) {
          values.push(value);
        } else {
          resolve(values);
        }
      };

      const rejectOne = (err: any) => {
        reject(err);
      };

      for (const promise of promises) {
        promise.then(resolveOne, rejectOne);
      }
    });
  }

  export async function any(promises: Promise<any>[]): Promise<any> {
    const [ first ] = await some(promises, 1);
    return first;
  }
}
