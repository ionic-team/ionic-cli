import * as leekType from 'leek';

import { ConfigFile, IConfig, ITelemetry } from '../definitions';
import { load } from './modules';
import { generateUUID } from './uuid';

const GA_CODE = 'UA-44023830-30';

export class Telemetry implements ITelemetry {
  tracker: leekType;

  constructor(
    protected config: IConfig<ConfigFile>,
    protected cliVersion: string
  ) {}

  async setupTracker() {
    const Leek = load('leek'); // TODO: typescript bug? can't await import
    const config = await this.config.load();

    if (!config.tokens.telemetry) {
      config.tokens.telemetry = generateUUID();
    }

    this.tracker = new Leek({
      name: config.tokens.telemetry,
      trackingCode: GA_CODE,
      globalName: 'ionic',
      version: this.cliVersion,
      silent: config.telemetry !== true,
    });
  }

  async sendCommand(command: string, args: string[]): Promise<void> {
    if (!this.tracker) {
      await this.setupTracker();
    }
    let messageList: string[] = [];
    const name = 'command execution';
    const message = messageList.concat([command], args).join(' ');

    await this.tracker.track({
      name,
      message
    });
  }

  async sendError(error: any, type: string): Promise<void> {
    await this.tracker.trackError({
      description: error.message + ' ' + error.stack,
      isFatal: true
    });
  }
}
