export async function resolveValue<T>(...fns: (() => Promise<T | undefined>)[]): Promise<T | undefined> {
  for (const fn of fns) {
    const result = await fn();

    if (typeof result !== 'undefined') {
      return result;
    }
  }
}

export function resolveValueSync<T>(...fns: (() => T | undefined)[]): T | undefined {
  for (const fn of fns) {
    const result = fn();

    if (typeof result !== 'undefined') {
      return result;
    }
  }
}
