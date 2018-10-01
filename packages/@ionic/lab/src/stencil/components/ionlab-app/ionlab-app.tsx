import { Component, Listen, State } from '@stencil/core';

import { PLATFORM_IOS, PLATFORM_ANDROID } from '../../utils';

@Component({
  tag: 'ionlab-app',
})
export class App {
  @State() sidebarVisible: boolean = true;
  @State() activeDevices: string[] = [PLATFORM_IOS, PLATFORM_ANDROID];
  @State() details: { url?: string; name?: string; version?: string; projectType?: string; } = {};
  session: string;

  componentWillLoad() {
    this.loadAppDetails();
    this.loadLocalStorageState();
  }

  componentWillUpdate() {
    this.saveLocalStorageState();
  }

  loadAppDetails() {
    const self = this;
    const req = new XMLHttpRequest();

    req.addEventListener('load', function() {
      try {
        self.details = JSON.parse(this.responseText);
      } catch (e) {
        console.error('Error loading app details from Ionic Lab API!');
        console.error('Response was:', this.responseText);
      }
    });

    req.addEventListener('error', (err) => {
      console.error('Error loading app details from Ionic Lab API!');
      console.error('Error was:', err);
    });

    req.open('GET', '/api/app');
    req.send();
  }

  loadLocalStorageState() {
    const storedPlatforms = localStorage.getItem('ionic-lab-platforms');

    if (storedPlatforms) {
      this.activeDevices = JSON.parse(storedPlatforms);
    }

    const storedSidebarOpen = localStorage.getItem('ionic-lab-sidebar-open');

    if (storedSidebarOpen) {
      this.sidebarVisible = JSON.parse(storedSidebarOpen);
    }
  }

  saveLocalStorageState() {
    localStorage.setItem('ionic-lab-platforms', JSON.stringify(this.activeDevices));
    localStorage.setItem('ionic-lab-sidebar-open', JSON.stringify(this.sidebarVisible));
  }

  @Listen('ionlabSidebarCloseClicked')
  sidebarCloseClickedHander(event) {
    this.sidebarVisible = false;
  }

  @Listen('ionlabPlatformToggled')
  ionlabPlatformToggledHandler(event) {
    this.togglePlatform(event.detail);
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

  render() {
    return [
      <header>
        <div id="header-left">
          <i class="menu-icon icon ion-navicon-round" onClick={ () => this.sidebarVisible = !this.sidebarVisible } />
          <div id="logo"></div>
        </div>
        <div id="header-right">
          <a href={ this.details.url }>
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
        <ionlab-preview projectType={ this.details.projectType } url={ this.details.url } activeDevices={ this.activeDevices } />
      </main>,
      <footer>
        <div id="footer-left">
          <div id="app-info">
            { [this.details.name, this.details.version].filter(n => n).join(' - ') }
          </div>
        </div>
        <div id="footer-right">
          <a href="https://twitter.com/ionicframework">Twitter</a>
          <a href="https://ionicframework.com/docs">Documentation</a>
          <a href="https://forum.ionicframework.com/">Forum</a>
          <a href="https://github.com/ionic-team/ionic">GitHub</a>
        </div>
      </footer>
    ];
  }
}
