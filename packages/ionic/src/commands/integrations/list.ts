import chalk from 'chalk';

import { columnar } from '@ionic/cli-framework/utils/format';
import { CommandLineInputs, CommandLineOptions, CommandMetadata, IntegrationName } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { INTEGRATION_NAMES } from '@ionic/cli-utils/lib/integrations';

export class IntegrationsListCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'list',
      type: 'project',
      summary: 'List available and active integrations in your app',
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const p = await this.env.project.load();
    const integrations = await Promise.all(INTEGRATION_NAMES.map(async name => this.env.project.createIntegration(name)));

    const status = (name: IntegrationName) => {
      const c = p.integrations[name];

      if (c) {
        if (c.enabled === false) {
          return chalk.dim.red('disabled');
        }

        return chalk.green('enabled');
      }

      return chalk.dim('not added');
    };

    this.env.log.msg(columnar(integrations.map(i => [chalk.bold(i.name), i.summary, status(i.name)]), { headers: ['name', 'summary', 'status'] }));
  }
}
