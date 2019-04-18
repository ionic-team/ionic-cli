import { CommandMetadataOption, Footnote } from '@ionic/cli-framework';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../../definitions';
import { build } from '../../lib/build';
import { input, strong } from '../../lib/color';
import { FatalException } from '../../lib/errors';
import { filterArgumentsForCordova, generateOptionsForCordovaBuild } from '../../lib/integrations/cordova/utils';

import { CordovaCommand } from './base';

export class PrepareCommand extends CordovaCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    const options: CommandMetadataOption[] = [
      {
        name: 'build',
        summary: 'Do not invoke an Ionic build',
        type: Boolean,
        default: true,
      },
    ];

    const footnotes: Footnote[] = [];

    const runner = this.project && await this.project.getBuildRunner();

    if (runner) {
      const libmetadata = await runner.getCommandMetadata();
      options.push(...libmetadata.options || []);
      footnotes.push(...libmetadata.footnotes || []);
    }

    return {
      name: 'prepare',
      type: 'project',
      summary: 'Copies assets to Cordova platforms, preparing them for native builds',
      description: `
${input('ionic cordova prepare')} will do the following:

- Perform an Ionic build, which compiles web assets to ${strong('www/')}.
- Copy the ${strong('www/')} directory into your Cordova platforms.
- Transform ${strong('config.xml')} into platform-specific manifest files.
- Copy icons and splash screens from ${strong('resources/')} to into your Cordova platforms.
- Copy plugin files into specified platforms.

You may wish to use ${input('ionic cordova prepare')} if you run your project with Android Studio or Xcode.
      `,
      footnotes,
      exampleCommands: ['', 'ios', 'android'],
      inputs: [
        {
          name: 'platform',
          summary: `The platform you would like to prepare (e.g. ${['android', 'ios'].map(v => input(v)).join(', ')})`,
        },
      ],
      options,
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { loadConfigXml } = await import('../../lib/integrations/cordova/config');
    const { getPlatforms } = await import('../../lib/integrations/cordova/project');
    const [ platform ] = inputs;

    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic cordova prepare')} outside a project directory.`);
    }

    if (platform) {
      await this.checkForPlatformInstallation(platform, {
        promptToInstall: true,
        promptToInstallRefusalMsg: (
          `Cannot prepare for ${input(platform)} unless the platform is installed.\n` +
          `Did you mean just ${input('ionic cordova prepare')}?\n`
        ),
      });
    } else {
      const conf = await loadConfigXml(this.integration);
      const platforms = await getPlatforms(this.integration.root);
      const engines = conf.getPlatformEngines();

      if (engines.length === 0 && platforms.length === 0) {
        this.env.log.warn(
          `No platforms added to this project. Cannot prepare native platforms without any installed.\n` +
          `Run ${input('ionic cordova platform add <platform>')} to add native platforms.`
        );

        throw new FatalException('', 0);
      }
    }

    const metadata = await this.getMetadata();

    if (options.build) {
      const buildOptions = generateOptionsForCordovaBuild(metadata, inputs, options);

      if (buildOptions['platform']) {
        // TODO: use runner directly
        await build({ config: this.env.config, log: this.env.log, shell: this.env.shell, prompt: this.env.prompt, project: this.project }, inputs, buildOptions);
      } else {
        this.env.log.warn(
          `Cannot perform Ionic build without ${input('platform')}. Falling back to just ${input('cordova prepare')}.\n` +
          `Please supply a ${input('platform')} (e.g. ${['android', 'ios'].map(v => input(v)).join(', ')}) so the Ionic CLI can build web assets. The ${input('--no-build')} option will hide this warning.`
        );

        this.env.log.nl();
      }
    }

    await this.runCordova(filterArgumentsForCordova(metadata, options), {});
  }
}
