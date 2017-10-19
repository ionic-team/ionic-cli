import chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandPreRun } from '@ionic/cli-utils';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';
import { APP_SCRIPTS_OPTIONS } from '@ionic/cli-utils/lib/ionic-angular/app-scripts';

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
    ...APP_SCRIPTS_OPTIONS,
  ],
})
export class BuildCommand extends Command implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (inputs.length > 0 && ['android', 'ios', 'wp8', 'windows', 'browser'].includes(inputs[0])) {
      this.env.log.warn(
        `${chalk.green('ionic build')} is for building web assets and takes no arguments. See ${chalk.green('ionic build --help')}.\n` +
        `Ignoring argument ${chalk.green(inputs[0])}. Perhaps you meant ${chalk.green('ionic cordova build ' + inputs[0])}?\n`
      );

      inputs.splice(0);
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { build } = await import('@ionic/cli-utils/commands/build');
    await build(this.env, inputs, options);
  }
}
