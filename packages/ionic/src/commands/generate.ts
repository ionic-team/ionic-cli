import chalk from 'chalk';

import { CommandGroup } from '@ionic/cli-framework';
import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataInput, CommandMetadataOption, CommandPreRun, GenerateOptions } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { RunnerNotFoundException } from '@ionic/cli-utils/lib/errors';
import { prettyProjectName } from '@ionic/cli-utils/lib/project';

import * as generateLibType from '@ionic/cli-utils/lib/generate';

export class GenerateCommand extends Command implements CommandPreRun {
  protected runner?: generateLibType.GenerateRunner<GenerateOptions>;

  async getRunner() {
    if (!this.runner) {
      const { GenerateRunner } = await import('@ionic/cli-utils/lib/generate');
      this.runner = await GenerateRunner.createFromProject(this.env);
    }

    return this.runner;
  }

  async getMetadata(): Promise<CommandMetadata> {
    const inputs: CommandMetadataInput[] = [];
    const options: CommandMetadataOption[] = [];
    const exampleCommands = [''];

    let groups: string[] = [CommandGroup.Hidden];

    let description = this.env.project.type
      ? chalk.red(`Generators are not supported in this project type (${chalk.bold(prettyProjectName(this.env.project.type))}).`)
      : chalk.red('Generators help is available within an Ionic project directory.');

    try {
      const runner = await this.getRunner();
      const libmetadata = await runner.getCommandMetadata();
      groups = libmetadata.groups || [];
      inputs.push(...libmetadata.inputs || []);
      options.push(...libmetadata.options || []);
      description = (libmetadata.description || '').trim();
      exampleCommands.push(...libmetadata.exampleCommands || []);
    } catch (e) {
      if (!(e instanceof RunnerNotFoundException)) {
        throw e;
      }
    }

    return {
      name: 'generate',
      type: 'project',
      summary: 'Automatically create framework components',
      description,
      inputs,
      options,
      groups,
      exampleCommands,
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    try {
      const runner = await this.getRunner();
      await runner.ensureCommandLine(inputs, options);
    } catch (e) {
      if (!(e instanceof RunnerNotFoundException)) {
        throw e;
      }
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const runner = await this.getRunner();
    const opts = runner.createOptionsFromCommandLine(inputs, options);
    await runner.run(opts);
  }
}
