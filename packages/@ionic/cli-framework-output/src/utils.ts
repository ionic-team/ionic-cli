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

const TIME_UNITS = ['s', 'ms', 'μp'];

export function formatHrTime(hrtime: [number, number]): string {
  let time = hrtime[0] + hrtime[1] / 1e9;
  let index = 0;

  for (; index < TIME_UNITS.length - 1; index++, time *= 1000) {
    if (time >= 1) {
      break;
    }
  }

  return time.toFixed(2) + TIME_UNITS[index];
}
