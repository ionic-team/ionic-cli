/**
 * Load a commonJS module
 */
export function load(modulePath: string): any {
  var mPath = require.resolve(modulePath);
  return require(mPath);
}
