import * as util from 'util';
import * as chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, IConfig, IonicEnvironment } from '../../definitions';
import { FatalException } from '../../lib/errors';

export async function set(env: IonicEnvironment, inputs: CommandLineInputs, options: CommandLineOptions) {
  const { prettyPath } = await import('../../lib/utils/format');

  let [ p, v ] = inputs;
  const { global } = options;

  if (!global && !env.project.directory) {
    throw new FatalException(`Sorry--this won't work outside an Ionic project directory. Did you mean to set global config using ${chalk.green('--global')}?`);
  }

  const file: IConfig<Object> = global ? env.config : env.project;

  const config = await file.load();
  const [ get, set ] = await Promise.all([import('lodash/get'), import('lodash/set')]);

  const oldValue = get(config, p);
  const newValue = resolveValue(v);

  if (oldValue && typeof oldValue === 'object') {
    const prettyOldValue = util.inspect(oldValue, { breakLength: Infinity, colors: chalk.enabled });

    throw new FatalException(
      `Sorry--will not override objects or arrays.\n` +
      `Value of ${chalk.green(p)} is: ${prettyOldValue}`
    );
  }

  const valueChanged = oldValue !== newValue;

  set(config, p, newValue);
  await file.save();

  if (global && p === 'backend' && valueChanged) {
    await env.hooks.fire('backend:changed', { env });
  }

  if (valueChanged) {
    env.log.ok(`${chalk.green(p)} set to ${chalk.green(v)} in ${chalk.bold(prettyPath(file.filePath))}!`);
  } else {
    env.log.info(`${chalk.green(p)} is already set to ${chalk.green(v)}.`);
  }
}

function resolveValue(v: string): string | boolean {
  if (v === 'true') {
    return true;
  }

  if (v === 'false') {
    return false;
  }

  return v;
}
