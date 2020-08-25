export function identity<T>(v: T): T {
  return v;
}

export function enforceLF(str: string): string {
  return str.match(/[\r\n]$/) ? str : str + '\n';
}

export function dropWhile<T>(array: readonly T[], predicate: (item: T) => boolean = v => !!v): T[] {
  let done = false;

  return array.filter(item => {
    if (done) {
      return true;
    }

    if (predicate(item)) {
      return false;
    } else {
      done = true;
      return true;
    }
  });
}
