import { Command as BaseCommand, BaseConfig } from '@ionic/cli';

import { CloudConfig } from './config';

export class Command extends BaseCommand {
  public config: CloudConfig;

  async load(): Promise<void> {
    this.config = new CloudConfig('config-cloud.json');
  }

  async unload(): Promise<void> {
    await this.config.save();
  }
}
