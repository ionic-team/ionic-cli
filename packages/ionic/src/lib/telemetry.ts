import * as Debug from 'debug';
import * as ζleek from 'leek';

import { IClient, IConfig, IProject, ISession, ITelemetry, InfoItem, IonicContext } from '../definitions';

import { sendMessage } from './helper';
import { generateUUID } from './utils/uuid';

const debug = Debug('ionic:lib:telemetry');
const GA_CODE = 'UA-44023830-30';
let _gaTracker: ζleek | undefined;

export interface TelemetryDeps {
  readonly client: IClient;
  readonly config: IConfig;
  readonly getInfo: () => Promise<InfoItem[]>;
  readonly ctx: IonicContext;
  readonly project?: IProject;
  readonly session: ISession;
}

export class Telemetry implements ITelemetry {
  protected readonly client: IClient;
  protected readonly config: IConfig;
  protected readonly getInfo: () => Promise<InfoItem[]>;
  protected readonly ctx: IonicContext;
  protected readonly project?: IProject;
  protected readonly session: ISession;

  constructor({ config, client, getInfo, ctx, project, session }: TelemetryDeps) {
    this.client = client;
    this.config = config;
    this.getInfo = getInfo;
    this.ctx = ctx;
    this.project = project;
    this.session = session;
  }

  async sendCommand(command: string, args: string[]): Promise<void> {
    debug('Sending telemetry for command: %O %O', command, args);
    await sendMessage({ config: this.config, ctx: this.ctx }, { type: 'telemetry', data: { command, args } });
  }
}

async function getLeek({ config, version }: { config: IConfig; version: string; }): Promise<ζleek> {
  if (!_gaTracker) {
    const Leek = await import('leek');
    let telemetryToken = config.get('tokens.telemetry');

    if (!telemetryToken) {
      telemetryToken = generateUUID();
      config.set('tokens.telemetry', telemetryToken);
      debug(`setting telemetry token to ${telemetryToken}`);
    }

    _gaTracker = new Leek({
      name: telemetryToken,
      trackingCode: GA_CODE,
      globalName: 'ionic',
      version,
      silent: !config.get('telemetry'),
    });
  }

  return _gaTracker;
}

export async function sendCommand({ config, client, getInfo, ctx, session, project }: TelemetryDeps, command: string, args: string[]) {
  const messageList: string[] = [];
  const name = 'command execution';
  const prettyArgs = args.map(a => a.includes(' ') ? `"${a}"` : a);
  const message = messageList.concat([command], prettyArgs).join(' ');

  await Promise.all([
    (async () => {
      const leek = await getLeek({ config, version: ctx.version });
      try {
        await leek.track({ name, message });
      } catch (e) {
        debug(`leek track error: ${e.stack ? e.stack : e}`);
      }
    })(),
    (async () => {
      const now = new Date().toISOString();
      const appflowId = project ? project.config.get('id') : undefined;

      const { req } = await client.make('POST', '/events/metrics');

      const metric: { [key: string]: any; } = {
        'name': 'cli_command_metrics',
        'timestamp': now,
        'session_id': config.get('tokens.telemetry'),
        'source': 'cli',
        'value': {
          'command': command,
          'arguments': prettyArgs.join(' '),
          'version': ctx.version,
          'node_version': process.version,
          'app_id': appflowId,
          'backend': 'pro', // TODO: is this necessary?
        },
      };

      const isLoggedIn = session.isLoggedIn();
      const info = await getInfo();

      if (isLoggedIn) {
        const token = session.getUserToken();
        req.set('Authorization', `Bearer ${token}`);
      }

      const frameworkInfo = info.find(item => item.key === 'Ionic Framework');
      const npmInfo = info.find(item => item.key === 'npm');
      const osInfo = info.find(item => item.key === 'OS');
      const xcodeInfo = info.find(item => item.key === 'Xcode');
      const androidSdkInfo = info.find(item => item.key === 'Android SDK Tools');
      const cordovaInfo = info.find(item => item.key === 'Cordova CLI');
      const cordovaPlatformsInfo = info.find(item => item.key === 'Cordova Platforms');
      const appScriptsInfo = info.find(item => item.key === '@ionic/app-scripts');

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
        debug(`metric send error: ${e.stack ? e.stack : e}`);
      }
    })(),
  ]);
}
