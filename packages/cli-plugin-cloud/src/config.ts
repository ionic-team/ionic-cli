import { BaseConfig } from '@ionic/cli-utils';

import { CloudConfigFile } from './definitions';

export class CloudConfig extends BaseConfig<CloudConfigFile> {
  provideDefaults(o: { [key: string]: any }): any {
    let results = { ...o };

    if (!results['git']) {
      results['git'] = {};
    }

    if (!results['git']['host']) {
      results['git']['host'] = 'git.ionic.io';
    }

    return results;
  }

  is<CloudConfigFile>(j: { [key: string]: any }): j is CloudConfigFile {
    return typeof j['git'] === 'object' && typeof j['git']['host'] === 'string';
  }
}
