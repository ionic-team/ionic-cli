import { NamespaceGroup } from '@ionic/cli-framework';

import { CommandMap, Namespace } from '../../lib/namespace';

export class EnterpriseNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'enterprise',
      summary: 'Manage Ionic Enterprise features',
      description: `
Commands to help manage Ionic Enterprise[^enterprise-edition] subscriptions.
      `,
      footnotes: [
        {
          id: 'enterprise-edition',
          url: 'https://ionicframework.com/enterprise-edition',
          shortUrl: 'https://ion.link/enterprise',
        },
      ],
      groups: [NamespaceGroup.Paid],
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['register', async () => { const { RegisterCommand } = await import('./register'); return new RegisterCommand(this); }],
    ]);
  }
}
