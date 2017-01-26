import { AppScriptsServeSettings } from '../../definitions';

/**
 * TODO: Expect app-scripts to hand back the ports being used.
 */
export async function appScriptsServe(args: string[]): Promise<AppScriptsServeSettings> {
  const settings: AppScriptsServeSettings = {
    url: 'http://localhost:8100',
    address: 'localhost',
    port: 8100,
    liveReloadPort: 8200
  };
  return Promise.resolve(settings);
}

export async function appScriptsBuild(args: string[]): Promise<void> {
  return Promise.resolve();
}
