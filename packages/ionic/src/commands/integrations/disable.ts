import chalk from 'chalk';

import { contains, validators } from '@ionic/cli-framework/lib';
import { CommandData, CommandLineInputs, CommandLineOptions } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { INTEGRATIONS, disableIntegration } from '@ionic/cli-utils/lib/integrations';

export class IntegrationsDisableCommand extends Command {
  metadata: CommandData = {
    name: 'disable',
    type: 'project',
    description: 'Disable an integration',
    inputs: [
      {
        name: 'id',
        description: `The integration to disable (${INTEGRATIONS.map(i => chalk.green(i.name)).join(', ')})`,
        validators: [validators.required, contains(INTEGRATIONS.map(i => i.name), {})],
      }
    ],
  };

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ id ] = inputs;

    await disableIntegration(this.env, id);
  }
}
