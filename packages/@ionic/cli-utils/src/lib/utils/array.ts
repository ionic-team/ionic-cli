/**
 * Recursively flatten an array.
 */
export function flattenArray(arr: any[]): any[] {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flattenArray(toFlatten) : toFlatten);
  }, []);
}
