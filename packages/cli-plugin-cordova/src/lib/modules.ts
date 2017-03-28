import * as FormDataType from 'form-data';
import * as inquirerType from 'inquirer';
import * as xml2jsType from 'xml2js';

export function load(modulePath: 'form-data'): typeof FormDataType;
export function load(modulePath: 'inquirer'): typeof inquirerType;
export function load(modulePath: 'xml2js'): typeof xml2jsType;
export function load(modulePath: string): any {
  return require(modulePath);
}
