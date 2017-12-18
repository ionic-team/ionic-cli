import { Component, Listen, State } from '@stencil/core';

import { PLATFORM_IOS, PLATFORM_ANDROID } from '../../utils';

@Component({
  tag: 'ionlab-app',
  styleUrl: 'ionlab-app.scss',
})
export class App {
  @State() sidebarVisible: boolean = true;
  @State() activeDevices: string[] = [PLATFORM_IOS, PLATFORM_ANDROID];
  @State() url: string = 'http://localhost:8100';

  appName = 'MyApp';
  appVersion = 'v0.0.1';

  @Listen('ionlabSidebarCloseClicked')
  sidebarCloseClickedHander(event) {
    this.sidebarVisible = false;
  }

  togglePlatform(platform: string) {
    const idx = this.activeDevices.indexOf(platform);
    const devices = [...this.activeDevices];

    if (idx >= 0) {
      devices.splice(idx, 1);
    } else {
      devices.push(platform);
    }

    this.activeDevices = devices;
  }

  @Listen('ionlabPlatformToggled')
  ionlabPlatformWindowsToggledHandler(event) {
    this.togglePlatform(event.detail);
  }

  render() {
    return [
      <header>
        <div id="header-left">
          <i class="menu-icon icon ion-navicon-round" onClick={ () => this.sidebarVisible = !this.sidebarVisible } />
          <div id="logo"></div>
        </div>
        <div id="header-right">
          <a href={ this.url }>
            <button type="button">
              Open fullscreen
              <i class="fullscreen-icon icon ion-share" />
            </button>
          </a>
          <ionlab-platform-dropdown activePlatforms={ this.activeDevices } />
        </div>
      </header>,
      <main>
        <ionlab-sidebar visible={ this.sidebarVisible } />
        <ionlab-preview url={ this.url } activeDevices={ this.activeDevices } />
      </main>,
      <footer>
        <div id="footer-left">
          <div id="app-info">
            { this.appName } - { this.appVersion }
          </div>
        </div>
        <div id="footer-right">
          <a href="https://twitter.com/ionicframework">Twitter</a>
          <a href="https://ionicframework.com/docs">Documentation</a>
          <a href="https://forum.ionicframework.com/">Forum</a>
          <a href="https://github.com/ionic-team/ionic">GitHub</a>
          <a href="https://ionicframework.com/products/view">Ionic View</a>
        </div>
      </footer>
    ];
  }
}
