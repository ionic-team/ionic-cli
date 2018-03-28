import { Component, Prop } from '@stencil/core';

import { PLATFORM_IOS, platformIoniconClass, platformPrettyName } from '../../utils';

@Component({
  tag: 'ionlab-preview',
  styleUrl: 'ionlab-preview.css',
})
export class Preview {
  @Prop() activeDevices: string[];
  @Prop() url?: string;

  platformUrl(platform: string) {
    if (!this.url) {
      return;
    }

    const qp = { ionicplatform: platform };

    if (platform === PLATFORM_IOS) {
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
