import * as chalk from 'chalk';

import { BACKEND_LEGACY, CommandLineInput, CommandLineInputs, CommandLineOptions, CommandPreRun } from '@ionic/cli-utils';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';

@CommandMetadata({
  name: 'upload',
  type: 'project',
  backends: [BACKEND_LEGACY],
  deprecated: true,
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
      advanced: true,
    },
    {
      name: 'prod',
      description: 'Build the application for production',
      type: Boolean,
      intent: 'app-scripts',
    },
    {
      name: 'aot',
      description: `Perform ahead-of-time compilation for the upload's build`,
      type: Boolean,
      intent: 'app-scripts',
      advanced: true,
    },
    {
      name: 'minifyjs',
      description: `Minify JS for the upload's build`,
      type: Boolean,
      intent: 'app-scripts',
      advanced: true,
    },
    {
      name: 'minifycss',
      description: `Minify CSS for the upload's build`,
      type: Boolean,
      intent: 'app-scripts',
      advanced: true,
    },
    {
      name: 'optimizejs',
      description: `Perform JS optimizations for the upload's build`,
      type: Boolean,
      intent: 'app-scripts',
      advanced: true,
    },
    {
      name: 'build',
      description: 'Do not invoke an Ionic build',
      type: Boolean,
      default: true,
    },
  ],
})
export class UploadCommand extends Command implements CommandPreRun {
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

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (options['nobuild']) {
      options['build'] = false;
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { promptToLogin } = await import('@ionic/cli-utils/lib/session');
    const { upload } = await import('@ionic/cli-utils/lib/upload');

    const note = this.resolveNote(options['note']);
    const channelTag = this.resolveChannelTag(options['deploy']);
    const metadata = this.resolveMetaData(options['metadata']);

    if (!(await this.env.session.isLoggedIn())) {
      await promptToLogin(this.env);
    }

    if (options['build']) {
      const { build } = await import('@ionic/cli-utils/commands/build');
      await build(this.env, inputs, options);
    }

    await upload(this.env, { note, channelTag, metadata });
  }

}
