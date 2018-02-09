export function conform<T>(t?: T | T[]): T[] {
  if (typeof t === 'undefined') {
    return [];
  }

  if (!Array.isArray(t)) {
    return [t];
  }

  return t;
}
