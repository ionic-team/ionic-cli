import { Component, Listen, State } from '@stencil/core';

@Component({
  tag: 'ionlab-app',
  styleUrl: 'ionlab-app.scss',
})
export class App {
  @State() sidebarVisible: boolean = true;
  @State() iPhoneActive: boolean = true;
  @State() androidActive: boolean = true;
  @State() windowsActive: boolean = false;

  appName = 'MyApp';
  appVersion = 'v0.0.1';

  @Listen('ionlabSidebarCloseClicked')
  sidebarCloseClickedHander(event) {
    this.sidebarVisible = false;
  }

  @Listen('ionlabPlatformIPhoneToggled')
  ionlabPlatformIPhoneToggledHandler(event) {
    this.iPhoneActive = !this.iPhoneActive;
  }

  @Listen('ionlabPlatformAndroidToggled')
  ionlabPlatformAndroidToggledHandler(event) {
    this.androidActive = !this.androidActive;
  }

  @Listen('ionlabPlatformWindowsToggled')
  ionlabPlatformWindowsToggledHandler(event) {
    this.windowsActive = !this.windowsActive;
  }

  render() {
    return (
      <div>
        <header>
          <div id="header-left">
            <i class="menu-icon icon ion-navicon-round" onClick={ () => this.sidebarVisible = !this.sidebarVisible } />
            <div id="logo"></div>
          </div>
          <div id="header-right">
            <button type="button">
              Open fullscreen
              <i class="fullscreen-icon icon ion-share" />
            </button>
            <ionlab-platform-dropdown
              iPhoneActive={ this.iPhoneActive }
              androidActive={ this.androidActive }
              windowsActive={ this.windowsActive } />
          </div>
        </header>
        <main>
          <ionlab-sidebar visible={ this.sidebarVisible } />
          <div id="preview">
          </div>
        </main>
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
      </div>
    );
  }
}
