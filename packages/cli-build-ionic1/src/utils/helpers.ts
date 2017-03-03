export function stringToInt(value: string, defaultValue: number): number {
  const result = parseInt(value, 10);
  if (isNaN(result)) {
    return defaultValue;
  }
  return result;
}
