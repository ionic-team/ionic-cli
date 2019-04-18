import { BaseError, contains, validators } from '@ionic/cli-framework';
import * as path from 'path';

import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../definitions';
import { isIntegrationName } from '../../guards';
import { input } from '../../lib/color';
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
Integrations, such as Cordova, can be enabled with this command. If the integration has never been added to the project, ${input('ionic integrations enable')} will download and add the integration.

Integrations can be re-added with the ${input('--add')} option.
      `,
      inputs: [
        {
          name: 'name',
          summary: `The integration to enable (e.g. ${INTEGRATION_NAMES.map(i => input(i)).join(', ')})`,
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
          spec: { value: 'path' },
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
      throw new FatalException(`Cannot run ${input('ionic integrations enable')} outside a project directory.`);
    }

    const root = options['root'] ? path.resolve(this.project.directory, String(options['root'])) : this.project.directory;

    if (!isIntegrationName(name)) {
      throw new FatalException(`Don't know about ${input(name)} integration!`);
    }

    const integration = await this.project.createIntegration(name);

    try {
      if (!integration.isAdded() || add) {
        await integration.add({
          root,
          enableArgs: options['--'] ? options['--'] : undefined,
          quiet: Boolean(quiet),
          env: this.env,
        });

        this.env.log.ok(`Integration ${input(integration.name)} added!`);
      } else {
        const wasEnabled = integration.config.get('enabled') !== false;

        // We still need to run this whenever this command is run to make sure
        // everything is good with the integration.
        await integration.enable();

        if (wasEnabled) {
          this.env.log.info(`Integration ${input(integration.name)} already enabled.`);
        } else {
          this.env.log.ok(`Integration ${input(integration.name)} enabled!`);
        }
      }
    } catch (e) {
      if (e instanceof BaseError) {
        throw new FatalException(e.message);
      }

      throw e;
    }
  }
}
