import { Command as BaseCommand } from '@ionic/cli-utils';

import { CloudConfig } from './config';

export class Command extends BaseCommand {
  public config: CloudConfig;

  async load(): Promise<void> {
    this.config = new CloudConfig(this.env.config.directory, 'config-cloud.json');
  }

  async unload(): Promise<void> {
    await this.config.save();
  }
}
