import {
  Command,
  CommandLineInput,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
} from '@ionic/cli-utils';

import { upload } from '../lib/upload';

@CommandMetadata({
  name: 'upload',
  type: 'project',
  description: 'Upload a new snapshot of your app',
  exampleCommands: [''],
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
      name: 'nobuild',
      description: 'Do not invoke a build for this upload',
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

  resolveChannelTag(input: CommandLineInput) {
    if (typeof input !== 'string') {
      input = undefined;
    } else if (input === '') {
      input = 'dev';
    }

    return input;
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const note = this.resolveNote(options['note']);
    const channelTag = this.resolveChannelTag(options['deploy']);

    if (!options['nobuild']) {
      await this.env.hooks.fire('command:build', {
        env: this.env,
        inputs,
        options,
      });
    }

    await upload(this.env, { note, channelTag });
  }

}
