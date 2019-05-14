export function conform<T>(t?: T | T[]): T[] {
  if (typeof t === 'undefined') {
    return [];
  }

  if (!Array.isArray(t)) {
    return [t];
  }

  return t;
}

export async function concurrentFilter<T>(array: T[], callback: (currentValue: T) => Promise<boolean>): Promise<T[]> {
  const mapper = async (v: T): Promise<[T, boolean]> => [v, await callback(v)];
  const mapped = await Promise.all(array.map(mapper));

  return mapped
    .filter(([ , f ]) => f)
    .map(([ v ]) => v);
}

export async function filter<T>(array: T[], callback: (currentValue: T, currentIndex: number, array: readonly T[]) => Promise<boolean>): Promise<T[]>;
export async function filter<T>(array: readonly T[], callback: (currentValue: T, currentIndex: number, array: readonly T[]) => Promise<boolean>): Promise<readonly T[]>;
export async function filter<T>(array: T[] | readonly T[], callback: (currentValue: T, currentIndex: number, array: readonly T[]) => Promise<boolean>): Promise<T[] | readonly T[]> {
  const initial: T[] = [];

  return reduce(array, async (acc, v, i, arr) => {
    if (await callback(v, i, arr)) {
      acc.push(v);
    }

    return acc;
  }, initial);
}

export async function map<T, U>(array: T[], callback: (currentValue: T, currentIndex: number, array: readonly T[]) => Promise<U>): Promise<U[]>;
export async function map<T, U>(array: T[], callback: (currentValue: T, currentIndex: number, array: readonly T[]) => Promise<U>): Promise<readonly U[]>;
export async function map<T, U>(array: readonly T[], callback: (currentValue: T, currentIndex: number, array: readonly T[]) => Promise<U>): Promise<U[]>;
export async function map<T, U>(array: readonly T[], callback: (currentValue: T, currentIndex: number, array: readonly T[]) => Promise<U>): Promise<readonly U[]>;
export async function map<T, U>(array: T[] | readonly T[], callback: (currentValue: T, currentIndex: number, array: readonly T[]) => Promise<U>): Promise<U[] | readonly U[]> {
  const initial: U[] = [];

  return reduce(array, async (acc, v, i, arr) => {
    acc.push(await callback(v, i, arr));

    return acc;
  }, initial);
}

export async function reduce<T>(array: T[], callback: (accumulator: T, currentValue: T, currentIndex: number, array: readonly T[]) => Promise<T>): Promise<T>;
export async function reduce<T>(array: T[], callback: (accumulator: T, currentValue: T, currentIndex: number, array: readonly T[]) => Promise<T>, initialValue: T): Promise<T>;
export async function reduce<T, R>(array: T[], callback: (accumulator: R, currentValue: T, currentIndex: number, array: readonly T[]) => Promise<R>): Promise<R>;
export async function reduce<T, U>(array: T[], callback: (accumulator: U, currentValue: T, currentIndex: number, array: readonly T[]) => Promise<U>, initialValue: U): Promise<U>;
export async function reduce<T>(array: readonly T[], callback: (accumulator: T, currentValue: T, currentIndex: number, array: readonly T[]) => Promise<T>): Promise<T>;
export async function reduce<T>(array: readonly T[], callback: (accumulator: T, currentValue: T, currentIndex: number, array: readonly T[]) => Promise<T>, initialValue: T): Promise<T>;
export async function reduce<T, R>(array: readonly T[], callback: (accumulator: R, currentValue: T, currentIndex: number, array: readonly T[]) => Promise<R>): Promise<R>;
export async function reduce<T, U>(array: readonly T[], callback: (accumulator: U, currentValue: T, currentIndex: number, array: readonly T[]) => Promise<U>, initialValue: U): Promise<U>;
export async function reduce<T, U>(array: T[] | readonly T[], callback: (accumulator: T | U, currentValue: T, currentIndex: number, array: readonly T[]) => Promise<T | U>, initialValue?: T | U): Promise<T | U> {
  const hadInitialValue = typeof initialValue === 'undefined';
  const startingIndex = hadInitialValue ? 1 : 0;

  if (typeof initialValue === 'undefined') {
    if (array.length === 0) {
      throw new TypeError('Reduce of empty array with no initial value');
    }

    initialValue = array[0];
  }

  let value = initialValue;

  for (let i = startingIndex; i < array.length; i++) {
    const v = await callback(value, array[i], i, array);
    value = v;
  }

  return value;
}
