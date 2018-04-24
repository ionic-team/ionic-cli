import * as Debug from 'debug';

import * as inquirerType from 'inquirer';

import { IClient, IConfig, ILogger, IProject, ISession, IShell, ITaskChain, InfoItem, IonicContext, IonicEnvironment, IonicEnvironmentFlags, PromptModule } from '../definitions';

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
  readonly tasks: ITaskChain;
  readonly ctx: IonicContext;
  keepopen = false;

  private bottomBar?: inquirerType.ui.BottomBar;

  constructor({
    bottomBar,
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
    bottomBar?: inquirerType.ui.BottomBar;
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
    tasks: ITaskChain;
  }) {
    this.bottomBar = bottomBar;
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
      if (!this.bottomBar) {
        const inquirer = require('inquirer');
        this.bottomBar = new inquirer.ui.BottomBar();
      }

      try {
        // the mute() call appears to be necessary, otherwise when answering
        // inquirer prompts upon pressing enter, a copy of the prompt is
        // printed to the screen and looks gross
        const bottomBarHack = <any>this.bottomBar;
        bottomBarHack.rl.output.mute();
      } catch (e) {
        process.stderr.write(`EXCEPTION DURING BOTTOMBAR OUTPUT MUTE: ${e}\n`);
      }
    }

    this.log.outstream = typeof this.bottomBar === 'undefined' ? process.stdout : this.bottomBar.log;
    this.log.errstream = typeof this.bottomBar === 'undefined' ? process.stderr : this.bottomBar.log;

    debug('Environment open.');
  }

  close() {
    if (!this.keepopen) {
      this.tasks.cleanup();

      // instantiating inquirer.ui.BottomBar hangs, so when close() is called,
      // we close BottomBar streams and replace the log stream with stdout.
      // This means inquirer shouldn't be used after command execution finishes
      // (which could happen during long-running processes like serve).
      if (this.bottomBar) {
        this.bottomBar.close();
        this.bottomBar = undefined;
        this.log.outstream = process.stdout;
        this.log.errstream = process.stderr;
      }

      debug('Environment closed.');
    }
  }
}
