import * as dgramType from 'dgram';
import * as opnType from 'opn';

export function load(modulePath: 'dgram'): typeof dgramType;
export function load(modulePath: 'opn'): typeof opnType;
export function load(modulePath: string): any {
  return require(modulePath);
}
