import * as chalk from 'chalk';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'build',
  type: 'project',
  description: 'Build web assets and prepare your app for any platform targets',
  longDescription: `
${chalk.green('ionic build')} will perform an Ionic build, which compiles web assets and prepares them for deployment. For Ionic/Cordova apps, the CLI will run ${chalk.green('cordova prepare')}, which copies the built web assets into the Cordova platforms that you've installed. For full details, see ${chalk.green('ionic cordova prepare --help')}.
  `,
  exampleCommands: [
    '',
    '--prod',
  ],
  options: [
    {
      name: 'prod',
      description: 'Build the application for production',
      type: Boolean,
    },
    {
      name: 'aot',
      description: 'Perform ahead-of-time compilation for this build',
      type: Boolean,
    },
    {
      name: 'minifyjs',
      description: 'Minify JS for this build',
      type: Boolean,
    },
    {
      name: 'minifycss',
      description: 'Minify CSS for this build',
      type: Boolean,
    },
    {
      name: 'optimizejs',
      description: 'Perform JS optimizations for this build',
      type: Boolean,
    },
  ],
})
export class BuildCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    await this.env.hooks.fire('build:before', { env: this.env });

    const registeredHooks = this.env.hooks.getRegistered('command:build');

    await this.env.hooks.fire('command:build', {
      cmd: this,
      env: this.env,
      inputs,
      options,
    });

    if (registeredHooks.length === 0) {
      this.env.log.warn(
        `There was no CLI project plugin that responded to ${chalk.green('ionic build')}.\n` +
        `Make sure you have the Ionic CLI and a suitable project plugin installed locally.`
      );
    }

    await this.env.hooks.fire('build:after', { env: this.env });
  }
}
