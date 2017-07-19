import * as diffType from 'diff';
import * as dgramType from 'dgram';
import * as opnType from 'opn';
import * as osNameType from 'os-name';
import * as sshConfigType from 'ssh-config';

export function load(modulePath: 'diff'): typeof diffType;
export function load(modulePath: 'dgram'): typeof dgramType;
export function load(modulePath: 'opn'): typeof opnType;
export function load(modulePath: 'os-name'): typeof osNameType;
export function load(modulePath: 'ssh-config'): typeof sshConfigType;
export function load(modulePath: string): any {
  return require(modulePath);
}
