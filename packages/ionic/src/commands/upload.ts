import chalk from 'chalk';

import { BACKEND_LEGACY, CommandData, CommandLineInput, CommandLineInputs, CommandLineOptions, CommandPreRun } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { APP_SCRIPTS_OPTIONS } from '@ionic/cli-utils/lib/ionic-angular/app-scripts';

const DEPRECATION_NOTICE = `Ionic Cloud is deprecated and will reach end-of-life on January 31st, 2018. This command will not be supported afterwards. Ionic Pro takes a different approach to uploading. See the Getting Started documentation for details: ${chalk.bold('https://ionicframework.com/docs/pro/basics/getting-started/')}`;

export class UploadCommand extends Command implements CommandPreRun {
  metadata: CommandData = {
    name: 'upload',
    type: 'project',
    backends: [BACKEND_LEGACY],
    deprecated: true,
    description: 'Upload a new snapshot of your app',
    longDescription: `
${chalk.bold.yellow('WARNING')}: ${DEPRECATION_NOTICE}

Zips up your local app files and uploads a snapshot to Ionic.

From there, you can use Ionic View (${chalk.bold('https://ionicframework.com/products/view')}) to easily share your app with your organization and testers around the world.
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
        name: 'build',
        description: 'Do not invoke an Ionic build',
        type: Boolean,
        default: true,
      },
      ...APP_SCRIPTS_OPTIONS,
    ],
  };

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

    this.env.log.warn(DEPRECATION_NOTICE);

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
