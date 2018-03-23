import { compileNodeModulesPaths, resolve } from '@ionic/cli-framework/utils/npm';

export async function importNgSchematics(projectDir: string): Promise<any> {
  const appScriptsPath = resolve('@angular-devkit/schematics', { paths: compileNodeModulesPaths(projectDir) });

  return require(appScriptsPath);
}

export async function importNgSchematicsTools(projectDir: string): Promise<any> {
    const appScriptsPath = resolve('@angular-devkit/schematics/tools', { paths: compileNodeModulesPaths(projectDir) });

    return require(appScriptsPath);
}
