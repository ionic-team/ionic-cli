import * as util from 'util';
import * as chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, IonicEnvironment } from '../../definitions';
import { FatalException } from '../../lib/errors';

export async function get(env: IonicEnvironment, inputs: CommandLineInputs, options: CommandLineOptions) {
  let [ p ] = inputs;
  const { global, json } = options;

  if (!global && !env.project.directory) {
    throw new FatalException(`Sorry--this won't work outside an Ionic project directory. Did you mean to print global config using ${chalk.green('--global')}?`);
  }

  const file = global ? env.config : env.project;

  const config = await file.load();
  const [ cloneDeep, get ] = await Promise.all([import('lodash/cloneDeep'), import('lodash/get')]);

  const v = cloneDeep(p ? get(config, p) : config);

  if (json) {
    process.stdout.write(JSON.stringify(v));
  } else {
    await sanitize(p, v);
    env.log.msg(util.inspect(v, { colors: chalk.enabled }));
  }
}

async function scrubTokens(obj: any) {
  const mapValues = await import('lodash/mapValues');
  return mapValues(obj, () => '*****');
}

async function sanitize(key: string, obj: any) {
  const assign = await import('lodash/assign');

  if (typeof obj === 'object' && 'tokens' in obj) {
    obj['tokens'] = await scrubTokens(obj['tokens']);
  }

  if (key === 'tokens') {
    assign(obj, await scrubTokens(obj));
  }
}

