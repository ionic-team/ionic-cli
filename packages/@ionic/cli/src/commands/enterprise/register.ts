import { MetadataGroup } from '@ionic/cli-framework';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../definitions';
import { input } from '../../lib/color';
import { Command } from '../../lib/command';
import { FatalException } from '../../lib/errors';
import { runCommand } from '../../lib/executor';

export class RegisterCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'register',
      type: 'project',
      groups: [MetadataGroup.PAID],
      summary: 'Register your Product Key with this app',
      options: [
        {
          name: 'app-id',
          summary: 'The Ionic App ID',
          spec: {
            value: 'id',
          },
        },
        {
          name: 'key',
          summary: 'The Product Key',
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic enterprise register')} outside a project directory.`);
    }

    const appId = options['app-id'] ? String(options['app-id']) : undefined;
    const key = options['key'] ? String(options['key']) : undefined;

    const extra = ['--'];

    if (key) {
      extra.push('--key', key);
    }

    if (appId) {
      extra.push('--app-id', appId);
    }

    await runCommand(runinfo, ['integrations', 'enable', 'enterprise', ...extra.length > 1 ? extra : [] ]);
  }
}
