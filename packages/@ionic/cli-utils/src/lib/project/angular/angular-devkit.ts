import * as AngularDevKitSchematicsType from '@angular-devkit/schematics';
import * as AngularDevKitSchematicsToolsType from '@angular-devkit/schematics/tools';

import { compileNodeModulesPaths, resolve } from '@ionic/cli-framework/utils/npm';

export async function importNgSchematics(projectDir: string): Promise<typeof AngularDevKitSchematicsType> {
  const p = resolve('@angular-devkit/schematics', { paths: compileNodeModulesPaths(projectDir) });
  return require(p);
}

export async function importNgSchematicsTools(projectDir: string): Promise<typeof AngularDevKitSchematicsToolsType> {
  const p = resolve('@angular-devkit/schematics/tools', { paths: compileNodeModulesPaths(projectDir) });
  return require(p);
}

export {
  AngularDevKitSchematicsToolsType,
};
