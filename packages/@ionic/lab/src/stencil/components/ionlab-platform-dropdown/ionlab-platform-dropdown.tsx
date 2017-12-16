import { Component, State } from '@stencil/core';

@Component({
  tag: 'ionlab-platform-dropdown',
  styleUrl: 'ionlab-platform-dropdown.scss',
})
export class PlatformDropdown {
  @State() visible: boolean = false;

  render() {
    const dropdownClasses = ['dropdown-menu'];

    if (this.visible) {
      dropdownClasses.push('shown');
    }

    return (
      <div class="dropdown" onMouseOver={ () => this.visible = true } onMouseOut={ () => this.visible = false }>
        <button class="dropdown-toggle" type="button">
          Platforms
          <span class="dropdown-caret"></span>
        </button>
        <ul class={ dropdownClasses.join(' ') }>
          <li>
            <input type="checkbox" id="device-iphone" name="iphone" />
            <label htmlFor="device-iphone">iPhone</label>
          </li>
          <li>
            <input type="checkbox" id="device-android" name="android" />
            <label htmlFor="device-android">Android</label>
          </li>
          <li>
            <input type="checkbox" id="device-windows" name="windows" />
            <label htmlFor="device-windows">Windows</label>
          </li>
        </ul>
      </div>
    );
  }
}
