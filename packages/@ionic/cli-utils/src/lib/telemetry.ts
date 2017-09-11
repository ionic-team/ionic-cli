import * as leekType from 'leek';

import { IProject, ITelemetry, InfoHookItem, IonicEnvironment } from '../definitions';
import { BACKEND_LEGACY, BACKEND_PRO } from './backends';
import { generateUUID } from './utils/uuid';

const GA_CODE = 'UA-44023830-30';

let _gaTracker: leekType | undefined;

export class Telemetry implements ITelemetry {
  public env: IonicEnvironment; // TODO: proper DI

  async resetToken() {
    const config = await this.env.config.load();
    config.tokens.telemetry = generateUUID();
  }

  async sendCommand(command: string, args: string[]): Promise<void> {
    const { CONTENT_TYPE_JSON, createRawRequest } = await import('./http');

    const port = await this.env.daemon.getPort();

    if (port) {
      const { req } = await createRawRequest('POST', `http://localhost:${port}/events/command`);
      req
        .set('Content-Type', CONTENT_TYPE_JSON)
        .set('Accept', CONTENT_TYPE_JSON)
        .send({ command, args, projectDir: this.env.project.directory });

      try {
        await req;
      } catch (e) {
        // TODO
      }
    } else {
      await sendCommand(this.env, this.env.project, command, args);
    }
  }
}

async function getLeek(env: IonicEnvironment): Promise<leekType> {
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
      version: env.plugins.ionic.meta.version,
      silent: config.telemetry !== true,
    });
  }

  return _gaTracker;
}

export async function sendCommand(env: IonicEnvironment, project: IProject, command: string, args: string[]) {
  const messageList: string[] = [];
  const name = 'command execution';
  const prettyArgs = args.map(a => a.includes(' ') ? `"${a}"` : a);
  const message = messageList.concat([command], prettyArgs).join(' ');

  await Promise.all([
    (async () => {
      const leek = await getLeek(env);
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

      const projectFile = env.project.directory ? await project.load() : undefined;

      if (projectFile) {
        appId = projectFile.app_id;
      }

      const now = new Date().toISOString();
      const isLoggedIn = await env.session.isLoggedIn();

      const { req } = await client.make('POST', `${config.urls.api !== 'https://api.ionic.io' ? 'https://api.ionicjs.com' : ''}/events/metrics`); // TODO: full URL is temporary

      const metric: { [key: string]: any; } = {
        'name': 'cli_command_metrics',
        'timestamp': now,
        'session_id': config.tokens.telemetry,
        'source': 'cli',
        'value': {
          'command': command,
          'arguments': prettyArgs.join(' '),
          'version': env.plugins.ionic.meta.version,
          'node_version': process.version,
          'app_id': appId,
          'user_id': config.backend === BACKEND_LEGACY ? config.user.id : undefined,
          'backend': config.backend,
        },
      };

      // We don't want to slow commands down terribly for people who opt-out of the daemon.
      if (config.daemon.updates) {
        const v: InfoHookItem[] = [];
        const info = await env.hooks.fire('info', { env, project });
        const flattenedInfo = info.reduce((acc, currentValue) => acc.concat(currentValue), v);

        if (isLoggedIn && config.backend === BACKEND_PRO) {
          const token = await env.session.getUserToken();
          req.set('Authorization', `Bearer ${token}`);
        }

        const frameworkInfo = flattenedInfo.find(item => item.name === 'Ionic Framework');
        const npmInfo = flattenedInfo.find(item => item.name === 'npm');
        const osInfo = flattenedInfo.find(item => item.name === 'OS');
        const xcodeInfo = flattenedInfo.find(item => item.name === 'Xcode');
        const androidSdkInfo = flattenedInfo.find(item => item.name === 'Android SDK Tools');
        const cordovaInfo = flattenedInfo.find(item => item.name === 'Cordova CLI');
        const cordovaPlatformsInfo = flattenedInfo.find(item => item.name === 'Cordova Platforms');
        const appScriptsInfo = flattenedInfo.find(item => item.name === '@ionic/app-scripts');

        if (frameworkInfo) {
          metric['value']['framework'] = frameworkInfo.version;
        }

        if (npmInfo) {
          metric['value']['npm_version'] = npmInfo.version;
        }

        if (osInfo) {
          metric['value']['os'] = osInfo.version;
        }

        if (xcodeInfo) {
          metric['value']['xcode_version'] = xcodeInfo.version;
        }

        if (androidSdkInfo) {
          metric['value']['android_sdk_version'] = androidSdkInfo.version;
        }

        if (cordovaInfo) {
          metric['value']['cordova_version'] = cordovaInfo.version;
        }

        if (cordovaPlatformsInfo) {
          metric['value']['cordova_platforms'] = cordovaPlatformsInfo.version;
        }

        if (appScriptsInfo) {
          metric['value']['app_scripts_version'] = appScriptsInfo.version;
        }
      }

      req.send({
        'metrics': [metric],
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
