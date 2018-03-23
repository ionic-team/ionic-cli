import { compileNodeModulesPaths, resolve } from '@ionic/cli-framework/utils/npm';

export async function importAppScripts(projectDir: string): Promise<any> {
  const appScriptsPath = resolve('@ionic/app-scripts', { paths: compileNodeModulesPaths(projectDir) });

  return require(appScriptsPath);
}

