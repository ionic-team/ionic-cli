import * as chalk from 'chalk';

import * as inquirerType from 'inquirer';

import {
  ICLIEventEmitter,
  IClient,
  IConfig,
  IDaemon,
  IHookEngine,
  ILogger,
  IProject,
  IRootNamespace,
  ISession,
  IShell,
  ITaskChain,
  ITelemetry,
  IonicEnvironment,
  IonicEnvironmentFlags,
  IonicEnvironmentMeta,
  IonicEnvironmentPlugins,
  PromptModule,
} from '../definitions';

export class Environment implements IonicEnvironment {
  readonly flags: IonicEnvironmentFlags;
  readonly hooks: IHookEngine;
  readonly client: IClient;
  readonly config: IConfig; // CLI global config (~/.ionic/config.json)
  readonly daemon: IDaemon;
  readonly events: ICLIEventEmitter;
  readonly log: ILogger;
  readonly prompt: PromptModule;
  readonly meta: IonicEnvironmentMeta;
  project: IProject; // project config (ionic.config.json)
  readonly plugins: IonicEnvironmentPlugins;
  session: ISession;
  readonly shell: IShell;
  readonly tasks: ITaskChain;
  readonly telemetry: ITelemetry;
  readonly namespace: IRootNamespace;

  private bottomBar?: inquirerType.ui.BottomBar;

  constructor({
    bottomBar,
    client,
    config,
    daemon,
    events,
    flags,
    hooks,
    log,
    meta,
    namespace,
    plugins,
    project,
    prompt,
    session,
    shell,
    tasks,
    telemetry,
  }: {
    bottomBar?: inquirerType.ui.BottomBar;
    client: IClient;
    config: IConfig; // CLI global config (~/.ionic/config.json)
    daemon: IDaemon;
    events: ICLIEventEmitter;
    flags: IonicEnvironmentFlags;
    hooks: IHookEngine;
    log: ILogger;
    meta: IonicEnvironmentMeta;
    namespace: IRootNamespace;
    plugins: IonicEnvironmentPlugins;
    project: IProject; // project config (ionic.config.json)
    prompt: PromptModule;
    session: ISession;
    shell: IShell;
    tasks: ITaskChain;
    telemetry: ITelemetry;
  }) {
    this.bottomBar = bottomBar;
    this.client = client;
    this.config = config;
    this.daemon = daemon;
    this.events = events;
    this.flags = flags;
    this.hooks = hooks;
    this.log = log;
    this.meta = meta;
    this.namespace = namespace;
    this.plugins = plugins;
    this.project = project;
    this.prompt = prompt;
    this.session = session;
    this.shell = shell;
    this.tasks = tasks;
    this.telemetry = telemetry;
  }

  load(p: any): any {
    return require(p);
  }

  async open() {
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
        console.error('EXCEPTION DURING BOTTOMBAR OUTPUT MUTE', e);
      }
    }

    this.log.stream = typeof this.bottomBar === 'undefined' ? process.stdout : this.bottomBar.log;
  }

  async close() {
    this.tasks.cleanup();

    // instantiating inquirer.ui.BottomBar hangs, so when close() is called,
    // we close BottomBar streams and replace the log stream with stdout.
    // This means inquirer shouldn't be used after command execution finishes
    // (which could happen during long-running processes like serve).
    if (this.bottomBar) {
      this.bottomBar.close();
      this.bottomBar = undefined;
      this.log.stream = process.stdout;
    }
  }

  async runcmd(pargv: string[], opts: { showExecution?: boolean; } = {}): Promise<void> {
    if (typeof opts.showExecution === 'undefined') {
      opts.showExecution = true;
    }

    if (opts.showExecution) {
      this.log.msg(`> ${chalk.green([this.namespace.name, ...pargv].map(a => a.includes(' ') ? `"${a}"` : a).join(' '))}`);
    }

    await this.namespace.runCommand(this, pargv);
  }
}
