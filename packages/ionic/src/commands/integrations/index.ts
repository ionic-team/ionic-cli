import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

export class IntegrationsNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'integrations',
      summary: 'Manage various integrations in your app',
      description: 'Integrations, such as Cordova, can be enabled or disabled in your app with these commands.',
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['enable', async () => { const { IntegrationsEnableCommand } = await import('./enable'); return new IntegrationsEnableCommand(this); }],
      ['disable', async () => { const { IntegrationsDisableCommand } = await import('./disable'); return new IntegrationsDisableCommand(this); }],
      ['list', async () => { const { IntegrationsListCommand } = await import('./list'); return new IntegrationsListCommand(this); }],
      ['ls', 'list'],
    ]);
  }
}
