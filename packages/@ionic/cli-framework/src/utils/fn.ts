export function resolveValueSync<T>(...fns: (() => T | undefined)[]): T | undefined {
  for (const fn of fns) {
    const result = fn();

    if (result) {
      return result;
    }
  }
}

export async function resolveValue<T>(...fns: (() => Promise<T | undefined>)[]): Promise<T | undefined> {
  for (const fn of fns) {
    const result = await fn();

    if (result) {
      return result;
    }
  }
}
