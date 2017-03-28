import * as dgramType from 'dgram';
import * as inquirerType from 'inquirer';
import * as opnType from 'opn';
import * as pathExistsType from 'path-exists';
import * as qrcodeType from 'qrcode-terminal';

export function load(modulePath: 'dgram'): typeof dgramType;
export function load(modulePath: 'inquirer'): typeof inquirerType;
export function load(modulePath: 'opn'): typeof opnType;
export function load(modulePath: 'path-exists'): typeof pathExistsType;
export function load(modulePath: 'qrcode'): typeof qrcodeType;
export function load(modulePath: string): any {
  return require(modulePath);
}
