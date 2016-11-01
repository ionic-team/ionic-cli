import { BaseConfig } from '@ionic/cli';

import { CloudConfigFile } from './definitions';

export class CloudConfig extends BaseConfig<CloudConfigFile> {
  provideDefaults(o: { [key: string]: any }): void {
    if (!o['git']) {
      o['git'] = {};
    }

    if (!o['git']['host']) {
      o['git']['host'] = 'git.ionic.io';
    }
  }

  is<CloudConfigFile>(j: { [key: string]: any }): j is CloudConfigFile {
    return typeof j['git'] === 'object' && typeof j['git']['host'] === 'string';
  }
}
