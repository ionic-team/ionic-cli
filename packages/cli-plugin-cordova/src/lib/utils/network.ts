import * as os from 'os';

/**
 * Recursively flatten an array.
 */
function flatten(arr: any[]): any[] {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
}


export function getAvailableIPAddress() {
  let interfaces = os.networkInterfaces();
  return flatten(
    Object.keys(interfaces).map(deviceName => (
      interfaces[deviceName].map(item => ({
        address: item.address,
        deviceName,
        family: item.family,
        internal: item.internal
      }))
    ))
  )
  .filter(item => !item.internal && item.family === 'IPv4');
}
