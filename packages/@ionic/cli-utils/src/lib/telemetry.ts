import * as leekType from 'leek';

import { IClient, IConfig, IProject, ISession, ITelemetry, RootPlugin } from '../definitions';
import { BACKEND_LEGACY, BACKEND_PRO } from './backends';
import { generateUUID } from './utils/uuid';

const GA_CODE = 'UA-44023830-30';

export class Telemetry implements ITelemetry {
  client: IClient;

  protected config: IConfig;
  protected plugin: RootPlugin;
  protected session: ISession;
  protected project: IProject;

  protected gaTracker: leekType;

  constructor({
    config,
    client,
    session,
    plugin,
    project
  }: {
    config: IConfig;
    client: IClient;
    session: ISession;
    plugin: RootPlugin;
    project: IProject;
  }) {
    this.config = config;
    this.plugin = plugin;
    this.client = client;
    this.session = session;
    this.project = project;
  }

  protected async setupGATracker() {
    const Leek = await import('leek');
    const config = await this.config.load();

    if (!config.tokens.telemetry) {
      config.tokens.telemetry = generateUUID();
    }

    this.gaTracker = new Leek({
      name: config.tokens.telemetry,
      trackingCode: GA_CODE,
      globalName: 'ionic',
      version: this.plugin.meta.version,
      silent: config.telemetry !== true,
    });
  }

  async resetToken() {
    const config = await this.config.load();
    config.tokens.telemetry = generateUUID();
  }

  async sendCommand(command: string, args: string[]): Promise<void> {
    const { Client } = await import('./http');

    if (!this.gaTracker) {
      await this.setupGATracker();
    }

    const messageList: string[] = [];
    const name = 'command execution';
    const prettyArgs = args.map(a => a.includes(' ') ? `"${a}"` : a);
    const message = messageList.concat([command], prettyArgs).join(' ');

    await Promise.all([
      (async () => {
        await this.gaTracker.track({ name, message });
      })(),
      (async () => {
        const config = await this.config.load();
        const client = new Client(this.client.host);

        if (client.host === 'https://api.ionic.io') { // TODO: this is temporary
          client.host = 'https://api.ionicjs.com';
        }

        let appId: string | undefined;

        if (this.project.directory) {
          const project = await this.project.load();
          appId = project.app_id;
        }

        const now = new Date().toISOString();
        const isLoggedIn = await this.session.isLoggedIn();

        let req = client.make('POST', '/events/metrics');

        if (isLoggedIn && config.backend === BACKEND_PRO) {
          const token = await this.session.getUserToken();
          req = req.set('Authorization', `Bearer ${token}`);
        }

        req = req.send({
          'metrics': [
            {
              'name': 'cli_command_metrics',
              'timestamp': now,
              'session_id': config.tokens.telemetry,
              'source': 'cli',
              'value': {
                'command': command,
                'arguments': prettyArgs.join(' '),
                'version': this.plugin.meta.version,
                'node_version': process.version,
                'app_id': appId,
                'user_id': config.backend === BACKEND_LEGACY ? config.user.id : undefined,
                'backend': config.backend,
              },
            },
          ],
          'sent_at': now,
        });

        try {
          await client.do(req);
        } catch (e) {
          // TODO
        }
      })(),
    ]);
  }

  async sendError(error: any, type: string): Promise<void> {
    await this.gaTracker.trackError({
      description: error.message + ' ' + error.stack,
      isFatal: true,
    });
  }
}
