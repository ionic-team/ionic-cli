export function identity<T>(v: T): T {
  return v;
}

export function enforceLF(str: string): string {
  return str.match(/[\r\n]$/) ? str : str + '\n';
}
