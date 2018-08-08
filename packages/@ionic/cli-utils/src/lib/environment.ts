import { PromptModule } from '@ionic/cli-framework';

import { IClient, IConfig, ILogger, ISession, IShell, InfoItem, IonicContext, IonicEnvironment, IonicEnvironmentFlags } from '../definitions';

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
  readonly ctx: IonicContext;

  constructor({ client, config, flags, getInfo, log, ctx, prompt, session, shell }: EnvironmentDeps) {
    this.client = client;
    this.config = config;
    this.flags = flags;
    this.getInfo = getInfo;
    this.log = log;
    this.ctx = ctx;
    this.prompt = prompt;
    this.session = session;
    this.shell = shell;
  }
}
