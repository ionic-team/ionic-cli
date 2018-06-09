import * as path from 'path';

import chalk from 'chalk';

import { BaseError, contains, validators } from '@ionic/cli-framework';
import { CommandLineInputs, CommandLineOptions, CommandMetadata, isIntegrationName } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';
import { INTEGRATION_NAMES } from '@ionic/cli-utils/lib/integrations';
import { ProjectIntegration } from '@ionic/cli-utils/src/definitions';

export class IntegrationsEnableCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'enable',
      type: 'project',
      summary: 'Add various integrations to your app',
      inputs: [
        {
          name: 'name',
          summary: `The integration to enable (e.g. ${INTEGRATION_NAMES.map(i => chalk.green(i)).join(', ')})`,
          validators: [validators.required, contains(INTEGRATION_NAMES, {})],
        },
      ],
      options: [
        {
          name: 'add',
          summary: 'Download and add the integration even if enabled',
          type: Boolean,
        },
        {
          name: 'quiet',
          summary: 'Do not log file operations',
          type: Boolean,
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ name ] = inputs;
    const { add, quiet } = options;

    if (!isIntegrationName(name)) {
      throw new FatalException(`Don't know about ${chalk.green(name)} integration!`);
    }

    const projectConfig = await this.env.project.load();
    const integration = await this.env.project.createIntegration(name);
    const integrationConfig = projectConfig.integrations[name];

    try {
      if (!integrationConfig || add) {
        await integration.add({
          conflictHandler: async (f, stats) => {
            const isDirectory = stats.isDirectory();
            const filename = `${path.basename(f)}${isDirectory ? '/' : ''}`;
            const type = isDirectory ? 'directory' : 'file';

            const confirm = await this.env.prompt({
              type: 'confirm',
              name: 'confirm',
              message: `The ${chalk.cyan(filename)} ${type} exists in project. Overwrite?`,
              default: false,
            });

            return confirm;
          },
          onFileCreate: f => {
            if (!quiet) {
              this.env.log.msg(`${chalk.green('CREATE')} ${f}`);
            }
          },
        });

        projectConfig.integrations[name] = {} as ProjectIntegration;
        this.env.log.ok(`Integration ${chalk.green(integration.name)} added!`);
      } else {
        const wasEnabled = integrationConfig.enabled !== false;

        // We still need to run this whenever this command is run to make sure
        // everything is good with the integration.
        await integration.enable();
        delete integrationConfig.enabled;

        if (wasEnabled) {
          this.env.log.info(`Integration ${chalk.green(integration.name)} enabled.`);
        } else {
          this.env.log.ok(`Integration ${chalk.green(integration.name)} enabled!`);
        }
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
