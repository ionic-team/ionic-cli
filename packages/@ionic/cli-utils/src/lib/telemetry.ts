import * as leekType from 'leek';

import { IClient, IConfig, IDaemon, IProject, ISession, ITelemetry, IonicEnvironment, RootPlugin } from '../definitions';
import { BACKEND_LEGACY, BACKEND_PRO } from './backends';
import { generateUUID } from './utils/uuid';

const GA_CODE = 'UA-44023830-30';

let _gaTracker: leekType | undefined;

export class Telemetry implements ITelemetry {
  client: IClient;

  protected config: IConfig;
  protected daemon: IDaemon;
  protected plugin: RootPlugin;
  protected session: ISession;
  protected project: IProject;

  constructor({
    config,
    client,
    daemon,
    session,
    plugin,
    project
  }: {
    config: IConfig;
    client: IClient;
    daemon: IDaemon;
    session: ISession;
    plugin: RootPlugin;
    project: IProject;
  }) {
    this.client = client;
    this.config = config;
    this.daemon = daemon;
    this.plugin = plugin;
    this.project = project;
    this.session = session;
  }

  async resetToken() {
    const config = await this.config.load();
    config.tokens.telemetry = generateUUID();
  }

  async sendCommand(command: string, args: string[]): Promise<void> {
    const { CONTENT_TYPE_JSON, createRawRequest } = await import('./http');

    const port = await this.daemon.getPort();

    if (port) {
      const { req } = await createRawRequest('POST', `http://localhost:${port}/events/command`);
      req
        .set('Content-Type', CONTENT_TYPE_JSON)
        .set('Accept', CONTENT_TYPE_JSON)
        .send({ command, args });

      try {
        await req;
      } catch (e) {
        // TODO
      }
    } else {
      await sendCommand({ config: this.config, project: this.project, session: this.session }, { version: this.plugin.meta.version }, command, args);
    }
  }
}

async function getLeek(env: Pick<IonicEnvironment, 'config'>, meta: { version: string }): Promise<leekType> {
  if (!_gaTracker) {
    const Leek = await import('leek');
    const config = await env.config.load();

    if (!config.tokens.telemetry) {
      config.tokens.telemetry = generateUUID();
    }

    _gaTracker = new Leek({
      name: config.tokens.telemetry,
      trackingCode: GA_CODE,
      globalName: 'ionic',
      version: meta.version,
      silent: config.telemetry !== true,
    });
  }

  return _gaTracker;
}

export async function sendCommand(env: Pick<IonicEnvironment, 'config' | 'project' | 'session'>, meta: { version: string; }, command: string, args: string[]) {
  const messageList: string[] = [];
  const name = 'command execution';
  const prettyArgs = args.map(a => a.includes(' ') ? `"${a}"` : a);
  const message = messageList.concat([command], prettyArgs).join(' ');

  await Promise.all([
    (async () => {
      const leek = await getLeek(env, meta);
      try {
        await leek.track({ name, message });
      } catch (e) {
        // TODO
      }
    })(),
    (async () => {
      const { Client } = await import('./http');

      const config = await env.config.load();
      const client = new Client(env.config);

      let appId: string | undefined;

      if (env.project.directory) {
        const project = await env.project.load();
        appId = project.app_id;
      }

      const now = new Date().toISOString();
      const isLoggedIn = await env.session.isLoggedIn();

      const { req } = await client.make('POST', `${config.urls.api !== 'https://api.ionic.io' ? 'https://api.ionicjs.com' : ''}/events/metrics`); // TODO: full URL is temporary

      if (isLoggedIn && config.backend === BACKEND_PRO) {
        const token = await env.session.getUserToken();
        req.set('Authorization', `Bearer ${token}`);
      }

      req.send({
        'metrics': [
          {
            'name': 'cli_command_metrics',
            'timestamp': now,
            'session_id': config.tokens.telemetry,
            'source': 'cli',
            'value': {
              'command': command,
              'arguments': prettyArgs.join(' '),
              'version': meta.version,
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
