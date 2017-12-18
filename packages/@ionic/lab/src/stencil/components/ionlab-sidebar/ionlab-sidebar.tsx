import { Component, Event, EventEmitter, Prop } from '@stencil/core';

@Component({
  tag: 'ionlab-sidebar',
  styleUrl: 'ionlab-sidebar.scss',
})
export class Sidebar {
  @Prop() visible: boolean;
  @Event() ionlabSidebarCloseClicked: EventEmitter;

  hostData() {
    const classes = [];

    if (!this.visible) {
      classes.push('hidden');
    }

    return {
      class: classes.join(' '),
    };
  }

  render() {
    return (
      <div id="sidebar">
        <h3>
          Quick reference
          <i class="icon ion-close-circled" onClick={ () => this.ionlabSidebarCloseClicked.emit() } />
        </h3>
        <ul class="menu">
          <li><a href="https://ionicframework.com/docs/components">Components</a></li>
          <li><a href="https://ionicframework.com/docs/api">API Reference</a></li>
          <li><a href="https://ionicframework.com/docs/native">Ionic Native</a></li>
          <li><a href="https://ionicframework.com/docs/">All Documentation</a></li>
        </ul>
      </div>
    )
  }
}
