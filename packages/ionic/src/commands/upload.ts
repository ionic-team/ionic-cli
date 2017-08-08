import * as chalk from 'chalk';

import { BACKEND_LEGACY, CommandLineInput, CommandLineInputs, CommandLineOptions } from '@ionic/cli-utils';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';

@CommandMetadata({
  name: 'upload',
  type: 'project',
  backends: [BACKEND_LEGACY],
  description: 'Upload a new snapshot of your app',
  longDescription: `
Zips up your local app files and uploads a snapshot to Ionic.

From there, you can use Ionic View (${chalk.bold('https://view.ionic.io')}) to easily share your app with your organization and testers around the world.
  `,
  exampleCommands: [
    '',
    '--deploy=dev',
    `--deploy=production --note="add menu entry" --metadata="{\\"custom_data\\":true}"`,
  ],
  options: [
    {
      name: 'note',
      description: 'Give this snapshot a nice description',
    },
    {
      name: 'deploy',
      description: 'Deploys this snapshot to the given channel',
    },
    {
      name: 'metadata',
      description: 'Set custom metadata JSON for the deploy',
    },
    {
      name: 'nobuild',
      description: 'Do not invoke a build for this snapshot',
      type: Boolean,
    },
  ],
})
export class UploadCommand extends Command {
  resolveNote(input: CommandLineInput) {
    if (typeof input !== 'string') {
      input = undefined;
    }

    return input;
  }

  resolveMetaData(input: CommandLineInput) {
    if (typeof input !== 'string') {
      input = undefined;
    }

    return input ? JSON.parse(input) : undefined;
  }

  resolveChannelTag(input: CommandLineInput) {
    if (typeof input !== 'string') {
      input = undefined;
    } else if (input === '') {
      input = 'dev';
    }

    return input;
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { upload } = await import('@ionic/cli-utils/lib/upload');

    const note = this.resolveNote(options['note']);
    const channelTag = this.resolveChannelTag(options['deploy']);
    const metadata = this.resolveMetaData(options['metadata']);

    if (!options['nobuild']) {
      const { build } = await import('@ionic/cli-utils/commands/build');
      await build(this.env, inputs, options);
    }

    await upload(this.env, { note, channelTag, metadata });
  }

}
