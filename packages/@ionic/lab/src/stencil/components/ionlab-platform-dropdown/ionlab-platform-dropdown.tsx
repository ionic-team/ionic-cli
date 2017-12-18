import { Component, Event, EventEmitter, State, Prop } from '@stencil/core';

@Component({
  tag: 'ionlab-platform-dropdown',
  styleUrl: 'ionlab-platform-dropdown.scss',
})
export class PlatformDropdown {
  @Prop() iPhoneActive: boolean;
  @Prop() androidActive: boolean;
  @Prop() windowsActive: boolean;
  @State() visible: boolean = false;
  @Event() ionlabPlatformIPhoneToggled: EventEmitter;
  @Event() ionlabPlatformAndroidToggled: EventEmitter;
  @Event() ionlabPlatformWindowsToggled: EventEmitter;

  render() {
    const dropdownClasses = ['dropdown-menu'];

    if (!this.visible) {
      dropdownClasses.push('hidden');
    }

    return (
      <div class="dropdown" onMouseOver={ () => this.visible = true } onMouseOut={ () => this.visible = false }>
        <button class="dropdown-toggle" type="button">
          Platforms
          <span class="dropdown-caret"></span>
        </button>
        <ul class={ dropdownClasses.join(' ') }>
          <li onClick={ () => this.ionlabPlatformIPhoneToggled.emit() }>
            <input type="checkbox" id="device-iphone" name="iphone" checked={ this.iPhoneActive } />
            <label>iPhone</label>
          </li>
          <li onClick={ () => this.ionlabPlatformAndroidToggled.emit() }>
            <input type="checkbox" id="device-android" name="android" checked={ this.androidActive } />
            <label>Android</label>
          </li>
          <li onClick={ () => this.ionlabPlatformWindowsToggled.emit() }>
            <input type="checkbox" id="device-windows" name="windows" checked={ this.windowsActive } />
            <label>Windows</label>
          </li>
        </ul>
      </div>
    );
  }
}
