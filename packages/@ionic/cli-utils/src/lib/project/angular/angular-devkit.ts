import * as Debug from 'debug';

import * as AngularDevKitSchematicsType from '@angular-devkit/schematics';
import * as AngularDevKitSchematicsToolsType from '@angular-devkit/schematics/tools';

import { compileNodeModulesPaths, resolve } from '@ionic/cli-framework/utils/npm';

const debug = Debug('ionic:cli-utils:lib:project:angular:angular-devkit');

export async function importNgSchematics(projectDir: string): Promise<typeof AngularDevKitSchematicsType> {
  const pkg = '@angular-devkit/schematics';

  debug('Importing %s', pkg);
  const p = resolve(pkg, { paths: compileNodeModulesPaths(projectDir) });
  const m = require(p);
  debug('fin');

  return m;
}

export async function importNgSchematicsTools(projectDir: string): Promise<typeof AngularDevKitSchematicsToolsType> {
  const pkg = '@angular-devkit/schematics/tools';

  debug('Importing %s', pkg);
  const p = resolve(pkg, { paths: compileNodeModulesPaths(projectDir) });
  const m = require(p);
  debug('fin');

  return m;
}
