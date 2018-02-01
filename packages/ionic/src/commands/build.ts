import chalk from 'chalk';

import { BuildOptions, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, CommandPreRun } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { BuildRunner } from '@ionic/cli-utils/lib/build';
import { RunnerNotFoundException } from '@ionic/cli-utils/lib/errors';

export class BuildCommand extends Command implements CommandPreRun {
  protected runner?: BuildRunner<BuildOptions<any>>;

  async getRunner() {
    if (!this.runner) {
      this.runner = await BuildRunner.createFromProjectType(this.env, this.env.project.type);
    }

    return this.runner;
  }

  async getMetadata(): Promise<CommandMetadata> {
    const options: CommandMetadataOption[] = [];
    const exampleCommands = [''];
    let longDescription = `${chalk.green('ionic build')} will perform an Ionic build, which compiles web assets and prepares them for deployment.`;

    try {
      const runner = await this.getRunner();
      const libmetadata = await runner.getCommandMetadata();
      options.push(...libmetadata.options || []);
      longDescription += libmetadata.longDescription ? `\n\n${libmetadata.longDescription.trim()}` : '';
      exampleCommands.push(...libmetadata.exampleCommands || []);
    } catch (e) {
      if (!(e instanceof RunnerNotFoundException)) {
        throw e;
      }
    }

    // TODO: only do this for apps w/ cordova integration
    longDescription += `\n\n${`For Ionic/Cordova apps, the Ionic CLI will run ${chalk.green('cordova prepare')}, which copies the built web assets into the Cordova platforms that you've installed. For full details, see ${chalk.green('ionic cordova prepare --help')}.`}`;

    return {
      name: 'build',
      type: 'project',
      description: 'Build web assets and prepare your app for any platform targets',
      longDescription,
      exampleCommands,
      options,
    };
  }

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
    const [ platform ] = inputs;

    const project = await this.env.project.load();

    const { build } = await import('@ionic/cli-utils/lib/build');
    await build(this.env, inputs, options);

    if (project.integrations.cordova && project.integrations.cordova.enabled !== false) {
      const cordovaPrepareArgs = ['cordova', 'prepare', '--no-build'];

      if (platform) {
        cordovaPrepareArgs.push(platform);
      }

      await this.env.runCommand(cordovaPrepareArgs);
    }
  }
}
