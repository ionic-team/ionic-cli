import { Component, Prop } from '@stencil/core';

import { PLATFORM_IOS, platformIoniconClass, platformPrettyName } from '../../utils';

@Component({
  tag: 'ionlab-preview',
  styleUrl: 'ionlab-preview.scss',
})
export class Preview {
  @Prop() activeDevices: string[];
  @Prop() url: string;

  deviceActive(device: string) {
    return this.activeDevices.indexOf(device) >= 0;
  }

  platformUrl(platform: string) {
    const qp = { ionicplatform: platform };

    if (platform === PLATFORM_IOS) {
      qp['ionicstatusbarpadding'] = 'true';
    }

    return `${this.url}?${Object.keys(qp).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(qp[k])}`).join('&')}`;
  }

  renderDeviceFrame(platform: string) {
    return (
      <div class="device" id={ `device-${platform}` }>
        <h2><i class={ ['icon', platformIoniconClass(platform)].join(' ') } />{ platformPrettyName(platform) }</h2>
        <div class="device-frame">
          <div class="statusbar" />
          <iframe src={ this.platformUrl(platform) } />
        </div>
      </div>
    );
  }

  render() {
    return this.activeDevices.map(device => this.renderDeviceFrame(device));
  }
}
