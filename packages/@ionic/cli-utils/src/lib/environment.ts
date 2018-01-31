import chalk from 'chalk';

import * as inquirerType from 'inquirer';

import {
  CLIMeta,
  IClient,
  IConfig,
  ILogger,
  IProject,
  IRootNamespace,
  ISession,
  IShell,
  ITaskChain,
  ITelemetry,
  InfoItem,
  IonicEnvironment,
  IonicEnvironmentFlags,
  IonicEnvironmentPlugins,
  PromptModule,
} from '../definitions';

export class Environment implements IonicEnvironment {
  readonly flags: IonicEnvironmentFlags;
  readonly client: IClient;
  readonly config: IConfig; // CLI global config (~/.ionic/config.json)
  getInfo: () => Promise<InfoItem[]>;
  readonly log: ILogger;
  readonly prompt: PromptModule;
  readonly meta: CLIMeta;
  project: IProject; // project config (ionic.config.json)
  readonly plugins: IonicEnvironmentPlugins;
  session: ISession;
  readonly shell: IShell;
  readonly tasks: ITaskChain;
  readonly telemetry: ITelemetry;
  readonly namespace: IRootNamespace;
  keepopen = false;

  private bottomBar?: inquirerType.ui.BottomBar;
  private env: { [key: string]: string; }; // TODO: necessary?

  constructor({
    bottomBar,
    client,
    config,
    env,
    flags,
    getInfo,
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
    env: { [key: string]: string; },
    flags: IonicEnvironmentFlags;
    getInfo: () => Promise<InfoItem[]>;
    log: ILogger;
    meta: CLIMeta;
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
    this.env = env;
    this.flags = flags;
    this.getInfo = getInfo;
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
    }
  }

  async runCommand(pargv: string[], { showExecution = true }: { showExecution?: boolean; } = {}): Promise<void> {
    if (showExecution) {
      const metadata = await this.namespace.getMetadata();
      this.log.rawmsg(`> ${chalk.green([metadata.name, ...pargv].map(a => a.includes(' ') ? `"${a}"` : a).join(' '))}`);
    }

    await this.namespace.runCommand(pargv, this.env); // TODO
  }
}
