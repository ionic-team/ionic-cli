import * as Debug from 'debug';

import { PromptModule, StreamHandler, TaskChain } from '@ionic/cli-framework';

import { IClient, IConfig, ILogger, ISession, IShell, InfoItem, IonicContext, IonicEnvironment, IonicEnvironmentFlags } from '../definitions';

import { createDefaultLoggerHandlers, createFormatter } from './utils/logger';

const debug = Debug('ionic:cli-utils:lib:environment');

export interface EnvironmentDeps {
  readonly client: IClient;
  readonly config: IConfig; // CLI global config (~/.ionic/config.json)
  readonly flags: IonicEnvironmentFlags;
  readonly getInfo: () => Promise<InfoItem[]>;
  readonly log: ILogger;
  readonly ctx: IonicContext;
  readonly prompt: PromptModule;
  readonly session: ISession;
  readonly shell: IShell;
  readonly tasks: TaskChain;
}

export class Environment implements IonicEnvironment {
  readonly flags: IonicEnvironmentFlags;
  readonly client: IClient;
  readonly config: IConfig; // CLI global config (~/.ionic/config.json)
  getInfo: () => Promise<InfoItem[]>;
  readonly log: ILogger;
  readonly prompt: PromptModule;
  session: ISession;
  readonly shell: IShell;
  readonly tasks: TaskChain;
  readonly ctx: IonicContext;

  constructor({ client, config, flags, getInfo, log, ctx, prompt, session, shell, tasks }: EnvironmentDeps) {
    this.client = client;
    this.config = config;
    this.flags = flags;
    this.getInfo = getInfo;
    this.log = log;
    this.ctx = ctx;
    this.prompt = prompt;
    this.session = session;
    this.shell = shell;
    this.tasks = tasks;
  }

  open() {
    if (this.flags.interactive) {
      this.prompt.open();
    }

    const formatter = createFormatter();
    this.log.handlers = this.flags.interactive
      ? new Set([new StreamHandler({ stream: this.prompt.output.stream, formatter })])
      : createDefaultLoggerHandlers();

    debug('Environment open.');
  }

  close() {
    this.tasks.cleanup();

    this.prompt.close();
    this.log.handlers = createDefaultLoggerHandlers();

    debug('Environment closed.');
  }
}
