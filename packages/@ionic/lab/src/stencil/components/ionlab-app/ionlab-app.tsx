import { Component } from '@stencil/core';

@Component({
  tag: 'ionlab-app',
  styleUrl: 'ionlab-app.scss',
})
export class App {
  render() {
    return (
      <div>
        <header>
          <div id="header-left">
            <i class="menu-icon icon ion-navicon-round"></i>
            <div id="logo"></div>
          </div>
          <div id="header-right">
            <button type="button">
              Open fullscreen
              <i class="fullscreen-icon icon ion-share"></i>
            </button>
            <ionlab-platform-dropdown />
          </div>
        </header>
        <main></main>
        <footer></footer>
      </div>
    );
  }
}
