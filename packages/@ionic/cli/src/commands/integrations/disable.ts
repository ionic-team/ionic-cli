import { BaseError, contains, validators } from '@ionic/cli-framework';

import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../definitions';
import { isIntegrationName } from '../../guards';
import { input } from '../../lib/color';
import { Command } from '../../lib/command';
import { FatalException } from '../../lib/errors';
import { INTEGRATION_NAMES } from '../../lib/integrations';

export class IntegrationsDisableCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'disable',
      type: 'project',
      summary: 'Disable an integration',
      description: `
Integrations, such as Cordova, can be disabled with this command.
      `,
      inputs: [
        {
          name: 'name',
          summary: `The integration to disable (e.g. ${INTEGRATION_NAMES.map(i => input(i)).join(', ')})`,
          validators: [validators.required, contains(INTEGRATION_NAMES, {})],
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ name ] = inputs;

    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic integrations disable')} outside a project directory.`);
    }

    if (!isIntegrationName(name)) {
      throw new FatalException(`Don't know about ${input(name)} integration!`);
    }

    const integration = await this.project.createIntegration(name);

    try {
      if (!integration.isAdded() || !integration.isEnabled()) {
        this.env.log.info(`Integration ${input(name)} already disabled.`);
      } else {
        await integration.disable();
        this.env.log.ok(`Integration ${input(name)} disabled!`);
      }
    } catch (e) {
      if (e instanceof BaseError) {
        throw new FatalException(e.message);
      }

      throw e;
    }
  }
}
