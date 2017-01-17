export interface Promisify {
  <T>(func: (callback: (err: any, result?: T) => void) => void): () => Promise<T>;
  <T, A1>(func: (arg1: A1, callback: (err: any, result?: T) => void) => void): (arg1: A1) => Promise<T>;
  <T, A1, A2>(func: (arg1: A1, arg2: A2, callback: (err: any, result?: T) => void) => void): (arg1: A1, arg2: A2) => Promise<T>;
  <T, A1, A2, A3>(func: (arg1: A1, arg2: A2, arg3: A3, callback: (err: any, result?: T) => void) => void): (arg1: A1, arg2: A2, arg3: A3) => Promise<T>;
  <T, A1, A2, A3, A4>(func: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, callback: (err: any, result?: T) => void) => void): (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => Promise<T>;
  <T, A1, A2, A3, A4, A5>(func: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, callback: (err: any, result?: T) => void) => void): (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) => Promise<T>;
}

/**
 * @example: const rReadFile = promisify<Buffer, string>(fs.readFile);
 */
export const promisify: Promisify = function(func: any) {
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

export async function promiseMap(promiseFunc: Function, list: any[], threadLimit: number): Promise<any[]> {
  let threads = [];
  let results: any[] = Array(list.length);
  let items = list.map((value: any, index) => ({
    index,
    value,
  }));

  function callFunc(item: any): Promise<void> | undefined {
    if (!item) {
      return;
    }
    return promiseFunc(item.value, item.index, list)
      .then((result: any) => {
        results[item.index] = result;
        return callFunc(items.pop());
      });
  }

  for (var i = 0; i < list.length && i < threadLimit; i += 1) {
    threads.push(callFunc(items.pop()));
  }

  return Promise.all(threads).then(() => results);
}

