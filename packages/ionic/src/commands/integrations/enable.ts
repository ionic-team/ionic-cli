import { BaseError, contains, validators } from '@ionic/cli-framework';
import chalk from 'chalk';
import * as path from 'path';

import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../definitions';
import { isIntegrationName } from '../../guards';
import { Command } from '../../lib/command';
import { FatalException } from '../../lib/errors';
import { INTEGRATION_NAMES } from '../../lib/integrations';

export class IntegrationsEnableCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'enable',
      type: 'project',
      summary: 'Add & enable integrations to your app',
      description: `
Integrations, such as Cordova, can be enabled with this command. If the integration has never been added to the project, ${chalk.green('ionic integrations enable')} will download and add the integration.

Integrations can be re-added with the ${chalk.green('--add')} option.
      `,
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
          name: 'root',
          summary: 'Specify an alternative destination to download into when adding',
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

    if (!this.project) {
      throw new FatalException(`Cannot run ${chalk.green('ionic integrations enable')} outside a project directory.`);
    }

    const root = options['root'] ? path.resolve(this.project.directory, String(options['root'])) : this.project.directory;

    if (!isIntegrationName(name)) {
      throw new FatalException(`Don't know about ${chalk.green(name)} integration!`);
    }

    const integration = await this.project.createIntegration(name);
    const integrationsConfig = this.project.config.get('integrations');
    const integrationConfig = integrationsConfig[name];

    try {
      if (!integrationConfig || add) {
        await integration.add({
          root,
          enableArgs: options['--'] ? options['--'] : undefined,
        }, {
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

        integrationsConfig[name] = {
          root: root !== this.project.directory ? path.relative(this.project.rootDirectory, root) : undefined,
        };

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

    this.project.config.set('integrations', integrationsConfig);
  }
}
