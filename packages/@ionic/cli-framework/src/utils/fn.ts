export const noop = () => { /* void */ };

export function conform<T>(t?: T | T[]): T[] {
  if (!t) {
    return [];
  }

  if (!Array.isArray(t)) {
    return [t];
  }

  return t;
}
