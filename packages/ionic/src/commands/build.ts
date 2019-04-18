import { Footnote } from '@ionic/cli-framework';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, CommandPreRun } from '../definitions';
import { COMMON_BUILD_COMMAND_OPTIONS, build } from '../lib/build';
import { input } from '../lib/color';
import { Command } from '../lib/command';
import { FatalException } from '../lib/errors';

export class BuildCommand extends Command implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    const options: CommandMetadataOption[] = [];
    const footnotes: Footnote[] = [];
    const exampleCommands = [''];
    let description = `${input('ionic build')} will perform an Ionic build, which compiles web assets and prepares them for deployment.`;
    let groups: string[] = [];

    const runner = this.project && await this.project.getBuildRunner();

    if (runner) {
      const libmetadata = await runner.getCommandMetadata();
      groups = libmetadata.groups || [];
      options.push(...libmetadata.options || []);
      description += libmetadata.description ? `\n\n${libmetadata.description.trim()}` : '';
      footnotes.push(...libmetadata.footnotes || []);
      exampleCommands.push(...libmetadata.exampleCommands || []);
    }

    options.push(...COMMON_BUILD_COMMAND_OPTIONS);

    return {
      name: 'build',
      type: 'project',
      summary: 'Build web assets and prepare your app for any platform targets',
      description,
      footnotes,
      groups,
      exampleCommands,
      options,
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (inputs.length > 0 && ['android', 'ios', 'wp8', 'windows', 'browser'].includes(inputs[0])) {
      this.env.log.warn(
        `${input('ionic build')} is for building web assets and takes no arguments. See ${input('ionic build --help')}.\n` +
        `Ignoring argument ${input(inputs[0])}. Perhaps you meant ${input('ionic cordova build ' + inputs[0])}?\n`
      );

      inputs.splice(0);
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic build')} outside a project directory.`);
    }

    // TODO: use runner directly
    await build({ config: this.env.config, log: this.env.log, shell: this.env.shell, prompt: this.env.prompt, project: this.project }, inputs, options);
  }
}
