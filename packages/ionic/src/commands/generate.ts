import { CommandGroup, Footnote } from '@ionic/cli-framework';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataInput, CommandMetadataOption, CommandPreRun } from '../definitions';
import { failure, input, strong } from '../lib/color';
import { Command } from '../lib/command';
import { FatalException } from '../lib/errors';
import { prettyProjectName } from '../lib/project';

export class GenerateCommand extends Command implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    const inputs: CommandMetadataInput[] = [];
    const options: CommandMetadataOption[] = [];
    const exampleCommands = [''];
    const footnotes: Footnote[] = [];

    let groups: string[] = [CommandGroup.Hidden];

    let description = this.project
      ? failure(`Generators are not supported in this project type (${strong(prettyProjectName(this.project.type))}).`)
      : failure('Generators help is available within an Ionic project directory.');

    const runner = this.project && await this.project.getGenerateRunner();

    if (runner) {
      const libmetadata = await runner.getCommandMetadata();
      groups = libmetadata.groups || [];
      inputs.push(...libmetadata.inputs || []);
      options.push(...libmetadata.options || []);
      description = (libmetadata.description || '').trim();
      footnotes.push(...libmetadata.footnotes || []);
      exampleCommands.push(...libmetadata.exampleCommands || []);
    }

    return {
      name: 'generate',
      type: 'project',
      summary: 'Automatically create framework features',
      description,
      footnotes,
      inputs,
      options,
      groups,
      exampleCommands,
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const runner = this.project && await this.project.getGenerateRunner();

    if (runner) {
      await runner.ensureCommandLine(inputs, options);
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!this.project) {
      throw new FatalException(`Cannot run ${input('ionic generate')} outside a project directory.`);
    }

    const runner = await this.project.requireGenerateRunner();
    const opts = runner.createOptionsFromCommandLine(inputs, options);
    await runner.run(opts);
  }
}
