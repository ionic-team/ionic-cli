export function stringToInt(value: string, defaultValue: number): number {
  const result = parseInt(value, 10);
  if (result === NaN) {
    return defaultValue;
  }
  return result;
}
