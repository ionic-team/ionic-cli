import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

export class IntegrationsNamespace extends Namespace {
  name = 'integrations';
  description = 'Add or disable various integrations in your app';
  longDescription = `
Integrations, such as Cordova, can easily be enabled or disabled in your app with these commands.
`;

  commands = new CommandMap([
    ['enable', async () => { const { IntegrationsEnableCommand } = await import('./enable'); return new IntegrationsEnableCommand(); }],
    ['disable', async () => { const { IntegrationsDisableCommand } = await import('./disable'); return new IntegrationsDisableCommand(); }],
  ]);
}
