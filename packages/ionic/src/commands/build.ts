import * as chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions } from '@ionic/cli-utils';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';

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
    const { build } = await import('@ionic/cli-utils/commands/build');
    await build(this.env, inputs, options);
  }
}
