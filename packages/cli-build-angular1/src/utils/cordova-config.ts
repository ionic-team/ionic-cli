import * as fs from 'fs';
import * as xml2js from 'xml2js';

export interface CordovaProject {
  name?: string;
  id?: string;
  version?: string;
}

let lastConfig: CordovaProject;

/**
 * Parse and build a CordovaProject config object by parsing the
 * config.xml file in the project root.
 */
export let buildCordovaConfig = (errCb: Function, cb: Function) => {
  var parser = new xml2js.Parser();
  fs.readFile('config.xml', (err: any, data: any) => {
    if (err) {
      errCb(err);
      return;
    }
    parser.parseString(data, (err: any, result: any) => {
      if (err) {
        errCb(err);
        return;
      }
      cb(parseConfig(result));
    });
  });
};

export let parseConfig = (parsedConfig: any) : CordovaProject => {
  if (!parsedConfig.widget) {
    return {};
  }

  let widget = parsedConfig.widget;

  // Widget attrs are defined on the <widget> tag
  let widgetAttrs = widget.$;

  let config: CordovaProject = {
    name: widget.name[0]
  };

  if (widgetAttrs) {
    config.id = widgetAttrs.id;
    config.version = widgetAttrs.version;
  }

  lastConfig = config;

  return config;
};
