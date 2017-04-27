import * as xml2jsType from 'xml2js';

export function load(modulePath: 'xml2js'): typeof xml2jsType;
export function load(modulePath: string): any {
  return require(modulePath);
}
