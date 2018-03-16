export function conform<T>(t?: T | T[]): T[] {
  if (typeof t === 'undefined') {
    return [];
  }

  if (!Array.isArray(t)) {
    return [t];
  }

  return t;
}

export async function filter<T>(array: T[], callback: (currentValue: T, currentIndex: number, array: T[]) => Promise<boolean>): Promise<T[]> {
  const initial: T[] = [];

  return reduce(array, async (acc, v, i, arr) => {
    if (await callback(v, i, arr)) {
      acc.push(v);
    }

    return acc;
  }, initial);
}

export async function reduce<T>(array: T[], callback: (accumulator: T, currentValue: T, currentIndex: number, array: T[]) => Promise<T>): Promise<T>;
export async function reduce<T>(array: T[], callback: (accumulator: T, currentValue: T, currentIndex: number, array: T[]) => Promise<T>, initialValue: T): Promise<T>;
export async function reduce<T, U>(array: T[], callback: (accumulator: U, currentValue: T, currentIndex: number, array: T[]) => Promise<U>, initialValue: U): Promise<U>;
export async function reduce<T, U>(array: T[], callback: (accumulator: T | U, currentValue: T, currentIndex: number, array: T[]) => Promise<T | U>, initialValue?: T | U): Promise<T | U> {
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
