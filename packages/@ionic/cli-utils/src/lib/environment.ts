import * as Debug from 'debug';

import { DEFAULT_LOGGER_HANDLERS, PromptModule, TaskChain } from '@ionic/cli-framework';

import { IClient, IConfig, ILogger, IProject, ISession, IShell, InfoItem, IonicContext, IonicEnvironment, IonicEnvironmentFlags } from '../definitions';

import { createFormatter } from './utils/logger';

const debug = Debug('ionic:cli-utils:lib:environment');

export class Environment implements IonicEnvironment {
  readonly flags: IonicEnvironmentFlags;
  readonly client: IClient;
  readonly config: IConfig; // CLI global config (~/.ionic/config.json)
  getInfo: () => Promise<InfoItem[]>;
  readonly log: ILogger;
  readonly prompt: PromptModule;
  project: IProject; // project config (ionic.config.json)
  session: ISession;
  readonly shell: IShell;
  readonly tasks: TaskChain;
  readonly ctx: IonicContext;
  keepopen = false;

  constructor({
    client,
    config,
    flags,
    getInfo,
    log,
    ctx,
    project,
    prompt,
    session,
    shell,
    tasks,
  }: {
    client: IClient;
    config: IConfig; // CLI global config (~/.ionic/config.json)
    flags: IonicEnvironmentFlags;
    getInfo: () => Promise<InfoItem[]>;
    log: ILogger;
    ctx: IonicContext,
    project: IProject; // project config (ionic.config.json)
    prompt: PromptModule;
    session: ISession;
    shell: IShell;
    tasks: TaskChain;
  }) {
    this.client = client;
    this.config = config;
    this.flags = flags;
    this.getInfo = getInfo;
    this.log = log;
    this.ctx = ctx;
    this.project = project;
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
      ? this.prompt.createLoggerHandlers({ formatter })
      : new Set([...DEFAULT_LOGGER_HANDLERS].map(handler => handler.clone({ formatter })));

    debug('Environment open.');
  }

  close() {
    if (!this.keepopen) {
      this.tasks.cleanup();

      this.prompt.close();
      const formatter = createFormatter();
      this.log.handlers = new Set([...DEFAULT_LOGGER_HANDLERS].map(handler => handler.clone({ formatter })));

      debug('Environment closed.');
    }
  }
}
