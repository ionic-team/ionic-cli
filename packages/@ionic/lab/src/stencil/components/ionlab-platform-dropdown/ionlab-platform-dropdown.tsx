import { Component, Event, EventEmitter, State, Prop } from '@stencil/core';

import { AVAILABLE_PLATFORMS, platformPrettyName } from '../../utils';

@Component({
  tag: 'ionlab-platform-dropdown',
  styleUrl: 'ionlab-platform-dropdown.scss',
})
export class PlatformDropdown {
  @Prop() activePlatforms: string[];
  @State() visible: boolean = false;
  @Event() ionlabPlatformToggled: EventEmitter;

  platformActive(platform: string) {
    return this.activePlatforms.indexOf(platform) >= 0;
  }

  renderPlatformCheckbox(platform: string) {
    return (
      <li onClick={ () => this.ionlabPlatformToggled.emit(platform) }>
        <input type="checkbox" name={ platform } checked={ this.platformActive(platform) } />
        <label>{ platformPrettyName(platform) }</label>
      </li>
    );
  }

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
          { AVAILABLE_PLATFORMS.map(platform => this.renderPlatformCheckbox(platform)) }
        </ul>
      </div>
    );
  }
}
