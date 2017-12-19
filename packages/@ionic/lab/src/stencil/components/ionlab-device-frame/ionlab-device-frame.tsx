import { Component, Prop, State } from '@stencil/core';

@Component({
  tag: 'ionlab-device-frame',
  styleUrl: 'ionlab-device-frame.scss',
})
export class DeviceFrame {
  @Prop() platform: string;
  @Prop() platformName: string;
  @Prop() url: string;
  @Prop() icon: string;
  @State() error: boolean = false;
  @State() loaded: boolean = false;

  interval: number;

  componentDidLoad() {
    this.interval = window.setInterval(() => {
      this.error = this.url ? false : true;
    }, 20000);
  }

  loadedHandler(event) {
    this.loaded = true;
    this.error = false;
    window.clearInterval(this.interval);
  }

  hostData() {
    return {
      id: `device-${this.platform}`,
    };
  }

  render() {
    return [
      <h2><i class={ ['icon', this.icon].join(' ') } />{ this.platformName }</h2>,
      <div class="frame-container">
        <div class="statusbar" />
        { !this.loaded && !this.error ? <sk-fading-circle /> : null }
        { this.error ? <div class="load-error"><h3>Load Timeout</h3><p>Still trying...</p></div> : null }
        <iframe src={ this.url } onLoad={ event => this.loadedHandler(event) } />
      </div>
    ];
  }
}
