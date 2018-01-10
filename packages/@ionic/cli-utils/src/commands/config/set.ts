import chalk from 'chalk';
import * as lodash from 'lodash';

import { prettyPath } from '@ionic/cli-framework/utils/format';

import { CommandLineInputs, CommandLineOptions, IBaseConfig, IonicEnvironment } from '../../definitions';
import { FatalException } from '../../lib/errors';

export async function set(env: IonicEnvironment, inputs: CommandLineInputs, options: CommandLineOptions) {
  const [ p, v ] = inputs;
  const { global, json, force } = options;

  if (!global && !env.project.directory) {
    throw new FatalException(`Sorry--this won't work outside an Ionic project directory. Did you mean to set global config using ${chalk.green('--global')}?`);
  }

  const file: IBaseConfig<Object> = global ? env.config : env.project;

  const config = await file.load();
  const oldValue = lodash.get(config, p);

  if (!v.match(/^\d+e\d+$/)) {
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
  }

  const newValue = v;

  if (oldValue && typeof oldValue === 'object' && !force) {
    throw new FatalException(
      `Sorry--will not override objects or arrays without ${chalk.green('--force')}.\n` +
      `Value of ${chalk.green(p)} is: ${chalk.bold(JSON.stringify(oldValue))}`
    );
  }

  const valueChanged = oldValue !== newValue;

  lodash.set(config, p, newValue);
  await file.save();

  if (valueChanged) {
    env.log.ok(`${chalk.green(p)} set to ${chalk.green(JSON.stringify(v))} in ${chalk.bold(prettyPath(file.filePath))}!`);
  } else {
    env.log.msg(`${chalk.green(p)} is already set to ${chalk.bold(JSON.stringify(v))}.`);
  }
}
