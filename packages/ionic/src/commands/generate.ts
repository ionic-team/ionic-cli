import chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun, GenerateOptions } from '@ionic/cli-utils';
import { CommandGroup } from '@ionic/cli-utils/constants';
import { Command } from '@ionic/cli-utils/lib/command';
import { RunnerNotFoundException } from '@ionic/cli-utils/lib/errors';
import { prettyProjectName } from '@ionic/cli-utils/lib/project';

import * as generateLibType from '@ionic/cli-utils/lib/generate';

export class GenerateCommand extends Command implements CommandPreRun {
  protected runner?: generateLibType.GenerateRunner<GenerateOptions>;

  async getRunner() {
    if (!this.runner) {
      const { GenerateRunner } = await import('@ionic/cli-utils/lib/generate');
      this.runner = await GenerateRunner.createFromProjectType(this.env, this.env.project.type);
    }

    return this.runner;
  }

  async getMetadata(): Promise<CommandMetadata> {
    const longDescription = this.env.project.type
      ? chalk.red(`Generators are not supported in this project type (${chalk.bold(prettyProjectName(this.env.project.type))}).`)
      : chalk.red('Generators help is available within an Ionic project directory.');

    const metadata: CommandMetadata = {
      name: 'generate',
      type: 'project',
      description: 'Automatically create framework components',
      longDescription,
      groups: [CommandGroup.Hidden],
    };

    try {
      const runner = await this.getRunner();
      return runner.specializeCommandMetadata(metadata);
    } catch (e) {
      if (!(e instanceof RunnerNotFoundException)) {
        throw e;
      }
    }

    return metadata;
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
