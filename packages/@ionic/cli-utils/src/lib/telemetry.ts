import * as leekType from 'leek';
import * as Debug from 'debug';

import { CLIMeta, IClient, IConfig, IHookEngine, IProject, ISession, ITelemetry, InfoHookItem, LoadedPlugin } from '../definitions';
import { generateUUID } from './utils/uuid';
import { sendMessage } from './helper';

const debug = Debug('ionic:cli-utils:lib:telemetry');
const GA_CODE = 'UA-44023830-30';
let _gaTracker: leekType | undefined;

export interface TelemetryDeps {
  cli: LoadedPlugin;
  client: IClient;
  config: IConfig;
  hooks: IHookEngine;
  meta: CLIMeta;
  project: IProject;
  session: ISession;
}

export class Telemetry implements ITelemetry {
  protected cli: LoadedPlugin;
  protected client: IClient;
  protected config: IConfig;
  protected hooks: IHookEngine;
  protected meta: CLIMeta;
  protected project: IProject;
  protected session: ISession;

  constructor({ cli, config, client, hooks, meta, project, session }: TelemetryDeps) {
    this.cli = cli;
    this.client = client;
    this.config = config;
    this.hooks = hooks;
    this.meta = meta;
    this.project = project;
    this.session = session;
  }

  async resetToken() {
    const config = await this.config.load();
    config.tokens.telemetry = generateUUID();
  }

  async sendCommand(command: string, args: string[]): Promise<void> {
    const config = await this.config.load();

    if (config.telemetry) {
      await sendMessage({ meta: this.meta, config: this.config }, { type: 'telemetry', data: { command, args } });
    }
  }
}

async function getLeek({ config, version }: { config: IConfig; version: string; }): Promise<leekType> {
  if (!_gaTracker) {
    const Leek = await import('leek');
    const c = await config.load();

    if (!c.tokens.telemetry) {
      c.tokens.telemetry = generateUUID();
    }

    _gaTracker = new Leek({
      name: c.tokens.telemetry,
      trackingCode: GA_CODE,
      globalName: 'ionic',
      version,
      silent: c.telemetry !== true,
    });
  }

  return _gaTracker;
}

export async function sendCommand({ cli, config, client, hooks, session, project }: TelemetryDeps, command: string, args: string[]) {
  const messageList: string[] = [];
  const name = 'command execution';
  const prettyArgs = args.map(a => a.includes(' ') ? `"${a}"` : a);
  const message = messageList.concat([command], prettyArgs).join(' ');

  await Promise.all([
    (async () => {
      const leek = await getLeek({ config, version: cli.meta.pkg.version });
      try {
        await leek.track({ name, message });
      } catch (e) {
        debug('leek track error', e);
      }
    })(),
    (async () => {
      const c = await config.load();
      const now = new Date().toISOString();

      let appId: string | undefined;

      const p = project.directory ? await project.load() : undefined;

      if (p) {
        appId = p.app_id;
      }

      const { req } = await client.make('POST', '/events/metrics');

      const metric: { [key: string]: any; } = {
        'name': 'cli_command_metrics',
        'timestamp': now,
        'session_id': c.tokens.telemetry,
        'source': 'cli',
        'value': {
          'command': command,
          'arguments': prettyArgs.join(' '),
          'version': cli.meta.pkg.version,
          'node_version': process.version,
          'app_id': appId,
          'backend': 'pro', // TODO: is this necessary?
        },
      };

      const isLoggedIn = await session.isLoggedIn();
      const v: InfoHookItem[] = [];
      const info = await hooks.fire('info');
      const flattenedInfo = info.reduce((acc, currentValue) => acc.concat(currentValue), v);

      if (isLoggedIn) {
        const token = await session.getUserToken();
        req.set('Authorization', `Bearer ${token}`);
      }

      const frameworkInfo = flattenedInfo.find(item => item.key === 'Ionic Framework');
      const npmInfo = flattenedInfo.find(item => item.key === 'npm');
      const osInfo = flattenedInfo.find(item => item.key === 'OS');
      const xcodeInfo = flattenedInfo.find(item => item.key === 'Xcode');
      const androidSdkInfo = flattenedInfo.find(item => item.key === 'Android SDK Tools');
      const cordovaInfo = flattenedInfo.find(item => item.key === 'Cordova CLI');
      const cordovaPlatformsInfo = flattenedInfo.find(item => item.key === 'Cordova Platforms');
      const appScriptsInfo = flattenedInfo.find(item => item.key === '@ionic/app-scripts');

      if (frameworkInfo) {
        metric['value']['framework'] = frameworkInfo.value;
      }

      if (npmInfo) {
        metric['value']['npm_version'] = npmInfo.value;
      }

      if (osInfo) {
        metric['value']['os'] = osInfo.value;
      }

      if (xcodeInfo) {
        metric['value']['xcode_version'] = xcodeInfo.value;
      }

      if (androidSdkInfo) {
        metric['value']['android_sdk_version'] = androidSdkInfo.value;
      }

      if (cordovaInfo) {
        metric['value']['cordova_version'] = cordovaInfo.value;
      }

      if (cordovaPlatformsInfo) {
        metric['value']['cordova_platforms'] = cordovaPlatformsInfo.value;
      }

      if (appScriptsInfo) {
        metric['value']['app_scripts_version'] = appScriptsInfo.value;
      }

      debug('metric: %o', metric);

      req.send({
        'metrics': [metric],
        'sent_at': now,
      });

      try {
        await client.do(req);
      } catch (e) {
        debug('metric send error', e);
      }
    })(),
  ]);
}
