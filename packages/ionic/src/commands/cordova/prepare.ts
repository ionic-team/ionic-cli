import chalk from 'chalk';

import { CommandMetadataOption } from '@ionic/cli-framework';
import { BuildOptions, CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '@ionic/cli-utils';
import { BuildRunner } from '@ionic/cli-utils/lib/build';
import { FatalException, RunnerNotFoundException } from '@ionic/cli-utils/lib/errors';
import { filterArgumentsForCordova, generateBuildOptions } from '@ionic/cli-utils/lib/integrations/cordova/utils';

import { CordovaCommand } from './base';

export class PrepareCommand extends CordovaCommand implements CommandPreRun {
  protected buildRunner?: BuildRunner<BuildOptions<any>>;

  async getBuildRunner() {
    if (!this.buildRunner) {
      this.buildRunner = await BuildRunner.createFromProject(this.env, this.env.project);
    }

    return this.buildRunner;
  }

  async getMetadata(): Promise<CommandMetadata> {
    const options: CommandMetadataOption[] = [
      {
        name: 'build',
        summary: 'Do not invoke an Ionic build',
        type: Boolean,
        default: true,
      },
    ];

    try {
      const runner = await this.getBuildRunner();
      const libmetadata = await runner.getCommandMetadata();
      options.push(...libmetadata.options || []);
    } catch (e) {
      if (!(e instanceof RunnerNotFoundException)) {
        throw e;
      }
    }

    return {
      name: 'prepare',
      type: 'project',
      summary: 'Copies assets to Cordova platforms, preparing them for native builds',
      description: `
${chalk.green('ionic cordova prepare')} will do the following:
- Copy the ${chalk.bold('www/')} directory into your Cordova platforms.
- Transform ${chalk.bold('config.xml')} into platform-specific manifest files.
- Copy icons and splash screens from ${chalk.bold('resources/')} to into your Cordova platforms.
- Copy plugin files into specified platforms.

You may wish to use ${chalk.green('ionic cordova prepare')} if you run your project with Android Studio or Xcode.
      `,
      exampleCommands: ['', 'ios', 'android'],
      inputs: [
        {
          name: 'platform',
          summary: `The platform you would like to prepare (e.g. ${['android', 'ios'].map(v => chalk.green(v)).join(', ')})`,
        },
      ],
      options,
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { getPlatforms, installPlatform } = await import('@ionic/cli-utils/lib/integrations/cordova/project');

    const [ platform ] = inputs;

    const cordova = await this.env.project.getIntegration('cordova');
    const platforms = await getPlatforms(cordova.root);

    if (platform) {
      if (!platforms.includes(platform)) {
        const confirm = await this.env.prompt({
          message: `Platform ${chalk.green(platform)} is not installed! Would you like to install it?`,
          type: 'confirm',
          name: 'confirm',
        });

        if (confirm) {
          await installPlatform(this.env, platform, cordova.root);
        } else {
          throw new FatalException(
            `Can't prepare for ${chalk.green(platform)} unless the platform is installed.\n` +
            `Did you mean just ${chalk.green('ionic cordova prepare')}?\n`
          );
        }
      }
    } else {
      if (platforms.length === 0) {
        this.env.log.warn(`No platforms installed. See ${chalk.green('ionic cordova platform add --help')} to add Cordova platforms.`);
        return;
      }
    }

    const metadata = await this.getMetadata();

    if (options.build) {
      const { build } = await import('@ionic/cli-utils/lib/build');
      await build(this.env, inputs, generateBuildOptions(metadata, inputs, options));
    }

    await this.runCordova(filterArgumentsForCordova(metadata, options), {});
  }
}
