import { BaseConfig } from '@ionic/cli-framework';
import chalk from 'chalk';
import * as lodash from 'lodash';
import * as util from 'util';

import { CommandLineInputs, CommandLineOptions, IConfig, IProject } from '../../definitions';
import { Command } from '../../lib/command';
import { FatalException } from '../../lib/errors';

export interface BaseConfigContext {
  json: boolean;
  force: boolean;
  root: boolean;
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
    const root = options['root'] ? true : false;
    const value = this.interpretValue(v, json);
    const base: BaseConfigContext = { json, property, value, force, root };

    if (global) {
      if (root) {
        this.env.log.warn(`${chalk.green('--root')} has no effect with ${chalk.green('--global')}: this command always operates at root for CLI config.`);
      }

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

      if (typeof serialized === 'undefined') { // tslint:disable-line:strict-type-predicates
        throw new FatalException(`Cannot serialize value: ${chalk.bold(v)}`);
      }

      return serialized;
    } catch (e) {
      throw new FatalException(`Cannot serialize value: ${chalk.bold(v)}`);
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

interface FlexibleConfigFile { [key: string]: any; }

class FlexibleConfig extends BaseConfig<FlexibleConfigFile> {
  provideDefaults() {
    return {};
  }
}

export function getConfig(ctx: ConfigContext): FlexibleConfigFile {
  return ctx.root ? new FlexibleConfig(ctx.config.p) : ctx.config;
}

export function getConfigValue(ctx: ConfigContext): any {
  const { c } = getConfig(ctx);

  if (ctx.global) { // Global config is flattened
    return ctx.property ? c[ctx.property] : c;
  } else {
    return ctx.property ? lodash.get(c, ctx.property) : c;
  }
}

export function setConfigValue(ctx: ConfigContext & { property: string; originalValue: any; }): void {
  const conf = getConfig(ctx);

  if (ctx.originalValue && typeof ctx.originalValue === 'object' && !ctx.force) {
    throw new FatalException(
      `Sorry--will not override objects or arrays without ${chalk.green('--force')}.\n` +
      `Value of ${chalk.green(ctx.property)} is: ${chalk.bold(util.inspect(ctx.originalValue, { colors: false }))}`
    );
  }

  if (ctx.global) { // Global config is flattened
    conf.set(ctx.property, ctx.value);
  } else {
    const { c } = conf;
    lodash.set(c, ctx.property, ctx.value);
    conf.c = c;
  }
}

export function unsetConfigValue(ctx: ConfigContext & { property: string; }): void {
  const conf = getConfig(ctx);

  if (ctx.global) { // Global config is flattened
    conf.unset(ctx.property);
  } else {
    const { c } = conf;
    lodash.unset(c, ctx.property);
    conf.c = c;
  }
}
