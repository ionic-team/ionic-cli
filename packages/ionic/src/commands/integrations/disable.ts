import chalk from 'chalk';

import { BaseError, contains, validators } from '@ionic/cli-framework';
import { CommandLineInputs, CommandLineOptions, CommandMetadata, isIntegrationName } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';
import { INTEGRATION_NAMES } from '@ionic/cli-utils/lib/integrations';

export class IntegrationsDisableCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'disable',
      type: 'project',
      summary: 'Disable an integration',
      inputs: [
        {
          name: 'name',
          summary: `The integration to disable (e.g. ${INTEGRATION_NAMES.map(i => chalk.green(i)).join(', ')})`,
          validators: [validators.required, contains(INTEGRATION_NAMES, {})],
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ name ] = inputs;

    if (!isIntegrationName(name)) {
      throw new FatalException(`Don't know about ${chalk.green(name)} integration!`);
    }

    const projectConfig = await this.env.project.load();
    const integration = await this.env.project.createIntegration(name);
    const integrationConfig = projectConfig.integrations[name];

    try {
      if (!integrationConfig || integrationConfig.enabled === false) {
        this.env.log.info(`Integration ${chalk.green(name)} already disabled.`);
      } else {
        await integration.disable();
        integrationConfig.enabled = false;
        this.env.log.ok(`Integration ${chalk.green(name)} disabled!`);
      }
    } catch (e) {
      if (e instanceof BaseError) {
        throw new FatalException(e.message);
      }

      throw e;
    }

    await this.env.project.save();
  }
}
