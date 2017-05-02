import { IHookEngine } from './definitions';

export * from './definitions';
export * from './guards';

export * from './lib/app';
export * from './lib/command';
export * from './lib/command/command';
export * from './lib/command/namespace';
export * from './lib/command/utils';
export * from './lib/config';
export * from './lib/deploy';
export * from './lib/errors';
export * from './lib/help';
export * from './lib/hooks';
export * from './lib/http';
export * from './lib/login';
export * from './lib/modules';
export * from './lib/package';
export * from './lib/plugins';
export * from './lib/project';
export * from './lib/security';
export * from './lib/session';
export * from './lib/shell';
export * from './lib/telemetry';
export * from './lib/utils/archive';
export * from './lib/utils/array';
export * from './lib/utils/environmentInfo';
export * from './lib/utils/format';
export * from './lib/utils/fs';
export * from './lib/utils/logger';
export * from './lib/utils/network';
export * from './lib/utils/npm';
export * from './lib/utils/promise';
export * from './lib/utils/shell';
export * from './lib/utils/string';
export * from './lib/utils/task';
export * from './lib/validators'

export const name = '__NAME__';
export const version = '__VERSION__';

export function registerHooks(hooks: IHookEngine) {
  hooks.register(name, 'command:info', async () => {
    return [
      { type: 'global-packages', name, version },
    ];
  });
}
