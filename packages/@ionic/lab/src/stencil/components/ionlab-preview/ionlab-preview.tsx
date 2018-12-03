import { Component, Prop } from '@stencil/core';

import { PLATFORM_IOS, platformIoniconClass, platformMode, platformPrettyName } from '../../utils';

@Component({
  tag: 'ionlab-preview',
  styleUrl: 'ionlab-preview.css',
})
export class Preview {
  @Prop() activeDevices: string[];
  @Prop() url?: string;
  @Prop() projectType?: string;

  platformUrl(platform: string) {
    if (!this.url) {
      return;
    }

    const qp = {};

    if (this.projectType === 'angular') {
      qp['ionic:mode'] = platformMode(platform);
      qp['ionic:persistConfig'] = 'true';
      qp['ionic:_forceStatusbarPadding'] = 'true';
    } else if (this.projectType === 'ionic-angular') {
      qp['ionicplatform'] = platform;
      qp['ionicstatusbarpadding'] = 'true';
    }

    return `${this.url}?${Object.keys(qp).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(qp[k])}`).join('&')}`;
  }

  render() {
    return (
      <div>
        {
          this.activeDevices.map(device => <ionlab-device-frame
            platform={ device }
            platformName={ platformPrettyName(device) }
            url={ this.platformUrl(device) }
            icon={ platformIoniconClass(device) } />
          )
        }
      </div>
    );
  }
}
