import { CommandLineInputs, CommandLineOptions, IConfig, IProject } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';
import chalk from 'chalk';
import * as lodash from 'lodash';
import * as util from 'util';

export interface BaseConfigContext {
  json: boolean;
  force: boolean;
  property?: string;
  value?: any;
}

export interface GlobalConfigContext extends BaseConfigContext {
  global: true;
  config: IConfig;
}

export interface ProjectConfigContext extends BaseConfigContext {
  global: false;
  config: IProject['config'];
}

export type ConfigContext = GlobalConfigContext | ProjectConfigContext;

export abstract class BaseConfigCommand extends Command {
  generateContext(inputs: CommandLineInputs, options: CommandLineOptions): ConfigContext {
    const [ property, v ] = inputs;
    const global = options['global'] ? true : false;
    const json = options['json'] ? true : false;
    const force = options['force'] ? true : false;
    const value = this.interpretValue(v, json);
    const base: BaseConfigContext = { json, property, value, force };

    if (global) {
      return { global, config: this.env.config, ...base };
    } else {
      if (!this.project) {
        throw new FatalException(
          `Sorry--this won't work outside an Ionic project directory.\n` +
          `Did you mean to operate on global config using ${chalk.green('--global')}?`
        );
      }

      return { global, config: this.project.config, ...base };
    }
  }

  jsonStringify(v: any): string {
    try {
      const serialized = JSON.stringify(v);

      if (typeof serialized === 'undefined') {
        throw new FatalException(`Cannot serialize value: ${v}`);
      }

      return serialized;
    } catch (e) {
      throw new FatalException(`Cannot serialize value: ${v}`);
    }
  }

  interpretValue(v?: string, expectJson = false): any {
    if (typeof v === 'undefined') {
      return undefined;
    }

    try {
      // '12345e6' (a possible Pro ID) is interpreted as a number in scientific
      // notation during JSON.parse, so don't try
      if (!v.match(/^\d+e\d+$/)) {
        v = JSON.parse(v);
      }
    } catch (e) {
      if (e.name !== 'SyntaxError') {
        throw e;
      }

      if (expectJson) {
        throw new FatalException(`${chalk.green('--json')}: ${chalk.green(v)} is invalid JSON: ${chalk.red(e.toString())}`);
      }
    }

    return v;
  }
}

export function getConfig(ctx: ConfigContext): any {
  if (ctx.global) { // Global config is flattened
    const conf: { [key: string]: any; } = ctx.config.c;
    return ctx.property ? conf[ctx.property] : conf;
  } else {
    const conf = ctx.config.c;
    return ctx.property ? lodash.get(conf, ctx.property) : conf;
  }
}

export function setConfig(ctx: ConfigContext & { property: string; originalValue: any; }): void {
  if (ctx.originalValue && typeof ctx.originalValue === 'object' && !ctx.force) {
    throw new FatalException(
      `Sorry--will not override objects or arrays without ${chalk.green('--force')}.\n` +
      `Value of ${chalk.green(ctx.property)} is: ${chalk.bold(util.inspect(ctx.originalValue, { colors: false }))}`
    );
  }

  if (ctx.global) { // Global config is flattened
    ctx.config.set(ctx.property as any, ctx.value);
  } else {
    const conf = ctx.config.c;
    lodash.set(conf, ctx.property, ctx.value);
    ctx.config.c = conf;
  }
}

export function unsetConfig(ctx: ConfigContext & { property: string; }): void {
  if (ctx.global) { // Global config is flattened
    ctx.config.unset(ctx.property as any);
  } else {
    const conf = ctx.config.c;
    lodash.unset(conf, ctx.property);
    ctx.config.c = conf;
  }
}
