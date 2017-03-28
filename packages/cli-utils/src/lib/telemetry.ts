import * as leek from 'leek';

import { ITelemetry, IConfig, ConfigFile } from '../definitions';
import { load } from './modules';

const GA_CODE = 'UA-44023830-30';

export class Telemetry implements ITelemetry {
  private tracker: leek;

  constructor(
    protected config: IConfig<ConfigFile>,
    protected cliInfo: { [key: string]: any }
  ) {}

  private generateUniqueToken() {
    const uuid = load('uuid');
    return uuid.v4().toString();
  }

  private async setupTracker() {
    const configFile = await this.config.load();
    if (!configFile.tokens.telemetry) {
      configFile.tokens.telemetry = this.generateUniqueToken();
    }
    const Leek = load('leek');
    this.tracker = new Leek({
      name:         configFile.tokens.telemetry,
      trackingCode: GA_CODE,
      globalName:   this.cliInfo['name'],
      version:      this.cliInfo['version'],
      silent:       configFile.cliFlags.enableTelemetry !== true
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
