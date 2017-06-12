import * as LeekType from 'leek';
import * as archiverType from 'archiver';
import * as crossSpawnType from 'cross-spawn';
import * as dargsType from 'dargs';
import * as inquirerType from 'inquirer';
import * as lodashType from 'lodash';
import * as ncpType from 'ncp';
import * as semverType from 'semver';
import * as sliceAnsiType from 'slice-ansi';
import * as stripAnsiType from 'strip-ansi';
import * as superagentType from 'superagent';
import * as uuidType from 'uuid';
import * as wrapAnsiType from 'wrap-ansi';

export function load(modulePath: 'archiver'): typeof archiverType;
export function load(modulePath: 'cross-spawn'): typeof crossSpawnType;
export function load(modulePath: 'dargs'): typeof dargsType;
export function load(modulePath: 'inquirer'): typeof inquirerType;
export function load(modulePath: 'leek'): typeof LeekType;
export function load(modulePath: 'lodash'): typeof lodashType;
export function load(modulePath: 'ncp'): typeof ncpType;
export function load(modulePath: 'semver'): typeof semverType;
export function load(modulePath: 'slice-ansi'): typeof sliceAnsiType;
export function load(modulePath: 'strip-ansi'): typeof stripAnsiType;
export function load(modulePath: 'superagent'): typeof superagentType;
export function load(modulePath: 'uuid'): typeof uuidType;
export function load(modulePath: 'wrap-ansi'): typeof wrapAnsiType;
export function load(modulePath: string): any {
  return require(modulePath);
}
