import { IHookEngine, getCommandInfo } from '@ionic/cli-utils';

export const name = '__NAME__';
export const version = '__VERSION__';

export function registerHooks(hooks: IHookEngine) {
  hooks.register(name, 'command:info', async ({ env }) => {
    let gulpVersion = await getCommandInfo('gulp', ['--version']);

    if (gulpVersion) {
      gulpVersion = gulpVersion.replace(/\[[\d\:]+\]\s/g, '');
      gulpVersion = gulpVersion.trim();
    }

    return [
      { type: 'global-packages', name: 'Gulp CLI', version: gulpVersion || 'not installed globally' },
      { type: 'local-packages', name, version },
    ];
  });
}
