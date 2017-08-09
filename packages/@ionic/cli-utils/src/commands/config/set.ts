import * as chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, IBaseConfig, IonicEnvironment } from '../../definitions';
import { FatalException } from '../../lib/errors';

export async function set(env: IonicEnvironment, inputs: CommandLineInputs, options: CommandLineOptions) {
  const { prettyPath } = await import('../../lib/utils/format');

  let [ p, v ] = inputs;
  const { global, json, force } = options;

  if (!global && !env.project.directory) {
    throw new FatalException(`Sorry--this won't work outside an Ionic project directory. Did you mean to set global config using ${chalk.green('--global')}?`);
  }

  const file: IBaseConfig<Object> = global ? env.config : env.project;

  const config = await file.load();
  const [ get, set ] = await Promise.all([import('lodash/get'), import('lodash/set')]);

  const oldValue = get(config, p);

  try {
    v = JSON.parse(v);
  } catch (e) {
    if (!(e instanceof SyntaxError)) {
      throw e;
    }

    if (json) {
      throw new FatalException(`${chalk.green('--json')}: ${chalk.green(v)} is invalid JSON: ${chalk.red(String(e))}`);
    }
  }

  let newValue = v;

  if (oldValue && typeof oldValue === 'object' && !force) {
    throw new FatalException(
      `Sorry--will not override objects or arrays without ${chalk.green('--force')}.\n` +
      `Value of ${chalk.green(p)} is: ${chalk.bold(JSON.stringify(oldValue))}`
    );
  }

  const valueChanged = oldValue !== newValue;

  set(config, p, newValue);
  await file.save();

  if (global && p === 'backend' && valueChanged) {
    await env.hooks.fire('backend:changed', { env });
  }

  if (valueChanged) {
    env.log.ok(`${chalk.green(p)} set to ${chalk.green(JSON.stringify(v))} in ${chalk.bold(prettyPath(file.filePath))}!`);
  } else {
    env.log.info(`${chalk.green(p)} is already set to ${chalk.bold(JSON.stringify(v))}.`);
  }
}
