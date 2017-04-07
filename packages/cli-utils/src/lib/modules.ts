import * as LeekType from 'leek';
import * as ProgressBarType from 'progress';
import * as archiverType from 'archiver';
import * as crossSpawnType from 'cross-spawn';
import * as inquirerType from 'inquirer';
import * as lodashType from 'lodash';
import * as ncpType from 'ncp';
import * as osNameType from 'os-name';
import * as sliceAnsiType from 'slice-ansi';
import * as superagentType from 'superagent';
import * as uuidType from 'uuid';

export function load(modulePath: 'archiver'): typeof archiverType;
export function load(modulePath: 'cross-spawn'): typeof crossSpawnType;
export function load(modulePath: 'inquirer'): typeof inquirerType;
export function load(modulePath: 'leek'): typeof LeekType;
export function load(modulePath: 'lodash'): typeof lodashType;
export function load(modulePath: 'ncp'): typeof ncpType;
export function load(modulePath: 'os-name'): typeof osNameType;
export function load(modulePath: 'progress'): typeof ProgressBarType;
export function load(modulePath: 'slice-ansi'): typeof sliceAnsiType;
export function load(modulePath: 'superagent'): typeof superagentType;
export function load(modulePath: 'uuid'): typeof uuidType;
export function load(modulePath: string): any {
  return require(modulePath);
}
