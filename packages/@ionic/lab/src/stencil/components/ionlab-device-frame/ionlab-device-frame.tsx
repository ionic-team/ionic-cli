import { Component, Prop, State, h } from '@stencil/core';

@Component({
  tag: 'ionlab-device-frame',
  styleUrl: 'ionlab-device-frame.css',
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
        <div class="statusbar">
         <svg class="statusbar-ios" viewBox="0 0 219 31">
            <path d="M0 1V0h219v1a5 5 0 0 0-5 5v3c0 12.15-9.85 22-22 22H27C14.85 31 5 21.15 5 9V6a5 5 0 0 0-5-5z" fill-rule="evenodd"/>
          </svg>
          <svg class="statusbar-md" viewBox="0 0 1384.3 40.3">
            <path class="st0" d="M1343 5l18.8 32.3c.8 1.3 2.7 1.3 3.5 0L1384 5c.8-1.3-.2-3-1.7-3h-37.6c-1.5 0-2.5 1.7-1.7 3z"/>
            <circle class="st0" cx="1299" cy="20.2" r="20"/>
            <path class="st0" d="M1213 1.2h30c2.2 0 4 1.8 4 4v30c0 2.2-1.8 4-4 4h-30c-2.2 0-4-1.8-4-4v-30c0-2.3 1.8-4 4-4zM16 4.2h64c8.8 0 16 7.2 16 16s-7.2 16-16 16H16c-8.8 0-16-7.2-16-16s7.2-16 16-16z"/>
          </svg>
        </div>
        { !this.loaded && !this.error ? <sk-fading-circle /> : null }
        { this.error ? <div class="load-error"><h3>Load Timeout</h3><p>Still trying...</p></div> : null }
        <iframe src={ this.url } onLoad={ event => this.loadedHandler(event) } allow="geolocation; microphone; camera; midi; encrypted-media"/>
      </div>
    ];
  }
}
