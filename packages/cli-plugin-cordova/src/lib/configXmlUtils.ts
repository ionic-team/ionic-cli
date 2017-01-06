export function getOrientationConfigData(configData: any): string | undefined {
  if (configData.widget && configData.widget.preference) {
    var n = configData.widget.preference.find((d: any) => {
      return d && d.$ && d.$.name && d.$.name.toLowerCase() === 'orientation';
    });
    if (n && n.$ && n.$.value) {
      return n.$.value.toLowerCase();
    }
  }
}
